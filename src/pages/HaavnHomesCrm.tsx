import React, { useEffect, useState } from 'react'
import SiteLinks from '../components/SiteLinks'
import { Project7Mark } from '../components/ui'

/**
 * HAAVN BLACK — Management hub, opened from the top-right HM link inside HAAVN
 * Homes and from the footer PARTNERS gate. Rebuilt to read as the HAAVN BLACK
 * main app: moving video backdrop, HMVN + BLACK lockup, and pillar cards ringed
 * by an animated green→blue LED border. Two pillars, then the chosen
 * self-contained tool mounts full-bleed in an iframe:
 *
 *   01 · Customer Journey Management  → public/haavn-homes-crm.html
 *   02 · Shareholder · Path to Market → public/haavn-path-to-market.html
 *
 * EXCLUSIVE to HAAVN Homes — not the 7EVEN CRM and not the shared HM Hub.
 * Each tool's "← Back" (postMessage 'haavn-crm-close') returns to the hub; the
 * hub returns to HAAVN Homes. Escape mirrors this.
 */
const PILLARS = [
  {
    id: 'crm', src: '/haavn-homes-crm.html', num: '01', color: '#2fe07a',
    title: 'Customer Journey Management',
    sub: 'Sales · Construction · Contracts',
    blurb: 'Every enquiry, contract and home in delivery — the 15-step customer journey from first consult to handover, with the full sales and construction pipeline.',
  },
  {
    id: 'ptm', src: '/haavn-path-to-market.html', num: '02', color: '#13B5EA',
    title: 'Shareholder · Path to Market',
    sub: 'Process · Deliverables · Gates',
    blurb: 'The route to market and the return to the partnership: revenue, cost to the business, the full group structure, and the operating directive — for HAAVN × Hamilton Marino shareholders.',
  },
] as const

const CSS = `
.hbm-root{position:fixed;inset:0;z-index:700;overflow-y:auto;background:#040404;display:flex;flex-direction:column;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.hbm-bg{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.hbm-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(4,4,4,.74),rgba(4,4,4,.55) 42%,rgba(4,4,4,.9))}
.hbm-head{position:relative;z-index:2;display:flex;align-items:center;gap:16px;padding:20px 32px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
.hbm-btn{cursor:pointer;font-family:'Chakra Petch',sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;
  color:#c9cdd2;padding:10px 16px;border-radius:2px;border:1px solid rgba(255,255,255,.28);background:transparent;transition:.3s}
.hbm-btn:hover{border-color:rgba(47,224,122,.7);color:#fff;background:rgba(47,224,122,.06);box-shadow:0 0 24px -10px rgba(47,224,122,.6)}
.hbm-brand{margin-left:auto;display:flex;align-items:center;gap:9px}
.hbm-brand .m{height:17px;width:auto;filter:brightness(0) invert(1)}
.hbm-brand .b{font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:14px;letter-spacing:.16em;color:#8a8d90}
.hbm-body{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:56px 32px 40px;max-width:1180px;width:100%;margin:0 auto}
.hbm-eyebrow{font-family:'Chakra Petch',sans-serif;font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:#7d8288;font-weight:500}
.hbm-lock{display:flex;align-items:center;gap:16px;margin-top:18px}
.hbm-lock .m{height:clamp(34px,5vw,58px);width:auto;filter:brightness(0) invert(1)}
.hbm-lock .b{font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:clamp(30px,5vw,54px);letter-spacing:.02em;color:#6f7377;line-height:1}
.hbm-mgmt{font-family:'Chakra Petch',sans-serif;font-weight:500;font-size:clamp(14px,1.8vw,19px);letter-spacing:.52em;text-transform:uppercase;color:#fff;margin-top:16px;padding-left:.52em}
.hbm-sub{color:#a7abb0;font-size:14px;text-align:center;margin-top:16px;max-width:62ch;line-height:1.6}
.hbm-faint{color:#6a6e73;font-size:11px;letter-spacing:.16em;text-transform:uppercase;text-align:center;margin-top:8px}
.hbm-rule{width:230px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent);margin:24px auto 34px}
.hbm-pillars{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;width:100%;max-width:1000px}

@property --hbmA{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes hbm-spin{to{--hbmA:360deg}}
.ledbox{position:relative;border-radius:16px;padding:1.7px;isolation:isolate;transition:transform .3s}
.ledbox::before{content:'';position:absolute;inset:0;border-radius:16px;padding:1.7px;
  background:conic-gradient(from var(--hbmA),transparent 0deg,#2fe07a 130deg,#2fe07a 190deg,transparent 310deg,transparent 360deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;
  animation:hbm-spin 4.6s linear infinite;z-index:1}
.ledbox::after{content:'';position:absolute;inset:-8px;border-radius:22px;z-index:0;opacity:.5;pointer-events:none;
  background:conic-gradient(from var(--hbmA),transparent 0deg,rgba(47,224,122,.55) 150deg,transparent 300deg);
  filter:blur(16px);animation:hbm-spin 4.6s linear infinite}
.ledbox.b2::before{animation-delay:-2.3s;background:conic-gradient(from var(--hbmA),transparent 0deg,#13B5EA 130deg,#13B5EA 190deg,transparent 310deg,transparent 360deg)}
.ledbox.b2::after{animation-delay:-2.3s;background:conic-gradient(from var(--hbmA),transparent 0deg,rgba(19,181,234,.55) 150deg,transparent 300deg)}
.ledbox:hover{transform:translateY(-4px)}
.ledbox:hover::before,.ledbox:hover::after{animation-duration:2.4s}
.pcard{position:relative;z-index:2;border-radius:14px;background:linear-gradient(180deg,rgba(14,16,19,.9),rgba(8,9,11,.94));
  -webkit-backdrop-filter:blur(16px) saturate(1.1);backdrop-filter:blur(16px) saturate(1.1);
  padding:30px 28px 26px;min-height:560px;display:flex;flex-direction:column;cursor:pointer;text-align:left;border:0;width:100%;color:inherit}
.pcard .prow{display:flex;align-items:flex-start;justify-content:space-between}
.pcard .pnum{font-family:'Chakra Petch',sans-serif;font-size:34px;font-weight:300;line-height:1}
.pcard .papex{font-size:15px;opacity:.8;line-height:1}
.pcard .psub{font-family:'Chakra Petch',sans-serif;font-size:10px;letter-spacing:.28em;text-transform:uppercase;font-weight:600;margin:16px 0 7px}
.pcard .ptitle{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:27px;letter-spacing:.01em;line-height:1.06;color:#fff;margin:0}
.pcard .pline{height:1px;background:rgba(255,255,255,.1);margin:16px 0}
.pcard .pblurb{color:#a7abb0;font-size:13px;line-height:1.6;margin:0;flex:1}
.pcard .penter{margin-top:22px;font-family:'Chakra Petch',sans-serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#c9cdd2}
.hbm-logout{position:fixed;bottom:18px;left:20px;z-index:30}
@media(max-width:640px){.hbm-body{padding:36px 20px}.pcard{min-height:auto}}
`

