import React, { useEffect, useState } from 'react'
import InstallButton from '../components/InstallButton'
import { setStoredRole, getStoredRole, EXTERNAL_PASSWORD, HOMES_PASSWORD, HAAVN_ONLY_PASSWORD } from '../lib/role'

// Full access to all three companies (7EVEN, HAAVN, HAAVN BLACK) — directors
// and managers. Most of the team is on HAAVN, not 7EVEN, so general staff use
// HAAVN_ONLY_PASSWORD ('Atrium!!!') instead, which the company chooser below
// reflects by hiding the 7EVEN option.
//
// There used to be a second, hidden full-access code here — kept only as a
// SHA-256 hash so the plaintext never shipped in the bundle. Retired: its
// plaintext turned out to be the exact string 'Atrium!!!' now being
// repurposed as the restricted HAAVN-only code above, so leaving it in would
// have silently granted full access to anyone using the new restricted
// password. If a hidden backup admin code is still wanted, it needs a new
// (different) secret string hashed in its place.
const CORRECT = 'Atrium7x!!!'
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
.pg-stage{--cy:max(calc(50% - 1.6in),150px)}
.pg-hero{position:fixed;left:50%;top:var(--cy);transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:20px;width:100%}
.pg-name{display:flex;align-items:center;font:100 clamp(44px,8.2vw,112px)/1 Inter,system-ui,sans-serif;letter-spacing:.34em;padding-left:.34em;color:#F3F2EE;text-shadow:0 0 18px rgba(243,242,238,.22),0 0 60px rgba(243,242,238,.08);opacity:0;animation:pgNameIn 3.2s ease .3s forwards}
.pg-a{position:relative;display:block;width:.66em;height:.74em;margin-right:.34em;flex:none;animation:pgAGapIn 3.2s ease .3s forwards}
.pg-a svg{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 18px rgba(243,242,238,.22)) drop-shadow(0 0 60px rgba(243,242,238,.08))}
@keyframes pgAGapIn{0%{margin-right:.7em}100%{margin-right:.34em}}
.pg-still .pg-a{animation:none;margin-right:.34em}
.pg-byrow{display:flex;align-items:center;gap:16px;opacity:0;animation:pgFade 1.6s ease 2.6s forwards}
.pg-byrow i{font:italic 400 clamp(22px,2.6vw,32px) 'Cormorant Garamond',serif;color:#d6b36a;text-shadow:0 0 22px rgba(214,179,106,.35)}
.pg-byrow svg{height:clamp(38px,4.2vw,54px);width:auto;overflow:visible;display:block}
.pg-under{position:fixed;left:0;right:0;top:calc(var(--cy) + 122px);display:flex;flex-direction:column;align-items:center;padding:0 24px}


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
.pg-x7{height:15px;width:auto;display:block}
.pg-err{color:#e0645c;font:400 10px 'JetBrains Mono',monospace;letter-spacing:.16em;text-align:center;min-height:12px}
.pg-co{display:grid;gap:12px}
.pg-foot{position:absolute;left:0;right:0;bottom:0;z-index:30;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:rgba(11,13,15,.72);font:400 10px 'JetBrains Mono',monospace;letter-spacing:.22em;color:rgba(243,242,238,.6)}
.pg-foot b{font-weight:400;color:#F3F2EE}
.pg-atriummark{width:28px;height:28px;flex-shrink:0;border-radius:999px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(243,242,238,.35);color:#F3F2EE}
.pg-atriummark svg{width:15px;height:15px;display:block}
.pg-live i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#2fe07a;margin-right:8px;box-shadow:0 0 8px #2fe07a}
.pg-chips{display:flex;gap:8px;align-items:center}
.pg-chip{border:1px solid rgba(243,242,238,.28);border-radius:999px;padding:8px 14px;color:inherit;text-decoration:none;transition:.3s}
.pg-chip:hover{border-color:rgba(243,242,238,.8);color:#fff}

.pg-bar-reveal{-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:left top;mask-position:left top;
  -webkit-mask-image:linear-gradient(to right,rgba(0,0,0,1) 0%,rgba(0,0,0,1) 82%,rgba(0,0,0,0) 100%);
  mask-image:linear-gradient(to right,rgba(0,0,0,1) 0%,rgba(0,0,0,1) 82%,rgba(0,0,0,0) 100%);
  -webkit-mask-size:0% 100%;mask-size:0% 100%;
  animation:pgBarReveal 1.2s cubic-bezier(.3,.6,.2,1) .3s both}
@keyframes pgBarReveal{to{-webkit-mask-size:100% 100%;mask-size:100% 100%}}
.pg-x-reveal{-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:left top;mask-position:left top;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,1) 0%,rgba(0,0,0,1) 82%,rgba(0,0,0,0) 100%);
  mask-image:linear-gradient(to bottom,rgba(0,0,0,1) 0%,rgba(0,0,0,1) 82%,rgba(0,0,0,0) 100%);
  -webkit-mask-size:100% 0%;mask-size:100% 0%;
  animation:pgXReveal 3s cubic-bezier(.3,.6,.2,1) 1.8s both}
@keyframes pgXReveal{to{-webkit-mask-size:100% 100%;mask-size:100% 100%}}
.pg-still .pg-bar-reveal,.pg-still .pg-x-reveal{animation:none;-webkit-mask-image:none;mask-image:none}
.pg-halo-w,.pg-halo-g{opacity:0;animation:pgHaloIn 1.6s ease 5s forwards,pgBreathe 4.8s ease-in-out 6.6s infinite}
.pg-halo-w{animation-name:pgHaloInW,pgBreatheW}
.pg-still .pg-name,.pg-still .pg-byrow{animation:none;opacity:1;transform:none}
.pg-still .pg-halo-g{animation:pgBreathe 4.8s ease-in-out infinite;opacity:.5}
.pg-still .pg-halo-w{animation:pgBreatheW 4.8s ease-in-out infinite;opacity:.34}
@keyframes pgNameIn{0%{opacity:0;letter-spacing:.7em}100%{opacity:1;letter-spacing:.34em}}
@keyframes pgFade{to{opacity:1}}
@keyframes pgHaloIn{to{opacity:.5}}
@keyframes pgBreathe{0%,100%{opacity:.32}50%{opacity:.75}}
@keyframes pgHaloInW{to{opacity:.34}}
@keyframes pgBreatheW{0%,100%{opacity:.2}50%{opacity:.48}}
@media(max-width:600px){.pg-name{font-size:clamp(36px,11vw,60px)}.pg-chips{display:none}.pg-foot{justify-content:center}}
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

/* the 7X device: the 7's bar, its leg (doubling as the X's cut arm) and the gold arm */
const PD = {
  bar: '60,60 1935,60 1808,223 60,223',
  up: '1293,348 1548,348 1125,888 1035,768',
  lo: '816,1128 874,1205 401,1806',
  gold: '360,348 543,348 1716,1839 1533,1839',
}
function DeviceDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <g id="pdBar"><polygon points={PD.bar} /></g>
        <g id="pdUp"><polygon points={PD.up} /></g>
        <g id="pdLo"><polygon points={PD.lo} /></g>
        <g id="pdGold"><polygon points={PD.gold} /></g>
        <linearGradient id="pdFoil" gradientUnits="userSpaceOnUse" x1="360" y1="348" x2="1716" y2="1839">
          <stop offset="0" stopColor="#8f6a25" /><stop offset=".14" stopColor="#e9d08f" /><stop offset=".26" stopColor="#fff3cf" /><stop offset=".38" stopColor="#c79b45" /><stop offset=".5" stopColor="#7d5a1c" /><stop offset=".6" stopColor="#d9b566" /><stop offset=".74" stopColor="#fff0c4" /><stop offset=".86" stopColor="#c9993f" /><stop offset="1" stopColor="#96702a" />
        </linearGradient>
        <linearGradient id="pdGloss" gradientUnits="userSpaceOnUse" x1="0" y1="348" x2="0" y2="1839"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".5" stopColor="#fff" stopOpacity=".04" /><stop offset="1" stopColor="#fff" stopOpacity=".2" /></linearGradient>
        <filter id="pdHalo" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="60" /></filter>
      </defs>
    </svg>
  )
}
/* the plain white device, for the button */
function SevenX({ className }: { className?: string }) {
  return (
    <svg className={className} role="img" aria-label="7X" viewBox="30 30 1920 1810" fill="#F3F2EE">
      <use href="#pdBar" /><use href="#pdUp" /><use href="#pdLo" /><use href="#pdGold" />
    </svg>
  )
}
/* the login device: the leg is always on; the bar fades left to right, then, after a
   hold, the gold arm fades top to bottom, slowly. The reveal is a plain CSS mask-image
   (grown via mask-size) on the rendered shape itself — not an SVG <mask> referencing
   animated <defs> content, which several browsers don't reliably animate. */
function SevenXHero() {
  return (
    <svg role="img" aria-label="7X" viewBox="30 30 1920 1810">
      <g className="pg-halo-w" fill="#F3F2EE" filter="url(#pdHalo)"><use href="#pdBar" /><use href="#pdUp" /><use href="#pdLo" /></g>
      <use className="pg-halo-g" href="#pdGold" fill="#d6b36a" filter="url(#pdHalo)" />
      <g fill="#F3F2EE"><use href="#pdUp" /><use href="#pdLo" /></g>
      <g className="pg-bar-reveal" fill="#F3F2EE"><use href="#pdBar" /></g>
      <g className="pg-x-reveal"><use href="#pdGold" fill="url(#pdFoil)" /><use href="#pdGold" fill="url(#pdGloss)" /></g>
    </svg>
  )
}

export default function PasswordGate({ onAuth, onChoose, chooser }: { onAuth: () => void; onChoose?: (c: Company) => void; chooser?: boolean }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [show, setShow] = useState(false)
  const [stage, setStage] = useState<'login' | 'co'>(chooser ? 'co' : 'login')
  // Only true when HAAVN_ONLY_PASSWORD was used — hides the 7EVEN option below.
  // Initialised from the stored role too: when `chooser` re-opens this screen
  // for an already-authenticated session (role set on an earlier visit, not
  // this render), attempt() never runs, so the stored role is the only signal.
  const [haavnOnly, setHaavnOnly] = useState(() => getStoredRole() === 'haavnonly')

  function attempt() {
    if (value === CORRECT) {
      markAuthenticated()
      setStoredRole('admin')
      setHaavnOnly(false)
      setStage('co') // stay on the screen and offer the three companies
    } else if (value === HAAVN_ONLY_PASSWORD) {
      // General HAAVN staff — HAAVN + HAAVN BLACK only, never 7EVEN.
      markAuthenticated()
      setStoredRole('haavnonly')
      setHaavnOnly(true)
      setStage('co')
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
        <DeviceDefs />
        <div className="pg-hero">
          <div className="pg-name">
            <span className="pg-a"><svg viewBox="0 0 66 74" aria-hidden="true"><path d="M4 74 L33 0 L62 74" fill="none" stroke="#F3F2EE" strokeWidth="2.17" strokeLinejoin="miter" strokeLinecap="butt" /></svg></span>TRIUM
          </div>
          <div className="pg-byrow"><i>by</i><SevenXHero /></div>
        </div>
        <div className="pg-under">
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
              {!haavnOnly && <button className="pg-btn" type="button" tabIndex={stage === 'co' ? 0 : -1} onClick={() => choose('7even')}>7EVEN</button>}
              <button className="pg-btn" type="button" tabIndex={stage === 'co' ? 0 : -1} onClick={() => choose('haavn')}>HAAVN</button>
              <button className="pg-btn" type="button" tabIndex={stage === 'co' ? 0 : -1} onClick={() => choose('black')}>HAAVN BLACK</button>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="pg-foot">
        <span className="pg-atriummark" aria-label="ATRIUM">
          <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22.7 81.2 L50 18.8 L77.3 81.2" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="miter" strokeLinecap="butt" /></svg>
        </span>
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
