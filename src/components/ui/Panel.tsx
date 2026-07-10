import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  /** Rendered top-right of the header — buttons, segmented controls, toggles. */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The default content surface. Solid white, no backdrop-filter.
 * Deliberately NOT glass — glass is for chrome only (see theme.css).
 */
export function Panel({ title, subtitle, action, children, className = '', ...rest }: PanelProps) {
  return (
    <div className={`atr-panel ${className}`.trim()} {...rest}>
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '16px 18px 12px',
        }}>
          <div>
            {title && (
              <div className="font-display" style={{ fontWeight: 600, fontSize: 14.5 }}>{title}</div>
            )}
            {subtitle && (
              <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export default Panel;
