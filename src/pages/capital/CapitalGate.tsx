import React, { useState } from 'react'

// SHA-256 of the access code — the code itself never ships in the bundle.
const CAPITAL_PASSWORD_HASH = 'bee39521d0639865b9e7023499b25d281d31df07a3fa21533c53d8c3139459d1'

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// Capital Base gate — same design language as the main app login: the HAAVN
// BLACK moving field behind a boxless access form with gold writing and a
// one-line footer. Two front doors to one product should look like one product.
// The code is still checked against a SHA-256 hash, unchanged.
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
.cg-root{position:fixed;inset:0;z-index:400;background:#040404;color:#e8e9eb;overflow:hidden;
  font-family:'Inter',system-ui,sans-serif}
.cg-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cg-scrim{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(4,4,4,.6),rgba(4,4,4,.42) 44%,rgba(4,4,4,.82))}
.cg-back{position:absolute;top:calc(env(safe-area-inset-top,0px) + 20px);right:22px;z-index:30;cursor:pointer;
  font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#c9cdd2;
  background:transparent;border:1px solid rgba(255,255,255,.28);border-radius:2px;padding:9px 14px;transition:.3s}
.cg-back:hover{border-color:rgba(214,179,106,.75);color:#fff;background:rgba(214,179,106,.07)}
.cg-stage{position:relative;z-index:5;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px 90px}
.cg-wings{height:44px;width:auto;opacity:.95;filter:drop-shadow(0 2px 14px rgba(0,0,0,.6))}
.cg-title{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.5em;text-transform:uppercase;color:#d6b36a;margin-top:20px;padding-left:.5em;
  text-shadow:0 0 8px rgba(244,227,189,.9),0 0 20px rgba(214,179,106,.6),0 0 34px rgba(190,150,80,.4)}
.cg-sub{font-family:'JetBrains Mono',monospace;font-size:6.4px;letter-spacing:.46em;text-transform:uppercase;color:#9aa0a6;margin-top:12px;text-align:center}

.cg-card{margin-top:46px;width:min(360px,90vw)}
.cg-card.shake{animation:cg-shake .4s ease}
@keyframes cg-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
.cg-lbl{display:block;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.26em;text-transform:uppercase;color:#aab0b6;margin-bottom:10px}
.cg-inwrap{position:relative}
.cg-inp{width:100%;background:transparent;border:none;border-bottom:1px solid #d6b36a;color:#fff;
  box-shadow:0 3px 9px -2px rgba(244,227,189,.7),0 5px 22px -2px rgba(214,179,106,.45);
  font-family:'JetBrains Mono',monospace;font-size:18px;letter-spacing:.4em;padding:8px 52px 10px 2px;outline:none;transition:.3s;box-sizing:border-box}
.cg-inp::placeholder{color:rgba(255,255,255,.25);letter-spacing:.3em}
.cg-inp:focus{border-bottom-color:#f4e3bd;box-shadow:0 3px 10px -2px rgba(244,227,189,.95),0 5px 26px -2px rgba(214,179,106,.7)}
.cg-inp.err{border-bottom-color:#e0645c}
.cg-inp:-webkit-autofill,.cg-inp:-webkit-autofill:hover,.cg-inp:-webkit-autofill:focus{
  -webkit-text-fill-color:#fff;caret-color:#fff;
  transition:background-color 600000s 0s;
  -webkit-box-shadow:0 0 0 1000px transparent inset}
.cg-show{position:absolute;right:0;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#aab0b6;
  font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:4px}
.cg-enter{margin-top:26px;width:100%;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;
  font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:#d6d9dd;
  background:transparent;border:1px solid rgba(255,255,255,.28);border-radius:2px;padding:13px 0;transition:.35s}
.cg-enter:hover{border-color:rgba(214,179,106,.75);color:#fff;background:rgba(214,179,106,.07);box-shadow:0 0 28px -10px rgba(214,179,106,.65)}
.cg-enter .tri{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:6.5px solid #d6b36a;
  filter:brightness(1.3) drop-shadow(0 0 6px rgba(244,227,189,.9)) drop-shadow(0 0 16px rgba(214,179,106,.6))}
.cg-err{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#e0645c;margin-top:12px;text-align:center}

.cg-foot{position:absolute;left:0;right:0;bottom:0;z-index:30;background:linear-gradient(180deg,rgba(6,7,8,.92),#050607);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);padding:0 clamp(18px,3.4vw,46px)}
.cg-hair{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16) 12%,rgba(255,255,255,.16) 88%,transparent)}
.cg-frail{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 2px calc(14px + env(safe-area-inset-bottom,0px));white-space:nowrap}
.cg-atr{display:flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.34em;color:#c3c7cd}
.cg-tri2{width:0;height:0;border-left:4.5px solid transparent;border-right:4.5px solid transparent;border-bottom:7px solid rgba(255,255,255,.55);transform:translateY(-1px)}
.cg-tag{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.24em;color:#8a8f95;text-transform:uppercase}
`

export default function CapitalGate({ onAuth, onClose }: { onAuth: () => void; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [show, setShow] = useState(false)

  async function attempt() {
    if (await sha256Hex(value) === CAPITAL_PASSWORD_HASH) {
      onAuth()
    } else {
      setError(true)
      setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="cg-root">
      <style>{CSS}</style>
      <video className="cg-bg" autoPlay muted loop playsInline preload="auto" src="/haavn-black-bg.mp4" />
      <div className="cg-scrim" />

      <button className="cg-back" onClick={onClose}>← Atrium Studio</button>

      <div className="cg-stage">
        <img className="cg-wings" src="/winged-device-white.png" alt="7EVEN Capital" draggable={false} />
        <div className="cg-title">Capital Base</div>
        <div className="cg-sub">Enterprise&nbsp;&nbsp;·&nbsp;&nbsp;Accounts &amp; Administration&nbsp;&nbsp;·&nbsp;&nbsp;Private Access</div>

        <div className={`cg-card${shake ? ' shake' : ''}`}>
          <label className="cg-lbl" htmlFor="cg-code">Access Code</label>
          <div className="cg-inwrap">
            <input
              id="cg-code"
              className={`cg-inp${error ? ' err' : ''}`}
              type={show ? 'text' : 'password'}
              autoFocus
              value={value}
              onChange={e => { setValue(e.target.value); setError(false) }}
              onKeyDown={e => e.key === 'Enter' && attempt()}
              placeholder="········"
              autoComplete="off"
            />
            <button className="cg-show" onClick={() => setShow(s => !s)}>{show ? 'hide' : 'show'}</button>
          </div>
          <button className="cg-enter" onClick={attempt}><span className="tri" />Enter Capital Base</button>
          {error && <p className="cg-err">Incorrect access code — try again</p>}
        </div>
      </div>

      <div className="cg-foot">
        <div className="cg-hair" />
        <div className="cg-frail">
          <span className="cg-atr"><span className="cg-tri2" />ATRIUM</span>
          <span className="cg-tag">7EVEN Capital · Private Access</span>
        </div>
      </div>
    </div>
  )
}
