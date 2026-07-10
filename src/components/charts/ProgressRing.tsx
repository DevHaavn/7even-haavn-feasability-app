import React from 'react';
import { forest, neutral } from '../../theme/tokens';

export interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
  color?: string;
}

/** Engagement / completion ring. Pure SVG — no chart library. */
export function ProgressRing({
  value, size = 34, stroke = 4, showLabel = true, color,
}: ProgressRingProps) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  // darker green reads as "further along" — deliberate, not decorative
  const auto = v >= 85 ? forest[600] : v >= 60 ? forest[500] : v >= 35 ? forest[400] : forest[300];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
         aria-label={`${Math.round(v)} percent`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={neutral.grey100} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={color ?? auto} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      {showLabel && (
        <text x={size / 2} y={size / 2 + 3} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize={size * 0.26} fill={neutral.ink}>
          {Math.round(v)}
        </text>
      )}
    </svg>
  );
}

export default ProgressRing;
