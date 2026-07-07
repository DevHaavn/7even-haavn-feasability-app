import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { getTimelineTasks, saveTimelineTasks, generateId } from '../../db'
import type { TimelineTask, TimelineCategory, TimelineStatus } from '../../db/schema'

interface Props { projectId: string }

// ── Constants ────────────────────────────────────────────────────────────────

const PX_PER_DAY = 5          // pixels per day — gives readable spacing, wide scroll
const LABEL_W    = 280        // fixed left column width
const ROW_H      = 36         // task row height
const HEADER_H   = 48         // month header height

// ── Traffic light status colours ─────────────────────────────────────────────
// 🔴 critical = in trouble (flashing)
// 🟡 delayed  = needs attention
// 🟢 in-progress = on track
// 🟣 complete
// ⚫ not-started

const STATUS_COLORS: Record<TimelineStatus, string> = {
  'critical':    '#EF4444',
  'delayed':     '#EAB308',
  'in-progress': '#22C55E',
  'complete':    '#A855F7',
  'not-started': '#555555',
}
const STATUS_LABELS: Record<TimelineStatus, string> = {
  'critical':    '🔴 Critical — In Trouble',
  'delayed':     '🟡 Delayed — Needs Attention',
  'in-progress': '🟢 In Progress — On Track',
  'complete':    '🟣 Complete',
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
  acquisition:   '#C4973A',
  planning:      '#A855F7',
  approvals:     '#3B82F6',
  site:          '#EAB308',
  construction:  '#6B6B6B',
  fitout:        '#22C55E',
  commissioning: '#EF4444',
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
  const [filterCat, setFilterCat] = useState<TimelineCategory | 'all'>('all')
  // Screen real-estate: show one year at a time (default the current year).
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear())
  // Drag-to-move: grab a bar and slide it; commits new start/end on release.
  const dragRef = useRef<{ id: string; startX: number; origStart: string; origEnd: string; moved: boolean } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragDays, setDragDays] = useState(0)

  function persist(next: TimelineTask[]) { setTasks(next); saveTimelineTasks(projectId, next) }
  function openNew()  { setEditing({ id: generateId(), projectId, ...BLANK_TASK }); setIsNew(true) }
  function openEdit(t: TimelineTask) { setEditing({ ...t }); setIsNew(false) }
  function remove(id: string) { persist(tasks.filter(t => t.id !== id)); if (editing?.id === id) setEditing(null) }
  function save() {
    if (!editing || !editing.name.trim()) return
    persist(isNew ? [...tasks, editing] : tasks.map(t => t.id === editing.id ? editing : t))
    setEditing(null)
  }

  // Years that have any task activity, so the dropdown only offers real years.
  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()])
    tasks.forEach(t => { for (let y = yearOf(t.startDate); y <= yearOf(t.endDate); y++) set.add(y) })
    return [...set].sort((a, b) => a - b)
  }, [tasks])

  // Window = the selected year only (screen real-estate).
  const minDate = `${viewYear}-01-01`
  const maxDate = `${viewYear}-12-31`
  const totalDays = daysBetween(minDate, maxDate) + 1

  // Only tasks whose span overlaps the visible year.
  const visible = tasks.filter(t =>
    (filterCat === 'all' || t.category === filterCat) &&
    yearOf(t.startDate) <= viewYear && yearOf(t.endDate) >= viewYear,
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

  // Group visible tasks by category
  const grouped = useMemo(() => {
    const map = new Map<TimelineCategory, TimelineTask[]>()
    for (const c of CATS) map.set(c, [])
    for (const t of visible) map.get(t.category)?.push(t)
    return Array.from(map.entries()).filter(([, arr]) => arr.length > 0)
  }, [visible])

  // Stats
  const total    = tasks.length
  const complete = tasks.filter(t => t.status === 'complete').length
  const onTrack  = tasks.filter(t => t.status === 'in-progress').length
  const atRisk   = tasks.filter(t => t.status === 'delayed').length
  const critical = tasks.filter(t => t.status === 'critical').length
  const overallPct = total > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total) : 0

  const ganttW = dayPx(totalDays)

  return (
    <div style={{ background: '#F4F2EF', color: '#1A1A1A', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ─── Flashing keyframe style ─────────────────────────────────────────── */}
      <style>{`
        @keyframes tl-pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        .tl-critical-dot { animation: tl-pulse 1.2s ease-in-out infinite; }
        @keyframes tl-ping { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.2);opacity:0} }
        .tl-critical-ring { animation: tl-ping 1.2s ease-out infinite; }
      `}</style>

      {/* ─── Header bar ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #E4E1DC', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, flexWrap: 'wrap' }}>

        {/* Traffic light counts */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <TrafficLight color="#EF4444" count={critical} label="Critical" flash />
          <TrafficLight color="#EAB308" count={atRisk}   label="Delayed" />
          <TrafficLight color="#22C55E" count={onTrack}  label="On Track" />
          <TrafficLight color="#A855F7" count={complete} label="Complete" />
          <div style={{ width: 1, height: 24, background: '#E4E1DC' }} />
          <span style={{ fontSize: 9, color: '#555', letterSpacing: '0.10em' }}>{total} tasks</span>
          <span style={{ fontSize: 11, color: '#C4973A', fontWeight: 700 }}>{overallPct}%</span>
          <div style={{ width: 80, height: 3, background: '#E8E5E0', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${overallPct}%`, background: overallPct >= 80 ? '#22C55E' : overallPct >= 40 ? '#C4973A' : '#3B82F6', borderRadius: 2 }} />
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <FilterChip label="All" active={filterCat === 'all'} color="#777" onClick={() => setFilterCat('all')} />
          {CATS.filter(c => tasks.some(t => t.category === c)).map(c => (
            <FilterChip key={c} label={CAT_LABELS[c]} active={filterCat === c} color={CAT_COLORS[c]} onClick={() => setFilterCat(c)} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setViewYear(y => y - 1)} style={yrNav} aria-label="Previous year">‹</button>
          <select value={viewYear} onChange={e => setViewYear(Number(e.target.value))}
            style={{ background: '#fff', border: '1px solid #D8D5D0', borderRadius: 4, color: '#1A1A1A', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '6px 8px', cursor: 'pointer' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setViewYear(y => y + 1)} style={yrNav} aria-label="Next year">›</button>
        </div>
        <button onClick={openNew} style={{ padding: '7px 16px', background: '#F5F3F0', border: '1px solid #D0CEC9', color: '#2A2A2A', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 700 }}>
          + Add Task
        </button>
      </div>

      {/* ─── Gantt ───────────────────────────────────────────────────────────── */}
      {tasks.length > 0 ? (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          <div style={{ minWidth: LABEL_W + ganttW + 40 }}>

            {/* Month header — sticky top */}
            <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#F4F2EF', display: 'flex', height: HEADER_H, borderBottom: '1px solid #D8D5D0' }}>

              {/* Label column spacer */}
              <div style={{ width: LABEL_W, flexShrink: 0, background: '#F4F2EF', borderRight: '1px solid #D8D5D0', display: 'flex', alignItems: 'flex-end', padding: '0 12px 8px' }}>
                <span style={{ fontSize: 7, letterSpacing: '0.20em', color: '#9A968F', textTransform: 'uppercase' }}>Task</span>
              </div>

              {/* Month labels + vertical grid lines */}
              <div style={{ position: 'relative', width: ganttW, flexShrink: 0 }}>
                {monthMarkers.map((m, i) => (
                  <React.Fragment key={i}>
                    {/* Vertical grid line */}
                    <div style={{
                      position: 'absolute', left: m.px, top: 0, bottom: 0,
                      width: m.isYear ? 1 : 1,
                      background: m.isYear ? '#BEBAB3' : '#E0DDD8',
                      zIndex: 1,
                    }} />
                    {/* Month label */}
                    <span style={{
                      position: 'absolute', left: m.px + 5, top: m.isYear ? 8 : 14,
                      fontSize: m.isYear ? 10 : 9,
                      fontWeight: m.isYear ? 700 : 400,
                      color: m.isYear ? '#888' : '#555',
                      letterSpacing: m.isYear ? '0.12em' : '0.08em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      zIndex: 2,
                    }}>{m.label}</span>
                  </React.Fragment>
                ))}
                {/* Today line in header */}
                <div style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 2, background: '#C4973A', zIndex: 5 }}>
                  <span style={{ position: 'absolute', top: 6, left: 4, fontSize: 7, color: '#C4973A', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>TODAY</span>
                </div>
              </div>
            </div>

            {/* Task rows grouped by category */}
            {grouped.map(([cat, catTasks]) => (
              <div key={cat}>

                {/* Category header row */}
                <div style={{ display: 'flex', height: 30, alignItems: 'center', background: `${CAT_COLORS[cat]}08`, borderBottom: `1px solid ${CAT_COLORS[cat]}22` }}>
                  <div style={{ width: LABEL_W, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRight: '1px solid #D8D5D0', position: 'sticky', left: 0, zIndex: 8, background: `${CAT_COLORS[cat]}10` }}>
                    <span style={{ width: 3, height: 12, background: CAT_COLORS[cat], flexShrink: 0 }} />
                    <span style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: CAT_COLORS[cat], fontWeight: 700 }}>{CAT_LABELS[cat]}</span>
                    <span style={{ fontSize: 7, color: `${CAT_COLORS[cat]}77`, marginLeft: 'auto' }}>{catTasks.length}</span>
                  </div>
                  {/* Category grid underlay */}
                  <div style={{ width: ganttW, flexShrink: 0, position: 'relative', height: '100%' }}>
                    {monthMarkers.map((m, i) => <div key={i} style={{ position: 'absolute', left: m.px, top: 0, bottom: 0, width: 1, background: m.isYear ? '#D8D5D0' : '#EDEBE7' }} />)}
                    <div style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 2, background: '#C4973A33' }} />
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
                      style={{ display: 'flex', height: ROW_H, alignItems: 'center', borderBottom: '1px solid #E8E5E0' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#ECEAE6')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                      {/* Task label — sticky left */}
                      <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 6, background: 'inherit', borderRight: '1px solid #E4E1DC', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: '100%', cursor: 'pointer' }}
                        onClick={() => openEdit(task)}>

                        {/* Traffic light dot */}
                        <span style={{ position: 'relative', width: 8, height: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isCrit && <span className="tl-critical-ring" style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'block' } as CSSProperties} />}
                          <span className={isCrit ? 'tl-critical-dot' : ''} style={{ width: isMile ? 0 : 8, height: isMile ? 0 : 8, borderRadius: '50%', background: sColor, display: 'block', border: isMile ? 'none' : undefined, flexShrink: 0 }} />
                          {isMile && <span style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: sColor, display: 'block' }} />}
                        </span>

                        {/* Task name */}
                        <span style={{ fontSize: 10, color: task.status === 'complete' ? '#AAA' : '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textDecoration: task.status === 'complete' ? 'line-through' : undefined }}>{task.name}</span>

                        {/* Assignee initial */}
                        {task.assignee && <span style={{ fontSize: 7, color: '#9A968F', flexShrink: 0, maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assignee.split(' ')[0]}</span>}
                      </div>

                      {/* Gantt bar area */}
                      <div style={{ width: ganttW, flexShrink: 0, position: 'relative', height: '100%' }}>

                        {/* Vertical month grid lines */}
                        {monthMarkers.map((m, i) => <div key={i} style={{ position: 'absolute', left: m.px, top: 0, bottom: 0, width: 1, background: m.isYear ? '#E0DDD8' : '#EEECE8' }} />)}

                        {/* Today line */}
                        <div style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 2, background: '#C4973A55', zIndex: 3 }} />

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
                            {/* Progress label */}
                            {task.progress > 0 && widthPx > 30 && (
                              <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 8, color: sColor, fontWeight: 700, whiteSpace: 'nowrap' }}>{task.progress}%</span>
                            )}
                          </div>
                        )
                        })()}
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
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 11, color: '#888', letterSpacing: '0.12em' }}>No timeline tasks yet</p>
          <button onClick={openNew} style={{ padding: '10px 24px', border: '1px solid #C4973A44', background: 'transparent', color: '#C4973A', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>+ Add First Task</button>
        </div>
      )}

      {/* ─── Edit / Add modal ────────────────────────────────────────────────── */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}>
          <div style={{ width: 540, background: '#F5F3F0', border: '1px solid #D8D5D0', borderRadius: 10, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <p style={{ fontSize: 7, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#9A968F' }}>{isNew ? 'Add Task' : 'Edit Task'}</p>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: '#9A968F', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>

            <Field label="Task Name">
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} autoFocus placeholder="e.g. DA Lodgement" style={INPUT} />
            </Field>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Category" flex={1}>
                <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as TimelineCategory })} style={INPUT}>
                  {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </Field>
              <Field label="Status / Traffic Light" flex={1}>
                <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as TimelineStatus })} style={{ ...INPUT, color: STATUS_COLORS[editing.status] }}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </Field>
            </div>

            {/* Traffic light preview */}
            <div style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E4E1DC', borderRadius: 3, alignItems: 'center' }}>
              {STATUSES.map(s => (
                <button key={s} onClick={() => setEditing({ ...editing, status: s as TimelineStatus })}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', border: `1px solid ${editing.status === s ? STATUS_COLORS[s as TimelineStatus] : '#D8D5D0'}`, background: editing.status === s ? `${STATUS_COLORS[s as TimelineStatus]}18` : 'transparent', cursor: 'pointer', borderRadius: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s as TimelineStatus], display: 'block', flexShrink: 0 }} />
                  <span style={{ fontSize: 7, color: editing.status === s ? STATUS_COLORS[s as TimelineStatus] : '#999', letterSpacing: '0.10em', whiteSpace: 'nowrap' }}>{STATUS_SHORT[s as TimelineStatus]}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Start Date" flex={1}>
                <input type="date" value={editing.startDate} onChange={e => setEditing({ ...editing, startDate: e.target.value })} style={INPUT} />
              </Field>
              <Field label="End Date" flex={1}>
                <input type="date" value={editing.endDate} onChange={e => setEditing({ ...editing, endDate: e.target.value })} style={INPUT} />
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
              <input type="checkbox" checked={editing.isMilestone} onChange={e => setEditing({ ...editing, isMilestone: e.target.checked })} style={{ accentColor: '#C4973A', width: 14, height: 14 }} />
              <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em' }}>Milestone (diamond marker)</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 14, borderTop: '1px solid #E8E5E0' }}>
              {!isNew
                ? <button onClick={() => { remove(editing.id); setEditing(null) }} style={{ background: 'none', border: '1px solid #EF444430', color: '#EF4444', padding: '8px 16px', fontSize: 9, letterSpacing: '0.12em', cursor: 'pointer' }}>Delete</button>
                : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(null)} style={{ background: 'none', border: '1px solid #E0DDD8', color: '#9A968F', padding: '8px 16px', fontSize: 9, letterSpacing: '0.12em', cursor: 'pointer' }}>Cancel</button>
                <button onClick={save} disabled={!editing.name.trim()} style={{ background: '#1A1A1A', border: 'none', color: '#fff', padding: '8px 20px', fontSize: 9, letterSpacing: '0.14em', fontWeight: 700, cursor: 'pointer', opacity: editing.name.trim() ? 1 : 0.4 }}>
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

function TrafficLight({ color, count, label, flash }: { color: string; count: number; label: string; flash?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ position: 'relative', width: 10, height: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {flash && count > 0 && <span className="tl-critical-ring" style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: color } as CSSProperties} />}
        <span className={flash && count > 0 ? 'tl-critical-dot' : ''} style={{ width: 10, height: 10, borderRadius: '50%', background: count > 0 ? color : '#1A1A1A', border: count === 0 ? `1px solid ${color}33` : 'none', display: 'block' }} />
      </span>
      <span style={{ fontSize: 9, color: count > 0 ? '#888' : '#333', letterSpacing: '0.08em' }}>
        <span style={{ color: count > 0 ? color : '#333', fontWeight: 700, marginRight: 3 }}>{count}</span>
        {label}
      </span>
    </div>
  )
}

const yrNav: React.CSSProperties = {
  background: '#F5F3F0', border: '1px solid #D8D5D0', borderRadius: 4, color: '#555',
  width: 24, height: 28, fontSize: 14, lineHeight: 1, cursor: 'pointer', flexShrink: 0,
}

const INPUT: React.CSSProperties = {
  width: '100%', background: '#FFFFFF', border: '1px solid #D8D5D0', color: '#1A1A1A',
  padding: '8px 10px', fontSize: 11, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: flex ?? undefined }}>
      <label style={{ fontSize: 7, letterSpacing: '0.20em', textTransform: 'uppercase', color: '#9A968F' }}>{label}</label>
      {children}
    </div>
  )
}

function FilterChip({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', fontSize: 7, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2,
      background: active ? `${color}25` : 'transparent',
      border: `1px solid ${active ? color : '#D0CEC9'}`,
      color: active ? color : '#555',
      transition: 'all 0.15s',
    }}>{label}</button>
  )
}

// ── Export traffic light colours for Dashboard use ────────────────────────────
export { STATUS_COLORS, STATUS_SHORT }
