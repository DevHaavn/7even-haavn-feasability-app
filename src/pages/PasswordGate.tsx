import React, { useEffect, useState } from 'react'
import InstallButton from '../components/InstallButton'
import { setStoredRole, EXTERNAL_PASSWORD, HOMES_PASSWORD } from '../lib/role'

const CORRECT = '7Evenhaavn!!!'
const STORAGE_KEY = '7even_auth'

// Sessions expire after this long, forcing re-entry of the access code.
// Protects shared/public computers where the login flag would otherwise persist forever.
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000 // 12 hours

export function isAuthenticated(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return false
  // New format: timestamp of last successful login. Expire after SESSION_MAX_AGE_MS.
  const ts = Number(raw)
  if (!Number.isFinite(ts) || ts <= 0) {
    // Legacy value (e.g. old 'true') — treat as expired so the gate reappears.
    localStorage.removeItem(STORAGE_KEY)
    return false
  }
  if (Date.now() - ts > SESSION_MAX_AGE_MS) {
    localStorage.removeItem(STORAGE_KEY)
    return false
  }
  return true
}

function markAuthenticated() {
  localStorage.setItem(STORAGE_KEY, String(Date.now()))
}

// ─────────────────────────────────────────────────────────────────────────────
// ATRIUM login — new design language (from atrium-login-preview.html):
// HAAVN BLACK video field, deep-purple 3D extruded 7EVEN that ignites from
// nothing then spins upright, boxless access form floating on the render,
// one-line footer. Auth logic unchanged.
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
.pg-root{position:fixed;inset:0;background:#040404;color:#e8e9eb;overflow:hidden;
  font-family:'Inter',system-ui,sans-serif}
.pg-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pg-scrim{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(4,4,4,.72),rgba(4,4,4,.5) 44%,rgba(4,4,4,.88))}
.pg-stage{position:relative;z-index:5;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px 90px}

/* 7EVEN in LED purple — true 3D: extruded glyph stack, ignition, slow clockwise spin.
   Filters flatten preserve-3d, so the glow is its own element and the brightness
   ramp lives on the leaf layers. */
.pg-persp{perspective:1000px;position:relative;width:clamp(240px,32vw,460px);aspect-ratio:1800/280;
  opacity:0;animation:pg-ignite 7.2s ease-out forwards}
@keyframes pg-ignite{0%{opacity:0}35%{opacity:.3}100%{opacity:1}}
.pg-glow{position:absolute;inset:-46% -14%;pointer-events:none;border-radius:50%;
  background:radial-gradient(50% 50% at 50% 50%,rgba(122,59,240,.4),rgba(122,59,240,.14) 55%,transparent 75%);
  filter:blur(14px);animation:pg-gpulse 6.5s ease-in-out 7.2s infinite}
@keyframes pg-gpulse{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:1;transform:scale(1.07)}}
.pg-spin{position:absolute;inset:0;transform-style:preserve-3d;animation:pg-spin7 16s linear 7.2s infinite}
@keyframes pg-spin7{from{transform:rotateY(0deg)}to{transform:rotateY(360deg)}}
.pg-stack{position:absolute;inset:0;transform-style:preserve-3d}
.pg-stack i{position:absolute;inset:0;display:block;
  -webkit-mask:url('/seven-mark-white-hd.png') center / contain no-repeat;
  mask:url('/seven-mark-white-hd.png') center / contain no-repeat;
  background:#341070;backface-visibility:hidden;
  animation:pg-idim 7.2s ease-out forwards}
