import { useEffect } from 'react'
import { shortWindowHeight } from './shortWindow'

/**
 * Locks the top-level document from scrolling while a full-screen overlay (an
 * embedded studio iframe) is open. This is what makes the embedded HAAVN Homes
 * tools feel "pinned to the screen" on mobile:
 *
 *  - With the parent page non-scrollable, iOS Safari stops toggling its address
 *    bar, so the fixed overlay no longer resizes mid-scroll (the "jumping").
 *  - overscroll-behavior:none kills the rubber-band bounce that otherwise chains
 *    from the iframe into the parent.
 *
 * Scrolling then happens only inside the iframe, smoothly, against a fixed frame.
 * Pass `active` so the hook can be called unconditionally (Rules of Hooks) while
 * only engaging when the overlay is actually mounted.
 */
export function useScrollLock(active: boolean = true) {
  useEffect(() => {
    if (!active) return
    const de = document.documentElement
    const b = document.body
    const prev = {
      htmlOverflow: de.style.overflow, htmlHeight: de.style.height,
      bodyOverflow: b.style.overflow, bodyHeight: b.style.height,
      bodyOverscroll: b.style.overscrollBehavior,
    }
    const sh = shortWindowHeight()   // an iPhone home-screen window shorter than the screen: the page is as tall as the screen so nothing bare shows below
    const hgt = sh ? sh + 'px' : '100%'
    de.style.overflow = 'hidden'; de.style.height = hgt
    b.style.overflow = 'hidden'; b.style.height = hgt
    b.style.overscrollBehavior = 'none'
    return () => {
      de.style.overflow = prev.htmlOverflow; de.style.height = prev.htmlHeight
      b.style.overflow = prev.bodyOverflow; b.style.height = prev.bodyHeight
      b.style.overscrollBehavior = prev.bodyOverscroll
    }
  }, [active])
}
