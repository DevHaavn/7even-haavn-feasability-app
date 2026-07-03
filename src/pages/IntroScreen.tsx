import React, { useEffect, useState, useCallback } from 'react'
import { DesignCredit } from '../components/ui'

interface Props {
  onDone: () => void
}

const BG = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1920&q=80'

export default function IntroScreen({ onDone }: Props) {
  const [phase, setPhase] = useState(0)
  const [exiting, setExiting] = useState(false)

  const exit = useCallback(() => {
    if (exiting) return
    setExiting(true)
    setTimeout(onDone, 900)
  }, [exiting, onDone])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 1200)
    const t3 = setTimeout(() => setPhase(3), 2200)
    const t4 = setTimeout(() => setPhase(4), 3200)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  return (
    <>
      <style>{`
        @keyframes intro-kb {
          from { transform: scale(1.04); }
          to   { transform: scale(1.10); }
        }
        @keyframes intro-screen-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes intro-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes intro-welcome {
          0%   { opacity: 0; letter-spacing: 0.42em; }
          100% { opacity: 0.82; letter-spacing: 0.58em; }
        }
        @keyframes intro-tagline {
          from { opacity: 0; letter-spacing: 0.28em; }
          to   { opacity: 0.52; letter-spacing: 0.36em; }
        }
        @keyframes intro-divider {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
        @keyframes intro-btn-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes city-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.82; }
        }

        /* Gold shimmer sweep across the logo */
        @keyframes logo-shimmer {
          0%   { background-position: -250% center; }
          100% { background-position:  250% center; }
        }
        /* Soft gold glow pulse on the logo wrapper */
        @keyframes logo-glow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(196,151,58,0.20)) brightness(1.0); }
          50%       { filter: drop-shadow(0 0 36px rgba(196,151,58,0.60)) drop-shadow(0 0 72px rgba(196,151,58,0.20)) brightness(1.18); }
        }
        /* Sparkle twinkle on individual stars */
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          40%, 60% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }

        /* Glass button hover */
        .intro-btn:hover {
          background: rgba(196,151,58,0.12) !important;
          border-color: rgba(196,151,58,0.75) !important;
          color: #C4973A !important;
          letter-spacing: 0.34em !important;
          box-shadow: 0 0 32px rgba(196,151,58,0.18), inset 0 0 20px rgba(196,151,58,0.06) !important;
        }

        /* Shimmer overlay on logo */
        .intro-logo-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .intro-logo-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            108deg,
            transparent 28%,
            transparent 38%,
            rgba(255,255,255,0.55) 50%,
            rgba(196,151,58,0.42) 56%,
            transparent 66%,
            transparent 100%
          );
          background-size: 300% 100%;
          background-position: -250% center;
          animation: logo-shimmer 9.5s ease-in-out 1.4s infinite;
          pointer-events: none;
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        overflow: 'hidden', background: '#000',
        animation: exiting ? 'intro-screen-out 0.9s ease forwards' : undefined,
      }}>

        {/* ── Background — 30% less blur, city lights more visible ── */}
        <div style={{
          position: 'absolute', inset: '-20px',
          backgroundImage: `url("${BG}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          filter: 'blur(3.5px)',
          animation: 'intro-kb 12s ease-out forwards, city-pulse 5s ease-in-out 2s infinite',
          willChange: 'transform',
        }} />

        {/* Dark veil — lighter so city lights show through more */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.54)' }} />

        {/* Bottom gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.38) 100%)' }} />

        {/* Vignette — softened edges */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.60) 100%)' }} />

        {/* Warm gold centre glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at center 50%, rgba(196,151,58,0.08) 0%, transparent 70%)' }} />

        {/* ── Content ── */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>

          {/* WELCOME */}
          <p style={{
            fontSize: 10, textTransform: 'uppercase', color: '#fff',
            fontWeight: 300, fontFamily: "'Optima','Gill Sans',sans-serif",
            marginBottom: 44, opacity: 0,
            animation: phase >= 1 ? 'intro-welcome 1.1s ease forwards' : undefined,
          }}>
            Welcome
          </p>

          {/* Brand PNG — 30% larger + shimmer wrap + glow */}
          <div
            className="intro-logo-wrap"
            style={{
              marginBottom: 36,
              opacity: 0,
              animation: phase >= 2
                ? 'intro-up 1.0s ease forwards, logo-glow 3.0s ease-in-out 1.2s infinite'
                : undefined,
            }}
          >
            <img
              src="/brand-logo-white.png"
              alt="7EVEN · HAAVN"
              draggable={false}
              style={{
                width: 'min(468px, 88vw)',
                height: 'auto',
                objectFit: 'contain',
                userSelect: 'none',
                display: 'block',
              }}
            />

            {/* Sparkle stars scattered around the logo */}
            {phase >= 2 && ([
              { top: '-10%', left: '6%',  delay: '1.6s', size: 18 },
              { top: '-6%',  left: '83%', delay: '2.1s', size: 13 },
              { top: '48%',  left: '-5%', delay: '2.8s', size: 15 },
              { top: '110%', left: '16%', delay: '1.9s', size: 12 },
              { top: '107%', left: '75%', delay: '2.5s', size: 14 },
              { top: '18%',  left: '97%', delay: '3.0s', size: 10 },
            ] as const).map((s, i) => (
              <svg
                key={i}
                viewBox="0 0 20 20"
                style={{
                  position: 'absolute',
                  top: s.top, left: s.left,
                  width: s.size, height: s.size,
                  opacity: 0,
                  animation: `sparkle 3.2s ease-in-out ${s.delay} infinite`,
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
              >
                {/* 4-point star */}
                <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z"
                  fill="#C4973A" />
              </svg>
            ))}
          </div>

          {/* Gold hairline divider */}
          <div style={{
            width: 220, height: 1,
            background: 'linear-gradient(to right, transparent, rgba(196,151,58,0.65), transparent)',
            transformOrigin: 'center',
            transform: 'scaleX(0)', opacity: 0,
            marginBottom: 20,
            animation: phase >= 3 ? 'intro-divider 0.9s ease forwards' : undefined,
          }} />

          {/* Tagline */}
          <p style={{
            fontSize: 8.5, textTransform: 'uppercase', color: '#C4973A',
            fontFamily: 'monospace', fontWeight: 500, marginBottom: 60, opacity: 0,
            animation: phase >= 3 ? 'intro-tagline 0.9s ease 0.2s forwards' : undefined,
          }}>
            Development Feasibility Studio
          </p>

          {/* Glass "Enter Studio" button */}
          <button
            className="intro-btn"
            onClick={exit}
            style={{
              padding: '14px 52px',
              fontSize: 10,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.75)',
              /* Glass effect — see-through to background */
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.22)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10)',
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'all 0.40s ease',
              opacity: 0,
              animation: phase >= 4 ? 'intro-btn-in 0.8s ease forwards' : undefined,
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
        <DesignCredit style={{ position: 'absolute', bottom: 24, left: 0, right: 0, color: 'rgba(255,255,255,0.10)' }} />
      </div>
    </>
  )
}
