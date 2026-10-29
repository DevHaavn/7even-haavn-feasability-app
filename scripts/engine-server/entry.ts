import './polyfill'   // first: puts an in-memory localStorage in place before the feasibility code loads
import { getProjectTDC, getProjectGDV, getProfitMetrics } from '../../src/db/index'

// The real feasibility engine, for the server. Chat's project room calls this with the rows of ONE project as Supabase holds them (projects, project_data,
// mix_scenarios, scenario_data) and gets the same four numbers the app shows, because it is the same code (src/db/index.ts + src/engine), bundled by
// `npm run build:engine` into api/_utils/engineBundle.cjs. Never re-derive these numbers anywhere else.
// The hydration below mirrors pullFromCloud in src/db/cloud.ts, field for field; if that mapping changes, change this too (the parity test will say).
type Row = Record<string, unknown>
export interface ProjectRows { project: Row; data: Row | null; scenarios: Row[]; scenarioData: Row[] }
export interface ProjectNumbers { tdc: number; gdv: number; profit: number; marginOnCost: number; marginOnGdv: number; scenarios: number }

const filled = (v: unknown) => !!v && typeof v === 'object' && Object.keys(v as object).length > 0

export function projectNumbers(rows: ProjectRows): ProjectNumbers {
  localStorage.clear()
  const p = rows.project
  const pid = String(p.id)
  localStorage.setItem('projects', JSON.stringify([{
    id: p.id, name: p.name, type: p.type ?? undefined, status: p.status ?? 'active', address: p.address ?? '', suburb: '', state: 'QLD', zone: '', responsibleAuthority: '',
    brand: p.brand ?? '7even', lat: p.lat ?? undefined, lng: p.lng ?? undefined, createdAt: p.created_at, updatedAt: p.updated_at,
  }]))
  const pd = rows.data
  if (pd) {
    if (filled(pd.site)) localStorage.setItem(`site:${pid}`, JSON.stringify(pd.site))
    if (filled(pd.land)) localStorage.setItem(`land:${pid}`, JSON.stringify(pd.land))
    if (filled(pd.cost_stack)) localStorage.setItem(`coststack:${pid}`, JSON.stringify(pd.cost_stack))
    if (filled(pd.detailed_costs)) localStorage.setItem(`detailed-costs:${pid}`, JSON.stringify(pd.detailed_costs))
    if (filled(pd.finance)) localStorage.setItem(`finance:${pid}`, JSON.stringify(pd.finance))
    if (Array.isArray(pd.timeline) && pd.timeline.length > 0) localStorage.setItem(`timeline:${pid}`, JSON.stringify(pd.timeline))
    if (filled(pd.cashflow)) localStorage.setItem(`cashflow:${pid}`, JSON.stringify(pd.cashflow))
  }
  const scens = rows.scenarios.map((s) => ({ id: s.id, projectId: s.project_id, name: s.name, createdAt: s.created_at }))
  if (scens.length) localStorage.setItem(`scenarios:${pid}`, JSON.stringify(scens))
  for (const sd of rows.scenarioData) {
    const sid = String(sd.scenario_id)
    if (Array.isArray(sd.unit_types) && sd.unit_types.length > 0) localStorage.setItem(`units:${sid}`, JSON.stringify(sd.unit_types))
    if (filled(sd.btr)) localStorage.setItem(`btr:${sid}`, JSON.stringify(sd.btr))
    if (filled(sd.bts)) localStorage.setItem(`bts:${sid}`, JSON.stringify(sd.bts))
    if (filled(sd.hotel)) localStorage.setItem(`hotel:${sid}`, JSON.stringify(sd.hotel))
  }
  const m = getProfitMetrics(pid)
  return { tdc: m.tdc, gdv: Math.max(m.gdv, getProjectGDV(pid)), profit: m.profit, marginOnCost: m.marginOnCost, marginOnGdv: m.marginOnGdv, scenarios: scens.length }
}
export { getProjectTDC }
