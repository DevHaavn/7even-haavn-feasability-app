/**
 * Supabase cloud sync layer.
 * Mirrors localStorage to Supabase on every save.
 * Pulls cloud state on startup (cloud wins over stale local data).
 * Real-time subscriptions push remote changes to all connected browsers.
 */

import { supabase, cloudEnabled } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Echo suppression ──────────────────────────────────────────────────────────
// The realtime channel fires on EVERY change, including this client's own
// writes. Without this, saving a mix triggers a re-pull that can clobber the
// just-saved edit with an eventual-consistency echo. After any local write we
// ignore realtime re-pulls for a short window so local edits always win.
let lastLocalWriteAt = 0
const SELF_ECHO_MS = 8000
function noteLocalWrite() { lastLocalWriteAt = Date.now() }
export function suppressingRemote() { return Date.now() - lastLocalWriteAt < SELF_ECHO_MS }

// ── Per-key edit guard ────────────────────────────────────────────────────────
// A background pull (startup or realtime) must NEVER overwrite a localStorage key
// that this user just edited — otherwise a fresh edit gets clobbered by older
// cloud data before the user's own push has round-tripped. We record the moment
// each key is written locally and refuse to overwrite it from the cloud for a
// grace window. Cross-device sync still works: once the window lapses (no active
// editing), the pushed value is in the cloud and pulls apply normally.
const EDIT_GUARD_MS = 20000
const lastKeyWriteAt = new Map<string, number>()
export function noteKeyWrite(key: string) { lastKeyWriteAt.set(key, Date.now()) }
function editedRecently(key: string) {
  const t = lastKeyWriteAt.get(key)
  return t != null && Date.now() - t < EDIT_GUARD_MS
}
// Map a project_data column to the localStorage key the pull would overwrite.
const FIELD_KEY: Record<string, (pid: string) => string> = {
  site: p => `site:${p}`, land: p => `land:${p}`, cost_stack: p => `coststack:${p}`,
  detailed_costs: p => `detailed-costs:${p}`, finance: p => `finance:${p}`,
  timeline: p => `timeline:${p}`, cashflow: p => `cashflow:${p}`,
}

// ── Push helpers (fire-and-forget from save functions) ────────────────────────

export function pushProject(project: Record<string, unknown>) {
  noteLocalWrite()
  supabase.from('projects').upsert({
    id: project.id,
    name: project.name,
    type: project.type ?? null,
    status: project.status ?? 'active',
    address: project.address ?? null,
    brand: project.brand ?? '7even',
    lat: project.lat ?? null,
    lng: project.lng ?? null,
    updated_at: new Date().toISOString(),
  }).then(({ error }) => { if (error) console.warn('[cloud] pushProject', error.message) })
}

