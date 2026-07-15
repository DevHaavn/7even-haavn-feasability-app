import React from 'react'
import { Panel } from '../../components/ui/Panel'
import { loadMeetings } from './meetingsStore'
import { crmSearch } from './crm'

// The CRM-side view of the Meetings pillar: every recorded meeting and the record
// it produced, shown back inside ATRIUM so a meeting routed to a project / deal /
// contact is visible from the CRM. Read-only — editing happens in the Meetings
// pillar (HM → 02).
export default function CrmMeetingsList() {
  const bundles = loadMeetings().bundles
  const crm = crmSearch('')
  const linkLabel = (id?: string | null) => (id && crm.find(x => x.id === id)?.label) || null

  const badge: Record<string, [string, string]> = {
    scheduled: ['var(--mute)', 'Scheduled'], recording: ['#C6402B', 'Recording'],
    ended: ['var(--f-500)', 'Ended'], sent: ['var(--f-600)', 'Sent'],
  }

  return (
    <Panel title="Meetings" subtitle="Recorded meetings & notes routed from the Meetings pillar (HM → 02)">
      <div style={{ padding: 18 }}>
        {bundles.length === 0 && <p style={{ color: 'var(--mute)', fontSize: 13, margin: 0 }}>No meetings yet. Start one in HM → Meetings & Digital Workflow — records routed to a project, deal or contact appear here.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bundles.map(b => {
            const link = linkLabel(b.meeting.linkedId) || linkLabel(b.record?.routedTo?.id || null)
            const [col, lbl] = badge[b.meeting.status] || ['var(--mute)', b.meeting.status]
            return (
              <div key={b.meeting.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-m)', background: 'var(--grey-50)', borderLeft: '3px solid var(--f-600)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{b.meeting.title}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: col, border: `1px solid ${col}`, borderRadius: 100, padding: '2px 8px' }}>{lbl}</span>
                  {link && <span style={{ fontSize: 11, color: 'var(--f-700)', background: 'var(--f-50)', border: '1px solid var(--f-100)', borderRadius: 100, padding: '2px 8px' }}>↔ {link}</span>}
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{(b.meeting.startsAt || '').replace('T', ' ')}</span>
                </div>
                {b.record?.summary && <p style={{ margin: '6px 0', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{b.record.summary}</p>}
                {b.record?.actions?.length ? (
                  <div style={{ marginTop: 6 }}>
                    {b.record.actions.map((a, i) => (
                      <div key={i} style={{ fontSize: 12.5, color: 'var(--mute)', display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--f-600)' }}>▸</span><span>{a.text}{a.dueLabel ? ` · ${a.dueLabel}` : ''}{a.ownerId ? ` · ${a.ownerId}` : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>
                  {b.agenda.length} agenda · {b.attendees.length} attendees{b.record?.sentFrom ? ` · emailed from ${b.record.sentFrom}` : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
