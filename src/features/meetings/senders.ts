// ATRIUM · Meetings — the send-from roster (spec §4).
// Stored as data, not hardcoded in the component. boardroom@haavn.au is the Master default.

export interface Sender {
  name: string
  email: string
  initials: string
  group: 'shared' | 'haavn' | '7even' | 'external'
  master?: boolean
}

export const SENDERS: Sender[] = [
  // --- shared mailboxes ---
  { name: 'Boardroom',   email: 'boardroom@haavn.au',  initials: 'BR', group: 'shared', master: true },
  { name: 'Accounts',    email: 'accounts@haavn.au',   initials: 'AC', group: 'shared' },
  { name: 'Reception',   email: 'reception@7even.au',  initials: 'RC', group: 'shared' },

  // --- HAAVN, send as yourself ---
  { name: 'Jamie Baldwin',    email: 'jamie@haavn.au',   initials: 'JB', group: 'haavn' },
  { name: 'James Winstanley', email: 'james@haavn.au',   initials: 'JW', group: 'haavn' },
  { name: 'James M',          email: 'jamesm@haavn.au',  initials: 'JM', group: 'haavn' },
  { name: 'Daniel Sette',     email: 'daniel@haavn.au',  initials: 'DS', group: 'haavn' },
  { name: 'Lewis Jin',        email: 'lewis@haavn.au',   initials: 'LJ', group: 'haavn' },
  { name: 'Domenic',          email: 'domenic@haavn.au', initials: 'DM', group: 'haavn' },
  { name: 'John',             email: 'john@haavn.au',    initials: 'JN', group: 'haavn' },

  // --- 7EVEN ---
  { name: 'Amy Baldwin',      email: 'amy@7even.au',     initials: 'AB', group: '7even' },

  // --- external / other domain ---
  { name: 'IdentityX',        email: 'hello@identityx.com.au', initials: 'IX', group: 'external' },
]

export const GROUP_LABELS: Record<Sender['group'], string> = {
  shared:   'Shared mailboxes',
  haavn:    'HAAVN — send as yourself',
  '7even':  '7EVEN',
  external: 'External',
}

// Groups in display order.
export const GROUP_ORDER: Sender['group'][] = ['shared', 'haavn', '7even', 'external']

export const defaultSender = (): Sender => SENDERS.find(s => s.master)!

// The staff directory — the real people from the roster (HAAVN + 7EVEN), used to
// quick-add attendees and email recipients across the Meetings module. Saved in
// the app so the team is always one click away.
export interface TeamMember { name: string; email: string; initials: string; org: 'HAAVN' | '7EVEN' }
export const TEAM: TeamMember[] = SENDERS
  .filter(s => s.group === 'haavn' || s.group === '7even')
  .map(s => ({ name: s.name, email: s.email, initials: s.initials, org: s.group === '7even' ? '7EVEN' : 'HAAVN' }))
