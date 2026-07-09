import React, { useState, useEffect, useRef } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { useStore } from '../../store'
import { SectionHeading, Button } from '../../components/ui'
import { solveUnitMix } from '../../engine/unitMix'
import { generateId } from '../../db'
import { useRole } from '../../lib/role'
import type { UnitType, MixScenario } from '../../db/schema'
import BTRTab from './BTRTab'
import BTSTab from './BTSTab'
import HotelTab from './HotelTab'
import ScenarioComparison from './ScenarioComparison'

// Revenue/analysis models that live inside Product Mix as pull-down tabs.
type ModelTab = 'none' | 'btr' | 'bts' | 'hotel' | 'compare'
const MODEL_TABS: { id: Exclude<ModelTab, 'none'>; label: string }[] = [
  { id: 'btr', label: 'BTR' },
  { id: 'bts', label: 'BTS' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'compare', label: 'Compare' },
]

interface Props { projectId: string }

const DEFAULT_UNIT_TYPES = [
  { name: 'Studio', nsaPerUnit: 36, targetPct: 0.12, weeklyRentConservative: 380, weeklyRentAggressive: 420, salePriceConservative: 280000, salePriceMid: 320000, salePriceAggressive: 360000, opexPerUnitPerYear: 1800 },
  { name: '1 Bedroom', nsaPerUnit: 64, targetPct: 0.50, weeklyRentConservative: 450, weeklyRentAggressive: 500, salePriceConservative: 430000, salePriceMid: 480000, salePriceAggressive: 530000, opexPerUnitPerYear: 2000 },
  { name: '2 Bedroom', nsaPerUnit: 86, targetPct: 0.30, weeklyRentConservative: 530, weeklyRentAggressive: 590, salePriceConservative: 570000, salePriceMid: 630000, salePriceAggressive: 700000, opexPerUnitPerYear: 2200 },
  { name: '3 Bedroom', nsaPerUnit: 96, targetPct: 0.08, weeklyRentConservative: 650, weeklyRentAggressive: 720, salePriceConservative: 700000, salePriceMid: 780000, salePriceAggressive: 860000, opexPerUnitPerYear: 2600 },
]