@keyframes pg-idim{0%{filter:brightness(0)}40%{filter:brightness(.18)}100%{filter:brightness(.65)}}
.pg-stack i.face{transform:translateZ(1.5px);backface-visibility:hidden;
  background:linear-gradient(180deg,#7a3bf0,#6a2fd6 55%,#5522b8)}
/* pre-mirrored back face — the wordmark reads correctly from behind mid-spin */
.pg-stack i.fback{transform:translateZ(-18px) rotateY(180deg)}
@media(prefers-reduced-motion:reduce){
  .pg-persp{animation:none;opacity:1}
  .pg-spin{animation:none}
  .pg-stack i{animation:none;filter:brightness(.65)}
  .pg-glow{animation:none}}

.pg-welcome{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:8px;letter-spacing:.46em;text-transform:uppercase;color:#9d96ab;margin-top:20px;text-align:center;
  opacity:0;animation:pg-wfade 2.6s ease-out 4.4s forwards}
@keyframes pg-wfade{to{opacity:1}}

/* boxless access form — floats clear over the render */
.pg-card{margin-top:52px;width:min(360px,90vw)}
.pg-card.shake{animation:pg-shake .4s ease}
@keyframes pg-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.pg-pa{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:#b9a4e8;text-align:center;margin:0 0 26px}
.pg-lbl{display:block;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.26em;text-transform:uppercase;color:#aab0b6;margin-bottom:10px}
.pg-inwrap{position:relative}
.pg-inp{width:100%;background:transparent;border:none;border-bottom:1px solid rgba(220,232,244,.3);color:#fff;
  font-family:'JetBrains Mono',monospace;font-size:18px;letter-spacing:.4em;padding:8px 52px 10px 2px;outline:none;transition:.3s;box-sizing:border-box}
.pg-inp::placeholder{color:rgba(255,255,255,.25);letter-spacing:.3em}
.pg-inp:focus{border-bottom-color:#a86bff;box-shadow:0 1px 0 0 rgba(168,107,255,.45)}
.pg-inp.err{border-bottom-color:#e0645c}
.pg-show{position:absolute;right:0;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#aab0b6;
  font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:4px}
.pg-enter{margin-top:26px;width:100%;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;
  font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#d6d9dd;
  background:transparent;border:1px solid rgba(255,255,255,.28);border-radius:2px;padding:13px 0;transition:.35s}
.pg-enter:hover{border-color:rgba(168,107,255,.75);color:#fff;background:rgba(168,107,255,.07);box-shadow:0 0 28px -10px rgba(168,107,255,.65)}
.pg-enter .tri{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:6.5px solid #a86bff}
.pg-err{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#e0645c;margin-top:12px;text-align:center}

/* fixed one-line footer — same as main app */
.pg-foot{position:absolute;left:0;right:0;bottom:0;z-index:30;background:linear-gradient(180deg,rgba(6,7,8,.92),#050607);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);padding:0 clamp(18px,3.4vw,46px)}
.pg-hair{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16) 12%,rgba(255,255,255,.16) 88%,transparent)}
.pg-frail{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:12px 2px 14px;white-space:nowrap}
.pg-fl{display:flex;align-items:center;gap:14px}
.pg-atr{display:flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.34em;color:#c3c7cd}
.pg-tri2{width:0;height:0;border-left:4.5px solid transparent;border-right:4.5px solid transparent;border-bottom:7px solid rgba(255,255,255,.55);transform:translateY(-1px)}
.pg-fc{display:flex;align-items:center;gap:9px;justify-self:center;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.22em;color:#a9a6a9}
.pg-livedot{width:6px;height:6px;border-radius:50%;background:#2fe07a;box-shadow:0 0 10px #2fe07a;animation:pg-pulse 2.4s infinite}
@keyframes pg-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.pg-clock{color:#e8e6e8;font-size:12px;letter-spacing:.12em;font-family:'JetBrains Mono',monospace}
.pg-fr{display:flex;align-items:center;gap:8px;justify-self:end}
.pg-chip{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:2px;border:1px solid rgba(255,255,255,.28);background:transparent;
  font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.22em;color:#b9bdc4;cursor:pointer;transition:.35s;text-transform:uppercase;text-decoration:none}
.pg-chip:hover{border-color:rgba(168,107,255,.7);color:#fff;transform:translateY(-2px);background:rgba(168,107,255,.06)}
.pg-chip .ext{color:#a86bff;opacity:.9;font-size:9px}
@media(max-width:760px){.pg-frail{grid-template-columns:1fr auto}.pg-fc{display:none}}
`

const DEPTHS = Array.from({ length: 11 }, (_, i) => (11 - i) * 1.5)

function GateClock() {
  const [now, setNow] = useState('--:--:--')
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('en-AU', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="pg-clock">{now}</span>
}

export default function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [show, setShow] = useState(false)

  function attempt() {
    if (value === CORRECT) {
      markAuthenticated()
      setStoredRole('admin')
      onAuth()
    } else if (value === EXTERNAL_PASSWORD) {
      markAuthenticated()
      setStoredRole('external')
      onAuth()
    } else if (value === HOMES_PASSWORD) {
      // HAAVN HOMES builder (Jeffrey Witbreuk + team) — homes studio + HM CRM only.
      markAuthenticated()
      setStoredRole('homes')
      onAuth()
    } else {
      setError(true)
      setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="pg-root">
      <style>{CSS}</style>
      <video className="pg-bg" autoPlay muted loop playsInline preload="auto" src="/haavn-black-bg.mp4" />
      <div className="pg-scrim" />

      <div className="pg-stage">
        {/* deep-purple 3D 7EVEN — ignites, then spins upright */}
        <div className="pg-persp">
          <div className="pg-glow" />
          <div className="pg-spin">
            <div className="pg-stack">
              {DEPTHS.map(d => <i key={`f${d}`} style={{ transform: `translateZ(-${d}px)` }} />)}
              {DEPTHS.map(d => <i key={`b${d}`} style={{ transform: `translateZ(-${d}px) rotateY(180deg)` }} />)}
              <i className="face" />
              <i className="face fback" />
            </div>
          </div>
        </div>
        <div className="pg-welcome">Welcome to Precision Feasibility&nbsp;&nbsp;·&nbsp;&nbsp;By Invitation</div>

        {/* boxless access form */}
        <div className={`pg-card${shake ? ' shake' : ''}`}>
          <p className="pg-pa">Private Access</p>
          <label className="pg-lbl" htmlFor="pg-code">Access Code</label>
          <div className="pg-inwrap">
            <input
              id="pg-code"
              className={`pg-inp${error ? ' err' : ''}`}
              type={show ? 'text' : 'password'}
              autoFocus
              value={value}
              onChange={e => { setValue(e.target.value); setError(false) }}
              onKeyDown={e => e.key === 'Enter' && attempt()}
              placeholder="········"
              autoComplete="off"
            />
            <button className="pg-show" onClick={() => setShow(s => !s)}>{show ? 'hide' : 'show'}</button>
          </div>
          <button className="pg-enter" onClick={attempt}><span className="tri" />Enter Atrium</button>
          {error && <p className="pg-err">Incorrect access code — try again</p>}
        </div>
      </div>

      {/* one-line footer */}
      <div className="pg-foot">
        <div className="pg-hair" />
        <div className="pg-frail">
          <div className="pg-fl"><span className="pg-atr"><span className="pg-tri2" />ATRIUM</span></div>
          <div className="pg-fc"><span className="pg-livedot" />LIVE&nbsp;&nbsp;<GateClock />&nbsp;·&nbsp;MELBOURNE</div>
          <div className="pg-fr">
            <InstallButton compact />
            <a className="pg-chip" href="https://7even.au" target="_blank" rel="noopener noreferrer">7EVEN.AU <span className="ext">↗</span></a>
            <a className="pg-chip" href="https://www.haavn.au" target="_blank" rel="noopener noreferrer">HAAVN.AU <span className="ext">↗</span></a>
          </div>
        </div>
      </div>
    </div>
  )
}
