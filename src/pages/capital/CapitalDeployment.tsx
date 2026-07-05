import React, { useMemo, useState } from 'react'
import { saveKV } from '../../lib/cloudStore'

// ── CAPITAL DEPLOYMENT — Capital Command Centre (Capital pillar 02) ─────────
// Two surfaces per the brand system: Command · Dark for the briefing, and
// Field · Light (soft grey ground, crisp ink text) for the working screens
// where directors edit the raise. All figures editable, held locally, seeded
// from the capital raising dashboard. Exclusive to the Capital Base.

const OBSIDIAN = '#0C0D0E', PANEL = '#16181B', STEEL = '#23262A', SMOKE = '#9A9CA3', SMOKE_DIM = '#63656C'
const FIELD = '#E8E8EA', FIELD_PANEL = '#F6F6F7', LINE = '#D3D4D8', INK = '#0D0D0F', INK_SOFT = '#4A4B50'
const GREEN = '#1FE87A', GREEN_DEEP = '#0F9E52'
const HUD: React.CSSProperties = { fontFamily: "'Chakra Petch', sans-serif", textTransform: 'uppercase' }

interface StageLine { name: string; reqM: number; raisedM: number; depM: number }
interface ProjectLine { name: string; type: string; reqM: number; raisedM: number; depM: number }
interface PartnerLine { name: string; role: string; committedM: number; fundedM: number }
interface CallLine { month: string; amountM: number }

interface Objective { title: string; owner: string; pct: number }
interface TeamMember { initials: string; name: string; role: string; note: string; status: 'On track' | 'Ahead' | 'Watch' | 'Behind' }

interface DeployData {
  stages: StageLine[]
  projects: ProjectLine[]
  partners: PartnerLine[]
  calls: CallLine[]
  nextCall: string
  velocity: number[]
  objectives: Objective[]
  team: TeamMember[]
}

const SEED: DeployData = {
  stages: [
    { name: 'Soft Costs & Permits', reqM: 28, raisedM: 24, depM: 19 },
    { name: 'Land Acquisition', reqM: 86, raisedM: 71, depM: 58 },
    { name: 'Construction Equity', reqM: 164, raisedM: 86, depM: 39 },
    { name: 'Working Capital', reqM: 34, raisedM: 17, depM: 8 },
  ],
  projects: [
    { name: 'Saint Village · Preston', type: 'BTR + BTS + Hotel', reqM: 172, raisedM: 118, depM: 82 },
    { name: '7EVEN Living · Werribee', type: 'Build-to-Rent', reqM: 68, raisedM: 44, depM: 26 },
    { name: '7EVEN Living · Waurn Ponds', type: 'Build-to-Rent', reqM: 52, raisedM: 30, depM: 14 },
    { name: 'Pipeline · Church-Land Sites', type: 'Acquisition', reqM: 20, raisedM: 6, depM: 2 },
  ],
  partners: [
    { name: 'CSCEC Partnership', role: 'Construction Partner', committedM: 52, fundedM: 34 },
    { name: 'Lewis Jin', role: 'Director · Capital', committedM: 46, fundedM: 31 },
    { name: 'JUDAH Trust', role: 'Holding Entity', committedM: 38, fundedM: 24 },
    { name: 'Meridian Family Office', role: 'Equity Partner', committedM: 28, fundedM: 18 },
    { name: 'Abbotsford Capital', role: 'Equity Partner', committedM: 22, fundedM: 12 },
    { name: 'Daniel Sette', role: 'Director · Delivery', committedM: 12, fundedM: 5 },
  ],
  calls: [
    { month: 'AUG', amountM: 14 }, { month: 'SEP', amountM: 22 }, { month: 'OCT', amountM: 18 },
    { month: 'NOV', amountM: 26 }, { month: 'DEC', amountM: 19 }, { month: 'JAN', amountM: 15 },
  ],
  nextCall: 'AUG · $14M — Construction Equity, Saint Village Preston.',
  velocity: [4, 9, 16, 24, 33, 44, 56, 69, 82, 96, 110, 124],
  objectives: [
    { title: '$300M portfolio GDV', owner: 'Capital + Development', pct: 82 },
    { title: '120 HAAVN homes installed', owner: 'Manufacturing + Logistics', pct: 58 },
    { title: 'Blended margin ≥ 22%', owner: 'Feasibility + Finance', pct: 91 },
    { title: 'Zero install clashes', owner: 'Site Delivery', pct: 74 },
  ],
  team: [
    { initials: 'JB', name: 'Jamie B.', role: 'Director', note: 'Capital · Strategy', status: 'On track' },
    { initials: 'DS', name: 'Daniel Sette', role: 'Director · Delivery', note: 'Projects · Site', status: 'On track' },
    { initials: 'LJ', name: 'Lewis Jin', role: 'Director · Capital', note: 'Raise · Partners', status: 'Ahead' },
  ],
}

