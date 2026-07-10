import React from 'react';
import { forest } from '../../theme/tokens';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

/** Tiny trend line for KPI cards. No axes, no tooltip — glanceable only. */
export function Sparkline({ data, width = 58, height = 26, color = forest[500] }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1;
    const y = height - 3 - ((v - min) / span) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <polyline points={pts.join(' ')} stroke={color} strokeWidth={1.8}
                strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default Sparkline;
