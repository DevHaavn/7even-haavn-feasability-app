import React, { useState } from 'react'
import { Project7Mark } from '../../components/ui'
import SiteLinks from '../../components/SiteLinks'
import { useStore } from '../../store'
import * as db from '../../db'
import CapitalPillar from './CapitalPillar'
import CapitalCommandMark from './CapitalCommandMark'

export type PillarId = 'budgets' | 'deployment' | 'crm'

export interface Pillar {
  id: PillarId
  num: string
  title: string
  sub: string
  blurb: string
  color: string
}

/** ATRIUM accents for this gateway. */
export const PA = {
  silver: '#9aa8b6',
  silverHi: '#cdd8e2',
  silverDeep: '#6c7a88',
  silverLine: 'rgba(154,168,182,0.4)',
}

export const PILLARS: Pillar[] = [
  {
    id: 'budgets', num: '01', title: 'Budgets / Administration',
    sub: 'Accounts · Budgets · Invoices · Approvals',
    blurb: 'Project budgets, cost tracking against feasibility, invoice register, approvals and the accounts backbone.',
    color: '#13B5EA', // Xero brand blue
  },
  {
    id: 'deployment', num: '02', title: 'Capital Command',
    sub: 'Raise · Investors · Calls · Returns',
    blurb: 'The capital command centre. Every dollar across the portfolio — pulled live from the feasibility studio — plus the full investor lifecycle: intake, pipeline, capital calls and distributions.',
    color: '#cdd8e2', // system silver
  },
  {
    id: 'crm', num: '03', title: 'Management System',
    sub: 'Projects · Files · Workflow · Contacts',
    blurb: 'The full ATRIUM Management System — project delivery from job start to completion, SharePoint file management, end-to-end workflow, and the partner & contact relationships behind every job. Mirrors the HAAVN Management command centre.',
    color: '#2fe07a', // LED green
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION BASE — HAAVN BLACK Management design: moving video backdrop
// and pillar cards ringed by a rotating LED border (blue 01 · silver 02 ·
// green 03). Pillar wiring unchanged.
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
.cab-root{position:fixed;inset:0;z-index:400;overflow-y:auto;background:#040404;display:flex;flex-direction:column;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.cab-bg{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.cab-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(4,4,4,.74),rgba(4,4,4,.55) 42%,rgba(4,4,4,.9))}
.cab-head{position:relative;z-index:2;display:flex;align-items:center;gap:16px;padding:20px 32px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
.cab-btn{cursor:pointer;font-family:'Chakra Petch','JetBrains Mono',sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;
  color:#c9cdd2;padding:10px 16px;border-radius:2px;border:1px solid rgba(255,255,255,.28);background:transparent;transition:.3s}
.cab-btn:hover{border-color:rgba(47,224,122,.7);color:#fff;background:rgba(47,224,122,.06);box-shadow:0 0 24px -10px rgba(47,224,122,.6)}
.cab-brand{margin-left:auto;display:flex;align-items:center;gap:12px}
.cab-brand .t{text-align:right}
.cab-brand .t .a{font-family:'Chakra Petch',sans-serif;font-size:8px;letter-spacing:.32em;text-transform:uppercase;color:#7d8288;margin:0}
.cab-brand .t .b{font-family:'Chakra Petch',sans-serif;font-size:13px;letter-spacing:.24em;text-transform:uppercase;font-weight:600;color:#fff;margin:2px 0 0}
.cab-brand img{width:44px;height:auto}
.cab-body{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;
  padding:52px 32px 40px;max-width:1440px;width:100%;margin:0 auto}
.cab-eyebrow{font-family:'Chakra Petch',sans-serif;font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:#7d8288;font-weight:500}
.cab-title{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:clamp(28px,4.6vw,52px);letter-spacing:.08em;line-height:1;color:#fff;margin-top:16px;text-transform:uppercase;text-align:center}
.cab-sub{color:#a7abb0;font-size:14px;text-align:center;margin-top:16px;max-width:66ch;line-height:1.6}
.cab-faint{color:#6a6e73;font-size:11px;letter-spacing:.16em;text-transform:uppercase;text-align:center;margin-top:8px}
.cab-rule{width:230px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent);margin:24px auto 34px}
.cab-pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;width:100%;max-width:1240px}
@property --cabA{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes cab-spin{to{--cabA:360deg}}
.cab-ledbox{position:relative;border-radius:16px;padding:1.7px;isolation:isolate;transition:transform .3s}
.cab-ledbox::before{content:'';position:absolute;inset:0;border-radius:16px;padding:1.7px;
  background:conic-gradient(from var(--cabA),transparent 0deg,var(--ring) 130deg,var(--ring) 190deg,transparent 310deg,transparent 360deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;
  animation:cab-spin 4.6s linear infinite;z-index:1}
.cab-ledbox::after{content:'';position:absolute;inset:-8px;border-radius:22px;z-index:0;opacity:.45;pointer-events:none;
  background:conic-gradient(from var(--cabA),transparent 0deg,var(--ringGlow) 150deg,transparent 300deg);
  filter:blur(16px);animation:cab-spin 4.6s linear infinite}
.cab-ledbox.d2::before,.cab-ledbox.d2::after{animation-delay:-1.55s}
.cab-ledbox.d3::before,.cab-ledbox.d3::after{animation-delay:-3.1s}
.cab-ledbox:hover{transform:translateY(-4px)}
.cab-ledbox:hover::before,.cab-ledbox:hover::after{animation-duration:2.4s}
.cab-pcard{position:relative;z-index:2;border-radius:14px;background:linear-gradient(180deg,rgba(14,16,19,.9),rgba(8,9,11,.94));
  -webkit-backdrop-filter:blur(16px) saturate(1.1);backdrop-filter:blur(16px) saturate(1.1);
  padding:30px 28px 26px;min-height:520px;display:flex;flex-direction:column;cursor:pointer;text-align:left;border:0;width:100%;color:inherit}
.cab-prow{display:flex;align-items:flex-start;justify-content:space-between}
.cab-pnum{font-family:'Chakra Petch',monospace;font-size:34px;font-weight:300;line-height:1}
.cab-papex{font-size:15px;opacity:.8;line-height:1}
.cab-psub{font-family:'Chakra Petch',sans-serif;font-size:10px;letter-spacing:.28em;text-transform:uppercase;font-weight:600;margin:16px 0 7px}
.cab-ptitle{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:25px;letter-spacing:.01em;line-height:1.08;color:#fff;margin:0}
.cab-pline{height:1px;background:rgba(255,255,255,.1);margin:16px 0}
.cab-pblurb{color:#a7abb0;font-size:13px;line-height:1.6;margin:0;flex:1}
.cab-pow{margin-top:auto;display:flex;flex-direction:column;gap:8px;padding-top:18px}
.cab-pow .k{color:#6a6e73;font-family:'Chakra Petch',sans-serif;font-size:8px;letter-spacing:.26em;text-transform:uppercase}
.cab-penter{margin-top:22px;font-family:'Chakra Petch',sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c9cdd2}
.cab-logout{position:fixed;bottom:18px;left:20px;z-index:30}
@media(max-width:640px){.cab-body{padding:36px 20px}.cab-pcard{min-height:auto}}

@media(max-width:600px){.cab-head{padding-top:calc(env(safe-area-inset-top,0px) + 57px)}}
`

export default function CapitalBase({ onClose, onLogout, initialPillar, crmOnly }: { onClose: () => void; onLogout: () => void; initialPillar?: PillarId; crmOnly?: boolean }) {
  const { projects } = useStore()
  const [pillar, setPillar] = useState<PillarId | null>(initialPillar ?? null)

  if (pillar) {
    const p = PILLARS.find(x => x.id === pillar)!
    // Consultants are locked to the CRM — Back exits to the app, not the hub (which holds financial pillars)
    return <CapitalPillar pillar={p} onBack={crmOnly ? onClose : () => setPillar(null)} onLogout={onLogout} onExit={onClose} />
  }

  // A small live figure from the projects to show the Capital ↔ Projects link
  const totalTDC = projects.reduce((sum, proj) => {
    try { return sum + db.getEffectiveLandCost(proj.id) } catch { return sum }
  }, 0)
  const fmtM = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${Math.round(n)}`

  const RING: Record<PillarId, { ring: string; glow: string }> = {
    budgets: { ring: '#13B5EA', glow: 'rgba(19,181,234,.55)' },
    deployment: { ring: '#cdd8e2', glow: 'rgba(205,216,226,.45)' },
    crm: { ring: '#2fe07a', glow: 'rgba(47,224,122,.55)' },
  }

  return (
    <div className="cab-root">
      <style>{CSS}</style>
      <video className="cab-bg" autoPlay muted loop playsInline preload="auto" src="/haavn-black-bg.mp4" />
      <div className="cab-scrim" />

      {/* Header */}
      <div className="cab-head">
        <button className="cab-btn" onClick={onClose}>&#8592; ATRIUM</button>
        <div className="cab-brand">
          <div className="t"><p className="a">ATRIUM</p><p className="b">Capital Base</p></div>
          <img src="/winged-device-white.png" alt="7EVEN Capital" draggable={false} />
        </div>
      </div>

      {/* Body */}
      <div className="cab-body">
        <div className="cab-eyebrow">Precision Capital Deployed</div>
        <h1 className="cab-title">Administration Base</h1>
        <p className="cab-sub">Three pillars for the accounts, capital and partner teams — linked to the feasibility studio.</p>
        <div className="cab-faint">{projects.length} live project{projects.length !== 1 ? 's' : ''} · {fmtM(totalTDC)} land committed</div>
        <div className="cab-rule" />

        <div className="cab-pillars">
          {PILLARS.map((p, i) => (
            <div key={p.id} className={`cab-ledbox${i === 1 ? ' d2' : i === 2 ? ' d3' : ''}`}
              style={{ ['--ring' as any]: RING[p.id].ring, ['--ringGlow' as any]: RING[p.id].glow }}>
              <button className="cab-pcard" onClick={() => setPillar(p.id)}>
                <div className="cab-prow">
                  <span className="cab-pnum" style={{ color: p.color }}>{p.num}</span>
                  <span className="cab-papex" style={{ color: p.color }}>&#9650;</span>
                </div>
                <div>
                  <p className="cab-psub" style={{ color: p.color }}>{p.sub}</p>
                  <h2 className="cab-ptitle">{p.title}</h2>
                </div>
                <div className="cab-pline" />
                <p className="cab-pblurb">{p.blurb}</p>

                {p.id === 'budgets' && (
                  <div className="cab-pow">
                    <span className="k">Powered by</span>
                    <img src="/xero-logo.png" alt="Xero" draggable={false}
                      style={{ width: 86, height: 'auto', opacity: 0.92, filter: 'drop-shadow(0 0 12px rgba(19,181,234,0.25))' }} />
                  </div>
                )}
                {p.id === 'deployment' && (
                  <div className="cab-pow">
                    <span className="k">Powered by</span>
                    <span style={{ filter: 'grayscale(1) brightness(1.25)', display: 'inline-flex' }}>
                      <CapitalCommandMark width={165} />
                    </span>
                  </div>
                )}
                {p.id === 'crm' && (
                  <div className="cab-pow">
                    <span className="k">Powered by</span>
                    <span style={{ color: '#fff', fontFamily: "'Chakra Petch',sans-serif", fontWeight: 500, fontSize: 16, letterSpacing: '0.14em' }}>ATRIUM</span>
                  </div>
                )}

                <span className="cab-penter">Enter Pillar &#8594;</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <SiteLinks />
      <Project7Mark />
      <button className="cab-btn cab-logout" onClick={onLogout}>Log Out</button>
    </div>
  )
}
