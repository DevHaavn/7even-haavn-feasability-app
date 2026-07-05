import React from 'react'

// ── CAPITAL DEPLOYMENT — Capital Command Centre (Capital pillar 02) ─────────
// Real-time visibility for directors and equity partners: what we need to
// raise, what's committed, and what's deployed — across every stage of every
// 7EVEN Development project. Green command accent on the obsidian system.
// Exclusive to the Capital Base. Data from the capital raising dashboard.

const OBSIDIAN = '#0C0D0E', PANEL = '#16181B', STEEL = '#23262A', SMOKE = '#9A9CA3', SMOKE_DIM = '#63656C'
const GREEN = '#1FE87A', GREEN_DEEP = '#0F9E52'
const HUD: React.CSSProperties = { fontFamily: "'Chakra Petch', sans-serif", textTransform: 'uppercase' }

// ── The raise, as it stands ──────────────────────────────────────────────────
const RAISE = {
  requiredM: 312, raisedM: 198, deployedM: 124,
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
  velocity: [4, 9, 16, 24, 33, 44, 56, 69, 82, 96, 110, 124], // cumulative deployed, 12 mo
}

const fmtM = (n: number) => `$${n}M`

const panel: React.CSSProperties = {
  background: PANEL, border: `1px solid ${STEEL}`, borderRadius: 10, padding: '20px 22px',
}
const panelTitle: React.CSSProperties = {
  ...HUD, color: SMOKE_DIM, fontSize: 9, letterSpacing: '0.26em', fontWeight: 700, marginBottom: 4,
}
const panelSub: React.CSSProperties = {
  color: SMOKE_DIM, fontSize: 10, marginBottom: 16,
}

function Bar({ segments, height = 8 }: { segments: { widthPct: number; color: string }[]; height?: number }) {
  return (
    <div style={{ height, borderRadius: height / 2, background: '#0A0B0C', border: `1px solid ${STEEL}`, overflow: 'hidden', display: 'flex' }}>
      {segments.map((s, i) => (
        <div key={i} style={{ width: `${s.widthPct}%`, background: s.color, transition: 'width 0.4s' }} />
      ))}
    </div>
  )
}

