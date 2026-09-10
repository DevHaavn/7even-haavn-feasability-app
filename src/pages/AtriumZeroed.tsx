import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * ATRIUM ZEROED — Daniel's feasibility model, running in isolation.
 *
 * public/atrium-zeroed.html is his file, byte for byte, plus one appended
 * bridge block. Everything here is the shell around it: projects, naming and
 * saving. None of it lives inside his page, so his layout and his engine stay
 * exactly as he built them while he develops the model.
 *
 * Storage — one row PER PROJECT, not one row for everything.
 *   atrium_zeroed_index   { activeId, projects:[{id,name,created,updated}] }
 *   atrium_zeroed:<id>    { model }
 * A model is ~50KB. Held in a single row, every keystroke-blur would rewrite
 * every project Daniel owns, and two people editing different projects would
 * overwrite each other wholesale. Per-project rows mean a save touches only
 * the project in front of you, and the index stays small enough to be free.
 *
 * Sealed off from the 7EVEN studio: its own rows, its own ids, and it never
 * reads or writes the studio's project store.
 */

const IDX_KEY = 'atrium_zeroed_index'
const rowKey = (id: string) => `atrium_zeroed:${id}`
const SRC = '/atrium-zeroed.html?v=1'

type Meta = { id: string; name: string; created: string; updated: string }
type Index = { v: 1; activeId: string | null; projects: Meta[] }

const newId = () => 'z_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))

type SaveState = 'idle' | 'saving' | 'saved' | 'offline'

