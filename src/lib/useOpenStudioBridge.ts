import { useEffect } from 'react'
import { useStore } from '../store'

/**
 * Listens for the ATRIUM Management System (the iframed atrium-management.html)
 * asking to hand off to the Feasibility Studio — sent from the Feasibility tab's
 * "Open Studio" / "Open in Studio" buttons.
 *
 * The iframe can't route the React app itself, so it posts a message and we act
 * on it: select the project it names, then exit the pillar into the studio.
 *
 * Origin is checked because `message` events accept posts from anywhere; without
 * it any page that framed us could drive navigation.
 */
export function useOpenStudioBridge(onExit: () => void) {
  const setActiveProject = useStore(s => s.setActiveProject)
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      const d = e.data
      if (!d || d.type !== 'atrium:open-studio') return
      if (typeof d.projectId === 'string' && d.projectId) setActiveProject(d.projectId)
      onExit()
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [onExit, setActiveProject])
}
