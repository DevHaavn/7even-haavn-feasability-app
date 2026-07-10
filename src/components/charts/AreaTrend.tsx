import React from 'react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { forest } from '../../theme/tokens';
import { chartTheme } from './chartTheme';

export interface TrendPoint {
  label: string;
  committed: number;
  forecast?: number;
}

export interface AreaTrendProps {
  data: TrendPoint[];
  /** Hide the dashed forecast line. Wire this to a <Toggle />. */
  showForecast?: boolean;
  height?: number;
  valueFormatter?: (v: number) => string;
}

/** Smooth-curved area chart. Committed = solid forest. Forecast = dashed mint. */
export function AreaTrend({
  data, showForecast = true, height = 240,
  valueFormatter = (v) => `$${v}M`,
}: AreaTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={chartTheme.areaFillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={forest[500]} stopOpacity={0.26} />
            <stop offset="100%" stopColor={forest[500]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chartTheme.grid} />
        <XAxis dataKey="label" {...chartTheme.axis} />
        <YAxis {...chartTheme.axis} width={44} tickFormatter={valueFormatter} />
        <Tooltip {...chartTheme.tooltip} formatter={(v: number) => valueFormatter(v)} />
        <Area
          type="monotone" dataKey="committed" name="Committed"
          fill={`url(#${chartTheme.areaFillId})`} {...chartTheme.line.committed}
        />
        {showForecast && (
          <Area
            type="monotone" dataKey="forecast" name="Forecast"
            fill="none" {...chartTheme.line.forecast}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default AreaTrend;
