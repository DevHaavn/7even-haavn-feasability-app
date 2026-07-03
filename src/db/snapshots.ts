import * as db from './index'
import { pushSnapshot, deleteCloudSnapshot } from './cloud'

export interface ProjectSnapshot {
  id: string
  projectId: string
  label: string
  createdAt: string
  data: SnapshotData
}

interface SnapshotData {
  project: ReturnType<typeof db.getProject>
  site: ReturnType<typeof db.getSiteDesign>
  land: ReturnType<typeof db.getLandTerms>
  costStack: ReturnType<typeof db.getCostStack>
  detailedCosts: ReturnType<typeof db.getDetailedCostStack>
  finance: ReturnType<typeof db.getFinanceAssumptions>
  timeline: ReturnType<typeof db.getTimelineTasks>
  scenarios: Array<{
    scenario: import('./schema').MixScenario
    units: ReturnType<typeof db.getUnitTypes>
    btr: ReturnType<typeof db.getBTRAssumptions>
    bts: ReturnType<typeof db.getBTSAssumptions>
    hotel: ReturnType<typeof db.getHotelAssumptions>
  }>
}

const SNAPSHOTS_KEY = (projectId: string) => `snapshots:${projectId}`
const MAX_SNAPSHOTS = 20

function loadSnapshots(projectId: string): ProjectSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY(projectId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSnapshots(projectId: string, snapshots: ProjectSnapshot[]) {
  localStorage.setItem(SNAPSHOTS_KEY(projectId), JSON.stringify(snapshots))
}

export function captureSnapshot(projectId: string, label?: string): ProjectSnapshot {
  const scenarios = db.getMixScenarios(projectId).map(scenario => ({
    scenario,
    units: db.getUnitTypes(scenario.id),
    btr: db.getBTRAssumptions(scenario.id),
    bts: db.getBTSAssumptions(scenario.id),
    hotel: db.getHotelAssumptions(scenario.id),
  }))

  const snapshot: ProjectSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    projectId,
    label: label ?? `Snapshot ${new Date().toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    createdAt: new Date().toISOString(),
    data: {
      project: db.getProject(projectId),
      site: db.getSiteDesign(projectId),
      land: db.getLandTerms(projectId),
      costStack: db.getCostStack(projectId),
      detailedCosts: db.getDetailedCostStack(projectId),
      finance: db.getFinanceAssumptions(projectId),
      timeline: db.getTimelineTasks(projectId),
      scenarios,
    },
  }

  const existing = loadSnapshots(projectId)
  const updated = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS)
  saveSnapshots(projectId, updated)
  pushSnapshot(snapshot as unknown as Record<string, unknown>)
  return snapshot
}

export function getSnapshots(projectId: string): ProjectSnapshot[] {
  return loadSnapshots(projectId)
}

export function deleteSnapshot(projectId: string, snapshotId: string) {
  const updated = loadSnapshots(projectId).filter(s => s.id !== snapshotId)
  saveSnapshots(projectId, updated)
  deleteCloudSnapshot(projectId, snapshotId)
}

export function restoreSnapshot(snapshot: ProjectSnapshot) {
  const { projectId, data } = snapshot

  if (data.project) db.saveProject(data.project)
  db.saveSiteDesign(data.site)
  db.saveLandTerms(data.land)
  db.saveCostStack(data.costStack)
  db.saveDetailedCostStack(data.detailedCosts)
  db.saveFinanceAssumptions(data.finance)
  db.saveTimelineTasks(projectId, data.timeline)

  // Wipe current scenarios then restore
  db.getMixScenarios(projectId).forEach(s => db.deleteMixScenario(s.id, projectId))
  for (const { scenario, units, btr, bts, hotel } of data.scenarios) {
    db.saveMixScenario(scenario)
    db.saveUnitTypes(scenario.id, units)
    db.saveBTRAssumptions(btr)
    db.saveBTSAssumptions(bts)
    db.saveHotelAssumptions(hotel)
  }
}
