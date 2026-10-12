// Builds public/agent-files.json: the catalogue of presentations, documents, brochures, plans and
// content that ATRIUM's agents (Blaze, Julio...) may list and download through the connector.
// Only the folders named in ROOTS are included; nothing else on the site can be fetched.
// Runs before every build (package.json "prebuild"), so the list is always the deployed one.
// It must never fail the build: any problem just writes a smaller or empty list.
const fs = require('fs')
const path = require('path')

const PUBLIC = path.join(__dirname, '..', 'public')
// [folder under public/, area]. Areas are the three companies.
const ROOTS = [
  ['hori7on-next', '7even'],
  ['hori7on.html', '7even'], ['hori7on-studio.html', '7even'], ['hori7on-im-preston-preview.html', '7even'],
  ['7even-x-brand-deck.html', '7even'], ['7even-x-design-pack.html', '7even'], ['7even-x-from-the-v.html', '7even'],
  ['haavn-supply/documents', 'haavn'], ['haavn-supply/presentations', 'haavn'], ['haavn-supply/content', 'haavn'],
  ['haavn-brochures', 'haavn-black'], ['haavn-renders/solum-plan', 'haavn-black'], ['haavn-renders/solum-studio-plan', 'haavn-black'],
]
const SKIP = /(^|\/)(\.DS_Store|node_modules|\.git)(\/|$)/
const TYPES = {
  pdf: 'application/pdf', zip: 'application/zip', html: 'text/html', json: 'application/json', csv: 'text/csv', txt: 'text/plain', md: 'text/markdown',
  css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', glb: 'model/gltf-binary', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
function kindOf(rel, ext) {
  if (ext === 'pdf') return /brochure/i.test(rel) ? 'brochure' : /plan/i.test(rel) ? 'plan' : 'document'
  if (['zip', 'pptx', 'docx', 'xlsx', 'csv', 'md', 'txt'].includes(ext)) return 'document'
  if (ext === 'html') return /deck|presentation|im-|brand-deck|slide|index|hori7on/i.test(rel) ? 'presentation' : 'page'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image'
  if (ext === 'mp4') return 'video'
  if (ext === 'glb') return 'model'
  return 'data'
}
const titleOf = (rel) => path.basename(rel).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()

function walk(abs, rel, area, out) {
  let st; try { st = fs.statSync(abs) } catch { return }
  if (SKIP.test(rel)) return
  if (st.isDirectory()) { fs.readdirSync(abs).sort().forEach((n) => walk(path.join(abs, n), rel + '/' + n, area, out)); return }
  const ext = (path.extname(rel).slice(1) || '').toLowerCase()
  out.push({ path: '/' + rel, area, kind: kindOf(rel, ext), type: TYPES[ext] || 'application/octet-stream', bytes: st.size, title: titleOf(rel) })
}
try {
  const files = []
  ROOTS.forEach(([root, area]) => walk(path.join(PUBLIC, root), root, area, files))
  fs.writeFileSync(path.join(PUBLIC, 'agent-files.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: files.length, files }))
  console.log(`agent-files.json: ${files.length} files`)
} catch (e) {
  console.warn('agent-files.json not written:', e && e.message)
  try { fs.writeFileSync(path.join(PUBLIC, 'agent-files.json'), JSON.stringify({ generatedAt: new Date().toISOString(), count: 0, files: [] })) } catch { /* ignore */ }
}
