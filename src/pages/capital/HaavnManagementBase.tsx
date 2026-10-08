import RefreshButton from '../../components/RefreshButton'
import React, { useState } from 'react'
import SiteLinks from '../../components/SiteLinks'
import GatewaySeg from '../../components/GatewaySeg'
import HaavnManagementPillar from './HaavnManagementPillar'

// 'crm' and 'meetings' are retired from the hub listing (see HM_PILLARS) but
// their render paths are kept in HaavnManagementPillar for easy restoration.
// 'workflow-black' is the HAAVN Black sales team's own restricted variant of
// pillar 01 (see HM_PILLARS_BLACK below) — same data, a smaller tool.
export type HMPillarId = 'crm' | 'meetings' | 'agenda' | 'workflow' | 'workflow-black'

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
    sub: 'Partner CRM · supply pipeline · home sales · actions',
    blurb: 'HAAVN’s partner and supply-project relationships, HAAVN Black’s home-buyer sales pipeline, and the shared action register — linked straight into Meeting Management, so a decision made in a meeting writes back onto the record it was about.',
    color: '#d6b36a', // LED brand gold
  },
  {
    id: 'agenda', num: '02', title: 'Meeting Management',
    sub: 'Agenda · actions · minutes · weekly cadence',
    blurb: 'The weekly rhythm of the business — the live Company Meeting agenda, action tracking, minutes and decisions, department leads and the Meeting Console, week to week.',
    color: '#d6b36a', // LED brand gold
  },
]

// HAAVN Black sales team's own restricted hub — reached from the HAAVN Black
// menu, not the HAAVN menu. Same data as HM_PILLARS (same cloud keys), just a
// smaller pillar 01 tool (leads, own tasks, own meetings only — no 7EVEN,
// HAAVN supply or management areas) and the same shared Meeting Management,
// which is already scoped per-attendee.
export const HM_PILLARS_BLACK: HMPillar[] = [
  {
    id: 'workflow-black', num: '01', title: 'ATRIUM · HAAVN Black',
    sub: 'Leads · home buyers · own tasks · meetings',
    blurb: 'Your own deals and leads in the HAAVN Black sales pipeline, your own tasks and weekly agenda, and setting up meetings — linked straight into Meeting Management.',
    color: '#d6b36a',
  },
  {
    id: 'agenda', num: '02', title: 'Meeting Management',
    sub: 'Agenda · actions · minutes · weekly cadence',
    blurb: 'The weekly rhythm of the business — you only see meetings you’re chairing or attending.',
    color: '#d6b36a',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ATRIUM MANAGEMENT HUB. Moving video backdrop inverted into a soft white/
// grey palette, the ATRIUM wordmark (exact login treatment) in place of the
// old 7EVEN/HAAVN lockup, the canonical circular ring+A back control, and
// pillar cards that stay fully transparent until hovered — held only by a
// rotating gold LED ring border.
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
.hmh-root{position:fixed;inset:0;z-index:400;overflow-y:auto;overflow-x:hidden;overscroll-behavior-x:none;background:#787675;display:flex;flex-direction:column;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.hmh-bg{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;
  filter:invert(1) brightness(.73) contrast(.82) saturate(.12) sepia(.05)}
.hmh-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.27),rgba(255,255,255,.15) 42%,rgba(255,255,255,.34))}
.hmh-head{position:relative;z-index:2;display:flex;align-items:center;gap:16px;padding:20px 32px;border-bottom:1px solid rgba(20,20,25,.10);flex-shrink:0;flex-wrap:wrap;row-gap:10px}
.mbtn{position:relative;width:38px;height:38px;flex:none;border-radius:50%;border:1px solid rgba(20,20,25,.30);
  background:transparent;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;color:#1a1b1e;
  transition:border-color .3s cubic-bezier(.16,1,.3,1),box-shadow .3s cubic-bezier(.16,1,.3,1),background .3s cubic-bezier(.16,1,.3,1)}
