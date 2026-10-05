import React from 'react'
import { useAtriumTheme, setAtriumTheme } from '../lib/atriumTheme'

// Dark / Light switch for the gateway pages (Administration Base, Accounts Hub,
// Management Hub). Same segmented control as ATRIUM Workflow's top bar; reads and
// writes the shared `atrium_theme` setting.
export default function GatewaySeg() {
  const t = useAtriumTheme()
  return (
    <div className="agw-seg" role="group" aria-label="Theme">
      <button className={t === 'dark' ? 'on' : ''} onClick={() => setAtriumTheme('dark')}>Dark</button>
      <button className={t === 'light' ? 'on' : ''} onClick={() => setAtriumTheme('light')}>Light</button>
    </div>
  )
}
