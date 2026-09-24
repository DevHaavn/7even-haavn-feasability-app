import React, { useEffect, useState } from 'react'
import InstallButton from '../components/InstallButton'
import { setStoredRole, EXTERNAL_PASSWORD, HOMES_PASSWORD } from '../lib/role'

const CORRECT = '7Evenhaavn!!!'
const STORAGE_KEY = '7even_auth'
// The 7X access code is kept as a SHA-256 hash so the code itself doesn't ship in the bundle.
const APP_CODE_HASH = '7231733393d8f8dda3517c145a78770e3c9a1b9274968524ac440e4b51a2293b'
async function sha256(t: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
}

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
.pg-stage{--w:min(39.3vw,379px);--cy:max(calc(50% - 2in),calc(var(--w)*.2538 + 24px))}
.pg-lock{width:var(--w);position:fixed;left:50%;top:var(--cy);transform:translate(-50%,-50%)}
.pg-under{position:fixed;left:0;right:0;top:calc(var(--cy) + var(--w)*.2538 + 16px);display:flex;flex-direction:column;align-items:center;padding:0 24px}
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

.pg-lock svg{overflow:visible}
.pg-a7leg{opacity:0;animation:pgFade 2.2s ease .3s forwards}
.pg-afwd{opacity:0;animation:pgFade 2.2s ease .3s forwards}
.pg-a7bar{opacity:0;animation:pgSlideR 1.7s cubic-bezier(.16,.8,.2,1) 3s forwards}
.pg-aback{opacity:0;animation:pgSlideIn 1.7s cubic-bezier(.16,.8,.2,1) 3s forwards}
.pg-asheen{opacity:0;animation:pgFade 1s ease 5.6s forwards}
.pg-halo,.pg-halo7{opacity:0;animation:pgHaloIn 1.8s ease 4.8s forwards,pgBreathe 4.6s ease-in-out 6.8s infinite}
.pg-halo7{animation-name:pgHaloIn7,pgBreathe7}
.pg-still .pg-a7leg,.pg-still .pg-afwd,.pg-still .pg-a7bar,.pg-still .pg-aback,.pg-still .pg-asheen{animation:none;opacity:1;transform:none}
.pg-still .pg-halo{animation:pgBreathe 4.6s ease-in-out infinite;opacity:.55}
.pg-still .pg-halo7{animation:pgBreathe7 4.6s ease-in-out infinite;opacity:.4}
@keyframes pgFade{to{opacity:1}}
@keyframes pgSlideIn{0%{opacity:0;transform:translate(-170px,-216px)}12%{opacity:1}100%{opacity:1;transform:none}}
@keyframes pgSlideR{0%{opacity:0;transform:translateX(-240px)}12%{opacity:1}100%{opacity:1;transform:none}}
@keyframes pgHaloIn{to{opacity:.55}}
@keyframes pgBreathe{0%,100%{opacity:.35}50%{opacity:.8}}
@keyframes pgHaloIn7{to{opacity:.4}}
@keyframes pgBreathe7{0%,100%{opacity:.25}50%{opacity:.55}}
@media(max-width:600px){.pg-stage{--w:52vw}.pg-chips{display:none}.pg-foot{justify-content:center}}
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
    <svg className={className} role="img" aria-label="7X" viewBox="-6 -6 199 101">
      <defs>
        <mask id="pgx" maskUnits="userSpaceOnUse" x="-30" y="-30" width="160" height="160"><rect x="-30" y="-30" width="160" height="160" fill="#fff" /><polygon points="0,0 11.45,0 81.45,89 70,89" fill="#000" stroke="#000" strokeWidth="11" strokeLinejoin="miter" /></mask>
      </defs>
      <g fill="#F3F2EE">
        <polygon points="0,0 94,0 87.31,8.5 0,8.5" />
        <polygon points="74.6,14.5 59.1,14.5 16,89" />
        <g transform="translate(109 0)"><g mask="url(#pgx)"><polygon points="70,0 81.45,0 11.45,89 0,89" /></g><polygon points="0,0 11.45,0 81.45,89 70,89" /></g>
      </g>
    </svg>
  )
}


