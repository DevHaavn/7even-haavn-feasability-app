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
const SRC = '/atrium-zeroed.html?v=9'

type Meta = { id: string; name: string; created: string; updated: string }
type Index = { v: 1; activeId: string | null; projects: Meta[] }

const newId = () => 'z_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o))

type SaveState = 'idle' | 'saving' | 'saved' | 'offline'

/* The cloud pill. Daniel needs to be able to glance up and know the row went
   to Supabase — a static word doesn't tell you that, so the dot pulses gold
   while a write is in flight and the whole pill flashes green as it lands. */
const PILL_CSS = `
@keyframes azDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.18;transform:scale(.55)} }
@keyframes azFlash {
  0%   { background:rgba(47,224,122,.30); box-shadow:0 0 0 0 rgba(47,224,122,.55), 0 0 24px 2px rgba(47,224,122,.65) }
  100% { background:rgba(47,224,122,.07); box-shadow:0 0 0 11px rgba(47,224,122,0), 0 0 0 0 rgba(47,224,122,0) }
}
.az-pill{display:inline-flex;align-items:center;gap:7px;height:22px;padding:0 11px;border-radius:11px;
  font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;
  border:1px solid;cursor:pointer;user-select:none;white-space:nowrap;transition:border-color .2s}
.az-pill .az-dot{width:6px;height:6px;border-radius:50%;flex:none;background:currentColor;box-shadow:0 0 7px currentColor}
.az-pill .az-t{opacity:.6;letter-spacing:.08em}
.az-idle{color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.3);background:transparent}
.az-saving{color:#D6B36A;border-color:rgba(214,179,106,.52);background:rgba(214,179,106,.10)}
.az-saving .az-dot{animation:azDot .7s ease-in-out infinite}
.az-saved{color:#2FE07A;border-color:rgba(47,224,122,.42);background:rgba(47,224,122,.07);
  animation:azFlash .95s cubic-bezier(.2,.7,.3,1)}
.az-offline{color:#E05555;border-color:rgba(224,85,85,.52);background:rgba(224,85,85,.10)}
.az-offline .az-dot{animation:azDot .5s steps(1,end) infinite}
`

/* The shell (Jamie, 11 Sep): the flat HAAVN grey ground, and ONE floating
   island in a right angle — header across the top, nav down the left — with
   the 7EVEN main-page video behind it, dimmed and vignetted exactly as the
   home page. The shell's controls are the island's top row. The iframe sits
   over the island: Daniel's top bar (the second row) and his nav are drawn
   see-through, and his working area is the grey panel tucked into the inside
   corner, so the video shows only in the L. Buttons, dropdown and pill are the
   main menu's clear glass: no fill, a thin light outline, a soft glow on
   hover; the title is lit gold like the menu's lit row. The project dropdown
   opens as see-through frosted glass over the engine. */
