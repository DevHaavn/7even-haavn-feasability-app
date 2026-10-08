import RefreshButton from '../../components/RefreshButton'
import React, { useState, useEffect } from 'react'
import BudgetsAdmin, { ensureAdminData, publishProjectCosts } from './BudgetsAdmin'
import { AtriumApex } from '../../components/AtriumMark'
import GatewaySeg from '../../components/GatewaySeg'

/** Accounts Pillar 01 landing. Splits Administration into two books:
 *  01 · 7EVEN Capital Administration (ATRIUM) — the 7even / 7even Capital entity,
 *       its project-linked budgets and dashboards.
 *  02 · HAAVN Administration — the HAAVN group entities (Pty Ltd, Management,
 *       Precision, Technologies), kept separate from 7even.
 *  Picking a book opens BudgetsAdmin filtered to that group. */

type Group = '7even' | 'haavn'

const BOOKS: { id: Group; num: string; title: string; sub: string; blurb: string; color: string }[] = [
  {
    id: '7even', num: '01', title: '7EVEN Capital Administration',
    sub: 'Dashboards · projects · budgets',
    blurb: '7EVEN & 7EVEN Capital books — project-linked budgets tracked live against the feasibility studio, invoice register and dashboards.',
    // Was the retired gold #C4973A. Xero blue — this book IS the Xero-backed
    // 7EVEN set, and it matches pillar 01 on the gateway it sits under.
    color: '#d6b36a',
  },
  {
    id: 'haavn', num: '02', title: 'HAAVN Administration',
    sub: 'Accounts & settlement · client revenue · FY27',
    blurb: 'The full ATRIUM Accounts & Settlement surface — client revenue, manager splits, group settlement, inter-co loans and the FY27 budget across every HAAVN entity, consolidated.',
    color: '#d6b36a',
  },
]


