import React, { useState } from 'react'
import { Project7Mark } from '../../components/ui'
import SiteLinks from '../../components/SiteLinks'
import HaavnManagementPillar from './HaavnManagementPillar'

// 'crm' and 'meetings' are retired from the hub listing (see HM_PILLARS) but
// their render paths are kept in HaavnManagementPillar for easy restoration.
export type HMPillarId = 'crm' | 'meetings' | 'agenda' | 'workflow'

export interface HMPillar {
  id: HMPillarId
  num: string
  title: string
  sub: string
  blurb: string
  color: string
}

/** Shared ATRIUM accents — same values as the Capital Base gateway. */
export const HM_PA = {
  silver: '#9aa8b6',
  silverHi: '#cdd8e2',
  silverLine: 'rgba(154,168,182,0.4)',
}

export const HM_PILLARS: HMPillar[] = [
  {
    id: 'workflow', num: '01', title: 'ATRIUM Workflow',
    sub: 'Tasks · Meeting CRM · Weekly agenda',
    blurb: 'Every person’s workspace — personal tasks and team boards, department workload and workflow groups, meeting recording with live Azure transcription, and the actions that flow straight into the Weekly Company Meeting.',
    color: '#d6b36a', // LED brand gold
  },
  {
    id: 'agenda', num: '02', title: 'Meeting Management',
    sub: 'Agenda · Actions · Minutes · Weekly cadence',
    blurb: 'The weekly rhythm of the business — the live Company Meeting agenda, action tracking, minutes and decisions, department leads and the Meeting Console, week to week.',
    color: '#d6b36a', // LED brand gold
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 7EVEN | HAAVN — MANAGEMENT HUB. Exact copy of the HAAVN BLACK MANAGEMENT
// design: moving video backdrop, brand lockup centre, and pillar cards ringed
// by a rotating LED border — green on 01, blue on 02.
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
.hmh-root{position:fixed;inset:0;z-index:400;overflow-y:auto;background:#040404;display:flex;flex-direction:column;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.hmh-bg{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.hmh-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(4,4,4,.74),rgba(4,4,4,.55) 42%,rgba(4,4,4,.9))}
.hmh-head{position:relative;z-index:2;display:flex;align-items:center;gap:16px;padding:20px 32px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
.hmh-btn{cursor:pointer;font-family:'Chakra Petch','JetBrains Mono',sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;
  color:#c9cdd2;padding:10px 16px;border-radius:2px;border:1px solid rgba(255,255,255,.28);background:transparent;transition:.3s}
.hmh-btn:hover{border-color:rgba(47,224,122,.7);color:#fff;background:rgba(47,224,122,.06);box-shadow:0 0 24px -10px rgba(47,224,122,.6)}
.hmh-brand{margin-left:auto;display:flex;align-items:center;gap:10px}
.hmh-brand .m7{height:13px;width:auto}
.hmh-brand .div{width:1px;height:16px;background:rgba(255,255,255,.25)}
.hmh-brand .mh{height:15px;width:auto;filter:brightness(0) invert(1)}
.hmh-brand .b{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8d90;white-space:nowrap}
.hmh-body{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:56px 32px 40px;max-width:1180px;width:100%;margin:0 auto}
.hmh-eyebrow{font-family:'Chakra Petch',sans-serif;font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:#7d8288;font-weight:500}
.hmh-lock{display:flex;align-items:center;gap:20px;margin-top:22px}
.hmh-lock .m7{height:clamp(26px,3.6vw,42px);width:auto;filter:drop-shadow(0 2px 12px rgba(0,0,0,.6))}
.hmh-lock .div{width:1px;height:clamp(30px,4.4vw,52px);background:rgba(255,255,255,.3)}
.hmh-lock .mh{height:clamp(24px,3.4vw,40px);width:auto;filter:brightness(0) invert(1) drop-shadow(0 2px 12px rgba(0,0,0,.6))}
.hmh-mgmt{font-family:'Chakra Petch',sans-serif;font-weight:500;font-size:clamp(14px,1.8vw,19px);letter-spacing:.52em;text-transform:uppercase;color:#fff;margin-top:18px;padding-left:.52em}
.hmh-sub{color:#a7abb0;font-size:14px;text-align:center;margin-top:16px;max-width:62ch;line-height:1.6}
.hmh-faint{color:#6a6e73;font-size:11px;letter-spacing:.16em;text-transform:uppercase;text-align:center;margin-top:8px}
.hmh-rule{width:230px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent);margin:24px auto 34px}
.hmh-pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;width:100%;max-width:1000px}
@property --hmhA{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes hmh-spin{to{--hmhA:360deg}}
.hmh-ledbox{position:relative;border-radius:16px;padding:1.7px;isolation:isolate;transition:transform .3s}
.hmh-ledbox::before{content:'';position:absolute;inset:0;border-radius:16px;padding:1.7px;
  background:conic-gradient(from var(--hmhA),transparent 0deg,#d6b36a 130deg,#f4e3bd 160deg,#d6b36a 190deg,transparent 310deg,transparent 360deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;
  filter:brightness(1.3) drop-shadow(0 0 6px rgba(244,227,189,.45)) drop-shadow(0 0 14px rgba(214,179,106,.3));
  animation:hmh-spin 4.6s linear infinite;z-index:1}
.hmh-ledbox::after{content:'';position:absolute;inset:-8px;border-radius:22px;z-index:0;opacity:.28;pointer-events:none;
  background:conic-gradient(from var(--hmhA),transparent 0deg,rgba(214,179,106,.3) 150deg,transparent 300deg);
  filter:blur(16px);animation:hmh-spin 4.6s linear infinite}
.hmh-ledbox.b2::before,.hmh-ledbox.b2::after{animation-direction:reverse}
.hmh-ledbox:hover{transform:translateY(-4px)}
.hmh-ledbox:hover::before,.hmh-ledbox:hover::after{animation-duration:2.4s}
.hmh-pcard{position:relative;z-index:2;border-radius:14px;background:linear-gradient(180deg,rgba(14,16,19,.9),rgba(8,9,11,.94));
  -webkit-backdrop-filter:blur(16px) saturate(1.1);backdrop-filter:blur(16px) saturate(1.1);
  padding:30px 28px 26px;min-height:560px;display:flex;flex-direction:column;cursor:pointer;text-align:left;border:0;width:100%;color:inherit}
.hmh-prow{display:flex;align-items:flex-start;justify-content:space-between}
.hmh-pnum{font-family:'Chakra Petch',monospace;font-size:34px;font-weight:300;line-height:1;
  text-shadow:0 0 8px rgba(244,227,189,.45),0 0 20px rgba(214,179,106,.3),0 0 34px rgba(190,150,80,.2)}
.hmh-papex{font-size:15px;opacity:.9;line-height:1;text-shadow:0 0 8px rgba(244,227,189,.45),0 0 18px rgba(214,179,106,.28)}
.hmh-psub{font-family:'Chakra Petch',sans-serif;font-size:10px;letter-spacing:.28em;text-transform:uppercase;font-weight:600;margin:16px 0 7px;
  text-shadow:0 0 8px rgba(244,227,189,.38),0 0 18px rgba(214,179,106,.22)}
.hmh-ptitle{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:27px;letter-spacing:.01em;line-height:1.06;color:#fff;margin:0}
.hmh-pline{height:1px;background:rgba(255,255,255,.1);margin:16px 0}
.hmh-pblurb{color:#a7abb0;font-size:13px;line-height:1.6;margin:0;flex:1}
.hmh-penter{margin-top:22px;font-family:'Chakra Petch',sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c9cdd2}
.hmh-logout{position:fixed;bottom:18px;left:20px;z-index:30}
@media(max-width:640px){.hmh-body{padding:36px 20px}.hmh-pcard{min-height:auto}}

@media(max-width:600px){.hmh-head{padding-top:calc(env(safe-area-inset-top,0px) + 57px)}}
`

export default function HaavnManagementBase({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const [pillar, setPillar] = useState<HMPillarId | null>(null)
  const visiblePillars = HM_PILLARS

  if (pillar) {
    const p = HM_PILLARS.find(x => x.id === pillar)!
    return <HaavnManagementPillar pillar={p} onBack={() => setPillar(null)} onLogout={onLogout} onExit={onClose} />
  }

  return (
    <div className="hmh-root">
      <style>{CSS}</style>
      <video className="hmh-bg" autoPlay muted loop playsInline preload="auto" src="/haavn-black-bg.mp4" />
      <div className="hmh-scrim" />

      {/* Header */}
      <div className="hmh-head">
        <button className="hmh-btn" onClick={onClose}>&#8592; ATRIUM</button>
        <div className="hmh-brand">
          <img className="m7" src="/seven-mark-white-hd.png" alt="7EVEN" />
          <span className="div" />
          <img className="mh" src="/haavn-mark.png" alt="HAAVN" />
          <span className="b">· MANAGEMENT HUB</span>
        </div>
      </div>

      {/* Body */}
      <div className="hmh-body">
        <div className="hmh-eyebrow">Integrated Management Platform</div>
        <div className="hmh-lock">
          <img className="m7" src="/seven-mark-white-hd.png" alt="7EVEN" />
          <span className="div" />
          <img className="mh" src="/haavn-mark.png" alt="HAAVN" />
        </div>
        <div className="hmh-mgmt">Management Hub</div>
        <p className="hmh-sub">Two pillars — the team’s workflow and the weekly meeting — one unified command centre.</p>
        <div className="hmh-faint">Strategic partnerships · Operational efficiency · Market intelligence</div>
        <div className="hmh-rule" />

        <div className="hmh-pillars">
          {visiblePillars.map((p, i) => (
            <div key={p.id} className={'hmh-ledbox' + (i === 1 ? ' b2' : '')}>
              <button className="hmh-pcard" onClick={() => setPillar(p.id)}>
                <div className="hmh-prow">
                  <span className="hmh-pnum" style={{ color: p.color }}>{p.num}</span>
                  <span className="hmh-papex" style={{ color: p.color }}>&#9650;</span>
                </div>
                <div>
                  <p className="hmh-psub" style={{ color: p.color }}>{p.sub}</p>
                  <h2 className="hmh-ptitle">{p.title}</h2>
                </div>
                <div className="hmh-pline" />
                <p className="hmh-pblurb">{p.blurb}</p>
                <span className="hmh-penter">Enter Pillar &#8594;</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <SiteLinks />
      <Project7Mark />
      <button className="hmh-btn hmh-logout" onClick={onLogout}>Log Out</button>
    </div>
  )
}
