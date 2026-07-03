import SiteLinks from '../../components/SiteLinks'
import React, { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { SectionHeading, Button } from '../../components/ui'
import { solveUnitMix } from '../../engine/unitMix'
import { generateId } from '../../db'
import type { UnitType, MixScenario } from '../../db/schema'

interface Props { projectId: string }

const DEFAULT_UNIT_TYPES = [
  { name: 'Studio', nsaPerUnit: 36, targetPct: 0.12, weeklyRentConservative: 380, weeklyRentAggressive: 420, salePriceConservative: 280000, salePriceMid: 320000, salePriceAggressive: 360000, opexPerUnitPerYear: 1800 },
  { name: '1 Bedroom', nsaPerUnit: 64, targetPct: 0.50, weeklyRentConservative: 450, weeklyRentAggressive: 500, salePriceConservative: 430000, salePriceMid: 480000, salePriceAggressive: 530000, opexPerUnitPerYear: 2000 },
  { name: '2 Bedroom', nsaPerUnit: 86, targetPct: 0.30, weeklyRentConservative: 530, weeklyRentAggressive: 590, salePriceConservative: 570000, salePriceMid: 630000, salePriceAggressive: 700000, opexPerUnitPerYear: 2200 },
  { name: '3 Bedroom', nsaPerUnit: 96, targetPct: 0.08, weeklyRentConservative: 650, weeklyRentAggressive: 720, salePriceConservative: 700000, salePriceMid: 780000, salePriceAggressive: 860000, opexPerUnitPerYear: 2600 },
]

export default function ProductMixTab({ projectId }: Props) {
  const store = useStore()
  const [scenarios, setScenarios] = useState<MixScenario[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [units, setUnits] = useState<UnitType[]>([])
  const [newScenName, setNewScenName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showArchImport, setShowArchImport] = useState(false)
  const [archPasteText, setArchPasteText] = useState('')

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
    store.saveUnitTypes(activeId, updated)
    setUnits(updated)
  }

  function updateUnit(id: string, field: keyof UnitType, value: number | string) {
    saveUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u))
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

  // Run solver
  const totalPct = units.reduce((s, u) => s + u.targetPct, 0)
  const solverReady = site.resiNSA > 0 && units.length > 0 && Math.abs(totalPct - 1) < 0.001
  const solverResult = solverReady
    ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct })))
    : null

  useEffect(() => {
    if (!solverResult || !activeId) return
    const updated = units.map((u, i) => ({ ...u, solvedCount: solverResult.mix[i]?.count ?? 0 }))
    const changed = updated.some((u, i) => u.solvedCount !== units[i].solvedCount)
    if (changed) store.saveUnitTypes(activeId, updated)
  }, [solverResult?.solvedUnits, activeId, units.map(u => `${u.nsaPerUnit}:${u.targetPct}`).join(',')])

  const totalUnits = solverResult?.solvedUnits ?? 0
  const nsaUsed = solverResult ? solverResult.mix.reduce((s, m) => s + m.nsaUsed, 0) : 0

  return (
    <div className="relative min-h-full">
      {/* Render background */}

      <div className="relative p-4 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <SectionHeading sub="Define unit types, NSA and % mix — solver calculates integer counts">Product Mix Builder</SectionHeading>
          <div className="flex gap-2">
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

        {/* Scenario selector */}
        {scenarios.length > 0 && (
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
            {/* Unit type table */}
            <div className="border border-[#E0DDD8] bg-white overflow-x-auto mb-4">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E8E5E0', background: '#F7F5F2' }}>
                    {['Unit Type', 'NSA / unit (sqm)', '% Mix', 'Rent — Cons. /wk', 'Rent — Agg. /wk', 'Sale Price — Mid', 'Solved Count', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {units.map((u, i) => {
                    const solved = solverResult?.mix[i]
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
                            onChange={e => updateUnit(u.id, 'nsaPerUnit', parseFloat(e.target.value) || 0)}
                            style={{ width: 64, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '3px 0', fontSize: '13px', color: '#1A1A1A', fontFamily: 'monospace', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number"
                              value={Math.round(u.targetPct * 1000) / 10}
                              step={1} min={0} max={100}
                              onChange={e => updateUnit(u.id, 'targetPct', (parseFloat(e.target.value) || 0) / 100)}
                              style={{ width: 50, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '3px 0', fontSize: '13px', color: '#1A1A1A', fontFamily: 'monospace', outline: 'none' }}
                            />
                            <span style={{ color: '#AAA', fontSize: 12 }}>%</span>
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
                          {solved ? (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#B8963C' }}>{solved.count}</span>
                          ) : (
                            <span style={{ color: '#CCC' }}>—</span>
                          )}
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
                {Math.abs(totalPct - 1) < 0.001 ? '✓ Ready' : '— must equal 100%'}
              </span>
            </div>

            {/* Solver results */}
            {solverResult && (
              <div className="border border-[#E0DDD8] bg-white p-5">
                <p className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-4">Solver Result</p>
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
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(solverResult.mix.length, 6)}, 1fr)`, gap: 8 }}>
                  {solverResult.mix.map(m => (
                    <div key={m.name} style={{ background: '#F7F5F2', border: '1px solid #E8E5E0', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 22, color: '#B8963C' }}>{m.count}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: '#AAA', marginTop: 1 }}>{(m.actualPct * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!solverReady && site.resiNSA === 0 && (
              <p style={{ color: '#AAA', fontSize: 12 }}>Enter the resi NSA in Site &amp; Design to run the unit mix solver.</p>
            )}
          </div>
        ) : null}
      </div>
      {/* Render strip */}
      <div style={{ height: 320, backgroundImage: 'url(/renders/haavn-render4.png)', backgroundSize: 'cover', backgroundPosition: 'center 50%', width: '100%', flexShrink: 0 }} />
      <SiteLinks />
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
