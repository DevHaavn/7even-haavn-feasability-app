// The feasibility code reads its project data from `localStorage` (the browser fills it from Supabase). On the server there is none, so this puts a plain
// in-memory one in its place before any of that code loads. It must be the first import of entry.ts.
class MemStorage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null }
}
;(globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage()
export {}
