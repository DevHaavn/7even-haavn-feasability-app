import React, { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { useAutosave } from '../../lib/useAutosave'
import ProjectMap from '../../components/ProjectMap'
import { getDisplayName, setDisplayName, timeAgo } from '../../lib/displayName'
import type { SiteDesign, ProjectNote } from '../../db/schema'

interface Props { projectId: string }

// Small mono input matching the concept's `.inp`. Same parse behaviour as the old
// NumberInput (parseFloat || 0) — presentation only, no logic change.
function NumCell({ value, onChange, sm }: { value: number; onChange: (v: number) => void; sm?: boolean }) {
  return (
    <input className={`inp${sm ? ' sm' : ''}`} type="number" value={value || ''} min={0}
      onChange={e => onChange(parseFloat(e.target.value) || 0)} />
  )
}

export default function SiteDesignTab({ projectId }: Props) {
  const { getSiteDesign, saveSiteDesign, projects } = useStore()
  const project = projects.find(p => p.id === projectId)
  const [data, setData] = useState<SiteDesign>(getSiteDesign(projectId))
  const [pasteText, setPasteText] = useState('')
  const [showParser, setShowParser] = useState(false)
  const { commit, undo, canUndo } = useAutosave(saveSiteDesign, [projectId], { onLiveReload: () => setData(getSiteDesign(projectId)) })

  useEffect(() => { setData(getSiteDesign(projectId)) }, [projectId])

  function update(field: keyof SiteDesign, value: number | string) {
    const next = { ...data, [field]: value }
    commit(data, next)
    setData(next)
  }

  // Reconciliation checks (unchanged)
  // ── Project discussion ────────────────────────────────────────────────────
  // Posts ride on the SiteDesign record, so they save and sync through exactly
  // the same path (and the same realtime channel) as every other field here.
  const [who, setWho] = useState<string>(() => getDisplayName())
  const [nameDraft, setNameDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')

  const thread = [...(data.noteThread ?? [])].sort((a, b) => b.ts.localeCompare(a.ts))

  function saveWho() {
    const n = nameDraft.trim()
    if (!n) return
    setDisplayName(n); setWho(n); setNameDraft('')
  }
  function postNote() {
    const text = noteDraft.trim()
    if (!text || !who) return
    const note: ProjectNote = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author: who, text, ts: new Date().toISOString(),
    }
    update('noteThread' as keyof SiteDesign, [...(data.noteThread ?? []), note] as SiteDesign['noteThread'])
    setNoteDraft('')
  }
  function removeNote(id: string) {
    update('noteThread' as keyof SiteDesign, (data.noteThread ?? []).filter(n => n.id !== id) as SiteDesign['noteThread'])
  }

  // Suburb for the map panel's label, read off the project address:
  // "20-30 Newman Street, Preston VIC 3072" -> "Preston". Display only.
  const suburb = (project?.address ?? '').split(',')[1]?.trim()
    .replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|ACT|NT)\b.*$/i, '').trim() ?? ''

  const nsaGFAEff = data.resiGFA > 0 ? data.resiNSA / data.resiGFA : 0
  const nsaGFAFlag = nsaGFAEff > 0 && (nsaGFAEff < 0.78 || nsaGFAEff > 0.87)
  const totalGBA = data.resiGBA + data.childcareGFA + data.churchGFA
    + (data.commercialGFA || 0) + (data.retailGFA || 0) + (data.communalGFA || 0) + data.otherGFA

  // PDF text parser (unchanged)
  function parsePaste() {
    const lines = pasteText.split('\n')
    let resiNSA = 0, resiGFA = 0, resiGBA = 0, balcony = 0
    lines.forEach(line => {
      const nums = line.match(/[\d,]+(\.\d+)?/g)?.map(n => parseFloat(n.replace(/,/g, ''))) ?? []
      const lower = line.toLowerCase()
      if (lower.includes('total nsa') || lower.includes('net sellable')) resiNSA = nums[0] ?? resiNSA
      if (lower.includes('total gfa') || lower.includes('gross floor')) resiGFA = nums[0] ?? resiGFA
      if (lower.includes('total gba') || lower.includes('gross build')) resiGBA = nums[0] ?? resiGBA
      if (lower.includes('balcony') || lower.includes('terrace')) balcony = nums[0] ?? balcony
    })
    if (resiNSA || resiGFA || resiGBA) {
      const next = { ...data, resiNSA: resiNSA || data.resiNSA, resiGFA: resiGFA || data.resiGFA, resiGBA: resiGBA || data.resiGBA, balcony: balcony || data.balcony }
      commit(data, next)
      setData(next)
      setShowParser(false)
      setPasteText('')
    }
  }

  const ancillary: [string, keyof SiteDesign][] = [
    ['Childcare GFA', 'childcareGFA'], ['Church / Vendor GFA', 'churchGFA'], ['Church / Vendor NSA', 'churchNSA'],
    ['Commercial GFA', 'commercialGFA'], ['Commercial NSA', 'commercialNSA'], ['Retail GFA', 'retailGFA'],
    ['Retail NSA', 'retailNSA'], ['Communal areas GFA', 'communalGFA'], ['Other GFA', 'otherGFA'],
  ]

  return (
    <div className="fx-wrap">
      <div className="pagehead">
        <div>
          <div className="kicker">01 · Site &amp; Design</div>
          <h1 className="h-sec">Area Schedule</h1>
          <div className="h-sub">GBA, GFA, NSA and ancillary areas from the architect's schedule.</div>
        </div>
        <div className="flex gap wrapf aic">
          <span className="chip" onClick={() => setShowParser(v => !v)}>⧉ Paste Schedule</span>
          <span className="check">✓ Auto-saved</span>
          {canUndo && <span className="chip" onClick={() => undo(setData)}>↶ Undo</span>}
        </div>
      </div>

      {showParser && (
        <div className="panel pad mb">
          <div className="divlabel">Paste architect schedule</div>
          <p className="note mb">Paste extracted text from an architect's area-schedule PDF. The parser auto-detects NSA, GFA, GBA and balcony totals.</p>
          <textarea className="inp" style={{ width: '100%', height: 120, textAlign: 'left', fontFamily: 'var(--mono)' }}
            placeholder="Paste schedule text here…" value={pasteText} onChange={e => setPasteText(e.target.value)} />
          <div className="flex gap mt">
            <span className="chip gold" onClick={parsePaste}>Parse &amp; Import</span>
            <span className="chip" onClick={() => { setShowParser(false); setPasteText('') }}>Cancel</span>
          </div>
        </div>
      )}

      <div className="two-64">
        {/* ── Left: area inputs ── */}
        <div className="grid">
          <div className="panel pad gold-top">
            <div className="divlabel">Residential areas</div>
            <div className="frow"><span className="fl">Resi NSA (sqm)</span><NumCell value={data.resiNSA} onChange={v => update('resiNSA', v)} /></div>
            <div className="frow"><span className="fl">Resi GFA (sqm)</span><NumCell value={data.resiGFA} onChange={v => update('resiGFA', v)} /></div>
            <div className="frow"><span className="fl">Resi GBA (sqm)<small>Used for cost stack</small></span><NumCell value={data.resiGBA} onChange={v => update('resiGBA', v)} /></div>
            <div className="frow"><span className="fl">Balcony (sqm)</span><NumCell value={data.balcony} onChange={v => update('balcony', v)} /></div>
            <div className="frow"><span className="fl">Basement (sqm)</span><NumCell value={data.basementTotal} onChange={v => update('basementTotal', v)} /></div>
            <div className="frow"><span className="fl">Car spaces</span><NumCell value={data.carSpaces} onChange={v => update('carSpaces', v)} /></div>

            <div className="divlabel">Ancillary areas</div>
            <div className="two" style={{ gap: '2px 24px' }}>
              {ancillary.map(([label, key]) => (
                <div className="frow" key={key}>
                  <span className="fl">{label}</span>
                  <NumCell sm value={(data[key] as number) || 0} onChange={v => update(key, v)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: reconciliation, map, PDF, notes ── */}
        <div className="grid">
          {data.resiNSA > 0 && (
            <div className="panel pad">
              <div className="eyebrow">Reconciliation check</div>
              <div className="flex between aic mt">
                <div><div className="kpi" style={{ border: 'none', boxShadow: 'none', padding: 0, background: 'none' }}>
                  <div className="lab">NSA / GFA efficiency</div>
                  <div className={`val ${nsaGFAFlag ? 'am' : 'g'}`}>{(nsaGFAEff * 100).toFixed(1)}%</div>
                </div></div>
                <span className={nsaGFAFlag ? 'st marg' : 'check'}>{nsaGFAFlag ? '⚠ Outside 78–87%' : '✓ Typical 78–87%'}</span>
              </div>
              {/* Bar reads the same nsaGFAFlag the value and the pill already use —
                  it was hardcoded green, so it signalled "good" while the pill beside
                  it read "⚠ Outside 78–87%". Green only when in range. */}
              <div className="track-bar mt"><div className="fill" style={{ width: `${Math.min(100, nsaGFAEff * 100)}%`, background: nsaGFAFlag ? 'linear-gradient(90deg,var(--amber),var(--gold-hi))' : 'linear-gradient(90deg,var(--emerald),var(--gold-hi))' }} /></div>
              <div className="frow mt2"><span className="fl">Total ancillary GBA</span><span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{totalGBA.toLocaleString()} sqm</span></div>
              <div className="note">✓ Resi {data.resiGBA.toLocaleString()} + Other {(totalGBA - data.resiGBA).toLocaleString()}</div>
            </div>
          )}

          {/* Design: the label is a panel header naming the suburb, with the map
              below it — not floated on top of the map. */}
          <div className="panel" style={{ overflow: 'hidden' }}>
            <div className="eyebrow" style={{ padding: '16px 20px 12px' }}>
              Site location{suburb ? ` · ${suburb}` : ''} · CARTO
            </div>
            <div style={{ height: 260, position: 'relative' }}>
              <ProjectMap address={project?.address ?? ''} pinLabel={project?.mapPin} />
            </div>
          </div>

          <div className="panel pad">
            <div className="eyebrow">Architect development summary (PDF)</div>
            <p className="note mt">Keep pointed at the latest version so numbers double-check against source.</p>
            <input className="inp mt" style={{ width: '100%', textAlign: 'left' }}
              placeholder="Paste link to the architect's development summary PDF…"
              value={data.architectPdfUrl ?? ''} onChange={e => update('architectPdfUrl' as keyof SiteDesign, e.target.value)} />
            {data.architectPdfUrl && (
              <a href={data.architectPdfUrl} target="_blank" rel="noopener noreferrer" className="chip gold" style={{ marginTop: 12, display: 'inline-block', textDecoration: 'none' }}>↗ Open PDF</a>
            )}
          </div>

          {/* Project discussion — posts sync live to everyone on the project via
              the existing realtime channel. */}
          <div className="panel pad">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <div className="eyebrow">Notes · project discussion</div>
              {who && (
                <span className="note" style={{ cursor: 'pointer' }} onClick={() => setWho('')} title="Change the name shown on your notes">
                  posting as <b style={{ color: 'var(--gold)' }}>{who}</b> · change
                </span>
              )}
            </div>

            {!who ? (
              // Asked once, then remembered on this machine. Not a login — see lib/displayName.
              <div style={{ marginTop: 12 }}>
                <p className="note">Add your name so others know who wrote what.</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input className="inp" style={{ flex: 1, textAlign: 'left' }} placeholder="Your name" value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveWho() }} />
                  <span className="chip accent" onClick={saveWho}>Save</span>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <textarea
                  style={{ width: '100%', minHeight: 62, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', color: 'var(--ink)', fontSize: 12.5, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'var(--sans)' }}
                  placeholder="Add a note for the team…"
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postNote() }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <span className={`chip accent${noteDraft.trim() ? '' : ' is-off'}`} onClick={postNote}>+ Post note</span>
                  <span className="note">⌘⏎ to post</span>
                </div>
              </div>
            )}

            {thread.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {thread.map(n => (
                  <div key={n.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>{n.author || 'Someone'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span className="note">{timeAgo(n.ts)}</span>
                        <span className="rowact x" title="Delete note" onClick={() => removeNote(n.id)} style={{ cursor: 'pointer' }}>✕</span>
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 4, whiteSpace: 'pre-wrap' }}>{n.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* The original free-text notes field. Kept and still editable so
                nothing written before the thread existed is lost. */}
            {(data.notes ?? '').trim().length > 0 && (
              <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div className="note" style={{ marginBottom: 6 }}>Earlier site notes</div>
                <textarea style={{ width: '100%', minHeight: 70, background: 'transparent', border: 'none', borderBottom: '1px solid var(--line)', color: 'var(--ink)', fontSize: 13, fontFamily: 'var(--serif)', lineHeight: 1.7, resize: 'vertical', outline: 'none' }}
                  value={data.notes} onChange={e => update('notes', e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
