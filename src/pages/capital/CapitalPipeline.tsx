import React, { useState } from 'react'
import { useCapital } from './CapitalCommand'
import {
  newId, fmtM, PIPE_STAGES,
  type CapPipelineItem, type PipeStage,
} from './capitalModel'

export default function CapitalPipeline() {
  const { state, update, openDrawer } = useCapital()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<PipeStage | null>(null)

  const open = state.projects.reduce((a, p) => a + p.capitalRequired, 0)
    - state.positions.reduce((a, p) => a + p.committedAmount, 0)

  // Weighted forecast excludes already-funded tickets — they're money, not pipeline.
  const live = state.pipeline.filter(p => p.stage !== 'funded')
  const livePipeline = live.reduce((a, p) => a + p.targetAmount, 0)
  const weighted = live.reduce((a, p) => a + p.targetAmount * (p.probability / 100), 0)
  const funded30 = state.pipeline.filter(p => p.stage === 'funded').reduce((a, p) => a + p.targetAmount, 0)

  const moveTo = (id: string, stage: PipeStage) => {
    update(s => ({ ...s, pipeline: s.pipeline.map(p => p.id === id ? { ...p, stage, probability: stage === 'funded' ? 100 : p.probability } : p) }))
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="kicker">Fundraising · Open raise</div>
          <h1 className="h-sec">Raise Pipeline</h1>
          <div className="h-sub">The open raise as a pipeline — prospect → engaged → soft commit → hard commit → funded, with probability-weighted forecasting. Drag a card to move it.</div>
        </div>
        <button className="btn" onClick={() => openDrawer(<PipelineForm />)}>+ New pipeline item</button>
      </div>

      <div className="kpis k4 mb">
        <div className="kpi"><div className="lab">Open raise target</div><div className="val">{fmtM(Math.max(0, open))}</div><div className="sub">to fully fund portfolio</div></div>
        <div className="kpi accent"><div className="lab">Live pipeline</div><div className="val">{fmtM(livePipeline)}</div><div className="sub">{live.length} active tickets</div></div>
        <div className="kpi"><div className="lab">Weighted (prob.)</div><div className="val">{fmtM(weighted)}</div><div className="sub">probability-adjusted</div></div>
        <div className="kpi g"><div className="lab">Funded</div><div className="val">{fmtM(funded30)}</div><div className="sub">{state.pipeline.filter(p => p.stage === 'funded').length} commitments settled</div></div>
      </div>

      <div className="panel pad">
        <div className="divlabel">Capital raise pipeline</div>
        <div className="kanban">
          {PIPE_STAGES.map(col => {
            const cards = state.pipeline.filter(p => p.stage === col.id)
            const sum = cards.reduce((a, c) => a + c.targetAmount, 0)
            return (
              <div key={col.id}
                className={`kcol${overCol === col.id ? ' over' : ''}`}
                onDragOver={e => { e.preventDefault(); setOverCol(col.id) }}
                onDragLeave={() => setOverCol(c => (c === col.id ? null : c))}
                onDrop={e => {
                  e.preventDefault()
                  const id = dragId ?? e.dataTransfer.getData('text/plain')
                  if (id) moveTo(id, col.id)
                  setDragId(null); setOverCol(null)
                }}>
                <div className="khead">
                  <span>{col.label}</span>
                  <span className="ct">{fmtM(sum, 0)} · {cards.length}</span>
                </div>
                {cards.map(c => {
                  const proj = state.projects.find(p => p.id === c.projectId)
                  return (
                    <div key={c.id}
                      className={`kcard${dragId === c.id ? ' dragging' : ''}`}
                      draggable
                      onDragStart={e => { setDragId(c.id); e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move' }}
                      onDragEnd={() => { setDragId(null); setOverCol(null) }}
                      onClick={() => openDrawer(<PipelineForm itemId={c.id} />)}>
                      <div className="nm">{c.prospectName}</div>
                      <div className="am">{fmtM(c.targetAmount)}</div>
                      <div className="sm">{proj?.name ?? 'Portfolio'} · {c.owner}</div>
                      <div className="prob"><i style={{ width: `${c.probability}%` }} /></div>
                      {c.nextAction && <div className="sm" style={{ marginTop: 7, color: 'var(--ink-2)' }}>→ {c.nextAction}</div>}
                    </div>
                  )
                })}
                {cards.length === 0 && <div className="sm" style={{ color: 'var(--faint)', padding: '10px 6px' }}>Drop here</div>}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function PipelineForm({ itemId }: { itemId?: string }) {
  const { state, update, closeDrawer } = useCapital()
  const existing = itemId ? state.pipeline.find(p => p.id === itemId) : undefined
  const [f, setF] = useState<Partial<CapPipelineItem>>(existing ?? {
    stage: 'prospect', probability: 20, owner: 'Lewis Jin', targetAmount: 0,
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: keyof CapPipelineItem, v: any) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.prospectName?.trim() && !f.investorId) e.prospectName = 'Name an investor or prospect'
    if (!f.targetAmount || f.targetAmount <= 0) e.targetAmount = 'Target amount is required'
    if (f.probability == null || f.probability < 0 || f.probability > 100) e.probability = '0–100'
    if (Object.keys(e).length) { setErr(e); return }

    const record: CapPipelineItem = {
      ...(existing ?? {}), ...f,
      id: existing?.id ?? newId('pip'),
      prospectName: f.prospectName?.trim() || state.investors.find(i => i.id === f.investorId)?.companyName || 'Prospect',
      stage: f.stage as PipeStage,
      probability: f.probability!,
      targetAmount: f.targetAmount!,
      owner: f.owner ?? 'Lewis Jin',
    } as CapPipelineItem

    update(s => ({ ...s, pipeline: existing ? s.pipeline.map(p => p.id === record.id ? record : p) : [...s.pipeline, record] }))
    closeDrawer()
  }

  const remove = () => {
    if (!existing) return
    update(s => ({ ...s, pipeline: s.pipeline.filter(p => p.id !== existing.id) }))
    closeDrawer()
  }

  /**
   * Convert a won ticket into a real position on the investor — the point where
   * the pipeline stops being a forecast and becomes capital. Requires a linked
   * investor, because a position has to belong to someone on file.
   */
  const convert = () => {
    if (!existing?.investorId) return
    const posId = newId('pos')
    update(s => ({
      ...s,
      positions: [...s.positions, {
        id: posId,
        investorId: existing.investorId!,
        projectId: existing.projectId,
        instrumentType: 'lp_equity',
        committedAmount: existing.targetAmount,
        fundedAmount: 0,
        prefRate: 8,
        prefCompounding: 'compound',
        startDate: new Date().toISOString().slice(0, 10),
        status: 'committed',
      }],
      pipeline: s.pipeline.map(p => p.id === existing.id ? { ...p, stage: 'funded', probability: 100, convertedPositionId: posId } : p),
    }))
    closeDrawer()
  }

  return (
    <>
      <div className="kicker">{existing ? 'Edit' : 'New'} pipeline item</div>
      <h2>{existing?.prospectName ?? 'Raise ticket'}</h2>

      <div className="fgrid mt">
        <div className="full">
          <label className="flab">Existing investor</label>
          <select className="fin" value={f.investorId ?? ''} onChange={e => set('investorId', e.target.value || undefined)}>
            <option value="">— New prospect —</option>
            {state.investors.map(i => <option key={i.id} value={i.id}>{i.companyName}</option>)}
          </select>
        </div>
        <div className="full">
          <label className="flab">Prospect name {!f.investorId && <span className="freq">*</span>}</label>
          <input className="fin" value={f.prospectName ?? ''} onChange={e => set('prospectName', e.target.value)} />
          {err.prospectName && <div className="ferr">{err.prospectName}</div>}
        </div>
        <div>
          <label className="flab">Project</label>
          <select className="fin" value={f.projectId ?? ''} onChange={e => set('projectId', e.target.value || undefined)}>
            <option value="">Portfolio</option>
            {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="flab">Target amount <span className="freq">*</span></label>
          <input className="fin mono" type="number" value={f.targetAmount ?? ''} onChange={e => set('targetAmount', parseFloat(e.target.value) || 0)} />
          {err.targetAmount && <div className="ferr">{err.targetAmount}</div>}
        </div>
        <div>
          <label className="flab">Stage <span className="freq">*</span></label>
          <select className="fin" value={f.stage} onChange={e => set('stage', e.target.value)}>
            {PIPE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="flab">Probability % <span className="freq">*</span></label>
          <input className="fin mono" type="number" min={0} max={100} value={f.probability ?? ''} onChange={e => set('probability', parseFloat(e.target.value) || 0)} />
          {err.probability && <div className="ferr">{err.probability}</div>}
        </div>
        <div>
          <label className="flab">Owner</label>
          <select className="fin" value={f.owner ?? 'Lewis Jin'} onChange={e => set('owner', e.target.value)}>
            <option>Lewis Jin</option><option>D. Ferris</option>
          </select>
        </div>
        <div>
          <label className="flab">Next action date</label>
          <input className="fin" type="date" value={f.nextActionDate ?? ''} onChange={e => set('nextActionDate', e.target.value)} />
        </div>
        <div className="full">
          <label className="flab">Next action</label>
          <input className="fin" value={f.nextAction ?? ''} onChange={e => set('nextAction', e.target.value)} />
        </div>
        <div className="full">
          <label className="flab">Notes</label>
          <textarea className="fin" value={f.notes ?? ''} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

      {existing && !existing.convertedPositionId && (
        <>
          <div className="divlabel">Convert to a position</div>
          {existing.investorId
            ? <>
                <div className="note mb">Creates a committed position of {fmtM(existing.targetAmount)} on {state.investors.find(i => i.id === existing.investorId)?.companyName} and marks this ticket funded.</div>
                <button className="btn" onClick={convert}>→ Convert to position</button>
              </>
            : <div className="note">Link this ticket to an investor on file first — a position has to belong to someone.</div>}
        </>
      )}
      {existing?.convertedPositionId && <div className="okbox mt">✓ Converted to a position.</div>}

      <div className="flex gap mt" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={save}>Save</button>
        {existing && <button className="btn ghost" onClick={remove} style={{ color: 'var(--red)', borderColor: 'rgba(200,80,63,.4)' }}>Delete</button>}
        <button className="btn ghost" onClick={closeDrawer}>Cancel</button>
      </div>
    </>
  )
}
