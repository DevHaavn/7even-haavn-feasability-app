import React, { useEffect, useState } from 'react'

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

export default function InstallButton({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone())
  const [showHelp, setShowHelp] = useState(false)

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

  if (installed) return null

  async function handleClick() {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    } else {
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

      {showHelp && (
        <div onClick={() => setShowHelp(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(196,151,58,0.10) 0%, rgba(10,8,4,0.88) 55%, rgba(3,3,3,0.96) 100%), #030303',
          }}>
          <img src="/winged-device-white.png" alt="7EVEN" draggable={false}
            style={{ width: 'min(180px, 40vw)', height: 'auto', marginBottom: 26, filter: 'drop-shadow(0 0 28px rgba(216,176,96,0.35))' }} />

          <div onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 440, padding: '34px 38px 30px',
              border: '1px solid rgba(255,255,255,0.18)', borderRadius: 18, overflow: 'hidden',
              background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 24px 60px rgba(0,0,0,0.45)',
            }}>
            <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 10, letterSpacing: '0.34em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 20, textAlign: 'center', paddingLeft: '0.34em' }}>
              Add to Desktop
            </p>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5, lineHeight: 1.85 }}>
              <p style={{ marginBottom: 12 }}><strong style={{ color: 'rgba(255,255,255,0.92)' }}>Chrome / Edge:</strong><br/>Click the install icon in the address bar, or the browser menu → <em>“Install 7EVEN&nbsp;HAAVN…”</em>.</p>
              <p style={{ marginBottom: 12 }}><strong style={{ color: 'rgba(255,255,255,0.92)' }}>Safari (Mac):</strong><br/>Menu bar → File → <em>“Add to Dock”</em>.</p>
              <p><strong style={{ color: 'rgba(255,255,255,0.92)' }}>iPhone / iPad:</strong><br/>Share → <em>“Add to Home Screen”</em>.</p>
            </div>
            <button onClick={() => setShowHelp(false)} className="glass-btn glass-btn-gold"
              style={{ marginTop: 24, width: '100%', padding: '13px 0', fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase', fontWeight: 700 }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
