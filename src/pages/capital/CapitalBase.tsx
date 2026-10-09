import React, { useState } from 'react'
import SiteLinks from '../../components/SiteLinks'
import { useStore } from '../../store'
import * as db from '../../db'
import CapitalPillar from './CapitalPillar'
import GatewaySeg from '../../components/GatewaySeg'

export type PillarId = 'budgets' | 'crm'

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
    sub: 'Accounts · budgets · invoices · approvals',
    blurb: 'Project budgets, cost tracking against feasibility, invoice register, approvals and the accounts backbone.',
    color: '#d6b36a', // LED brand gold
  },
  {
    id: 'crm', num: '02', title: 'Management System',
    sub: 'Projects · files · workflow · contacts',
    blurb: 'The full ATRIUM Management System — project delivery from job start to completion, SharePoint file management, end-to-end workflow, and the partner & contact relationships behind every job. Mirrors the HAAVN Management command centre.',
    color: '#d6b36a', // LED brand gold
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION BASE — same "new ATRIUM" language as the Management Hub
// (HaavnManagementBase): the bone-white tinted video backdrop, the circular
// ring+"A" back control, transparent pillar cards that only show their gold
// LED ring until hovered, and the three-way :has() hover choreography (hover
// one pillar, it draws forward; the other two ease back and dim).
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
.cab-root{position:fixed;inset:0;z-index:400;overflow-y:auto;overflow-x:hidden;overscroll-behavior-x:none;background:#787675;display:flex;flex-direction:column;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.cab-bg{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;
  filter:invert(1) brightness(.73) contrast(.82) saturate(.12) sepia(.05)}
.cab-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.27),rgba(255,255,255,.15) 42%,rgba(255,255,255,.34))}
.cab-head{position:relative;z-index:2;display:flex;align-items:center;gap:16px;padding:20px 32px;border-bottom:1px solid rgba(20,20,25,.10);flex-shrink:0;flex-wrap:wrap;row-gap:10px}
.cab-mbtn{position:relative;width:38px;height:38px;flex:none;border-radius:50%;border:1px solid rgba(20,20,25,.30);
  background:transparent;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;color:#1a1b1e;
  transition:border-color .3s cubic-bezier(.16,1,.3,1),box-shadow .3s cubic-bezier(.16,1,.3,1),background .3s cubic-bezier(.16,1,.3,1)}