/* the login hero: the 7 and a foil-gold X, built up in sequence */
function SevenXHero() {
  const back = '0,0 11.45,0 81.45,89 70,89'
  const fwd = '70,0 81.45,0 11.45,89 0,89'
  return (
    <svg role="img" aria-label="7X" viewBox="-6 -6 199 101" overflow="visible">
      <defs>
        <mask id="hhx" maskUnits="userSpaceOnUse" x="-30" y="-30" width="160" height="160"><rect x="-30" y="-30" width="160" height="160" fill="#fff" /><polygon points={back} fill="#000" stroke="#000" strokeWidth="11" strokeLinejoin="miter" /></mask>
        <linearGradient id="hhsheen" gradientUnits="userSpaceOnUse" x1="-90" y1="0" x2="-10" y2="89">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".42" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fffdf2" stopOpacity=".95" /><stop offset=".58" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          <animateTransform attributeName="gradientTransform" type="translate" values="0 0; 210 0" dur="11s" begin="5.6s" repeatCount="indefinite" calcMode="spline" keySplines=".4 0 .2 1" keyTimes="0;1" />
        </linearGradient>
        <linearGradient id="hhfoil" gradientUnits="userSpaceOnUse" x1="4" y1="0" x2="80" y2="89">
          <stop offset="0" stopColor="#8f6a25" /><stop offset=".14" stopColor="#e9d08f" /><stop offset=".26" stopColor="#fff3cf" />
          <stop offset=".38" stopColor="#c79b45" /><stop offset=".5" stopColor="#7d5a1c" /><stop offset=".6" stopColor="#d9b566" />
          <stop offset=".74" stopColor="#fff0c4" /><stop offset=".86" stopColor="#c9993f" /><stop offset="1" stopColor="#96702a" />
        </linearGradient>
        <linearGradient id="hhgloss" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="89">
          <stop offset="0" stopColor="#fff" stopOpacity=".62" /><stop offset=".47" stopColor="#fff" stopOpacity=".08" />
          <stop offset=".5" stopColor="#000" stopOpacity=".16" /><stop offset="1" stopColor="#fff" stopOpacity=".22" />
        </linearGradient>
        <filter id="hhblur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" /></filter>
        <g id="hhgx"><g mask="url(#hhx)"><polygon points={fwd} /></g><polygon points={back} /></g>
      </defs>
      <g className="pg-halo7" fill="#F3F2EE" filter="url(#hhblur)"><polygon points="0,0 94,0 87.31,8.5 0,8.5" /><polygon points="74.6,14.5 59.1,14.5 16,89" /></g>
      <g fill="#F3F2EE">
        <polygon className="pg-a7leg" points="74.6,14.5 59.1,14.5 16,89" />
        <polygon className="pg-a7bar" points="0,0 94,0 87.31,8.5 0,8.5" />
      </g>
      <g transform="translate(109 0)">
        <use href="#hhgx" className="pg-halo" fill="#d6b36a" filter="url(#hhblur)" />
        <g className="pg-afwd">
          <g fill="url(#hhfoil)"><g mask="url(#hhx)"><polygon points={fwd} /></g></g>
          <g fill="url(#hhgloss)"><g mask="url(#hhx)"><polygon points={fwd} /></g></g>
          <g className="pg-asheen" fill="url(#hhsheen)"><g mask="url(#hhx)"><polygon points={fwd} /></g></g>
        </g>
        <g className="pg-aback">
          <polygon fill="url(#hhfoil)" points={back} />
          <polygon fill="url(#hhgloss)" points={back} />
          <polygon className="pg-asheen" fill="url(#hhsheen)" points={back} />
        </g>
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

  async function attempt() {
    const isAppCode = (await sha256(value)) === APP_CODE_HASH
    if (value === CORRECT || isAppCode) {
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
    <div className={`pg-root${chooser ? ' pg-still' : ''}`}>
      <style>{CSS}</style>
      <video className="pg-bg" autoPlay muted loop playsInline preload="auto" poster="/haavn-black-bg-poster.jpg" src="/haavn-black-bg.mp4" />
      <div className="pg-scrim" />

      <div className="pg-stage">
        <div className="pg-lock"><SevenXHero /></div>
        <div className="pg-under">
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
