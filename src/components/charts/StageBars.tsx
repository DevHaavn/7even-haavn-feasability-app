import React from 'react';
import { neutral, series, font } from '../../theme/tokens';

export interface StageRow { label: string; value: number; }
export interface StageBarsProps {
  data: StageRow[];
  labelWidth?: number;
  /** Rounded to the max value if omitted. */
  max?: number;
}

/** Horizontal stage funnel. Later stages are darker — progress reads as depth. */
export function StageBars({ data, labelWidth = 66, max }: StageBarsProps) {
  const top = max ?? Math.max(...data.map((d) => d.value), 1);
  const barH = 13;
  const gap = 23;
  const trackW = 180;
  const h = data.length * (barH + gap) - gap + 6;
  return (
    <svg viewBox={`0 0 ${labelWidth + trackW} ${h}`} width="100%" height={h} role="img"
         aria-label="Deals by stage">
      {data.map((d, i) => {
        const y = i * (barH + gap);
        const w = (d.value / top) * trackW;
        // later stages darker: walk the series backwards, clamped so >5 stages can't underflow
        const idx = Math.max(0, series.length - 1 - i);
        const color = series[idx];
        return (
          <g key={d.label}>
            <text x={0} y={y + barH - 2} fontFamily={font.mono} fontSize={9} fill={neutral.faint}>
              {d.label}
            </text>
            <rect x={labelWidth} y={y} width={trackW} height={barH} rx={barH / 2}
                  fill={neutral.grey100} />
            <rect x={labelWidth} y={y} width={w} height={barH} rx={barH / 2} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

export default StageBars;
