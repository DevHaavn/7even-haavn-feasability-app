// ATRIUM · Meetings module — data model (spec §3).
// Persisted through the existing Capital KV store (loadKV/saveKV → capitalCloud),
// the same shared, cloud-synced store the Atrium CRM and the rest of the HM area
// use — so meeting records live alongside the CRM objects they link to.

export type MeetingStatus = 'scheduled' | 'recording' | 'ended' | 'sent'
export type CrmLinkType = 'project' | 'deal' | 'contact' | 'capital'

// A scheduled or recorded meeting.
export interface Meeting {
  id: string
  title: string
  startsAt: string              // ISO
  durationMin: number
  locationLabel?: string        // "Saint Village, Preston"
  // primary CRM link — pre-selects routing in wrap-up
  linkedType: Exclude<CrmLinkType, 'capital'> | null
  linkedId: string | null
  status: MeetingStatus
  language: { source: 'zh' | 'auto'; target: 'en' }
  createdBy: string             // user id / initials
}

export interface AgendaItem {
  id: string
  meetingId: string
  order: number
  title: string
  ownerId: string | null
  minutes: number
  linkType: CrmLinkType | null
  linkId: string | null
  state: 'pending' | 'active' | 'done'   // auto-tracked during Live
}

export interface Attendee {
  id: string
  meetingId: string
  // either a team member or a CRM contact
  userId?: string
  contactId?: string
  displayName: string
  email: string
  roleLabel?: string            // "Host", "Capital", "中文"
  speaksLanguage?: 'en' | 'zh'
}

// One transcript line (interim or final).
export interface Utterance {
  id: string
  meetingId: string
  speaker: string               // display name or diarised label
  tsMs: number                  // offset from meeting start
  sourceLang: 'en' | 'zh'
  original: string              // as spoken
  translation?: string          // English, only when sourceLang === 'zh'
  isFinal: boolean              // false = interim (render greyed w/ caret)
}

export interface MeetingAction {
  text: string
  ownerId?: string
  dueLabel?: string
}

export interface MeetingRecord {
  id: string
  meetingId: string
  summary: string
  decisions: string[]
  actions: MeetingAction[]
  exports: { enPdf?: string; bilingualPdf?: string; audio?: string }
  routedTo: { type: Exclude<CrmLinkType, 'capital'>; id: string } | null
  sentAt?: string
  sentFrom?: string             // sender email used
}

// Everything for one meeting, as stored under a single KV key.
export interface MeetingBundle {
  meeting: Meeting
  agenda: AgendaItem[]
  attendees: Attendee[]
  utterances: Utterance[]
  record: MeetingRecord | null
}

export const MEETINGS_STORE_KEY = 'atrium_meetings_v1'
