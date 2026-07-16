import React, { useEffect, useState } from 'react'
import { AtriumApex } from './AtriumMark'

// Captures the browser's install prompt so we can offer a branded
// "Add to Desktop" button. Falls back to manual instructions on
// browsers that don't fire beforeinstallprompt (Safari/iOS).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true
}

// Users who installed the old (winged 7EVEN|HAAVN) app keep that icon until they
// re-install. We nudge them once, then remember they've seen it.
const REINSTALL_KEY = 'atrium_icon_reinstall_ack'

export default function InstallButton({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone())
  const [showHelp, setShowHelp] = useState(false)
  const [reinstall, setReinstall] = useState(false)
  const [ack, setAck] = useState(() => { try { return localStorage.getItem(REINSTALL_KEY) === '1' } catch { return false } })

  useEffect(() => {
    function onPrompt(e: Event) { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent) }
    function onInstalled() { setInstalled(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function ackReinstall() { try { localStorage.setItem(REINSTALL_KEY, '1') } catch { /* ignore */ }; setAck(true) }

  // ── Already installed: nudge once to re-install for the new ATRIUM icon ──────────
  if (installed) {
    if (ack) return null
    return (
      <>
        <div className="no-drag" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, borderRadius: 999, border: '1px solid rgba(220,232,244,0.28)', background: 'rgba(24,34,48,0.55)', backdropFilter: 'blur(10px) saturate(1.2)', WebkitBackdropFilter: 'blur(10px) saturate(1.2)', overflow: 'hidden' }}>
          <button onClick={() => { setReinstall(true); setShowHelp(true) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C6CDCF', fontSize: compact ? 8 : 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, padding: compact ? '5px 10px' : '7px 14px', whiteSpace: 'nowrap' }}>
            ↻&nbsp; New ATRIUM icon — update
          </button>
          <button onClick={ackReinstall} aria-label="Dismiss"
            style={{ background: 'none', border: 'none', borderLeft: '1px solid rgba(220,232,244,0.18)', cursor: 'pointer', color: '#8A96A2', fontSize: 11, padding: '6px 10px', lineHeight: 1 }}>✕</button>
        </div>
        {showHelp && <Help reinstall onClose={() => setShowHelp(false)} onGotIt={() => { ackReinstall(); setShowHelp(false) }} />}
      </>
    )
  }

  async function handleClick() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    } else {
      setReinstall(false)
      setShowHelp(true)
    }
  }

  return (
    <>
      <button onClick={handleClick} className="glass-btn glass-btn-gold no-drag"
        style={{
          padding: compact ? '5px 12px' : '9px 20px',
          fontSize: compact ? 8 : 9.5, letterSpacing: '0.24em',
          textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap',
        }}>
        ⌱&nbsp; Add to Desktop
      </button>

      {showHelp && <Help reinstall={reinstall} onClose={() => setShowHelp(false)} onGotIt={() => setShowHelp(false)} />}
    </>
  )
}

// ── Instructions modal — ATRIUM branded ─────────────────────────────────────────
function Help({ reinstall, onClose, onGotIt }: { reinstall?: boolean; onClose: () => void; onGotIt: () => void }) {
  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'linear-gradient(to bottom, rgba(10,14,20,0.55), rgba(8,11,16,0.72)), url(/renders/tower-hero.jpg) center / cover no-repeat, #05070a',
      }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <AtriumApex size={78} variant="compact" flash bright style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.45)) drop-shadow(0 10px 26px rgba(0,0,0,0.4))' }} />
        <span style={{ color: '#EEF1F2', fontFamily: "'Inter Tight', var(--font-heading), system-ui, sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: '0.30em', paddingLeft: '0.30em', textShadow: '0 2px 18px rgba(0,0,0,0.5)' }}>ATRIUM</span>
      </div>

      <div onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: 460, padding: '34px 38px 30px',
          border: '1px solid rgba(220,232,244,0.22)', borderRadius: 20, overflow: 'hidden',
          background: 'rgba(44,60,78,0.52)', backdropFilter: 'blur(30px) saturate(1.25)', WebkitBackdropFilter: 'blur(30px) saturate(1.25)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 28px 70px rgba(30,44,62,0.4)',
        }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(to right, transparent, #C6CDCF 30%, #EEF1F2 50%, #9AA2A4 72%, transparent)' }} />

        <p style={{ color: '#E8C87A', fontSize: 9.5, letterSpacing: '0.30em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 18, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          {reinstall ? 'Update the app icon' : 'Add to Desktop'}
        </p>

        {reinstall && (
          <p style={{ color: '#EEF1F2', fontSize: 12.5, lineHeight: 1.7, marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(35,122,82,0.14)', border: '1px solid rgba(111,190,150,0.28)' }}>
            You have an earlier version installed with the old icon. <strong>Remove it</strong> from your dock / home screen first, then install again below to get the new ATRIUM icon.
          </p>
        )}

        <div style={{ color: '#AEB6B8', fontSize: 12.5, lineHeight: 1.85 }}>
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#EEF1F2' }}>Chrome / Edge:</strong><br/>Click the install icon in the address bar, or the browser menu → <em>“Install ATRIUM…”</em>.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#EEF1F2' }}>Safari (Mac):</strong><br/>Menu bar → File → <em>“Add to Dock”</em>.</p>
          <p><strong style={{ color: '#EEF1F2' }}>iPhone / iPad:</strong><br/>Share → <em>“Add to Home Screen”</em>.</p>
        </div>

        <button onClick={onGotIt}
          style={{ marginTop: 24, width: '100%', padding: '13px 0', fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase', fontWeight: 700, color: '#EEF1F2', cursor: 'pointer', borderRadius: 12, border: '1px solid rgba(220,232,244,0.28)', background: 'linear-gradient(180deg, rgba(150,172,196,0.32), rgba(120,146,172,0.14))', backdropFilter: 'blur(10px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.30)' }}>
          Got it
        </button>
      </div>
    </div>
  )
}
