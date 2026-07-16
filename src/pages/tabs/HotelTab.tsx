import React, { useState, useEffect } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, PctInput, Button, Money, VerdictBadge } from '../../components/ui'
import { calculateHotelIncome, calculateHotelValuation } from '../../engine/hotel'
import { calculateCostStack } from '../../engine/costStack'
import type { HotelAssumptions } from '../../db/schema'

interface Props { projectId: string }

export default function HotelTab({ projectId }: Props) {
  const store = useStore()
  const [scenarios, setScenarios] = useState<any[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [data, setData] = useState<HotelAssumptions | null>(null)
  const [operatorType, setOperatorType] = useState<'management' | 'lease'>('management')
  const { commit, undo, canUndo } = useAutosave<HotelAssumptions>(store.saveHotelAssumptions, [activeId], { onLiveReload: () => { if (activeId) setData(store.getHotelAssumptions(activeId)) } })

  const site = store.getSiteDesign(projectId)
  const land = store.getLandTerms(projectId)
  const costData = store.getCostStack(projectId)
  const inKindLineItem = land.isInKind && land.inKindGFA > 0 ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote } : undefined

  // Scenario-level overrides for build rate and construction finance
  const effectiveBuildRate = data?.buildRateOverride ?? costData.buildRatePerSqm
  const effectiveFinancePct = data?.constructionFinancePct ?? costData.financePct
  const costStack = calculateCostStack({ ...costData, buildRatePerSqm: effectiveBuildRate, financePct: effectiveFinancePct, gba: site.resiGBA, inKindLineItem, landCost: land.landCost })
  const tdc = costStack.totalDevelopmentCost

  useEffect(() => {
    const s = store.getMixScenarios(projectId)
    setScenarios(s)
    if (s.length > 0) { setActiveId(s[0].id); setData(store.getHotelAssumptions(s[0].id)) }
  }, [projectId])

  useEffect(() => {
    if (activeId) setData(store.getHotelAssumptions(activeId))
  }, [activeId])

  function update<K extends keyof HotelAssumptions>(field: K, value: HotelAssumptions[K]) {
    if (!data) return
    const next = { ...data, [field]: value }
    commit(data, next)
    setData(next)
  }

  if (!data) return <div className="p-6 text-text-grey text-sm">Create a mix scenario first.</div>

  const income = calculateHotelIncome(data)
  const val = calculateHotelValuation(income.noi, data.hotelCapRate, tdc, data.devMarginPct)

  return (
    <div className="flex flex-col">

      <div className="relative p-4 md:p-6 flex flex-col gap-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-5">
          <SectionHeading sub="Hotel operating model — RevPAR, GOP, NOI, and RLV">Hotel Income & Valuation</SectionHeading>
          <span style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--emerald)', alignSelf: 'center' }}>⤳ Auto-saved</span>
          {canUndo && <Button size="sm" variant="ghost" onClick={() => undo(setData)}>Undo</Button>}
        </div>

        <div className="flex mb-4" style={{ display: 'inline-flex', border: '1px solid var(--border)' }}>
          {(['management', 'lease'] as const).map((type, i) => (
            <button key={type} onClick={() => setOperatorType(type)}
              style={{ borderRadius: 0, borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}
              className={`px-4 py-2 text-[10px] tracking-widest uppercase cursor-pointer transition-colors ${operatorType === type ? 'bg-[var(--ink)] text-white font-semibold' : 'bg-white text-[var(--ink-3)] hover:text-[var(--ink)]'}`}>
              {type === 'management' ? 'Management Agreement' : 'Operator Lease'}
            </button>
          ))}
        </div>
        {operatorType === 'lease' && (
          <div className="text-[var(--ink-2)] text-xs border border-[#D0D8E8] bg-[#F5F7FC] p-3 mb-4">
            Under a lease structure, income flows as rent rather than NOI — GOP, mgmt fee and FF&amp;E are indicative only.
          </div>
        )}

        {(data.buildRateOverride !== undefined || data.constructionFinancePct !== undefined) && (
          <div className="border border-[var(--gold)] bg-[#FDFAF5] p-4 mb-4">
            <h3 className="text-[9px] tracking-[0.2em] uppercase text-[var(--gold)] mb-3">Construction Cost Override</h3>
            <FieldRow label="Build rate ($/sqm)"><NumberInput value={data.buildRateOverride ?? costData.buildRatePerSqm} onChange={v => update('buildRateOverride', v)} prefix="$" step={100} /></FieldRow>
            <FieldRow label="Construction finance %"><PctInput value={data.constructionFinancePct ?? costData.financePct} onChange={v => update('constructionFinancePct', v)} /></FieldRow>
            <div className="mt-2 text-[10px] text-[var(--ink-3)]">Construction cost: <span className="font-mono text-[var(--ink)]">${(costStack.construction / 1_000_000).toFixed(2)}M</span> · Finance: <span className="font-mono text-[var(--ink)]">${(costStack.finance / 1_000_000).toFixed(2)}M</span></div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="border border-[var(--border)] bg-white p-4">
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[var(--ink-3)] mb-3">Operating Assumptions</h3>
          <FieldRow label="Hotel keys"><NumberInput value={data.keys} onChange={v => update('keys', v)} /></FieldRow>
          <FieldRow label="ADR (avg daily rate)"><NumberInput value={data.adr} onChange={v => update('adr', v)} prefix="$" step={10} /></FieldRow>
          <FieldRow label="Occupancy"><PctInput value={data.occupancyPct} onChange={v => update('occupancyPct', v)} /></FieldRow>
          <FieldRow label="Other revenue / key / yr"><NumberInput value={data.otherRevenuePerKeyPerYear} onChange={v => update('otherRevenuePerKeyPerYear', v)} prefix="$" step={500} /></FieldRow>
        </div>

        <div className="border border-[var(--border)] bg-white p-4">
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[var(--ink-3)] mb-3">Margins & Fees</h3>
          <FieldRow label="GOP margin"><PctInput value={data.gopMarginPct} onChange={v => update('gopMarginPct', v)} /></FieldRow>
          <FieldRow label="Management fee"><PctInput value={data.managementFeePct} onChange={v => update('managementFeePct', v)} /></FieldRow>
          <FieldRow label="FF&E reserve"><PctInput value={data.ffeReservePct} onChange={v => update('ffeReservePct', v)} /></FieldRow>
        </div>

        <div className="border border-[var(--border)] bg-white p-4">
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[var(--ink-3)] mb-3">Valuation</h3>
          <FieldRow label="Hotel cap rate"><PctInput value={data.hotelCapRate} onChange={v => update('hotelCapRate', v)} /></FieldRow>
          <FieldRow label="Developer margin"><PctInput value={data.devMarginPct} onChange={v => update('devMarginPct', v)} /></FieldRow>
        </div>

        {(data.holdDebtLvr !== undefined || data.holdDebtRate !== undefined) && (
          <div className="border border-[var(--border)] bg-white p-4">
            <h3 className="text-[9px] tracking-[0.2em] uppercase text-[var(--ink-3)] mb-3">Hold / Stabilisation Debt</h3>
            <FieldRow label="Hold debt LVR"><PctInput value={data.holdDebtLvr ?? 0.60} onChange={v => update('holdDebtLvr', v)} /></FieldRow>
            <FieldRow label="Hold debt rate (p.a.)"><PctInput value={data.holdDebtRate ?? 0.065} onChange={v => update('holdDebtRate', v)} /></FieldRow>
          </div>
        )}
        </div>
      </div>

      {/* Results — full width below the inputs */}
      <div className="w-full pt-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-4 mb-1">
          <SectionHeading>Hotel Outcome</SectionHeading>
          <div className="text-[var(--ink-3)] text-sm">TDC: <span className="text-[var(--ink)] font-mono font-bold">${(tdc / 1_000_000).toFixed(1)}M</span></div>
        </div>
        {data.buildRateOverride !== undefined && (
          <div className="text-[11px] text-[var(--gold)] mb-3">Modular @ ${data.buildRateOverride.toLocaleString()}/sqm · ${(costStack.construction / 1_000_000).toFixed(1)}M build cost</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="border border-[var(--border)] bg-white p-6">
          <div className="space-y-3 text-sm">
            <Row label="RevPAR" value={`$${income.revpar.toFixed(0)}`} bold />
            <Row label="Room revenue (p.a.)" value={`$${(income.roomRevenue / 1_000_000).toFixed(2)}M`} />
            <Row label="Other revenue (p.a.)" value={`$${(income.otherRevenue / 1000).toFixed(0)}K`} />
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <Row label="Total revenue" value={`$${(income.totalRevenue / 1_000_000).toFixed(2)}M`} bold />
            </div>
            <Row label={`GOP (${(data.gopMarginPct * 100).toFixed(0)}%)`} value={`$${(income.gop / 1000).toFixed(0)}K`} />
            <Row label="Management fee" value={`-$${(income.managementFee / 1000).toFixed(0)}K`} dim />
            <Row label="FF&E reserve" value={`-$${(income.ffeReserve / 1000).toFixed(0)}K`} dim />
            <div style={{ borderTop: '1px solid #D8D5D0', paddingTop: 8, marginTop: 4 }}>
              <div className="flex justify-between items-center">
                <span className="text-[12px] uppercase tracking-widest text-[var(--ink-3)]">NOI</span>
                <span className="font-mono font-bold text-2xl text-[var(--gold)]">${(income.noi / 1_000_000).toFixed(2)}M</span>
              </div>
            </div>
            <Row label={`GAV @ ${(data.hotelCapRate * 100).toFixed(2)}%`} value={`$${(val.gav / 1_000_000).toFixed(1)}M`} bold />
            <div style={{ borderTop: '1px solid #D8D5D0', paddingTop: 8 }}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[var(--ink)] text-[12px] tracking-widest uppercase">RLV</span>
                <div className="flex items-center gap-2">
                  <Money value={val.rlv} size="xl" />
                  <VerdictBadge rlv={val.rlv} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hold / Stabilisation Debt block */}
        {data.holdDebtLvr !== undefined && data.holdDebtRate !== undefined && (() => {
          const lvr = data.holdDebtLvr!
          const rate = data.holdDebtRate!
          const debtAmount = val.gav * lvr
          const annualInterest = debtAmount * rate
          const cashAfterDebt = income.noi - annualInterest
          const equity = val.gav * (1 - lvr)
          const coc = equity > 0 ? cashAfterDebt / equity : 0
          return (
            <div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-[var(--ink-3)] mb-2">Stabilised Hold @ {(rate * 100).toFixed(1)}% Debt</div>
              <div className="border border-[var(--border)] bg-white p-6 space-y-3 text-sm">
                <Row label={`Hold debt (${(lvr * 100).toFixed(0)}% LVR)`} value={`$${(debtAmount / 1_000_000).toFixed(1)}M`} />
                <Row label="Annual interest" value={`-$${(annualInterest / 1000).toFixed(0)}K`} dim />
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <Row label="Cash after debt service" value={`$${(cashAfterDebt / 1000).toFixed(0)}K`} bold />
                </div>
                <Row label="Equity retained" value={`$${(equity / 1_000_000).toFixed(1)}M`} />
                <div style={{ borderTop: '1px solid #D8D5D0', paddingTop: 8 }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--ink-3)]">Cash-on-Cash</span>
                    <span className={`font-mono font-bold text-base ${coc >= 0.07 ? 'text-[#2D7A45]' : coc >= 0.04 ? 'text-[var(--gold)]' : 'text-[var(--red)]'}`}>{(coc * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
        </div>{/* /results grid */}
      </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, dim }: { label: string; value: string; bold?: boolean; dim?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: dim ? 'var(--faint)' : 'var(--ink-3)', fontSize: 13 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: bold ? 700 : 400, color: dim ? '#CCC' : 'var(--ink)', fontSize: 14 }}>{value}</span>
    </div>
  )
}