const STORE_KEY = 'capital_deploy_v2'
const load = (): DeployData => {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return { ...JSON.parse(JSON.stringify(SEED)), ...JSON.parse(raw) }
    // carry forward any edits made in the v1 store
    const v1 = localStorage.getItem('capital_deploy_v1')
    if (v1) return { ...JSON.parse(JSON.stringify(SEED)), ...JSON.parse(v1) }
  } catch { /* seed */ }
  return JSON.parse(JSON.stringify(SEED))
}
const save = (d: DeployData) => saveKV(STORE_KEY, d)

const fmtM = (n: number) => `$${Math.round(n)}M`

const panel: React.CSSProperties = { background: PANEL, border: `1px solid ${STEEL}`, borderRadius: 10, padding: '20px 22px' }
const fieldPanelS: React.CSSProperties = { background: FIELD, border: `1px solid ${LINE}`, borderRadius: 10, padding: '20px 22px' }
const panelTitle: React.CSSProperties = { ...HUD, color: SMOKE_DIM, fontSize: 9, letterSpacing: '0.26em', fontWeight: 700, marginBottom: 4 }
const fieldTitle: React.CSSProperties = { ...HUD, color: INK_SOFT, fontSize: 9, letterSpacing: '0.26em', fontWeight: 700, marginBottom: 4 }
const panelSub: React.CSSProperties = { color: SMOKE_DIM, fontSize: 10, marginBottom: 16 }
const fieldSub: React.CSSProperties = { color: INK_SOFT, fontSize: 10, marginBottom: 16, opacity: 0.8 }
const numCell: React.CSSProperties = {
  background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, color: INK,
  fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', textAlign: 'right', padding: '10px 12px', outline: 'none', width: 112,
}
const textCell: React.CSSProperties = {
  background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, color: INK,
  fontSize: 14, padding: '10px 12px', outline: 'none', width: '100%',
}

function Bar({ segments, height = 8, track = '#0A0B0C', border = STEEL }: { segments: { widthPct: number; color: string }[]; height?: number; track?: string; border?: string }) {
  return (
    <div style={{ height, borderRadius: height / 2, background: track, border: `1px solid ${border}`, overflow: 'hidden', display: 'flex' }}>
      {segments.map((s, i) => <div key={i} style={{ width: `${Math.max(0, Math.min(100, s.widthPct))}%`, background: s.color, transition: 'width 0.4s' }} />)}
    </div>
  )
}

type View = 'command' | 'projects' | 'stages' | 'partners' | 'calls' | 'objectives'

