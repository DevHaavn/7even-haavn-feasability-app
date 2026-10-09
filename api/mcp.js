// ATRIUM connector for the directors' agents: remote MCP server (Streamable HTTP, JSON-RPC 2.0).
// Reached at /api/mcp/<secret> (see vercel.json). The secret picks the agent: BLAZE_SECRET is Blaze,
// AGENT_SECRET_<NAME> is any other agent. Env also: SUPABASE_SERVICE_ROLE_KEY. The service key stays on the server.
const { handleRpc, kv, agentRegistry, identifyAgent } = require('./_utils/blaze')

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  // Say which setting is missing (names only, never values) so a bad deploy is easy to fix.
  const miss = []
  if (!agentRegistry().length) miss.push('an agent secret (BLAZE_SECRET or AGENT_SECRET_<NAME>, 24+ characters)')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) miss.push('SUPABASE_SERVICE_ROLE_KEY')
  if (miss.length) { res.status(503).json({ error: 'Connector is not configured. Missing: ' + miss.join(', ') }); return }
  const agent = identifyAgent(req.query && req.query.secret)
  if (!agent) { res.status(401).json({ error: 'Unauthorized' }); return }
  const ctx = { agent, agents: agentRegistry().map((a) => a.name) }
  if (req.method === 'GET' || req.method === 'DELETE') { res.status(405).setHeader('Allow', 'POST').json({ error: 'Method not allowed' }); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  if (!body) { res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return }
  const store = () => kv()
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handleRpc(m, store, ctx)))).filter(Boolean)
    if (!out.length) { res.status(202).end(); return }
    res.status(200).json(out); return
  }
  const out = await handleRpc(body, store, ctx)
  if (!out) { res.status(202).end(); return }
  res.status(200).json(out)
}
