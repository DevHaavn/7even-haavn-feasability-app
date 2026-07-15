import React, { useState, useEffect } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { useStore } from '../../store'
import { FieldRow, NumberInput, PctInput, Button, SectionHeading, DateField } from '../../components/ui'
import type { LandTerms, LandDealType, AcquisitionCost } from '../../db/schema'
import { LAND_DEAL_TYPES, COST_PHASES } from '../../db/schema'
import { ALL_STATES, type AuState, type PropertyType } from '../../engine/stampDuty'
import { computeLandCost } from '../../engine/landCost'

const STATE_LABELS: Record<AuState, string> = {
  VIC: 'Victoria', NSW: 'New South Wales', QLD: 'Queensland', WA: 'Western Australia',
  SA: 'South Australia', TAS: 'Tasmania', ACT: 'Aust. Capital Territory', NT: 'Northern Territory',
}
const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  vacant_land: 'Vacant land',
  house_and_land: 'House & land (residential)',
  commercial: 'Commercial / industrial',
}
const BASIS: Record<NonNullable<LandTerms['priceBasis']>, string> = {
  lump: 'Lump sum', 'sqm-site': 'Per sqm — site area', 'sqm-gfa': 'Per sqm — developable GFA', 'per-lot': 'Per lot / dwelling site',
}
const DEAL_ICON: Record<LandDealType, string> = { standard: '▣', deferred: '⇥', option: '◆', rebate: '↩', inkind: '⇄', jv: '◈' }

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-AU')
const fmtShort = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${Math.round(n).toLocaleString()}`

// ── shared card look — black-chrome stealth headers, light data-page palette.
// GOLD stays only for the headline money figures (so JB BLK reads black + gold). ──
const GOLD = '#B8963C'
const CHROME = '#2A2A2A'
const CHROME_LINE = '#C8C4BE'
function Card({ title, hint, isNew, accent, children }: { title: string; hint?: string; isNew?: boolean; accent?: 'gold' | 'violet'; children: React.ReactNode }) {
  const border = accent === 'gold' ? CHROME_LINE : accent === 'violet' ? '#C8C0D8' : '#E8E5E0'
  // 'gold' accent card = a soft black-chrome glass sheet
  const bg = accent === 'gold' ? 'linear-gradient(160deg,#F6F4F1,#FFFFFF)' : accent === 'violet' ? '#F8F5FC' : '#fff'
  const isViolet = accent === 'violet'
  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', background: bg, boxShadow: accent === 'gold' ? '0 1px 3px rgba(0,0,0,0.05)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: `1px solid ${isViolet ? '#E7DEF2' : '#EDEAE5'}` }}>
        <h2 className={isViolet ? undefined : 'chrome-black-text'} style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: isViolet ? '#7A4AAA' : undefined, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}{isNew && <span style={{ fontSize: 8, letterSpacing: '0.12em', color: CHROME, border: `1px solid ${CHROME}55`, borderRadius: 20, padding: '2px 7px' }}>NEW</span>}
        </h2>
        {hint && <span style={{ fontSize: 10, color: '#B0ADA6' }}>{hint}</span>}
      </div>
      <div style={{ padding: '6px 18px 16px' }}>{children}</div>
    </div>
  )
}
function Flag({ children, info }: { children: React.ReactNode; info?: boolean }) {
  return (
    <div style={{ fontSize: 10.5, letterSpacing: '0.02em', display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, margin: '10px 0 2px',
      color: info ? '#555' : '#9B6A2A', background: info ? 'rgba(0,0,0,0.035)' : 'rgba(217,164,65,0.1)', border: `1px solid ${info ? 'rgba(0,0,0,0.1)' : 'rgba(217,164,65,0.35)'}` }}>
      <span>{info ? 'ⓘ' : '⚠'}</span><span style={{ lineHeight: 1.5 }}>{children}</span>
    </div>
  )
}

interface Props { projectId: string }

export default function LandTermsTab({ projectId }: Props) {
  const { getLandTerms, saveLandTerms, getCostStack } = useStore()
  const gstEnabled = getCostStack(projectId).gstEnabled
  const [data, setData] = useState<LandTerms>(getLandTerms(projectId))
  const { commit, undo, canUndo } = useAutosave(saveLandTerms, [projectId], { onLiveReload: () => setData(getLandTerms(projectId)) })

  useEffect(() => { setData(getLandTerms(projectId)) }, [projectId])

  function update<K extends keyof LandTerms>(field: K, value: LandTerms[K]) {
    const next = { ...data, [field]: value }; commit(data, next); setData(next)
  }
  function patch(next: Partial<LandTerms>) {
    const merged = { ...data, ...next }; commit(data, merged); setData(merged)
  }
  function setDeal(t: LandDealType) { patch({ dealType: t, isInKind: t === 'inkind' }) }

  const dealType = data.dealType ?? (data.isInKind ? 'inkind' : 'standard')
  const cost = computeLandCost({ ...data, dealType }, gstEnabled)
  const schedule = data.paymentSchedule ?? []
  const acqCosts = data.acquisitionCosts ?? []
  const scheduledTotal = schedule.reduce((s, p) => s + (p.amount || 0), 0)
  const balanced = data.landCost === 0 || Math.abs(scheduledTotal - data.landCost) < 1
  const pid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`
  const inKindCost = (data.inKindGFA || 0) * (data.inKindRatePerSqm || 0)
  const dutyRate = data.landCost > 0 && cost.stampDuty > 0 ? (cost.stampDuty / data.landCost) * 100 : 0
  const perSqmSite = (data.siteAreaSqm ?? 0) > 0 ? data.landCost / (data.siteAreaSqm as number) : null
  const monthsToSettle = data.settlementDate
    ? Math.max(0, Math.round((new Date(data.settlementDate + 'T00:00:00').getTime() - Date.now()) / (30.44 * 86400_000)))
    : null
  const dealMeta = LAND_DEAL_TYPES.find(d => d.id === dealType)!

  return (
    <div className="flex flex-col">
      <div className="relative p-4 md:p-6" style={{ color: '#1A1A1A' }}>

        {/* ── HERO — header styled to match every other tab (SectionHeading) ── */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-1">
          <SectionHeading sub="Acquisition · Deal Structure · Settlement · Cashflow inputs">Land &amp; Vendor Terms</SectionHeading>
          <div className="flex items-center gap-3" style={{ paddingBottom: 4 }}>
            <span style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3DAA6A', alignSelf: 'center' }}>⤳ Auto-saved</span>
            {canUndo && <Button size="sm" variant="ghost" onClick={() => undo(setData)}>Undo</Button>}
            {/* Current deal-structure badge — readable solid label (was an invisible chrome pill) */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${CHROME_LINE}`, padding: '7px 15px', borderRadius: 30, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, background: '#F5F3F0', color: '#2A2A2A' }}>{DEAL_ICON[dealType]} {dealMeta.label}</span>
          </div>
        </div>

        {/* ── METRIC STRIP ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: '#E8E5E0', border: '1px solid #E8E5E0', borderRadius: 12, overflow: 'hidden', marginTop: 24 }} className="ls-metrics">
          <Metric k="Contract Price" v={fmt(dealType === 'inkind' ? 0 : data.landCost)} foot={perSqmSite != null ? `${fmt(perSqmSite)} / sqm site` : 'lump sum'} />
          <Metric k="Stamp Duty + Surcharge" v={fmt(cost.stampDuty + cost.foreignSurcharge)} foot={`${data.state} · ${cost.foreignSurcharge > 0 ? 'incl FPAD' : 'no surcharge'}`} />
          <Metric k="Terms Cost (finance)" v={fmt(cost.financeOnTerms)} foot="Deferral / option holding" />
          <Metric k="Effective Land Cost" v={fmt(cost.total)} foot="Into feasibility →" gold />
          <Metric k="Settlement" v={monthsToSettle != null ? `${monthsToSettle} mo` : '—'} foot={data.settlementDate ? 'Est. ' + new Date(data.settlementDate + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }) : 'date TBC'} />
        </div>

        {/* ── GRID ── */}
        <div className="ls-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 24, marginTop: 26, alignItems: 'start' }}>

          {/* LEFT */}
          <div className="flex flex-col gap-6">

            <Card title="Land Acquisition" hint="Contract & statutory cost">
              <FieldRow label="Purchase price" note="Contract / agreed price"><NumberInput value={data.landCost} onChange={v => update('landCost', v)} prefix="$" step={10000} /></FieldRow>
              <FieldRowNew label="Price basis" note="Normalises price for the Compare tab">
                <select value={data.priceBasis ?? 'lump'} onChange={e => update('priceBasis', e.target.value as LandTerms['priceBasis'])}>
                  {(Object.keys(BASIS) as (keyof typeof BASIS)[]).map(k => <option key={k} value={k}>{BASIS[k]}</option>)}
                </select>
              </FieldRowNew>
              <FieldRow label="Site area (sqm)" note="Drives effective $/sqm"><NumberInput value={data.siteAreaSqm ?? 0} onChange={v => update('siteAreaSqm', v)} /></FieldRow>
              <FieldRow label="GST treatment" note="Margin scheme changes GST on the end sale, not acquisition">
                <select value={data.landGst} onChange={e => update('landGst', e.target.value as LandTerms['landGst'])}>
                  <option value="none">No GST — going concern / input-taxed</option>
                  <option value="inc">GST in price — claim 1/11 credit</option>
                  <option value="full">Full GST — +10%, reclaimed</option>
                  <option value="margin">Margin scheme applies</option>
                </select>
              </FieldRow>
              <FieldRow label="State / territory" note="Drives duty scale">
                <select value={data.state} onChange={e => update('state', e.target.value as AuState)}>
                  {ALL_STATES.map(s => <option key={s} value={s}>{s} — {STATE_LABELS[s]}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Property type" note="Sets duty basis & CIPT eligibility">
                <select value={data.propertyType} onChange={e => update('propertyType', e.target.value as PropertyType)}>
                  {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map(pt => <option key={pt} value={pt}>{PROPERTY_TYPE_LABELS[pt]}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Settlement date" note="Duty & balance due at settlement"><DateField value={data.settlementDate} onChange={v => update('settlementDate', v)} /></FieldRow>
              <Check checked={data.foreignBuyer} onChange={v => update('foreignBuyer', v)}>Foreign purchaser surcharge applies (residential only — FPAD)</Check>
              <Check checked={data.applyStampDuty} onChange={v => update('applyStampDuty', v)}>Add stamp duty to land cost in feasibility</Check>
              {data.state === 'VIC' && data.propertyType === 'commercial' && (
                <Flag info>VIC commercial/industrial: post-1 Jul 2024 this is the final upfront stamp duty — the site then moves to the 1% annual CIPT after 10 years (a government transition loan can fund the duty). <b>Model duty once here, CIPT as a holding cost.</b></Flag>
              )}
            </Card>

            <Card title="Deal Structure & Terms" hint="Pick how the deal is structured" isNew>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '6px 0 12px' }} className="ls-deals">
                {LAND_DEAL_TYPES.map(d => {
                  const on = dealType === d.id
                  return (
                    <button key={d.id} onClick={() => setDeal(d.id)} style={{ textAlign: 'left', padding: 13, borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${on ? CHROME : '#E0DDD8'}`, background: on ? '#F1EFEB' : '#fff', boxShadow: on ? `inset 0 0 0 1px ${CHROME}33` : 'none' }}>
                      <div style={{ color: on ? '#1A1A1A' : '#888', fontSize: 13, marginBottom: 7 }}>{DEAL_ICON[d.id]}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>{d.label}</div>
                      <div style={{ fontSize: 10, color: '#999', lineHeight: 1.45 }}>{d.blurb}</div>
                    </button>
                  )
                })}
              </div>

              {dealType === 'standard' && (
                <FieldRow label="Deposit" note="Paid on exchange"><PctInput value={data.deferredDepositPct ?? 0.1} onChange={v => update('deferredDepositPct', v)} /></FieldRow>
              )}
              {dealType === 'deferred' && (<>
                <FieldRow label="Deposit on exchange"><PctInput value={data.deferredDepositPct ?? 0.1} onChange={v => update('deferredDepositPct', v)} /></FieldRow>
                <FieldRow label="Deferred balance"><NumberInput value={data.deferredAmount ?? 0} onChange={v => update('deferredAmount', v)} prefix="$" step={100000} /></FieldRow>
                <FieldRow label="Deferral period (months)"><NumberInput value={data.deferredMonths ?? 0} onChange={v => update('deferredMonths', v)} step={1} /></FieldRow>
                <FieldRow label="Interest on deferred (p.a.)" note="Vendor finance rate → holding cost"><PctInput value={data.deferredRate ?? 0.065} onChange={v => update('deferredRate', v)} /></FieldRow>
                <Flag info>Interest on the deferred balance flows to the Cashflow tab as a land holding cost, not into the purchase price.</Flag>
              </>)}
              {dealType === 'option' && (<>
                <FieldRow label="Option fee" note="Typically 1–5% of price"><NumberInput value={data.optionFee ?? 0} onChange={v => update('optionFee', v)} prefix="$" step={50000} /></FieldRow>
                <FieldRow label="Option period (months)" note="Time to secure DA"><NumberInput value={data.optionMonths ?? 12} onChange={v => update('optionMonths', v)} step={1} /></FieldRow>
                <FieldRow label="Exercise / expiry date"><DateField value={data.optionExpiry ?? ''} onChange={v => update('optionExpiry', v)} /></FieldRow>
                <Check checked={!!data.optionFeeCredited} onChange={v => update('optionFeeCredited', v)}>Option fee credited to purchase price on exercise</Check>
                <Check checked={!!data.optionDaConditional} onChange={v => update('optionDaConditional', v)}>Settlement conditional on Development Approval (DA)</Check>
                <Check checked={!!data.optionCallOnly} onChange={v => update('optionCallOnly', v)}>Call only (no put) — developer can walk away</Check>
                <Flag>Duty is assessed at exercise, not on the option — settlement date drives when duty is payable.</Flag>
              </>)}
              {dealType === 'rebate' && (
                <FieldRow label="Vendor rebate" note="Reduces effective land cost"><NumberInput value={data.rebateAmount ?? 0} onChange={v => update('rebateAmount', v)} prefix="$" step={50000} /></FieldRow>
              )}
              {dealType === 'inkind' && (
                <Flag info>Cash price is zeroed — enter the delivered product in the In-Kind Consideration card. In-kind consideration is treated as a construction cost (no debt, finance or holding cost), mirroring the Werribee &amp; Geelong models.</Flag>
              )}
              {dealType === 'jv' && (<>
                <FieldRow label="Land value credited to JV"><NumberInput value={data.jvLandValue ?? 0} onChange={v => update('jvLandValue', v)} prefix="$" step={100000} /></FieldRow>
                <FieldRow label="Vendor profit share" note="Of net development profit"><PctInput value={data.jvSharePct ?? 0} onChange={v => update('jvSharePct', v)} /></FieldRow>
                <FieldRow label="Preferred return to vendor"><PctInput value={data.jvPreferredReturn ?? 0} onChange={v => update('jvPreferredReturn', v)} /></FieldRow>
              </>)}
            </Card>

            <Card title="Settlement Adjustments" hint="Apportioned at settlement" isNew>
              <FieldRow label="Council rates / land tax adj."><NumberInput value={data.adjRates ?? 0} onChange={v => update('adjRates', v)} prefix="$" step={1000} /></FieldRow>
              <FieldRow label="Water / owners corp adj."><NumberInput value={data.adjWater ?? 0} onChange={v => update('adjWater', v)} prefix="$" step={1000} /></FieldRow>
              <FieldRow label="Legal & due diligence" note="Excluded from margin scheme base"><NumberInput value={data.adjLegal ?? 0} onChange={v => update('adjLegal', v)} prefix="$" step={1000} /></FieldRow>
            </Card>

            {/* Acquisition costs — agent fee/commission, legals, accounting, DD.
                Each fixed $ or % of purchase price, with a delivery phase. */}
            <Card title="Acquisition Costs" hint="% of purchase price or fixed · into feasibility" isNew>
              {acqCosts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 74px 1fr 1.1fr 22px', gap: 8, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#AAA', paddingBottom: 8, borderBottom: '1px solid #E8E5E0' }}>
                  <span>Item</span><span>Basis</span><span>Rate / $</span><span>Phase</span><span />
                </div>
              )}
              {acqCosts.map(c => {
                const derived = c.mode === 'pct' ? (c.pct ?? 0) * cost.price : (c.amount ?? 0)
                const setC = (patch: Partial<AcquisitionCost>) => update('acquisitionCosts', acqCosts.map(x => x.id === c.id ? { ...x, ...patch } : x))
                return (
                  <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.35fr 74px 1fr 1.1fr 22px', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F2EFEA' }}>
                    <input value={c.label} placeholder="Cost item" onChange={e => setC({ label: e.target.value })} style={cell} />
                    <select value={c.mode} onChange={e => setC({ mode: e.target.value as AcquisitionCost['mode'] })} style={{ ...cell, fontSize: 11 }}>
                      <option value="pct">% price</option>
                      <option value="fixed">$ fixed</option>
                    </select>
                    {c.mode === 'pct' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <input type="number" step={0.1} value={c.pct != null ? +(c.pct * 100).toFixed(2) : ''} placeholder="0" onChange={e => setC({ pct: (parseFloat(e.target.value) || 0) / 100 })} style={{ ...cell, textAlign: 'right', fontFamily: 'monospace' }} />
                        <span style={{ color: '#BBB', fontSize: 11 }}>%</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <span style={{ color: '#BBB', fontSize: 11 }}>$</span>
                        <input type="number" value={c.amount || ''} placeholder="0" onChange={e => setC({ amount: parseFloat(e.target.value) || 0 })} style={{ ...cell, textAlign: 'right', fontFamily: 'monospace' }} />
                      </div>
                    )}
                    <select value={c.phase ?? ''} onChange={e => setC({ phase: (e.target.value || undefined) as AcquisitionCost['phase'] })} style={{ ...cell, fontSize: 11 }}>
                      <option value="">— phase —</option>
                      {COST_PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    <button onClick={() => update('acquisitionCosts', acqCosts.filter(x => x.id !== c.id))} title="Remove"
                      style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: 14 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#B4553F')} onMouseLeave={e => (e.currentTarget.style.color = '#CCC')}>×</button>
                    {c.mode === 'pct' && derived > 0 && (
                      <div style={{ gridColumn: '3 / 5', fontSize: 10, color: '#9A7B2E', fontFamily: 'monospace', marginTop: -2 }}>= {fmt(derived)}</div>
                    )}
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 }}>
                <button onClick={() => update('acquisitionCosts', [...acqCosts, { id: pid('acq'), label: '', mode: 'pct', pct: 0, phase: 'pre-acquisition' }])}
                  style={{ background: 'none', border: '1px dashed #D0CEC9', color: '#555', padding: '7px 12px', borderRadius: 8, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  + Add acquisition cost
                </button>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#1A1A1A' }}>{fmt(cost.acquisitionCosts)}</span>
              </div>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-6">

            {/* Effective land cost summary */}
            <Card title="Effective Land Cost" hint="Flows into feasibility →" accent="gold">
              <SLine lbl="Purchase price" sub={dealType === 'inkind' ? '(in-kind)' : undefined} val={fmt(cost.price)} />
              <SLine lbl="Stamp duty" sub={dutyRate > 0 ? `(${dutyRate.toFixed(1)}%)` : undefined} val={fmt(cost.stampDuty)} />
              <SLine lbl="Foreign surcharge (FPAD)" val={fmt(cost.foreignSurcharge)} />
              <SLine lbl="Finance on terms" val={fmt(cost.financeOnTerms)} />
              <SLine lbl="Settlement adjustments" val={fmt(cost.adjustments)} />
              <SLine lbl="Acquisition costs" sub="fees · legals · DD" val={fmt(cost.acquisitionCosts)} />
              <SLine lbl="Vendor rebate" val={'−' + fmt(cost.rebate)} neg />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 16, marginTop: 4, borderTop: `1px solid ${CHROME_LINE}` }}>
                <span style={{ color: '#1A1A1A', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 12 }}>Total land cost</span>
                <span style={{ color: GOLD, fontSize: 24, fontWeight: 300, fontFamily: 'var(--font-mono)' }}>{fmt(cost.total)}</span>
              </div>
              {cost.effectivePerSqm != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6 }}>
                  <span style={{ fontSize: 10, color: '#B0ADA6' }}>Effective rate on site area</span>
                  <span style={{ fontSize: 10, color: '#B0ADA6' }}>{fmt(cost.effectivePerSqm)} / sqm</span>
                </div>
              )}
              <p style={{ color: '#B0ADA6', fontSize: 10.5, lineHeight: 1.6, marginTop: 14 }}>This single number is what the Cost Stack, Finance and Summary tabs consume. Every term above is transparent and auditable — no hidden loadings.</p>
              {cost.flags.map((f, i) => <div key={i} style={{ fontSize: 10, color: '#555', marginTop: 8, display: 'flex', gap: 6 }}><span>◆</span><span style={{ lineHeight: 1.5 }}>{f}</span></div>)}
            </Card>

            {/* Payment schedule */}
            <Card title="Payment Schedule" hint="→ Programme & Cashflow">
              {schedule.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.6fr 1fr 24px', gap: 8, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#AAA', paddingBottom: 8, borderBottom: '1px solid #E8E5E0' }}>
                  <span>Milestone</span><span>Date</span><span>%</span><span>Amount</span><span />
                </div>
              )}
              {schedule.map(p => {
                const pct = data.landCost > 0 ? Math.round((p.amount / data.landCost) * 100) : 0
                return (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.6fr 1fr 24px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F2EFEA' }}>
                    <input value={p.label} placeholder="Milestone" onChange={e => update('paymentSchedule', schedule.map(x => x.id === p.id ? { ...x, label: e.target.value } : x))} style={cell} />
                    <DateField value={p.date} onChange={v => update('paymentSchedule', schedule.map(x => x.id === p.id ? { ...x, date: v } : x))} style={cell} />
                    <span style={{ fontSize: 11, color: '#999', fontFamily: 'monospace', textAlign: 'right' }}>{pct}%</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ color: '#BBB', fontSize: 11 }}>$</span>
                      <input type="number" value={p.amount || ''} placeholder="0" onChange={e => update('paymentSchedule', schedule.map(x => x.id === p.id ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))} style={{ ...cell, textAlign: 'right', fontFamily: 'monospace' }} />
                    </div>
                    <button onClick={() => update('paymentSchedule', schedule.filter(x => x.id !== p.id))} style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: 14, textAlign: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#B4553F')} onMouseLeave={e => (e.currentTarget.style.color = '#CCC')}>×</button>
                  </div>
                )
              })}
              <button onClick={() => update('paymentSchedule', [...schedule,
                ...(schedule.length === 0
                  ? [{ id: pid('pay'), label: 'Deposit', date: '', amount: 0 }, { id: pid('pay'), label: 'Settlement balance', date: data.settlementDate || '', amount: 0 }]
                  : [{ id: pid('pay'), label: '', date: '', amount: 0 }])])}
                style={{ background: 'none', border: '1px dashed #D0CEC9', color: '#555', padding: 9, borderRadius: 8, width: '100%', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 12 }}>
                + Add payment
              </button>
              {schedule.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 13, fontSize: 12 }}>
                  <span style={{ color: '#888' }}>Scheduled vs contract</span>
                  <span style={{ color: balanced ? '#237A52' : '#B8860B', fontFamily: 'monospace' }}>{balanced ? '✓' : '⚠'} {fmt(scheduledTotal)}{balanced ? ' · balanced' : ` / ${fmt(data.landCost)}`}</span>
                </div>
              )}
            </Card>

            {/* In-kind */}
            {dealType === 'inkind' && (
              <Card title="In-Kind Vendor Consideration" hint="Optional" accent="violet">
                <FieldRow label="Label"><input className="w-full" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #C8C0D8', padding: '4px 0', outline: 'none', color: '#1A1A1A' }} placeholder="e.g. Church convention centre" value={data.inKindLabel} onChange={e => update('inKindLabel', e.target.value)} /></FieldRow>
                <FieldRow label="Delivery GFA (sqm)"><NumberInput value={data.inKindGFA} onChange={v => update('inKindGFA', v)} /></FieldRow>
                <FieldRow label="Build rate ($/sqm)"><NumberInput value={data.inKindRatePerSqm} onChange={v => update('inKindRatePerSqm', v)} prefix="$" step={100} /></FieldRow>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid #E7DEF2', marginTop: 6 }}>
                  <span style={{ color: '#888', fontSize: 12 }}>Implied in-kind cost</span>
                  <span style={{ color: '#7A4AAA', fontSize: 20, fontWeight: 300, fontFamily: 'var(--font-mono)' }}>{fmt(inKindCost)}</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Responsive: stack columns + 2-up metrics on narrow */}
      <style>{`
        @media (max-width: 780px) {
          .ls-grid { grid-template-columns: 1fr !important; }
          .ls-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .ls-deals { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}

const cell: React.CSSProperties = { background: 'transparent', border: 'none', borderBottom: '1px solid #E0DDD8', padding: '5px 0', fontSize: 12, color: '#1A1A1A', outline: 'none', width: '100%' }

function Metric({ k, v, foot, gold }: { k: string; v: string; foot?: string; gold?: boolean }) {
  return (
    <div style={{ background: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 5, boxShadow: gold ? `inset 0 0 0 1px ${CHROME}18` : undefined }}>
      <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#AAA', fontWeight: 600 }}>{k}</div>
      <div style={{ fontSize: 21, fontWeight: gold ? 500 : 300, fontFamily: 'var(--font-mono)', color: gold ? GOLD : '#1A1A1A' }}>{v}</div>
      {foot && <div style={{ fontSize: 10, color: '#B0ADA6' }}>{foot}</div>}
    </div>
  )
}

function FieldRowNew({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return <FieldRow label={label} note={note}>{children}</FieldRow>
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F2EFEA', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 'auto', accentColor: '#1A1A1A' }} />
      <span style={{ fontSize: 12, color: '#666' }}>{children}</span>
    </label>
  )
}

function SLine({ lbl, sub, val, neg }: { lbl: string; sub?: string; val: string; neg?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #EEEBE6', fontSize: 13 }}>
      <span style={{ color: '#888' }}>{lbl} {sub && <span style={{ fontSize: 10, color: '#B0ADA6' }}>{sub}</span>}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', color: neg ? '#237A52' : '#1A1A1A' }}>{val}</span>
    </div>
  )
}
