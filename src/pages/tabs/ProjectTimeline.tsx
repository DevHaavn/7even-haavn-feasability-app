import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { getTimelineTasks, saveTimelineTasks, generateId, getCostStack } from '../../db'
import { useAutosave } from '../../lib/useAutosave'
import { COST_PHASES, CATEGORY_TO_PHASE } from '../../db/schema'
import type { TimelineTask, TimelineCategory, TimelineStatus, CostPhase } from '../../db/schema'
import { DateField } from '../../components/ui'
import { getPhaseCosts } from '../../db'

interface Props { projectId: string }

// ── Constants ────────────────────────────────────────────────────────────────

const PX_PER_DAY = 5          // pixels per day — gives readable spacing, wide scroll
const LABEL_W    = 280        // fixed left column width
const PCT_W      = 64         // fixed right column: % complete (design draws it as its own column)
const ROW_H      = 36         // task row height
const HEADER_H   = 48         // month header height

// ── Traffic light status colours ─────────────────────────────────────────────
// 🔴 critical = in trouble (flashing)
// 🟡 delayed  = needs attention
// 🟢 in-progress = on track
// 🟣 complete
// ⚫ not-started

const STATUS_COLORS: Record<TimelineStatus, string> = {
  'critical':    'var(--red)',
  // Delayed is a caution, so it reads amber. It had become silver in the colour
  // sweep, which contradicted both the playbook and its own label ("🟡 Delayed").
  'delayed':     'var(--amber)',
  // Playbook: silver = in progress, green = complete. Purple was decorative.
  // The STATUS_LABELS emoji below are kept in step with these colours — JB
  // authorised that emoji change explicitly, since the labels name their colour.
  'in-progress': 'var(--gold)',
  'complete':    'var(--emerald)',
  'not-started': 'var(--ink-3)',
}
const STATUS_LABELS: Record<TimelineStatus, string> = {
  'critical':    '🔴 Critical — In Trouble',
  'delayed':     '🟡 Delayed — Needs Attention',
  'in-progress': '🔘 In Progress — On Track',
  'complete':    '🟢 Complete',
  'not-started': '⚫ Not Started',
}
const STATUS_SHORT: Record<TimelineStatus, string> = {
  'critical':    'Critical',
  'delayed':     'Delayed',
  'in-progress': 'On Track',
  'complete':    'Complete',
  'not-started': 'Not Started',
}

const CAT_COLORS: Record<TimelineCategory, string> = {
  acquisition:   'var(--gold)',
  planning:      'var(--purple)',
  approvals:     'var(--blue)',
  site:          'var(--gold)',
  construction:  'var(--ink-2)',
  fitout:        'var(--emerald)',
  commissioning: 'var(--red)',
}
const CAT_LABELS: Record<TimelineCategory, string> = {
  acquisition:   'Acquisition',
  planning:      'Planning',
  approvals:     'Approvals',
  site:          'Site Works',
  construction:  'Construction',
  fitout:        'Fitout',
  commissioning: 'Commissioning',
}
const CATS      = Object.keys(CAT_COLORS) as TimelineCategory[]
const STATUSES  = Object.keys(STATUS_COLORS) as TimelineStatus[]

