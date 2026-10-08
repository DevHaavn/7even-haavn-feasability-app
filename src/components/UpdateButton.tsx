import React from 'react'
import RefreshButton from './RefreshButton'

/**
 * "Get the latest version", the footer refresh circle. Lives in SiteLinks so it
 * rides the footer on every working page. The tone only sets its colours:
 * dark Capital screens, the light ATRIUM studio, and the glass footer over the
 * home render. The behaviour (cache clear, cache-busted navigate, auto-save
 * flush) is in RefreshButton.
 */
export default function UpdateButton({ tone = 'dark' }: { tone?: 'dark' | 'light' | 'glass' }) {
  const light = tone === 'light'
  const style = (light
    ? { ['--rb-c' as string]: 'rgba(21,21,21,.62)', ['--rb-h' as string]: '#151515', ['--rb-g' as string]: '#8a6a22' }
    : { ['--rb-c' as string]: 'rgba(238,241,242,.7)', ['--rb-h' as string]: '#EEF1F2' }) as React.CSSProperties
  return <RefreshButton size={24} style={style} />
}
