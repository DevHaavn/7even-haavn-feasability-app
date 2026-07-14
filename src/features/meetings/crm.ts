// ATRIUM · Meetings — read the live CRM (Atrium pillar 01) + projects so agenda
// links, attendees and wrap-up routing point at real objects. Read-only here;
// the Meetings module never mutates the CRM store, only reads it and (on send)
// appends records/tasks through the CRM's own write path.
import * as db from '../../db'
import type { CrmLinkType } from './types'

export interface CrmLink {
  type: Exclude<CrmLinkType, 'capital'>
  id: string
  label: string
  sub: string
}

interface AtriumTarget { id: string; name: string; company: string; value: number; projectId?: string }
interface AtriumContact { id: string; name: string; company: string; role: string; email: string }
interface AtriumData { targets?: AtriumTarget[]; contacts?: AtriumContact[] }

function readAtrium(): AtriumData {
  try { const raw = localStorage.getItem('atrium_v1'); if (raw) return JSON.parse(raw) as AtriumData } catch { /* none */ }
  return {}
}

const money = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`

export function crmProjects(): CrmLink[] {
  return db.getProjects().map(p => ({ type: 'project', id: p.id, label: p.name, sub: p.address || 'Project' }))
}
export function crmDeals(): CrmLink[] {
  return (readAtrium().targets || []).map(t => ({ type: 'deal', id: t.id, label: t.name || t.company, sub: `Deal · ${t.company} · ${money(t.value || 0)}` }))
}
export function crmContacts(): CrmLink[] {
  return (readAtrium().contacts || []).map(c => ({ type: 'contact', id: c.id, label: c.name, sub: `Contact · ${c.company}${c.role ? ' · ' + c.role : ''}` }))
}

export function crmAll(): CrmLink[] { return [...crmProjects(), ...crmDeals(), ...crmContacts()] }

export function crmSearch(q: string): CrmLink[] {
  const s = q.trim().toLowerCase()
  const all = crmAll()
  if (!s) return all.slice(0, 8)
  return all.filter(l => (l.label + ' ' + l.sub).toLowerCase().includes(s)).slice(0, 12)
}

export function crmContactsAsAttendees(): { displayName: string; email: string; roleLabel?: string }[] {
  return (readAtrium().contacts || []).map(c => ({ displayName: c.name, email: c.email, roleLabel: c.company }))
}
