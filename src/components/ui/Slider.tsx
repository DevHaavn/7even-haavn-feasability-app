import React, { useMemo } from 'react';
import { forest, neutral } from '../../theme/tokens';

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel: string;
  /** Use on forest/dark surfaces so the unfilled track stays visible. */
  onDark?: boolean;
  className?: string;
}

/**
 * Continuous values — probability, confidence, budget ranges.
 * The filled portion is painted with a live gradient, so it tracks the thumb.
 */
export function Slider({
  value, onChange, min = 0, max = 100, step = 1,
  ariaLabel, onDark = false, className = '',
}: SliderProps) {
  const pct = useMemo(() => {
    const range = max - min;
    return range === 0 ? 0 : ((value - min) / range) * 100;
  }, [value, min, max]);

  const fill = onDark ? forest[300] : forest[500];
  const rest = onDark ? 'rgba(255,255,255,.16)' : neutral.grey200;

  return (
    <input
      type="range"
      className={`atr-slider ${className}`.trim()}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ background: `linear-gradient(90deg, ${fill} ${pct}%, ${rest} ${pct}%)` }}
    />
  );
}

export default Slider;
