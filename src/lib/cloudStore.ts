import { pushKV } from '../db/capitalCloud'

/**
 * Drop-in replacement for the localStorage read/write each Capital module does.
 * loadKV reads local (already hydrated from cloud on pillar open); saveKV
 * writes local AND fire-and-forgets to the shared backend.
 */
export function loadKV<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch { /* fall through */ }
  return fallback
}

export function saveKV<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore quota */ }
  pushKV(key, value)
}