export default function ProductMixTab({ projectId }: Props) {
  const store = useStore()
  const role = useRole()
  const [scenarios, setScenarios] = useState<MixScenario[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [units, setUnits] = useState<UnitType[]>([])
  const [modelTab, setModelTab] = useState<ModelTab>('none')
  const [newScenName, setNewScenName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showArchImport, setShowArchImport] = useState(false)
  const [archPasteText, setArchPasteText] = useState('')
  const { commit, undo, canUndo } = useAutosave<UnitType[]>(u => { if (activeId) store.saveUnitTypes(activeId, u) }, [activeId])

  const site = store.getSiteDesign(projectId)

  useEffect(() => {
    const s = store.getMixScenarios(projectId)
    setScenarios(s)
    if (s.length > 0 && !activeId) {
      setActiveId(s[0].id)
      setUnits(store.getUnitTypes(s[0].id))
    }
  }, [projectId])

  useEffect(() => {
    if (activeId) setUnits(store.getUnitTypes(activeId))
  }, [activeId])

  function createScenario() {
    if (!newScenName.trim()) return
    const s = store.createMixScenario(projectId, newScenName.trim())
    const defaultUnits: UnitType[] = DEFAULT_UNIT_TYPES.map(u => ({
      id: generateId(), scenarioId: s.id, solvedCount: 0, ...u,
    }))
    store.saveUnitTypes(s.id, defaultUnits)
    const updated = store.getMixScenarios(projectId)
    setScenarios(updated)
    setActiveId(s.id)
    setUnits(defaultUnits)
    setNewScenName(''); setShowNew(false)
  }

  function saveUnits(updated: UnitType[]) {
    if (!activeId) return
    commit(units, updated)
    setUnits(updated)
  }

  function updateUnit(id: string, field: keyof UnitType, value: number | string) {
    saveUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u))
  }

  // Re-solve integer counts from the (auto-normalised) % mix and NSA.
  function countsFromPct(list: UnitType[]): UnitType[] {
    const total = list.reduce((s, u) => s + (u.targetPct || 0), 0)
    if (!(site.resiNSA > 0 && total > 0)) return list
    const norm = list.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: (u.targetPct || 0) / total }))
    const r = solveUnitMix(site.resiNSA, norm)
    return list.map((u, i) => ({ ...u, solvedCount: r.mix[i]?.count ?? 0 }))
  }

  // A single mix edit. Editing NSA or % re-solves the counts; editing a Count
  // directly is honoured verbatim (fully manual) and back-derives the % split.
  // Either way the authoritative `solvedCount` is persisted so BTR/BTS pick it
  // up live.
  function editMix(id: string, field: 'nsaPerUnit' | 'targetPct' | 'solvedCount', value: number) {
    let next = units.map(u => u.id === id ? { ...u, [field]: value } : u)
    if (field === 'solvedCount') {
      const total = next.reduce((s, u) => s + (u.solvedCount || 0), 0)
      next = next.map(u => ({ ...u, targetPct: total > 0 ? Math.round(((u.solvedCount || 0) / total) * 1000) / 1000 : 0 }))
    } else {
      next = countsFromPct(next)
    }
    saveUnits(next)
  }

  function addUnitType() {
    if (!activeId) return
    const newUnit: UnitType = {
      id: generateId(), scenarioId: activeId, name: 'New Type',
      nsaPerUnit: 60, targetPct: 0, solvedCount: 0,
      weeklyRentConservative: 400, weeklyRentAggressive: 450,
      salePriceConservative: 400000, salePriceMid: 450000, salePriceAggressive: 500000,
      opexPerUnitPerYear: 2000,
    }
    saveUnits([...units, newUnit])
  }

  function removeUnit(id: string) {
    saveUnits(units.filter(u => u.id !== id))
  }

  function parseArchitectSchedule() {
    if (!activeId) return
    const lines = archPasteText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    const parsed: { name: string; nsa: number; count: number }[] = []

    for (const line of lines) {
      if (/^(type|unit type|description|name|apt|apartment)\b/i.test(line)) continue
      const nums = [...line.matchAll(/[\d,]+(\.\d+)?/g)].map(m => parseFloat(m[0].replace(/,/g, '')))
      if (nums.length < 2) continue
      const firstNum = line.search(/[\d,]/)
      const name = line.slice(0, firstNum).replace(/[-–—\s]+$/, '').trim()
      if (!name) continue
      let nsa = 0
      let count = 0
      for (const n of nums) {
        if (n >= 15 && n <= 300 && nsa === 0) { nsa = n; continue }
        if (n >= 1 && n <= 2000 && Number.isInteger(n) && count === 0) count = n
      }
      if (nsa > 0) parsed.push({ name, nsa, count })
    }

    if (parsed.length === 0) return

    const totalCount = parsed.reduce((s, p) => s + (p.count || 0), 0)
    const newUnits: UnitType[] = parsed.map(p => ({
      id: generateId(),
      scenarioId: activeId!,
      name: p.name,
      nsaPerUnit: p.nsa,
      targetPct: totalCount > 0 && p.count > 0 ? Math.round((p.count / totalCount) * 100) / 100 : 0,
      solvedCount: p.count,
      weeklyRentConservative: 400,
      weeklyRentAggressive: 480,
      salePriceConservative: 450000,
      salePriceMid: 520000,
      salePriceAggressive: 600000,
      opexPerUnitPerYear: 2000,
    }))

    store.saveUnitTypes(activeId, newUnits)
    setUnits(newUnits)
    setShowArchImport(false)
    setArchPasteText('')
  }

  // Run solver — the % mix is auto-normalised so the effective split always sums
  // to 100%; the solver (and everything below it) therefore always reflects the
  // inputs live, no matter what the raw entries add up to.
  const totalPct = units.reduce((s, u) => s + (u.targetPct || 0), 0)
  const normTargets = units.map(u => ({
    name: u.name,
    nsaPerUnit: u.nsaPerUnit,
    targetPct: totalPct > 0 ? (u.targetPct || 0) / totalPct : 0,
  }))
  const solverReady = site.resiNSA > 0 && units.length > 0 && totalPct > 0
  // Solver is a live *suggestion* engine (NSA fit) for the discrepancy readout;
  // the authoritative counts are the persisted `solvedCount` (manual or solved),
  // which is what drives the gold numbers and every downstream tab.
  const solverResult = solverReady ? solveUnitMix(site.resiNSA, normTargets) : null

  // Headline numbers come straight from the persisted counts — fully manual.
  const totalUnits = units.reduce((s, u) => s + (u.solvedCount || 0), 0)
  const nsaUsed = units.reduce((s, u) => s + (u.solvedCount || 0) * u.nsaPerUnit, 0)

  // One-click: fill the counts from the NSA-optimal solver.
  function solveToNSA() {
    if (!solverReady) return
    saveUnits(countsFromPct(units))
  }

  // First time a scenario is opened with a % mix but no counts yet, seed the
  // counts from the solver so the gold numbers (and downstream tabs) aren't 0.
  // Never overrides once any count exists — manual counts are preserved.
  const autoSeeded = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!activeId || units.length === 0 || autoSeeded.current.has(activeId)) return
    const anyCount = units.some(u => (u.solvedCount || 0) > 0)
    if (!anyCount && solverReady) {
      autoSeeded.current.add(activeId)
      const next = countsFromPct(units)
      store.saveUnitTypes(activeId, next)
      setUnits(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, units, solverReady])

  // ── Parking & storage knock-on (JW): required spaces/storage flex with the mix ──
  const cost = store.getCostStack(projectId)
  const PARK_AREA_PER_SPACE = 32           // sqm GBA per structured space
  const parkCostPerSpace = cost.parkingCostPerSpace ?? 50000
  const storageCostPerSqm = cost.storageCostPerSqm ?? 1500
  const defSpaces = (name: string) => { const n = name.toLowerCase(); if (n.includes('studio')) return 0.6; if (n.includes('3')) return 2; if (n.includes('2')) return 1.3; if (n.includes('1')) return 1; return 1 }
  const defStorage = (name: string) => { const n = name.toLowerCase(); if (n.includes('studio')) return 3; if (n.includes('3')) return 6; if (n.includes('2')) return 5; if (n.includes('1')) return 4; return 4 }
  const parkRows = units.map((u) => {
    const count = u.solvedCount ?? 0
    const spu = u.carSpacesPerUnit ?? defSpaces(u.name)
    const stpu = u.storageSqmPerUnit ?? defStorage(u.name)
    return { u, count, spu, stpu, reqSpaces: count * spu, reqStorage: count * stpu }
  })
  const reqSpaces = Math.ceil(parkRows.reduce((s, r) => s + r.reqSpaces, 0))
  const reqStorage = Math.round(parkRows.reduce((s, r) => s + r.reqStorage, 0))
  const provided = site.carSpaces
  const shortfall = provided - reqSpaces                 // negative = short
  const parkArea = reqSpaces * PARK_AREA_PER_SPACE
  const LEVEL_SPACES = 120                                // ~spaces per basement level
  const extraLevels = shortfall < 0 ? Math.ceil(-shortfall / LEVEL_SPACES) : 0

  return (
    <div className="relative min-h-full">
      {/* Render background */}

      <div className="relative p-4 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <SectionHeading sub="Define unit types, NSA and % mix — solver calculates integer counts">Product Mix Builder</SectionHeading>
          <div className="flex gap-2 items-center">
            <span style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3DAA6A' }}>⤳ Auto-saved</span>
            {canUndo && <Button size="sm" variant="ghost" onClick={() => undo(setUnits)}>Undo</Button>}
            {activeId && (
              <button
                onClick={() => setShowArchImport(v => !v)}
                className="px-4 py-2 text-[10px] tracking-[0.1em] uppercase border border-[#C8C5C0] text-[#666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                style={{ borderRadius: 0 }}
              >
                Paste Architect Schedule
              </button>
            )}
            <button
              onClick={() => setShowNew(true)}
              className="px-4 py-2 text-[10px] tracking-[0.1em] uppercase bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              + New Scenario
            </button>
          </div>
        </div>

        {/* Architect import */}
        {showArchImport && (
          <div className="mb-5 border border-[#D0CEC9] bg-white p-5">
            <p className="text-[10px] tracking-[0.18em] uppercase text-[#888] mb-1 font-medium">Import from Architect Schedule</p>
            <p className="text-[#AAA] text-xs mb-2">Paste text from a unit schedule PDF or Excel. Detects unit type name, NSA per unit (sqm), and count. Replaces existing unit types in this scenario.</p>
            <p className="text-[10px] text-[#C0BDB8] mb-3 font-mono">e.g. Studio  36  35 &nbsp;&nbsp; or &nbsp;&nbsp; 1 Bedroom  64sqm  168 units</p>
            <textarea
              value={archPasteText}
              onChange={e => setArchPasteText(e.target.value)}
              rows={6}
              style={{ width: '100%', background: '#F5F3F0', border: '1px solid #D0CEC9', borderRadius: 0, padding: '10px', fontFamily: 'monospace', fontSize: '12px', color: '#1A1A1A', outline: 'none', resize: 'vertical' }}
              placeholder={'Studio  36  35\n1 Bedroom  64  168\n2 Bedroom  86  86\n3 Bedroom  96  40'}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={parseArchitectSchedule}
                className="px-4 py-2 text-[10px] tracking-[0.1em] uppercase bg-[#1A1A1A] text-white hover:bg-[#333] cursor-pointer"
                style={{ borderRadius: 0 }}
              >
                Import Units
              </button>
              <button
                onClick={() => { setShowArchImport(false); setArchPasteText('') }}
                className="px-4 py-2 text-[10px] tracking-[0.1em] uppercase border border-[#D0CEC9] text-[#888] hover:text-[#1A1A1A] cursor-pointer"
                style={{ borderRadius: 0 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Scenario selector — only shown when there's more than one to switch between */}
        {scenarios.length > 1 && (
          <div className="flex mb-5" style={{ display: 'inline-flex', border: '1px solid #D0CEC9' }}>
            {scenarios.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                style={{ borderRadius: 0, borderLeft: i > 0 ? '1px solid #D0CEC9' : 'none' }}
                className={`px-4 py-2 text-[10px] tracking-[0.1em] uppercase cursor-pointer transition-colors ${
                  activeId === s.id ? 'bg-[#1A1A1A] text-white font-semibold' : 'text-[#888] hover:text-[#1A1A1A] bg-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {showNew && (
          <div className="flex gap-2 mb-5 border border-[#D0CEC9] bg-white p-3">
            <input
              autoFocus
              value={newScenName}
              onChange={e => setNewScenName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createScenario()}
              placeholder="Scenario name (e.g. Mix A — 25/30/35/10)"
              style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid #D0CEC9', padding: '4px 0', outline: 'none', fontSize: '13px', color: '#1A1A1A' }}
            />
            <button onClick={createScenario} className="px-4 py-1.5 text-[10px] tracking-widest uppercase bg-[#1A1A1A] text-white cursor-pointer" style={{ borderRadius: 0 }}>Create</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-1.5 text-[10px] tracking-widest uppercase text-[#888] hover:text-[#1A1A1A] cursor-pointer border border-[#D0CEC9]" style={{ borderRadius: 0 }}>Cancel</button>
          </div>
        )}

        {scenarios.length === 0 ? (
          <div className="border border-[#E8E5E0] bg-white py-16 text-center">
            <p className="text-[#888] text-[10px] tracking-[0.2em] uppercase mb-4">No scenarios yet</p>
            <button onClick={() => setShowNew(true)} className="px-5 py-2 text-[10px] tracking-widest uppercase border border-[#C8C5C0] text-[#666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] cursor-pointer" style={{ borderRadius: 0 }}>Create First Scenario</button>
          </div>
        ) : activeId ? (
          <div>
            {/* Revenue-model sub-tabs — pull down over the builder, keeping the
                Mix Result / Parking sections visible at the bottom of the page */}
            {role !== 'external' && (
              <ModelTabBar active={modelTab} onChange={setModelTab} />
            )}

            {/* TOP ZONE — the unit-mix builder, replaced by the pulled-down model
                panel when a model tab is selected */}
            {modelTab === 'none' ? (
            <>
            {/* Unit type table */}
            <div className="border border-[#E0DDD8] bg-white overflow-x-auto mb-4">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E8E5E0', background: '#F7F5F2' }}>
                    {['Unit Type', 'NSA / unit (sqm)', '% Mix', 'Rent — Cons. /wk', 'Rent — Agg. /wk', 'Sale Price — Mid', 'Units (Count)', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {units.map((u, i) => {
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #F0EDE8' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            value={u.name}
                            onChange={e => updateUnit(u.id, 'name', e.target.value)}
                            style={{ width: 110, background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '3px 0', fontSize: '13px', color: '#1A1A1A', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number"
                            value={u.nsaPerUnit}
                            onChange={e => editMix(u.id, 'nsaPerUnit', parseFloat(e.target.value) || 0)}
                            style={{ width: 64, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '3px 0', fontSize: '13px', color: '#1A1A1A', fontFamily: 'monospace', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number"
                              value={Math.round(u.targetPct * 1000) / 10}
                              step={1} min={0} max={100}
                              onChange={e => editMix(u.id, 'targetPct', (parseFloat(e.target.value) || 0) / 100)}
                              style={{ width: 50, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '3px 0', fontSize: '13px', color: '#1A1A1A', fontFamily: 'monospace', outline: 'none' }}
                            />
                            <span style={{ color: '#AAA', fontSize: 12 }}>%</span>
                            {/* Auto-normalised share of 100% actually used by the solver */}
                            {totalPct > 0 && Math.abs(totalPct - 1) > 0.001 && (
                              <span title="Auto-normalised share of 100%" style={{ color: '#B8963C', fontSize: 10, fontFamily: 'monospace', marginLeft: 2 }}>
                                →{(normTargets[i].targetPct * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: '#AAA', fontSize: 11 }}>$</span>
                            <input
                              type="number"
                              value={u.weeklyRentConservative}
                              onChange={e => updateUnit(u.id, 'weeklyRentConservative', parseFloat(e.target.value) || 0)}
                              style={{ width: 72, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '3px 0', fontSize: '13px', color: '#1A1A1A', fontFamily: 'monospace', outline: 'none' }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: '#AAA', fontSize: 11 }}>$</span>
                            <input
                              type="number"
                              value={u.weeklyRentAggressive}
                              onChange={e => updateUnit(u.id, 'weeklyRentAggressive', parseFloat(e.target.value) || 0)}
                              style={{ width: 72, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '3px 0', fontSize: '13px', color: '#1A1A1A', fontFamily: 'monospace', outline: 'none' }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: '#AAA', fontSize: 11 }}>$</span>
                            <input
                              type="number"
                              value={u.salePriceMid}
                              step={5000}
                              onChange={e => updateUnit(u.id, 'salePriceMid', parseFloat(e.target.value) || 0)}
                              style={{ width: 88, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '3px 0', fontSize: '13px', color: '#1A1A1A', fontFamily: 'monospace', outline: 'none' }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {/* Gold count — fully manual: type it directly, the % back-derives */}
                          <input
                            type="number" min={0} step={1}
                            value={u.solvedCount || 0}
                            onChange={e => editMix(u.id, 'solvedCount', Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                            title="Type the unit count directly — the % mix re-derives automatically"
                            style={{ width: 62, textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '1px solid #E4D9BE', padding: '3px 0', fontSize: 15, fontFamily: 'monospace', fontWeight: 700, color: '#B8963C', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <button onClick={() => removeUnit(u.id)} style={{ color: '#CCC', cursor: 'pointer', background: 'none', border: 'none', fontSize: 12 }} onMouseEnter={e => (e.target as HTMLElement).style.color = '#9B2335'} onMouseLeave={e => (e.target as HTMLElement).style.color = '#CCC'}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-4 mb-5">
              <button
                onClick={addUnitType}
                className="px-4 py-2 text-[10px] tracking-[0.1em] uppercase border border-[#C8C5C0] text-[#666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] cursor-pointer transition-colors"
                style={{ borderRadius: 0 }}
              >
                + Add Unit Type
              </button>
              <span style={{ fontSize: 11, color: Math.abs(totalPct - 1) < 0.001 ? '#2A7A4F' : '#B8963C' }}>
                Mix total: {(totalPct * 100).toFixed(0)}%&nbsp;
                {Math.abs(totalPct - 1) < 0.001 ? '✓ Sums to 100%' : '— auto-normalised to 100% for the solver'}
              </span>
              {totalPct > 0 && Math.abs(totalPct - 1) > 0.001 && (
                <button
                  onClick={() => saveUnits(units.map(u => ({ ...u, targetPct: Math.round((u.targetPct / totalPct) * 1000) / 1000 })))}
                  className="px-3 py-1.5 text-[9px] tracking-[0.14em] uppercase border border-[#C8C5C0] text-[#666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] cursor-pointer transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  Normalise to 100%
                </button>
              )}
            </div>
            </>
            ) : (
              <ModelDrawer key={modelTab} tab={modelTab} projectId={projectId} onClose={() => setModelTab('none')} />
            )}

            {/* Mix result — live from the (manual or solved) counts */}
            {units.length > 0 && (
              <div className="border border-[#E0DDD8] bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[9px] tracking-[0.2em] uppercase text-[#888]">Mix Result — live</p>
                  {solverReady && (
                    <button onClick={solveToNSA}
                      className="px-3 py-1.5 text-[9px] tracking-[0.14em] uppercase border border-[#C8C5C0] text-[#666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] cursor-pointer transition-colors"
                      style={{ borderRadius: 0 }} title="Fill the counts from the NSA-optimal solver">
                      ⟲ Solve to NSA
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <SolverStat label="Total units" value={totalUnits.toString()} />
                  <SolverStat label="NSA used" value={`${nsaUsed.toLocaleString()} sqm`} />
                  <SolverStat label="Available NSA" value={`${site.resiNSA.toLocaleString()} sqm`} />
                  <SolverStat
                    label="NSA discrepancy"
                    value={`${(site.resiNSA - nsaUsed).toLocaleString()} sqm`}
                    warn={Math.abs(site.resiNSA - nsaUsed) > 200}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(units.length, 6)}, 1fr)`, gap: 8 }}>
                  {units.map(u => {
                    const count = u.solvedCount || 0
                    return (
                      <div key={u.id} style={{ background: '#F7F5F2', border: '1px solid #E8E5E0', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 22, color: '#B8963C' }}>{count}</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{u.name}</div>
                        <div style={{ fontSize: 10, color: '#AAA', marginTop: 1 }}>{totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Parking & storage — knock-on space + cost as the mix changes */}
            {units.length > 0 && (
              <div className="border border-[#E0DDD8] bg-white p-5 mt-4">
                <p className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-4">Parking &amp; Storage — Knock-on Requirements</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 560 }}>
                    <thead>
                      <tr style={{ background: '#F7F5F2' }}>
                        {['Unit Type', 'Units', 'Spaces / unit', 'Storage sqm / unit', 'Req. spaces', 'Req. storage'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parkRows.map(r => (
                        <tr key={r.u.id} style={{ borderBottom: '1px solid #F0EDE8' }}>
                          <td style={{ padding: '7px 10px', color: '#555' }}>{r.u.name}</td>
                          <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#1A1A1A' }}>{r.count}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <input type="number" step={0.1} value={r.spu}
                              onChange={e => updateUnit(r.u.id, 'carSpacesPerUnit', parseFloat(e.target.value) || 0)}
                              style={{ width: 60, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '2px 0', fontSize: 12, fontFamily: 'monospace', color: '#1A1A1A', outline: 'none' }} />
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            <input type="number" step={0.5} value={r.stpu}
                              onChange={e => updateUnit(r.u.id, 'storageSqmPerUnit', parseFloat(e.target.value) || 0)}
                              style={{ width: 60, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '2px 0', fontSize: 12, fontFamily: 'monospace', color: '#1A1A1A', outline: 'none' }} />
                          </td>
                          <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#1A1A1A' }}>{r.reqSpaces.toFixed(1)}</td>
                          <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#1A1A1A' }}>{Math.round(r.reqStorage)} sqm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <SolverStat label="Spaces required" value={`${reqSpaces}`} />
                  <SolverStat label="Spaces provided" value={`${provided}`} warn={shortfall < 0} />
                  <SolverStat label="Storage required" value={`${reqStorage} sqm`} />
                  <SolverStat label="Parking area" value={`${parkArea.toLocaleString()} sqm`} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-[#F0EDE8]">
                  <SolverStat label={`Parking cost (@ $${(parkCostPerSpace/1000).toFixed(0)}k/space)`} value={`$${(reqSpaces * parkCostPerSpace / 1_000_000).toFixed(2)}M`} />
                  <SolverStat label={`Storage cost (@ $${storageCostPerSqm}/sqm)`} value={`$${(reqStorage * storageCostPerSqm / 1_000_000).toFixed(2)}M`} />
                  <SolverStat label="Ratio (spaces/unit)" value={totalUnits > 0 ? (reqSpaces / totalUnits).toFixed(2) : '—'} />
                </div>
                {shortfall < 0 ? (
                  <div className="mt-4 p-3 text-xs" style={{ background: '#FCF3F3', border: '1px solid #E6B8B8', color: '#9B2335' }}>
                    ⚠ <strong>Parking shortfall of {Math.abs(shortfall)} spaces</strong> vs {provided} provided — planning non-compliance risk. Needs ~{extraLevels} more basement level{extraLevels !== 1 ? 's' : ''} (≈{LEVEL_SPACES}/level) or a mix re-cut. Update car spaces in Site &amp; Design once resolved.
                  </div>
                ) : (
                  <div className="mt-4 p-3 text-xs" style={{ background: '#F1F8F3', border: '1px solid #BEDCC7', color: '#2A7A4F' }}>
                    ✓ Compliant — {provided} provided vs {reqSpaces} required ({shortfall} spare).
                  </div>
                )}
              </div>
            )}

            {!solverReady && site.resiNSA === 0 && (
              <p style={{ color: '#AAA', fontSize: 12 }}>Enter the resi NSA in Site &amp; Design to run the unit mix solver.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SolverStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: warn ? '#B8963C' : '#1A1A1A' }}>{value}</div>
    </div>
  )
}

// Each model tab lights up in the colour of the use-type it represents.
const MODEL_TAB_COLOR: Record<ModelTab, { line: string; tint: string; glow: string }> = {
  none:    { line: '#C4973A', tint: 'rgba(196,151,58,0.10)', glow: 'rgba(196,151,58,0.35)' },   // Mix — gold
  btr:     { line: '#22C55E', tint: 'rgba(34,197,94,0.12)',  glow: 'rgba(34,197,94,0.45)' },    // BTR — green
  bts:     { line: '#3B82F6', tint: 'rgba(59,130,246,0.12)', glow: 'rgba(59,130,246,0.45)' },   // BTS — blue
  hotel:   { line: '#A855F7', tint: 'rgba(168,85,247,0.12)', glow: 'rgba(168,85,247,0.45)' },   // Hotel — purple
  compare: { line: '#C4973A', tint: 'rgba(196,151,58,0.10)', glow: 'rgba(196,151,58,0.35)' },   // Compare — gold
}

// ── Model sub-tab bar — premium "folder" tabs (matches the Cost Stack look):
//    evenly spaced, uppercase; the active tab lights up in its use-type colour. ──
function ModelTabBar({ active, onChange }: { active: ModelTab; onChange: (t: ModelTab) => void }) {
  const tabs: { id: ModelTab; label: string }[] = [{ id: 'none', label: 'Mix Builder' }, ...MODEL_TABS]
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid #E0DDD8', background: '#F5F3F0', borderTopLeftRadius: 8, borderTopRightRadius: 8, marginBottom: 18, overflow: 'hidden' }}>
      {tabs.map((t, i) => {
        const on = active === t.id
        const c = MODEL_TAB_COLOR[t.id]
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            title={t.label}
            style={{
              flex: 1, minWidth: 0, textAlign: 'center',
              padding: '13px 8px', border: 'none', cursor: 'pointer',
              background: on ? `linear-gradient(180deg,#FFFFFF, ${c.tint})` : 'transparent',
              borderLeft: i > 0 ? '1px solid #E7E3DD' : 'none',
              fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: on ? 800 : 600,
              color: on ? '#1A1A1A' : '#9A968F',
              borderBottom: on ? `3px solid ${c.line}` : '2px solid transparent',
              boxShadow: on ? `inset 0 -1px 10px -2px ${c.glow}, 0 6px 14px -10px ${c.glow}` : 'none',
              marginBottom: -2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              transition: 'color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={e => { if (!on) e.currentTarget.style.color = c.line }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.color = '#9A968F' }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Pull-down drawer holding a revenue model, capped so the Mix Result / Parking
//    sections stay visible at the bottom of the page. ──────────────────────────
function ModelDrawer({ tab, projectId, onClose }: { tab: ModelTab; projectId: string; onClose: () => void }) {
  const title = MODEL_TABS.find(t => t.id === tab)?.label ?? ''
  return (
    <div className="pm-drawer-wrap mb-4">
      <div className="pm-drawer-inner">
        <div className="pm-drawer-head">
          <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>
            {title} · slides over the mix builder
          </span>
          <button onClick={onClose}
            className="px-3 py-1.5 text-[9px] tracking-[0.16em] uppercase border border-[#C8C5C0] text-[#666] hover:border-[#1A1A1A] hover:text-[#1A1A1A] cursor-pointer transition-colors"
            style={{ borderRadius: 0 }}>
            ▲ Back to Mix
          </button>
        </div>
        <div className="pm-drawer-body">
          {tab === 'btr' && <BTRTab projectId={projectId} />}
          {tab === 'bts' && <BTSTab projectId={projectId} />}
          {tab === 'hotel' && <HotelTab projectId={projectId} />}
          {tab === 'compare' && <ScenarioComparison projectId={projectId} />}
        </div>
      </div>
    </div>
  )
}