export default function CapitalDeployment() {
  const { requiredM, raisedM, deployedM } = RAISE
  const toRaiseM = requiredM - raisedM
  const committedNotDeployedM = raisedM - deployedM

  // Velocity sparkline geometry
  const vmax = Math.max(...RAISE.velocity)
  const vpts = RAISE.velocity.map((v, i) => `${(i / (RAISE.velocity.length - 1)) * 100},${40 - (v / vmax) * 36}`).join(' ')

  return (
    <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', padding: '30px 24px 70px', display: 'flex', flexDirection: 'column', gap: 18, background: OBSIDIAN, borderRadius: 16, border: `1px solid ${STEEL}`, marginTop: 8, marginBottom: 40 }}>

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

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total Capital Required', value: fmtM(requiredM), sub: 'portfolio · all stages', color: '#E6E7E9' },
          { label: 'Committed / Raised', value: fmtM(raisedM), sub: `${Math.round(raisedM / requiredM * 100)}% of requirement`, color: GREEN },
          { label: 'Deployed', value: fmtM(deployedM), sub: `${Math.round(deployedM / requiredM * 100)}% drawn & working`, color: GREEN_DEEP },
          { label: 'Remaining to Raise', value: fmtM(toRaiseM), sub: 'open equity requirement', color: '#fff' },
        ].map(k => (
          <div key={k.label} style={{ ...panel, padding: '16px 18px' }}>
            <p style={{ ...HUD, color: SMOKE_DIM, fontSize: 8, letterSpacing: '0.22em', margin: '0 0 8px', fontWeight: 600 }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }}>{k.value}</p>
            <p style={{ color: SMOKE_DIM, fontSize: 9.5, margin: '6px 0 0' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Portfolio raise bar */}
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <p style={panelTitle}>Portfolio Raise</p>
          <p style={{ ...HUD, marginLeft: 'auto', color: GREEN, fontSize: 11, fontWeight: 700 }}>{Math.round(raisedM / requiredM * 100)}% raised</p>
        </div>
        <p style={panelSub}>committed vs deployed</p>
        <Bar height={12} segments={[
          { widthPct: deployedM / requiredM * 100, color: `linear-gradient(to right, ${GREEN_DEEP}, ${GREEN})` as string },
          { widthPct: committedNotDeployedM / requiredM * 100, color: `${GREEN}44` },
        ]} />
        <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { label: `Deployed ${fmtM(deployedM)}`, color: GREEN },
            { label: `Committed ${fmtM(committedNotDeployedM)}`, color: `${GREEN}66` },
            { label: `To raise ${fmtM(toRaiseM)}`, color: STEEL },
          ].map(l => (
            <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: SMOKE, fontSize: 10.5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: l.color }} />{l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Stage + velocity row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <div style={panel}>
          <p style={panelTitle}>Capital by Stage</p>
          <p style={panelSub}>required · raised · deployed</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {RAISE.stages.map(s => (
              <div key={s.name}>
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ color: '#E6E7E9', fontSize: 12 }}>{s.name}</span>
                  <span style={{ marginLeft: 'auto', color: SMOKE_DIM, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                    <b style={{ color: GREEN_DEEP }}>{fmtM(s.depM)}</b> dep · <b style={{ color: GREEN }}>{fmtM(s.raisedM)}</b> raised · {fmtM(s.reqM)} req
                  </span>
                </div>
                <Bar segments={[
                  { widthPct: s.depM / s.reqM * 100, color: GREEN_DEEP },
                  { widthPct: (s.raisedM - s.depM) / s.reqM * 100, color: `${GREEN}55` },
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
        </div>
      </div>

      {/* Projects */}
      <div style={panel}>
        <p style={panelTitle}>Projects · Capital Requirement</p>
        <p style={panelSub}>4 active · pipeline expanding</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RAISE.projects.map(p => {
            const pct = Math.round(p.raisedM / p.reqM * 100)
            return (
              <div key={p.name} style={{
                display: 'grid', gridTemplateColumns: 'minmax(150px,1.4fr) 70px 110px 70px minmax(120px,1fr)',
                gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 8,
                background: OBSIDIAN, border: `1px solid ${STEEL}`,
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: 12.5, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  <p style={{ color: SMOKE_DIM, fontSize: 9.5, margin: 0 }}>{p.type}</p>
                </div>
                <span style={{ color: SMOKE, fontSize: 11.5, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmtM(p.reqM)}</span>
                <span style={{ color: GREEN, fontSize: 11.5, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmtM(p.raisedM)} · {pct}%</span>
                <span style={{ color: GREEN_DEEP, fontSize: 11.5, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmtM(p.depM)}</span>
                <Bar segments={[
                  { widthPct: p.depM / p.reqM * 100, color: GREEN_DEEP },
                  { widthPct: (p.raisedM - p.depM) / p.reqM * 100, color: `${GREEN}55` },
                ]} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Partners + calls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        <div style={panel}>
          <p style={panelTitle}>Equity Partners &amp; Directors</p>
          <p style={panelSub}>committed vs funded</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {RAISE.partners.map(pt => (
              <div key={pt.name}>
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{ color: '#E6E7E9', fontSize: 12 }}>{pt.name}</span>
                  <span style={{ color: SMOKE_DIM, fontSize: 9.5, marginLeft: 8 }}>{pt.role}</span>
                  <span style={{ marginLeft: 'auto', color: SMOKE, fontSize: 10.5, fontFamily: 'var(--font-mono)' }}>
                    <b style={{ color: GREEN }}>{fmtM(pt.fundedM)}</b> / {fmtM(pt.committedM)}
                  </span>
                </div>
                <Bar height={6} segments={[{ widthPct: pt.fundedM / pt.committedM * 100, color: `linear-gradient(to right, ${GREEN_DEEP}, ${GREEN})` as string }]} />
              </div>
            ))}
          </div>
        </div>

        <div style={panel}>
          <p style={panelTitle}>Upcoming Capital Calls</p>
          <p style={panelSub}>next 6 months</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110 }}>
            {RAISE.calls.map(c => {
              const max = Math.max(...RAISE.calls.map(x => x.amountM))
              return (
                <div key={c.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <span style={{ color: '#E6E7E9', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{fmtM(c.amountM)}</span>
                  <div style={{ width: '100%', maxWidth: 40, height: (c.amountM / max) * 70, borderRadius: 4, background: `linear-gradient(to top, ${GREEN_DEEP}, ${GREEN}88)` }} />
                  <span style={{ ...HUD, color: SMOKE_DIM, fontSize: 7.5, letterSpacing: '0.12em' }}>{c.month}</span>
                </div>
              )
            })}
          </div>
          <p style={{ color: SMOKE, fontSize: 11, marginTop: 14, borderTop: `1px solid ${STEEL}`, paddingTop: 12 }}>
            <b style={{ ...HUD, color: GREEN, fontSize: 9, letterSpacing: '0.2em' }}>Next call</b>&nbsp;&nbsp;{RAISE.nextCall}
          </p>
        </div>
      </div>
    </div>
  )
}
