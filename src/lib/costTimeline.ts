import { getTimelineTasks, saveTimelineTasks } from '../db'
import type { CostLineItem, TimelineTask, TimelineCategory, CostPhase } from '../db/schema'

// A cost-stack line becomes a live Timeline task once it's given a status and
// start/end dates in its detail screen. The task carries `sourceCostId` so it's
// kept in sync (updated/removed) rather than duplicated. This is what lets the
// team drive the critical path — colour, status, dates, milestone — straight from
// each individual cost item, and have it show on the Gantt + feed Dashboard health.

const PHASE_TO_CATEGORY: Record<CostPhase, TimelineCategory> = {
  'pre-acquisition': 'acquisition',
  'acquisition-planning': 'planning',
  'pre-construction': 'site',
  'construction': 'construction',
  'close-out': 'commissioning',
}

/** Upsert (or remove) the Timeline task linked to a cost line, from its current state. */
export function syncCostLineTask(projectId: string, section: string, item: CostLineItem) {
  const tasks = getTimelineTasks(projectId)
  const idx = tasks.findIndex(t => t.sourceCostId === item.id)
  // Only place it on the Gantt once it has a status AND a start/end window.
  const ready = !!item.status && !!item.taskStart && !!item.taskEnd
  if (!ready) {
    if (idx >= 0) { const next = tasks.slice(); next.splice(idx, 1); saveTimelineTasks(projectId, next) }
    return
  }
  const prev = idx >= 0 ? tasks[idx] : undefined
  const task: TimelineTask = {
    id: prev?.id ?? `cst_${item.id}`,
    projectId,
    name: item.label || 'Cost item',
    category: item.phase ? PHASE_TO_CATEGORY[item.phase] : (prev?.category ?? 'planning'),
    phase: item.phase,
    assignee: prev?.assignee ?? '',
    startDate: item.taskStart!,
    endDate: item.taskEnd!,
    status: item.status!,
    progress: item.progress ?? 0,
    notes: prev?.notes ?? (item.notes && !item.notes.includes('|') ? item.notes : ''),
    isMilestone: !!item.milestone,
    color: item.barColor,
    sourceCostId: item.id,
    sourceSection: section,
  }
  const next = tasks.slice()
  if (idx >= 0) next[idx] = task; else next.push(task)
  saveTimelineTasks(projectId, next)
}

/** Remove a cost line's linked Timeline task (called when the line is deleted). */
export function removeCostLineTask(projectId: string, itemId: string) {
  const tasks = getTimelineTasks(projectId)
  const next = tasks.filter(t => t.sourceCostId !== itemId)
  if (next.length !== tasks.length) saveTimelineTasks(projectId, next)
}