const ISLAND_TOP = 10, ROW = 46
const SHELL_CSS = `
.azs{position:fixed;inset:0;z-index:9500;background:#d7d4ce}
.azs-isle{position:absolute;top:${ISLAND_TOP}px;left:12px;right:12px;bottom:10px;border-radius:12px;overflow:hidden;
  background:#0a0b0c;border:1px solid rgba(255,255,255,.16);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 18px 34px -20px rgba(0,0,0,.7)}
.azs-isle video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.azs-dim{position:absolute;inset:0;pointer-events:none;background:rgba(0,0,0,.56)}
.azs-vign{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 42%, transparent 40%, rgba(0,0,0,.55) 100%)}
.azs-hl{position:absolute;left:18px;right:18px;top:${ROW}px;height:1px;background:rgba(255,255,255,.14);pointer-events:none}
.azs-bar{position:absolute;top:${ISLAND_TOP}px;left:12px;right:12px;height:${ROW}px;z-index:2;padding:0 18px;
  display:flex;align-items:center;gap:8px}
.azs-btn{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.22em;text-transform:uppercase;
  color:rgba(255,255,255,.82);background:transparent;border:1px solid rgba(255,255,255,.32);border-radius:2px;
  padding:7px 12px;cursor:pointer;transition:.25s}
.azs-btn:hover{color:#fff;border-color:rgba(255,255,255,.75);background:rgba(255,255,255,.08);box-shadow:0 0 26px -12px rgba(255,255,255,.5)}
.azs-dd{position:relative}
.azs-sel{display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:'Inter',system-ui,sans-serif;font-size:11.5px;
  color:#fff;background:transparent;border:1px solid rgba(255,255,255,.3);border-radius:2px;padding:6px 10px;
  min-width:200px;max-width:300px;cursor:pointer;transition:.25s;text-align:left}
.azs-sel span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.azs-sel i{font-style:normal;font-size:8px;opacity:.7;transition:transform .25s}
.azs-sel:hover,.azs-sel.open{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.65);box-shadow:0 0 24px -10px rgba(255,255,255,.45)}
.azs-sel.open i{transform:rotate(180deg)}
.azs-menu{position:absolute;top:calc(100% + 8px);left:0;min-width:100%;max-width:360px;max-height:60vh;overflow-y:auto;z-index:20;
  padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.22);
  background:rgba(14,15,17,.38);-webkit-backdrop-filter:blur(18px) saturate(1.25);backdrop-filter:blur(18px) saturate(1.25);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 22px 44px -18px rgba(0,0,0,.75);animation:azsIn .18s ease-out}
@keyframes azsIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.azs-menu button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;margin:0 0 6px;padding:9px 12px;cursor:pointer;
  font-family:'Inter',system-ui,sans-serif;font-size:11.5px;color:rgba(255,255,255,.9);white-space:nowrap;
  background:transparent;border:1px solid rgba(255,255,255,.26);border-radius:2px;transition:.25s;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.azs-menu button:last-child{margin-bottom:0}
.azs-menu button:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.65);box-shadow:0 0 24px -10px rgba(255,255,255,.45)}
.azs-menu button.on{color:#fff;background:rgba(214,179,106,.06);border-color:#d6b36a;
  box-shadow:0 0 9px rgba(244,227,189,.5),0 0 22px rgba(214,179,106,.3),inset 0 0 9px rgba(214,179,106,.22)}
.azs-menu button b{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:400;font-size:8.5px;letter-spacing:.2em;color:rgba(255,255,255,.45)}
.azs-menu button.on b{color:#d6b36a}
.azs-t{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9.5px;letter-spacing:.26em;text-transform:uppercase;
  color:#d6b36a;padding:7px 13px;border:1px solid #d6b36a;border-radius:2px;background:rgba(214,179,106,.05);
  text-shadow:0 0 8px rgba(244,227,189,.9),0 0 20px rgba(214,179,106,.6);
  box-shadow:0 0 9px rgba(244,227,189,.55),0 0 26px rgba(214,179,106,.35),inset 0 0 9px rgba(214,179,106,.24)}
.azs-dv{width:1px;height:18px;background:rgba(255,255,255,.22);margin:0 4px}
.azs-note{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.45)}
.azs-frame{position:absolute;top:${ISLAND_TOP + ROW}px;left:0;right:0;bottom:0;width:100%;height:calc(100% - ${ISLAND_TOP + ROW}px);
  z-index:1;border:0;display:block;background:transparent;color-scheme:light}
`

const PILL: Record<SaveState, { cls: string; label: string }> = {
  idle:    { cls: 'az-idle',    label: 'Cloud · standby' },
  saving:  { cls: 'az-saving',  label: 'Saving to cloud' },
  saved:   { cls: 'az-saved',   label: 'Cloud saved' },
  offline: { cls: 'az-offline', label: 'Offline · device only' },
}

