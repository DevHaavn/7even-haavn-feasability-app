import React from 'react';
import { Sparkline } from '../charts/Sparkline';

export interface StatCardProps {
  label: string;
  value: string;
  /** e.g. "18.2%" — direction sets the arrow. */
  delta?: string;
  direction?: 'up' | 'down';
  /** "up" is not always good: for deal-cycle time, down is good. */
  goodDirection?: 'up' | 'down';
  spark?: number[];
}

export function StatCard({
  label, value, delta, direction = 'up', goodDirection = 'up', spark,
}: StatCardProps) {
  const isGood = direction === goodDirection;
  return (
    <div className="atr-panel" style={{ padding: '16px 17px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 11.5, color: 'var(--mute)', fontWeight: 500 }}>{label}</div>
      <div className="font-display"
           style={{ fontWeight: 600, fontSize: 27, marginTop: 7, color: 'var(--ink)' }}>
        {value}
      </div>
      {delta && (
        <div className="font-mono" style={{
          marginTop: 7, fontSize: 11,
          color: isGood ? 'var(--f-500)' : 'var(--mute)',
        }}>
          {direction === 'up' ? '▲' : '▼'} {delta}
        </div>
      )}
      {spark && (
        <div style={{ position: 'absolute', right: 14, bottom: 14 }}>
          <Sparkline data={spark} />
        </div>
      )}
    </div>
  );
}

export default StatCard;
