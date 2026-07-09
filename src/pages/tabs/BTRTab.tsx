import React, { useState, useEffect } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, PctInput, Button, Money, VerdictBadge, MetricCard } from '../../components/ui'
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
  const { commit, undo, canUndo } = useAutosave<BTRAssumptions>(store.saveBTRAssumptions, [activeId])

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

      <div className="relative p-4 md:p-6 flex flex-col gap-6">
      {/* Inputs */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-5">
          <SectionHeading sub="BTR hold scenario — income, NOI and residual land value">BTR Income & Valuation</SectionHeading>
          <span style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3DAA6A', alignSelf: 'center' }}>⤳ Auto-saved</span>
          {canUndo && <Button size="sm" variant="ghost" onClick={() => undo(setData)}>Undo</Button>}
        </div>

        {/* Scenario picker */}
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

        {!hasUnits && (
          <div className="text-[#B8963C] text-xs border border-[#D8C88A] bg-[#FDFBF4] p-3 mb-4">
            Set unit types and NSA mix in Product Mix first — solver will auto-populate unit counts.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="border border-[#E8E5E0] bg-white p-4">
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-3">Rent & Vacancy</h3>
          <p className="text-[#AAA] text-xs mb-3">Rent per unit type is set in Product Mix. Set vacancy and fees here.</p>
          <FieldRow label="Stabilised vacancy"><PctInput value={data.vacancyPct} onChange={v => update('vacancyPct', v)} /></FieldRow>
          <FieldRow label="Lease-up to stabilisation (months)"><NumberInput value={data.leaseUpMonths ?? 0} onChange={v => update('leaseUpMonths', v)} step={1} /></FieldRow>
          <FieldRow label="Management fee"><PctInput value={data.managementFeePct} onChange={v => update('managementFeePct', v)} /></FieldRow>
          <FieldRow label="Building admin (p.a.)"><NumberInput value={data.buildingAdminFixed} onChange={v => update('buildingAdminFixed', v)} prefix="$" step={10000} /></FieldRow>
          {(data.leaseUpMonths ?? 0) > 0 && (
            <p className="text-[#B8860B] text-[11px] mt-2 leading-relaxed">
              Lease-up rent foregone ≈ <strong>{fmt(leaseUpForegone)}</strong> — ~{data.leaseUpMonths} months ramping to stabilised occupancy (excluded from the stabilised NOI the value is capped on; sits in the cashflow).
            </p>
          )}
        </div>

        <div className="border border-[#E8E5E0] bg-white p-4">
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-3">Other Income</h3>
          <FieldRow label="Childcare (net p.a.)"><NumberInput value={data.childcareAnnualNet} onChange={v => update('childcareAnnualNet', v)} prefix="$" step={10000} /></FieldRow>
          <FieldRow label="Commercial (net p.a.)"><NumberInput value={data.commercialAnnualNet} onChange={v => update('commercialAnnualNet', v)} prefix="$" step={10000} /></FieldRow>
          <FieldRow label="Car park income (p.a.)"><NumberInput value={data.carParkIncomeAnnual} onChange={v => update('carParkIncomeAnnual', v)} prefix="$" step={10000} /></FieldRow>
        </div>

        <div className="border border-[#E8E5E0] bg-white p-4">
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-3">Capitalisation</h3>
          <FieldRow label="Cap rate (conservative)"><PctInput value={data.capRateConservative} onChange={v => update('capRateConservative', v)} /></FieldRow>
          <FieldRow label="Cap rate (aggressive)"><PctInput value={data.capRateAggressive} onChange={v => update('capRateAggressive', v)} /></FieldRow>
          <FieldRow label="Developer margin"><PctInput value={data.devMarginPct} onChange={v => update('devMarginPct', v)} /></FieldRow>
        </div>
        </div>
      </div>

      {/* Results — full width below the inputs */}
      <div className="w-full flex flex-col gap-4 pt-2 border-t border-[#E8E5E0]">
        <div className="flex items-center gap-4">
          <SectionHeading>BTR Outcome</SectionHeading>
          <div className="text-[#888] text-xs">TDC: <span className="text-[#1A1A1A] font-mono font-bold">${(tdc / 1_000_000).toFixed(1)}M</span></div>
        </div>

        {cons && agg && consVal && aggVal ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <OutcomeCard label="Conservative" income={cons} val={consVal} capRate={data.capRateConservative} />
            <OutcomeCard label="Aggressive" income={agg} val={aggVal} capRate={data.capRateAggressive} highlight />
          </div>
        ) : (
          <div className="text-[#AAA] text-xs">Results appear once unit counts are set.</div>
        )}
      </div>
      </div>
    </div>
  )
}

function OutcomeCard({ label, income, val, capRate, highlight }: any) {
  return (
    <div className={`border p-8 ${highlight ? 'border-[#C8C5C0] bg-[#F5F3F0]' : 'border-[#E8E5E0] bg-white'}`} style={{ borderRadius: 0 }}>
      <p className="text-[11px] tracking-[0.24em] uppercase text-[#888] mb-6 font-semibold">{label}</p>
      <div className="space-y-3">
        <Line label="Gross annual rent" value={`$${(income.grossAnnualRent / 1_000_000).toFixed(2)}M`} />
        <Line label="Vacancy loss" value={`−$${(income.vacancyLoss / 1000).toFixed(0)}K`} dim />
        <Line label="Management fee" value={`−$${(income.managementFee / 1000).toFixed(0)}K`} dim />
        {income.otherIncome > 0 && <Line label="Other income (incl. car park)" value={`+$${(income.otherIncome / 1000).toFixed(0)}K`} />}
        <Line label="Total opex" value={`−$${(income.opex / 1000).toFixed(0)}K`} dim />
      </div>
      <div className="mt-5 pt-4 border-t border-[#E8E5E0] flex justify-between items-center">
        <span className="text-[12px] tracking-[0.12em] uppercase text-[#888]">NOI</span>
        <span className="font-mono font-bold text-2xl text-[#B8963C]">${(income.noi / 1_000_000).toFixed(2)}M</span>
      </div>
      <div className="mt-3 pt-3 border-t border-[#F0EDE8] flex justify-between items-center">
        <span className="text-[12px] tracking-[0.12em] uppercase text-[#888]">GAV @ {(capRate * 100).toFixed(2)}%</span>
        <span className="font-mono font-bold text-lg text-[#1A1A1A]">${(val.gav / 1_000_000).toFixed(1)}M</span>
      </div>
      <div className="mt-4 pt-4 border-t border-[#D8D5D0] flex justify-between items-center">
        <span className="text-[12px] tracking-[0.12em] uppercase text-[#666]">RLV</span>
        <div className="flex items-center gap-3">
          <Money value={val.rlv} size="xl" />
          <VerdictBadge rlv={val.rlv} />
        </div>
      </div>
    </div>
  )
}

function Line({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-[13px] tracking-wide ${dim ? 'text-[#AAA]' : 'text-[#555]'}`}>{label}</span>
      <span className={`font-mono text-base ${dim ? 'text-[#BBB]' : 'text-[#1A1A1A]'}`}>{value}</span>
    </div>
  )
}
