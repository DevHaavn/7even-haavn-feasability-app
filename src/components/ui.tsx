import React from 'react'

// ── Brand mark ───────────────────────────────────────────────────────────────

export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero' }) {
  const widths = { sm: 83, md: 117, lg: 156, xl: 208 }
  // Hero uses the tight-cropped asset: the full PNG is ~60% transparent padding,
  // which pushed the content below far away from the visible logos. Width is
  // scaled so the visible art renders the same size as before.
  if (size === 'hero') {
    return (
      <img
        src="/brand-logo-white-tight.png"
        alt="7EVEN · HAAVN"
        draggable={false}
        className="select-none"
        style={{ width: 'min(229px, 36vw)', height: 'auto', objectFit: 'contain' }}
      />
    )
  }
  return (
    <img
      src="/brand-logo-white.png"
      alt="7EVEN · HAAVN"
      draggable={false}
      className="select-none"
      style={{ width: widths[size], height: 'auto', objectFit: 'contain' }}
    />
  )
}

// ── Design credit ─────────────────────────────────────────────────────────────

export function DesignCredit({ style }: { style?: React.CSSProperties }) {
  return (
    <p style={{
      color: 'rgba(255,255,255,0.30)', fontSize: 7, letterSpacing: '0.30em',
      textTransform: 'uppercase', fontWeight: 400, textAlign: 'center',
      whiteSpace: 'nowrap', margin: 0, ...style,
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
      className="select-none"
      style={{ position, bottom, right, width: size, height: 'auto', zIndex, opacity: 0.9, pointerEvents: 'none' }}
    />
  )
}

// ── Panel / Card ──────────────────────────────────────────────────────────────

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[#E8E4DE] bg-white ${className}`} style={{ borderRadius: 0, boxShadow: '0 2px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(255,255,255,0.9) inset' }}>
      {children}
    </div>
  )
}

export function Card({ children, className = '', dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={`border border-[#E8E4DE] ${dark ? 'bg-[#F5F3F0]' : 'bg-white'} ${className}`} style={{ borderRadius: 0, boxShadow: '0 2px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(255,255,255,0.9) inset' }}>
      {children}
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

export function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5 cursor-default">
      <div className="flex items-center gap-3 mb-1.5" style={{ display: 'inline-flex' }}>
        <div className="w-[3px] h-6 flex-shrink-0" style={{ background: '#C4973A' }} />
        <h2 className="font-heading font-black text-[18px] tracking-[0.10em] uppercase" style={{ color: '#1A1A1A' }}>{children}</h2>
      </div>
      {sub && <p className="text-[#666] text-[12px] tracking-wide ml-5 font-medium">{sub}</p>}
    </div>
  )
}

// ── Label ─────────────────────────────────────────────────────────────────────

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[#505050] text-[10px] tracking-[0.15em] uppercase font-medium">{children}</span>
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
    secondary: 'bg-transparent border border-[#C8C5C0] text-[#666] hover:border-[#1A1A1A] hover:text-[#1A1A1A]',
    outline:   'bg-transparent border border-white/80 text-white hover:bg-white hover:text-black',
    ghost:     'text-[#888] hover:text-[#1A1A1A] hover:bg-[#F0EEE9]',
    danger:    'bg-transparent border border-[#9B2335]/40 text-[#9B2335] hover:bg-[#9B2335] hover:text-white',
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
    <div className="field-row-mobile flex items-center gap-4 py-2.5 border-b border-[#E8E5E0] last:border-0">
      <label className="text-[#888] text-[11px] tracking-[0.06em] w-44 flex-shrink-0">{label}</label>
      <div className="flex-1 no-drag">{children}</div>
      {note && <span className="text-[#AAA] text-[10px] w-36 text-right flex-shrink-0 tracking-wide hidden sm:block">{note}</span>}
    </div>
  )
}

