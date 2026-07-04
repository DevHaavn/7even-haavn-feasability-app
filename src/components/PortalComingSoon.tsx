import React, { useEffect } from 'react'
import { DesignCredit, Project7Mark } from './ui'

/** Full-screen teaser for the 7EVEN Capital Director Portal.
 *  Shown from the winged device on the home screen until the portal is live. */
export default function PortalComingSoon({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'radial-gradient(ellipse 80% 60% at 50% 42%, rgba(196,151,58,0.12) 0%, rgba(10,8,4,0.82) 55%, rgba(3,3,3,0.90) 100%), url(/home-bg.jpg) center / cover no-repeat, #030303',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', cursor: 'pointer', animation: 'portal-fade-in 0.5s ease both',
      }}
    >
      <style>{`
        @keyframes portal-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes portal-rise { from { opacity: 0; transform: translateY(26px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes portal-wings-in { 0% { opacity: 0; transform: translateY(34px) scale(0.82) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes portal-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-9px) } }
        @keyframes portal-glow { 0%, 100% { filter: drop-shadow(0 0 18px rgba(196,151,58,0.25)) } 50% { filter: drop-shadow(0 0 42px rgba(216,176,96,0.55)) } }
        @keyframes portal-line { from { width: 0; opacity: 0 } to { width: 220px; opacity: 1 } }
        @keyframes portal-track { from { letter-spacing: 0.9em; opacity: 0 } to { letter-spacing: 0.34em; opacity: 1 } }
        @keyframes portal-shimmer { 0% { background-position: -240px 0 } 100% { background-position: 240px 0 } }
        @keyframes portal-pulse { 0%, 100% { border-color: rgba(196,151,58,0.35); box-shadow: 0 0 0 0 rgba(196,151,58,0.25) } 50% { border-color: rgba(216,176,96,0.85); box-shadow: 0 0 26px 2px rgba(196,151,58,0.18) } }
      `}</style>

      {/* Close */}
      <button
        onClick={onClose}
        className="glass-btn"
        style={{
          position: 'absolute', top: 24, right: 32, zIndex: 2,
          color: 'rgba(255,255,255,0.85)',
          fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '8px 16px',
          animation: 'portal-rise 0.7s 0.9s ease both',
        }}
      >
        ✕ Return to Studio
      </button>

      {/* Wings */}
      <div style={{ animation: 'portal-wings-in 1.1s cubic-bezier(0.16,1,0.3,1) both' }}>
        <img
          src="/winged-device-white.png"
          alt="7EVEN Capital"
          draggable={false}
          style={{ width: 'min(300px, 55vw)', height: 'auto', display: 'block', animation: 'portal-float 5s 1.2s ease-in-out infinite, portal-glow 4s 1.2s ease-in-out infinite' }}
        />
      </div>

      {/* Brand */}
      <p style={{ marginTop: 30, color: 'rgba(255,255,255,0.92)', fontSize: 15, letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: 'var(--font-heading)', fontWeight: 600, paddingLeft: '0.5em', animation: 'portal-rise 0.9s 0.35s ease both' }}>
        7EVEN Capital
      </p>
      <p style={{ marginTop: 8, color: '#8A6A28', fontSize: 9, letterSpacing: '0.42em', textTransform: 'uppercase', paddingLeft: '0.42em', animation: 'portal-rise 0.9s 0.5s ease both' }}>
        Director Portal
      </p>

      {/* Gold divider */}
      <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #C4973A 30%, #D8B060 50%, #C4973A 70%, transparent)', margin: '30px 0', animation: 'portal-line 1.2s 0.6s cubic-bezier(0.16,1,0.3,1) both' }} />

      {/* Tagline */}
      <h1 style={{ color: '#F0EFED', fontSize: 'clamp(20px, 3.4vw, 34px)', fontFamily: 'var(--font-heading)', fontWeight: 300, textTransform: 'uppercase', textAlign: 'center', margin: 0, padding: '0 24px', animation: 'portal-track 1.6s 0.75s cubic-bezier(0.16,1,0.3,1) both' }}>
        Precision Capital Deployed
      </h1>

      {/* Coming soon badge */}
      <div style={{ marginTop: 44, animation: 'portal-rise 0.9s 1.15s ease both' }}>
        <span style={{
          display: 'inline-block', padding: '12px 34px', borderRadius: 12,
          border: '1px solid rgba(196,151,58,0.35)',
          color: '#D8B060', fontSize: 11, letterSpacing: '0.48em', textTransform: 'uppercase', paddingLeft: 'calc(34px + 0.48em)',
          background: 'linear-gradient(100deg, rgba(196,151,58,0) 40%, rgba(216,176,96,0.16) 50%, rgba(196,151,58,0) 60%) no-repeat, rgba(196,151,58,0.05)',
          backgroundSize: '240px 100%, 100% 100%',
          animation: 'portal-pulse 3s 1.4s ease-in-out infinite, portal-shimmer 2.6s 1.4s linear infinite',
        }}>
          Coming Soon
        </span>
      </div>

      <p style={{ position: 'absolute', bottom: 34, color: '#3A3A3A', fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', animation: 'portal-rise 0.9s 1.4s ease both' }}>
        7EVEN Capital · Private Access
      </p>
      <DesignCredit style={{ position: 'absolute', bottom: 14, left: 0, right: 0, animation: 'portal-rise 0.9s 1.5s ease both' }} />
      <Project7Mark position="absolute" bottom={20} right={26} size={72} zIndex={2} />
    </div>
  )
}
