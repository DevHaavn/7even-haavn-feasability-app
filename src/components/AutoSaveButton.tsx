import React, { useEffect, useRef, useState } from 'react'
import { onSave } from '../lib/saveSignal'

/**
 * Auto-save pill — the ATRIUM autosave indicator (same as the admin): a small
 * carbon pill with a dot that reads "Autosave on" and pulses green "Saved" each
 * time any tab auto-saves, then settles. Replaces the old cloud glyph.
 */
export default function AutoSaveCloud() {
  const [saving, setSaving] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => onSave(() => {
    setSaving(true)
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => setSaving(false), 1200)
  }), [])

  return (
    <span className={saving ? 'ws-autosave-pill saving' : 'ws-autosave-pill'} title={saving ? 'Saved' : 'Autosave on'} aria-label="Auto-save">
      <span className="dot" />
      {saving ? 'Saved' : 'Autosave on'}
    </span>
  )
}