export default function CapitalDeployment() {
  const [view, setView] = useState<View>('command')
  const [data, setData] = useState<DeployData>(load)
  const update = (next: DeployData) => { setData(next); save(next) }

  // Portfolio totals derive from the projects
  const requiredM = useMemo(() => data.projects.reduce((s, p) => s + p.reqM, 0), [data])
  const raisedM = useMemo(() => data.projects.reduce((s, p) => s + p.raisedM, 0), [data])
  const deployedM = useMemo(() => data.projects.reduce((s, p) => s + p.depM, 0), [data])
  const toRaiseM = requiredM - raisedM

  const vmax = Math.max(...data.velocity, 1)
  const vpts = data.velocity.map((v, i) => `${(i / (data.velocity.length - 1)) * 100},${40 - (v / vmax) * 36}`).join(' ')

  // Generic editors
  const editStage = (i: number, k: keyof StageLine, v: string | number) =>
    update({ ...data, stages: data.stages.map((s, idx) => idx === i ? { ...s, [k]: v } : s) })
  const editProject = (i: number, k: keyof ProjectLine, v: string | number) =>
    update({ ...data, projects: data.projects.map((s, idx) => idx === i ? { ...s, [k]: v } : s) })
  const editPartner = (i: number, k: keyof PartnerLine, v: string | number) =>
    update({ ...data, partners: data.partners.map((s, idx) => idx === i ? { ...s, [k]: v } : s) })
  const editCall = (i: number, k: keyof CallLine, v: string | number) =>
    update({ ...data, calls: data.calls.map((s, idx) => idx === i ? { ...s, [k]: v } : s) })
  const editObjective = (i: number, k: keyof Objective, v: string | number) =>
    update({ ...data, objectives: data.objectives.map((s, idx) => idx === i ? { ...s, [k]: v } : s) })

  const num = (v: string) => parseFloat(v) || 0

  const tab = (v: View, label: string) => (
    <button key={v} onClick={() => setView(v)}
      style={{
        ...HUD, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 2px',
        color: view === v ? GREEN : SMOKE_DIM,
        borderBottom: `2px solid ${view === v ? GREEN : 'transparent'}`,
        fontSize: 10, letterSpacing: '0.26em', fontWeight: 700,
      }}>
      {label}
    </button>
  )

  // Money edit cell (commits on blur)
  const M = ({ value, onCommit }: { value: number; onCommit: (n: number) => void }) => (
    <input key={value} type="number" defaultValue={value}
      onBlur={e => { const n = num(e.target.value); if (n !== value) onCommit(n) }}
      style={numCell} />
  )

  return (
    <div className="cap-module" style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '30px 24px 70px', display: 'flex', flexDirection: 'column', gap: 18, background: OBSIDIAN, borderRadius: 16, border: `1px solid ${STEEL}`, marginTop: 8, marginBottom: 40 }}>

      {/* Masthead */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap', paddingTop: 8 }}>
        <div>
          <p style={{ ...HUD, color: GREEN, fontSize: 9, letterSpacing: '0.34em', margin: '0 0 8px', fontWeight: 700 }}>
            ● Live · Capital Raise &amp; Equity Deployment · Command
          </p>
          <h1 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#E6E7E9', fontSize: 'clamp(26px, 4vw, 44px)', lineHeight: 0.95, margin: 0, letterSpacing: '-0.01em' }}>
            CAPITAL<br />DEPLOYMENT
          </h1>
        </div>
        <p style={{ color: SMOKE, fontSize: 12.5, lineHeight: 1.65, maxWidth: 420, margin: '0 0 4px', marginLeft: 'auto' }}>
          Deploy with <b style={{ color: '#fff' }}>precision.</b> What we need to raise, what's committed, and
          what's deployed — across every stage of every 7EVEN Development project, current and incoming.
        </p>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${STEEL}`, flexWrap: 'wrap' }}>
        {tab('command', 'Command')}
        {tab('projects', 'Projects')}
        {tab('stages', 'Stages')}
        {tab('partners', 'Partners')}
        {tab('calls', 'Calls')}
        {tab('objectives', 'Objectives')}
      </div>

      {/* ── COMMAND (dark briefing, derived live from the working data) ── */}
      {view === 'command' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Capital Required', value: fmtM(requiredM), sub: 'portfolio · all stages', color: '#E6E7E9' },
              { label: 'Committed / Raised', value: fmtM(raisedM), sub: `${Math.round(raisedM / (requiredM || 1) * 100)}% of requirement`, color: GREEN },
              { label: 'Deployed', value: fmtM(deployedM), sub: `${Math.round(deployedM / (requiredM || 1) * 100)}% drawn & working`, color: GREEN_DEEP },
              { label: 'Remaining to Raise', value: fmtM(toRaiseM), sub: 'open equity requirement', color: '#fff' },
            ].map(k => (
              <div key={k.label} style={{ ...panel, padding: '16px 18px' }}>
                <p style={{ ...HUD, color: SMOKE_DIM, fontSize: 8, letterSpacing: '0.22em', margin: '0 0 8px', fontWeight: 600 }}>{k.label}</p>
                <p style={{ color: k.color, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }}>{k.value}</p>
                <p style={{ color: SMOKE_DIM, fontSize: 9.5, margin: '6px 0 0' }}>{k.sub}</p>
              </div>
            ))}
          </div>

          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <p style={panelTitle}>Portfolio Raise</p>
              <p style={{ ...HUD, marginLeft: 'auto', color: GREEN, fontSize: 11, fontWeight: 700 }}>{Math.round(raisedM / (requiredM || 1) * 100)}% raised</p>
            </div>
            <p style={panelSub}>committed vs deployed</p>
            <Bar height={12} segments={[
              { widthPct: deployedM / (requiredM || 1) * 100, color: `linear-gradient(to right, ${GREEN_DEEP}, ${GREEN})` },
              { widthPct: (raisedM - deployedM) / (requiredM || 1) * 100, color: `${GREEN}44` },
            ]} />
            <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { label: `Deployed ${fmtM(deployedM)}`, color: GREEN },
                { label: `Committed ${fmtM(raisedM - deployedM)}`, color: `${GREEN}66` },
                { label: `To raise ${fmtM(toRaiseM)}`, color: STEEL },
              ].map(l => (
                <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SMOKE, fontSize: 10.5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: l.color }} />{l.label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <div style={panel}>
              <p style={panelTitle}>Capital by Stage</p>
              <p style={panelSub}>required · raised · deployed — edit under Stages</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.stages.map(s => (
                  <div key={s.name}>
                    <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ color: '#E6E7E9', fontSize: 12 }}>{s.name}</span>
                      <span style={{ marginLeft: 'auto', color: SMOKE_DIM, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                        <b style={{ color: GREEN_DEEP }}>{fmtM(s.depM)}</b> dep · <b style={{ color: GREEN }}>{fmtM(s.raisedM)}</b> raised · {fmtM(s.reqM)} req
                      </span>
                    </div>
                    <Bar segments={[
                      { widthPct: s.depM / (s.reqM || 1) * 100, color: GREEN_DEEP },
                      { widthPct: (s.raisedM - s.depM) / (s.reqM || 1) * 100, color: `${GREEN}55` },
                    ]} />
                  </div>
                ))}
              </div>
            </div>

            <div style={panel}>
              <p style={panelTitle}>Deployment Velocity</p>
              <p style={panelSub}>cumulative deployed · 12 mo</p>
              <svg viewBox="0 0 100 44" style={{ width: '100%', height: 130 }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="velfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={GREEN} stopOpacity="0.25" />
                    <stop offset="1" stopColor={GREEN} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`0,44 ${vpts} 100,44`} fill="url(#velfill)" />
                <polyline points={vpts} fill="none" stroke={GREEN} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
                  <span key={i} style={{ ...HUD, color: SMOKE_DIM, fontSize: 7.5 }}>{m}</span>
                ))}
              </div>
              <p style={{ color: SMOKE, fontSize: 11, marginTop: 10, borderTop: `1px solid ${STEEL}`, paddingTop: 10 }}>
                <b style={{ ...HUD, color: GREEN, fontSize: 9, letterSpacing: '0.2em' }}>Next call</b>&nbsp;&nbsp;{data.nextCall}
              </p>
            </div>
          </div>

          {/* Objectives roll-up */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <div style={panel}>
              <p style={panelTitle}>◎ Director Objectives — Alignment</p>
              <p style={panelSub}>edit under Objectives</p>
              {data.objectives.map((o, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${STEEL}` }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ color: '#E6E7E9', fontSize: 12 }}>{o.title}</span>
                    <span style={{ marginLeft: 'auto', color: o.pct >= 75 ? GREEN : o.pct >= 50 ? '#E6C34A' : '#E0808C', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{o.pct}%</span>
                  </div>
                  <Bar height={5} segments={[{ widthPct: o.pct, color: o.pct >= 75 ? GREEN : o.pct >= 50 ? '#E6C34A' : '#E0808C' }]} />
                  <p style={{ color: SMOKE_DIM, fontSize: 9.5, margin: '5px 0 0' }}>Owner · {o.owner}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── PROJECTS (field-light, editable) ── */}
      {view === 'projects' && (
        <div style={fieldPanelS}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <p style={fieldTitle}>Projects · Capital Requirement</p>
              <p style={fieldSub}>edit any figure — the Command briefing recalculates live · $M ex-GST</p>
            </div>
            <button className="wr-btn wr-solid wr-green" onClick={() => update({ ...data, projects: [...data.projects, { name: 'New Project', type: 'Type', reqM: 0, raisedM: 0, depM: 0 }] })}
              style={{ ...HUD, marginLeft: 'auto', color: '#fff', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, padding: '8px 16px' }}>
              + Add Project
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 820 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(170px,1.6fr) minmax(120px,1fr) 118px 118px 118px minmax(110px,1fr) 26px', gap: 10, alignItems: 'center', padding: '4px 2px', marginTop: 8 }}>
            {['Project', 'Type', 'Req $M', 'Raised $M', 'Deployed $M', 'Progress', ''].map((h, i) => (
              <span key={i} style={{ ...HUD, color: INK_SOFT, fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, textAlign: i >= 2 && i <= 4 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {data.projects.map((p, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px,1.6fr) minmax(120px,1fr) 118px 118px 118px minmax(110px,1fr) 26px', gap: 10, alignItems: 'center', padding: '6px 2px' }}>
              <input key={`n${i}${p.name}`} defaultValue={p.name} onBlur={e => e.target.value !== p.name && editProject(i, 'name', e.target.value)} style={textCell} />
              <input key={`t${i}${p.type}`} defaultValue={p.type} onBlur={e => e.target.value !== p.type && editProject(i, 'type', e.target.value)} style={textCell} />
              <M value={p.reqM} onCommit={n => editProject(i, 'reqM', n)} />
              <M value={p.raisedM} onCommit={n => editProject(i, 'raisedM', n)} />
              <M value={p.depM} onCommit={n => editProject(i, 'depM', n)} />
              <Bar track="#fff" border={LINE} segments={[
                { widthPct: p.depM / (p.reqM || 1) * 100, color: GREEN_DEEP },
                { widthPct: (p.raisedM - p.depM) / (p.reqM || 1) * 100, color: `${GREEN}66` },
              ]} />
              <button onClick={() => update({ ...data, projects: data.projects.filter((_, idx) => idx !== i) })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_SOFT, fontSize: 13 }}>×</button>
            </div>
          ))}
          </div></div>
        </div>
      )}

      {/* ── STAGES (field-light, editable) ── */}
      {view === 'stages' && (
        <div style={fieldPanelS}>
          <p style={fieldTitle}>Capital by Stage</p>
          <p style={fieldSub}>required · raised · deployed per capital stage · $M ex-GST</p>
          <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 760 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.5fr) 118px 118px 118px minmax(140px,1fr)', gap: 10, alignItems: 'center', padding: '4px 2px' }}>
            {['Stage', 'Req $M', 'Raised $M', 'Deployed $M', 'Progress'].map((h, i) => (
              <span key={i} style={{ ...HUD, color: INK_SOFT, fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, textAlign: i >= 1 && i <= 3 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {data.stages.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.5fr) 118px 118px 118px minmax(140px,1fr)', gap: 10, alignItems: 'center', padding: '6px 2px' }}>
              <input key={`s${i}${s.name}`} defaultValue={s.name} onBlur={e => e.target.value !== s.name && editStage(i, 'name', e.target.value)} style={textCell} />
              <M value={s.reqM} onCommit={n => editStage(i, 'reqM', n)} />
              <M value={s.raisedM} onCommit={n => editStage(i, 'raisedM', n)} />
              <M value={s.depM} onCommit={n => editStage(i, 'depM', n)} />
              <Bar track="#fff" border={LINE} segments={[
                { widthPct: s.depM / (s.reqM || 1) * 100, color: GREEN_DEEP },
                { widthPct: (s.raisedM - s.depM) / (s.reqM || 1) * 100, color: `${GREEN}66` },
              ]} />
            </div>
          ))}
          </div></div>
        </div>
      )}

      {/* ── PARTNERS (field-light, editable) ── */}
      {view === 'partners' && (
        <div style={fieldPanelS}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
              <p style={fieldTitle}>Equity Partners &amp; Directors</p>
              <p style={fieldSub}>committed vs funded · $M</p>
            </div>
            <button className="wr-btn wr-solid wr-green" onClick={() => update({ ...data, partners: [...data.partners, { name: 'New Partner', role: 'Equity Partner', committedM: 0, fundedM: 0 }] })}
              style={{ ...HUD, marginLeft: 'auto', color: '#fff', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, padding: '8px 16px' }}>
              + Add Partner
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 780 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1.4fr) minmax(140px,1.2fr) 118px 118px minmax(130px,1fr) 26px', gap: 10, alignItems: 'center', padding: '4px 2px', marginTop: 8 }}>
            {['Partner', 'Role', 'Committed $M', 'Funded $M', 'Deployment', ''].map((h, i) => (
              <span key={i} style={{ ...HUD, color: INK_SOFT, fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, textAlign: i === 2 || i === 3 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>
          {data.partners.map((pt, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1.4fr) minmax(140px,1.2fr) 118px 118px minmax(130px,1fr) 26px', gap: 10, alignItems: 'center', padding: '6px 2px' }}>
              <input key={`p${i}${pt.name}`} defaultValue={pt.name} onBlur={e => e.target.value !== pt.name && editPartner(i, 'name', e.target.value)} style={textCell} />
              <input key={`r${i}${pt.role}`} defaultValue={pt.role} onBlur={e => e.target.value !== pt.role && editPartner(i, 'role', e.target.value)} style={textCell} />
              <M value={pt.committedM} onCommit={n => editPartner(i, 'committedM', n)} />
              <M value={pt.fundedM} onCommit={n => editPartner(i, 'fundedM', n)} />
              <Bar track="#fff" border={LINE} height={6} segments={[{ widthPct: pt.fundedM / (pt.committedM || 1) * 100, color: `linear-gradient(to right, ${GREEN_DEEP}, ${GREEN})` }]} />
              <button onClick={() => update({ ...data, partners: data.partners.filter((_, idx) => idx !== i) })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_SOFT, fontSize: 13 }}>×</button>
            </div>
          ))}
          </div></div>
        </div>
      )}

      {/* ── CALLS (field-light, editable) ── */}
      {view === 'calls' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <div style={fieldPanelS}>
            <p style={fieldTitle}>Upcoming Capital Calls</p>
            <p style={fieldSub}>next six months · $M</p>
            {data.calls.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 118px 1fr', gap: 10, alignItems: 'center', padding: '5px 2px' }}>
                <input key={`m${i}${c.month}`} defaultValue={c.month} onBlur={e => e.target.value !== c.month && editCall(i, 'month', e.target.value.toUpperCase())} style={{ ...textCell, ...HUD, fontSize: 10, letterSpacing: '0.14em', fontWeight: 700 }} />
                <M value={c.amountM} onCommit={n => editCall(i, 'amountM', n)} />
                <Bar track="#fff" border={LINE} segments={[{ widthPct: c.amountM / (Math.max(...data.calls.map(x => x.amountM)) || 1) * 100, color: `linear-gradient(to right, ${GREEN_DEEP}, ${GREEN}88)` }]} />
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <p style={{ ...HUD, color: INK_SOFT, fontSize: 8, letterSpacing: '0.2em', fontWeight: 700, marginBottom: 5 }}>Next call note</p>
              <input key={data.nextCall} defaultValue={data.nextCall} onBlur={e => e.target.value !== data.nextCall && update({ ...data, nextCall: e.target.value })} style={textCell} />
            </div>
          </div>
          <div style={fieldPanelS}>
            <p style={fieldTitle}>Call Profile</p>
            <p style={fieldSub}>as it stands</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 130 }}>
              {data.calls.map(c => {
                const max = Math.max(...data.calls.map(x => x.amountM), 1)
                return (
                  <div key={c.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                    <span style={{ color: INK, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmtM(c.amountM)}</span>
                    <div style={{ width: '100%', maxWidth: 40, height: (c.amountM / max) * 84, borderRadius: 4, background: `linear-gradient(to top, ${GREEN_DEEP}, ${GREEN})` }} />
                    <span style={{ ...HUD, color: INK_SOFT, fontSize: 7.5, letterSpacing: '0.12em' }}>{c.month}</span>
                  </div>
                )
              })}
            </div>
            <p style={{ color: INK_SOFT, fontSize: 11, marginTop: 14, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
              Total next 6 months: <b style={{ fontFamily: 'var(--font-mono)', color: INK }}>{fmtM(data.calls.reduce((s, c) => s + c.amountM, 0))}</b>
            </p>
          </div>
        </div>
      )}

      {/* ── OBJECTIVES (field-light, editable) ── */}
      {view === 'objectives' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <div style={fieldPanelS}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div>
                <p style={fieldTitle}>Company Objectives</p>
                <p style={fieldSub}>{data.objectives.length} objectives · {Math.round(data.objectives.reduce((t, o) => t + o.pct, 0) / (data.objectives.length || 1))}% average</p>
              </div>
              <button className="wr-btn wr-solid wr-green" onClick={() => update({ ...data, objectives: [...data.objectives, { title: 'New objective', owner: 'Owner', pct: 0 }] })}
                style={{ ...HUD, marginLeft: 'auto', color: '#fff', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, padding: '8px 16px' }}>
                + Add
              </button>
            </div>
            {data.objectives.map((o, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${LINE}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 24px', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <input key={`ot${i}${o.title}`} defaultValue={o.title} onBlur={e => e.target.value !== o.title && editObjective(i, 'title', e.target.value)} style={{ ...textCell, fontWeight: 600 }} />
                  <input key={`op${i}${o.pct}`} type="number" min={0} max={100} defaultValue={o.pct}
                    onBlur={e => { const n = Math.max(0, Math.min(100, num(e.target.value))); n !== o.pct && editObjective(i, 'pct', n) }}
                    style={{ ...numCell, width: 58 }} />
                  <button onClick={() => update({ ...data, objectives: data.objectives.filter((_, idx) => idx !== i) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_SOFT, fontSize: 13 }}>×</button>
                </div>
                <Bar height={6} track="#fff" border={LINE} segments={[{ widthPct: o.pct, color: o.pct >= 75 ? GREEN_DEEP : o.pct >= 50 ? '#C9A227' : '#C25454' }]} />
                <input key={`oo${i}${o.owner}`} defaultValue={o.owner} onBlur={e => e.target.value !== o.owner && editObjective(i, 'owner', e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: INK_SOFT, fontSize: 10.5, width: '100%', padding: 0, marginTop: 5 }} />
              </div>
            ))}
          </div>

          <div style={fieldPanelS}>
            <p style={fieldTitle}>Directors &amp; Teams</p>
            <p style={fieldSub}>who owns what</p>
            {data.team.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: `1px solid ${LINE}` }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#0D0D0F', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: "'Chakra Petch', sans-serif" }}>{m.initials}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ color: INK, fontSize: 12, fontWeight: 600, margin: 0 }}>{m.name} <span style={{ color: INK_SOFT, fontWeight: 400 }}>— {m.role}</span></p>
                  <p style={{ color: INK_SOFT, fontSize: 10.5, margin: 0 }}>{m.note}</p>
                </div>
                <button
                  onClick={() => {
                    const order: TeamMember['status'][] = ['On track', 'Ahead', 'Watch', 'Behind']
                    const nextStatus = order[(order.indexOf(m.status) + 1) % order.length]
                    update({ ...data, team: data.team.map((x, idx) => idx === i ? { ...x, status: nextStatus } : x) })
                  }}
                  style={{
                    ...HUD, cursor: 'pointer', borderRadius: 4, padding: '4px 10px', fontSize: 8, letterSpacing: '0.16em', fontWeight: 700, border: 'none',
                    background: m.status === 'Ahead' ? GREEN_DEEP : m.status === 'On track' ? '#0D0D0F' : m.status === 'Watch' ? '#E08A2E' : '#C25454',
                    color: '#fff',
                  }}>
                  {m.status}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