.cab-mbtn:hover{border-color:#d6b36a;box-shadow:0 0 22px rgba(214,179,106,.18);background:rgba(214,179,106,.08)}
.cab-mbtn:active{transform:scale(.94)}
.cab-mbtn .halo{position:absolute;inset:-1px;border-radius:50%;pointer-events:none}
.cab-mbtn .halo circle{fill:none;stroke:#d6b36a;stroke-width:1.2;opacity:0;stroke-dasharray:302}
.cab-mbtn:hover .halo circle{opacity:.9;animation:cab-ringdraw .8s cubic-bezier(.16,1,.3,1) both}
@keyframes cab-ringdraw{from{stroke-dashoffset:302}to{stroke-dashoffset:0}}
.cab-brand{margin-left:auto;display:flex;align-items:center;gap:12px}
.cab-brand .wm{display:flex;align-items:center;font:100 16px/1 'Inter',sans-serif;letter-spacing:.3em;padding-left:.3em;color:#1a1b1e}
.cab-brand .wm .a{display:block;width:.62em;height:.7em;margin-right:.3em;flex:none}
.cab-brand .wm .a svg{display:block;width:100%;height:100%;overflow:visible}
.cab-brand .tag{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:10px;letter-spacing:.24em;color:#83868e;white-space:nowrap;
  border-left:1px solid rgba(20,20,25,.16);padding-left:12px;text-transform:uppercase}
.cab-body{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;
  padding:56px 32px 40px;max-width:1240px;width:100%;margin:0 auto}
.cab-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:#83868e;font-weight:500}
.cab-wm{display:flex;align-items:center;font:100 clamp(38px,7vw,64px)/1 'Inter',sans-serif;letter-spacing:.3em;padding-left:.3em;color:#1a1b1e;margin-top:26px}
.cab-wm .a{display:block;width:.62em;height:.7em;margin-right:.3em;flex:none}
.cab-wm .a svg{display:block;width:100%;height:100%;overflow:visible}
.cab-title{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:clamp(12px,1.6vw,15px);letter-spacing:.5em;text-transform:uppercase;color:#8f6a25;margin-top:20px;padding-left:.5em}
.cab-sub{color:#4a4d54;font-size:14px;text-align:center;margin-top:18px;max-width:66ch;line-height:1.6}
.cab-faint{color:#83868e;font-size:11px;letter-spacing:.16em;text-transform:uppercase;text-align:center;margin-top:8px;font-family:'JetBrains Mono',monospace}
.cab-rule{width:230px;height:1px;background:linear-gradient(90deg,transparent,rgba(20,20,25,.24),transparent);margin:24px auto 34px}
.cab-pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;width:100%;max-width:1240px;position:relative}
@property --cabA{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes cab-spin{to{--cabA:360deg}}
.cab-ledbox{position:relative;z-index:2;border-radius:22px;padding:1.7px;isolation:isolate;transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .5s cubic-bezier(.16,1,.3,1)}
.cab-ledbox::before{content:'';position:absolute;inset:0;border-radius:22px;padding:1.7px;
  background:conic-gradient(from var(--cabA),transparent 0deg,var(--ring) 130deg,#f4e3bd 160deg,var(--ring) 190deg,transparent 310deg,transparent 360deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;
  filter:brightness(1.3) drop-shadow(0 0 6px rgba(244,227,189,.45)) drop-shadow(0 0 14px rgba(214,179,106,.3));
  animation:cab-spin 4.6s linear infinite;z-index:1}
.cab-ledbox::after{content:'';position:absolute;inset:-8px;border-radius:28px;z-index:0;opacity:.28;pointer-events:none;
  background:conic-gradient(from var(--cabA),transparent 0deg,var(--ringGlow) 150deg,transparent 300deg);
  filter:blur(16px);animation:cab-spin 4.6s linear infinite}
.cab-ledbox.d2::before,.cab-ledbox.d2::after{animation-direction:reverse}
.cab-ledbox:hover::before,.cab-ledbox:hover::after{animation-duration:2.4s}
/* hovering one pillar draws it toward the centre and lifts it forward; the
   other eases back and dims, as if stepping behind it — same choreography
   as the Management Hub. */
.cab-pillars:has(.cab-ledbox:nth-child(1):hover) .cab-ledbox:nth-child(1){transform:scale(1.055) translateX(5%);z-index:6}
.cab-pillars:has(.cab-ledbox:nth-child(1):hover) .cab-ledbox:nth-child(2){transform:translateY(-22px) scale(.94);z-index:1;opacity:.8}
.cab-pillars:has(.cab-ledbox:nth-child(2):hover) .cab-ledbox:nth-child(2){transform:scale(1.055) translateX(-5%);z-index:6}
.cab-pillars:has(.cab-ledbox:nth-child(2):hover) .cab-ledbox:nth-child(1){transform:translateY(-22px) scale(.94);z-index:1;opacity:.8}
.cab-pcard{position:relative;z-index:2;border-radius:20px;background:transparent;transition:background .35s cubic-bezier(.16,1,.3,1);
  padding:30px 28px 26px;min-height:520px;display:flex;flex-direction:column;cursor:pointer;text-align:left;border:0;width:100%;color:inherit}
.cab-pcard:hover,.cab-pcard:focus-visible{background:rgba(255,255,255,.3)}
.cab-prow{display:flex;align-items:flex-start;justify-content:space-between}
.cab-pnum{font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:300;line-height:1;color:#8f6a25}
.cab-papex{width:26px;height:26px;border-radius:50%;border:1px solid rgba(143,106,37,.45);display:flex;align-items:center;justify-content:center;color:#8f6a25;font-size:13px}
.cab-psub{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.24em;text-transform:uppercase;font-weight:500;margin:18px 0 8px;color:#8f6a25}
.cab-ptitle{font-family:'Inter',sans-serif;font-weight:300;font-size:25px;letter-spacing:.01em;line-height:1.1;color:#8f6a25;margin:0}
.cab-pline{height:1px;background:rgba(20,20,25,.14);margin:16px 0}
.cab-pblurb{color:#1a1b1e;font-size:13px;line-height:1.6;margin:0;flex:1}
.cab-pow{margin-top:auto;display:flex;flex-direction:column;gap:8px;padding-top:18px}
.cab-pow .k{color:#83868e;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.26em;text-transform:uppercase}
.cab-penter{margin-top:22px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#1a1b1e}
.cab-update{position:fixed;bottom:18px;right:20px;z-index:30;display:flex;align-items:center;gap:7px;height:38px;padding:0 16px;border-radius:999px;
  cursor:pointer;color:#1a1b1e;border:1px solid rgba(20,20,25,.24);background:rgba(255,255,255,.55);font-family:'JetBrains Mono',monospace;
  font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;transition:.3s}
.cab-update:hover{border-color:rgba(143,106,37,.7);color:#8f6a25;background:rgba(143,106,37,.08)}
.cab-update .ring-o{width:11px;height:11px;border-radius:50%;border:1.6px solid currentColor;flex-shrink:0}
@media(max-width:640px){.cab-body{padding:36px 20px 110px}.cab-pcard{min-height:auto}}

@media(max-width:600px){
  .cab-head{padding:16px 18px;padding-top:calc(env(safe-area-inset-top,0px) + 57px);gap:12px}
  .cab-brand{margin-left:0;width:100%}
  .cab-brand .tag{display:none}
  .cab-sub{padding:0 4px}
  .cab-update{position:static;margin:30px auto 0;right:auto;bottom:auto}
  .cab-body{padding-bottom:24px}
}
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
    budgets: { ring: '#d6b36a', glow: 'rgba(214,179,106,.3)' },
    crm: { ring: '#d6b36a', glow: 'rgba(214,179,106,.3)' },
  }

  return (
    <div className="cab-root agw">
      <style>{CSS}</style>
      <video className="cab-bg" autoPlay muted loop playsInline preload="auto" src="/haavn-black-bg.mp4" />
      <div className="cab-scrim" />

      {/* Header */}
      <div className="cab-head">
        <button className="cab-mbtn" onClick={onClose} title="Back to ATRIUM" aria-label="Back to ATRIUM">
          <svg className="halo" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" transform="rotate(-90 50 50)" /></svg>
          <svg viewBox="0 0 240 240" width="17" height="17"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="9" strokeLinejoin="miter" strokeLinecap="butt" /></svg>
        </button>
        <div className="cab-brand">
          <div className="wm"><span className="a"><svg viewBox="75 64 90 112"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" strokeLinecap="butt" /></svg></span>TRIUM</div>
          <span className="tag">Capital Base</span>
        </div>
        <GatewaySeg />
      </div>

      {/* Body */}
      <div className="cab-body">
        <div className="cab-eyebrow">Precision capital deployed</div>
        <div className="cab-wm">
          <span className="a"><svg viewBox="75 64 90 112"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" strokeLinecap="butt" /></svg></span>TRIUM
        </div>
        <div className="cab-title">Administration base</div>
        <p className="cab-sub">Three pillars for the accounts, capital and partner teams — linked to the feasibility studio.</p>
        <div className="cab-faint">{projects.length} live project{projects.length !== 1 ? 's' : ''} · {fmtM(totalTDC)} land committed</div>
        <div className="cab-rule" />

        <div className="cab-pillars">
          {PILLARS.map((p, i) => (
            <div key={p.id} className={`cab-ledbox${i === 1 ? ' d2' : ''}`}
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
                    <img src="/xero-logo.png" alt="Xero" draggable={false} style={{ width: 86, height: 'auto', opacity: 0.92 }} />
                  </div>
                )}
                {p.id === 'crm' && (
                  <div className="cab-pow">
                    <span className="k">Powered by</span>
                    <span style={{ color: 'var(--g-ink,#1a1b1e)', fontFamily: "'Inter',sans-serif", fontWeight: 300, fontSize: 16, letterSpacing: '0.14em' }}>ATRIUM</span>
                  </div>
                )}

                <span className="cab-penter">Enter pillar &#8594;</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <SiteLinks tone="light" onLogout={onLogout} />
    </div>
  )
}
