// Shared helpers for the Xero OAuth serverless functions.
// Tokens are held in an AES-256-GCM encrypted, httpOnly cookie — they never
// reach the browser's JavaScript, localStorage, or the client bundle.
const crypto = require('crypto')

const COOKIE_NAME = 'xero_session'

// Two independent Xero connections: '7even' (Jamie's Xero — 7even Capital &
// projects) keeps the original cookie name for backward compatibility; 'haavn'
// (the other team's Xero — Haavn Management / Precision / Technologies) uses its
// own cookie so the two accounts never collide.
const VALID_GROUPS = ['7even', 'haavn']
function normGroup(g) { return VALID_GROUPS.includes(g) ? g : '7even' }
function groupFromReq(req) { return normGroup((req.query && req.query.group) || '7even') }
function cookieNameFor(group) { return normGroup(group) === 'haavn' ? 'xero_session_haavn' : COOKIE_NAME }

function key() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 16) throw new Error('SESSION_SECRET env var missing or too short (need 16+ chars)')
  return crypto.createHash('sha256').update(secret).digest()
}

function encrypt(obj) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, ct].map(b => b.toString('base64url')).join('.')
}

function decrypt(token) {
  try {
    const [iv, tag, ct] = token.split('.').map(s => Buffer.from(s, 'base64url'))
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv)
    decipher.setAuthTag(tag)
    return JSON.parse(Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8'))
  } catch {
    return null
  }
}

function parseCookies(req) {
  const out = {}
  const header = req.headers.cookie || ''
  header.split(';').forEach(part => {
    const idx = part.indexOf('=')
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  })
  return out
}

function sessionCookie(value, maxAgeSeconds, group) {
  const attrs = [
    `${cookieNameFor(group)}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  return attrs.join('; ')
}

function readSession(req, group) {
  const cookies = parseCookies(req)
  const name = cookieNameFor(group)
  if (!cookies[name]) return null
  return decrypt(cookies[name])
}

function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `https://${host}`
}

module.exports = { COOKIE_NAME, encrypt, decrypt, parseCookies, sessionCookie, readSession, appUrl, groupFromReq, cookieNameFor, normGroup }
