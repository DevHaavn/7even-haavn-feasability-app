// Australian date/time formatting for the Meetings module.
// Inputs are naive local datetime strings ('YYYY-MM-DDTHH:MM' from datetime-local),
// which already represent the intended Melbourne wall-clock time — so we format the
// components directly (no timezone shift) as day-month-year, 12-hour.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parts(s?: string | null): { y: number; mo: number; da: number; hh: number; mi: number } | null {
  if (!s) return null
  const [d, t = ''] = s.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [hh = 0, mi = 0] = t.split(':').map(Number)
  if (!y || !mo || !da) return null
  return { y, mo, da, hh, mi }
}

export function fmtTime12(hh: number, mi: number): string {
  const ampm = hh >= 12 ? 'pm' : 'am'
  const h12 = ((hh + 11) % 12) + 1
  return `${h12}:${String(mi).padStart(2, '0')} ${ampm}`
}

// e.g. "Wed 16 Jul 2026, 10:00 am"
export function fmtDateTime(s?: string | null): string {
  const p = parts(s)
  if (!p) return s || ''
  const dow = DAYS[new Date(p.y, p.mo - 1, p.da).getDay()]
  return `${dow} ${p.da} ${MONTHS[p.mo - 1]} ${p.y}, ${fmtTime12(p.hh, p.mi)}`
}

// e.g. "16 Jul 2026" (no time)
export function fmtDate(s?: string | null): string {
  const p = parts(s)
  if (!p) return s || ''
  return `${p.da} ${MONTHS[p.mo - 1]} ${p.y}`
}