.mbtn:hover{border-color:#d6b36a;box-shadow:0 0 22px rgba(214,179,106,.18);background:rgba(214,179,106,.08)}
.mbtn:active{transform:scale(.94)}
.mbtn .halo{position:absolute;inset:-1px;border-radius:50%;pointer-events:none}
.mbtn .halo circle{fill:none;stroke:#d6b36a;stroke-width:1.2;opacity:0;stroke-dasharray:302}
.mbtn:hover .halo circle{opacity:.9;animation:ringdraw .8s cubic-bezier(.16,1,.3,1) both}
@keyframes ringdraw{from{stroke-dashoffset:302}to{stroke-dashoffset:0}}
.hmh-brand{margin-left:auto;display:flex;align-items:center;gap:12px}
.hmh-brand .wm{display:flex;align-items:center;font:100 16px/1 'Inter',sans-serif;letter-spacing:.3em;padding-left:.3em;color:#1a1b1e}
.hmh-brand .wm .a{display:block;width:.62em;height:.7em;margin-right:.3em;flex:none}
.hmh-brand .wm .a svg{display:block;width:100%;height:100%;overflow:visible}
.hmh-brand .tag{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:10px;letter-spacing:.24em;color:#83868e;white-space:nowrap;
  border-left:1px solid rgba(20,20,25,.16);padding-left:12px;text-transform:uppercase}
.hmh-body{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:56px 32px 40px;max-width:1180px;width:100%;margin:0 auto}
.hmh-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:#83868e;font-weight:500}
.hmh-wm{display:flex;align-items:center;font:100 clamp(38px,7vw,64px)/1 'Inter',sans-serif;letter-spacing:.3em;padding-left:.3em;color:#1a1b1e;margin-top:26px}
.hmh-wm .a{display:block;width:.62em;height:.7em;margin-right:.3em;flex:none}
.hmh-wm .a svg{display:block;width:100%;height:100%;overflow:visible}
.hmh-mgmt{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:clamp(12px,1.6vw,15px);letter-spacing:.5em;text-transform:uppercase;color:#8f6a25;margin-top:20px;padding-left:.5em}
.hmh-sub{color:#4a4d54;font-size:14px;text-align:center;margin-top:18px;max-width:62ch;line-height:1.6}
.hmh-faint{color:#83868e;font-size:11px;letter-spacing:.16em;text-transform:uppercase;text-align:center;margin-top:8px;font-family:'JetBrains Mono',monospace}
.hmh-rule{width:230px;height:1px;background:linear-gradient(90deg,transparent,rgba(20,20,25,.24),transparent);margin:24px auto 34px}
.hmh-pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;width:100%;max-width:1000px;position:relative}
@property --hmhA{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes hmh-spin{to{--hmhA:360deg}}
.hmh-ledbox{position:relative;border-radius:22px;padding:1.7px;isolation:isolate;transition:transform .3s}
.hmh-ledbox::before{content:'';position:absolute;inset:0;border-radius:22px;padding:1.7px;
  background:conic-gradient(from var(--hmhA),transparent 0deg,#d6b36a 130deg,#f4e3bd 160deg,#d6b36a 190deg,transparent 310deg,transparent 360deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;
  filter:brightness(1.3) drop-shadow(0 0 6px rgba(244,227,189,.45)) drop-shadow(0 0 14px rgba(214,179,106,.3));
  animation:hmh-spin 4.6s linear infinite;z-index:1}
.hmh-ledbox::after{content:'';position:absolute;inset:-8px;border-radius:28px;z-index:0;opacity:.28;pointer-events:none;
  background:conic-gradient(from var(--hmhA),transparent 0deg,rgba(214,179,106,.3) 150deg,transparent 300deg);
  filter:blur(16px);animation:hmh-spin 4.6s linear infinite}
.hmh-ledbox.b2::before,.hmh-ledbox.b2::after{animation-direction:reverse}
.hmh-ledbox:hover::before,.hmh-ledbox:hover::after{animation-duration:2.4s}
/* Hovering one pillar draws it toward the centre and lifts it forward; the other
   pillar eases back and slightly up, as if stepping behind it. */
.hmh-ledbox{position:relative;z-index:2;transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .5s cubic-bezier(.16,1,.3,1)}
.hmh-pillars:has(.hmh-ledbox:nth-child(1):hover) .hmh-ledbox:nth-child(1){transform:scale(1.055) translateX(5%);z-index:6}
.hmh-pillars:has(.hmh-ledbox:nth-child(1):hover) .hmh-ledbox:nth-child(2){transform:translateY(-22px) scale(.94);z-index:1;opacity:.8}
.hmh-pillars:has(.hmh-ledbox:nth-child(2):hover) .hmh-ledbox:nth-child(2){transform:scale(1.055) translateX(-5%);z-index:6}
.hmh-pillars:has(.hmh-ledbox:nth-child(2):hover) .hmh-ledbox:nth-child(1){transform:translateY(-22px) scale(.94);z-index:1;opacity:.8}
.hmh-pcard{position:relative;z-index:2;border-radius:20px;background:transparent;transition:background .35s cubic-bezier(.16,1,.3,1);
  padding:30px 28px 26px;min-height:560px;display:flex;flex-direction:column;cursor:pointer;text-align:left;border:0;width:100%;color:inherit}
.hmh-pcard:hover,.hmh-pcard:focus-visible{background:rgba(255,255,255,.3)}
.hmh-prow{display:flex;align-items:flex-start;justify-content:space-between}
.hmh-pnum{font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:300;line-height:1;color:#8f6a25}
.hmh-papex{width:26px;height:26px;border-radius:50%;border:1px solid rgba(143,106,37,.45);display:flex;align-items:center;justify-content:center;color:#8f6a25}
.hmh-papex svg{width:11px;height:11px;display:block}
.hmh-psub{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.24em;text-transform:uppercase;font-weight:500;margin:18px 0 8px;color:#8f6a25}
.hmh-ptitle{font-family:'Inter',sans-serif;font-weight:300;font-size:27px;letter-spacing:.01em;line-height:1.1;color:#8f6a25;margin:0}
.hmh-pline{height:1px;background:rgba(20,20,25,.14);margin:16px 0}
.hmh-pblurb{color:#1a1b1e;font-size:13px;line-height:1.6;margin:0;flex:1}
.hmh-penter{margin-top:22px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#1a1b1e}
.hmh-logout{position:fixed;bottom:18px;left:20px;z-index:30}
.hmh-logout{width:48px;height:48px;flex-shrink:0;border-radius:999px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:0;font-size:7.5px;letter-spacing:.16em;
  cursor:pointer;color:#1a1b1e;border:1px solid rgba(20,20,25,.24);background:rgba(255,255,255,.55);font-family:'JetBrains Mono',monospace;transition:.3s}
.hmh-logout:hover{border-color:rgba(224,100,92,.7);color:#c0392b;background:rgba(224,100,92,.08)}
.hmh-logout .ring-o{width:11px;height:11px;border-radius:50%;border:1.6px solid currentColor;flex-shrink:0}
.hmh-update{position:fixed;bottom:18px;right:20px;z-index:30;display:flex;align-items:center;gap:7px;height:38px;padding:0 16px;border-radius:999px;
  cursor:pointer;color:#1a1b1e;border:1px solid rgba(20,20,25,.24);background:rgba(255,255,255,.55);font-family:'JetBrains Mono',monospace;
  font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;transition:.3s}
.hmh-update:hover{border-color:rgba(143,106,37,.7);color:#8f6a25;background:rgba(143,106,37,.08)}
.hmh-update .ring-o{width:11px;height:11px;border-radius:50%;border:1.6px solid currentColor;flex-shrink:0}
@media(max-width:640px){.hmh-body{padding:36px 20px 110px}.hmh-pcard{min-height:auto}}

@media(max-width:600px){
  .hmh-head{padding:16px 18px;padding-top:calc(env(safe-area-inset-top,0px) + 57px);gap:12px}
  .hmh-brand{margin-left:0;width:100%}
  .hmh-brand .tag{display:none}
  .hmh-sub{padding:0 4px}
  .hmh-logout{position:static;margin:12px auto 0;left:auto;bottom:auto}
  .hmh-update{position:static;margin:30px auto 0;right:auto;bottom:auto}
  .hmh-body{padding-bottom:24px}
}
`

export default function HaavnManagementBase({ onClose, onLogout, pillars }: { onClose: () => void; onLogout: () => void; pillars?: HMPillar[] }) {
  const [pillar, setPillar] = useState<HMPillarId | null>(null)
  // Set when pillar 01 asks to open a specific meeting in pillar 02 (see
  // HaavnManagementPillar's onOpenMeeting) — carried through as a query param
  // on pillar 02's iframe so it jumps straight into that meeting's agenda.
  const [openMeetingId, setOpenMeetingId] = useState<string | number | null>(null)
  const visiblePillars = pillars ?? HM_PILLARS

  if (pillar) {
    const p = visiblePillars.find(x => x.id === pillar)!
    return <HaavnManagementPillar pillar={p} onBack={() => setPillar(null)} onLogout={onLogout} onExit={onClose}
      openMeetingId={pillar === 'agenda' ? openMeetingId : null}
      onOpenMeeting={(id) => { setOpenMeetingId(id); setPillar('agenda') }} />
  }

  return (
    <div className="hmh-root agw">
      <style>{CSS}</style>
      <video className="hmh-bg" autoPlay muted loop playsInline preload="auto" src="/haavn-black-bg.mp4" />
      <div className="hmh-scrim" />

      {/* Header */}
      <div className="hmh-head">
        <button className="mbtn" onClick={onClose} title="Back to ATRIUM" aria-label="Back to ATRIUM">
          <svg className="halo" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" transform="rotate(-90 50 50)" /></svg>
          <svg viewBox="0 0 240 240" width="17" height="17"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="9" strokeLinejoin="miter" strokeLinecap="butt" /></svg>
        </button>
        <div className="hmh-brand">
          <div className="wm"><span className="a"><svg viewBox="75 64 90 112"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" strokeLinecap="butt" /></svg></span>TRIUM</div>
          <span className="tag">Management hub</span>
        </div>
        <GatewaySeg />
      </div>

      {/* Body */}
      <div className="hmh-body">
        <div className="hmh-eyebrow">Integrated management platform</div>
        <div className="hmh-wm">
          <span className="a"><svg viewBox="75 64 90 112"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" strokeLinecap="butt" /></svg></span>TRIUM
        </div>
        <div className="hmh-mgmt">Management hub</div>
        <p className="hmh-sub">Two pillars — the team’s workflow and the weekly meeting — one unified command centre.</p>
        <div className="hmh-faint">Strategic partnerships · operational efficiency · market intelligence</div>
        <div className="hmh-rule" />

        <div className="hmh-pillars">
          {visiblePillars.map((p, i) => (
            <div key={p.id} className={'hmh-ledbox' + (i === 1 ? ' b2' : '')}>
              <button className="hmh-pcard" onClick={() => setPillar(p.id)}>
                <div className="hmh-prow">
                  <span className="hmh-pnum">{p.num}</span>
                  <span className="hmh-papex"><svg viewBox="0 0 240 240"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="miter" strokeLinecap="butt" /></svg></span>
                </div>
                <div>
                  <p className="hmh-psub">{p.sub}</p>
                  <h2 className="hmh-ptitle">{p.title}</h2>
                </div>
                <div className="hmh-pline" />
                <p className="hmh-pblurb">{p.blurb}</p>
                <span className="hmh-penter">Enter pillar &#8594;</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <SiteLinks tone="light" />
      <RefreshButton size={48} className="hub-rb" />
      <button className="hmh-logout" aria-label="Log Out" onClick={onLogout}>LOG<span className="ring-o" aria-hidden="true" /></button>
    </div>
  )
}
