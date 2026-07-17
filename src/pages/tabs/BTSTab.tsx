import React, { useState, useEffect } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { useStore } from '../../store'
import { FieldRow, NumberInput, PctInput, VerdictBadge } from '../../components/ui'
import { calculateBTSValuation } from '../../engine/bts'
import { calculateCostStack } from '../../engine/costStack'
import { solveUnitMix } from '../../engine/unitMix'
import type { BTSAssumptions, MixScenario } from '../../db/schema'

interface Props { projectId: string }

type PriceScenario = 'conservative' | 'mid' | 'aggressive'

export default function BTSTab({ projectId }: Props) {
  const store = useStore()
  const [scenarios, setScenarios] = useState<MixScenario[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [data, setData] = useState<BTSAssumptions | null>(null)
  const { commit, undo, canUndo } = useAutosave<BTSAssumptions>(store.saveBTSAssumptions, [activeId], { onLiveReload: () => { if (activeId) setData(store.getBTSAssumptions(activeId)) } })

  const site = store.getSiteDesign(projectId)
  const land = store.getLandTerms(projectId)
  const costData = store.getCostStack(projectId)
  const inKindLineItem = land.isInKind && land.inKindGFA > 0 ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote } : undefined
  const costResult = calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem, landCost: land.landCost })
  const tdc = costResult.totalDevelopmentCost

  useEffect(() => {
    const s = store.getMixScenarios(projectId)
    setScenarios(s)
    if (s.length > 0) { setActiveId(s[0].id); setData(store.getBTSAssumptions(s[0].id)) }
  }, [projectId])

  useEffect(() => {
    if (activeId) setData(store.getBTSAssumptions(activeId))
  }, [activeId])

  function update<K extends keyof BTSAssumptions>(field: K, value: BTSAssumptions[K]) {
    if (!data) return
    const next = { ...data, [field]: value }
    commit(data, next)
    setData(next)
  }

  if (!data || !activeId) return <div className="p-6 text-text-grey text-sm">Create a mix scenario in Product Mix first.</div>

  const units = store.getUnitTypes(activeId)
  const solverResult = site.resiNSA > 0 && units.length > 0
    ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct })))
    : null

  function calcBTS(priceFn: (u: any) => number) {
    const lines = units.map((u, i) => ({ typeName: u.name, unitCount: u.solvedCount || solverResult?.mix[i]?.count || 0, pricePerUnit: priceFn(u) }))
    const otherRevenue = site.childcareGFA > 0 ? [{ label: 'Childcare (commercial)', amount: site.childcareGFA * data!.childcareValuePerSqm }] : []
    return calculateBTSValuation(lines, otherRevenue, data!.sellingCostsPct, tdc, data!.devMarginPct, costData.gstEnabled)
  }

  const cons = calcBTS(u => u.salePriceConservative)
  const mid = calcBTS(u => u.salePriceMid)
  const agg = calcBTS(u => u.salePriceAggressive)

  const scenarios3 = [
    { label: 'Conservative', result: cons },
    { label: 'Mid', result: mid },
    { label: 'Aggressive', result: agg },
  ]

  return (
    <div className="flex flex-col">
      {/* Head — serif subtitle + desc left, auto-saved right (design) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 6 }}>
        <div>
          <div className="subtitle">BTS Income &amp; Valuation</div>
          <div className="desc">Build-to-sell — gross revenue, selling costs, RLV.</div>
        </div>
        <div className="flex gap aic wrapf" style={{ flexShrink: 0 }}>
          <span className="check">✓ Auto-saved</span>
          {canUndo && <span className="chip" onClick={() => undo(setData)}>↶ Undo</span>}
        </div>
      </div>

      {scenarios.length > 1 && (
        <div className="seg" style={{ margin: '10px 0 4px' }}>
          {scenarios.map(s => (
            <button key={s.id} onClick={() => setActiveId(s.id)} className={activeId === s.id ? 'on' : ''}>{s.name}</button>
          ))}
        </div>
      )}

      {/* Design: sale prices + assumptions in ONE left panel, outcomes card right.
          (Was two stacked white boxes with the outcome cards full-width below.) */}
      <div className="two-eq" style={{ alignItems: 'start', marginTop: 14 }}>
        <div className="panel pad">
          <div className="divlabel">Sale prices — set per unit type</div>
          <table className="w-full" style={{ borderCollapse: 'collapse', marginTop: 10 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Type', 'Units', 'Conservative', 'Mid', 'Aggressive'].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '0 8px 10px', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '9px 8px', color: 'var(--ink)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{u.name}</td>
                  <td style={{ padding: '9px 8px', fontFamily: 'var(--mono)', color: 'var(--ink-2)', fontSize: 12, textAlign: 'right' }}>{u.solvedCount || 0}</td>
                  {(['salePriceConservative', 'salePriceMid', 'salePriceAggressive'] as const).map(field => (
                    <td key={field} style={{ padding: '6px 8px', textAlign: 'right' }}>
                      <input type="number" step={5000} value={u[field]}
                        onChange={e => {
                          const updated = store.getUnitTypes(activeId).map(x => x.id === u.id ? { ...x, [field]: parseFloat(e.target.value) || 0 } : x)
                          store.saveUnitTypes(activeId, updated)
                        }}
                        className="mini-inp" style={{ width: 92 }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="divlabel" style={{ marginTop: 22 }}>Assumptions</div>
          <FieldRow label="Selling costs (%)"><PctInput value={data.sellingCostsPct} onChange={v => update('sellingCostsPct', v)} /></FieldRow>
          <FieldRow label="Childcare value ($/sqm)"><NumberInput value={data.childcareValuePerSqm} onChange={v => update('childcareValuePerSqm', v)} prefix="$" step={100} /></FieldRow>
          <FieldRow label="Developer margin (%)"><PctInput value={data.devMarginPct} onChange={v => update('devMarginPct', v)} /></FieldRow>
        </div>

        {/* BTS OUTCOMES — one card, the three scenarios as columns (design) */}
        <div className="panel pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div className="divlabel">BTS outcomes</div>
            <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
              TDC: <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>${(tdc / 1_000_000).toFixed(1)}M</span>
            </div>
          </div>
          <div className="three" style={{ marginTop: 14, gap: 18 }}>
            {scenarios3.map(({ label, result }) => (
              <div key={label}>
                <div className="divlabel">{label}</div>
                <div style={{ marginTop: 10 }}>
                  <div className="sumrow" style={{ padding: '9px 0' }}>
                    <span className="l">Gross revenue</span>
                    <span className="v">${(result.grossRevenue / 1_000_000).toFixed(1)}M</span>
                  </div>
                  {result.gstOnSales > 0 && (
                    <div className="sumrow" style={{ padding: '9px 0' }}>
                      <span className="l">Less GST on sales (1/11)</span>
                      <span className="v" style={{ color: 'var(--red)' }}>−${(result.gstOnSales / 1_000_000).toFixed(1)}M</span>
                    </div>
                  )}
                  <div className="sumrow" style={{ padding: '9px 0' }}>
                    <span className="l">Net revenue</span>
                    <span className="v">${(result.netRevenue / 1_000_000).toFixed(1)}M</span>
                  </div>
                  <div className="sumrow" style={{ borderTop: '1px solid var(--border-hi)', marginTop: 4 }}>
                    <span className="l" style={{ color: 'var(--ink)', fontWeight: 700 }}>RLV</span>
                    <span className="v" style={{ color: result.rlv >= 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700 }}>${(result.rlv / 1_000_000).toFixed(1)}M</span>
                  </div>
                  <div style={{ marginTop: 12 }}><VerdictBadge rlv={result.rlv} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
