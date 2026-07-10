import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name, e.g. "Time range" */
  ariaLabel?: string;
  className?: string;
}

/**
 * The thumb slides; the labels never move.
 * Uses the iOS spring curve, defined in theme.css.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedControlProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [thumb, setThumb] = useState({ left: 3, width: 0 });

  const measure = useCallback(() => {
    const el = btnRefs.current[value];
    if (!el) return;
    setThumb({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value]);

  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.key === 'ArrowRight' ? i + 1 : i - 1;
      const opt = options[(next + options.length) % options.length];
      onChange(opt.value);
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`atr-seg ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <span
        className="atr-seg__thumb"
        style={{ width: thumb.width, transform: `translateX(${thumb.left - 3}px)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          ref={(el) => {
            btnRefs.current[o.value] = el;
          }}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="atr-seg__btn"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
