import React, { useMemo, useState } from 'react'
import { saveKV } from '../../lib/cloudStore'
import { availableUnits, setUnitStatus, UnitStatus } from './WarStock'

// ── WAR ROOM · PIPELINE — division-specific workflows ────────────────────────
// Modelled on the best of each industry:
//  · 7EVEN Developments — off-the-plan sales CRM (Qobrix/Motii pattern):
//    enquiry → settlement ladder per buyer, plus a workflow board for jobs
//    handed down by managers and partners.
//  · HAAVN Homes — offsite-manufacture delivery (Offsight/RIB One Prefab
//    pattern): design → factory → sea freight → transport → install → handover
//    on one board so factory, freight and install crews never collide.
//  · HAAVN Management — owner's-rep engagements (Mastt/Owner Insite pattern):
//    lead → proposal → engaged, then the phase gates of client-side delivery.

export type DivisionId = '7even-dev' | 'haavn-homes' | 'haavn-mgmt'

interface PipelineDef {
  title: string
  sub: string
  itemLabel: string      // who the row is
  detailLabel: string    // what the row is about
  valueLabel: string
  prefix: string         // id prefix
  stages: string[]
}

const PIPELINES: Record<DivisionId, PipelineDef> = {
  '7even-dev': {
    title: 'Sales — Enquiry to Settlement',
    sub: 'every buyer walked A → Z · apartments, homes, lots',
    itemLabel: 'Buyer', detailLabel: 'Property / Lot', valueLabel: 'Price', prefix: 'SAL',
    stages: ['Enquiry', 'Qualified', 'Inspection', 'Reserved', 'Exchanged', 'Unconditional', 'Settled'],
  },
  'haavn-homes': {
    title: 'Build & Install — Design to Handover',
    sub: 'end-to-end: factory, freight, civils, crane, keys',
    itemLabel: 'Client / Order', detailLabel: 'Homes · Site', valueLabel: 'Contract', prefix: 'ORD',
    stages: ['Design', 'Engineering', 'Factory Order', 'Manufacture', 'Sea Freight', 'Transport', 'Install', 'Handover'],
  },
  'haavn-mgmt': {
    title: 'Engagements — Client-Side Delivery',
    sub: 'external developers · planning, tenders, delivery, handover',
    itemLabel: 'Client', detailLabel: 'Project', valueLabel: 'Fee', prefix: 'ENG',
    stages: ['Lead', 'Proposal', 'Engaged', 'Planning & Design', 'Tender', 'Delivery', 'Handover'],
  },
}

interface PipeItem {
  id: string
  division: DivisionId
  name: string
  detail: string
  value: number
  stageIdx: number
  updated: number
  unitId?: string      // 7ED sales: linked stock-ledger unit
}

// 7ED sales stage → stock-unit status
function unitStatusFor(stageIdx: number): UnitStatus {
  if (stageIdx >= 6) return 'Settled'
  if (stageIdx >= 4) return 'Exchanged'
  if (stageIdx >= 3) return 'Reserved'
  return 'Hold'
}

const JOB_STATUSES = ['Brief', 'In Progress', 'Review', 'Delivered'] as const
type JobStatus = typeof JOB_STATUSES[number]
interface Job { id: string; division: DivisionId; title: string; from: string; due: string; status: JobStatus }

interface PipeData { items: PipeItem[]; jobs: Job[]; seq: number }

const STORE_KEY = 'war_pipeline_v1'
const load = (): PipeData => {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return JSON.parse(raw) } catch { /* fresh */ }
  return { items: [], jobs: [], seq: 100 }
}
const save = (d: PipeData) => saveKV(STORE_KEY, d)

