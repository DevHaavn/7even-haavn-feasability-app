// ── ATRIUM feasibility bridge ────────────────────────────────────────────────
// Publishes a per-project feasibility snapshot for the ATRIUM Management System
// (public/atrium-management.html), whose Feasibility tab used to be a stub with
// hardcoded demo cards.
//
// WHY A BRIDGE, NOT A RE-IMPLEMENTATION
// The Management System is a self-contained HTML file loaded in an iframe. It
// could read localStorage directly (same origin), but TDC / GDV / RLV are
// COMPUTED by the engine, not stored — so rendering them there would mean
// porting the cost stack, unit-mix solver and three valuation models into
// vanilla JS. Two engines drift, and drifting numbers is the one thing we never
// do. Instead the React app computes them through the SAME `comparisonRows()`
// the PDF/Excel exports use, and writes the result to a single key. The HTML
// only ever formats what it is handed.
//
// Consequence worth knowing: the MS shows data as of the last time the studio
// was open. `generatedAt` is published so the tab can say how fresh it is
// rather than silently implying "live".

import * as db from '../db'
import { comparisonRows } from './exportData'

export const FEAS_KEY = 'atrium:feasibility'

export interface FeasCard {
  id: string
  name: string
  address: string        // "20–30 Newman Street, Preston VIC"
  strategy: string       // "BTR (Aggressive)" | "BTR+BTS+Hotel"
  tdc: number            // land-inclusive total development cost
  gdv: number            // GAV for income models, gross revenue for BTS
  margin: number | null  // % on cost; null when TDC is 0
  rlv: number
  scenario: string       // which mix scenario won
}

export interface FeasSnapshot {
  v: 1
  generatedAt: string
  cards: FeasCard[]
}

/**
 * Strategy label.
 *
 * Mirrors how the approved screen reads: when a project models a single family
 * we name the winning variant ("BTR (Aggressive)"); when it models several we
 * name the families it spans ("BTR+BTS+Hotel"), because no single variant
 * describes the project then.
 */
function strategyLabel(types: string[], bestType: string): string {
  const families = ['BTR', 'BTS', 'Hotel'].filter(f => types.some(t => t.startsWith(f)))
  return families.length > 1 ? families.join('+') : bestType
}

/** One card per project, using the best-RLV row — the same "★ BEST" rule the
 *  comparison export marks with a star. */
export function buildFeasCards(): FeasCard[] {
  const cards: FeasCard[] = []
  for (const p of db.getProjects()) {
    if (p.status === 'archived') continue
    let rows: ReturnType<typeof comparisonRows>
    try {
      rows = comparisonRows(p.id)
    } catch {
      continue   // a half-built project must not take the whole tab down
    }
    if (!rows.length) continue

    const best = rows.reduce((a, b) => (b.rlv > a.rlv ? b : a))
    // `address` already reads "575 Derrimut Road, Tarneit VIC 3029" on real
    // projects, and `suburb` is usually blank while `state` still holds a stale
    // 'QLD' default — appending them produced "…Tarneit VIC 3029, QLD". Only add
    // a locality when the address genuinely lacks one.
    const locality = [p.suburb, p.state].filter(Boolean).join(' ').trim()
    const hasLocality = /,/.test(p.address) || /\b(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b/.test(p.address)
    cards.push({
      id: p.id,
      name: p.name,
      address: hasLocality || !locality ? p.address : `${p.address}, ${locality}`,
      strategy: strategyLabel(rows.map(r => r.type), best.type),
      tdc: best.tdc,
      gdv: best.gav,
      margin: best.tdc > 0 ? ((best.gav - best.tdc) / best.tdc) * 100 : null,
      rlv: best.rlv,
      scenario: best.scenario,
    })
  }
  return cards.sort((a, b) => b.tdc - a.tdc)
}

/** Recompute and publish. Safe to call often — it's a few ms and a single write. */
export function publishFeasSnapshot(): void {
  try {
    const snap: FeasSnapshot = { v: 1, generatedAt: new Date().toISOString(), cards: buildFeasCards() }
    localStorage.setItem(FEAS_KEY, JSON.stringify(snap))
  } catch { /* quota / private mode — the MS falls back to its empty state */ }
}
