import React, { useState } from 'react'
import { Wordmark } from '../components/ui'
import { setStoredRole, EXTERNAL_PASSWORD } from '../lib/role'

const CORRECT = '7Evenhaavn!!!'
const STORAGE_KEY = '7even_auth'

export function isAuthenticated(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export default function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [show, setShow] = useState(false)

  function attempt() {
    if (value === CORRECT) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setStoredRole('admin')
      onAuth()
    } else if (value === EXTERNAL_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true')
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
      background: '#080808',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 0,
    }}>
      {/* Background render */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/renders/haavn-hero.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.18,
        pointerEvents: 'none',
      }} />

      {/* Gold top line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 2,
        background: 'linear-gradient(to right, transparent, #C4973A 30%, #C4973A 70%, transparent)',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 420,
        padding: '56px 48px 48px',
        border: '1px solid #1A1A1A',
        background: 'rgba(6,6,6,0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
      }}>
        {/* Gold top bar */}
        <div style={{ height: 2, background: 'linear-gradient(to right, #C4973A, #E8B84B)', width: '100%', position: 'absolute', top: 0, left: 0 }} />

        <Wordmark size="xl" />

        <p style={{ color: '#444', fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', marginTop: 28, marginBottom: 48 }}>
          Development Feasibility Studio
        </p>

        <div style={{ width: '100%', animation: shake ? 'shake 0.4s ease' : 'none' }}>
          <label style={{ display: 'block', color: '#444', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 12 }}>
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
                border: 'none', borderBottom: `1px solid ${error ? '#9B2335' : '#2A2A2A'}`,
                color: '#fff', fontSize: 18, letterSpacing: '0.12em',
                padding: '10px 40px 10px 0', outline: 'none',
                fontFamily: 'var(--font-mono)',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: 4 }}
            >
              {show ? 'hide' : 'show'}
            </button>
          </div>
          {error && (
            <p style={{ color: '#9B2335', fontSize: 10, letterSpacing: '0.12em', marginTop: 10 }}>
              Incorrect access code — try again
            </p>
          )}
        </div>

        <button
          onClick={attempt}
          style={{
            marginTop: 40, width: '100%',
            padding: '14px 0',
            background: value ? '#C4973A' : '#111',
            border: 'none',
            color: value ? '#000' : '#333',
            fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700,
            cursor: value ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          Enter
        </button>
      </div>

      {/* Bottom brand */}
      <p style={{ position: 'absolute', bottom: 28, color: '#282828', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        7EVEN Capital · Private Access
      </p>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}
