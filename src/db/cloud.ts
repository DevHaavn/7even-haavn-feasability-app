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
  supabase.from('project_data').upsert({
    project_id: projectId,
    [field]: data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id' }).then(({ error }) => { if (error) console.warn(`[cloud] pushProjectField ${field}`, error.message) })
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
    ] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('project_data').select('*'),
      supabase.from('mix_scenarios').select('*'),
      supabase.from('scenario_data').select('*'),
      supabase.from('snapshots').select('*'),
    ])

    if (pe || pde || se || sde || snape) {
      console.warn('[cloud] pull error', pe || pde || se || sde || snape)
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

    // Hydrate project data
    for (const pd of (projectData ?? [])) {
      const pid = pd.project_id as string
      if (pd.site && Object.keys(pd.site as object).length > 0)
        localStorage.setItem(`site:${pid}`, JSON.stringify(pd.site))
      if (pd.land && Object.keys(pd.land as object).length > 0)
        localStorage.setItem(`land:${pid}`, JSON.stringify(pd.land))
      if (pd.cost_stack && Object.keys(pd.cost_stack as object).length > 0)
        localStorage.setItem(`coststack:${pid}`, JSON.stringify(pd.cost_stack))
      if (pd.detailed_costs && Object.keys(pd.detailed_costs as object).length > 0)
        localStorage.setItem(`detailed-costs:${pid}`, JSON.stringify(pd.detailed_costs))
      if (pd.finance && Object.keys(pd.finance as object).length > 0)
        localStorage.setItem(`finance:${pid}`, JSON.stringify(pd.finance))
      if (Array.isArray(pd.timeline) && pd.timeline.length > 0)
        localStorage.setItem(`timeline:${pid}`, JSON.stringify(pd.timeline))
      if (pd.cashflow && Object.keys(pd.cashflow as object).length > 0)
        localStorage.setItem(`cashflow:${pid}`, JSON.stringify(pd.cashflow))
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

    return true
  } catch (err) {
    console.warn('[cloud] pullFromCloud failed', err)
    return false
  }
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
    .subscribe()

  return () => { channel?.unsubscribe(); channel = null }
}
