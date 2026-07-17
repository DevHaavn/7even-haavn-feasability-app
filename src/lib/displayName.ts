// The name shown against a note the user posts.
//
// This is NOT authentication. The app signs in with a shared role password
// (see lib/role.ts), so there is no verified identity to attribute a note to.
// This is a display name the person types once on their own machine — treat it
// as a label, not proof of who wrote something.
const KEY = 'atrium_display_name'

export function getDisplayName(): string {
  try { return localStorage.getItem(KEY) ?? '' } catch { return '' }
}

export function setDisplayName(name: string) {
  try { localStorage.setItem(KEY, name.trim()) } catch { /* private mode — the name just won't persist */ }
}

// "3m ago" / "2h ago" / "5d ago", else the date. Keeps a thread scannable.
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
