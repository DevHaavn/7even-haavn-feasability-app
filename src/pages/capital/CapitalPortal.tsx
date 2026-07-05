import React, { useState } from 'react'
import CapitalGate from './CapitalGate'
import CapitalBase from './CapitalBase'

const CAPITAL_AUTH_KEY = 'capital_auth'

/** 7EVEN Capital back-of-house entry: gate first, then the Capital Base hub.
 *  Auth is held for the browser session so it isn't re-prompted every open. */
export default function CapitalPortal({ onClose }: { onClose: () => void }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(CAPITAL_AUTH_KEY) === '1')

  if (!authed) {
    return <CapitalGate onAuth={() => { sessionStorage.setItem(CAPITAL_AUTH_KEY, '1'); setAuthed(true) }} onClose={onClose} />
  }
  return <CapitalBase onClose={onClose} onLogout={() => { sessionStorage.removeItem(CAPITAL_AUTH_KEY); setAuthed(false) }} />
}
