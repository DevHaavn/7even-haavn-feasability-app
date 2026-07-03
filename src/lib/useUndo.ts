import { useRef, useCallback } from 'react'

// Tracks the last-committed value so a single Undo step is always available.
// Usage: const { saveCheckpoint, undo, hasUndo } = useUndo(setData)
export function useUndo<T>(setter: (value: T) => void) {
  const checkpoint = useRef<T | null>(null)

  const saveCheckpoint = useCallback((value: T) => {
    checkpoint.current = structuredClone(value)
  }, [])

  const undo = useCallback(() => {
    if (checkpoint.current !== null) {
      setter(structuredClone(checkpoint.current))
    }
  }, [setter])

  const hasUndo = checkpoint.current !== null

  return { saveCheckpoint, undo, hasUndo }
}
