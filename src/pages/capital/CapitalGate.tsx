import React, { useState } from 'react'
import { DesignCredit } from '../../components/ui'

// SHA-256 of the access code — the code itself never ships in the bundle.
const CAPITAL_PASSWORD_HASH = 'bee39521d0639865b9e7023499b25d281d31df07a3fa21533c53d8c3139459d1'

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Access gate for the 7EVEN Capital back-of-house. Same glass aesthetic as the
 *  app login, titled CAPITAL BASE. */
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(196,151,58,0.10) 0%, rgba(10,8,4,0.82) 55%, rgba(3,3,3,0.92) 100%), url(/home-bg.jpg) center / cover no-repeat, #030303',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Return to studio */}
      <button onClick={onClose} className="glass-btn"
        style={{ position: 'absolute', top: 24, right: 32, zIndex: 2, color: 'rgba(255,255,255,0.85)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '8px 16px' }}>
        Deploy Studio
      </button>

      {/* Wings */}
      <img
        src="/winged-device-white.png"
        alt="7EVEN Capital"
        draggable={false}
        className="select-none"
        style={{ width: 'min(230px, 46vw)', height: 'auto', marginBottom: 34, animation: 'login-float 4.5s ease-in-out infinite, login-glow 4s ease-in-out infinite' }}
      />

      {/* Glass card */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 400, padding: '40px 40px 36px',
        border: '1px solid rgba(255,255,255,0.18)', borderRadius: 18, overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 24px 60px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        animation: shake ? 'shake 0.4s ease' : 'none',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, letterSpacing: '0.52em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 40, paddingLeft: '0.52em', textAlign: 'center' }}>
          Capital Base
        </p>

        <div style={{ width: '100%' }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 12 }}>
            Access Code
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={show ? 'text' : 'password'}
              autoFocus
              value={value}
              onChange={e => { setValue(e.target.value); setError(false) }}
              onKeyDown={e => e.key === 'Enter' && attempt()}
              placeholder="········"
              style={{
                width: '100%', background: 'transparent',
                border: 'none', borderBottom: `1px solid ${error ? '#B4553F' : 'rgba(255,255,255,0.35)'}`,
                color: '#fff', fontSize: 18, letterSpacing: '0.12em',
                padding: '10px 40px 10px 0', outline: 'none', fontFamily: 'var(--font-mono)', transition: 'border-color 0.2s',
              }}
            />
            <button onClick={() => setShow(s => !s)}
              title={show ? 'Hide password' : 'Show password'}
              aria-label={show ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
                color: show ? '#C4973A' : 'rgba(255,255,255,0.65)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { const t = e.currentTarget; t.style.background = 'rgba(255,255,255,0.10)'; t.style.borderColor = 'rgba(255,255,255,0.28)' }}
              onMouseLeave={e => { const t = e.currentTarget; t.style.background = 'rgba(255,255,255,0.05)'; t.style.borderColor = 'rgba(255,255,255,0.14)' }}>
              {show ? (
                /* eye-off */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                /* eye */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {error && (
            <p style={{ color: '#E0808C', fontSize: 10, letterSpacing: '0.12em', marginTop: 10 }}>
              Incorrect access code — try again
            </p>
          )}
        </div>

        <button onClick={attempt} className="glass-btn"
          style={{ marginTop: 36, width: '100%', padding: '14px 0', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
          Deploy
        </button>
      </div>

      <p style={{ position: 'absolute', bottom: 34, color: 'rgba(255,255,255,0.30)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        7EVEN Capital · Private Access
      </p>
      <DesignCredit style={{ position: 'absolute', bottom: 14, left: 0, right: 0 }} />

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes login-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
        @keyframes login-glow { 0%,100%{filter:drop-shadow(0 0 16px rgba(196,151,58,0.22))} 50%{filter:drop-shadow(0 0 40px rgba(216,176,96,0.5))} }
      `}</style>
    </div>
  )
}
