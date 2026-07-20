// ── CRM → Meetings pillar bridge ─────────────────────────────────────────────
// The ATRIUM CRM owns meetings. It publishes them to `atrium:crm-meetings`
// (see publishCrmMeetings() in public/atrium-management.html); we import them so
// they can be recorded and translated here, and report back what happened under
// `atrium:pillar-results` so the CRM's register stays truthful.
//
// Ownership rule, which is what stops the two sides fighting:
//   • A meeting that came from the CRM is owned by the CRM. Its title, time and
//     agenda are imported on every sync and are NOT editable here — an edit made
//     here would be silently overwritten, which is worse than not allowing it.
//   • A meeting created here (the "+ New meeting" button) has no CRM parent and
//     is owned here. The CRM never sees or overwrites it.
// So every meeting has exactly one owner and there is no merge to resolve.

import type { MeetingBundle, AgendaItem, Attendee } from './types'
import { loadMeetings, upsertBundle, newId } from './meetingsStore'

const CRM_KEY = 'atrium:crm-meetings'
const RESULTS_KEY = 'atrium:pillar-results'

interface CrmAgenda { item: string; owner: string; box: number }
interface CrmMeeting {
  id: string; title: string; project: string; projectId: string
  at: string; loc: string; type: string; status: string
  agenda: CrmAgenda[]; attendees: { name: string; email: string }[]
}

function readCrm(): CrmMeeting[] {
  try {
    const raw = localStorage.getItem(CRM_KEY)
    if (!raw) return []
    const s = JSON.parse(raw)
    return s && s.v === 1 && Array.isArray(s.meetings) ? s.meetings : []
  } catch { return [] }
}

/** CRM meetings carry their origin id so re-syncing updates rather than duplicates. */
export function crmIdOf(b: MeetingBundle): string | null {
  return b.meeting.linkedType === 'project' && typeof b.meeting.id === 'string' && b.meeting.id.startsWith('crm:')
    ? b.meeting.id.slice(4)
    : null
}
export function isCrmOwned(b: MeetingBundle): boolean {
  return typeof b.meeting.id === 'string' && b.meeting.id.startsWith('crm:')
}

/**
 * Pull the CRM's meetings in. Idempotent: the bundle id is derived from the CRM
 * id, so a second sync updates the same record.
 *
 * Anything the pillar owns — transcript, summary, actions, status — is preserved;
 * only the CRM-owned fields (title, time, location, agenda, attendees) are
 * refreshed. Losing a transcript because someone renamed a meeting in the CRM
 * would be unforgivable.
 */
export function syncFromCrm(): number {
  const crm = readCrm()
  if (!crm.length) return 0
  const existing = new Map(loadMeetings().bundles.map(b => [b.meeting.id, b]))
  let n = 0

  for (const m of crm) {
    const id = `crm:${m.id}`
    const prev = existing.get(id)

    const agenda: AgendaItem[] = m.agenda.map((a, i) => ({
      id: prev?.agenda[i]?.id ?? newId('ag'),
      meetingId: id,
      order: i,
      title: a.item,
      ownerId: a.owner || null,
      minutes: a.box || 0,
      linkType: null,
      linkId: null,
      state: prev?.agenda[i]?.state ?? 'pending',
    }))

    const attendees: Attendee[] = m.attendees.map((a, i) => ({
      id: prev?.attendees[i]?.id ?? newId('at'),
      meetingId: id,
      displayName: a.name,
      email: a.email,
    }))

    const bundle: MeetingBundle = {
      ...(prev ?? { utterances: [], record: null }),
      meeting: {
        ...(prev?.meeting ?? {}),
        id,
        title: m.title + (m.project ? ` — ${m.project}` : ''),
        startsAt: m.at || '',
        durationMin: prev?.meeting.durationMin ?? 60,
        locationLabel: m.loc || undefined,
        linkedType: 'project',
        linkedId: m.projectId || null,
        // The pillar owns status once it starts working: a meeting being
        // recorded here must not be reset to 'scheduled' by a CRM sync.
        status: prev && prev.meeting.status !== 'scheduled' ? prev.meeting.status : 'scheduled',
        language: prev?.meeting.language ?? { source: 'auto', target: 'en' },
        createdBy: prev?.meeting.createdBy ?? 'CRM',
      },
      agenda,
      attendees,
    } as MeetingBundle

    upsertBundle(bundle)
    n++
  }
  return n
}

/** Tell the CRM what actually happened, so its register reflects reality. */
export function publishResults(): void {
  try {
    const byId: Record<string, { status: string; endedAt: string }> = {}
    for (const b of loadMeetings().bundles) {
      const crmId = isCrmOwned(b) ? b.meeting.id.slice(4) : null
      if (!crmId) continue
      byId[crmId] = { status: b.meeting.status, endedAt: new Date().toISOString() }
    }
    localStorage.setItem(RESULTS_KEY, JSON.stringify({ v: 1, byId }))
  } catch { /* non-critical */ }
}
