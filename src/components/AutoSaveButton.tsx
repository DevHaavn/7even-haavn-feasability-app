import React, { useEffect, useRef, useState } from 'react'
import { onSave } from '../lib/saveSignal'

/**
 * Header auto-save indicator — electric glass-blue button that flashes green each
 * time any tab auto-saves, then settles back to blue. Sits left of the Dashboard
 * button. Non-interactive status pill (styled as a button for consistency).
 */
export default function AutoSaveButton() {
  const [saving, setSaving] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => onSave(() => {
    setSaving(true)
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => setSaving(false), 950)
  }), [])

  return (
    <button
      className={saving ? 'ws-autosave-btn saving' : 'ws-autosave-btn'}
      title={saving ? 'Auto-saving…' : 'Auto-save on'}
      aria-label="Auto-save"
      tabIndex={-1}
    >
      {/* Cloud + circular sync arrows — electric neon glyph */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.5 18.5h9.2a3.4 3.4 0 0 0 .55-6.75A5 5 0 0 0 8 9.6a3.45 3.45 0 0 0-.5 8.9z" />
        <path className="ws-as-arrow" d="M9.6 13.1a3 3 0 0 1 5-1.2l.9.9" />
        <polyline className="ws-as-arrow" points="15.6 10.6 15.6 12.8 13.4 12.8" />
        <path className="ws-as-arrow" d="M15 15.1a3 3 0 0 1-5 1.2l-.9-.9" />
        <polyline className="ws-as-arrow" points="9 17.6 9 15.4 11.2 15.4" />
      </svg>
    </button>
  )
}