export function pushProjectField(projectId: string, field: 'site' | 'land' | 'cost_stack' | 'detailed_costs' | 'finance' | 'timeline' | 'cashflow', data: unknown) {
  noteLocalWrite()
  noteKeyWrite(FIELD_KEY[field](projectId))
  if (!cloudEnabled) { console.warn(`[cloud] ⚠ SKIPPED ${field} for ${projectId} — cloud disabled (missing Supabase env at build)`); return }
  supabase.from('project_data').upsert({
    project_id: projectId,
    [field]: data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id' })
    .then(({ error }) => {
      if (error) console.error(`[cloud] ✗ push FAILED ${field} for ${projectId}:`, error.message, error)
      else console.info(`[cloud] ✓ pushed ${field} for ${projectId}`)
    }, (err) => console.error(`[cloud] ✗ push THREW ${field} for ${projectId}:`, err?.message || err))
}

export function pushScenario(scenario: Record<string, unknown>) {
  noteLocalWrite()
  supabase.from('mix_scenarios').upsert({
    id: scenario.id,
    project_id: scenario.projectId,
    name: scenario.name,
  }).then(({ error }) => { if (error) console.warn('[cloud] pushScenario', error.message) })
}

export function pushScenarioField(scenarioId: string, field: 'unit_types' | 'btr' | 'bts' | 'hotel', data: unknown) {
  noteLocalWrite()
  supabase.from('scenario_data').upsert({
    scenario_id: scenarioId,
    [field]: data,
  }, { onConflict: 'scenario_id' }).then(({ error }) => { if (error) console.warn(`[cloud] pushScenarioField ${field}`, error.message) })
}

export function pushSnapshot(snapshot: Record<string, unknown>) {
  noteLocalWrite()
  supabase.from('snapshots').upsert({
    id: snapshot.id,
    project_id: snapshot.projectId,
    label: snapshot.label,
    data: snapshot.data,
    created_at: snapshot.createdAt,
  }).then(({ error }) => { if (error) console.warn('[cloud] pushSnapshot', error.message) })
}

export function deleteCloudSnapshot(projectId: string, snapshotId: string) {
  supabase.from('snapshots').delete().eq('id', snapshotId).eq('project_id', projectId)
    .then(({ error }) => { if (error) console.warn('[cloud] deleteSnapshot', error.message) })
}

export function deleteCloudProject(projectId: string) {
  supabase.from('projects').delete().eq('id', projectId)
    .then(({ error }) => { if (error) console.warn('[cloud] deleteProject', error.message) })
}

export function deleteCloudScenario(scenarioId: string) {
  supabase.from('mix_scenarios').delete().eq('id', scenarioId)
    .then(({ error }) => { if (error) console.warn('[cloud] deleteScenario', error.message) })
}

// ── Pull all data from Supabase into localStorage ─────────────────────────────

export async function pullFromCloud(): Promise<boolean> {
  if (!cloudEnabled) return true // local-only mode
  try {
    const [
      { data: projects, error: pe },
      { data: projectData, error: pde },
      { data: scenarios, error: se },
      { data: scenarioData, error: sde },
      { data: snapshots, error: snape },
      { data: feasibilityFiles, error: ffe },
    ] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('project_data').select('*'),
      supabase.from('mix_scenarios').select('*'),
      supabase.from('scenario_data').select('*'),
      supabase.from('snapshots').select('*'),
      supabase.from('feasibility_files').select('*'),
    ])

    if (pe || pde || se || sde || snape || ffe) {
      console.warn('[cloud] pull error', pe || pde || se || sde || snape || ffe)
      return false
    }

    if (!projects || projects.length === 0) return true // empty cloud, keep local

    // Hydrate projects
    const mapped = projects.map((p: Record<string, unknown>) => ({
      id: p.id,
      name: p.name,
      type: p.type ?? undefined,
      status: p.status ?? 'active',
      address: p.address ?? '',
      suburb: '',
      state: 'QLD',
      zone: '',
      responsibleAuthority: '',
      brand: p.brand ?? '7even',
      lat: p.lat ?? undefined,
      lng: p.lng ?? undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }))
    localStorage.setItem('projects', JSON.stringify(mapped))

    // Hydrate project data. `setKey` refuses to overwrite a field the user just
    // edited locally, so a background pull can never clobber a fresh in-progress
    // edit before the user's own push has round-tripped through the cloud.
    const setKey = (key: string, value: string) => {
      if (editedRecently(key)) return
      localStorage.setItem(key, value)
    }
    for (const pd of (projectData ?? [])) {
      const pid = pd.project_id as string
      if (pd.site && Object.keys(pd.site as object).length > 0)
        setKey(`site:${pid}`, JSON.stringify(pd.site))
      if (pd.land && Object.keys(pd.land as object).length > 0)
        setKey(`land:${pid}`, JSON.stringify(pd.land))
      if (pd.cost_stack && Object.keys(pd.cost_stack as object).length > 0)
        setKey(`coststack:${pid}`, JSON.stringify(pd.cost_stack))
      if (pd.detailed_costs && Object.keys(pd.detailed_costs as object).length > 0)
        setKey(`detailed-costs:${pid}`, JSON.stringify(pd.detailed_costs))
      if (pd.finance && Object.keys(pd.finance as object).length > 0)
        setKey(`finance:${pid}`, JSON.stringify(pd.finance))
      if (Array.isArray(pd.timeline) && pd.timeline.length > 0)
        setKey(`timeline:${pid}`, JSON.stringify(pd.timeline))
      if (pd.cashflow && Object.keys(pd.cashflow as object).length > 0)
        setKey(`cashflow:${pid}`, JSON.stringify(pd.cashflow))
    }

    // Hydrate scenarios
    const byProject: Record<string, unknown[]> = {}
    for (const s of (scenarios ?? [])) {
      const scenario = { id: s.id, projectId: s.project_id, name: s.name, createdAt: s.created_at }
      if (!byProject[s.project_id as string]) byProject[s.project_id as string] = []
      byProject[s.project_id as string].push(scenario)
    }
    for (const [pid, scens] of Object.entries(byProject)) {
      localStorage.setItem(`scenarios:${pid}`, JSON.stringify(scens))
    }

    // Hydrate scenario data
    for (const sd of (scenarioData ?? [])) {
      const sid = sd.scenario_id as string
      if (Array.isArray(sd.unit_types) && sd.unit_types.length > 0)
        localStorage.setItem(`units:${sid}`, JSON.stringify(sd.unit_types))
      if (sd.btr && Object.keys(sd.btr as object).length > 0)
        localStorage.setItem(`btr:${sid}`, JSON.stringify(sd.btr))
      if (sd.bts && Object.keys(sd.bts as object).length > 0)
        localStorage.setItem(`bts:${sid}`, JSON.stringify(sd.bts))
      if (sd.hotel && Object.keys(sd.hotel as object).length > 0)
        localStorage.setItem(`hotel:${sid}`, JSON.stringify(sd.hotel))
    }

    // Hydrate snapshots
    const snapsByProject: Record<string, unknown[]> = {}
    for (const snap of (snapshots ?? [])) {
      const pid = snap.project_id as string
      if (!snapsByProject[pid]) snapsByProject[pid] = []
      snapsByProject[pid].push({
        id: snap.id,
        projectId: pid,
        label: snap.label,
        data: snap.data,
        createdAt: snap.created_at,
      })
    }
    for (const [pid, snaps] of Object.entries(snapsByProject)) {
      localStorage.setItem(`snapshots:${pid}`, JSON.stringify(snaps))
    }

    // Hydrate feasibility files
    const filesByProject: Record<string, unknown[]> = {}
    for (const file of (feasibilityFiles ?? [])) {
      const pid = file.project_id as string
      if (!filesByProject[pid]) filesByProject[pid] = []
      filesByProject[pid].push({
        id: file.id,
        projectId: pid,
        fileName: file.file_name,
        createdAt: file.created_at,
        createdBy: file.created_by,
        lastAutosavedAt: file.last_autosaved_at,
        isLive: file.is_live,
      })
    }
    for (const [pid, files] of Object.entries(filesByProject)) {
      localStorage.setItem(`feasibility-files:${pid}`, JSON.stringify(files))
    }

    return true
  } catch (err) {
    console.warn('[cloud] pullFromCloud failed', err)
    return false
  }
}

