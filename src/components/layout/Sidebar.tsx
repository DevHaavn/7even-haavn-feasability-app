import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SidebarProps {
  items: NavItem[];
  groups?: { title: string; items: NavItem[] }[];
  active: string;
  onSelect: (id: string) => void;
  brand?: React.ReactNode;
  footer?: React.ReactNode;
}

/** Deep-forest stealth rail. The only place .atr-btn--glassDark buttons belong. */
export function Sidebar({ items, groups, active, onSelect, brand, footer }: SidebarProps) {
  const renderItem = (it: NavItem) => {
    const on = it.id === active;
    return (
      <button
        key={it.id}
        type="button"
        onClick={() => onSelect(it.id)}
        aria-current={on ? 'page' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 11, width: '100%',
          padding: '10px 11px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
          fontSize: 13.5, fontFamily: 'var(--font-body)',
          fontWeight: on ? 500 : 450,
          color: on ? '#fff' : 'rgba(255,255,255,.66)',
          background: on ? 'rgba(255,255,255,.13)' : 'transparent',
          border: on ? '1px solid rgba(255,255,255,.14)' : '1px solid transparent',
          boxShadow: on ? 'inset 0 1px 0 rgba(255,255,255,.16)' : 'none',
          backdropFilter: on ? 'blur(10px)' : undefined,
          transition: 'background .16s, color .16s',
        }}
      >
        {it.icon}
        {it.label}
        {it.badge != null && (
          <span className="font-mono" style={{
            marginLeft: 'auto', fontSize: 10, background: 'var(--f-500)',
            color: '#fff', padding: '1px 6px', borderRadius: 20,
          }}>{it.badge}</span>
        )}
      </button>
    );
  };

  return (
    <aside style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 2,
      padding: '18px 13px', width: 224,
      background: 'linear-gradient(170deg, var(--f-800) 0%, var(--f-900) 62%, #070F0B 100%)',
    }}>
      {brand && <div style={{ padding: '8px 10px 22px' }}>{brand}</div>}
      {items.map(renderItem)}
      {groups?.map((g) => (
        <React.Fragment key={g.title}>
          <div className="font-mono" style={{
            fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,.33)', padding: '18px 11px 8px',
          }}>{g.title}</div>
          {g.items.map(renderItem)}
        </React.Fragment>
      ))}
      {footer && (
        <div style={{
          marginTop: 'auto', paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,.09)',
        }}>{footer}</div>
      )}
    </aside>
  );
}

export default Sidebar;
