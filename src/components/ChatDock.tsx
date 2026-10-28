import React, { useEffect, useRef, useState } from 'react'
import { isAuthenticated } from '../pages/PasswordGate'

/**
 * ATRIUM Chat, HIDDEN PREVIEW. Nothing here renders unless the preview is switched on in this browser:
 * open ATRIUM once with ?chat=1 (and ?chat=0 to switch it off again). It carries made-up data only, in
 * /atrium-chat.html; no real message, task or alert goes anywhere yet.
 * Shown automatically to the director (admin) login; anyone else can switch it on with ?chat=1.
 *
 * One dock for the whole app: a small chat circle (and, where a screen has no footer circle, a floating
 * one), the red count, a red banner and a soft chime when a message lands, and a glass drawer holding the chat.
 * The chat page lives in an iframe that stays loaded while the preview is on, so alerts arrive on any screen.
 */
export const CHAT_FLAG = 'atrium_chat_preview'
export const MS_KEY = 'atrium_chat_ms'          // set while a Microsoft session is known, cleared at log out
const EVT_TOGGLE = 'atrium-chat-toggle'
const EVT_COUNT = 'atrium-chat-count'
const EVT_STATE = 'atrium-chat-state'
// Is there a Microsoft session? If so the chat shows for that person, whatever their access level.
export async function learnMicrosoft(): Promise<void> {
  try {
    const r = await fetch('/api/auth/me', { credentials: 'same-origin' })
    if (r.ok) localStorage.setItem(MS_KEY, '1'); else localStorage.removeItem(MS_KEY)
  } catch { /* offline */ }
  window.dispatchEvent(new Event(EVT_STATE))
}

export function chatPreviewOn(): boolean {
  try {
    const q = new URLSearchParams(location.search)
    if (q.get('chat') === '1') localStorage.setItem(CHAT_FLAG, '1')
    if (q.get('chat') === '0') localStorage.setItem(CHAT_FLAG, '0')   // an explicit off beats the director default below
    const f = localStorage.getItem(CHAT_FLAG)
    if (f === '1') return true
    if (f === '0') return false
    if (localStorage.getItem(MS_KEY) === '1') return true               // anyone signed in with Microsoft has a real chat identity
    return localStorage.getItem('7even_role') === 'admin'            // the director login is the test group, no switch needed
  } catch { return false }
}

// The ATRIUM chat icon: the A in a ring with a speech tail, one stroke weight throughout. Under 20px the ring drops away and the bare A stands in.
export function ChatIcon({ size }: { size: number }) {
  const sw = Math.max(4, (1.2 * 240) / size)
  const f = (n: number) => n.toFixed(1)
  if (size <= 20) return <svg viewBox="0 0 240 240" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}><path d="M44 200 L120 28 L196 200" fill="none" stroke="currentColor" strokeWidth={f(sw * 1.1)} strokeLinejoin="miter" /></svg>
  const P = (d: number, r: number) => [120 + r * Math.cos((d * Math.PI) / 180), 120 + r * Math.sin((d * Math.PI) / 180)]
  const a = P(154, 110), b = P(110, 110), ap = P(132, 152), k = size < 32 ? 1.08 : 1
  const S = (x: number, y: number) => [120 + (x - 120) * k, 120 + (y - 120) * k]
  const l = S(79.24, 172), t = S(120, 68), r = S(160.76, 172)
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <path d={`M${f(a[0])} ${f(a[1])} A110 110 0 1 1 ${f(b[0])} ${f(b[1])} L${f(ap[0])} ${f(ap[1])} Z`} fill="none" stroke="currentColor" strokeWidth={f(sw)} strokeLinejoin="miter" strokeMiterlimit={6} />
      <path d={`M${f(l[0])} ${f(l[1])} L${f(t[0])} ${f(t[1])} L${f(r[0])} ${f(r[1])}`} fill="none" stroke="currentColor" strokeWidth={f(sw)} strokeLinejoin="miter" strokeMiterlimit={8} />
    </svg>
  )
}