export default function AtriumZeroed({ onClose }: { onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [index, setIndex] = useState<Index>({ v: 1, activeId: null, projects: [] })
  const [save, setSave] = useState<SaveState>('idle')
  const [ready, setReady] = useState(false)

  // The blank model the page ships with, captured from its first message, so
  // "New" always starts from Daniel's own template.
  const blank = useRef<unknown>(null)
  // The model currently on screen, kept out of React state — it changes on
  // every recalculation and re-rendering the shell for that would be waste.
  const model = useRef<unknown>(null)
  const idxRef = useRef(index); idxRef.current = index
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef(false)

  const writeIndex = useCallback(async (ix: Index) => {
    try { localStorage.setItem(IDX_KEY, JSON.stringify(ix)) } catch { /* private mode */ }
    const { error } = await supabase.from('capital_kv')
      .upsert({ key: IDX_KEY, value: ix, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  }, [])

  const writeModel = useCallback(async (id: string, m: unknown, keepalive = false) => {
    try { localStorage.setItem(rowKey(id), JSON.stringify(m)) } catch { /* quota */ }
    if (keepalive) {
      // On the way out there is no time for the SDK's retries — one shot,
      // flagged keepalive so the browser finishes it after the page is gone.
      const url = (supabase as unknown as { supabaseUrl: string }).supabaseUrl
      const key = (supabase as unknown as { supabaseKey: string }).supabaseKey
      await fetch(`${url}/rest/v1/capital_kv`, {
        method: 'POST', keepalive: true,
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
                   Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ key: rowKey(id), value: m, updated_at: new Date().toISOString() }]),
      })
      return
    }
    const { error } = await supabase.from('capital_kv')
      .upsert({ key: rowKey(id), value: m, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw error
  }, [])

  const flush = useCallback(async (keepalive = false) => {
    const ix = idxRef.current
    if (!ix.activeId || !pending.current) return
    pending.current = false
    try {
      await writeModel(ix.activeId, model.current, keepalive)
      setSave('saved')
    } catch (err) {
      console.warn('[zeroed] save', err)
      pending.current = true
      setSave('offline')
    }
  }, [writeModel])

  /** Writes are debounced — the model recalculates on every field change. */
  const queue = useCallback(() => {
    pending.current = true
    setSave('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), 800)
  }, [flush])

  const send = useCallback((m: unknown) => {
    model.current = m
    frame.current?.contentWindow?.postMessage({ atriumZeroed: 'load', model: m }, '*')
  }, [])

  // ── the page talks back: 'ready' once, then 'model' on every recalculation ──
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = (e.data || {}) as { atriumZeroed?: string; model?: unknown }
      if (d.atriumZeroed === 'ready') { blank.current = d.model; setReady(true); return }
      if (d.atriumZeroed !== 'model' || !d.model) return
      model.current = d.model
      if (idxRef.current.activeId) queue()
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [queue])

  // ── closing the tab must not cost the last edit ────────────────────────────
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(true) }
    window.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', () => void flush(true))
    return () => {
      window.removeEventListener('visibilitychange', onHide)
      if (timer.current) clearTimeout(timer.current)
      void flush()                       // and not on the way back to BASE either
    }
  }, [flush])

  const openProject = useCallback(async (meta: Meta) => {
    let m: unknown = null
    try {
      const { data } = await supabase.from('capital_kv').select('value').eq('key', rowKey(meta.id)).maybeSingle()
      m = data?.value ?? null
    } catch { /* fall through to local */ }
    if (!m) { try { m = JSON.parse(localStorage.getItem(rowKey(meta.id)) || 'null') } catch { /* ignore */ } }
    send(m ?? clone(blank.current))
  }, [send])

  // ── boot, once the page has handed us its blank model ─────────────────────
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    ;(async () => {
      let ix: Index | null = null
      try {
        const { data, error } = await supabase.from('capital_kv').select('value').eq('key', IDX_KEY).maybeSingle()
        if (error) throw error
        ix = (data?.value as Index) ?? null
      } catch (err) {
        console.warn('[zeroed] index', err)
        try { ix = JSON.parse(localStorage.getItem(IDX_KEY) || 'null') } catch { /* ignore */ }
        setSave('offline')
      }
      if (cancelled) return

      if (!ix?.projects?.length) {
        const meta: Meta = { id: newId(), name: 'Project 1', created: new Date().toISOString(), updated: new Date().toISOString() }
        const fresh: Index = { v: 1, activeId: meta.id, projects: [meta] }
        setIndex(fresh)
        model.current = clone(blank.current)
        try { await writeIndex(fresh); await writeModel(meta.id, model.current); setSave('saved') }
        catch { setSave('offline') }
        return                                   // the page already shows a blank model
      }
      if (!ix.projects.some(p => p.id === ix!.activeId)) ix.activeId = ix.projects[0].id
      /* Mirror the list we just pulled. Without this the offline fallback has
         models but no index, and a disconnected browser would show a fresh
         "Project 1" instead of the projects that actually exist. */
      try { localStorage.setItem(IDX_KEY, JSON.stringify(ix)) } catch { /* private mode */ }
      setIndex(ix)
      setSave('saved')
      await openProject(ix.projects.find(p => p.id === ix!.activeId)!)
    })()
    return () => { cancelled = true }
  }, [ready, writeIndex, writeModel, openProject])

  const active = index.projects.find(p => p.id === index.activeId) || null

  const commitIndex = (ix: Index) => {
    setIndex(ix)
    writeIndex(ix).catch(err => { console.warn('[zeroed] index', err); setSave('offline') })
  }

  const switchTo = async (id: string) => {
    const meta = index.projects.find(x => x.id === id)
    if (!meta || id === index.activeId) return
    await flush()                                  // never leave the old one half-saved
    commitIndex({ ...index, activeId: id })
    await openProject(meta)
  }
  const create = async (name: string, m: unknown) => {
    await flush()
    const meta: Meta = { id: newId(), name, created: new Date().toISOString(), updated: new Date().toISOString() }
    commitIndex({ ...index, activeId: meta.id, projects: [...index.projects, meta] })
    model.current = clone(m)
    send(model.current)
    try { await writeModel(meta.id, model.current); setSave('saved') } catch { setSave('offline') }
  }
  const onNew = () => { const n = prompt('Name the project:', 'New Project'); if (n !== null) void create(n.trim() || 'New Project', blank.current) }
  const onDup = () => { if (!active) return; const n = prompt('Name the copy:', active.name + ' (copy)'); if (n !== null) void create(n.trim() || active.name + ' (copy)', model.current) }
  const onRename = () => {
    if (!active) return
    const n = prompt('Rename project:', active.name); if (n === null) return
    commitIndex({ ...index, projects: index.projects.map(p => p.id === active.id ? { ...p, name: n.trim() || p.name, updated: new Date().toISOString() } : p) })
  }
  const onDelete = async () => {
    if (!active) return
    if (index.projects.length < 2) { alert('This is the only project. Create another before deleting this one.'); return }
    if (!confirm(`Delete "${active.name}"?\n\nThis removes it for everyone and cannot be undone.`)) return
    pending.current = false
    const rest = index.projects.filter(p => p.id !== active.id)
    commitIndex({ ...index, activeId: rest[0].id, projects: rest })
    supabase.from('capital_kv').delete().eq('key', rowKey(active.id))
      .then(({ error }) => { if (error) console.warn('[zeroed] delete', error.message) })
    try { localStorage.removeItem(rowKey(active.id)) } catch { /* ignore */ }
    await openProject(rest[0])
  }

  const mono = "'IBM Plex Mono',ui-monospace,monospace"
  const btn: React.CSSProperties = {
    fontFamily: mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase',
    color: '#909090', background: 'transparent', border: '1px solid #282828',
    borderRadius: 3, padding: '5px 10px', cursor: 'pointer',
  }
  const saveText = save === 'saved' ? 'saved' : save === 'saving' ? 'saving…' : save === 'offline' ? 'offline — saved on this device' : '—'
  const saveColour = save === 'saved' ? '#4CAF7D' : save === 'offline' ? '#E05555' : '#909090'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: '#0C0C0C', display: 'flex', flexDirection: 'column' }}>
      {/* Shell chrome. Everything about projects lives up here so Daniel's own
          topbar stays exactly as he designed it. */}
      <div className="no-drag" style={{ height: 36, flexShrink: 0, background: '#111', borderBottom: '1px solid #282828', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
        <button style={btn} onClick={() => { void flush(); onClose() }}>← Base</button>
        <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#B8943F' }}>Atrium Zeroed</span>
        <span style={{ width: 1, height: 18, background: '#282828' }} />
        <select
          value={index.activeId ?? ''}
          onChange={e => void switchTo(e.target.value)}
          style={{ ...btn, color: '#E8E8E8', background: '#171717', minWidth: 180, maxWidth: 280, letterSpacing: '0.04em', textTransform: 'none', fontSize: 11.5 }}>
          {index.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button style={btn} onClick={onNew}>+ New</button>
        <button style={btn} onClick={onDup}>Duplicate</button>
        <button style={btn} onClick={onRename}>Rename</button>
        <button style={btn} onClick={() => void onDelete()}>Delete</button>
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
