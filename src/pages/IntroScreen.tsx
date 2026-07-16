import React, { useEffect, useState, useCallback } from 'react'
import { DesignCredit } from '../components/ui'
import AtriumBuild from '../components/AtriumBuild'

interface Props {
  onDone: () => void
}

/** Welcome interstitial — same treatment as the 7EVEN Capital portal page:
 *  shimmering particle backdrop, gold radial glow, and the winged device
 *  floating gently in place of the wordmark. */
export default function IntroScreen({ onDone }: Props) {
  const [phase, setPhase] = useState(0)
  const [exiting, setExiting] = useState(false)

  const exit = useCallback(() => {
    if (exiting) return
    setExiting(true)
    setTimeout(onDone, 900)
  }, [exiting, onDone])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 350)
    const t2 = setTimeout(() => setPhase(2), 1400)
    const t3 = setTimeout(() => setPhase(3), 2200)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [])

  return (
    <>
      <style>{`
        @keyframes intro-screen-out { from { opacity: 1 } to { opacity: 0 } }
        @keyframes intro-welcome {
          0%   { opacity: 0; letter-spacing: 0.42em; }
          100% { opacity: 0.82; letter-spacing: 0.58em; }
        }
        @keyframes intro-wings-in { 0% { opacity: 0; transform: translateY(34px) scale(0.82) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes intro-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-11px) } }
        @keyframes intro-glow { 0%, 100% { filter: drop-shadow(0 0 18px rgba(196,151,58,0.25)) } 50% { filter: drop-shadow(0 0 44px rgba(216,176,96,0.55)) } }
        @keyframes intro-divider { from { transform: scaleX(0); opacity: 0 } to { transform: scaleX(1); opacity: 1 } }
        @keyframes intro-tagline {
          from { opacity: 0; letter-spacing: 0.28em; }
          to   { opacity: 1; letter-spacing: 0.36em; }
        }
        @keyframes intro-btn-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }

        .intro-btn:hover {
          background: linear-gradient(180deg, rgba(78,100,126,0.62), rgba(56,74,94,0.48)) !important;
          border-color: rgba(220,232,244,0.42) !important;
        }
        @keyframes intro-title {
          from { opacity: 0; letter-spacing: 0.7em; }
          to   { opacity: 1; letter-spacing: 0.34em; }
        }
        @keyframes intro-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          40%, 60% { opacity: 1; transform: scale(1.15) rotate(180deg); }
        }
        @keyframes intro-dust {
          0%, 100% { opacity: 0; transform: translateY(0) scale(0.6); }
          50%      { opacity: 0.85; transform: translateY(-6px) scale(1); }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, rgba(10,14,20,0.28), rgba(10,14,20,0.42) 60%, rgba(8,11,16,0.66)), url(/renders/tower-hero.jpg) center 28% / cover no-repeat, #05070a',
        animation: exiting ? 'intro-screen-out 0.9s ease forwards' : undefined,
      }}>

        {/* ── Content ── */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>

          {/* WELCOME — fine, above the device */}
          <h1 style={{
            margin: '0 0 30px', color: '#F0EFED',
            fontSize: 'clamp(13px, 2vw, 21px)', fontFamily: 'var(--font-heading)', fontWeight: 300,
            textTransform: 'uppercase', textAlign: 'center', paddingLeft: '0.34em',
            opacity: 0,
            animation: phase >= 1 ? 'intro-title 1.4s ease 0.3s both' : undefined,
          }}>
            Welcome
          </h1>

          {/* ATRIUM — the self-building A1 device (11 chrome light-lines weave to the apex) */}
          <div style={{ opacity: 0, animation: phase >= 1 ? 'intro-wings-in 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s both' : undefined }}>
            <AtriumBuild variant="A1" size={Math.min(320, typeof window !== 'undefined' ? window.innerWidth * 0.58 : 320)} bright style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.4)) drop-shadow(0 12px 30px rgba(0,0,0,0.35))' }} />
          </div>

          {/* Precision deployed — portal-page scale */}
          <p style={{
            margin: '30px 0 0', color: '#F0EFED',
            fontSize: 'clamp(20px, 3.4vw, 34px)', fontFamily: 'var(--font-heading)', fontWeight: 300,
            letterSpacing: '0.34em', textTransform: 'uppercase', textAlign: 'center', paddingLeft: '0.34em',
            opacity: 0,
            animation: phase >= 2 ? 'intro-btn-in 0.9s ease both' : undefined,
          }}>
            Precision Deployed
          </p>

          {/* Gold hairline divider */}
          <div style={{
            width: 220, height: 1,
            background: 'linear-gradient(to right, transparent, rgba(196,151,58,0.65), transparent)',
            transformOrigin: 'center',
            transform: 'scaleX(0)', opacity: 0,
            margin: '44px 0 20px',
            animation: phase >= 2 ? 'intro-divider 0.9s ease forwards' : undefined,
          }} />

          {/* Tagline — bright gold */}
          <p style={{
            fontSize: 9.5, textTransform: 'uppercase', color: '#E8C87A',
            fontFamily: 'monospace', fontWeight: 700, marginBottom: 56, opacity: 0,
            animation: phase >= 2 ? 'intro-tagline 0.9s ease 0.2s forwards' : undefined,
          }}>
            Development Feasibility Studio
          </p>

          {/* Enter Studio — smoked glass, main-app feel */}
          <button
            className="intro-btn"
            onClick={exit}
            style={{
              padding: '14px 52px',
              fontSize: 10,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: '#EEF1F2',
              fontFamily: 'monospace',
              cursor: 'pointer',
              borderRadius: 12,
              border: '1px solid rgba(220,232,244,0.28)',
              background: 'linear-gradient(180deg, rgba(60,80,104,0.55), rgba(44,60,78,0.42))',
              backdropFilter: 'blur(14px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(14px) saturate(1.2)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 12px 30px rgba(30,44,62,0.3)',
              opacity: 0,
              animation: phase >= 3 ? 'intro-btn-in 0.8s ease forwards' : undefined,
            }}
          >
            ATRIUM Studio
          </button>
        </div>

        {/* Thin gold base line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(to right, transparent, rgba(196,151,58,0.30), transparent)',
        }} />

        {/* Corner metadata */}
        <div style={{ position: 'absolute', bottom: 24, left: 28, fontSize: 7, letterSpacing: '0.20em', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Confidential
        </div>
        <div style={{ position: 'absolute', bottom: 24, right: 28, fontSize: 7, letterSpacing: '0.20em', color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          7even.au
        </div>
        <DesignCredit style={{ position: 'absolute', bottom: 24, left: 0, right: 0 }} />
      </div>
    </>
  )
}