// The small circle for a footer row. Renders nothing when the preview is off.
export function ChatButton({ color }: { color: string }) {
  const [on, setOn] = useState(chatPreviewOn)
  const [n, setN] = useState(0)
  useEffect(() => {
    const h = (e: Event) => setN((e as CustomEvent).detail?.n || 0)
    const st = () => setOn(chatPreviewOn())
    window.addEventListener(EVT_COUNT, h); window.addEventListener(EVT_STATE, st)
    return () => { window.removeEventListener(EVT_COUNT, h); window.removeEventListener(EVT_STATE, st) }
  }, [])
  if (!on) return null
  return (
    <button type="button" data-chat-btn aria-label="ATRIUM Chat" onClick={() => window.dispatchEvent(new Event(EVT_TOGGLE))}
      style={{ position: 'relative', width: 26, height: 26, borderRadius: 999, border: 0, color, background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
      <ChatIcon size={26} />
      {n > 0 && <span style={{ position: 'absolute', top: -6, right: -7, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#ef4444', color: '#fff', font: '500 10px/16px Inter, system-ui, sans-serif', textAlign: 'center', boxShadow: '0 0 10px rgba(239,68,68,.6)' }}>{n}</span>}
    </button>
  )
}

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx(); const t = ctx.currentTime
    ;[[880, 0], [1318, 0.13]].forEach(([f, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.16, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5)
      o.start(t + d); o.stop(t + d + 0.55)
    })
    setTimeout(() => ctx.close().catch(() => {}), 1200)
  } catch { /* no audio */ }
}

// every frame under the page, however deep, so a footer button inside a static page hears the count
function frames(win: Window, out: Window[] = []): Window[] {
  for (let i = 0; i < win.frames.length; i++) { try { const f = win.frames[i]; out.push(f); frames(f, out) } catch { /* cross origin */ } }
  return out
}
function footerButtonShown(): boolean {
  if (document.querySelector('[data-chat-btn]')) return true
  return frames(window).some(f => { try { return !!f.document.querySelector('[data-chat-btn]') } catch { return false } })
}

type Toast = { id: number; title: string; body: string; gid: string }

export default function ChatDock() {
  const [on, setOn] = useState(chatPreviewOn)
  const [authed, setAuthed] = useState(false)   // never on the access screen, only once signed in
  const [open, setOpen] = useState(false)
  const [n, setN] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [floating, setFloating] = useState(true)
  const [phone, setPhone] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 760px)').matches)
  const frame = useRef<HTMLIFrameElement>(null)
  const seq = useRef(0)
  const count = useRef(0)
  const wantGroup = useRef<string | null>(null)
  const wantMeeting = useRef<string | number | null>(null)
  const wantNotes = useRef<string | number | null | undefined>(undefined)

  const tell = (m: Record<string, unknown>) => frame.current?.contentWindow?.postMessage({ atriumChat: m.k, ...m }, '*')
  // On a phone the chat fills the whole screen and draws under the notch and the home bar, so it needs to know how big they are. Measured here, where env() is reliable, and handed to the chat.
  const sendInsets = () => {
    let top = 0, bottom = 0
    if (phone) {
      const p = document.createElement('div')
      p.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'
      document.body.appendChild(p); const cs = getComputedStyle(p); top = parseFloat(cs.paddingTop) || 0; bottom = parseFloat(cs.paddingBottom) || 0; p.remove()
    }
    tell({ k: 'insets', top, bottom })
  }
  const goTo = (gid: string) => { setOpen(true); wantGroup.current = gid; tell({ k: 'open-group', gid }) }
  const shout = (n: number) => frames(window).forEach(f => { try { f.postMessage({ atriumChat: 'count', n }, '*') } catch { /* gone */ } })

  useEffect(() => {
    if (!on) return
    const toggle = () => setOpen(o => !o)
    const msg = (e: MessageEvent) => {
      const d = e.data
      if (!d || !d.atriumChat) return
      // a footer button in any ATRIUM page: open or close the chat, or ask how many are waiting
      if (e.origin === location.origin && e.source !== frame.current?.contentWindow) {
        if (d.atriumChat === 'toggle') setOpen(o => !o)
        if (d.atriumChat === 'notes') { setOpen(true); wantNotes.current = d.meetingId == null ? null : d.meetingId; tell({ k: 'open-notes', meetingId: d.meetingId == null ? null : d.meetingId }); setTimeout(() => { wantNotes.current = undefined }, 8000) }
        if (d.atriumChat === 'meeting' && d.meetingId != null) { setOpen(true); wantMeeting.current = d.meetingId; tell({ k: 'open-meeting', meetingId: d.meetingId }); setTimeout(() => { wantMeeting.current = null }, 8000) }
        if (d.atriumChat === 'hello') (e.source as Window | null)?.postMessage({ atriumChat: 'count', n: count.current }, '*')
        return
      }
      if (e.source !== frame.current?.contentWindow) return
      if (d.atriumChat === 'count') { count.current = d.n || 0; setN(d.n || 0); shout(d.n || 0); try { const nv = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }; if (d.n) void nv.setAppBadge?.(d.n); else void nv.clearAppBadge?.() } catch { /* not on this device */ } window.dispatchEvent(new CustomEvent(EVT_COUNT, { detail: { n: d.n || 0 } })) }
      if (d.atriumChat === 'ask-notify' && typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission()
      if (d.atriumChat === 'close') setOpen(false)
      if (d.atriumChat === 'alert') {
        if (d.snd) chime()
        if (d.red === 0) return
        const id = ++seq.current
        setToasts(t => [{ id, title: d.title, body: d.body, gid: d.gid }, ...t].slice(0, 3))
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 7000)
        // the system notification, when the tab is in the background: tapping it comes straight back to this chat
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && (document.hidden || d.test)) {
            const nt = new Notification(d.title, { body: d.body, tag: d.gid })
            nt.onclick = () => { window.focus(); goTo(d.gid); nt.close() }
          }
        } catch { /* not allowed here */ }
      }
    }
    window.addEventListener(EVT_TOGGLE, toggle); window.addEventListener('message', msg)
    // a tap on a phone or computer notification: the alert service tells the open window which chat to show
    const swMsg = (e: MessageEvent) => { if (e.data && e.data.atriumChat === 'goto' && e.data.gid) goTo(e.data.gid) }
    navigator.serviceWorker?.addEventListener('message', swMsg)
    // a floating circle only where the screen has no footer circle of its own
    const mq = matchMedia('(max-width: 760px)'); const onMq = () => setPhone(mq.matches); mq.addEventListener('change', onMq)
    const probe = setInterval(() => { setFloating(!footerButtonShown()); setAuthed(isAuthenticated()) }, 800)
    setAuthed(isAuthenticated())
    // a link from a notification: ?chatopen=<chat id> opens the chat on that conversation
    try { const g = new URLSearchParams(location.search).get('chatopen'); if (g) { wantGroup.current = g; setOpen(true) } } catch { /* ignore */ }
    return () => { window.removeEventListener(EVT_TOGGLE, toggle); window.removeEventListener('message', msg); navigator.serviceWorker?.removeEventListener('message', swMsg); mq.removeEventListener('change', onMq); clearInterval(probe) }
  }, [on])

  useEffect(() => {
    const st = () => setOn(chatPreviewOn())
    window.addEventListener(EVT_STATE, st)
    void learnMicrosoft()
    return () => window.removeEventListener(EVT_STATE, st)
  }, [])

  useEffect(() => { tell({ k: 'visible', open }) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!on) return
    const h = () => sendInsets()
    window.addEventListener('resize', h); window.addEventListener('orientationchange', h); h()
    return () => { window.removeEventListener('resize', h); window.removeEventListener('orientationchange', h) }
  }, [on, phone]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!on) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [on])

  if (!on || !authed) return null
  const glass: React.CSSProperties = { background: 'rgba(66,68,75,.62)', WebkitBackdropFilter: 'blur(30px) saturate(1.4)', backdropFilter: 'blur(30px) saturate(1.4)', border: '1px solid rgba(255,255,255,.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), 0 24px 70px rgba(0,0,0,.4)' }
  return (
    <>
      {floating && !open && (
        <button type="button" aria-label="ATRIUM Chat" onClick={() => setOpen(true)}
          style={{ ...glass, position: 'fixed', right: 16, bottom: 'calc(54px + env(safe-area-inset-bottom))', zIndex: 9400, width: 38, height: 38, borderRadius: 999, color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}>
          <ChatIcon size={24} />
          {n > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#ef4444', color: '#fff', font: '500 11px/18px Inter, system-ui, sans-serif', textAlign: 'center', boxShadow: '0 0 12px rgba(239,68,68,.65)' }}>{n}</span>}
        </button>
      )}
      <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(20,21,24,.45)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .35s ease' }} />
      <aside aria-label="ATRIUM Chat" aria-hidden={!open}
        style={{ ...glass, position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(1080px, 100vw)', display: 'flex', flexDirection: 'column', background: phone ? 'rgba(52,54,60,.98)' : glass.background, zIndex: 9600, transform: open ? 'none' : 'translateX(104%)', transition: 'transform .5s cubic-bezier(.16,1,.3,1)', borderRadius: '28px 0 0 28px', overflow: 'hidden', visibility: open ? 'visible' : 'hidden' }}>
        <iframe ref={frame} title="ATRIUM Chat (preview)" allow="microphone" src="/atrium-chat.html?embed=1&v=20261029e" onLoad={() => { sendInsets(); tell({ k: 'visible', open }); if (wantGroup.current) tell({ k: 'open-group', gid: wantGroup.current }); if (wantMeeting.current != null) tell({ k: 'open-meeting', meetingId: wantMeeting.current }); if (wantNotes.current !== undefined) tell({ k: 'open-notes', meetingId: wantNotes.current }) }}
          style={{ width: '100%', flex: 1, minHeight: 0, border: 0, background: 'transparent', display: 'block' }} />
      </aside>
      <div style={{ position: 'fixed', top: 'calc(14px + env(safe-area-inset-top))', right: 14, zIndex: 9800, display: 'grid', gap: 10, width: 'min(380px, calc(100vw - 28px))' }}>
        {toasts.map(t => (
          <div key={t.id} onClick={() => { goTo(t.gid); setToasts(x => x.filter(y => y.id !== t.id)) }}
            style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '15px 18px', borderRadius: 24, cursor: 'pointer', background: 'rgba(88,52,56,.78)', border: '1px solid rgba(255,120,120,.55)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 14px 40px rgba(0,0,0,.35), 0 0 26px rgba(239,68,68,.45)', WebkitBackdropFilter: 'blur(26px) saturate(1.4)', backdropFilter: 'blur(26px) saturate(1.4)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', marginTop: 6, flex: 'none', boxShadow: '0 0 10px #ef4444' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 400 }}>{t.title}</div>
              <div style={{ fontSize: 13, fontWeight: 300, color: 'rgba(255,255,255,.86)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.body}</div>
              <div style={{ fontSize: 11, fontWeight: 300, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>ATRIUM Chat · now</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
