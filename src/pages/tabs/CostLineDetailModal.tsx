import React, { useState, useRef } from 'react'
import type { CostLineItem, TimelineStatus } from '../../db/schema'
import { COST_PHASES } from '../../db/schema'
import {
  baseAmt, effAmt, varSum, isFixed,
  withBasis, withPct, withUnits, withRate, withAddVariation, withRemoveVariation,
  type CostCtx,
} from '../../lib/costLine'
import { uploadProjectDoc, removeProjectDoc, isUploadedDoc, docFileName } from '../../lib/uploads'
import { syncCostLineTask, removeCostLineTask } from '../../lib/costTimeline'

const money = (n: number) => `$${Math.round(n).toLocaleString()}`
const BASIS_OPTS: [string, string][] = [['', '$ / Unit'], ['construction', '% of Constr.'], ['gdv', '% of GRV']]
const FUND_OPTS: [string, string][] = [['equity', 'Equity'], ['senior', 'Senior'], ['debt', 'Debt'], ['blend', 'Blend'], ['both', 'Both']]

// Traffic-light options — same enum/colours as the Timeline (STATUS_COLORS).
const STATUS: [TimelineStatus, string, string][] = [
  ['critical', 'Critical', 'var(--red, #c0392b)'],
  ['delayed', 'Delayed', 'var(--amber, #c0842c)'],
  ['in-progress', 'On Track', 'var(--gold, #b08a3e)'],
  ['complete', 'Complete', 'var(--emerald, #2f7d54)'],
  ['not-started', 'Not Started', 'var(--ink-3, #8a8f88)'],
]
const BAR_COLORS = ['var(--red, #c0392b)', 'var(--amber, #c0842c)', 'var(--gold, #b08a3e)', 'var(--emerald, #2f7d54)', 'var(--blue, #3b6fb0)', 'var(--slate, #5a5f57)']

