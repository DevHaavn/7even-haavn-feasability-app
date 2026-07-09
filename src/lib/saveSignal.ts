// Lightweight global "a save just happened" signal so the header auto-save
// indicator can flash green whenever any tab auto-saves.
type Cb = () => void
const listeners = new Set<Cb>()

export function pingSave() { listeners.forEach(l => { try { l() } catch { /* no-op */ } }) }
export function onSave(cb: Cb) { listeners.add(cb); return () => { listeners.delete(cb) } }
