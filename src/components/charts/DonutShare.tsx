import React from 'react';
import { neutral, series, font } from '../../theme/tokens';

export interface DonutSlice { label: string; value: number; }
export interface DonutShareProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}

/** Project-share donut. Slices take series colours in order, darkest first. */
export function DonutShare({
  data, size = 184, thickness = 22, centerLabel, centerSub,
}: DonutShareProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2 - 2;
  const c = 2 * Math.PI * r;
  const gap = 4; // breathing room between slices
  let offset = 0;
  const arcs = data.map((d, i) => {
    const len = Math.max((d.value / total) * c - gap, 0);
    const arc = { len, offset, color: series[i % series.length], label: d.label };
    offset += (d.value / total) * c;
    return arc;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
         aria-label={`Share by project: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
      <g transform={`translate(${size / 2},${size / 2})`}>
        <circle r={r} fill="none" stroke={neutral.grey100} strokeWidth={thickness} />
        {arcs.map((a) => (
          <circle key={a.label} r={r} fill="none" stroke={a.color}
                  strokeWidth={thickness} strokeLinecap="round"
                  strokeDasharray={`${a.len} ${c - a.len}`}
                  strokeDashoffset={-a.offset} transform="rotate(-90)" />
        ))}
        {centerLabel && (
          <text y={-4} textAnchor="middle" fontFamily={font.display}
                fontWeight={600} fontSize={26} letterSpacing={-1} fill={neutral.ink}>
            {centerLabel}
          </text>
        )}
        {centerSub && (
          <text y={16} textAnchor="middle" fontFamily={font.mono}
                fontSize={10} fill={neutral.faint}>{centerSub}</text>
        )}
      </g>
    </svg>
  );
}

export default DonutShare;
