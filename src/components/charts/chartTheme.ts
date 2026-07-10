import { forest, neutral, font } from '../../theme/tokens';

/**
 * Shared Recharts styling. Import these instead of restyling per-chart —
 * per-chart styling is how charts drift apart.
 */
export const chartTheme = {
  grid: { stroke: neutral.line2, strokeWidth: 1, vertical: false as const },
  axis: {
    stroke: 'transparent',
    tickLine: false as const,
    axisLine: false as const,
    tick: { fill: neutral.faint, fontSize: 10, fontFamily: font.mono },
  },
  tooltip: {
    contentStyle: {
      background: 'rgba(255,255,255,.86)',
      backdropFilter: 'blur(18px) saturate(180%)',
      border: '1px solid rgba(255,255,255,.85)',
      borderRadius: 12,
      boxShadow: '0 2px 6px rgba(10,12,11,.06), 0 12px 28px -8px rgba(10,12,11,.14)',
      fontFamily: font.body,
      fontSize: 12,
      color: neutral.ink,
      padding: '10px 12px',
    },
    labelStyle: { color: neutral.mute, fontSize: 11, marginBottom: 4 },
    cursor: { stroke: neutral.line, strokeWidth: 1 },
  },
  line: {
    committed: { stroke: forest[600], strokeWidth: 2.6 },
    forecast: { stroke: forest[300], strokeWidth: 2, strokeDasharray: '5 5' },
  },
  /** Gradient id — must exist in the chart's <defs>. See AreaTrend. */
  areaFillId: 'atrAreaFill',
} as const;

export default chartTheme;
