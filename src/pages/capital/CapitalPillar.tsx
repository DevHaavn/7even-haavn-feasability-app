import React, { useEffect, useState } from 'react'
import type { Pillar } from './CapitalBase'
import BudgetsAdminBase from './BudgetsAdminBase'
import { useOpenStudioBridge } from '../../lib/useOpenStudioBridge'
import { useScrollLock } from '../../lib/useScrollLock'

// Pillar 02 (Management System) now runs the exact ATRIUM Workflow tool —
// same CRM pipeline + meetings/agenda as HAAVN Management Hub pillar 01 —
// but it holds live buyer/partner data, so only the 7EVEN team gets in.
const CRM_ALLOWED_EMAILS = ['jamie@7even.au', 'daniel@7even.au', 'lewis@7even.au', 'accounts@7even.au', 'reception@7even.au']
const CRM_AUTH_KEY = 'capital_crm_email'

const GATE_CSS = `
.ceg-wrap{position:fixed;inset:0;z-index:500;overflow:hidden;display:flex;flex-direction:column;background:#787675;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.ceg-bg{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;
  filter:invert(1) brightness(.73) contrast(.82) saturate(.12) sepia(.05)}
.ceg-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.27),rgba(255,255,255,.15) 42%,rgba(255,255,255,.34))}
.ceg-head{position:relative;z-index:2;display:flex;align-items:center;gap:16px;padding:20px 32px;border-bottom:1px solid rgba(20,20,25,.10);flex-shrink:0;flex-wrap:wrap;row-gap:10px}
.ceg-mbtn{position:relative;width:38px;height:38px;flex:none;border-radius:50%;border:1px solid rgba(20,20,25,.30);
  background:transparent;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;color:#1a1b1e;
  transition:border-color .3s cubic-bezier(.16,1,.3,1),box-shadow .3s cubic-bezier(.16,1,.3,1),background .3s cubic-bezier(.16,1,.3,1)}
.ceg-mbtn:hover{border-color:#d6b36a;box-shadow:0 0 22px rgba(214,179,106,.18);background:rgba(214,179,106,.08)}
.ceg-mbtn:active{transform:scale(.94)}
.ceg-mbtn .halo{position:absolute;inset:-1px;border-radius:50%;pointer-events:none}
.ceg-mbtn .halo circle{fill:none;stroke:#d6b36a;stroke-width:1.2;opacity:0;stroke-dasharray:302}
.ceg-mbtn:hover .halo circle{opacity:.9;animation:ceg-ringdraw .8s cubic-bezier(.16,1,.3,1) both}
@keyframes ceg-ringdraw{from{stroke-dashoffset:302}to{stroke-dashoffset:0}}
.ceg-brand{margin-left:auto;display:flex;align-items:center;gap:12px}
.ceg-brand .wm{display:flex;align-items:center;font:100 16px/1 'Inter',sans-serif;letter-spacing:.3em;padding-left:.3em;color:#1a1b1e}
.ceg-brand .wm .a{display:block;width:.62em;height:.7em;margin-right:.3em;flex:none}
.ceg-brand .wm .a svg{display:block;width:100%;height:100%;overflow:visible}
.ceg-brand .tag{font-family:'JetBrains Mono',monospace;font-weight:500;font-size:10px;letter-spacing:.24em;color:#83868e;white-space:nowrap;
  border-left:1px solid rgba(20,20,25,.16);padding-left:12px;text-transform:uppercase}
.ceg-body{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;gap:22px}
.ceg-eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#8f6a25;font-weight:500;text-align:center}
.ceg-form{display:flex;flex-direction:column;gap:12px;width:100%;max-width:320px}
.ceg-form input{padding:13px 16px;border-radius:10px;border:1px solid rgba(20,20,25,.24);background:rgba(255,255,255,.55);color:#1a1b1e;font-size:14px;outline:none;font-family:inherit}
.ceg-form input:focus{border-color:#d6b36a}
.ceg-err{color:#c0392b;font-size:11px;text-align:center}
.ceg-submit{padding:13px 16px;border-radius:999px;border:1px solid rgba(143,106,37,.4);background:rgba(143,106,37,.1);color:#8f6a25;font-weight:700;letter-spacing:.1em;font-size:11px;text-transform:uppercase;cursor:pointer;transition:.3s;font-family:'JetBrains Mono',monospace}
.ceg-submit:hover{border-color:#8f6a25;background:rgba(143,106,37,.18)}
.ceg-logout{position:fixed;bottom:18px;left:20px;z-index:30;width:48px;height:48px;flex-shrink:0;border-radius:999px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:0;font-size:7.5px;letter-spacing:.16em;
  cursor:pointer;color:#1a1b1e;border:1px solid rgba(20,20,25,.24);background:rgba(255,255,255,.55);font-family:'JetBrains Mono',monospace;transition:.3s}
.ceg-logout:hover{border-color:rgba(224,100,92,.7);color:#c0392b;background:rgba(224,100,92,.08)}
.ceg-update{position:fixed;bottom:18px;right:20px;z-index:30;display:flex;align-items:center;gap:7px;height:38px;padding:0 16px;border-radius:999px;
  cursor:pointer;color:#1a1b1e;border:1px solid rgba(20,20,25,.24);background:rgba(255,255,255,.55);font-family:'JetBrains Mono',monospace;
  font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;transition:.3s}
.ceg-update:hover{border-color:rgba(143,106,37,.7);color:#8f6a25;background:rgba(143,106,37,.08)}
.ceg-logout .ring-o,.ceg-update .ring-o{width:11px;height:11px;border-radius:50%;border:1.6px solid currentColor;flex-shrink:0}
@media(max-width:600px){
  .ceg-head{padding:16px 18px;padding-top:calc(env(safe-area-inset-top,0px) + 57px);gap:12px}
  .ceg-brand{margin-left:0;width:100%}
  .ceg-brand .tag{display:none}
  .ceg-logout{position:static;margin:12px auto 0;left:auto;bottom:auto}
  .ceg-update{position:static;margin:30px auto 0;right:auto;bottom:auto}
}
`

