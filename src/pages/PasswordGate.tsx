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
// 7X login. The HAAVN BLACK animation behind the overlap 7X in bone, "By
// design." in gold, rounded soft-white controls. After the access code the
// screen stays put and offers the three companies; each goes straight in.
// Auth logic unchanged.
// ─────────────────────────────────────────────────────────────────────────────
export type Company = '7even' | 'haavn' | 'black'

const CSS = `
.pg-root{position:fixed;inset:0;background:#0B0D0F;color:#F3F2EE;overflow:hidden;font-family:'Inter',system-ui,sans-serif}
.pg-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pg-scrim{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 40%,rgba(11,13,15,.1),rgba(11,13,15,.55) 80%)}
.pg-stage{position:relative;z-index:5;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 24px 56px}
.pg-lock{width:min(58vw,560px);filter:drop-shadow(0 0 26px rgba(243,242,238,.22))}
.pg-lock svg{width:100%;height:auto;display:block}
.pg-by{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(26px,3.4vw,40px);color:#d6b36a;margin:6px 0 0;letter-spacing:.02em;text-shadow:0 0 22px rgba(214,179,106,.35)}
.pg-tag{font:400 10px 'JetBrains Mono',monospace;letter-spacing:.34em;color:rgba(243,242,238,.62);margin:14px 0 0;text-align:center}
.pg-panel{margin-top:calc(44px + 1.5cm);width:min(270px,100%);min-height:150px;position:relative}
.pg-view{position:absolute;inset:0 0 auto 0;display:flex;flex-direction:column;gap:14px;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .6s,transform .6s}
.pg-view.on{opacity:1;transform:none;pointer-events:auto}
.pg-view.shake{animation:pg-shake .4s ease}
@keyframes pg-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.pg-lbl{font:500 10px Inter,system-ui,sans-serif;letter-spacing:.3em;color:rgba(243,242,238,.6);text-align:center}
.pg-field{position:relative}
.pg-inp{width:100%;height:46px;border-radius:999px;border:1px solid rgba(243,242,238,.3);background:rgba(11,13,15,.45);color:#F3F2EE;font:400 14px Inter,system-ui,sans-serif;letter-spacing:.24em;padding:0 76px 0 24px;outline:none;transition:border-color .3s,box-shadow .3s;box-sizing:border-box}
.pg-inp::placeholder{color:rgba(243,242,238,.35)}
.pg-inp:focus{border-color:rgba(243,242,238,.85);box-shadow:0 0 0 1px rgba(243,242,238,.4),0 0 26px rgba(243,242,238,.22)}
.pg-inp.err{border-color:#e0645c}
.pg-inp:-webkit-autofill{-webkit-text-fill-color:#F3F2EE;transition:background-color 600000s 0s}
.pg-show{position:absolute;right:8px;top:5px;height:36px;padding:0 14px;border-radius:999px;border:0;background:transparent;color:rgba(243,242,238,.6);font:500 10px Inter,system-ui,sans-serif;letter-spacing:.2em;cursor:pointer;text-transform:uppercase}
.pg-btn{height:44px;border-radius:999px;border:1px solid rgba(243,242,238,.3);background:rgba(11,13,15,.5);color:#F3F2EE;font:500 12px Inter,system-ui,sans-serif;letter-spacing:.3em;padding-left:.3em;cursor:pointer;transition:border-color .3s,box-shadow .3s,background .3s;width:100%;display:flex;align-items:center;justify-content:center;gap:14px}
.pg-btn:hover{border-color:rgba(243,242,238,.85);box-shadow:0 0 26px rgba(243,242,238,.28);background:rgba(243,242,238,.08)}
.pg-btn.go{border-color:rgba(243,242,238,.6);box-shadow:0 0 22px rgba(243,242,238,.16)}
.pg-x7{height:13px;width:auto;display:block}
.pg-err{color:#e0645c;font:400 10px 'JetBrains Mono',monospace;letter-spacing:.16em;text-align:center;min-height:12px}
.pg-co{display:grid;gap:12px}
.pg-foot{position:absolute;left:0;right:0;bottom:0;z-index:30;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:rgba(11,13,15,.72);font:400 10px 'JetBrains Mono',monospace;letter-spacing:.22em;color:rgba(243,242,238,.6)}
.pg-foot b{font-weight:400;color:#F3F2EE}
.pg-live i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#2fe07a;margin-right:8px;box-shadow:0 0 8px #2fe07a}
.pg-chips{display:flex;gap:8px;align-items:center}
.pg-chip{border:1px solid rgba(243,242,238,.28);border-radius:999px;padding:8px 14px;color:inherit;text-decoration:none;transition:.3s}
.pg-chip:hover{border-color:rgba(243,242,238,.8);color:#fff}
@media(max-width:600px){.pg-lock{width:78vw}.pg-chips{display:none}.pg-foot{justify-content:center}}
`

