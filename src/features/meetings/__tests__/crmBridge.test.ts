import { describe, it, expect, beforeEach } from 'vitest'

// This project's vitest runs in node, with no DOM. The bridge only needs
// localStorage, so stub that rather than pulling jsdom in for one suite.
class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  get length() { return this.m.size }
}
;(globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage()

import { syncFromCrm, publishResults, isCrmOwned } from '../crmBridge'
import { loadMeetings, upsertBundle } from '../meetingsStore'
import type { MeetingBundle } from '../types'

const CRM_KEY = 'atrium:crm-meetings'

function publishCrm(meetings: unknown[]) {
  localStorage.setItem(CRM_KEY, JSON.stringify({ v: 1, at: new Date().toISOString(), meetings }))
}
const crmMeeting = (over: Record<string, unknown> = {}) => ({
  id: 'MTG-2601', title: 'Design coordination', project: 'Derrimut Rise', projectId: '26041',
  at: '2026-07-17T10:00', loc: 'Teams', type: 'Design', status: 'scheduled',
  agenda: [{ item: 'Facade package', owner: 'Architect', box: 15 }],
  attendees: [{ name: 'James W', email: 'james@haavn.au' }],
  ...over,
})

describe('CRM → pillar meetings bridge', () => {
  beforeEach(() => localStorage.clear())

  it('imports CRM meetings, prefixing the id and linking the project', () => {
    publishCrm([crmMeeting()])
    expect(syncFromCrm()).toBe(1)
    const b = loadMeetings().bundles.find(x => x.meeting.id === 'crm:MTG-2601')!
    expect(b).toBeDefined()
    expect(b.meeting.title).toBe('Design coordination — Derrimut Rise')
    expect(b.meeting.linkedType).toBe('project')
    expect(b.meeting.linkedId).toBe('26041')
    expect(b.agenda.map(a => a.title)).toEqual(['Facade package'])
    expect(b.attendees[0].email).toBe('james@haavn.au')
    expect(isCrmOwned(b)).toBe(true)
  })

  it('is idempotent — re-syncing updates rather than duplicating', () => {
    publishCrm([crmMeeting()])
    syncFromCrm()
    publishCrm([crmMeeting({ title: 'Design coordination v2' })])
    syncFromCrm()
    const all = loadMeetings().bundles.filter(x => x.meeting.id === 'crm:MTG-2601')
    expect(all).toHaveLength(1)
    expect(all[0].meeting.title).toBe('Design coordination v2 — Derrimut Rise')
  })

  // The one that actually matters: a CRM edit must never destroy work done here.
  it('preserves the transcript and in-progress status across a CRM re-sync', () => {
    publishCrm([crmMeeting()])
    syncFromCrm()
    const b = loadMeetings().bundles.find(x => x.meeting.id === 'crm:MTG-2601')!
    upsertBundle({
      ...b,
      meeting: { ...b.meeting, status: 'recording' },
      utterances: [{ id: 'u1', meetingId: b.meeting.id, speaker: 'JB', tsMs: 0, sourceLang: 'en', original: 'hello' }],
    } as MeetingBundle)

    publishCrm([crmMeeting({ title: 'Renamed in CRM' })])
    syncFromCrm()

    const after = loadMeetings().bundles.find(x => x.meeting.id === 'crm:MTG-2601')!
    expect(after.utterances).toHaveLength(1)          // transcript survived
    expect(after.meeting.status).toBe('recording')    // pillar owns status once started
    expect(after.meeting.title).toBe('Renamed in CRM — Derrimut Rise') // CRM owns the title
  })

  it('reports status back to the CRM, keyed by the original CRM id', () => {
    publishCrm([crmMeeting()])
    syncFromCrm()
    const b = loadMeetings().bundles.find(x => x.meeting.id === 'crm:MTG-2601')!
    upsertBundle({ ...b, meeting: { ...b.meeting, status: 'ended' } } as MeetingBundle)
    publishResults()
    const out = JSON.parse(localStorage.getItem('atrium:pillar-results')!)
    expect(out.byId['MTG-2601'].status).toBe('ended')
  })

  it('leaves pillar-created meetings alone — they are not CRM-owned', () => {
    publishCrm([crmMeeting()])
    syncFromCrm()
    const local = loadMeetings().bundles.find(x => !x.meeting.id.startsWith('crm:'))
    if (local) expect(isCrmOwned(local)).toBe(false)
    publishResults()
    const out = JSON.parse(localStorage.getItem('atrium:pillar-results')!)
    expect(Object.keys(out.byId)).toEqual(['MTG-2601'])   // only CRM meetings reported
  })

  it('does nothing when the CRM has published nothing', () => {
    expect(syncFromCrm()).toBe(0)
  })
})
