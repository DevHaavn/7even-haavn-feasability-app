import React, { useEffect, useState } from 'react'
import CapitalGate from './CapitalGate'
import CapitalBase, { PillarId } from './CapitalBase'
import { pullCapitalCloud, subscribeCapitalRealtime } from '../../db/capitalCloud'

const CAPITAL_AUTH_KEY = 'capital_auth'

/** 7EVEN Capital back-of-house entry: gate first, then the Capital Base hub.
 *  Auth is held for the browser session so it isn't re-prompted every open.
 *  `initialPillar` deep-links straight into a pillar (e.g. the War Room).
 *
 *  On open we pull the shared backend BEFORE rendering, so every module's
 *  initial read already sees the team's live data. Realtime then keeps the
 *  local cache warm in the background — a teammate's edit shows the next time
 *  you switch view, without yanking you out of what you're doing. */
export default function CapitalPortal({ onClose, initialPillar }: { onClose: () => void; initialPillar?: PillarId }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(CAPITAL_AUTH_KEY) === '1')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!authed) return
    let live = true
    // Reveal after the pull resolves (or a short beat, so a hung network never blocks).
    pullCapitalCloud().then(() => { if (live) setReady(true) })
    const t = setTimeout(() => { if (live) setReady(true) }, 1500)
    // localStorage is refreshed by the pull inside the subscription; broadcast so
    // any open module (e.g. Budgets/Admin) can re-read and show teammates' edits live.
    const unsub = subscribeCapitalRealtime(() => { window.dispatchEvent(new CustomEvent('capital-cloud-updated')) })
    return () => { live = false; clearTimeout(t); unsub() }
  }, [authed])

  if (!authed) {
    return <CapitalGate onAuth={() => { sessionStorage.setItem(CAPITAL_AUTH_KEY, '1'); setAuthed(true) }} onClose={onClose} />
  }

  if (!ready) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: '#030303', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Chakra Petch', sans-serif", color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          Syncing Capital Base…
        </p>
      </div>
    )
  }

  return (
    <CapitalBase
      onClose={onClose}
      initialPillar={initialPillar}
      onLogout={() => { sessionStorage.removeItem(CAPITAL_AUTH_KEY); setAuthed(false) }}
    />
  )
}
