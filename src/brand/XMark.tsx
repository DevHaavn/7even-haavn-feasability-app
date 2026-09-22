import React from 'react'

/**
 * The 7EVEN X device.
 *
 * Master geometry, from the 7EVEN X brand deck: the X is the V of the 7EVEN
 * wordmark with a true vertical flip of itself beneath, each half moved four
 * box units toward the waist (the Light V), drawn at 85 percent of a 240 box.
 * It is one shape used at every size, so it is never redrawn by hand: change
 * it here and it changes everywhere.
 */
const V = 'M64.49 20.57 L109.63 120 H130.37 L175.51 19.96 L119.39 112.68 Z'
const FILL = 0.85          // LOCKED · the mark fills 85 percent of its box
const WAIST = 4            // LOCKED · each half moves 4 units toward the waist

export default function XMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 240" role={title ? 'img' : 'presentation'}
         aria-label={title} aria-hidden={title ? undefined : true} style={{ display: 'block', overflow: 'visible' }}>
      <g transform={`translate(120 120) scale(${FILL}) translate(-120 -120)`}>
        <path d={V} transform={`translate(0 ${WAIST})`} />
        <path d={V} transform={`translate(0 ${-WAIST}) matrix(1 0 0 -1 0 240)`} />
      </g>
    </svg>
  )
}
