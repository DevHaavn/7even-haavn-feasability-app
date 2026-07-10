import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Required — a toggle with no accessible name is unusable by screen readers. */
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Instant, reversible settings only.
 * Never use a toggle for a destructive or irreversible action — use a Button.
 */
export function Toggle({ checked, onChange, ariaLabel, disabled, className = '' }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`atr-tgl ${className}`.trim()}
      onClick={() => onChange(!checked)}
    />
  );
}

export default Toggle;
