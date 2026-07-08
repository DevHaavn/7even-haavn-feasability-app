import React, { useState, useMemo } from 'react'
import { useStore } from '../../store'
import * as db from '../../db'
import { calculateCostStack } from '../../engine/costStack'
import { calculateFinance } from '../../engine/finance'
import { calculateBTRIncome, calculateBTRValuation } from '../../engine/btr'
import { calculateHotelIncome, calculateHotelValuation } from '../../engine/hotel'
import type { FinanceAssumptions, DebtTranche } from '../../db/schema'
import type { ScenarioResult } from '../../engine/finance'
import FinanceSCurve from '../../components/FinanceSCurve'

interface Props { projectId: string }

// ── Formatting ────────────────────────────────────────────────────────────────
const fmt  = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n/1_000).toFixed(0)}K` : `$${Math.round(n).toLocaleString()}`
const fmtM = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(3)}M` : fmt(n)
const pct  = (n: number, dp = 2) => `${(n*100).toFixed(dp)}%`
const sign = (n: number) => n >= 0 ? `+${fmt(n)}` : `−${fmt(Math.abs(n))}`

const GOLD  = '#C4973A'
const GREEN = '#22C55E'
const RED   = '#EF4444'
const AMBER = '#EAB308'
const PURPLE = '#A855F7'
const BLUE  = '#3B82F6'

const TRANCHE_COLORS: Record<DebtTranche['type'], string> = {
  land:              '#C4973A',
  senior:            '#3B82F6',
  mezz:              '#A855F7',
  'preferred-equity':'#EAB308',
  equity:            '#22C55E',
}

const TRANCHE_LABELS: Record<DebtTranche['type'], string> = {
  land:              'Land Facility',
  senior:            'Senior Debt',
  mezz:              'Mezzanine',
  'preferred-equity':'Pref. Equity',
  equity:            'Common Equity',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
        <div style={{ width: 3, height: 20, background: GOLD, flexShrink: 0 }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1A1A1A', margin: 0 }}>{title}</h2>
      </div>
      {sub && <p style={{ color: '#999', fontSize: 10, letterSpacing: '0.06em', marginLeft: 13 }}>{sub}</p>}
    </div>
  )
}

function Row({ label, value, sub, bold, gold, red, indent }: { label: string; value: string; sub?: string; bold?: boolean; gold?: boolean; red?: boolean; indent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid #F0EDE8' }}>
      <div style={{ paddingLeft: indent ? 16 : 0 }}>
        <span style={{ color: '#666', fontSize: 11, letterSpacing: '0.04em' }}>{label}</span>
        {sub && <span style={{ color: '#BBB', fontSize: 9, marginLeft: 8 }}>{sub}</span>}
      </div>
      <span style={{ fontFamily: 'monospace', fontWeight: bold ? 700 : 500, fontSize: bold ? 14 : 12, color: gold ? GOLD : red ? RED : '#1A1A1A' }}>{value}</span>
    </div>
  )
}

function InputRow({ label, value, onChange, suffix, prefix, step, sub, note }: {
  label: string; value: number; onChange: (v: number) => void
  suffix?: string; prefix?: string; step?: number; sub?: string; note?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: '1px solid #F0EDE8' }}>
      <div style={{ flex: 1 }}>
        <span style={{ color: GOLD, fontSize: 11, letterSpacing: '0.04em' }}>{label}</span>
        {sub && <span style={{ color: '#BBB', fontSize: 9, display: 'block', marginTop: 1 }}>{sub}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {prefix && <span style={{ color: '#AAA', fontSize: 11 }}>{prefix}</span>}
        <input
          type="number"
          value={value || ''}
          step={step ?? 0.1}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ width: 90, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#1A1A1A', background: 'transparent', border: 'none', borderBottom: '1px solid #D0CEC9', borderRadius: 0, padding: '2px 0', outline: 'none' }}
        />
        {suffix && <span style={{ color: '#AAA', fontSize: 11, width: 24 }}>{suffix}</span>}
      </div>
      {note && <span style={{ color: '#CCC', fontSize: 9, width: 120, textAlign: 'right', flexShrink: 0 }}>{note}</span>}
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid #F0EDE8', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #F0EDE8', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ width: 32, height: 18, borderRadius: 9, background: value ? GOLD : '#D0CEC9', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: value ? 16 : 2, transition: 'left 0.2s' }} />
      </div>
      <span style={{ color: GOLD, fontSize: 11, letterSpacing: '0.04em' }}>{label}</span>
    </button>
  )
}