export default function HaavnHomesCrm({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const [pillar, setPillar] = useState<string | null>(null)

  useEffect(() => {
    const back = () => { if (pillar) setPillar(null); else onClose() }
    function onMsg(e: MessageEvent) { if (e.data === 'haavn-crm-close') back() }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') back() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('keydown', onKey) }
  }, [pillar, onClose])

  const active = PILLARS.find(p => p.id === pillar)

  // Chosen pillar — mount its tool full-bleed. The tool's own "← Back" returns here.
  if (active) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#040404', display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top)' }}>
        <iframe title={active.title} src={active.src}
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
      </div>
    )
  }

  // The pillar hub — HAAVN BLACK management.
  return (
    <div className="hbm-root">
      <style>{CSS}</style>
      <video className="hbm-bg" autoPlay muted loop playsInline preload="auto" src="/haavn-black-bg.mp4" />
      <div className="hbm-scrim" />

      {/* Header */}
      <div className="hbm-head">
        <button className="hbm-btn" onClick={onClose}>&#8592; HAAVN BLACK</button>
        <div className="hbm-brand">
          <img className="m" src="/haavn-mark.png" alt="HAAVN" />
          <span className="b">BLACK · MANAGEMENT</span>
        </div>
      </div>

      {/* Body */}
      <div className="hbm-body">
        <div className="hbm-eyebrow">Integrated Management Platform</div>
        <div className="hbm-lock"><img className="m" src="/haavn-mark.png" alt="HAAVN" /><span className="b">BLACK</span></div>
        <div className="hbm-mgmt">Management</div>
        <p className="hbm-sub">Two pillars for HAAVN Black — the customer's journey, and the shareholder path to market.</p>
        <div className="hbm-faint">Customer Journey · Deliverables · Gates · Launch</div>
        <div className="hbm-rule" />

        <div className="hbm-pillars">
          {PILLARS.map((p, i) => (
            <div key={p.id} className={'ledbox' + (i === 1 ? ' b2' : '')}>
              <button className="pcard" onClick={() => setPillar(p.id)}>
                <div className="prow">
                  <span className="pnum" style={{ color: p.color }}>{p.num}</span>
                  <span className="papex" style={{ color: p.color }}>&#9650;</span>
                </div>
                <div>
                  <p className="psub" style={{ color: p.color }}>{p.sub}</p>
                  <h2 className="ptitle">{p.title}</h2>
                </div>
                <div className="pline" />
                <p className="pblurb">{p.blurb}</p>
                <span className="penter">Enter Pillar &#8594;</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <SiteLinks />
      <Project7Mark />
      <button className="hbm-btn hbm-logout" onClick={onLogout}>Log Out</button>
    </div>
  )
}