export default function AtriumZeroed({ onClose }: { onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const [index, setIndex] = useState<Index>({ v: 1, activeId: null, projects: [] })
  const [save, setSave] = useState<SaveState>('idle')
  const [ready, setReady] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [writes, setWrites] = useState(0)   // also re-keys the pill so the flash replays

  // The blank model the page ships with, captured from its first message, so
  // "New" always starts from Daniel's own template.
  const blank = useRef<unknown>(null)
  // The model currently on screen, kept out of React state — it changes on
  // every recalculation and re-rendering the shell for that would be waste.
  const model = useRef<unknown>(null)
  const idxRef = useRef(index); idxRef.current = index
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef(false)
  const [menu, setMenu] = useState(false)   // the glass project dropdown

  /** A row actually landed in Supabase. `stamp` is false on boot, where the
      state is "already saved" but no write of ours produced it. */
  const markSaved = useCallback((stamp = true) => {
    setSave('saved')
    if (stamp) { setSavedAt(new Date()); setWrites(n => n + 1) }
  }, [])

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
      markSaved()
    } catch (err) {
      console.warn('[zeroed] save', err)
      pending.current = true
      setSave('offline')
    }
  }, [writeModel, markSaved])

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
        try { await writeIndex(fresh); await writeModel(meta.id, model.current); markSaved() }
        catch { setSave('offline') }
        return                                   // the page already shows a blank model
      }
      if (!ix.projects.some(p => p.id === ix!.activeId)) ix.activeId = ix.projects[0].id
      /* Mirror the list we just pulled. Without this the offline fallback has
         models but no index, and a disconnected browser would show a fresh
         "Project 1" instead of the projects that actually exist. */
      try { localStorage.setItem(IDX_KEY, JSON.stringify(ix)) } catch { /* private mode */ }
      setIndex(ix)
      markSaved(false)                     // already in the cloud, but not by us
      await openProject(ix.projects.find(p => p.id === ix!.activeId)!)
    })()
    return () => { cancelled = true }
  }, [ready, writeIndex, writeModel, openProject, markSaved])

  const active = index.projects.find(p => p.id === index.activeId) || null

  /* The page's header title reads the project name from here (the address it
     reads from its own Land & Terms). A display-only message — it never
     triggers a recalculation, so it never causes a save. */
  const activeName = active?.name ?? ''
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ atriumZeroed: 'meta', name: activeName }, '*')
  }, [ready, activeName])

  /* Close the dropdown on Escape, or on any click — including one inside the
     engine, which lands in the iframe and shows up here as the window blurring. */
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('blur', close); window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', close)
    return () => { window.removeEventListener('blur', close); window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', close) }
  }, [menu])

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
    try { await writeModel(meta.id, model.current); markSaved() } catch { setSave('offline') }
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

  const pill = PILL[save]
  const stamp = savedAt ? savedAt.toLocaleTimeString('en-AU', { hour12: false }) : ''
  const pillTitle = save === 'offline'
    ? 'Supabase is unreachable. Your work is held on this device and will be pushed on the next successful save. Click to retry now.'
    : `Supabase · capital_kv · ${index.activeId ? rowKey(index.activeId) : '—'}`
      + (savedAt ? `\nLast write ${stamp} · ${writes} this session` : '')
      + '\nClick to save now.'

  return (
    <div className="azs">
      <style>{SHELL_CSS + PILL_CSS}</style>
      {/* The island: the home-page video runs behind the header and the nav. */}
      <div className="azs-isle" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="metadata" src="/haavn-black-bg.mp4" />
        <div className="azs-dim" />
        <div className="azs-vign" />
        <div className="azs-hl" />
      </div>
      {/* Shell chrome. Everything about projects lives up here so Daniel's own
          topbar stays exactly as he designed it. */}
      <div className="no-drag azs-bar">
        <button className="azs-btn" onClick={() => { void flush(); onClose() }}>← Base</button>
        <span className="azs-t">Atrium Engine</span>
        <span className="azs-dv" />
        <div className="azs-dd" onPointerDown={e => e.stopPropagation()}>
          <button className={`azs-sel${menu ? ' open' : ''}`} onClick={() => setMenu(m => !m)}
                  aria-haspopup="listbox" aria-expanded={menu}>
            <span>{active?.name ?? '—'}</span><i>▼</i>
          </button>
          {menu && (
            <div className="azs-menu" role="listbox">
              {index.projects.map((p, n) => (
                <button key={p.id} role="option" aria-selected={p.id === index.activeId}
                        className={p.id === index.activeId ? 'on' : ''}
                        onClick={() => { setMenu(false); void switchTo(p.id) }}>
                  <b>{String(n + 1).padStart(2, '0')}</b>{p.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="azs-btn" onClick={onNew}>+ New</button>
        <button className="azs-btn" onClick={onDup}>Duplicate</button>
        <button className="azs-btn" onClick={onRename}>Rename</button>
        <button className="azs-btn" onClick={() => void onDelete()}>Delete</button>
        <span style={{ flex: 1 }} />
        <span className="azs-note">separate engine · own data · 7EVEN studio untouched</span>
        {/* Remounted on every write so the flash animation replays. */}
        <div key={`${save}-${writes}`} className={`az-pill ${pill.cls}`} title={pillTitle}
             onClick={() => { pending.current = true; void flush() }}>
          <span className="az-dot" />
          <span>{pill.label}</span>
          {save === 'saved' && stamp && <span className="az-t">{stamp}</span>}
        </div>
      </div>
      <iframe ref={frame} src={SRC} title="ATRIUM Engine" className="azs-frame" />
    </div>
  )
}
