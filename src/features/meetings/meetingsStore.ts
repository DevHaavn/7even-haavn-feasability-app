// ATRIUM · Meetings — persistence over the existing Capital KV store.
import { loadKV, saveKV } from '../../lib/cloudStore'
import { MEETINGS_STORE_KEY, type MeetingBundle } from './types'

interface MeetingsData { bundles: MeetingBundle[]; seq: number }

const empty: MeetingsData = { bundles: [], seq: 0 }

export function loadMeetings(): MeetingsData {
  const d = loadKV<MeetingsData>(MEETINGS_STORE_KEY, empty)
  if (!d.bundles || d.bundles.length === 0) return seeded()
  return d
}

export function saveMeetings(d: MeetingsData) { saveKV(MEETINGS_STORE_KEY, d) }

export function upsertBundle(b: MeetingBundle) {
  const d = loadMeetings()
  const i = d.bundles.findIndex(x => x.meeting.id === b.meeting.id)
  if (i >= 0) d.bundles[i] = b; else d.bundles.unshift(b)
  saveMeetings(d)
}

export const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

// A seeded demo meeting matching the design reference, so the module is populated
// on first open. Real meetings are created by the user and overwrite this in place.
function seeded(): MeetingsData {
  const mid = 'mtg-demo'
  const bundle: MeetingBundle = {
    meeting: {
      id: mid, title: 'HAAVN — Management Sync', startsAt: '2025-07-10T14:00:00',
      durationMin: 45, locationLabel: 'Saint Village, Preston',
      linkedType: 'project', linkedId: null,
      status: 'scheduled', language: { source: 'zh', target: 'en' }, createdBy: 'JB',
    },
    agenda: [
      { id: 'ag1', meetingId: mid, order: 1, title: 'Construction programme & site progress', ownerId: 'Daniel', minutes: 15, linkType: 'project', linkId: null, state: 'done' },
      { id: 'ag2', meetingId: mid, order: 2, title: 'CSCEC co-investment terms — outstanding points', ownerId: 'Jamie', minutes: 15, linkType: 'deal', linkId: null, state: 'active' },
      { id: 'ag3', meetingId: mid, order: 3, title: 'Precision-manufactured build form — factory lead times', ownerId: 'James', minutes: 10, linkType: null, linkId: null, state: 'pending' },
      { id: 'ag4', meetingId: mid, order: 4, title: 'Capital call schedule — next 90 days', ownerId: 'Lewis', minutes: 5, linkType: 'capital', linkId: null, state: 'pending' },
    ],
    attendees: [
      { id: 'at1', meetingId: mid, displayName: 'Jamie Baldwin', email: 'jamie@haavn.au', roleLabel: 'Host', speaksLanguage: 'en' },
      { id: 'at2', meetingId: mid, displayName: 'James Winstanley', email: 'james@haavn.au', roleLabel: 'Dev', speaksLanguage: 'en' },
      { id: 'at3', meetingId: mid, displayName: 'Daniel Sette', email: 'daniel@haavn.au', roleLabel: 'Build', speaksLanguage: 'en' },
      { id: 'at4', meetingId: mid, displayName: 'Lewis Jin', email: 'lewis@haavn.au', roleLabel: 'Capital', speaksLanguage: 'en' },
      { id: 'at5', meetingId: mid, displayName: 'Zheng Wei · CSCEC', email: 'zheng.wei@cscec.cn', roleLabel: '中文', speaksLanguage: 'zh' },
    ],
    utterances: [],
    record: null,
  }
  return { bundles: [bundle], seq: 1 }
}
