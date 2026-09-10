import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * ATRIUM ZEROED — Daniel's feasibility model, running in isolation.
 *
 * public/atrium-zeroed.html is his file, byte for byte, plus one appended
 * bridge block. Everything below is the shell around it: projects, naming and
 * saving. None of it lives inside his page, so his layout and his engine are
 * exactly as he built them and stay that way while he develops the model.
 *
 * Deliberately sealed off from the 7EVEN studio:
 *   · its own Supabase row (`atrium_zeroed_v1` in the shared capital_kv table)
 *   · its own project list, ids and names
 *   · it never reads or writes the studio's project store
 * The two run side by side until this one is ready to replace BASE.
 */

const KV_KEY = 'atrium_zeroed_v1'
const SRC = '/atrium-zeroed.html?v=1'

type Project = { id: string; name: string; created: string; updated: string; model: unknown }
type Store = { v: 1; activeId: string | null; projects: Project[] }

const newId = () => 'z_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))

type SaveState = 'idle' | 'saving' | 'saved' | 'offline'

export default function AtriumZeroed({ onClose }: { onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [store, setStore] = useState<Store>({ v: 1, activeId: null, projects: [] })
  const [save, setSave] = useState<SaveState>('idle')
  const [ready, setReady] = useState(false)

  // The blank model the page ships with — captured from its first message, so
  // "New" always starts from Daniel's own template rather than a copy of ours.
  const blank = useRef<unknown>(null)
  const storeRef = useRef(store)
  storeRef.current = store
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPushed = useRef('')

  const push = useCallback(async (s: Store) => {
    const body = JSON.stringify(s)
    if (body === lastPushed.current) { setSave('saved'); return }
    try {
      const { error } = await supabase.from('capital_kv')
        .upsert({ key: KV_KEY, value: s, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw error
      lastPushed.current = body
      setSave('saved')
    } catch (err) {
      console.warn('[zeroed] save', err)
      setSave('offline')
    }
    try { localStorage.setItem(KV_KEY, body) } catch { /* private mode */ }
  }, [])

  /** Writes are debounced — the model recalculates on every field change. */
  const queue = useCallback((s: Store) => {
    setSave('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push(s), 1200)
  }, [push])

  const send = useCallback((model: unknown) => {
    frame.current?.contentWindow?.postMessage({ atriumZeroed: 'load', model }, '*')
  }, [])

  // ── the page talks back: 'ready' once, then 'model' on every recalculation ──
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = (e.data || {}) as { atriumZeroed?: string; model?: unknown }
      if (d.atriumZeroed === 'ready') {
        blank.current = d.model
        setReady(true)
        return
      }
      if (d.atriumZeroed !== 'model' || !d.model) return
      setStore(prev => {
        if (!prev.activeId) return prev
        const next: Store = {
          ...prev,
          projects: prev.projects.map(p =>
            p.id === prev.activeId ? { ...p, model: d.model, updated: new Date().toISOString() } : p),
        }
        queue(next)
        return next
      })
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [queue])

  // ── load the row once the page has handed us its blank model ──────────────
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    ;(async () => {
      let loaded: Store | null = null
      try {
        const { data, error } = await supabase.from('capital_kv').select('value').eq('key', KV_KEY).maybeSingle()
        if (error) throw error
        if (data?.value) loaded = data.value as Store
      } catch (err) {
        console.warn('[zeroed] load', err)
        try { loaded = JSON.parse(localStorage.getItem(KV_KEY) || 'null') } catch { /* ignore */ }
        setSave('offline')
      }
      if (cancelled) return

      if (!loaded?.projects?.length) {
        const p: Project = {
          id: newId(), name: 'Project 1',
          created: new Date().toISOString(), updated: new Date().toISOString(),
          model: clone(blank.current),
        }
        const fresh: Store = { v: 1, activeId: p.id, projects: [p] }
        setStore(fresh); queue(fresh)
        return                                   // the page already shows a blank model
      }
      if (!loaded.projects.some(p => p.id === loaded!.activeId)) loaded.activeId = loaded.projects[0].id
      lastPushed.current = JSON.stringify(loaded)
      setStore(loaded)
      setSave('saved')
      send(loaded.projects.find(p => p.id === loaded!.activeId)!.model)
    })()
    return () => { cancelled = true }
  }, [ready, queue, send])

  // flush a pending write if the surface is closed mid-debounce
  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); push(storeRef.current) }
  }, [push])

  const active = store.projects.find(p => p.id === store.activeId) || null

  const switchTo = (id: string) => {
    const p = store.projects.find(x => x.id === id)
    if (!p) return
    const next = { ...store, activeId: id }
    setStore(next); queue(next); send(p.model)
  }
  const create = (name: string, model: unknown) => {
    const p: Project = {
      id: newId(), name, created: new Date().toISOString(),
      updated: new Date().toISOString(), model: clone(model),
    }
    const next: Store = { ...store, activeId: p.id, projects: [...store.projects, p] }
    setStore(next); queue(next); send(p.model)
  }
  const onNew = () => { const n = prompt('Name the project:', 'New Project'); if (n !== null) create(n.trim() || 'New Project', blank.current) }
  const onDup = () => { if (!active) return; const n = prompt('Name the copy:', active.name + ' (copy)'); if (n !== null) create(n.trim() || active.name + ' (copy)', active.model) }
  const onRename = () => {
    if (!active) return
    const n = prompt('Rename project:', active.name); if (n === null) return
    const next: Store = { ...store, projects: store.projects.map(p => p.id === active.id ? { ...p, name: n.trim() || p.name } : p) }
    setStore(next); queue(next)
  }
  const onDelete = () => {
    if (!active) return
    if (store.projects.length < 2) { alert('This is the only project. Create another before deleting this one.'); return }
    if (!confirm(`Delete "${active.name}"?\n\nThis removes it for everyone and cannot be undone.`)) return
    const rest = store.projects.filter(p => p.id !== active.id)
    const next: Store = { ...store, activeId: rest[0].id, projects: rest }
    setStore(next); queue(next); send(rest[0].model)
  }

  const mono = "'IBM Plex Mono',ui-monospace,monospace"
  const btn: React.CSSProperties = {
    fontFamily: mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: '#909090', background: 'transparent', border: '1px solid #282828',
    borderRadius: 3, padding: '5px 10px', cursor: 'pointer',
  }
  const saveText = save === 'saved' ? 'saved' : save === 'saving' ? 'saving…' : save === 'offline' ? 'offline — local only' : '—'
  const saveColour = save === 'saved' ? '#4CAF7D' : save === 'offline' ? '#E05555' : '#909090'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: '#0C0C0C', display: 'flex', flexDirection: 'column' }}>
      {/* Shell chrome. Everything about projects lives up here so Daniel's own
          topbar stays exactly as he designed it. */}
      <div className="no-drag" style={{ height: 36, flexShrink: 0, background: '#111', borderBottom: '1px solid #282828', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
        <button style={btn} onClick={onClose}>← Base</button>
        <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#B8943F' }}>Atrium Zeroed</span>
        <span style={{ width: 1, height: 18, background: '#282828' }} />
        <select
          value={store.activeId ?? ''}
          onChange={e => switchTo(e.target.value)}
          style={{ ...btn, color: '#E8E8E8', background: '#171717', minWidth: 180, maxWidth: 280, letterSpacing: '0.04em', textTransform: 'none', fontSize: 11.5 }}>
          {store.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button style={btn} onClick={onNew}>+ New</button>
        <button style={btn} onClick={onDup}>Duplicate</button>
        <button style={btn} onClick={onRename}>Rename</button>
        <button style={btn} onClick={onDelete}>Delete</button>
        <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.14em', color: saveColour, marginLeft: 4 }}>{saveText}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}>
          separate engine · own data · 7EVEN studio untouched
        </span>
      </div>
      <iframe ref={frame} src={SRC} title="ATRIUM Zeroed"
        style={{ flex: 1, width: '100%', border: 0, display: 'block' }} />
    </div>
  )
}
