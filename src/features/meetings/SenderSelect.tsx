import React, { useEffect, useRef, useState } from 'react'
import { SENDERS, GROUP_LABELS, GROUP_ORDER, defaultSender, type Sender } from './senders'

// Grouped From-address dropdown, dark HM-shell styling. Keyboard + outside-click;
// Master pill shows only when boardroom@haavn.au is selected.
export default function SenderSelect({ value, onChange }: { value: Sender; onChange: (s: Sender) => void }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  // flat, group-ordered list for keyboard nav
  const flat = GROUP_ORDER.flatMap(g => SENDERS.filter(s => s.group === g))

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const pick = (s: Sender) => { onChange(s); setOpen(false) }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return }
    if (!open) return
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(flat.length - 1, a + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    if (e.key === 'Enter') { e.preventDefault(); pick(flat[active]) }
  }

  const isMaster = value.email === defaultSender().email
  const av: React.CSSProperties = { width: 26, height: 26, borderRadius: 8, background: 'rgba(111,190,150,0.14)', border: '1px solid rgba(111,190,150,0.28)', color: '#9FE1CB', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700, flex: '0 0 auto' }

  return (
    <div className="selwrap" ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen(o => !o)} onKeyDown={onKey}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: `1.5px solid ${open ? 'rgba(111,190,150,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 11, background: 'rgba(255,255,255,0.04)', cursor: 'pointer', color: '#EAEEEC', textAlign: 'left', boxShadow: open ? '0 0 0 3px rgba(35,122,82,0.18)' : 'none' }}
      >
        <span style={av}>{value.initials}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{value.name}</span>
          <span style={{ display: 'block', fontSize: 11, color: '#8B928E', fontFamily: 'monospace' }}>{value.email}</span>
        </span>
        {isMaster && <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#9FE1CB', background: 'rgba(111,190,150,0.12)', border: '1px solid rgba(111,190,150,0.25)', padding: '2px 7px', borderRadius: 100 }}>Master</span>}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#8B928E" strokeWidth="1.6" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M4 6l4 4 4-4" /></svg>
      </button>

      {open && (
        <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40, background: 'rgba(16,20,17,0.94)', backdropFilter: 'blur(22px) saturate(160%)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, boxShadow: '0 24px 60px -12px rgba(0,0,0,0.7)', padding: 6, maxHeight: 300, overflow: 'auto' }}>
          {GROUP_ORDER.map(g => (
            <div key={g}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B726E', padding: '8px 10px 4px' }}>{GROUP_LABELS[g]}</div>
              {SENDERS.filter(s => s.group === g).map(s => {
                const idx = flat.indexOf(s); const sel = s.email === value.email
                return (
                  <div key={s.email} role="option" aria-selected={sel}
                    onMouseEnter={() => setActive(idx)} onClick={() => pick(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, cursor: 'pointer', background: active === idx ? 'rgba(35,122,82,0.18)' : sel ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                    <span style={{ ...av, width: 24, height: 24, borderRadius: 7, fontSize: 9 }}>{s.initials}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#EAEEEC' }}>{s.name}</span>
                      <span style={{ display: 'block', fontSize: 11, color: '#8B928E', fontFamily: 'monospace' }}>{s.email}</span>
                    </span>
                    {sel && <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#6FBE96" strokeWidth="2"><path d="M3 8.5l3.5 3.5L13 4" /></svg>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
