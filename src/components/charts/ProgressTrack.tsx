import React from 'react';

export interface ProgressTrackProps {
  /** 0–100 */
  value: number;
  /** Stage names shown beneath; those below `value` proportionally are marked done. */
  stages?: string[];
}

/** Project stage-completion bar. */
export function ProgressTrack({ value, stages }: ProgressTrackProps) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div style={{
        height: 7, borderRadius: 100, background: 'var(--grey-200)', overflow: 'hidden',
      }}>
        <div style={{
          width: `${v}%`, height: '100%', borderRadius: 100,
          background: 'linear-gradient(90deg, var(--f-600), var(--f-400))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)',
        }} />
      </div>
      {stages && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {stages.map((s, i) => {
            // a stage is done once the bar has passed its start point
            const done = (i / stages.length) * 100 < v;
            return (
              <span key={s} className="font-mono"
                    style={{ fontSize: 10, color: done ? 'var(--f-500)' : 'var(--faint)' }}>
                {s}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProgressTrack;
