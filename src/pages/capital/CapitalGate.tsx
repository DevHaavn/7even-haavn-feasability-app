import React, { useState } from 'react'
import { DesignCredit } from '../../components/ui'
import { AtriumApex } from '../../components/AtriumMark'

// SHA-256 of the access code — the code itself never ships in the bundle.
const CAPITAL_PASSWORD_HASH = 'bee39521d0639865b9e7023499b25d281d31df07a3fa21533c53d8c3139459d1'

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Access gate for the 7EVEN Capital back-of-house.
 *
 * Deliberately the same screen as the studio login (PasswordGate) — same tower
 * background, same ATRIUM device, same smoked-glass card, same type — differing
 * only in wording. It was still on the pre-ATRIUM look: /home-bg.jpg under a gold
 * radial, the retired winged device, a near-invisible 2%-white card and gold
 * accents. Two front doors to one product should not look like two products.
 *
 * The code is still checked against a SHA-256 hash, unchanged.
 */
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
      background: 'linear-gradient(to bottom, rgba(10,14,20,0.30), rgba(10,14,20,0.46) 60%, rgba(8,11,16,0.70)), url(/renders/login-bg.jpg) center / cover no-repeat, #05070a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>

      {/* Back to the studio. Was "Deploy Studio" — that name is retired. */}
      <button onClick={onClose}
        style={{
          position: 'absolute', top: 24, right: 32, zIndex: 2,
          color: '#AEB6B8', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
          padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
          border: '1px solid rgba(220,232,244,0.22)',
          background: 'rgba(44,60,78,0.42)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        }}>
        ← ATRIUM Studio
      </button>

      {/* ATRIUM brand device — flashing light-core, bright over the tower sky */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 34 }}>
        <AtriumApex size={104} variant="compact" flash bright style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.45)) drop-shadow(0 10px 26px rgba(0,0,0,0.4))' }} />
        <span style={{ color: '#EEF1F2', fontFamily: "'Inter Tight', var(--font-heading), system-ui, sans-serif", fontWeight: 600, fontSize: 26, letterSpacing: '0.30em', paddingLeft: '0.30em', textShadow: '0 2px 18px rgba(0,0,0,0.5)' }}>
          ATRIUM
        </span>
      </div>

      {/* Glass card — smoked glass, copying the main-app New Project modal */}
      <div style={{
        position: 'relative',
        width: 'min(400px, calc(100vw - 28px))',
        padding: '40px 40px 36px',
        border: '1px solid rgba(220,232,244,0.22)',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'rgba(44,60,78,0.52)',
        backdropFilter: 'blur(30px) saturate(1.25)',
        WebkitBackdropFilter: 'blur(30px) saturate(1.25)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 28px 70px rgba(30,44,62,0.35)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        animation: shake ? 'shake 0.4s ease' : 'none',
      }}>
        {/* Brushed-silver top line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(to right, transparent, #C6CDCF 30%, #EEF1F2 50%, #9AA2A4 72%, transparent)' }} />

        <p style={{ color: '#E8C87A', fontSize: 9.5, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 34, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          Capital Base
        </p>

        <div style={{ width: '100%' }}>
          <label style={{ display: 'block', color: '#AEB6B8', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 12 }}>
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
                border: 'none', borderBottom: `1px solid ${error ? '#D07A62' : 'rgba(220,232,244,0.28)'}`,
                color: '#EEF1F2', fontSize: 16, letterSpacing: '0.12em',
                padding: '10px 40px 10px 0', outline: 'none',
                fontFamily: 'var(--font-mono)',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#AEB6B8', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: 4 }}
            >
              {show ? 'hide' : 'show'}
            </button>
          </div>
          {error && (
            <p style={{ color: '#D07A62', fontSize: 10, letterSpacing: '0.12em', marginTop: 10 }}>
              Incorrect access code — try again
            </p>
          )}
        </div>

        <button
          onClick={attempt}
          style={{
            marginTop: 36, width: '100%',
            padding: '14px 0',
            fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 700,
            color: '#EEF1F2', cursor: 'pointer',
            borderRadius: 12,
            border: '1px solid rgba(220,232,244,0.28)',
            background: 'linear-gradient(180deg, rgba(150,172,196,0.32), rgba(120,146,172,0.14))',
            backdropFilter: 'blur(10px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30)',
          }}
        >
          Capital Base
        </button>
      </div>

      {/* Bottom brand */}
      <p style={{ position: 'absolute', bottom: 34, color: 'rgba(255,255,255,0.42)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
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
      `}</style>
    </div>
  )
}