// ── Feasibility Files ─────────────────────────────────────────────────────────

export function pushFeasibilityFiles(projectId: string, files: Record<string, unknown>[]) {
  noteLocalWrite()
  const fileData = files.map(f => ({
    id: f.id,
    project_id: projectId,
    file_name: f.fileName,
    created_at: f.createdAt,
    created_by: f.createdBy ?? null,
    last_autosaved_at: f.lastAutosavedAt,
    is_live: f.isLive,
  }))
  fileData.forEach(file => {
    supabase.from('feasibility_files').upsert(file).then(({ error }) => { if (error) console.warn('[cloud] pushFeasibilityFiles', error.message) })
  })
}

export function deleteFeasibilityFileCloud(projectId: string, fileId: string) {
  supabase.from('feasibility_files').delete().eq('id', fileId).eq('project_id', projectId)
    .then(({ error }) => { if (error) console.warn('[cloud] deleteFeasibilityFile', error.message) })
}

// ── Real-time subscription ────────────────────────────────────────────────────

let channel: RealtimeChannel | null = null

export function subscribeRealtime(onUpdate: () => void) {
  if (!cloudEnabled) return () => {} // local-only mode
  if (channel) channel.unsubscribe()

  // A remote change lands: re-pull — UNLESS we just wrote locally, in which case
  // this is the echo of our own save and re-pulling would clobber the fresh edit.
  const handleRemote = async () => {
    if (suppressingRemote()) return
    await pullFromCloud()
    onUpdate()
  }

  channel = supabase
    .channel('feasibility-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, handleRemote)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'project_data' }, handleRemote)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mix_scenarios' }, handleRemote)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scenario_data' }, handleRemote)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'feasibility_files' }, handleRemote)
    .subscribe()

  return () => { channel?.unsubscribe(); channel = null }
}
