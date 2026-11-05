/**
 * An iPhone home-screen app can be given a window that is shorter than the screen: innerHeight is the screen minus the
 * TOP safe area, so the bottom of the screen shows as a bare black strip under anything pinned to the window.
 * ATRIUM Chat's own page already works around this (atrium-chat.html, "tallfix", confirmed on Jamie's iPhone 29 Oct).
 * This is the same test for the React side, for full-screen surfaces drawn inside the app: the Chat drawer and the
 * one-screen HAAVN and HAAVN BLACK ATRIUM shells.
 *
 * Returns the screen height to draw at when this phone is in that state, otherwise 0 (draw at the window height).
 * The Settings switch in Chat ("Try full-screen fix", localStorage atrium-chat-tall) still forces it on or off.
 */
export function shortWindowHeight(): number {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 0
    let forced: string | null = null
    try { forced = localStorage.getItem('atrium-chat-tall') } catch { /* private mode */ }
    if (forced === '0') return 0
    const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
    if (!standalone || window.innerWidth >= 761 || window.innerHeight <= window.innerWidth) return 0
    if (forced === '1') return window.screen.height
    const p = document.createElement('div')
    p.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)'
    document.body.appendChild(p)
    const st = parseFloat(getComputedStyle(p).paddingTop) || 0
    p.remove()
    return st > 0 && Math.abs(window.screen.height - window.innerHeight - st) <= 6 ? window.screen.height : 0
  } catch { return 0 }
}