export function NumberInput({ value, onChange, prefix, suffix, step, min }: {
  value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; step?: number; min?: number
}) {
  return (
    <div className="flex items-center gap-2">
      {prefix && <span className="text-[#AAA] text-xs font-mono">{prefix}</span>}
      <input
        type="number"
        value={value || ''}
        step={step ?? 1}
        min={min ?? 0}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-32 text-right text-[#1A1A1A] text-sm font-mono"
        style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #D0CEC9', borderRadius: 0, padding: '4px 0' }}
      />
      {suffix && <span className="text-[#AAA] text-xs">{suffix}</span>}
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
        className="w-16 text-right text-[#1A1A1A] text-sm font-mono"
        style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #D0CEC9', borderRadius: 0, padding: '4px 0' }}
      />
      <span className="text-[#AAA] text-xs">%</span>
      {label && <span className="text-[#888] text-[10px] ml-1 tracking-wide">{label}</span>}
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
  const color = neg ? 'text-[#9B2335]' : sign ? 'text-[#2A7A4F]' : 'text-[#C4973A]'
  return (
    <span className={`font-mono font-bold num ${sizes[size]} ${color}`}>
      {neg ? '−' : sign ? '+' : ''}{formatted}
    </span>
  )
}

// ── Verdict badge ─────────────────────────────────────────────────────────────

export function VerdictBadge({ rlv }: { rlv: number }) {
  if (rlv > 5_000_000) return (
    <span className="px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-[#2A7A4F]/40 text-[#3DAA6A]">
      Positive
    </span>
  )
  if (rlv > 0) return (
    <span className="px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-[#8A6A10]/40 text-[#C49A20]">
      Marginal
    </span>
  )
  return (
    <span className="px-2 py-0.5 text-[10px] font-medium tracking-[0.1em] uppercase border border-[#9B2335]/40 text-[#C43550]">
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
        ? (isAccent ? accentColor! : '#1A1A1A')
        : isAccent ? `${accentColor}66` : 'transparent'
    const textColor = gold
      ? (isActive ? '#C4973A' : '#8A6A28')
      : isActive
        ? (isAccent ? accentColor! : '#0A0A0A')
        : isAccent ? accentColor! : '#888'
    return (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        style={{
          padding: '12px 16px',
          fontSize: gold ? 9 : 11,
          letterSpacing: gold ? '0.22em' : '0.12em',
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
    <div className="tab-bar-scroll border-b-2 border-[#E0DDD8] bg-white no-drag" style={{ display: 'flex', gap: 0, paddingLeft: 16, paddingRight: 16 }}>
      {mainTabs.map(t => renderTab(t))}
      {goldTab && (
        <>
          <div style={{ flex: 1 }} />
          <div style={{ width: 1, background: '#E0DDD8', margin: '8px 4px', flexShrink: 0 }} />
          {renderTab(goldTab, true)}
        </>
      )}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    'border-[#2A7A4F]/40 text-[#3DAA6A]',
    'on-hold': 'border-[#8A6A10]/40 text-[#C49A20]',
    archived:  'border-[#333] text-[#505050]',
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
    <div className={`p-4 border ${highlight ? 'border-[#C8C5C0] bg-[#F5F3F0]' : 'border-[#E8E5E0] bg-white'}`} style={{ borderRadius: 0 }}>
      <div className="text-[#888] text-[10px] tracking-[0.14em] uppercase mb-2">{label}</div>
      <div className="font-mono font-bold text-xl text-[#1A1A1A]">{value}</div>
      {sub && <div className="text-[#AAA] text-[10px] mt-1.5 tracking-wide">{sub}</div>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="text-3xl opacity-20">{icon}</div>
      <div className="text-[#888] text-[10px] tracking-[0.2em] uppercase">{title}</div>
      {body && <div className="text-[#AAA] text-xs max-w-xs">{body}</div>}
      {action}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="border-t border-[#E8E5E0] my-4" />
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 border-t border-[#E8E5E0]" />
      <span className="text-[#AAA] text-[9px] tracking-[0.2em] uppercase">{label}</span>
      <div className="flex-1 border-t border-[#E8E5E0]" />
    </div>
  )
}
