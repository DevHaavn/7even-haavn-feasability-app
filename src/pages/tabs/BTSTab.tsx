import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, PctInput, Button, Money, VerdictBadge } from '../../components/ui'
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
  const [dirty, setDirty] = useState(false)
  const undoRef = useRef<BTSAssumptions | null>(null)

  const site = store.getSiteDesign(projectId)
  const land = store.getLandTerms(projectId)
  const costData = store.getCostStack(projectId)
  const inKindLineItem = land.isInKind && land.inKindGFA > 0 ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote } : undefined
  const costResult = calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem })
  const tdc = costResult.totalDevelopmentCost

  useEffect(() => {
    const s = store.getMixScenarios(projectId)
    setScenarios(s)
    if (s.length > 0) { setActiveId(s[0].id); setData(store.getBTSAssumptions(s[0].id)) }
  }, [projectId])

  useEffect(() => {
    if (activeId) { setData(store.getBTSAssumptions(activeId)); setDirty(false); undoRef.current = null }
  }, [activeId])

  function update<K extends keyof BTSAssumptions>(field: K, value: BTSAssumptions[K]) {
    if (!undoRef.current && data) undoRef.current = structuredClone(data)
    setData(d => d ? { ...d, [field]: value } : d)
    setDirty(true)
  }

  if (!data || !activeId) return <div className="p-6 text-text-grey text-sm">Create a mix scenario in Product Mix first.</div>

  const units = store.getUnitTypes(activeId)
  const solverResult = site.resiNSA > 0 && units.length > 0
    ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct })))
    : null

  function calcBTS(priceFn: (u: any) => number) {
    const lines = units.map((u, i) => ({ typeName: u.name, unitCount: solverResult?.mix[i]?.count ?? u.solvedCount ?? 0, pricePerUnit: priceFn(u) }))
    const otherRevenue = site.childcareGFA > 0 ? [{ label: 'Childcare (commercial)', amount: site.childcareGFA * data!.childcareValuePerSqm }] : []
    return calculateBTSValuation(lines, otherRevenue, data!.sellingCostsPct, tdc, data!.devMarginPct, costData.gstEnabled)
  }

  const cons = calcBTS(u => u.salePriceConservative)
  const mid = calcBTS(u => u.salePriceMid)
  const agg = calcBTS(u => u.salePriceAggressive)

  const scenarios3 = [
    { label: 'Conservative', result: cons, color: 'text-mid-grey' },
    { label: 'Mid', result: mid, color: 'text-white' },
    { label: 'Aggressive', result: agg, color: 'text-gold' },
  ]

  return (
    <div className="flex flex-col">
      <div className="relative p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6">
      <div className="flex-1 max-w-xl">
        <div className="flex items-center justify-between mb-5">
          <SectionHeading sub="Build-to-sell — gross revenue, selling costs, RLV">BTS Income & Valuation</SectionHeading>
          {undoRef.current && <Button size="sm" variant="ghost" onClick={() => { if (undoRef.current) { setData(undoRef.current); undoRef.current = null; setDirty(false) } }}>Undo</Button>}
          {dirty && <Button size="sm" onClick={() => { if (data) { store.saveBTSAssumptions(data); undoRef.current = null; setDirty(false) } }}>Save</Button>}
        </div>

        {scenarios.length > 0 && (
          <div className="flex mb-4" style={{ display: 'inline-flex', border: '1px solid #D0CEC9' }}>
            {scenarios.map((s, i) => (
              <button key={s.id} onClick={() => setActiveId(s.id)}
                style={{ borderRadius: 0, borderLeft: i > 0 ? '1px solid #D0CEC9' : 'none' }}
                className={`px-4 py-2 text-[10px] tracking-widest uppercase cursor-pointer transition-colors ${activeId === s.id ? 'bg-[#1A1A1A] text-white font-semibold' : 'bg-white text-[#888] hover:text-[#1A1A1A]'}`}>
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="border border-[#E8E5E0] bg-white p-4 mb-4">
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-3">Sale Prices — set per unit type</h3>
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E5E0', background: '#F7F5F2' }}>
                {['Type', 'Units', 'Conservative', 'Mid', 'Aggressive'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F0EDE8' }}>
                  <td style={{ padding: '8px', color: '#555' }}>{u.name}</td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: '#1A1A1A' }}>{u.solvedCount || 0}</td>
                  {(['salePriceConservative', 'salePriceMid', 'salePriceAggressive'] as const).map(field => (
                    <td key={field} style={{ padding: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <span style={{ color: '#AAA', fontSize: 11 }}>$</span>
                        <input type="number" step={5000} value={u[field]}
                          onChange={e => {
                            const updated = store.getUnitTypes(activeId).map(x => x.id === u.id ? { ...x, [field]: parseFloat(e.target.value) || 0 } : x)
                            store.saveUnitTypes(activeId, updated)
                          }}
                          style={{ width: 88, textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #D8D5D0', padding: '2px 0', fontSize: 12, color: '#1A1A1A', fontFamily: 'monospace', outline: 'none' }}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border border-[#E8E5E0] bg-white p-4">
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-3">Assumptions</h3>
          <FieldRow label="Selling costs"><PctInput value={data.sellingCostsPct} onChange={v => update('sellingCostsPct', v)} /></FieldRow>
          <FieldRow label="Childcare value ($/sqm)"><NumberInput value={data.childcareValuePerSqm} onChange={v => update('childcareValuePerSqm', v)} prefix="$" step={100} /></FieldRow>
          <FieldRow label="Developer margin"><PctInput value={data.devMarginPct} onChange={v => update('devMarginPct', v)} /></FieldRow>
        </div>
      </div>

      {/* Results */}
      <div className="w-72 flex-shrink-0">
        <SectionHeading>BTS Outcomes</SectionHeading>
        <div className="text-[#888] text-xs mb-3">TDC: <span className="text-[#1A1A1A] font-mono font-bold">${(tdc / 1_000_000).toFixed(1)}M</span></div>

        <div className="flex flex-col gap-3">
          {scenarios3.map(({ label, result, color }) => (
            <div key={label} className="border border-[#E8E5E0] bg-white p-4">
              <div className={`text-[10px] tracking-[0.1em] uppercase font-semibold mb-3 ${color === 'text-green' ? 'text-[#2A7A4F]' : color === 'text-amber' ? 'text-[#B8963C]' : 'text-[#666]'}`}>{label}</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-[#888]">Gross revenue</span><span className="text-[#1A1A1A] font-mono">${(result.grossRevenue / 1_000_000).toFixed(1)}M</span></div>
                {result.gstOnSales > 0 && (
                  <div className="flex justify-between"><span className="text-[#888]">Less GST on sales (1/11)</span><span className="text-[#9B2335] font-mono">−${(result.gstOnSales / 1_000_000).toFixed(1)}M</span></div>
                )}
                <div className="flex justify-between"><span className="text-[#888]">Net revenue</span><span className="text-[#1A1A1A] font-mono">${(result.netRevenue / 1_000_000).toFixed(1)}M</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-[#E8E5E0]">
                  <span className="font-semibold text-[#1A1A1A] text-[10px] tracking-widest uppercase">RLV</span>
                  <div className="flex items-center gap-2">
                    <Money value={result.rlv} size="md" />
                    <VerdictBadge rlv={result.rlv} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}
