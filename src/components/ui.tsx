import React from 'react'

// ── Brand mark ───────────────────────────────────────────────────────────────

export function Wordmark({ size = 'md', tone = 'white' }: { size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'; tone?: 'white' | 'black' }) {
  const widths = { sm: 83, md: 117, lg: 156, xl: 208 }
  // tone='black' blackens the white logo art while preserving its alpha edges.
  const toneFilter = tone === 'black' ? 'brightness(0)' : undefined
  // Hero uses the tight-cropped asset: the full PNG is ~60% transparent padding,
  // which pushed the content below far away from the visible logos. Width is
  // scaled so the visible art renders the same size as before.
  if (size === 'hero') {
    return (
      <img
        src="/brand-logo-white-tight.png"
        alt="7EVEN · HAAVN"
        draggable={false}
        className="select-none hero-wm"
        style={{ width: 'min(229px, 36vw)', height: 'auto', objectFit: 'contain' }}
      />
    )
  }
  return (
    <img
      src="/brand-logo-white.png"
      alt="7EVEN · HAAVN"
      draggable={false}
      // atr-wm is a styling hook only: inside the studio the art has to invert on
      // the light surface (the source PNG is white, so it was invisible there).
      // It is inert everywhere else, and inert when tone='black' sets a filter inline.
      className="select-none atr-wm"
      style={{ width: widths[size], height: 'auto', objectFit: 'contain', filter: toneFilter }}
    />
  )
}

// ── Design credit ─────────────────────────────────────────────────────────────

export function DesignCredit({ style }: { style?: React.CSSProperties }) {
  return (
    <p style={{
      color: 'rgba(255,255,255,0.30)', fontSize: 7, letterSpacing: '0.24em',
      textTransform: 'uppercase', fontWeight: 400, textAlign: 'center',
      padding: '0 12px', lineHeight: 1.7, margin: 0, ...style,
    }}>
      Design &amp; Interface © {new Date().getFullYear()} JB Design × Studio · All Rights Reserved
    </p>
  )
}

// ── Project 7 — not-for-profit mark, sits quietly in the bottom-right corner ──

export function Project7Mark({ position = 'fixed', bottom = 14, right = 20, size = 66, zIndex = 300 }: {
  position?: 'fixed' | 'absolute'; bottom?: number; right?: number; size?: number; zIndex?: number
}) {
  return (
    <img
      src="/p7-device-chrome.png"
      alt="Project 7"
      title="Project 7 — 7EVEN not-for-profit"
      draggable={false}
      className="select-none p7-mark"
      style={{ position, bottom, right, width: size, height: 'auto', zIndex, opacity: 0.9, pointerEvents: 'none' }}
    />
  )
}

// ── Panel / Card ──────────────────────────────────────────────────────────────

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[var(--border,#E8E4DE)] bg-white ${className}`} style={{ borderRadius: 0, boxShadow: '0 2px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(255,255,255,0.9) inset' }}>
      {children}
    </div>
  )
}

export function Card({ children, className = '', dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={`border border-[var(--border,#E8E4DE)] ${dark ? 'bg-[#F5F3F0]' : 'bg-white'} ${className}`} style={{ borderRadius: 0, boxShadow: '0 2px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(255,255,255,0.9) inset' }}>
      {children}
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

export function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5 cursor-default" style={{ paddingLeft: 2 }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 34, fontWeight: 500, letterSpacing: '0.01em', lineHeight: 1, color: 'var(--fx-ink, #141414)' }}>{children}</h2>
      {/* ATRIUM livery — green nib running into brushed silver */}
      <div style={{ height: 2, borderRadius: 2, width: 54, marginTop: 9, background: 'linear-gradient(to right, #237A52, #9AA2A4 60%, transparent)' }} />
      {sub && <p style={{ color: 'var(--fx-ink-2, #666)', fontSize: 12.5, marginTop: 9 }}>{sub}</p>}
    </div>
  )
}

// ── Label ─────────────────────────────────────────────────────────────────────

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[var(--fx-ink-2,#505050)] text-[10px] tracking-[0.15em] uppercase font-medium">{children}</span>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'xs' | 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center gap-2 font-body font-medium tracking-[0.08em] transition-all duration-150 cursor-pointer no-drag uppercase text-[10px]'
  const sizes = {
    xs: 'px-2.5 py-1',
    sm: 'px-4 py-1.5',
    md: 'px-5 py-2',
  }
  const variants = {
    primary:   'bg-[#1A1A1A] text-white hover:bg-[#333] active:scale-95',
    secondary: 'bg-transparent border border-[var(--border-hi,#C8C5C0)] text-[var(--fx-ink-2,#666)] hover:border-[var(--fx-ink,#1A1A1A)] hover:text-[var(--fx-ink,#1A1A1A)]',
    outline:   'bg-transparent border border-white/80 text-white hover:bg-white hover:text-black',
    ghost:     'text-[var(--ink-3,#888)] hover:text-[var(--fx-ink,#1A1A1A)] hover:bg-[#F0EEE9]',
    danger:    'bg-transparent border border-[var(--red,#B4553F)]/40 text-[var(--red,#B4553F)] hover:bg-[var(--red,#B4553F)] hover:text-white',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} style={{ borderRadius: 0 }} {...props}>
      {children}
    </button>
  )
}

// ── Field row ─────────────────────────────────────────────────────────────────

export function FieldRow({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="field-row-mobile fx-frow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '11px 0', borderTop: '1px solid var(--fx-line, #E8E5E0)' }}>
      <label style={{ fontSize: 12.5, color: 'var(--fx-ink-2, #888)' }}>
        {label}{note && <small style={{ display: 'block', fontSize: 10, color: 'var(--fx-faint, #AAA)', marginTop: 2, letterSpacing: '0.02em' }}>{note}</small>}
      </label>
      <div className="no-drag" style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

// Australian date format — day / month / year (e.g. "1 Mar 2027"). Single source of truth.
export function fmtAuDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Native date input + an unambiguous AU (DD/MM/YYYY) readout beneath it. The native
// picker's displayed format follows the browser locale (which can be US) and cannot be
// overridden, so we always show the Australian reading so dates are never misread.
export function DateField({ value, onChange, style, dark = false }: {
  value: string; onChange: (v: string) => void; style?: React.CSSProperties; dark?: boolean
}) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <input type="date" lang="en-AU" value={value || ''} onChange={e => onChange(e.target.value)} style={style} />
      {value && (
        <span style={{ fontSize: 9, letterSpacing: '0.08em', color: dark ? 'var(--ink-3,#8A8A8A)' : 'var(--ink-3,#A5A29C)', whiteSpace: 'nowrap' }}>
          {fmtAuDate(value)} <span style={{ opacity: 0.6 }}>· DD/MM/YYYY</span>
        </span>
      )}
    </span>
  )
}

export function NumberInput({ value, onChange, prefix, suffix, step, min }: {
  value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; step?: number; min?: number
}) {
  return (
    <div className="flex items-center gap-2">
      {prefix && <span style={{ color: 'var(--ink-3, #AAA)', fontSize: 12, fontFamily: 'var(--mono, monospace)' }}>{prefix}</span>}
      <input
        type="number"
        value={value || ''}
        step={step ?? 1}
        min={min ?? 0}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ fontFamily: 'var(--mono, monospace)', fontSize: 13, color: 'var(--fx-ink, #1A1A1A)', background: 'var(--input-bg, #fff)', border: '1px solid var(--border, #D0CEC9)', borderRadius: 7, padding: '8px 11px', width: 124, textAlign: 'right' }}
      />
      {suffix && <span style={{ color: 'var(--ink-3, #AAA)', fontSize: 12 }}>{suffix}</span>}
    </div>
  )
}