function CrmEmailGate({ onPass, onBack, onLogout }: { onPass: (email: string) => void; onBack: () => void; onLogout: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (CRM_ALLOWED_EMAILS.includes(v)) {
      try { sessionStorage.setItem(CRM_AUTH_KEY, v) } catch { /* ignore */ }
      onPass(v)
    } else {
      setError("That email isn't on the ATRIUM access list.")
    }
  }
  return (
    <div className="ceg-wrap">
      <style>{GATE_CSS}</style>
      <video className="ceg-bg" autoPlay muted loop playsInline preload="auto" src="/haavn-black-bg.mp4" />
      <div className="ceg-scrim" />

      <div className="ceg-head">
        <button className="ceg-mbtn" onClick={onBack} title="Back to Capital Base" aria-label="Back to Capital Base">
          <svg className="halo" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" transform="rotate(-90 50 50)" /></svg>
          <svg viewBox="0 0 240 240" width="17" height="17"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="9" strokeLinejoin="miter" strokeLinecap="butt" /></svg>
        </button>
        <div className="ceg-brand">
          <div className="wm"><span className="a"><svg viewBox="75 64 90 112"><path d="M79.24 172 L120 68 L160.76 172" fill="none" stroke="currentColor" strokeWidth="8" strokeLinejoin="miter" strokeLinecap="butt" /></svg></span>TRIUM</div>
          <span className="tag">Management System</span>
        </div>
      </div>

      <div className="ceg-body">
        <div className="ceg-eyebrow">7EVEN access only</div>
        <form className="ceg-form" onSubmit={submit}>
          <input type="email" required autoFocus value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="you@7even.au" />
          {error && <span className="ceg-err">{error}</span>}
          <button type="submit" className="ceg-submit">Continue</button>
        </form>
      </div>

      <button className="ceg-update" onClick={() => window.location.reload()} title="Reload to fetch the latest version">
        <span className="ring-o" aria-hidden="true" />Update
      </button>
      <button className="ceg-logout" aria-label="Log Out" onClick={onLogout}>LOG<span className="ring-o" aria-hidden="true" /></button>
    </div>
  )
}

/** Pillar workspace scaffold — each Capital pillar (Budgets, CRM) opens here.
 *  ATRIUM (Partner CRM) exits straight to the studio (never back through
 *  Capital admin) so staff stay sealed off from the other pillars. */
export default function CapitalPillar({ pillar, onBack, onLogout, onExit }: { pillar: Pillar; onBack: () => void; onLogout: () => void; onExit: () => void }) {
  const isCRM = pillar.id === 'crm'
  // Feasibility tab in the embedded Management System can hand off to the studio.
  useOpenStudioBridge(onExit)
  const [crmEmail, setCrmEmail] = useState<string | null>(() => {
    try { return sessionStorage.getItem(CRM_AUTH_KEY) } catch { return null }
  })
  useScrollLock(isCRM && !!crmEmail)
  useEffect(() => {
    if (!isCRM || !crmEmail) return
    const onMsg = (e: MessageEvent) => { if (e.data === 'haavn-workflow-close') onBack() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    window.addEventListener('message', onMsg)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('keydown', onKey) }
  }, [isCRM, crmEmail, onBack])

  // Pillar 02 — the same ATRIUM Workflow tool as Management Hub pillar 01
  // (CRM pipeline + meetings/agenda, all in one), full-bleed. Gated by email
  // since this pillar carries live buyer/partner data.
  if (isCRM) {
    if (!crmEmail) return <CrmEmailGate onPass={setCrmEmail} onBack={onBack} onLogout={onLogout} />
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#eceae4', display: 'flex', flexDirection: 'column', overflow: 'hidden', overscrollBehavior: 'none' }}>
        <iframe title="ATRIUM · Workflow" src="/atrium-workflow.html?v=20261002a" allow="microphone"
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }} />
      </div>
    )
  }

  // Pillar 01 — Budgets / Administration. Owns its own full-bleed ATRIUM
  // chrome (head, Log Out, Update) so there's no second header underneath.
  return <BudgetsAdminBase onBack={onBack} onLogout={onLogout} />
}
