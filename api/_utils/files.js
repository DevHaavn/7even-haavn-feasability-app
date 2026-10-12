// Files for ATRIUM's agents: list and download the presentations, documents, brochures and plans of
// 7EVEN, HAAVN and HAAVN BLACK. Only paths in the deployed catalogue (public/agent-files.json,
// built by scripts/build-agent-manifest.cjs) can be fetched, and only from this site, so an agent
// can never ask for another host or for any file that is not on that list. Read only.
const ORIGIN = (process.env.PUBLIC_ORIGIN || 'https://7even-haavn-feasability-app-redux.vercel.app').replace(/\/$/, '')
const AREAS = ['7even', 'haavn', 'haavn-black']
const KINDS = ['presentation', 'document', 'brochure', 'plan', 'page', 'image', 'video', 'model', 'data']
const BIN_CHUNK = 1500000   // raw bytes per call (about 2 MB once encoded; replies stay under the platform's size limit)
const TEXT_CHUNK = 300000   // characters per call for text files

class FileError extends Error {}
let cache = { at: 0, files: null }

async function catalogue(fetchImpl = fetch, now = Date.now()) {
  if (cache.files && now - cache.at < 60000) return cache.files
  const r = await fetchImpl(ORIGIN + '/agent-files.json', { headers: { 'cache-control': 'no-cache' } })
  if (!r.ok) throw new FileError('The file list is not available right now.')
  const d = await r.json()
  cache = { at: now, files: Array.isArray(d.files) ? d.files : [] }
  return cache.files
}
const isText = (t) => /^text\//.test(t) || t === 'application/json' || t === 'image/svg+xml' || t === 'text/javascript'
const publicUrl = (p) => ORIGIN + p.split('/').map(encodeURIComponent).join('/')

async function listFiles(a = {}, fetchImpl = fetch) {
  let fs = await catalogue(fetchImpl)
  if (a.area) { if (!AREAS.includes(a.area)) throw new FileError(`area must be one of: ${AREAS.join(', ')}`); fs = fs.filter((f) => f.area === a.area) }
  if (a.kind) { if (!KINDS.includes(a.kind)) throw new FileError(`kind must be one of: ${KINDS.join(', ')}`); fs = fs.filter((f) => f.kind === a.kind) }
  else if (!a.include_images) fs = fs.filter((f) => f.kind !== 'image' && f.kind !== 'data')   // presentations and documents first
  if (a.query) { const q = String(a.query).toLowerCase(); fs = fs.filter((f) => (f.path + ' ' + f.title).toLowerCase().includes(q)) }
  const limit = Math.min(Math.max(parseInt(a.limit, 10) || 40, 1), 100), offset = Math.max(parseInt(a.offset, 10) || 0, 0)
  return { total: fs.length, offset, files: fs.slice(offset, offset + limit).map((f) => ({ path: f.path, title: f.title, area: f.area, kind: f.kind, type: f.type, bytes: f.bytes, url: publicUrl(f.path) })),
    ...(offset + limit < fs.length ? { nextOffset: offset + limit } : {}) }
}

// One piece of one file. Text comes back as text, images as images, everything else as base64.
// Big files are read in pieces: call again with the nextOffset until it is absent.
async function getFile(a = {}, fetchImpl = fetch) {
  const p = String(a.path || '')
  const fs = await catalogue(fetchImpl)
  const f = fs.find((x) => x.path === p)
  if (!f) throw new FileError('No such file in the catalogue. Use list_files to see what is available.')
  const r = await fetchImpl(publicUrl(f.path))
  if (!r.ok) throw new FileError(`The file could not be read (${r.status}).`)
  const buf = Buffer.from(await r.arrayBuffer())
  const offset = Math.max(parseInt(a.offset, 10) || 0, 0)
  const meta = { path: f.path, title: f.title, type: f.type, totalBytes: buf.length, url: publicUrl(f.path) }
  if (offset >= buf.length && buf.length > 0) throw new FileError('offset is past the end of the file')
  if (isText(f.type)) {
    const text = buf.toString('utf8')
    const piece = text.slice(offset, offset + TEXT_CHUNK)
    const end = offset + piece.length
    return { ...meta, encoding: 'text', offset, ...(end < text.length ? { nextOffset: end } : {}), summary: `read ${f.path}`, data: piece }
  }
  const end = Math.min(offset + BIN_CHUNK, buf.length), piece = buf.subarray(offset, end)
  const more = end < buf.length ? { nextOffset: end } : {}
  if (f.type.startsWith('image/') && f.type !== 'image/svg+xml' && offset === 0 && end === buf.length) {
    return { __content: [{ type: 'image', data: piece.toString('base64'), mimeType: f.type }, { type: 'text', text: JSON.stringify(meta) }], summary: `read ${f.path}` }
  }
  return { ...meta, encoding: 'base64', offset, bytes: piece.length, ...more, summary: `downloaded ${f.path}${more.nextOffset ? ` (${offset}-${end} of ${buf.length})` : ''}`, data: piece.toString('base64') }
}

module.exports = { FileError, listFiles, getFile, catalogue, ORIGIN, _reset: () => { cache = { at: 0, files: null } } }
