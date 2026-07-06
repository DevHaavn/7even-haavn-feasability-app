// Pull invoices & bills from Xero for every connected organisation.
// Read-only. Normalises Xero's Accounting API into the shape the Budgets
// register uses, tagged with a xero: source id so re-syncs never duplicate.
const { encrypt, readSession, sessionCookie, groupFromReq } = require('../_utils/session')

async function ensureToken(session, res, group) {
  if (Date.now() < session.expires_at) return session
  const tokenRes = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refresh_token }),
  })
  if (!tokenRes.ok) throw new Error(`refresh ${tokenRes.status}`)
  const t = await tokenRes.json()
  const next = { ...session, refresh_token: t.refresh_token, access_token: t.access_token, expires_at: Date.now() + (t.expires_in - 60) * 1000 }
  res.setHeader('Set-Cookie', sessionCookie(encrypt(next), 60 * 60 * 24 * 60, group))
  return next
}

function normalise(inv, tenant) {
  const isSale = inv.Type === 'ACCREC'
  return {
    sourceId: `xero:${inv.InvoiceID}`,
    type: isSale ? 'invoice' : 'bill',
    contact: (inv.Contact && inv.Contact.Name) || 'Xero contact',
    desc: inv.Reference || (inv.LineItems && inv.LineItems[0] && inv.LineItems[0].Description) || (inv.InvoiceNumber || ''),
    amount: Number(inv.SubTotal ?? inv.Total ?? 0),   // ex-GST where Xero provides it
    date: (inv.DateString || inv.Date || '').slice(0, 10),
    status: inv.Status === 'PAID' ? 'paid' : 'awaiting',
    tenantId: tenant.id,
    tenantName: tenant.name,
  }
}

module.exports = async (req, res) => {
  if (!process.env.XERO_CLIENT_ID || !process.env.SESSION_SECRET) {
    return res.status(200).json({ connected: false, reason: 'unconfigured', invoices: [] })
  }
  const group = groupFromReq(req)
  let session
  try { session = readSession(req, group) } catch { session = null }
  if (!session) return res.status(200).json({ connected: false, reason: 'not_connected', invoices: [] })

  try {
    session = await ensureToken(session, res, group)
    const out = []
    for (const tenant of session.tenants || []) {
      // AUTHORISED + PAID only (skip drafts); most recent first.
      const url = 'https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED,PAID&order=Date%20DESC&page=1'
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}`, 'Xero-tenant-id': tenant.id, Accept: 'application/json' },
      })
      if (!r.ok) { console.warn('[xero invoices]', tenant.name, r.status); continue }
      const j = await r.json()
      for (const inv of (j.Invoices || [])) out.push(normalise(inv, tenant))
    }
    res.status(200).json({ connected: true, invoices: out, tenants: (session.tenants || []).map(t => t.name) })
  } catch (e) {
    console.error('[xero invoices] error', e)
    res.status(200).json({ connected: false, reason: 'error', invoices: [] })
  }
}