export function PctInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={Math.round(value * 1000) / 10 || ''}
        step={0.1}
        min={0}
        max={100}
        onChange={e => onChange((parseFloat(e.target.value) || 0) / 100)}
        style={{ fontFamily: 'var(--mono, monospace)', fontSize: 13, color: 'var(--fx-ink, #1A1A1A)', background: 'var(--input-bg, #fff)', border: '1px solid var(--border, #D0CEC9)', borderRadius: 7, padding: '8px 11px', width: 74, textAlign: 'right' }}
      />
      <span style={{ color: 'var(--ink-3, #AAA)', fontSize: 12 }}>%</span>
      {label && <span style={{ color: 'var(--fx-ink-2, #888)', fontSize: 10, marginLeft: 4 }}>{label}</span>}
    </div>
  )
}

// ── Money display ─────────────────────────────────────────────────────────────

export function Money({ value, size = 'md', sign = false }: { value: number; size?: 'sm' | 'md' | 'lg' | 'xl'; sign?: boolean }) {
  const abs = Math.abs(value)
  const neg = value < 0
  const formatted = abs >= 1_000_000
    ? `$${(abs / 1_000_000).toFixed(1)}M`
    : abs >= 1_000
    ? `$${(abs / 1_000).toFixed(0)}K`
    : `$${abs.toLocaleString()}`
  const sizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg', xl: 'text-3xl' }
  const color = neg ? 'text-[var(--red,#B4553F)]' : sign ? 'text-[var(--emerald,#237A52)]' : 'text-[var(--fx-ink,#12150F)]'
  return (
    <span className={`font-mono font-bold num ${sizes[size]} ${color}`}>
      {neg ? '−' : sign ? '+' : ''}{formatted}
    </span>
  )
}

// ── Verdict badge ─────────────────────────────────────────────────────────────