export default function BudgetsAdminBase({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [group, setGroup] = useState<Group | null>(null)

  // The books run in an iframe, so their in-page "← Administration" control
  // can't route this app — it posts a message instead. Origin is checked so
  // only our own pages can close the book.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if (e.data && e.data.type === 'atrium:back-admin') setGroup(null)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  // The 7EVEN book reads capital_admin_v3 directly but cannot seed it. Ensure
  // the CFO seed exists (fresh browsers) before the book's expenses/budget tabs
  // try to read it. No-op when data already exists.
  useEffect(() => { ensureAdminData() }, [])

  // Publish each project's live cost stack (computed here, where the store is
  // hydrated) for the book to read. Refresh on a short interval and on focus so
  // a change in the feasibility studio flows into the admin without a reload.
  useEffect(() => {
    if (group !== '7even') return
    publishProjectCosts()
    const iv = setInterval(publishProjectCosts, 4000)
    const onFocus = () => publishProjectCosts()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [group])

  // 7EVEN Capital Administration — the live book: Xero connect / push / pull,
  // project tracking wired to the feasibility studio, the detailed cost stack
  // and the month-by-month budget grid.
  //
  // The book is the ATRIUM silver-glass HTML design (Dashboard, 7EVEN GROUP ·
  // Structure, Project tracking, Budget entry, Invoices & Bills, Project spend).
  // It is same-origin, so its own script wires the live functions directly:
  // shared localStorage for the feasibility cost stack and the budget store,
  // and fetch() to the Xero endpoints. The React BudgetsAdmin component is kept
  // as the data/logic reference the book's script mirrors.
  if (group === '7even') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#050706', display: 'flex', flexDirection: 'column' }}>
        {/* The back control lives IN the book's own rail header (circular icon
            beside the wordmark), posting atrium:back-admin which the message
            listener above handles — same pattern as Book 02. No floating pill. */}
        <iframe
          title="ATRIUM — 7EVEN Capital Administration"
          src="/atrium-book01-7even-capital.html?v=20261008d"
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      </div>
    )
  }

  // HAAVN Administration — Dom's full ATRIUM Accounts & Settlement module
  // (Client revenue · Group settlement · FY27 budget · Command overview),
  // running as its own ATRIUM-native surface. Owns the screen; a discreet
  // carbon pill returns to the two-book landing.
  if (group === 'haavn') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#050706', display: 'flex', flexDirection: 'column' }}>
        {/* The back control lives IN the book's own header bar (top-left),
            posting atrium:back-admin which the message listener above handles —
            same pattern as Book 01. No floating pill. */}
        <iframe
          title="ATRIUM — Accounts & Settlement"
          src="/atrium-accounts.html?v=20261008f"
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      </div>
    )
  }

  const CSS = `
.abh-wrap{position:fixed;inset:0;z-index:400;overflow-y:auto;overflow-x:hidden;overscroll-behavior-x:none;display:flex;flex-direction:column;
  background:#787675;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.abh-bg{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;border-radius:0;
  filter:invert(1) brightness(.73) contrast(.82) saturate(.12) sepia(.05)}
.abh-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.27),rgba(255,255,255,.15) 42%,rgba(255,255,255,.34))}
.abh-head{position:relative;z-index:2;display:flex;align-items:center;gap:16px;padding:20px 32px;border-bottom:1px solid rgba(20,20,25,.10);flex-shrink:0;flex-wrap:wrap;row-gap:10px}
.abh-mbtn{position:relative;width:38px;height:38px;flex:none;border-radius:50%;border:1px solid rgba(20,20,25,.30);
  background:transparent;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;color:#1a1b1e;
  transition:border-color .3s cubic-bezier(.16,1,.3,1),box-shadow .3s cubic-bezier(.16,1,.3,1),background .3s cubic-bezier(.16,1,.3,1)}
.abh-mbtn:hover{border-color:#d6b36a;box-shadow:0 0 22px rgba(214,179,106,.18);background:rgba(214,179,106,.08)}
.abh-mbtn:active{transform:scale(.94)}
.abh-mbtn .halo{position:absolute;inset:-1px;border-radius:50%;pointer-events:none}
.abh-mbtn .halo circle{fill:none;stroke:#d6b36a;stroke-width:1.2;opacity:0;stroke-dasharray:302}
.abh-mbtn:hover .halo circle{opacity:.9;animation:abh-ringdraw .8s cubic-bezier(.16,1,.3,1) both}
@keyframes abh-ringdraw{from{stroke-dashoffset:302}to{stroke-dashoffset:0}}
.abh-brand{margin-left:auto;display:flex;align-items:center;gap:12px}
.abh-brand .wm{display:flex;align-items:center;font:100 16px/1 'Inter',sans-serif;letter-spacing:.3em;padding-left:.3em;color:#1a1b1e}
.abh-brand .wm .a{display:block;width:.62em;height:.7em;margin-right:.3em;flex:none}
.abh-brand .wm .a svg{display:block;width:100%;height:100%;overflow:visible}
.abh-brand .tag{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:10px;letter-spacing:.24em;color:#83868e;white-space:nowrap;
  border-left:1px solid rgba(20,20,25,.16);padding-left:12px;text-transform:uppercase}
.abh-logout{position:fixed;bottom:18px;left:20px;z-index:30;width:48px;height:48px;flex-shrink:0;border-radius:999px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:0;font-size:7.5px;letter-spacing:.16em;
  cursor:pointer;color:#1a1b1e;border:1px solid rgba(20,20,25,.24);background:rgba(255,255,255,.55);font-family:'JetBrains Mono',monospace;transition:.3s}
.abh-logout:hover{border-color:rgba(224,100,92,.7);color:#c0392b;background:rgba(224,100,92,.08)}
.abh-logout .ring-o{width:11px;height:11px;border-radius:50%;border:1.6px solid currentColor;flex-shrink:0}
.abh-update{position:fixed;bottom:18px;right:20px;z-index:30;display:flex;align-items:center;gap:7px;height:38px;padding:0 16px;border-radius:999px;
  cursor:pointer;color:#1a1b1e;border:1px solid rgba(20,20,25,.24);background:rgba(255,255,255,.55);font-family:'JetBrains Mono',monospace;
  font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;transition:.3s}
.abh-update:hover{border-color:rgba(143,106,37,.7);color:#8f6a25;background:rgba(143,106,37,.08)}
.abh-update .ring-o{width:11px;height:11px;border-radius:50%;border:1.6px solid currentColor;flex-shrink:0}
@media(max-width:600px){
  .abh-head{padding:16px 18px;padding-top:calc(env(safe-area-inset-top,0px) + 57px);gap:12px}
  .abh-brand{margin-left:0;width:100%}
  .abh-brand .tag{display:none}
  .abh-logout{position:static;margin:12px auto 0;left:auto;bottom:auto}
  .abh-update{position:static;margin:30px auto 0;right:auto;bottom:auto}
}
.abh-in{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;padding:48px 32px;max-width:1440px;width:100%;margin:0 auto}
.abh-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:#83868e;font-weight:500;text-align:center}
.abh-title{font-family:'Inter',sans-serif;font-weight:300;font-size:clamp(28px,4.6vw,52px);letter-spacing:.04em;line-height:1;color:#1a1b1e;margin-top:16px;text-transform:uppercase;text-align:center}
.abh-sub{color:#4a4d54;font-size:14px;text-align:center;margin-top:16px;line-height:1.6}
.abh-rule{width:230px;height:1px;background:linear-gradient(90deg,transparent,rgba(20,20,25,.24),transparent);margin:24px auto 34px}
.abh-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;width:100%;max-width:1000px;position:relative}
@property --abhA{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes abh-spin{to{--abhA:360deg}}
.abh-ledbox{position:relative;z-index:2;border-radius:22px;padding:1.7px;isolation:isolate;transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .5s cubic-bezier(.16,1,.3,1)}
.abh-ledbox::before{content:'';position:absolute;inset:0;border-radius:22px;padding:1.7px;
  background:conic-gradient(from var(--abhA),transparent 0deg,var(--ring) 130deg,#f4e3bd 160deg,var(--ring) 190deg,transparent 310deg,transparent 360deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;
  filter:brightness(1.3) drop-shadow(0 0 6px rgba(244,227,189,.45)) drop-shadow(0 0 14px rgba(214,179,106,.3));
  animation:abh-spin 4.6s linear infinite;z-index:1}
.abh-ledbox::after{content:'';position:absolute;inset:-8px;border-radius:28px;z-index:0;opacity:.28;pointer-events:none;
  background:conic-gradient(from var(--abhA),transparent 0deg,var(--ringGlow) 150deg,transparent 300deg);
  filter:blur(16px);animation:abh-spin 4.6s linear infinite}
.abh-ledbox.d2::before,.abh-ledbox.d2::after{animation-direction:reverse}
.abh-ledbox:hover::before,.abh-ledbox:hover::after{animation-duration:2.4s}
.abh-grid:has(.abh-ledbox:nth-child(1):hover) .abh-ledbox:nth-child(1){transform:scale(1.055) translateX(5%);z-index:6}
.abh-grid:has(.abh-ledbox:nth-child(1):hover) .abh-ledbox:nth-child(2){transform:translateY(-22px) scale(.94);z-index:1;opacity:.8}
.abh-grid:has(.abh-ledbox:nth-child(2):hover) .abh-ledbox:nth-child(2){transform:scale(1.055) translateX(-5%);z-index:6}
.abh-grid:has(.abh-ledbox:nth-child(2):hover) .abh-ledbox:nth-child(1){transform:translateY(-22px) scale(.94);z-index:1;opacity:.8}
.abh-card{position:relative;z-index:2;border-radius:20px;background:transparent;transition:background .35s cubic-bezier(.16,1,.3,1);
  padding:30px 28px 26px;min-height:480px;display:flex;flex-direction:column;cursor:pointer;text-align:left;border:0;width:100%;color:inherit}
.abh-card:hover,.abh-card:focus-visible{background:rgba(255,255,255,.3)}
.abh-prow{display:flex;align-items:flex-start;justify-content:space-between}
.abh-num{font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:300;line-height:1;color:#8f6a25}
.abh-apex{width:26px;height:26px;border-radius:50%;border:1px solid rgba(143,106,37,.45);display:flex;align-items:center;justify-content:center;color:#8f6a25;font-size:13px}
.abh-psub{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.24em;text-transform:uppercase;font-weight:500;margin:18px 0 8px;color:#8f6a25}
.abh-ptitle{font-family:'Inter',sans-serif;font-weight:300;font-size:25px;letter-spacing:.01em;line-height:1.1;color:#8f6a25;margin:0;display:flex;align-items:baseline;gap:.25em;flex-wrap:wrap}
.abh-pline{height:1px;background:rgba(20,20,25,.14);margin:16px 0}
.abh-blurb{color:#1a1b1e;font-size:13px;line-height:1.6;margin:0;flex:1}
.abh-pow{margin-top:auto;display:flex;flex-direction:column;gap:8px;padding-top:18px}
.abh-pow .k{color:#83868e;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.26em;text-transform:uppercase}
.abh-enter{margin-top:22px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#1a1b1e}
`
  const RING: Record<Group, { ring: string; glow: string }> = {
    '7even': { ring: '#d6b36a', glow: 'rgba(214,179,106,.3)' },
    'haavn': { ring: '#d6b36a', glow: 'rgba(214,179,106,.3)' },
  }
  return (
    <div className="abh-wrap agw">
      <style>{CSS}</style>
      <video className="abh-bg" autoPlay muted loop playsInline preload="auto" src="/haavn-black-bg.mp4" />
      <div className="abh-scrim" />

      <div className="abh-head">
        <button className="abh-mbtn" onClick={onBack} title="Back to ATRIUM" aria-label="Back to ATRIUM">
          <svg className="halo" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" transform="rotate(-90 50 50)" /></svg>
          <svg viewBox="0 0 240 240" width="17" height="17"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="9" strokeLinejoin="miter" strokeLinecap="butt" /></svg>
        </button>
        <div className="abh-brand">
          <div className="wm"><span className="a"><svg viewBox="75 64 90 112"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" strokeLinecap="butt" /></svg></span>TRIUM</div>
          <span className="tag">Accounts hub</span>
        </div>
        <GatewaySeg />
      </div>

      <div className="abh-in">
      <div className="abh-eyebrow">Accounts · two sets of books</div>
      <h1 className="abh-title">Accounts hub</h1>
      <p className="abh-sub">Choose a set of books — 7EVEN Capital and HAAVN are kept separate.</p>
      <div className="abh-rule" />
      <div className="abh-grid">
        {BOOKS.map((b, i) => (
          <div key={b.id} className={`abh-ledbox${i === 1 ? ' d2' : ''}`}
            style={{ ['--ring' as any]: RING[b.id].ring, ['--ringGlow' as any]: RING[b.id].glow }}>
            <button className="abh-card" onClick={() => setGroup(b.id)}>
              <div className="abh-prow">
                <span className="abh-num" style={{ color: b.color }}>{b.num}</span>
                <span className="abh-apex" style={{ color: b.color }}><svg viewBox="0 0 240 240" width="11" height="11"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="16" strokeLinejoin="miter" strokeLinecap="butt" /></svg></span>
              </div>
              <div>
                <p className="abh-psub" style={{ color: b.color }}>{b.sub}</p>
                <h2 className="abh-ptitle">
                  {b.id === '7even' ? (
                    <>
                      <img src="/seven-mark-black-hd.png" alt="7EVEN" style={{ height: '0.82em', width: 'auto' }} />
                      <span>Capital Administration</span>
                    </>
                  ) : (
                    b.title
                  )}
                </h2>
              </div>
              <div className="abh-pline" />
              <p className="abh-blurb">{b.blurb}</p>
              <div className="abh-pow">
                <span className="k">Powered by</span>
                <img src="/xero-logo.png" alt="Xero" draggable={false}
                  style={{ width: 86, height: 'auto', opacity: 0.92, filter: 'drop-shadow(0 0 12px rgba(19,181,234,0.25))' }} />
              </div>
              <span className="abh-enter">Enter books &#8594;</span>
            </button>
          </div>
        ))}
      </div>
      </div>

      <RefreshButton size={48} className="hub-rb" />
      <button className="abh-logout" aria-label="Log Out" onClick={onLogout}>LOG<span className="ring-o" aria-hidden="true" /></button>
    </div>
  )
}