// Capital stack bar visual
function StackBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return null
  return (
    <div>
      <div style={{ display: 'flex', height: 28, borderRadius: 2, overflow: 'hidden', gap: 1 }}>
        {segments.filter(s => s.value > 0).map((s, i) => (
          <div key={i} style={{ flex: s.value / total, background: s.color, minWidth: 2, position: 'relative' }}
            title={`${s.label}: ${fmt(s.value)}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 10 }}>
        {segments.filter(s => s.value > 0).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'block' }} />
            <span style={{ fontSize: 9, color: '#888' }}>{s.label}</span>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#555', fontWeight: 700 }}>{fmt(s.value)}</span>
            <span style={{ fontSize: 9, color: '#BBB' }}>({pct(s.value / total, 0)})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Blowout scenario card
function BlowoutCard({ s, base, tdc }: { s: ScenarioResult; base: ScenarioResult; tdc: number }) {
  const isBase = s.extraMonths === 0
  const extraCost = s.totalFinanceCost - base.totalFinanceCost
  const color = isBase ? GOLD : s.extraMonths <= 3 ? AMBER : s.extraMonths <= 6 ? '#F97316' : RED
  return (
    <div style={{ border: `1px solid ${color}33`, background: isBase ? '#FDFBF4' : `${color}08`, padding: '16px 18px', flex: 1, minWidth: 160 }}>
      <p style={{ color, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 700 }}>{s.label}</p>
      <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: isBase ? '#1A1A1A' : color, margin: '0 0 4px' }}>{fmt(s.totalFinanceCost)}</p>
      <p style={{ fontSize: 9, color: '#999', margin: '0 0 10px' }}>total finance cost</p>
      {!isBase && (
        <>
          <div style={{ borderTop: `1px solid ${color}22`, paddingTop: 10, marginTop: 4 }}>
            <p style={{ fontSize: 10, color: RED, fontFamily: 'monospace', fontWeight: 700, margin: '0 0 2px' }}>{sign(s.profitImpact)}</p>
            <p style={{ fontSize: 9, color: '#BBB', margin: 0 }}>profit impact</p>
          </div>
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 10, color: RED, fontFamily: 'monospace', fontWeight: 700, margin: '0 0 2px' }}>{pct(s.marginImpact, 2)} pts</p>
            <p style={{ fontSize: 9, color: '#BBB', margin: 0 }}>margin change</p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tranche editor card ───────────────────────────────────────────────────────
function TrancheCard({ t, tdc, onChange, onRemove, isDefault }: {
  t: DebtTranche; tdc: number; onChange: (u: DebtTranche) => void; onRemove: () => void; isDefault: boolean
}) {
  const [open, setOpen] = useState(false)
  const color = TRANCHE_COLORS[t.type]
  const facility = t.useAutoLvr ? tdc * t.lvr : t.amount
  const active = facility > 0

  function upd<K extends keyof DebtTranche>(k: K, v: DebtTranche[K]) {
    onChange({ ...t, [k]: v })
  }

  return (
    <div style={{ border: `1px solid ${active ? color + '44' : '#E8E5E0'}`, background: active ? `${color}06` : '#FAFAF8', marginBottom: 8 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: active ? color : '#CCC', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: active ? '#1A1A1A' : '#AAA', margin: 0 }}>{t.label}</p>
          <p style={{ fontSize: 9, color: '#AAA', margin: 0, letterSpacing: '0.06em' }}>
            {TRANCHE_LABELS[t.type]}
            {active ? ` · ${fmt(facility)} @ ${pct(t.interestRate, 2)} p.a.` : ' · Inactive (set amount or LVR)'}
          </p>
        </div>
        <span style={{ fontSize: 9, color: '#CCC', letterSpacing: '0.14em' }}>{open ? '▲ CLOSE' : '▼ EDIT'}</span>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${color}22` }}>
          {/* Facility sizing */}
          <div style={{ padding: '10px 16px 0', background: '#fff' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#BBB', marginBottom: 6 }}>Facility</p>
          </div>
          <Toggle label="Auto-size from LVR (% of TDC)" value={t.useAutoLvr} onChange={v => upd('useAutoLvr', v)} />
          {t.useAutoLvr
            ? <InputRow label="LVR %" value={t.lvr * 100} onChange={v => upd('lvr', v / 100)} suffix="%" step={1}
                sub={`Facility: ${fmt(facility)}`} note={tdc > 0 ? `${pct(t.lvr, 0)} of $${(tdc/1e6).toFixed(2)}M TDC` : ''} />
            : <InputRow label="Facility Amount" value={t.amount} onChange={v => upd('amount', v)} prefix="$" step={100000}
                note="Fixed $ amount" />
          }
          {/* Rates */}
          <div style={{ padding: '10px 16px 0', background: '#fff', marginTop: 4 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#BBB', marginBottom: 6 }}>Rates & Fees</p>
          </div>
          <InputRow label="Interest Rate" value={t.interestRate * 100} onChange={v => upd('interestRate', v / 100)} suffix="% p.a." step={0.05}
            note="Annual rate on drawn balance" />
          <InputRow label="Establishment Fee" value={t.establishmentFeePct * 100} onChange={v => upd('establishmentFeePct', v / 100)} suffix="% of facility" step={0.05} />
          <InputRow label="Line / Commitment Fee" value={t.lineFeePct * 100} onChange={v => upd('lineFeePct', v / 100)} suffix="% p.a. undrawn" step={0.05} />
          <InputRow label="Exit / Repayment Fee" value={t.exitFeePct * 100} onChange={v => upd('exitFeePct', v / 100)} suffix="% of facility" step={0.05} />
          {/* Term & drawdown */}
          <div style={{ padding: '10px 16px 0', background: '#fff', marginTop: 4 }}>
            <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#BBB', marginBottom: 6 }}>Term & Drawdown</p>
          </div>
          <InputRow label="Term" value={t.termMonths} onChange={v => upd('termMonths', v)} suffix="months" step={1} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '9px 16px', borderBottom: '1px solid #F0EDE8' }}>
            <span style={{ color: GOLD, fontSize: 11, flex: 1 }}>Drawdown Profile</span>
            {(['scurve','linear','upfront','backloaded'] as const).map(p => (
              <button key={p} onClick={() => upd('drawdownProfile', p)}
                style={{ padding: '4px 10px', fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', marginLeft: 4,
                  background: t.drawdownProfile === p ? '#1A1A1A' : 'transparent',
                  color: t.drawdownProfile === p ? '#fff' : '#888',
                  border: `1px solid ${t.drawdownProfile === p ? '#1A1A1A' : '#D0CEC9'}`,
                  textTransform: 'uppercase' as const }}>
                {p === 'scurve' ? 'S-Curve' : p === 'backloaded' ? 'Back' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {/* Notes */}
          <div style={{ padding: '10px 16px' }}>
            <textarea
              value={t.notes}
              onChange={e => upd('notes', e.target.value)}
              placeholder="Notes about this tranche…"
              style={{ width: '100%', minHeight: 48, background: '#F7F5F2', border: '1px solid #E8E5E0', borderRadius: 0, padding: '6px 8px', fontSize: 11, color: '#1A1A1A', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          {!isDefault && (
            <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onRemove} style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: RED, background: 'none', border: `1px solid ${RED}33`, padding: '4px 10px', cursor: 'pointer' }}>
                Remove Tranche
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function FinanceTab({ projectId }: Props) {
  const store = useStore()
  const site  = store.getSiteDesign(projectId)
  const land  = store.getLandTerms(projectId)
  const costData = store.getCostStack(projectId)

  const inKind = land.isInKind && land.inKindGFA > 0
    ? { label: land.inKindLabel, gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote }
    : undefined
  const costResult = useMemo(() => calculateCostStack({ ...costData, gba: site.resiGBA, inKindLineItem: inKind }), [costData, site])
  const tdc = costResult.totalDevelopmentCost
  const landCost = store.getEffectiveLandCost(projectId)  // ex GST when project applies GST

  // Get best GAV from scenarios
  const gav = useMemo(() => {
    let best = 0
    for (const s of store.getMixScenarios(projectId)) {
      const hotelA = store.getHotelAssumptions(s.id)
      if (hotelA.keys > 0) {
        const inc = calculateHotelIncome(hotelA)
        const val = calculateHotelValuation(inc.noi, hotelA.hotelCapRate, tdc, hotelA.devMarginPct)
        if (val.gav > best) best = val.gav
      }
      const btrA = store.getBTRAssumptions(s.id)
      const units = store.getUnitTypes(s.id)
      if (units.some(u => u.weeklyRentConservative > 0)) {
        const ul = units.map(u => ({ typeName: u.name, unitCount: u.solvedCount, weeklyRentConservative: u.weeklyRentConservative, weeklyRentAggressive: u.weeklyRentAggressive, opexPerUnitPerYear: u.opexPerUnitPerYear }))
        const inc = calculateBTRIncome({ unitLines: ul, vacancyPct: btrA.vacancyPct, managementFeePct: btrA.managementFeePct, commercialIncomeLines: [], carParkIncomeAnnual: btrA.carParkIncomeAnnual, buildingAdminFixed: btrA.buildingAdminFixed }, 'aggressive')
        const val = calculateBTRValuation(inc.noi, btrA.capRateAggressive, tdc, btrA.devMarginPct)
        if (val.gav > best) best = val.gav
      }
    }
    return best
  }, [projectId, tdc])

  const [fa, setFa] = useState<FinanceAssumptions>(() => db.getFinanceAssumptions(projectId))
  const [dirty, setDirty] = useState(false)

  function update(patch: Partial<FinanceAssumptions>) {
    setFa(f => ({ ...f, ...patch }))
    setDirty(true)
  }
  function save() { db.saveFinanceAssumptions(fa); setDirty(false) }

  function updateTranche(id: string, updated: DebtTranche) {
    update({ tranches: fa.tranches.map(t => t.id === id ? updated : t) })
  }
  function addTranche() {
    const newT: DebtTranche = {
      id: db.generateId(), label: 'New Debt Facility', type: 'senior',
      amount: 0, lvr: 0, useAutoLvr: false, interestRate: 0.09,
      establishmentFeePct: 0.01, lineFeePct: 0.005, exitFeePct: 0.005,
      termMonths: 24, drawdownProfile: 'linear', notes: '',
    }
    update({ tranches: [...fa.tranches, newT] })
  }
  function removeTranche(id: string) {
    update({ tranches: fa.tranches.filter(t => t.id !== id) })
  }

  const result = useMemo(() => calculateFinance(fa, tdc, landCost, gav), [fa, tdc, landCost, gav])
  const timelineTasks = useMemo(() => db.getTimelineTasks(projectId), [projectId])

  const stackSegments = [
    { label: 'Senior Debt', value: result.tranches.filter(t => t.type === 'senior').reduce((s, t) => s + t.facilityAmount, 0), color: BLUE },
    { label: 'Mezzanine', value: result.tranches.filter(t => t.type === 'mezz').reduce((s, t) => s + t.facilityAmount, 0), color: PURPLE },
    { label: 'Pref. Equity', value: result.tranches.filter(t => t.type === 'preferred-equity').reduce((s, t) => s + t.facilityAmount, 0), color: AMBER },
    { label: 'Common Equity', value: result.totalEquity, color: GREEN },
  ]

  const DEFAULT_IDS = ['land-debt','senior-debt','mezz-debt','pref-equity']

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, width: '100%', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid #E8E5E0' }}>
        <div>
          <p style={{ color: GOLD, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 4 }}>Debt & Equity Structuring</p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 26, letterSpacing: '0.06em', color: '#1A1A1A', margin: 0 }}>Finance</h1>
          <p style={{ color: '#AAA', fontSize: 11, marginTop: 6, letterSpacing: '0.06em' }}>Capital stack · interest modelling · critical path sensitivity</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {dirty && (
            <button onClick={save} style={{ background: '#1A1A1A', color: '#fff', border: 'none', padding: '8px 20px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600 }}>
              Save
            </button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginBottom: 32 }}>
        {[
          { label: 'Total Dev Cost', value: fmt(tdc + landCost), color: GOLD },
          { label: 'Total Debt', value: fmt(result.totalDebt), color: BLUE },
          { label: 'Equity Required', value: fmt(result.totalEquity), color: GREEN },
          { label: 'All-in Finance Cost', value: fmt(result.totalFinanceCost), color: '#1A1A1A' },
          { label: 'Finance % of TDC', value: pct(result.financePctOfTDC), color: result.financePctOfTDC > 0.12 ? AMBER : '#1A1A1A' },
          { label: 'Equity Multiple', value: gav > 0 ? `${result.equityMultiple.toFixed(2)}×` : '—', color: result.equityMultiple >= 1.5 ? GREEN : AMBER },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '16px 18px', border: '1px solid #E8E5E0', background: '#fff' }}>
            <p style={{ color: '#999', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 8px' }}>{label}</p>
            <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Capital stack visual */}
      <div style={{ border: '1px solid #E8E5E0', background: '#fff', padding: '20px 24px', marginBottom: 28 }}>
        <SectionHead title="Capital Stack" sub="How the project is funded — debt layers and equity" />
        <StackBar segments={stackSegments} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', marginTop: 20, border: '1px solid #F0EDE8' }}>
          <Row label="Total Debt Facilities" value={fmt(result.totalDebt)} />
          <Row label="Common Equity Required" value={fmt(result.totalEquity)} gold />
          <Row label="Equity as % of TDC" value={pct(result.equityPct)} />
          <Row label="Land Debt (separate)" value={fmt(result.landDebt)} />
          <Row label="Land Interest Cost" value={fmt(result.landInterestCost)} />
          <Row label="Construction Interest" value={fmt(result.constructionInterestCost)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

        {/* Left: Base rate & land */}
        <div>
          <div style={{ border: '1px solid #E8E5E0', background: '#fff', marginBottom: 16 }}>
            <div style={{ padding: '16px 20px 0' }}><SectionHead title="Base Rate & Land Carry" sub="BBSY benchmark + land facility" /></div>
            <InputRow label="BBSY / Base Rate" value={fa.bbsyRate * 100} onChange={v => update({ bbsyRate: v / 100 })} suffix="% p.a." step={0.05} note="Current RBA cash rate benchmark" />
            <InputRow label="Land Interest Rate" value={fa.landInterestRate * 100} onChange={v => update({ landInterestRate: v / 100 })} suffix="% p.a." step={0.05} note="Rate on land facility from settlement" />
            <InputRow label="Land LVR" value={fa.landLvr * 100} onChange={v => update({ landLvr: v / 100 })} suffix="%" step={5} note="Land loan as % of land cost" />
            <InputRow label="Land Carry Period" value={fa.landCarryMonths} onChange={v => update({ landCarryMonths: v })} suffix="months" step={1} note="Settlement → construction start" />
            <InputRow label="Construction Period" value={fa.constructionMonths} onChange={v => update({ constructionMonths: v })} suffix="months" step={1} note="Build programme duration" />
          </div>

          <div style={{ border: '1px solid #E8E5E0', background: '#fff' }}>
            <div style={{ padding: '16px 20px 0' }}><SectionHead title="Equity Hurdles" sub="Target returns for equity partners" /></div>
            <InputRow label="Equity IRR Hurdle" value={fa.equityHurdleRate * 100} onChange={v => update({ equityHurdleRate: v / 100 })} suffix="% p.a." step={0.5} note="Minimum equity return target" />
            <InputRow label="Preferred Return Rate" value={fa.preferredReturnRate * 100} onChange={v => update({ preferredReturnRate: v / 100 })} suffix="% p.a." step={0.5} note="Pref equity return before common" />
            <div style={{ padding: '14px 16px', borderTop: '1px solid #F0EDE8', background: '#FAFAF8' }}>
              <p style={{ fontSize: 9, color: '#BBB', letterSpacing: '0.06em', margin: 0 }}>
                Equity multiple (GAV basis): <strong style={{ color: result.equityMultiple >= 1.5 ? GREEN : AMBER, fontFamily: 'monospace' }}>{gav > 0 ? `${result.equityMultiple.toFixed(2)}×` : '—'}</strong>
                &nbsp;&nbsp;Equity: <strong style={{ color: GREEN, fontFamily: 'monospace' }}>{fmt(result.totalEquity)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Right: Finance cost breakdown */}
        <div style={{ border: '1px solid #E8E5E0', background: '#fff' }}>
          <div style={{ padding: '16px 20px 0' }}><SectionHead title="Finance Cost Breakdown" sub="All-in cost per tranche" /></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
              <thead>
                <tr style={{ background: '#F7F5F2', borderBottom: '1px solid #E8E5E0' }}>
                  {['Tranche', 'Facility', 'Interest', 'Fees', 'Total'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.tranches.filter(t => t.facilityAmount > 0).map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #F0EDE8' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: TRANCHE_COLORS[t.type], flexShrink: 0, display: 'block' }} />
                        <span style={{ fontSize: 10, color: '#555' }}>{t.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#777' }}>{fmt(t.facilityAmount)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#777' }}>{fmt(t.interestCost)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#777' }}>{fmt(t.establishmentFee + t.lineFee + t.exitFee)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{fmt(t.totalCost)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #E8E5E0', background: '#FDFBF4' }}>
                  <td colSpan={4} style={{ padding: '10px 12px', fontSize: 11, color: '#888', fontWeight: 600 }}>Land Carry Interest</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: GOLD }}>{fmt(result.landInterestCost)}</td>
                </tr>
                <tr style={{ background: '#F5EDD6', borderTop: '1px solid #E8D9A0' }}>
                  <td colSpan={4} style={{ padding: '10px 12px', fontSize: 11, color: '#8A6A10', fontWeight: 700, letterSpacing: '0.06em' }}>TOTAL FINANCE COST</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 14, fontWeight: 900, color: GOLD }}>{fmt(result.totalFinanceCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Debt Tranches */}
      <div style={{ border: '1px solid #E8E5E0', background: '#fff', padding: '20px 24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <SectionHead title="Debt Tranches" sub="Configure each funding layer — rates, LVR, fees and drawdown" />
          <button onClick={addTranche} style={{ background: '#1A1A1A', color: '#fff', border: 'none', padding: '7px 16px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>
            + Add Tranche
          </button>
        </div>
        {fa.tranches.map(t => (
          <TrancheCard
            key={t.id} t={t} tdc={tdc}
            onChange={u => updateTranche(t.id, u)}
            onRemove={() => removeTranche(t.id)}
            isDefault={DEFAULT_IDS.includes(t.id)}
          />
        ))}
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#F7F5F2', border: '1px solid #E8E5E0', fontSize: 9, color: '#AAA', letterSpacing: '0.06em' }}>
          Drawdown profiles: <strong>S-Curve</strong> = gradual construction draw (avg 50% drawn) · <strong>Upfront</strong> = land/purchase facility (avg 90%) · <strong>Linear</strong> = equal monthly (avg 50%) · <strong>Back</strong> = late stage (avg 35%)
        </div>
      </div>

      {/* Critical Path Sensitivity */}
      <div style={{ border: '1px solid #E8E5E0', background: '#fff', padding: '20px 24px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <SectionHead title="Critical Path Sensitivity" sub="Impact of construction delays on finance cost and profit" />
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {[
              { label: '+3m', key: 'blowout3mActive' as const },
              { label: '+6m', key: 'blowout6mActive' as const },
              { label: '+12m', key: 'blowout12mActive' as const },
            ].map(({ label, key }) => (
              <button key={key} onClick={() => update({ [key]: !fa[key] })}
                style={{ padding: '5px 12px', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', border: '1px solid #D0CEC9', background: fa[key] ? '#1A1A1A' : 'transparent', color: fa[key] ? '#fff' : '#888', textTransform: 'uppercase' as const }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <BlowoutCard s={result.base} base={result.base} tdc={tdc} />
          {fa.blowout3mActive  && <BlowoutCard s={result.blowout3m}  base={result.base} tdc={tdc} />}
          {fa.blowout6mActive  && <BlowoutCard s={result.blowout6m}  base={result.base} tdc={tdc} />}
          {fa.blowout12mActive && <BlowoutCard s={result.blowout12m} base={result.base} tdc={tdc} />}
        </div>
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#FEF9EC', border: '1px solid #E8D9A0' }}>
          <p style={{ fontSize: 9, color: '#8A6A10', letterSpacing: '0.08em', margin: 0 }}>
            ⚠ Sensitivity uses the weighted average debt rate across active tranches applied to total debt for each additional month. Delays beyond programme duration compound interest on all drawn facilities simultaneously.
          </p>
        </div>
      </div>

      {/* Drawdown S-Curve */}
      <div style={{ border: '1px solid #E8E5E0', background: '#fff', padding: '20px 24px', marginBottom: 28 }}>
        <SectionHead title="Drawdown S-Curve" sub="Cumulative cost trajectory · live sensitivity against critical path delays · traffic light health from Timeline" />
        <FinanceSCurve fa={fa} result={result} tdc={tdc} tasks={timelineTasks} dark={false} compact={false} />
      </div>

      {/* Effective rates summary */}
      {result.tranches.some(t => t.facilityAmount > 0) && (
        <div style={{ border: '1px solid #E8E5E0', background: '#fff', padding: '20px 24px' }}>
          <SectionHead title="Effective Rate Summary" sub="All-in cost of each tranche including fees, annualised over term" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {result.tranches.filter(t => t.facilityAmount > 0).map(t => (
              <div key={t.id} style={{ flex: 1, minWidth: 140, padding: '14px 16px', border: `1px solid ${TRANCHE_COLORS[t.type]}33`, background: `${TRANCHE_COLORS[t.type]}06` }}>
                <p style={{ fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: TRANCHE_COLORS[t.type], margin: '0 0 8px', fontWeight: 700 }}>{t.label}</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 22, color: '#1A1A1A', margin: '0 0 2px' }}>{pct(t.effectiveRate)}</p>
                <p style={{ fontSize: 9, color: '#BBB', margin: '0 0 10px' }}>all-in p.a.</p>
                <p style={{ fontSize: 9, color: '#888', margin: '0 0 2px' }}>Nominal: {pct(fa.tranches.find(x => x.id === t.id)?.interestRate ?? 0)}</p>
                <p style={{ fontSize: 9, color: '#888', margin: 0 }}>Facility: {fmt(t.facilityAmount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
