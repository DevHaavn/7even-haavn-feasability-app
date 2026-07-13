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
        background: 'url(/home-bg.jpg) center / cover no-repeat, #030303',
        animation: exiting ? 'intro-screen-out 0.9s ease forwards' : undefined,
      }}>

        {/* ── Content ── */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>

          {/* WELCOME — fine, above the wings */}
          <h1 style={{
            margin: '0 0 44px', color: '#FFFFFF',
            fontSize: 'clamp(13px, 2vw, 21px)', fontFamily: 'var(--font-heading)', fontWeight: 300,
            textTransform: 'uppercase', textAlign: 'center', paddingLeft: '0.34em',
            opacity: 0,
            animation: phase >= 1 ? 'intro-title 1.4s ease 0.3s both' : undefined,
          }}>
            Welcome
          </h1>

          {/* Wings — float + glow, ringed with silver stars and dust */}
          <div style={{ opacity: 0, animation: phase >= 1 ? 'intro-wings-in 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s both' : undefined }}>
            <div style={{ position: 'relative', display: 'inline-flex', animation: phase >= 1 ? 'intro-float 4.5s 1.4s ease-in-out infinite, intro-glow 4s 1.4s ease-in-out infinite' : undefined }}>
              <img
                src="/winged-device-white.png"
                alt="7EVEN"
                draggable={false}
                style={{ width: 'min(320px, 58vw)', height: 'auto', display: 'block', userSelect: 'none' }}
              />
              {/* Silver stars */}
              {phase >= 1 && ([
                { top: '-16%', left: '10%', delay: '1.9s', size: 13 },
                { top: '-10%', left: '84%', delay: '2.6s', size: 10 },
                { top: '42%',  left: '-7%', delay: '3.2s', size: 12 },
                { top: '102%', left: '22%', delay: '2.2s', size: 9 },
                { top: '96%',  left: '74%', delay: '2.9s', size: 11 },
                { top: '8%',   left: '100%', delay: '3.6s', size: 8 },
              ] as const).map((s, i) => (
                <svg key={`star-${i}`} viewBox="0 0 20 20"
                  style={{ position: 'absolute', top: s.top, left: s.left, width: s.size, height: s.size, opacity: 0, animation: `intro-sparkle 3.4s ease-in-out ${s.delay} infinite`, pointerEvents: 'none', overflow: 'visible' }}>
                  <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" fill="#E4E4E8" />
                </svg>
              ))}
              {/* Silver dust */}
              {phase >= 1 && ([
                { top: '-6%',  left: '30%', delay: '2.0s', size: 3 },
                { top: '-12%', left: '58%', delay: '2.8s', size: 2.5 },
                { top: '30%',  left: '104%', delay: '2.4s', size: 3 },
                { top: '70%',  left: '-4%', delay: '3.1s', size: 2.5 },
                { top: '108%', left: '48%', delay: '2.6s', size: 3 },
                { top: '20%',  left: '-8%', delay: '3.5s', size: 2 },
                { top: '60%',  left: '102%', delay: '3.8s', size: 2 },
                { top: '-14%', left: '44%', delay: '3.3s', size: 2 },
              ] as const).map((d, i) => (
                <span key={`dust-${i}`} style={{
                  position: 'absolute', top: d.top, left: d.left, width: d.size, height: d.size,
                  borderRadius: '50%', background: '#D8D8DE', opacity: 0,
                  boxShadow: '0 0 6px rgba(228,228,232,0.9)',
                  animation: `intro-dust 4.2s ease-in-out ${d.delay} infinite`, pointerEvents: 'none',
                }} />
              ))}
            </div>
          </div>

          {/* Precision deployed — portal-page scale, full brightness */}
          <p style={{
            margin: '46px 0 0', color: '#F0EFED',
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
            Deploy Studio
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
