import React, { useEffect, useRef, useState } from 'react'
import { onSave } from '../lib/saveSignal'

/**
 * Auto-save cloud — just a cloud glyph (no button/box) sitting in front of the
 * project address. It flashes green each time any tab auto-saves, then settles.
 */
export default function AutoSaveCloud() {
  const [saving, setSaving] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => onSave(() => {
    setSaving(true)
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => setSaving(false), 950)
  }), [])

  return (
    <span className={saving ? 'ws-autosave-cloud saving' : 'ws-autosave-cloud'} title={saving ? 'Auto-saving…' : 'Auto-save on'} aria-label="Auto-save">
      {/* Cloud + circular sync arrows — 35% bigger */}
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.5 18.5h9.2a3.4 3.4 0 0 0 .55-6.75A5 5 0 0 0 8 9.6a3.45 3.45 0 0 0-.5 8.9z" />
        <path d="M9.6 13.1a3 3 0 0 1 5-1.2l.9.9" />
        <polyline points="15.6 10.6 15.6 12.8 13.4 12.8" />
        <path d="M15 15.1a3 3 0 0 1-5 1.2l-.9-.9" />
        <polyline points="9 17.6 9 15.4 11.2 15.4" />
      </svg>
    </span>
  )
}