const fmt$ = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`

// Field · Light tokens
const FIELD = '#E8E8EA', LINE = '#D3D4D8', INK = '#0D0D0F', INK_SOFT = '#4A4B50'
const RED = '#FF2F00', GREEN_DEEP = '#0F9E52'
const HUD: React.CSSProperties = { fontFamily: "'Chakra Petch', sans-serif", textTransform: 'uppercase' }
const fieldPanel: React.CSSProperties = { background: '#F6F6F7', border: `1px solid ${LINE}`, borderRadius: 10, padding: '20px 22px' }
const fieldTitle: React.CSSProperties = { ...HUD, color: INK_SOFT, fontSize: 9, letterSpacing: '0.26em', fontWeight: 700, marginBottom: 4 }
const fieldSub: React.CSSProperties = { color: INK_SOFT, fontSize: 10, marginBottom: 16, opacity: 0.8 }
const fieldInput: React.CSSProperties = {
  background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, color: INK,
  fontSize: 12, padding: '8px 10px', outline: 'none', width: '100%',
}
const fieldLabel: React.CSSProperties = {
  ...HUD, color: INK_SOFT, fontSize: 8, letterSpacing: '0.22em', display: 'block', marginBottom: 5, fontWeight: 600,
}

export default function WarPipeline({ division }: { division: DivisionId }) {
  const def = PIPELINES[division]
  const [data, setData] = useState<PipeData>(load)
  const [showAdd, setShowAdd] = useState(false)
  const [fName, setFName] = useState('')
  const [fDetail, setFDetail] = useState('')
  const [fValue, setFValue] = useState('')
  const [fUnit, setFUnit] = useState('')
  const [jTitle, setJTitle] = useState('')
  const [jFrom, setJFrom] = useState('')
  const [jDue, setJDue] = useState('')

  const update = (next: PipeData) => { setData(next); save(next) }

  const items = useMemo(
    () => data.items.filter(i => i.division === division).sort((a, b) => b.stageIdx - a.stageIdx || b.value - a.value),
    [data, division],
  )
  const jobs = useMemo(() => data.jobs.filter(j => j.division === division), [data, division])

  const totalValue = items.reduce((s, i) => s + i.value, 0)
  const doneIdx = def.stages.length - 1
  const settledValue = items.filter(i => i.stageIdx === doneIdx).reduce((s, i) => s + i.value, 0)

  function addItem() {
    const value = parseFloat(fValue) || 0
    if (!fName.trim()) return
    const seq = data.seq + 1
    const unit = division === '7even-dev' && fUnit ? availableUnits().find(u => u.id === fUnit) : undefined
    update({
      ...data, seq,
      items: [{
        id: `${def.prefix}-${String(seq).padStart(4, '0')}`, division, name: fName.trim(),
        detail: unit ? `${unit.project} · ${unit.unit}` : fDetail.trim(),
        value: value || (unit ? unit.price : 0), stageIdx: 0, updated: Date.now(), unitId: unit?.id,
      }, ...data.items],
    })
    if (unit) setUnitStatus(unit.id, 'Hold', fName.trim())
    setFName(''); setFDetail(''); setFValue(''); setFUnit(''); setShowAdd(false)
  }
  const move = (id: string, dir: 1 | -1) => {
    const target = data.items.find(i => i.id === id)
    if (!target) return
    const nextIdx = Math.max(0, Math.min(doneIdx, target.stageIdx + dir))
    if (target.division === '7even-dev' && target.unitId) setUnitStatus(target.unitId, unitStatusFor(nextIdx), target.name)
    update({
      ...data,
      items: data.items.map(i => i.id === id ? { ...i, stageIdx: nextIdx, updated: Date.now() } : i),
    })
  }
  const removeItem = (id: string) => {
    const target = data.items.find(i => i.id === id)
    if (target?.unitId) setUnitStatus(target.unitId, 'Available')
    update({ ...data, items: data.items.filter(x => x.id !== id) })
  }

  function addJob() {
    if (!jTitle.trim()) return
    const seq = data.seq + 1
    update({ ...data, seq, jobs: [{ id: `JOB-${String(seq).padStart(4, '0')}`, division, title: jTitle.trim(), from: jFrom.trim(), due: jDue.trim(), status: 'Brief' }, ...data.jobs] })
    setJTitle(''); setJFrom(''); setJDue('')
  }
  const cycleJob = (id: string) =>
    update({ ...data, jobs: data.jobs.map(j => j.id === id ? { ...j, status: JOB_STATUSES[(JOB_STATUSES.indexOf(j.status) + 1) % JOB_STATUSES.length] } : j) })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stage summary strip */}
      <div style={{ ...fieldPanel, paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <p style={fieldTitle}>{def.title}</p>
            <p style={fieldSub}>{def.sub} · {items.length} live · {fmt$(totalValue)} total{settledValue > 0 ? ` · ${fmt$(settledValue)} ${def.stages[doneIdx].toLowerCase()}` : ''}</p>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className={showAdd ? 'wr-btn' : 'wr-btn wr-solid wr-hot'}
            style={{ ...HUD, marginLeft: 'auto', color: '#fff', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, padding: '8px 16px' }}>
            {showAdd ? 'Close' : `+ New ${def.itemLabel}`}
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, minWidth: def.stages.length * 108 }}>
            {def.stages.map((st, idx) => {
              const inStage = items.filter(i => i.stageIdx === idx)
              return (
                <div key={st} style={{ flex: 1, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, padding: '9px 10px', minWidth: 100 }}>
                  <p style={{ ...HUD, color: INK_SOFT, fontSize: 7.5, letterSpacing: '0.14em', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>{idx + 1} · {st}</p>
                  <p style={{ color: INK, fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', margin: '4px 0 0' }}>
                    {inStage.length}<span style={{ color: INK_SOFT, fontSize: 9.5, fontWeight: 400 }}> · {fmt$(inStage.reduce((s, i) => s + i.value, 0))}</span>
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {showAdd && (
          <div style={{ border: `1px solid ${RED}55`, borderRadius: 8, padding: 16, marginTop: 14, background: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div><label style={fieldLabel}>{def.itemLabel}</label><input value={fName} onChange={e => setFName(e.target.value)} style={fieldInput} /></div>
              {division === '7even-dev' && (
                <div>
                  <label style={fieldLabel}>Stock Unit (locks on add)</label>
                  <select value={fUnit} onChange={e => setFUnit(e.target.value)} style={fieldInput}>
                    <option value="">— No unit link —</option>
                    {availableUnits().map(u => <option key={u.id} value={u.id}>{u.project} · {u.unit} ({u.type})</option>)}
                  </select>
                </div>
              )}
              {(division !== '7even-dev' || !fUnit) && (
                <div><label style={fieldLabel}>{def.detailLabel}</label><input value={fDetail} onChange={e => setFDetail(e.target.value)} style={fieldInput} /></div>
              )}
              <div><label style={fieldLabel}>{def.valueLabel} (AUD)</label><input type="number" value={fValue} onChange={e => setFValue(e.target.value)} style={fieldInput} /></div>
            </div>
            <button onClick={addItem} className="wr-btn wr-solid wr-hot"
              style={{ ...HUD, marginTop: 14, color: '#fff', fontSize: 9, letterSpacing: '0.22em', fontWeight: 700, padding: '9px 22px' }}>
              Add to Pipeline
            </button>
          </div>
        )}

        {/* Rows */}
        {items.length === 0 ? (
          <p style={{ color: INK_SOFT, fontSize: 12, marginTop: 16 }}>Nothing in the pipeline yet.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <div style={{ minWidth: 640, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(i => {
                const done = i.stageIdx === doneIdx
                return (
                  <div key={i.id} style={{
                    display: 'grid', gridTemplateColumns: 'minmax(120px,1.2fr) minmax(110px,1.1fr) 90px minmax(150px,1.4fr) 118px 24px',
                    gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 8,
                    background: done ? '#EDF7F0' : '#fff', border: `1px solid ${done ? `${GREEN_DEEP}55` : LINE}`,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: INK, fontSize: 12.5, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</p>
                      <p style={{ color: INK_SOFT, fontSize: 9.5, fontFamily: 'var(--font-mono)', margin: 0 }}>{i.id}</p>
                    </div>
                    <p style={{ color: INK_SOFT, fontSize: 11.5, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.detail}</p>
                    <span style={{ color: INK, fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'right' }}>{i.value ? fmt$(i.value) : '—'}</span>
                    {/* Stage dots */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }} title={def.stages[i.stageIdx]}>
                      {def.stages.map((_, idx) => (
                        <span key={idx} style={{
                          height: 5, flex: 1, borderRadius: 3,
                          background: idx < i.stageIdx ? GREEN_DEEP : idx === i.stageIdx ? (done ? GREEN_DEEP : INK) : '#DBDCE0',
                        }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => move(i.id, -1)} disabled={i.stageIdx === 0} title="Back a stage"
                        style={{ cursor: 'pointer', border: `1px solid ${LINE}`, background: '#fff', borderRadius: 5, color: INK_SOFT, fontSize: 11, padding: '3px 7px', opacity: i.stageIdx === 0 ? 0.35 : 1 }}>◀</button>
                      <span style={{ ...HUD, color: done ? GREEN_DEEP : INK, fontSize: 7.5, letterSpacing: '0.1em', fontWeight: 700, flex: 1, textAlign: 'center', whiteSpace: 'nowrap' }}>{def.stages[i.stageIdx]}</span>
                      <button onClick={() => move(i.id, 1)} disabled={done} title="Advance"
                        style={{ cursor: 'pointer', border: 'none', background: done ? GREEN_DEEP : INK, borderRadius: 5, color: '#fff', fontSize: 11, padding: '3px 7px', opacity: done ? 0.5 : 1 }}>▶</button>
                    </div>
                    <button onClick={() => removeItem(i.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_SOFT, fontSize: 13 }}>×</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Workflow — jobs handed down by managers & partners */}
      <div style={fieldPanel}>
        <p style={fieldTitle}>Workflow — from managers &amp; partners</p>
        <p style={fieldSub}>briefs land here and walk Brief → In Progress → Review → Delivered · click a status to advance</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
          <input value={jTitle} onChange={e => setJTitle(e.target.value)} placeholder="Job / brief" style={fieldInput} />
          <input value={jFrom} onChange={e => setJFrom(e.target.value)} placeholder="From (manager / partner)" style={fieldInput} />
          <input value={jDue} onChange={e => setJDue(e.target.value)} placeholder="Due" style={fieldInput} />
          <button onClick={addJob} className="wr-btn wr-solid"
            style={{ ...HUD, color: '#fff', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, padding: '8px 0' }}>
            + Add Job
          </button>
        </div>
        {jobs.length === 0 ? (
          <p style={{ color: INK_SOFT, fontSize: 12 }}>No jobs on the board.</p>
        ) : jobs.map(j => (
          <div key={j.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.6fr) minmax(110px,1fr) 90px 110px 24px', gap: 12, alignItems: 'center', padding: '8px 2px', borderBottom: `1px solid ${LINE}` }}>
            <span style={{ color: INK, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</span>
            <span style={{ color: INK_SOFT, fontSize: 11 }}>{j.from}</span>
            <span style={{ color: INK_SOFT, fontSize: 11, fontFamily: 'var(--font-mono)' }}>{j.due}</span>
            <button onClick={() => cycleJob(j.id)}
              style={{
                ...HUD, cursor: 'pointer', borderRadius: 4, padding: '4px 8px', fontSize: 8, letterSpacing: '0.14em', fontWeight: 700, border: 'none', color: '#fff',
                background: j.status === 'Delivered' ? GREEN_DEEP : j.status === 'Review' ? '#E08A2E' : j.status === 'In Progress' ? INK : '#7A7C84',
              }}>
              {j.status}
            </button>
            <button onClick={() => update({ ...data, jobs: data.jobs.filter(x => x.id !== j.id) })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_SOFT, fontSize: 13 }}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
