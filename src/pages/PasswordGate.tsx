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

// Mike Furniss (HAAVN BLACK sales manager, Queensland). 'blacksales' role:
// HAAVN BLACK Display and the sales ATRIUM only. No CRM, feasibility studio,
// 7EVEN, HAAVN or Capital Base. Kept as a SHA-256 hash so the
// plaintext never ships in the bundle.
const MIKE_HASH = '7b34bf632ec2bb296b6520977be17cfed9b29634188b8603898a8c974f4d5a04'
const MIKE_NAME = 'Mike Furniss'
async function sha256Hex(v: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
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
.pg-scrim{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(90deg,rgba(11,13,15,.94),rgba(11,13,15,.70) 62%,rgba(11,13,15,.56)),
    radial-gradient(120% 90% at 0% 100%,rgba(11,13,15,.80),transparent 62%)}
.pg-stage{position:relative;z-index:5;height:100%;display:flex;flex-direction:column;align-items:flex-start;
  justify-content:flex-end;padding:0 clamp(26px,5vw,72px) clamp(96px,13vh,140px)}
.pg-hero{display:flex;flex-direction:column;align-items:flex-start;gap:13px}
.pg-name{display:flex;align-items:center;font:100 clamp(32px,5.2vw,64px)/1 Inter,system-ui,sans-serif;letter-spacing:.34em;padding-left:.34em;color:#F3F2EE;opacity:0;animation:pgNameIn 3.2s ease .3s forwards}
.pg-a{position:relative;display:block;width:.66em;height:.74em;margin-right:.34em;flex:none;animation:pgAGapIn 3.2s ease .3s forwards}
.pg-a svg{display:block;width:100%;height:100%;overflow:visible}
@keyframes pgAGapIn{0%{margin-right:.7em}100%{margin-right:.34em}}
.pg-still .pg-a{animation:none;margin-right:.34em}
.pg-byrow{display:flex;align-items:center;gap:10px;opacity:0;animation:pgFade 1.6s ease 2.6s forwards}
.pg-byrow i{font:italic 400 clamp(15px,1.7vw,20px) 'Cormorant Garamond',serif;color:#B5B5B2}
.pg-byrow svg{height:clamp(19px,2.2vw,26px);width:auto;overflow:visible;display:block}
.pg-under{display:flex;flex-direction:column;align-items:flex-start;width:min(440px,100%)}


.pg-tag{font:300 15px Inter,system-ui,sans-serif;letter-spacing:0;color:#B5B5B2;margin:24px 0 0;text-align:left;max-width:32ch;line-height:1.66}
.pg-panel{margin-top:30px;width:100%;min-height:236px;position:relative}
.pg-view{position:absolute;inset:0 0 auto 0;display:flex;flex-direction:column;gap:14px;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .6s,transform .6s}
.pg-view.on{opacity:1;transform:none;pointer-events:auto}
.pg-view.shake{animation:pg-shake .4s ease}
@keyframes pg-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.pg-lbl{font:300 12px Inter,system-ui,sans-serif;letter-spacing:0;color:#9A9A97;text-align:left}
.pg-field{position:relative}
.pg-inp{width:100%;height:38px;border:0;border-bottom:1px solid rgba(243,242,238,.34);background:transparent;color:#F3F2EE;font:300 15px Inter,system-ui,sans-serif;letter-spacing:0;padding:0 58px 9px 0;outline:none;transition:border-color .3s;box-sizing:border-box}
.pg-inp::placeholder{color:#9A9A97}
.pg-inp:focus{border-bottom-color:#F3F2EE}
.pg-inp.err{border-color:#e0645c}
.pg-inp:-webkit-autofill{-webkit-text-fill-color:#F3F2EE;transition:background-color 600000s 0s}
.pg-show{position:absolute;right:0;top:4px;height:28px;padding:0;border:0;background:transparent;color:#9A9A97;font:300 12px Inter,system-ui,sans-serif;letter-spacing:0;cursor:pointer}
.pg-show:hover{color:#F3F2EE}
.pg-btn{border:0;border-bottom:1px solid rgba(243,242,238,.34);background:transparent;color:#F3F2EE;
  font:300 15px Inter,system-ui,sans-serif;letter-spacing:0;cursor:pointer;transition:border-color .3s;
  display:inline-flex;align-items:center;gap:9px;padding:0 0 6px;align-self:flex-start}
.pg-btn:hover{border-bottom-color:#F3F2EE}
/* the chooser is an index, not three buttons */
.pg-cobtn{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:baseline;width:100%;
  padding:17px 0;border:0;border-top:1px solid rgba(243,242,238,.20);background:transparent;cursor:pointer;
  text-align:left;font-family:inherit;transition:padding .35s cubic-bezier(.16,1,.3,1),border-color .35s}
.pg-cobtn:last-child{border-bottom:1px solid rgba(243,242,238,.20)}
.pg-cobtn .n{font:300 20px Inter,system-ui,sans-serif;color:#B5B5B2;transition:color .35s}
.pg-cobtn .d{font:300 12.5px Inter,system-ui,sans-serif;color:#9A9A97;transition:color .35s}
.pg-cobtn:hover{padding-left:12px;border-top-color:rgba(243,242,238,.34)}
.pg-cobtn:hover .n{color:#F3F2EE}
.pg-cobtn:hover .d{color:#B5B5B2}
.pg-cobtn:focus-visible{outline:1px solid rgba(243,242,238,.5);outline-offset:4px}
.pg-x7{height:11px;width:auto;display:block}
.pg-err{color:#e0645c;font:300 12px Inter,system-ui,sans-serif;letter-spacing:0;text-align:left;min-height:14px}
.pg-co{display:flex;flex-direction:column}
.pg-foot{position:absolute;left:0;right:0;bottom:0;z-index:30;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(26px,5vw,72px);background:transparent;font:300 12px Inter,system-ui,sans-serif;letter-spacing:0;color:#9A9A97}
.pg-foot b{font-weight:400;color:#F3F2EE}
.pg-atriummark{width:28px;height:28px;flex-shrink:0;border-radius:999px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(243,242,238,.35);color:#F3F2EE}
.pg-atriummark svg{width:15px;height:15px;display:block}
/* status is a word, not a blinking light */
.pg-live i{display:none}
.pg-chips{display:flex;gap:20px;align-items:center}
/* the install control is a shared component with inline styles and a gold glass
   skin. scoped to this footer only, so every other screen keeps its own look. */
.pg-foot .glass-btn-gold{background:none!important;border:0!important;box-shadow:none!important;
  border-radius:0!important;padding:0!important;color:#9A9A97!important;font:300 12px Inter,system-ui,sans-serif!important;
  letter-spacing:0!important;text-transform:none!important;gap:0!important}
.pg-foot .glass-btn-gold:hover{color:#F3F2EE!important}
.pg-foot .glass-btn-gold img{display:none!important}
.pg-chip{border:0;border-radius:0;padding:0;color:inherit;text-decoration:none;transition:color .3s}
.pg-chip:hover{color:#F3F2EE}

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
@media(max-width:600px){
  .pg-name{font-size:clamp(30px,9vw,48px)}
  .pg-stage{padding:0 22px clamp(84px,11vh,112px)}
  .pg-tag{font-size:14px;margin-top:20px}
  /* the install control is the one thing that matters most on a phone, so the
     two .au links go and it stays. centring the row collided the ring mark
     with the clock, so the footer keeps its ends and just tightens. */
  .pg-foot{padding:0 22px;font-size:11px;gap:14px}
  .pg-foot .pg-chip{display:none}
  .pg-live{white-space:nowrap}
}
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

  async function attempt() {
    let mike = false
    try { mike = (await sha256Hex(value)) === MIKE_HASH } catch { /* no crypto.subtle: fall through */ }
    if (mike) {
      // HAAVN BLACK sales manager: sales-only role, signed in as himself.
      markAuthenticated()
      setStoredRole('blacksales')
      try { localStorage.setItem('atrium_me', MIKE_NAME) } catch { /* ignore */ }
      onAuth()
    } else if (value === CORRECT) {
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
        <p className="pg-tag">Engine, precision and intelligence.</p>

        <div className="pg-panel">
          <div className={`pg-view${stage === 'login' ? ' on' : ''}${shake ? ' shake' : ''}`}>
            <div className="pg-lbl">Private access</div>
            <div className="pg-field">
              <input
                id="pg-code"
                className={`pg-inp${error ? ' err' : ''}`}
                type={show ? 'text' : 'password'}
                autoFocus
                value={value}
                onChange={e => { setValue(e.target.value); setError(false) }}
                onKeyDown={e => e.key === 'Enter' && attempt()}
                placeholder="Access code"
                autoComplete="off"
                tabIndex={stage === 'login' ? 0 : -1}
              />
              <button className="pg-show" type="button" onClick={() => setShow(s => !s)}>{show ? 'hide' : 'show'}</button>
            </div>
            <div className="pg-err">{error ? 'Incorrect access code' : ''}</div>
            <button className="pg-btn" type="button" onClick={attempt}>Enter <SevenX className="pg-x7" /></button>
          </div>

          <div className={`pg-view${stage === 'co' ? ' on' : ''}`}>
            <div className="pg-lbl">Choose your company</div>
            <div className="pg-co">
              {!haavnOnly && (
                <button className="pg-cobtn" type="button" tabIndex={stage === 'co' ? 0 : -1} onClick={() => choose('7even')}>
                  <span className="n">7EVEN</span><span className="d">Developments</span>
                </button>
              )}
              <button className="pg-cobtn" type="button" tabIndex={stage === 'co' ? 0 : -1} onClick={() => choose('haavn')}>
                <span className="n">HAAVN</span><span className="d">Precision</span>
              </button>
              <button className="pg-cobtn" type="button" tabIndex={stage === 'co' ? 0 : -1} onClick={() => choose('black')}>
                <span className="n">HAAVN BLACK</span><span className="d">Homes</span>
              </button>
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