const lab: React.CSSProperties = { fontFamily: 'var(--mono, monospace)', fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ink-3, #767c72)', display: 'block', marginBottom: 7 }
const inp: React.CSSProperties = { width: '100%', background: 'var(--card, #fff)', border: '1px solid var(--border, #e4e6e0)', borderRadius: 10, padding: '11px 12px', fontSize: 14, color: 'var(--ink, #14170f)', outline: 'none', fontFamily: 'var(--sans, sans-serif)' }
const ro: React.CSSProperties = { ...inp, background: 'var(--bg, #f4f5f2)', fontFamily: 'var(--mono, monospace)', color: 'var(--ink-2, #3c4038)' }
const sectS: React.CSSProperties = { borderTop: '1px solid var(--border, #e4e6e0)', padding: '20px 0' }
const sectH: React.CSSProperties = { fontFamily: 'var(--mono, monospace)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--ink-3, #767c72)', margin: '0 0 14px' }
const tag: React.CSSProperties = { color: 'var(--faint, #a6aca1)', textTransform: 'none', letterSpacing: '.02em', fontFamily: 'var(--sans, sans-serif)', fontSize: 11 }

interface Props {
  item: CostLineItem
  sectionLabel: string
  groupLabel?: string
  projectId: string
  ctx: CostCtx
  onPatch: (patch: Partial<CostLineItem>) => void
  onDelete: () => void
  onClose: () => void
}

export default function CostLineDetailModal({ item, sectionLabel, groupLabel, projectId, ctx, onPatch, onDelete, onClose }: Props) {
  const base = baseAmt(item, ctx)
  const cur = effAmt(item, ctx)
  const vSum = varSum(item)
  const movement = base ? (vSum / base) * 100 : 0

  // fee-proposal PDF state
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [pdfErr, setPdfErr] = useState<string | null>(null)
  const url = item.feeProposalUrl || ''
  const ours = isUploadedDoc(url)
  async function pickPdf(file?: File) {
    if (!file) return
    setPdfErr(null); setBusy(true)
    const prev = url
    try {
      const next = await uploadProjectDoc(projectId, file)
      onPatch({ feeProposalUrl: next })
      if (isUploadedDoc(prev) && prev !== next) await removeProjectDoc(prev)
    } catch (e: any) { setPdfErr(e?.message ?? 'Upload failed.') }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }
  async function clearPdf() {
    const prev = url
    onPatch({ feeProposalUrl: '' })
    if (isUploadedDoc(prev)) await removeProjectDoc(prev)
  }

  // variation add form
  const [vDate, setVDate] = useState('')
  const [vReason, setVReason] = useState('')
  const [vAmt, setVAmt] = useState('')
  function addVar() {
    const a = parseFloat(vAmt.replace(/[^0-9.\-]/g, ''))
    if (!vReason.trim() && !a) return
    onPatch(withAddVariation(item, { date: vDate || new Date().toISOString().slice(0, 10), reason: vReason.trim() || 'Adjustment', amount: Number.isFinite(a) ? a : 0 }))
    setVDate(''); setVReason(''); setVAmt('')
  }

  // On close, push the item's critical-path settings to the Timeline (upsert/remove
  // the linked task). On delete, drop the linked task too.
  const close = () => { try { syncCostLineTask(projectId, sectionLabel, item) } catch {} ; onClose() }
  const del = () => { try { removeCostLineTask(projectId, item.id) } catch {} ; onDelete(); onClose() }

  const isPct = item.feeBasis === 'construction' || item.feeBasis === 'gdv'
  let run = base

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(10,12,8,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '38px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(900px, 100%)', background: 'var(--card, #fbfcfb)', border: '1px solid var(--border, #dfe2dc)', borderRadius: 18, boxShadow: '0 40px 100px rgba(0,0,0,.4)', overflow: 'hidden' }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '22px 26px 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--ink-3, #767c72)' }}>Edit cost item · {sectionLabel}{groupLabel ? ` · ${groupLabel}` : ''}</div>
            <input value={item.label} onChange={e => onPatch({ label: e.target.value })} placeholder="Item description"
              style={{ ...inp, border: 'none', background: 'transparent', fontSize: 26, fontWeight: 600, padding: '4px 0 0', fontFamily: 'var(--serif, Georgia, serif)' }} />
          </div>
          <button onClick={close} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--ink-3, #767c72)', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '10px 26px 4px' }}>

          {/* pricing basis */}
          <div style={{ ...sectS, borderTop: 'none' }}>
            <div style={sectH}>Pricing basis</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              <div><label style={lab}>Basis</label><select style={inp} value={item.feeBasis ?? ''} onChange={e => onPatch(withBasis(item, e.target.value, ctx))}>{BASIS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div><label style={lab}>Units</label><input style={inp} type="number" value={isPct ? '' : (item.units ?? '')} onChange={e => onPatch(withUnits(item, parseFloat(e.target.value) || 0, ctx))} /></div>
              <div><label style={lab}>{isPct ? 'Percent %' : 'Rate'}</label>{isPct
                ? <input style={inp} type="number" value={item.pct != null ? +(item.pct * 100).toFixed(4) : ''} onChange={e => onPatch(withPct(item, parseFloat(e.target.value) || 0, ctx))} />
                : <input style={inp} type="number" value={item.baseRate ?? ''} onChange={e => onPatch(withRate(item, parseFloat(e.target.value) || 0, ctx))} />}</div>
              <div><label style={lab}>Funded by</label><select style={inp} value={item.fundedBy || 'equity'} onChange={e => onPatch({ fundedBy: e.target.value as CostLineItem['fundedBy'] })}>{FUND_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 14 }}>
              <div><label style={lab}>Original budget</label><input style={ro} readOnly value={money(base)} /></div>
              <div><label style={lab}>GST {item.gstFree ? '(GST-free)' : ''}</label><input style={ro} readOnly value={money(item.gstFree ? 0 : cur * 0.1)} /></div>
              <div><label style={lab}>Current budget (incl. variations)</label><input style={{ ...ro, fontWeight: 700 }} readOnly value={money(cur)} /></div>
            </div>
          </div>

          {/* pricing status */}
          <div style={sectS}>
            <div style={sectH}>Pricing status <span style={tag}>— tells Daniel &amp; James if this cost is locked or still open</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button onClick={() => onPatch({ pricing: 'fixed' })} style={{ textAlign: 'left', border: `1.5px solid ${isFixed(item) ? 'var(--emerald, #2f7d54)' : 'var(--border, #e4e6e0)'}`, background: isFixed(item) ? 'var(--emerald-bg, #e7f2ea)' : 'var(--card, #fff)', borderRadius: 13, padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--emerald, #2f7d54)' }} /> Fixed</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3, #767c72)', marginTop: 5, lineHeight: 1.45 }}>Fee proposal received &amp; locked in. Counts as priced on the dashboard gauge.</div>
              </button>
              <button onClick={() => onPatch({ pricing: 'variable' })} style={{ textAlign: 'left', border: `1.5px solid ${!isFixed(item) ? 'var(--amber, #c0842c)' : 'var(--border, #e4e6e0)'}`, background: !isFixed(item) ? 'var(--amber-bg, #fbf1e0)' : 'var(--card, #fff)', borderRadius: 13, padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--amber, #c0842c)' }} /> Variable</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3, #767c72)', marginTop: 5, lineHeight: 1.45 }}>Indicative only — not properly priced yet. Shows as outstanding on the dashboard.</div>
              </button>
            </div>
          </div>

          {/* fee proposal PDF */}
          <div style={sectS}>
            <div style={sectH}>Fee proposal <span style={tag}>— attach the PDF, open it straight from the line item</span></div>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={e => pickPdf(e.target.files?.[0])} />
            {url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--emerald, #2f7d54)', background: 'var(--emerald-bg, #e7f2ea)', borderRadius: 12, padding: '12px 14px' }}>
                  <span style={{ width: 32, height: 40, borderRadius: 5, background: '#c0392b', color: '#fff', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>PDF</span>
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ours ? docFileName(url) : url}</div><div style={{ fontSize: 11, color: 'var(--ink-3, #767c72)' }}>{ours ? 'uploaded · stored in the cloud with the project' : 'external link'}</div></div>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...btn(true), textDecoration: 'none' }}>↗ Open PDF</a>
                <button style={btn()} onClick={() => !busy && fileRef.current?.click()}>{busy ? 'Uploading…' : '⤓ Replace'}</button>
                <button style={btn()} onClick={() => !busy && clearPdf()}>✕ Remove</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, border: '1.5px dashed var(--border, #e4e6e0)', borderRadius: 12, padding: 15, textAlign: 'center', color: 'var(--ink-3, #767c72)', fontSize: 13, background: 'var(--card, #fff)' }}>◇ No fee proposal attached yet</div>
                <button style={btn(true)} onClick={() => !busy && fileRef.current?.click()}>{busy ? 'Uploading…' : '⤓ Attach PDF'}</button>
              </div>
            )}
            {pdfErr && <div style={{ color: 'var(--red, #c0392b)', fontSize: 12, marginTop: 8 }}>{pdfErr}</div>}
          </div>

          {/* cost variations */}
          <div style={sectS}>
            <div style={sectH}>Cost variations <span style={tag}>— track every blow-out: why &amp; when</span></div>
            <div style={{ border: '1px solid var(--border, #e4e6e0)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ ...varRow, background: 'var(--bg, #f3f4f1)', fontFamily: 'var(--mono, monospace)', fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3, #767c72)' }}><div>Date</div><div>Reason for change</div><div style={{ textAlign: 'right' }}>Amount</div><div style={{ textAlign: 'right' }}>Running budget</div><div /></div>
              {(!item.variations || item.variations.length === 0) && <div style={{ padding: 12, textAlign: 'center', color: 'var(--faint, #a6aca1)', fontSize: 13 }}>No variations — original fee holds.</div>}
              {(item.variations || []).map(v => { run += (+v.amount || 0); return (
                <div key={v.id} style={varRow}>
                  <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12 }}>{v.date || '—'}</div>
                  <div style={{ fontSize: 13 }}>{v.reason}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--mono, monospace)', fontWeight: 600, color: (+v.amount >= 0) ? 'var(--red, #c0392b)' : 'var(--emerald, #2f7d54)' }}>{(+v.amount >= 0 ? '+' : '')}{money(+v.amount)}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--mono, monospace)', color: 'var(--ink-2, #3c4038)' }}>{money(run)}</div>
                  <button onClick={() => onPatch(withRemoveVariation(item, v.id))} style={{ background: 'none', border: 'none', color: 'var(--faint, #a6aca1)', fontSize: 16, cursor: 'pointer' }}>×</button>
                </div>
              )})}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px auto', gap: 10, marginTop: 12 }}>
              <input style={inp} type="date" value={vDate} onChange={e => setVDate(e.target.value)} />
              <input style={inp} placeholder="Reason (e.g. scope increase, redesign)" value={vReason} onChange={e => setVReason(e.target.value)} />
              <input style={inp} type="number" placeholder="Amount ±$" value={vAmt} onChange={e => setVAmt(e.target.value)} />
              <button style={btn(true)} onClick={addVar}>+ Add variation</button>
            </div>
            <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginTop: 16, padding: '14px 16px', background: 'var(--bg, #f6f7f5)', borderRadius: 12 }}>
              {[['Original', money(base), false], ['Variations', `${vSum >= 0 ? '+' : ''}${money(vSum)}`, vSum > 0], ['Current', money(cur), false], ['Movement', `${movement > 0 ? '+' : ''}${movement.toFixed(1)}%`, movement > 0]].map(([l, v, red], i) => (
                <div key={i}><span style={{ display: 'block', fontFamily: 'var(--mono, monospace)', fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink-3, #767c72)', marginBottom: 4 }}>{l as string}</span><b style={{ fontFamily: 'var(--mono, monospace)', fontSize: 17, color: red ? 'var(--red, #c0392b)' : 'var(--ink, #14170f)' }}>{v as string}</b></div>
              ))}
            </div>
          </div>

          {/* timeline & critical path */}
          <div style={sectS}>
            <div style={sectH}>Timeline &amp; critical path <span style={tag}>— drives this item’s bar on the Timeline Gantt</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label style={lab}>Phase</label><select style={inp} value={item.phase || ''} onChange={e => onPatch({ phase: (e.target.value || undefined) as CostLineItem['phase'] })}><option value="">—</option>{COST_PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
              <div><label style={lab}>Status / traffic light</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{STATUS.map(([s, l, c]) => (
                  <button key={s} onClick={() => onPatch({ status: s })} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${item.status === s ? 'var(--ink, #2b2f27)' : 'var(--border, #e4e6e0)'}`, boxShadow: item.status === s ? 'inset 0 0 0 1px var(--ink, #2b2f27)' : 'none', background: 'var(--card, #fff)', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #3c4038)', cursor: 'pointer' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />{l}</button>
                ))}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div><label style={lab}>Start date</label><input style={inp} type="date" value={item.taskStart || ''} onChange={e => onPatch({ taskStart: e.target.value })} /></div>
              <div><label style={lab}>End date</label><input style={inp} type="date" value={item.taskEnd || ''} onChange={e => onPatch({ taskEnd: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div><label style={lab}>Progress — {item.progress ?? 0}%</label><input type="range" min={0} max={100} value={item.progress ?? 0} onChange={e => onPatch({ progress: parseInt(e.target.value, 10) })} style={{ width: '100%' }} /></div>
              <div><label style={lab}>Bar colour (critical path)</label>
                <div style={{ display: 'flex', gap: 9 }}>{BAR_COLORS.map(c => <button key={c} onClick={() => onPatch({ barColor: c })} style={{ width: 30, height: 30, borderRadius: 8, border: `2px solid ${item.barColor === c ? 'var(--ink, #14170f)' : 'transparent'}`, background: c, cursor: 'pointer' }} />)}</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: 'var(--ink-2, #3c4038)' }}><input type="checkbox" checked={!!item.milestone} onChange={e => onPatch({ milestone: e.target.checked })} /> Milestone (diamond marker)</label>
              </div>
            </div>
            <div style={{ marginTop: 14 }}><label style={lab}>Notes</label><textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={item.notes && !item.notes.includes('|') ? item.notes : ''} placeholder="Notes for this cost item…" onChange={e => onPatch({ notes: e.target.value })} /></div>
            <div style={{ fontSize: 11, color: 'var(--faint, #a6aca1)', marginTop: 8 }}>Set a status and dates to place this cost item on the Timeline Gantt as a live task. It stays in sync both ways.</div>
          </div>

        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 26px', borderTop: '1px solid var(--border, #e4e6e0)', background: 'var(--bg, #f1f3f0)' }}>
          <button onClick={del} style={{ background: 'none', border: '1px solid var(--red-bg, #fbe9e6)', color: 'var(--red, #c0392b)', borderRadius: 11, padding: '11px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Delete line</button>
          <button onClick={close} style={{ background: 'var(--ink, #1c2a1e)', color: '#fff', border: 'none', borderRadius: 11, padding: '12px 30px', fontWeight: 700, fontSize: 13, letterSpacing: '.04em', cursor: 'pointer' }}>Done</button>
        </div>
      </div>
    </div>
  )
}

const varRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '110px 1fr 110px 120px 28px', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-2, #eceee9)' }
function btn(primary = false): React.CSSProperties {
  return primary
    ? { background: 'var(--ink, #1f2a20)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
    : { background: 'var(--card, #fff)', color: 'var(--ink-2, #3c4038)', border: '1px solid var(--border, #e4e6e0)', borderRadius: 10, padding: '11px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
}
