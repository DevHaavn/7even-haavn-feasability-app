import React, { useState, useEffect } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { useStore } from '../../store'
import { FieldRow, NumberInput, PctInput, VerdictBadge } from '../../components/ui'
import { calculateBTRIncome, calculateBTRValuation } from '../../engine/btr'
import { calculateCostStack } from '../../engine/costStack'
import { solveUnitMix } from '../../engine/unitMix'
import type { BTRAssumptions, MixScenario } from '../../db/schema'

interface Props { projectId: string }

export default function BTRTab({ projectId }: Props) {
  const store = useStore()
  const [scenarios, setScenarios] = useState<MixScenario[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [data, setData] = useState<BTRAssumptions | null>(null)
  const { commit, undo, canUndo } = useAutosave<BTRAssumptions>(store.saveBTRAssumptions, [activeId], { onLiveReload: () => { if (activeId) setData(store.getBTRAssumptions(activeId)) } })

  const site = store.getSiteDesign(projectId)
  const land = store.getLandTerms(projectId)
  const costData = store.getCostStack(projectId)

  const inKindLineItem = land.isInKind && land.inKindGFA > 0 ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote } : undefined
  const costResult = calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem, landCost: land.landCost })

  useEffect(() => {
    const s = store.getMixScenarios(projectId)
    setScenarios(s)
    if (s.length > 0) {
      const id = s[0].id
      setActiveId(id)
      setData(store.getBTRAssumptions(id))
    }
  }, [projectId])

  useEffect(() => {
    if (activeId) setData(store.getBTRAssumptions(activeId))
  }, [activeId])

  function update<K extends keyof BTRAssumptions>(field: K, value: BTRAssumptions[K]) {
    if (!data) return
    const next = { ...data, [field]: value }
    commit(data, next)
    setData(next)
  }

  if (!data || !activeId) return (
    <div className="p-6 text-text-grey text-sm">Create a mix scenario in Product Mix first.</div>
  )

  const units = store.getUnitTypes(activeId)
  // Solve inline so BTR always has live counts even if Mix tab hasn't been visited
  const solverResult = site.resiNSA > 0 && units.length > 0
    ? solveUnitMix(site.resiNSA, units.map(u => ({ name: u.name, nsaPerUnit: u.nsaPerUnit, targetPct: u.targetPct })))
    : null
  const unitLines = units.map((u, i) => ({
    typeName: u.name,
    unitCount: u.solvedCount || solverResult?.mix[i]?.count || 0,
    weeklyRentConservative: u.weeklyRentConservative,
    weeklyRentAggressive: u.weeklyRentAggressive,
    opexPerUnitPerYear: u.opexPerUnitPerYear,
  }))

  const btrInputs = {
    unitLines,
    vacancyPct: data.vacancyPct,
    managementFeePct: data.managementFeePct,
    commercialIncomeLines: [
      ...(data.childcareAnnualNet > 0 ? [{ label: 'Childcare', annualNet: data.childcareAnnualNet }] : []),
      ...(data.commercialAnnualNet > 0 ? [{ label: 'Commercial', annualNet: data.commercialAnnualNet }] : []),
      // Custom other income sources
      ...(data.otherIncomeLabel1 && data.otherIncomeAmount1 ? [{ label: data.otherIncomeLabel1, annualNet: data.otherIncomeAmount1 }] : []),
      ...(data.otherIncomeLabel2 && data.otherIncomeAmount2 ? [{ label: data.otherIncomeLabel2, annualNet: data.otherIncomeAmount2 }] : []),
      ...(data.otherIncomeLabel3 && data.otherIncomeAmount3 ? [{ label: data.otherIncomeLabel3, annualNet: data.otherIncomeAmount3 }] : []),
    ],
    carParkIncomeAnnual: data.carParkIncomeAnnual,
    buildingAdminFixed: data.buildingAdminFixed,
  }

  const hasUnits = unitLines.some(u => u.unitCount > 0)
  const cons = hasUnits ? calculateBTRIncome(btrInputs, 'conservative') : null
  const agg = hasUnits ? calculateBTRIncome(btrInputs, 'aggressive') : null
  const tdc = costResult.totalDevelopmentCost
  // Lease-up: income foregone as occupancy ramps from 0 to stabilised over the lease-up period
  // (average ~50% of net stabilised rent across the ramp). Informational — excluded from cap value.
  const fmt = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1000).toLocaleString()}K`
  const leaseUpForegone = (data.leaseUpMonths ?? 0) > 0 && agg
    ? agg.netApartmentIncome * ((data.leaseUpMonths ?? 0) / 12) * 0.5
    : 0

  const consVal = cons ? calculateBTRValuation(cons.noi, data.capRateConservative, tdc, data.devMarginPct) : null
  const aggVal = agg ? calculateBTRValuation(agg.noi, data.capRateAggressive, tdc, data.devMarginPct) : null

  return (
    <div className="flex flex-col">
      {/* Head — serif subtitle + desc left, auto-saved right (design) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 6 }}>
        <div>
          <div className="subtitle">BTR Income &amp; Valuation</div>
          <div className="desc">BTR hold scenario — income, NOI and residual land value.</div>
        </div>
        <div className="flex gap aic wrapf" style={{ flexShrink: 0 }}>
          <span className="check">✓ Auto-saved</span>
          {canUndo && <span className="chip" onClick={() => undo(setData)}>↶ Undo</span>}
        </div>
      </div>

      {/* Scenario picker — only when there's more than one to switch between */}
      {scenarios.length > 1 && (
        <div className="seg" style={{ margin: '10px 0 4px' }}>
          {scenarios.map(s => (
            <button key={s.id} onClick={() => setActiveId(s.id)} className={activeId === s.id ? 'on' : ''}>{s.name}</button>
          ))}
        </div>
      )}

      {!hasUnits && (
        <div className="guide" style={{ borderLeftColor: 'var(--amber)' }}>
          Set unit types and NSA mix in Product Mix first — solver will auto-populate unit counts.
        </div>
      )}

      {/* Design: inputs stacked in ONE left panel, the outcome card on the right.
          (Was a 3-column input grid with the outcome cards full-width underneath.) */}
      <div className="two-eq" style={{ alignItems: 'start', marginTop: 14 }}>
        <div className="panel pad">
          <div className="divlabel">Rent &amp; Vacancy</div>
          <FieldRow label="Stabilised vacancy (%)"><PctInput value={data.vacancyPct} onChange={v => update('vacancyPct', v)} /></FieldRow>
          <FieldRow label="Lease-up to stabilisation (mo)"><NumberInput value={data.leaseUpMonths ?? 0} onChange={v => update('leaseUpMonths', v)} step={1} /></FieldRow>
          <FieldRow label="Management fee (%)"><PctInput value={data.managementFeePct} onChange={v => update('managementFeePct', v)} /></FieldRow>
          <FieldRow label="Building admin (p.a.)"><NumberInput value={data.buildingAdminFixed} onChange={v => update('buildingAdminFixed', v)} prefix="$" step={10000} /></FieldRow>
          {(data.leaseUpMonths ?? 0) > 0 && (
            <div className="guide">
              Lease-up rent foregone ≈ <b>{fmt(leaseUpForegone)}</b> — ~{data.leaseUpMonths} months ramping to stabilised occupancy (excluded from the stabilised NOI the value is capped on; sits in the cashflow).
            </div>
          )}

          <div className="divlabel" style={{ marginTop: 22 }}>Other income</div>
          <FieldRow label="Childcare (net p.a.)"><NumberInput value={data.childcareAnnualNet} onChange={v => update('childcareAnnualNet', v)} prefix="$" step={10000} /></FieldRow>
          <FieldRow label="Commercial (net p.a.)"><NumberInput value={data.commercialAnnualNet} onChange={v => update('commercialAnnualNet', v)} prefix="$" step={10000} /></FieldRow>
          <FieldRow label="Car park income (p.a.)"><NumberInput value={data.carParkIncomeAnnual} onChange={v => update('carParkIncomeAnnual', v)} prefix="$" step={10000} /></FieldRow>

          {/* 3 custom editable other income sources — not drawn in the design, but they
              exist and carry data, so they stay. */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div className="divlabel">Custom income</div>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i < 3 ? 8 : 0, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={`Income source ${i}`}
                  value={data[`otherIncomeLabel${i}` as keyof BTRAssumptions] || ''}
                  onChange={e => update(`otherIncomeLabel${i}` as keyof BTRAssumptions, e.target.value as any)}
                  className="mini-inp"
                  style={{ flex: 1, maxWidth: 'none', textAlign: 'left', fontFamily: 'var(--sans)' }}
                />
                <input
                  type="number"
                  placeholder="0"
                  value={data[`otherIncomeAmount${i}` as keyof BTRAssumptions] || 0}
                  onChange={e => update(`otherIncomeAmount${i}` as keyof BTRAssumptions, parseInt(e.target.value) || 0)}
                  className="mini-inp"
                  style={{ width: 104 }}
                />
              </div>
            ))}
          </div>

          <div className="divlabel" style={{ marginTop: 22 }}>Capitalisation</div>
          <FieldRow label="Cap rate — conservative (%)"><PctInput value={data.capRateConservative} onChange={v => update('capRateConservative', v)} /></FieldRow>
          <FieldRow label="Cap rate — aggressive (%)"><PctInput value={data.capRateAggressive} onChange={v => update('capRateAggressive', v)} /></FieldRow>
          <FieldRow label="Developer margin (%)"><PctInput value={data.devMarginPct} onChange={v => update('devMarginPct', v)} /></FieldRow>
        </div>

        {/* BTR OUTCOME — one card, the two scenarios as columns inside it (design) */}
        <div className="panel pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div className="divlabel">BTR outcome</div>
            <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
              TDC: <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink)' }}>${(tdc / 1_000_000).toFixed(1)}M</span>
            </div>
          </div>
          {cons && agg && consVal && aggVal ? (
            <div className="two-eq" style={{ marginTop: 14, gap: 22 }}>
              <OutcomeCard label="Conservative" income={cons} val={consVal} capRate={data.capRateConservative} />
              <OutcomeCard label="Aggressive" income={agg} val={aggVal} capRate={data.capRateAggressive} />
            </div>
          ) : (
            <div style={{ color: 'var(--faint)', fontSize: 12, marginTop: 14 }}>Results appear once unit counts are set.</div>
          )}
        </div>
      </div>
    </div>
  )
}


// Design: each scenario is a bare COLUMN inside the one BTR OUTCOME card — no
// border, no box of its own. NOI is the bold stop, GAV follows, RLV reads green
// with its verdict pill beneath.
function OutcomeCard({ label, income, val, capRate }: any) {
  return (
    <div>
      <div className="divlabel">{label}</div>
      <div style={{ marginTop: 10 }}>
        <Line label="Gross annual rent" value={`$${(income.grossAnnualRent / 1_000_000).toFixed(2)}M`} />
        <Line label="Vacancy loss" value={`−$${(income.vacancyLoss / 1000).toFixed(0)}K`} dim />
        <Line label="Management fee" value={`−$${(income.managementFee / 1000).toFixed(0)}K`} dim />
        {income.otherIncome > 0 && <Line label="Other income" value={`+$${(income.otherIncome / 1000).toFixed(0)}K`} />}
        <Line label="Total opex" value={`−$${(income.opex / 1000).toFixed(0)}K`} dim />
      </div>
      <div className="sumrow" style={{ borderTop: '1px solid var(--border-hi)', marginTop: 4, fontWeight: 700 }}>
        <span className="l" style={{ color: 'var(--ink)', fontWeight: 700 }}>NOI</span>
        <span className="v" style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 14 }}>${(income.noi / 1_000_000).toFixed(2)}M</span>
      </div>
      <div className="sumrow">
        <span className="l">GAV @ {(capRate * 100).toFixed(2)}%</span>
        <span className="v">${(val.gav / 1_000_000).toFixed(1)}M</span>
      </div>
      <div className="sumrow">
        <span className="l">RLV</span>
        <span className="v" style={{ color: val.rlv >= 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700 }}>${(val.rlv / 1_000_000).toFixed(1)}M</span>
      </div>
      <div style={{ marginTop: 12 }}><VerdictBadge rlv={val.rlv} /></div>
    </div>
  )
}

// An income row inside an outcome column — hairline-separated, mono value,
// matching the design (was a borderless flex pair at a larger size).
function Line({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="sumrow" style={{ padding: '9px 0' }}>
      <span className="l" style={dim ? { color: 'var(--faint)' } : undefined}>{label}</span>
      <span className="v" style={dim ? { color: 'var(--faint)' } : undefined}>{value}</span>
    </div>
  )
}
