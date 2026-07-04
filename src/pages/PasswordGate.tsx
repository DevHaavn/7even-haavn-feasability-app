import React, { useState } from 'react'
import { DesignCredit } from '../components/ui'
import { setStoredRole, EXTERNAL_PASSWORD } from '../lib/role'

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
    } else {
      setError(true)
      setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(196,151,58,0.10) 0%, rgba(10,8,4,0.82) 55%, rgba(3,3,3,0.92) 100%), url(/home-bg.jpg) center / cover no-repeat, #030303',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>

      {/* Wings — floating gently with a soft glow */}
      <img
        src="/winged-device-white.png"
        alt="7EVEN"
        draggable={false}
        className="select-none"
        style={{ width: 'min(230px, 46vw)', height: 'auto', marginBottom: 34, animation: 'login-float 4.5s ease-in-out infinite, login-glow 4s ease-in-out infinite' }}
      />

      {/* Glass card */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 400,
        padding: '40px 40px 36px',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: 18,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 24px 60px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        animation: shake ? 'shake 0.4s ease' : 'none',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 11, letterSpacing: '0.42em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 40, paddingLeft: '0.42em', textAlign: 'center' }}>
          Development Feasibility Studio
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
                border: 'none', borderBottom: `1px solid ${error ? '#9B2335' : 'rgba(255,255,255,0.35)'}`,
                color: '#fff', fontSize: 18, letterSpacing: '0.12em',
                padding: '10px 40px 10px 0', outline: 'none',
                fontFamily: 'var(--font-mono)',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: 4 }}
            >
              {show ? 'hide' : 'show'}
            </button>
          </div>
          {error && (
            <p style={{ color: '#E0808C', fontSize: 10, letterSpacing: '0.12em', marginTop: 10 }}>
              Incorrect access code — try again
            </p>
          )}
        </div>

        <button
          onClick={attempt}
          className="glass-btn"
          style={{
            marginTop: 36, width: '100%',
            padding: '14px 0',
            fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          Enter
        </button>
      </div>

      {/* Bottom brand */}
      <p style={{ position: 'absolute', bottom: 34, color: 'rgba(255,255,255,0.30)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        7EVEN Capital · Private Access
      </p>
      <DesignCredit style={{ position: 'absolute', bottom: 14, left: 0, right: 0 }} />

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes login-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-9px) } }
        @keyframes login-glow { 0%, 100% { filter: drop-shadow(0 0 16px rgba(196,151,58,0.22)) } 50% { filter: drop-shadow(0 0 40px rgba(216,176,96,0.5)) } }
      `}</style>
    </div>
  )
}
