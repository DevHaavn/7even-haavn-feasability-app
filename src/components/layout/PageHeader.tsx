import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Tabs + range controls sit in the frosted sub-header. */
  belowBar?: React.ReactNode;
}

/** Crisp white header. Solid, not glass — it's the reference plane everything else floats over. */
export function PageHeader({ title, subtitle, actions, belowBar }: PageHeaderProps) {
  return (
    <div style={{
      background: '#fff', borderBottom: '1px solid var(--line)',
      padding: '16px 24px 0', position: 'relative', zIndex: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h2 className="font-display" style={{ fontWeight: 600, fontSize: 22, margin: 0 }}>{title}</h2>
          {subtitle && <div style={{ fontSize: 13, color: 'var(--mute)', marginTop: 3 }}>{subtitle}</div>}
        </div>
        {actions && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 9, alignItems: 'center' }}>
            {actions}
          </div>
        )}
      </div>
      {belowBar && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          {belowBar}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
