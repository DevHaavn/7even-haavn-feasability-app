import React, { useEffect, useState, useCallback } from 'react'
import { DesignCredit } from '../components/ui'

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
          background: rgba(196,151,58,0.12) !important;
          border-color: rgba(196,151,58,0.75) !important;
          color: #C4973A !important;
        }
        @keyframes intro-shimmer {
          0%   { background-position: -250% center; }
          100% { background-position:  250% center; }
        }
        @keyframes intro-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          40%, 60% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }
        @keyframes intro-title {
          from { opacity: 0; letter-spacing: 0.7em; }
          to   { opacity: 1; letter-spacing: 0.34em; }
        }
        .intro-wings-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
        .intro-wings-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(108deg, transparent 30%, transparent 40%, rgba(255,255,255,0.55) 50%, rgba(232,200,122,0.50) 56%, transparent 66%, transparent 100%);
          background-size: 300% 100%;
          background-position: -250% center;
          animation: intro-shimmer 7.5s ease-in-out 1.6s infinite;
          pointer-events: none;
          /* Clip the light sweep to the wings' own shape */
          -webkit-mask-image: url(/winged-device-gold.png);
          -webkit-mask-size: 100% 100%;
          -webkit-mask-repeat: no-repeat;
          mask-image: url(/winged-device-gold.png);
          mask-size: 100% 100%;
          mask-repeat: no-repeat;
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 60% at 50% 42%, rgba(196,151,58,0.12) 0%, rgba(10,8,4,0.82) 55%, rgba(3,3,3,0.90) 100%), url(/home-bg.jpg) center / cover no-repeat, #030303',
        animation: exiting ? 'intro-screen-out 0.9s ease forwards' : undefined,
      }}>

        {/* ── Content ── */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>

          {/* Copper wings — shimmer sweep, sparkles, gentle float and glow */}
          <div style={{ opacity: 0, animation: phase >= 1 ? 'intro-wings-in 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s both' : undefined }}>
            <div className="intro-wings-wrap" style={{ animation: phase >= 1 ? 'intro-float 4.5s 1.4s ease-in-out infinite, intro-glow 4s 1.4s ease-in-out infinite' : undefined }}>
              <img
                src="/winged-device-gold.png"
                alt="7EVEN"
                draggable={false}
                style={{ width: 'min(340px, 60vw)', height: 'auto', display: 'block', userSelect: 'none' }}
              />
              {phase >= 1 && ([
                { top: '-14%', left: '8%',  delay: '1.8s', size: 16 },
                { top: '-8%',  left: '86%', delay: '2.4s', size: 12 },
                { top: '46%',  left: '-6%', delay: '3.0s', size: 14 },
                { top: '104%', left: '20%', delay: '2.1s', size: 11 },
                { top: '100%', left: '72%', delay: '2.8s', size: 13 },
                { top: '12%',  left: '99%', delay: '3.4s', size: 10 },
              ] as const).map((s, i) => (
                <svg key={i} viewBox="0 0 20 20"
                  style={{ position: 'absolute', top: s.top, left: s.left, width: s.size, height: s.size, opacity: 0, animation: `intro-sparkle 3.2s ease-in-out ${s.delay} infinite`, pointerEvents: 'none', overflow: 'visible' }}>
                  <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" fill="#E8C87A" />
                </svg>
              ))}
            </div>
          </div>

          {/* WELCOME — big, fine and bold */}
          <h1 style={{
            margin: '46px 0 0', color: '#FFFFFF',
            fontSize: 'clamp(26px, 4vw, 42px)', fontFamily: 'var(--font-heading)', fontWeight: 600,
            textTransform: 'uppercase', textAlign: 'center', paddingLeft: '0.34em',
            opacity: 0,
            animation: phase >= 1 ? 'intro-title 1.4s ease 0.7s both' : undefined,
          }}>
            Welcome
          </h1>

          {/* Precision deployed */}
          <p style={{
            margin: '14px 0 0', color: 'rgba(240,239,237,0.92)',
            fontSize: 12, letterSpacing: '0.5em', textTransform: 'uppercase', paddingLeft: '0.5em',
            fontWeight: 300, opacity: 0,
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

          {/* Enter Studio */}
          <button
            className="intro-btn glass-btn"
            onClick={exit}
            style={{
              padding: '14px 52px',
              fontSize: 10,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'monospace',
              opacity: 0,
              animation: phase >= 3 ? 'intro-btn-in 0.8s ease forwards' : undefined,
            }}
          >
            Enter Studio
          </button>
        </div>

        {/* Thin gold base line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(to right, transparent, rgba(196,151,58,0.30), transparent)',
        }} />

        {/* Corner metadata */}
        <div style={{ position: 'absolute', bottom: 24, left: 28, fontSize: 7, letterSpacing: '0.20em', color: 'rgba(255,255,255,0.14)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          Confidential
        </div>
        <div style={{ position: 'absolute', bottom: 24, right: 28, fontSize: 7, letterSpacing: '0.20em', color: 'rgba(255,255,255,0.14)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
          7even.au
        </div>
        <DesignCredit style={{ position: 'absolute', bottom: 24, left: 0, right: 0 }} />
      </div>
    </>
  )
}
