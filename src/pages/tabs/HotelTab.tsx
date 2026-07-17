import React, { useState, useEffect } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { useStore } from '../../store'
import { FieldRow, NumberInput, PctInput, VerdictBadge } from '../../components/ui'
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
      {/* Head — serif subtitle + desc left, auto-saved right (design) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 6 }}>
        <div>
          <div className="subtitle">Hotel Income &amp; Valuation</div>
          <div className="desc">Hotel operating model — RevPAR, GOP, NOI, and RLV.</div>
        </div>
        <div className="flex gap aic wrapf" style={{ flexShrink: 0 }}>
          <span className="check">✓ Auto-saved</span>
          {canUndo && <span className="chip" onClick={() => undo(setData)}>↶ Undo</span>}
        </div>
      </div>

      {/* Operator structure — the design's segmented pill */}
      <div className="seg" style={{ margin: '14px 0 4px' }}>
        {(['management', 'lease'] as const).map(type => (
          <button key={type} onClick={() => setOperatorType(type)} className={operatorType === type ? 'on' : ''}>
            {type === 'management' ? 'Management Agreement' : 'Operator Lease'}
          </button>
        ))}
      </div>
      {operatorType === 'lease' && (
        <div className="guide">
          Under a lease structure, income flows as rent rather than NOI — GOP, mgmt fee and FF&amp;E are indicative only.
        </div>
      )}

      {/* Construction override — only when set. Kept: it carries data. */}
      {(data.buildRateOverride !== undefined || data.constructionFinancePct !== undefined) && (
        <div className="panel pad" style={{ marginTop: 14 }}>
          <div className="divlabel">Construction cost override</div>
          <FieldRow label="Build rate ($/sqm)"><NumberInput value={data.buildRateOverride ?? costData.buildRatePerSqm} onChange={v => update('buildRateOverride', v)} prefix="$" step={100} /></FieldRow>
          <FieldRow label="Construction finance %"><PctInput value={data.constructionFinancePct ?? costData.financePct} onChange={v => update('constructionFinancePct', v)} /></FieldRow>
          <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--ink-3)' }}>
            Construction cost: <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>${(costStack.construction / 1_000_000).toFixed(2)}M</span> · Finance: <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>${(costStack.finance / 1_000_000).toFixed(2)}M</span>
          </div>
        </div>
      )}

      {/* Design: all inputs stacked in ONE left panel under three labels, the
          outcome card beside them. (Was a 2-col box grid + full-width results.) */}
      <div className="two-eq" style={{ alignItems: 'start', marginTop: 14 }}>
        <div className="panel pad">
          <div className="divlabel">Operating assumptions</div>
          <FieldRow label="Hotel keys"><NumberInput value={data.keys} onChange={v => update('keys', v)} /></FieldRow>
          <FieldRow label="ADR (avg daily rate)"><NumberInput value={data.adr} onChange={v => update('adr', v)} prefix="$" step={10} /></FieldRow>
          <FieldRow label="Occupancy (%)"><PctInput value={data.occupancyPct} onChange={v => update('occupancyPct', v)} /></FieldRow>
          <FieldRow label="Other revenue / key / yr"><NumberInput value={data.otherRevenuePerKeyPerYear} onChange={v => update('otherRevenuePerKeyPerYear', v)} prefix="$" step={500} /></FieldRow>

          <div className="divlabel" style={{ marginTop: 22 }}>Margins &amp; fees</div>
          <FieldRow label="GOP margin (%)"><PctInput value={data.gopMarginPct} onChange={v => update('gopMarginPct', v)} /></FieldRow>
          <FieldRow label="Management fee (%)"><PctInput value={data.managementFeePct} onChange={v => update('managementFeePct', v)} /></FieldRow>
          <FieldRow label="FF&amp;E reserve (%)"><PctInput value={data.ffeReservePct} onChange={v => update('ffeReservePct', v)} /></FieldRow>

          <div className="divlabel" style={{ marginTop: 22 }}>Valuation</div>
          <FieldRow label="Hotel cap rate (%)"><PctInput value={data.hotelCapRate} onChange={v => update('hotelCapRate', v)} /></FieldRow>
          <FieldRow label="Developer margin (%)"><PctInput value={data.devMarginPct} onChange={v => update('devMarginPct', v)} /></FieldRow>

          {/* Hold / stabilisation debt — only when set. Kept: it carries data. */}
          {(data.holdDebtLvr !== undefined || data.holdDebtRate !== undefined) && (
            <>
              <div className="divlabel" style={{ marginTop: 22 }}>Hold / stabilisation debt</div>
              <FieldRow label="Hold debt LVR (%)"><PctInput value={data.holdDebtLvr ?? 0.60} onChange={v => update('holdDebtLvr', v)} /></FieldRow>
              <FieldRow label="Hold debt rate (p.a.) (%)"><PctInput value={data.holdDebtRate ?? 0.065} onChange={v => update('holdDebtRate', v)} /></FieldRow>
            </>
          )}
        </div>

        {/* HOTEL OUTCOME — one card, TDC top-right (design) */}
        <div className="panel pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div className="divlabel">Hotel outcome</div>
            <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
              TDC: <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>${(tdc / 1_000_000).toFixed(1)}M</span>
            </div>
          </div>
          {data.buildRateOverride !== undefined && (
            <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 6 }}>
              Modular @ ${data.buildRateOverride.toLocaleString()}/sqm · ${(costStack.construction / 1_000_000).toFixed(1)}M build cost
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Row label="RevPAR" value={`$${income.revpar.toFixed(0)}`} />
            <Row label="Room revenue (p.a.)" value={`$${(income.roomRevenue / 1_000_000).toFixed(2)}M`} />
            <Row label="Other revenue (p.a.)" value={`$${(income.otherRevenue / 1_000_000).toFixed(2)}M`} />
            <Row label="Total revenue" value={`$${(income.totalRevenue / 1_000_000).toFixed(2)}M`} />
            <Row label={`GOP (${(data.gopMarginPct * 100).toFixed(0)}%)`} value={`$${(income.gop / 1_000_000).toFixed(2)}M`} />
            <Row label="Management fee" value={`−$${(income.managementFee / 1000).toFixed(0)}K`} dim />
            <Row label="FF&E reserve" value={`−$${(income.ffeReserve / 1000).toFixed(0)}K`} dim />
            <div className="sumrow" style={{ borderTop: '1px solid var(--border-hi)', marginTop: 4 }}>
              <span className="l" style={{ color: 'var(--ink)', fontWeight: 700 }}>NOI</span>
              <span className="v" style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 14 }}>${(income.noi / 1_000_000).toFixed(2)}M</span>
            </div>
            <Row label={`GAV @ ${(data.hotelCapRate * 100).toFixed(2)}%`} value={`$${(val.gav / 1_000_000).toFixed(1)}M`} />
            <div className="sumrow" style={{ borderTop: '1px solid var(--border-hi)' }}>
              <span className="l" style={{ color: 'var(--ink)', fontWeight: 700 }}>RLV</span>
              <span className="v" style={{ color: val.rlv >= 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700, fontSize: 14 }}>
                {val.rlv < 0 ? '−' : ''}${Math.abs(val.rlv / 1_000_000).toFixed(1)}M
              </span>
            </div>
            <div style={{ marginTop: 12 }}><VerdictBadge rlv={val.rlv} /></div>
          </div>

          {/* Stabilised hold — only when the debt inputs are set */}
          {data.holdDebtLvr !== undefined && data.holdDebtRate !== undefined && (() => {
            const lvr = data.holdDebtLvr!
            const rate = data.holdDebtRate!
            const debtAmount = val.gav * lvr
            const annualInterest = debtAmount * rate
            const cashAfterDebt = income.noi - annualInterest
            const equity = val.gav * (1 - lvr)
            const coc = equity > 0 ? cashAfterDebt / equity : 0
            return (
              <div style={{ marginTop: 22 }}>
                <div className="divlabel">Stabilised hold @ {(rate * 100).toFixed(1)}% debt</div>
                <div style={{ marginTop: 10 }}>
                  <Row label={`Hold debt (${(lvr * 100).toFixed(0)}% LVR)`} value={`$${(debtAmount / 1_000_000).toFixed(1)}M`} />
                  <Row label="Annual interest" value={`−$${(annualInterest / 1000).toFixed(0)}K`} dim />
                  <Row label="Cash after debt service" value={`$${(cashAfterDebt / 1000).toFixed(0)}K`} />
                  <Row label="Equity retained" value={`$${(equity / 1_000_000).toFixed(1)}M`} />
                  <div className="sumrow" style={{ borderTop: '1px solid var(--border-hi)' }}>
                    <span className="l" style={{ color: 'var(--ink)', fontWeight: 700 }}>Cash-on-cash</span>
                    <span className="v" style={{ fontWeight: 700, color: coc >= 0.07 ? 'var(--emerald)' : coc >= 0.04 ? 'var(--amber)' : 'var(--red)' }}>{(coc * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}


// An outcome row — hairline-separated label/value, mono value, per the design.
function Row({ label, value, bold, dim }: { label: string; value: string; bold?: boolean; dim?: boolean }) {
  return (
    <div className="sumrow" style={{ padding: '9px 0' }}>
      <span className="l" style={dim ? { color: 'var(--faint)' } : undefined}>{label}</span>
      <span className="v" style={{ fontWeight: bold ? 700 : 400, ...(dim ? { color: 'var(--faint)' } : {}) }}>{value}</span>
    </div>
  )
}
