// ATRIUM connector for Blaze: remote MCP server (Streamable HTTP, JSON-RPC 2.0).
// Reached at /api/mcp/<BLAZE_SECRET> (see vercel.json). Env: BLAZE_SECRET,
// SUPABASE_SERVICE_ROLE_KEY. The service key stays on the server.
const crypto = require('crypto')
const { handleRpc, kv } = require('./_utils/blaze')

function secretOk(given) {
  const want = process.env.BLAZE_SECRET
  if (!want || want.length < 24 || typeof given !== 'string') return false
  const a = crypto.createHash('sha256').update(given).digest()
  const b = crypto.createHash('sha256').update(want).digest()
  return crypto.timingSafeEqual(a, b)
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  // Say which setting is missing (names only, never values) so a bad deploy is easy to fix.
  const miss = []
  if (!process.env.BLAZE_SECRET) miss.push('BLAZE_SECRET')
  else if (process.env.BLAZE_SECRET.length < 24) miss.push('BLAZE_SECRET (shorter than 24 characters)')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) miss.push('SUPABASE_SERVICE_ROLE_KEY')
  if (miss.length) { res.status(503).json({ error: 'Connector is not configured. Missing: ' + miss.join(', ') }); return }
  if (!secretOk(req.query && req.query.secret)) { res.status(401).json({ error: 'Unauthorized' }); return }
  if (req.method === 'GET' || req.method === 'DELETE') { res.status(405).setHeader('Allow', 'POST').json({ error: 'Method not allowed' }); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  if (!body) { res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return }
  const store = () => kv()
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handleRpc(m, store)))).filter(Boolean)
    if (!out.length) { res.status(202).end(); return }
    res.status(200).json(out); return
  }
  const out = await handleRpc(body, store)
  if (!out) { res.status(202).end(); return }
  res.status(200).json(out)
}