// ── Delivery phases — the Timeline is organised by the same five phases used
// across every project tab (Cost Stack, Cashflow, Land & Terms). ──
// Phase is a category, not a verdict — muted only, and matched to the same
// mapping the Dashboard uses so the two tabs agree. 'close-out' was emerald and
// 'acquisition-planning' purple: decorative uses of a functional colour and of
// the rainbow respectively.
const PHASE_COLORS: Record<CostPhase, string> = {
  'pre-acquisition':      'var(--slate)',
  'acquisition-planning': 'var(--slate)',
  'pre-construction':     'var(--blue)',
  'construction':         'var(--gold)',
  'close-out':            'var(--ink-3)',
}
const PHASES = COST_PHASES.map(p => p.id)
const PHASE_LABEL: Record<CostPhase, string> = Object.fromEntries(COST_PHASES.map(p => [p.id, p.label])) as Record<CostPhase, string>
const taskPhase = (t: TimelineTask): CostPhase => t.phase ?? CATEGORY_TO_PHASE[t.category]
const phaseFmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`

const BLANK_TASK: Omit<TimelineTask, 'id' | 'projectId'> = {
  name: '', category: 'planning', assignee: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate:   new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
  status: 'not-started', progress: 0, notes: '', isMilestone: false,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(s: string) { return new Date(s + 'T00:00:00') }
function daysBetween(a: string, b: string) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400_000)
}
function dayPx(days: number) { return days * PX_PER_DAY }
function addDays(iso: string, days: number) {
  const d = parseDate(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10)
}
function yearOf(iso: string) { return parseInt(iso.slice(0, 4), 10) }

// ── Main component ────────────────────────────────────────────────────────────

export default function ProjectTimeline({ projectId }: Props) {
  const [tasks, setTasks]     = useState<TimelineTask[]>(() => getTimelineTasks(projectId))
  const [editing, setEditing] = useState<TimelineTask | null>(null)
  const [isNew, setIsNew]     = useState(false)
  const [filterPhase, setFilterPhase] = useState<CostPhase | 'all'>('all')
  const phaseCosts = useMemo(() => getPhaseCosts(projectId), [projectId, tasks])
  // Screen real-estate: show one year at a time (default the current year).
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear())
  // "All dates" — span every year on one scrollable timeline (no year switching).
  const [allDates, setAllDates] = useState(false)
  // Drag-to-move: grab a bar and slide it; commits new start/end on release.
  const dragRef = useRef<{ id: string; startX: number; origStart: string; origEnd: string; moved: boolean } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragDays, setDragDays] = useState(0)

  const { commit, undo, canUndo } = useAutosave<TimelineTask[]>(t => saveTimelineTasks(projectId, t), [projectId], { onLiveReload: () => setTasks(getTimelineTasks(projectId)) })
  function persist(next: TimelineTask[]) { commit(tasks, next); setTasks(next) }
  function openNew()  { setEditing({ id: generateId(), projectId, ...BLANK_TASK }); setIsNew(true) }
  function openEdit(t: TimelineTask) { setEditing({ ...t }); setIsNew(false) }
  function remove(id: string) { persist(tasks.filter(t => t.id !== id)); if (editing?.id === id) setEditing(null) }
  function save() {
    if (!editing || !editing.name.trim()) return
    persist(isNew ? [...tasks, editing] : tasks.map(t => t.id === editing.id ? editing : t))
    setEditing(null)
  }

  // Year range — the studio's projects start from 2024, so offer every year from
  // 2024 through at least two years past today (and any year a task spans).
  const years = useMemo(() => {
    const nowY = new Date().getFullYear()
    let max = nowY + 2
    tasks.forEach(t => { max = Math.max(max, yearOf(t.endDate), yearOf(t.startDate)) })
    const out: number[] = []
    for (let y = 2024; y <= max; y++) out.push(y)
    return out
  }, [tasks])

  // Window = the selected year, or every year when "All dates" is on.
  const spanFirst = years[0] ?? viewYear
  const spanLast = years[years.length - 1] ?? viewYear
  const minDate = allDates ? `${spanFirst}-01-01` : `${viewYear}-01-01`
  const maxDate = allDates ? `${spanLast}-12-31` : `${viewYear}-12-31`
  const totalDays = daysBetween(minDate, maxDate) + 1

  // Tasks whose span overlaps the window (all tasks when "All dates" is on).
  const visible = tasks.filter(t =>
    (filterPhase === 'all' || taskPhase(t) === filterPhase) &&
    (allDates || (yearOf(t.startDate) <= viewYear && yearOf(t.endDate) >= viewYear)),
  )

  // Drag-to-move listeners — translate horizontal mouse movement into whole days.
  useEffect(() => {
    function mm(e: MouseEvent) {
      if (!dragRef.current) return
      const dd = Math.round((e.clientX - dragRef.current.startX) / (PX_PER_DAY * (Number(getComputedStyle(document.documentElement).getPropertyValue('--ws-zoom')) || 1)))
      if (dd !== 0) dragRef.current.moved = true
      setDragDays(dd)
    }
    function mu() {
      const d = dragRef.current
      if (d && d.moved && dragDaysRef.current !== 0) {
        const dd = dragDaysRef.current
        persist(tasks.map(t => t.id === d.id ? { ...t, startDate: addDays(d.origStart, dd), endDate: addDays(d.origEnd, dd) } : t))
        clickGuard.current = true   // suppress the click that follows a drag
      }
      dragRef.current = null; setDragId(null); setDragDays(0)
    }
    window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu)
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }
  }, [tasks])
  const dragDaysRef = useRef(0)
  dragDaysRef.current = dragDays
  const clickGuard = useRef(false)

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayPx  = dayPx(Math.max(0, daysBetween(minDate, todayStr)))

  // Month grid lines + labels
  const monthMarkers = useMemo(() => {
    const marks: { label: string; px: number; isYear: boolean }[] = []
    const start = parseDate(minDate)
    const end   = parseDate(maxDate)
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const px = dayPx(daysBetween(minDate, cur.toISOString().slice(0, 10)))
      if (px >= 0) {
        const isYear = cur.getMonth() === 0
        marks.push({
          label: isYear
            ? cur.getFullYear().toString()
            : cur.toLocaleDateString('en-AU', { month: 'short' }),
          px, isYear,
        })
      }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
    return marks
  }, [minDate, maxDate, totalDays])

  // Group visible tasks by delivery phase (COST_PHASES order)
  const grouped = useMemo(() => {
    const map = new Map<CostPhase, TimelineTask[]>()
    for (const p of PHASES) map.set(p, [])
    for (const t of visible) map.get(taskPhase(t))?.push(t)
    return Array.from(map.entries()).filter(([, arr]) => arr.length > 0)
  }, [visible])

  // Stats
  const total    = tasks.length
  const complete = tasks.filter(t => t.status === 'complete').length
  const onTrack  = tasks.filter(t => t.status === 'in-progress').length
  const atRisk   = tasks.filter(t => t.status === 'delayed').length
  const critical = tasks.filter(t => t.status === 'critical').length
  const overallPct = total > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total) : 0
  // Current delivery phase (set on the Cost Stack tab)
  const phaseLabel = COST_PHASES.find(p => p.id === getCostStack(projectId).currentPhase)?.label

  const ganttW = dayPx(totalDays)

  return (
    // minWidth:0 on the ROOT is what stops the Gantt bullying the page. This div is
    // a flex item, and a flex item defaults to min-width:auto (= min-content), so
    // the Gantt's ~1800px row propagated all the way up here and forced the whole
    // tab wider than its container — clipping the KPI strip and "+ Add task" off
    // the right edge. At 0 the root fits its container and the Gantt panel scrolls.
    <div style={{ background: 'transparent', color: 'var(--ink)', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

      {/* ─── Flashing keyframe style ─────────────────────────────────────────── */}
      <style>{`
        @keyframes tl-pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        .tl-critical-dot { animation: tl-pulse 1.2s ease-in-out infinite; }
        @keyframes tl-ping { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.2);opacity:0} }
        .tl-critical-ring { animation: tl-ping 1.2s ease-out infinite; }
      `}</style>

      {/* ─── Page head — kicker + serif title + sub, year nav and Add task right.
           Replaces a bespoke dark control bar (hardcoded rgba(22,22,24,.96)) that
           was still the OLD dark theme sitting on the light glass page. ─────── */}
      {/* maxWidth min(1440px, 100%): .fx-wrap's plain 1440 cap let the Gantt's wide
          row hold the wrap open at 1440 inside a ~1264 container, pushing the KPI
          strip and "+ Add task" off the right edge. Capping against the CONTAINER
          too means the wrap never outgrows the page — the Gantt panel scrolls
          sideways instead, which is what it is for. */}
      <div className="fx-wrap" style={{ minWidth: 0, maxWidth: 'min(1440px, 100%)' }}>
        <div className="pagehead">
          <div>
            <div className="kicker">07 · Timeline</div>
            <h1 className="h-sec">Programme &amp; Gantt</h1>
            <div className="h-sub">{total} tasks across {PHASES.length} phases · owners, dependencies and progress.</div>
          </div>
          <div className="flex gap aic wrapf">
            {canUndo && <span className="chip" onClick={() => undo(setTasks)}>↶ Undo</span>}
            <span className={`chip${allDates ? ' accent' : ''}`} onClick={() => setAllDates(v => !v)}>All dates</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: allDates ? 0.4 : 1 }}>
              <span className="chip" style={{ padding: '8px 11px' }} onClick={() => { if (!allDates) { setAllDates(false); setViewYear(y => y - 1) } }}>‹</span>
              <select className="sel" value={viewYear} disabled={allDates}
                onChange={e => { setAllDates(false); setViewYear(Number(e.target.value)) }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="chip" style={{ padding: '8px 11px' }} onClick={() => { if (!allDates) { setAllDates(false); setViewYear(y => y + 1) } }}>›</span>
            </span>
            <span className="chip accent" onClick={openNew}>+ Add task</span>
          </div>
        </div>

        {/* Status KPIs — the design's 5-up strip. Functional colours only, read
            from STATUS_COLORS so they cannot drift from the bars they summarise. */}
        <div className="kpis k5" style={{ marginBottom: 16 }}>
          <div className="kpi"><div className="lab">Critical</div><div className="val" style={{ color: STATUS_COLORS['critical'] }}>{critical}</div></div>
          <div className="kpi"><div className="lab">Delayed</div><div className="val" style={{ color: STATUS_COLORS['delayed'] }}>{atRisk}</div></div>
          <div className="kpi"><div className="lab">On track</div><div className="val" style={{ color: STATUS_COLORS['in-progress'] }}>{onTrack}</div></div>
          <div className="kpi"><div className="lab">Complete</div><div className="val" style={{ color: STATUS_COLORS['complete'] }}>{complete}</div></div>
          <div className="kpi gold">
            <div className="lab">Overall · {total} tasks</div>
            <div className="val" style={{ color: 'var(--gold)' }}>{overallPct}%</div>
            <div className="track-bar" style={{ marginTop: 8 }}>
              <div className="fill" style={{ width: `${overallPct}%`, background: 'var(--gold)' }} />
            </div>
          </div>
        </div>

        {/* Phase filter — the design's segmented pill (was a row of dark chips) */}
        <div className="seg" style={{ marginBottom: 16 }}>
          <button className={filterPhase === 'all' ? 'on' : ''} onClick={() => setFilterPhase('all')}>All phases</button>
          {PHASES.map(p => (
            <button key={p} className={filterPhase === p ? 'on' : ''} onClick={() => setFilterPhase(p)}>{PHASE_LABEL[p]}</button>
          ))}
        </div>

      {/* ─── Gantt — in the SAME .fx-wrap as the head above, so the two cannot
           disagree about where the left edge is. As siblings they did: each wrap
           resolved its own width against the flex column (941 vs 1440 CSS px) and
           the panel sat ~200px left of the head. One wrap, one edge. ────────── */}
      {tasks.length > 0 ? (
        <>
        {/* Sizes to its content and lets the PAGE scroll vertically — one
            scrollbar, same as the Product Mix drawer. It still scrolls
            SIDEWAYS on its own, because the month columns genuinely run wider
            than the panel. flex:1 was no use here: no ancestor sets a definite
            height, so the panel collapsed to ~90px and cut the Gantt off. */}
        <div className="panel" style={{ overflowX: 'auto', position: 'relative', minWidth: 0 }}>
          <div style={{ minWidth: LABEL_W + ganttW + PCT_W }}>

            {/* Month header — sticky top */}
            <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--card-2)', display: 'flex', height: HEADER_H, borderBottom: '1px solid var(--border)' }}>

              {/* Label column spacer */}
              <div style={{ width: LABEL_W, flexShrink: 0, background: 'var(--card-2)', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'flex-end', padding: '0 12px 8px' }}>
                <span style={{ fontSize: 7, letterSpacing: '0.20em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>Task · Owner</span>
              </div>

              {/* Month labels + vertical grid lines */}
              <div style={{ position: 'relative', width: ganttW, flexShrink: 0 }}>
                {monthMarkers.map((m, i) => (
                  <React.Fragment key={i}>
                    {/* Vertical grid line */}
                    <div style={{
                      position: 'absolute', left: m.px, top: 0, bottom: 0,
                      width: m.isYear ? 1 : 1,
                      background: m.isYear ? 'var(--faint)' : 'var(--border)',
                      zIndex: 1,
                    }} />
                    {/* Month label */}
                    <span style={{
                      position: 'absolute', left: m.px + 5, top: m.isYear ? 8 : 14,
                      fontSize: m.isYear ? 10 : 9,
                      fontWeight: m.isYear ? 700 : 400,
                      color: m.isYear ? 'var(--ink-3)' : 'var(--ink-2)',
                      letterSpacing: m.isYear ? '0.12em' : '0.08em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      zIndex: 2,
                    }}>{m.label}</span>
                  </React.Fragment>
                ))}
                {/* Today line in header */}
                <div style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 2, background: 'var(--gold)', zIndex: 5 }}>
                  <span style={{ position: 'absolute', top: 6, left: 4, fontSize: 7, color: 'var(--gold)', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>TODAY</span>
                </div>
              </div>

              {/* % complete — its own column on the right, per the design */}
              <div style={{ width: PCT_W, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '0 12px 8px' }}>
                <span style={{ fontSize: 7, letterSpacing: '0.20em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>%</span>
              </div>
            </div>

            {/* Task rows grouped by delivery phase */}
            {grouped.map(([cat, catTasks]) => (
              <div key={cat}>

                {/* Phase header row — label + task count + cost of works for the phase (30% larger) */}
                <div style={{ display: 'flex', height: 39, alignItems: 'center', background: `linear-gradient(90deg, ${PHASE_COLORS[cat]}14, ${PHASE_COLORS[cat]}07)`, borderBottom: `1px solid ${PHASE_COLORS[cat]}2E`, borderTop: `1px solid ${PHASE_COLORS[cat]}18` }}>
                  <div style={{ width: LABEL_W, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '0 13px', borderRight: '1px solid var(--border)', position: 'sticky', left: 0, zIndex: 8, background: `${PHASE_COLORS[cat]}12` }}>
                    <span style={{ width: 4, height: 16, borderRadius: 1, background: PHASE_COLORS[cat], flexShrink: 0 }} />
                    <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: PHASE_COLORS[cat], fontWeight: 700 }}>{PHASE_LABEL[cat]}</span>
                    <span style={{ fontSize: 10.5, color: PHASE_COLORS[cat], fontWeight: 700, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }} title="Cost of works in this phase">{phaseFmt(phaseCosts[cat] || 0)}</span>
                    <span style={{ fontSize: 9, color: `${PHASE_COLORS[cat]}88` }}>· {catTasks.length}</span>
                  </div>
                  {/* Phase grid underlay */}
                  <div style={{ width: ganttW, flexShrink: 0, position: 'relative', height: '100%' }}>
                    {monthMarkers.map((m, i) => <div key={i} style={{ position: 'absolute', left: m.px, top: 0, bottom: 0, width: 1, background: m.isYear ? 'var(--border)' : 'var(--line)' }} />)}
                    <div style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 2, background: 'color-mix(in srgb, var(--gold) 20%, transparent)' }} />
                  </div>
                </div>

                {/* Task rows */}
                {catTasks.map(task => {
                  const startPx  = dayPx(Math.max(0, daysBetween(minDate, task.startDate)))
                  const widthPx  = Math.max(8, dayPx(Math.max(1, daysBetween(task.startDate, task.endDate))))
                  const sColor   = STATUS_COLORS[task.status]
                  const isMile   = task.isMilestone
                  const isCrit   = task.status === 'critical'

                  return (
                    <div key={task.id}
                      style={{ display: 'flex', height: ROW_H, alignItems: 'center', borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--line)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      {/* Task label — sticky left */}
                      <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 6, background: 'inherit', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: '100%', cursor: 'pointer' }}
                        onClick={() => openEdit(task)}>

                        {/* Traffic light dot */}
                        <span style={{ position: 'relative', width: 8, height: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isCrit && <span className="tl-critical-ring" style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'block' } as CSSProperties} />}
                          <span className={isCrit ? 'tl-critical-dot' : ''} style={{ width: isMile ? 0 : 8, height: isMile ? 0 : 8, borderRadius: '50%', background: sColor, display: 'block', border: isMile ? 'none' : undefined, flexShrink: 0 }} />
                          {isMile && <span style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: sColor, display: 'block' }} />}
                        </span>

                        {/* Task name */}
                        <span style={{ fontSize: 10, color: task.status === 'complete' ? 'var(--faint)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textDecoration: task.status === 'complete' ? 'line-through' : undefined }}>{task.name}</span>

                        {/* Assignee initial */}
                        {task.assignee && <span style={{ fontSize: 7, color: 'var(--ink-3)', flexShrink: 0, maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assignee.split(' ')[0]}</span>}
                      </div>

                      {/* Gantt bar area */}
                      <div style={{ width: ganttW, flexShrink: 0, position: 'relative', height: '100%' }}>

                        {/* Vertical month grid lines */}
                        {monthMarkers.map((m, i) => <div key={i} style={{ position: 'absolute', left: m.px, top: 0, bottom: 0, width: 1, background: m.isYear ? 'var(--border)' : 'var(--line)' }} />)}

                        {/* Today line */}
                        <div style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 2, background: 'color-mix(in srgb, var(--gold) 33%, transparent)', zIndex: 3 }} />

                        {(() => {
                          const dragOffset = dragId === task.id ? dragDays * PX_PER_DAY : 0
                          const startDrag = (e: React.MouseEvent) => {
                            e.stopPropagation()
                            dragRef.current = { id: task.id, startX: e.clientX, origStart: task.startDate, origEnd: task.endDate, moved: false }
                            setDragId(task.id)
                          }
                          const guardedEdit = () => { if (clickGuard.current) { clickGuard.current = false; return } openEdit(task) }
                          return isMile ? (
                          <div onMouseDown={startDrag} onClick={guardedEdit}
                            title="Drag to move"
                            style={{ position: 'absolute', left: startPx + dragOffset, top: '50%', transform: 'translate(-50%, -50%) rotate(45deg)', width: 10, height: 10, background: sColor, zIndex: dragId === task.id ? 6 : 4, boxShadow: `0 0 6px ${sColor}88`, cursor: dragId === task.id ? 'grabbing' : 'grab' }} />
                        ) : (
                          <div
                            onMouseDown={startDrag}
                            onClick={guardedEdit}
                            title="Drag to move · click to edit"
                            style={{ position: 'absolute', left: startPx + dragOffset, width: widthPx, top: '50%', transform: 'translateY(-50%)', height: 20, background: `${sColor}25`, border: `1px solid ${sColor}80`, borderRadius: 3, zIndex: dragId === task.id ? 6 : 4, overflow: 'hidden', cursor: dragId === task.id ? 'grabbing' : 'grab', boxShadow: isCrit || dragId === task.id ? `0 0 8px ${sColor}66` : undefined }}>
                            {/* Progress fill */}
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${task.progress}%`, background: `${sColor}50` }} />
                          </div>
                        )
                        })()}
                      </div>

                      {/* % complete — its own column, always shown (it used to sit
                          inside the bar and vanish on any bar under 30px wide). */}
                      <div style={{ width: PCT_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 12px' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: task.progress >= 100 ? 'var(--emerald)' : task.progress > 0 ? 'var(--ink-2)' : 'var(--faint)' }}>{task.progress}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Bottom padding */}
            <div style={{ height: 40 }} />
          </div>
        </div>
        </>
      ) : (
        <div className="panel pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: '60px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>No timeline tasks yet</p>
          <span className="chip accent" onClick={openNew}>+ Add first task</span>
        </div>
      )}
      </div>

      {/* ─── Edit / Add modal ────────────────────────────────────────────────── */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          {/* OPAQUE — see .fx-modal. --card-2 is white at 50%, so over the 75%
              black overlay the card muddied to grey and the fields inside were
              unreadable. */}
          <div className="fx-modal" style={{ width: 540, borderRadius: 10, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{isNew ? 'Add Task' : 'Edit Task'}</p>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>

            <Field label="Task Name">
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} autoFocus placeholder="e.g. DA Lodgement" style={INPUT} />
            </Field>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Phase" flex={1}>
                <select value={taskPhase(editing)} onChange={e => setEditing({ ...editing, phase: e.target.value as CostPhase })} style={INPUT}>
                  {PHASES.map(p => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
                </select>
              </Field>
              <Field label="Status / Traffic Light" flex={1}>
                <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as TimelineStatus })} style={{ ...INPUT, color: STATUS_COLORS[editing.status] }}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </Field>
            </div>

            {/* Traffic light preview */}
            <div style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 3, alignItems: 'center' }}>
              {STATUSES.map(s => (
                <button key={s} onClick={() => setEditing({ ...editing, status: s as TimelineStatus })}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', border: `1px solid ${editing.status === s ? STATUS_COLORS[s as TimelineStatus] : 'var(--border)'}`, background: editing.status === s ? `${STATUS_COLORS[s as TimelineStatus]}18` : 'transparent', cursor: 'pointer', borderRadius: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s as TimelineStatus], display: 'block', flexShrink: 0 }} />
                  <span style={{ fontSize: 7, color: editing.status === s ? STATUS_COLORS[s as TimelineStatus] : 'var(--ink-3)', letterSpacing: '0.10em', whiteSpace: 'nowrap' }}>{STATUS_SHORT[s as TimelineStatus]}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Start Date" flex={1}>
                <DateField value={editing.startDate} onChange={v => setEditing({ ...editing, startDate: v })} style={INPUT} dark />
              </Field>
              <Field label="End Date" flex={1}>
                <DateField value={editing.endDate} onChange={v => setEditing({ ...editing, endDate: v })} style={INPUT} dark />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Assignee / Consultant" flex={1}>
                <input value={editing.assignee} onChange={e => setEditing({ ...editing, assignee: e.target.value })} placeholder="e.g. Fraser & Partners" style={INPUT} />
              </Field>
              <Field label={`Progress — ${editing.progress}%`} flex={1}>
                <input type="range" min={0} max={100} step={5} value={editing.progress}
                  onChange={e => setEditing({ ...editing, progress: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: STATUS_COLORS[editing.status], marginTop: 8 }} />
              </Field>
            </div>

            <Field label="Notes">
              <textarea value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={2} placeholder="Additional detail..." style={{ ...INPUT, resize: 'vertical' as const }} />
            </Field>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={editing.isMilestone} onChange={e => setEditing({ ...editing, isMilestone: e.target.checked })} style={{ accentColor: 'var(--gold)', width: 14, height: 14 }} />
              <span style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>Milestone (diamond marker)</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              {!isNew
                ? <button onClick={() => { remove(editing.id); setEditing(null) }} style={{ background: 'none', border: '1px solid color-mix(in srgb, var(--red) 19%, transparent)', color: 'var(--red)', padding: '8px 16px', fontSize: 9, letterSpacing: '0.12em', cursor: 'pointer' }}>Delete</button>
                : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(null)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--ink-3)', padding: '8px 16px', fontSize: 9, letterSpacing: '0.12em', cursor: 'pointer' }}>Cancel</button>
                <button onClick={save} disabled={!editing.name.trim()} style={{ background: 'var(--ink)', border: 'none', color: 'var(--card)', padding: '8px 20px', fontSize: 9, letterSpacing: '0.14em', fontWeight: 700, cursor: 'pointer', opacity: editing.name.trim() ? 1 : 0.4 }}>
                  {isNew ? 'Add Task' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--ink)',
  padding: '8px 10px', fontSize: 11, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: flex ?? undefined }}>
      <label style={{ fontSize: 7, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</label>
      {children}
    </div>
  )
}


// ── Export traffic light colours for Dashboard use ────────────────────────────
export { STATUS_COLORS, STATUS_SHORT }
