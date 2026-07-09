import { useCallback, useEffect, useRef, useState } from 'react'
import { pingSave } from './saveSignal'

/**
 * Auto-save with a grouped undo history for a single piece of tab state.
 *
 * Usage:
 *   const { commit, undo, canUndo } = useAutosave(saveFn, [projectId])
 *   function update(patch) { const next = { ...data, ...patch }; commit(data, next); setData(next) }
 *   // header:  {canUndo && <button onClick={() => undo(setData)}>Undo</button>}
 *
 * • commit(prev, next)  — records `prev` on the undo stack (rapid edits are
 *   grouped into one entry) and debounce-saves `next`.
 * • undo(restore)       — pops the last change, restores it and saves immediately.
 * • A pending debounced save is FLUSHED when the deps change (e.g. project
 *   switch) or the component unmounts, so nothing is ever lost.
 */
export function useAutosave<T>(save: (v: T) => void, deps: unknown[], opts?: { debounceMs?: number; groupMs?: number }) {
  const debounceMs = opts?.debounceMs ?? 600
  const groupMs = opts?.groupMs ?? 1000

  const stack = useRef<T[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{ v: T } | null>(null)
  const lastAt = useRef(0)
  const saveRef = useRef(save)
  saveRef.current = save

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (pending.current) { saveRef.current(pending.current.v); pending.current = null; pingSave() }
  }, [])

  // Reset undo history when identity changes; flush any pending save on the way out.
  useEffect(() => {
    stack.current = []
    setCanUndo(false)
    lastAt.current = 0
    return () => { flush() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const commit = useCallback((prev: T, next: T) => {
    const now = Date.now()
    if (now - lastAt.current > groupMs) {
      stack.current.push(structuredClone(prev))
      if (stack.current.length > 100) stack.current.shift()
      setCanUndo(true)
    }
    lastAt.current = now
    pending.current = { v: next }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { saveRef.current(next); pending.current = null; timer.current = null; pingSave() }, debounceMs)
  }, [debounceMs, groupMs])

  const undo = useCallback((restore: (v: T) => void) => {
    const prev = stack.current.pop()
    if (prev === undefined) return
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    pending.current = null
    restore(prev)
    saveRef.current(prev)
    pingSave()
    lastAt.current = 0
    setCanUndo(stack.current.length > 0)
  }, [])

  return { commit, undo, canUndo, flush }
}