function GateClock() {
  const [now, setNow] = useState('--:--:--')
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('en-AU', { hour12: false, timeZone: 'Australia/Melbourne' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <b>{now}</b>
}

/* the overlap 7X: 7's leg is cut where the X crosses it */
function SevenX({ className }: { className?: string }) {
  return (
    <svg className={className} role="img" aria-label="7X" viewBox="-6 -6 202 101">
      <defs>
        <mask id="pg7" maskUnits="userSpaceOnUse" x="-30" y="-30" width="160" height="160"><rect x="-30" y="-30" width="160" height="160" fill="#fff" /><rect x="-5.5" y="-5.5" width="97" height="20" fill="#000" /></mask>
        <mask id="pgx" maskUnits="userSpaceOnUse" x="-30" y="-30" width="160" height="160"><rect x="-30" y="-30" width="160" height="160" fill="#fff" /><polygon points="0,0 11.45,0 81.45,89 70,89" fill="#000" stroke="#000" strokeWidth="11" strokeLinejoin="miter" /></mask>
      </defs>
      <g fill="#F3F2EE">
        <g mask="url(#pg7)"><polygon points="74.55,0 86,0 16,89 4.55,89" /></g>
        <polygon points="0,0 86,0 86,9 0,9" />
        <g transform="translate(112 0)"><g mask="url(#pgx)"><polygon points="70,0 81.45,0 11.45,89 0,89" /></g><polygon points="0,0 11.45,0 81.45,89 70,89" /></g>
      </g>
    </svg>
  )
}

export default function PasswordGate({ onAuth, onChoose, chooser }: { onAuth: () => void; onChoose?: (c: Company) => void; chooser?: boolean }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [show, setShow] = useState(false)
  const [stage, setStage] = useState<'login' | 'co'>(chooser ? 'co' : 'login')

  function attempt() {
    if (value === CORRECT) {
      markAuthenticated()
      setStoredRole('admin')
      setStage('co') // stay on the screen and offer the three companies
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

  function choose(c: Company) {
    if (!chooser) onAuth()
    onChoose?.(c)
  }

  return (
    <div className="pg-root">
      <style>{CSS}</style>
      <video className="pg-bg" autoPlay muted loop playsInline preload="auto" poster="/haavn-black-bg-poster.jpg" src="/haavn-black-bg.mp4" />
      <div className="pg-scrim" />

      <div className="pg-stage">
        <div className="pg-lock"><SevenX /></div>
        <p className="pg-by">By design.</p>
        <p className="pg-tag">ENGINE &nbsp;|&nbsp; PRECISION &nbsp;|&nbsp; INTELLIGENCE</p>

        <div className="pg-panel">
          <div className={`pg-view${stage === 'login' ? ' on' : ''}${shake ? ' shake' : ''}`}>
            <div className="pg-lbl">PRIVATE ACCESS</div>
            <div className="pg-field">
              <input
                id="pg-code"
                className={`pg-inp${error ? ' err' : ''}`}
                type={show ? 'text' : 'password'}
                autoFocus
                value={value}
                onChange={e => { setValue(e.target.value); setError(false) }}
                onKeyDown={e => e.key === 'Enter' && attempt()}
                placeholder="ACCESS CODE"
                autoComplete="off"
                tabIndex={stage === 'login' ? 0 : -1}
              />
              <button className="pg-show" type="button" onClick={() => setShow(s => !s)}>{show ? 'hide' : 'show'}</button>
            </div>
            <div className="pg-err">{error ? 'INCORRECT ACCESS CODE' : ''}</div>
            <button className="pg-btn go" type="button" onClick={attempt}>ENTER <SevenX className="pg-x7" /></button>
          </div>

          <div className={`pg-view${stage === 'co' ? ' on' : ''}`}>
            <div className="pg-lbl">CHOOSE YOUR COMPANY</div>
            <div className="pg-co">
              <button className="pg-btn" type="button" tabIndex={stage === 'co' ? 0 : -1} onClick={() => choose('7even')}>7EVEN</button>
              <button className="pg-btn" type="button" tabIndex={stage === 'co' ? 0 : -1} onClick={() => choose('haavn')}>HAAVN</button>
              <button className="pg-btn" type="button" tabIndex={stage === 'co' ? 0 : -1} onClick={() => choose('black')}>HAAVN BLACK</button>
            </div>
          </div>
        </div>
      </div>

      <div className="pg-foot">
        <span><b>7X</b></span>
        <span className="pg-live"><i />LIVE&nbsp;&nbsp;<GateClock />&nbsp;&nbsp;MELBOURNE</span>
        <span className="pg-chips">
          <InstallButton compact />
          <a className="pg-chip" href="https://7even.au" target="_blank" rel="noopener noreferrer">7EVEN.AU</a>
          <a className="pg-chip" href="https://www.haavn.au" target="_blank" rel="noopener noreferrer">HAAVN.AU</a>
        </span>
      </div>
    </div>
  )
}