export function VerdictBadge({ rlv }: { rlv: number }) {
  if (rlv > 5_000_000) return (
    <span className="px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-[var(--emerald,#237A52)]/40 text-[var(--emerald,#3DAA6A)]">
      Positive
    </span>
  )
  if (rlv > 0) return (
    <span className="px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-[var(--amber,#8A6A10)]/40 text-[var(--amber,#C9A24B)]">
      Marginal
    </span>
  )
  return (
    <span className="px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-[var(--red,#B4553F)]/40 text-[var(--red,#C43550)]">
      Not viable
    </span>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

export function TabBar({ tabs, active, onChange, accentTabId, accentColor, goldTabId }: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
  accentTabId?: string   // e.g. 'hotel' — this tab gets a colour highlight
  accentColor?: string   // e.g. '#A855F7'
  goldTabId?: string     // e.g. 'insights' — always gold, pushed to far right
}) {
  const mainTabs = goldTabId ? tabs.filter(t => t.id !== goldTabId) : tabs
  const goldTab  = goldTabId ? tabs.find(t => t.id === goldTabId) : undefined

  function renderTab(t: { id: string; label: string }, gold = false) {
    const isActive = active === t.id
    const isAccent = !gold && accentTabId === t.id && !!accentColor
    const borderColor = gold
      ? (isActive ? '#C4973A' : 'transparent')
      : isActive
        ? (isAccent ? accentColor! : '#237A52')
        : isAccent ? `${accentColor}66` : 'transparent'
    const textColor = gold
      ? (isActive ? '#C4973A' : '#8A6A28')
      : isActive
        ? (isAccent ? accentColor! : '#EEF1F2')
        : isAccent ? accentColor! : '#8A9296'
    return (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        style={{
          padding: '10px 10px',
          fontSize: gold ? 9 : 10,
          letterSpacing: gold ? '0.22em' : '0.07em',
          textTransform: 'uppercase' as const,
          cursor: 'pointer',
          transition: 'color 0.15s',
          borderTopWidth: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderBottomWidth: 3,
          borderBottomStyle: 'solid' as const,
          borderBottomColor: borderColor,
          marginBottom: -2,
          whiteSpace: 'nowrap' as const,
          flexShrink: 0,
          color: textColor,
          fontWeight: isActive || isAccent || gold ? 700 : 500,
          background: 'transparent',
        }}
      >
        {gold ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true" style={{ flexShrink: 0 }}>
              <rect x="0" y="0" width="11" height="1.4" rx="0.7" fill="currentColor" />
              <rect x="0" y="3.8" width="11" height="1.4" rx="0.7" fill="currentColor" />
              <rect x="0" y="7.6" width="11" height="1.4" rx="0.7" fill="currentColor" />
            </svg>
            {t.label}
          </span>
        ) : t.label}
      </button>
    )
  }

  return (
    <div className="tab-bar-scroll no-drag" style={{ display: 'flex', gap: 0, paddingLeft: 8, paddingRight: 8, borderBottom: '1px solid #000', background: 'linear-gradient(120deg,#0A0D0C,#12161A 60%,#0A0D0C)' }}>
      {mainTabs.map(t => renderTab(t))}
      {goldTab && (
        <>
          <div style={{ flex: 1 }} />
          <div style={{ width: 1, background: 'var(--border-hi,#3A4146)', margin: '8px 4px', flexShrink: 0 }} />
          {renderTab(goldTab, true)}
        </>
      )}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    'border-[var(--emerald,#237A52)]/40 text-[var(--emerald,#3DAA6A)]',
    'on-hold': 'border-[var(--amber,#8A6A10)]/40 text-[var(--amber,#C9A24B)]',
    archived:  'border-[var(--border-hi,#333)] text-[var(--fx-ink-2,#505050)]',
  }
  return (
    <span className={`px-2 py-0.5 text-[9px] font-medium tracking-[0.14em] uppercase border ${styles[status] ?? styles.active}`}
      style={{ borderRadius: 0 }}>
      {status}
    </span>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────

export function MetricCard({ label, value, sub, highlight }: { label: string; value: React.ReactNode; sub?: string; highlight?: boolean }) {
  return (
    <div className={`p-4 border ${highlight ? 'border-[var(--border-hi,#C8C5C0)] bg-[#F5F3F0]' : 'border-[var(--border,#E8E5E0)] bg-white'}`} style={{ borderRadius: 0 }}>
      <div className="text-[var(--ink-3,#888)] text-[10px] tracking-[0.14em] uppercase mb-2">{label}</div>
      <div className="font-mono font-bold text-xl text-[var(--fx-ink,#1A1A1A)]">{value}</div>
      {sub && <div className="text-[var(--ink-3,#AAA)] text-[10px] mt-1.5 tracking-wide">{sub}</div>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="text-3xl opacity-20">{icon}</div>
      <div className="text-[var(--ink-3,#888)] text-[10px] tracking-[0.2em] uppercase">{title}</div>
      {body && <div className="text-[var(--ink-3,#AAA)] text-xs max-w-xs">{body}</div>}
      {action}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="border-t border-[var(--border,#E8E5E0)] my-4" />
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 border-t border-[var(--border,#E8E5E0)]" />
      <span className="text-[var(--ink-3,#AAA)] text-[9px] tracking-[0.2em] uppercase">{label}</span>
      <div className="flex-1 border-t border-[var(--border,#E8E5E0)]" />
    </div>
  )
}
