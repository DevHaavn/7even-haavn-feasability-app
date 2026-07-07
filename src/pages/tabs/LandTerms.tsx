import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, PctInput, Button } from '../../components/ui'
import type { LandTerms } from '../../db/schema'
import { ALL_STATES, calculateStampDuty, type AuState, type PropertyType } from '../../engine/stampDuty'

const STATE_LABELS: Record<AuState, string> = {
  VIC: 'Victoria', NSW: 'New South Wales', QLD: 'Queensland', WA: 'Western Australia',
  SA: 'South Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory',
}

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  vacant_land: 'Vacant land',
  house_and_land: 'House and land (residential)',
  commercial: 'Commercial / industrial',
}

interface Props { projectId: string }

export default function LandTermsTab({ projectId }: Props) {
  const { getLandTerms, saveLandTerms, getCostStack } = useStore()
  const gstEnabled = getCostStack(projectId).gstEnabled
  const [data, setData] = useState<LandTerms>(getLandTerms(projectId))
  const [dirty, setDirty] = useState(false)
  const undoRef = useRef<LandTerms | null>(null)

  useEffect(() => { setData(getLandTerms(projectId)); setDirty(false); undoRef.current = null }, [projectId])

  function update<K extends keyof LandTerms>(field: K, value: LandTerms[K]) {
    if (!undoRef.current) undoRef.current = structuredClone(data)
    setData(d => ({ ...d, [field]: value }))
    setDirty(true)
  }

  function handleUndo() {
    if (undoRef.current) { setData(undoRef.current); undoRef.current = null; setDirty(false) }
  }

  const inKindCost = data.inKindGFA * data.inKindRatePerSqm

  // Live duty estimate on the entered (unsaved) values
  const duty = data.applyStampDuty && data.landCost > 0
    ? calculateStampDuty(data.state, data.landCost, data.propertyType, { foreignBuyer: data.foreignBuyer })
    : null
  const landHasGst = gstEnabled && (data.landGst === 'inc' || data.landGst === 'full')
  // 'inc' — GST embedded in the price (claim 1/11). 'full' — GST added at 10% on
  // top of the price and reclaimed (net neutral, shown gross then credited).
  const grossLand = data.landGst === 'full' ? data.landCost * 1.10 : data.landCost
  const gstCredit = !gstEnabled ? 0 : data.landGst === 'inc' ? data.landCost / 11 : data.landGst === 'full' ? data.landCost * 0.10 : 0
  const acquisitionTotal = grossLand - gstCredit + (duty?.total ?? 0)

  return (
    <div className="flex flex-col">

      <div className="relative p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <SectionHeading sub="Land acquisition cost and any in-kind vendor consideration">Land & Vendor Terms</SectionHeading>
        {undoRef.current && <Button size="sm" variant="ghost" onClick={handleUndo}>Undo</Button>}
        {dirty && <Button size="sm" onClick={() => { saveLandTerms(data); undoRef.current = null; setDirty(false) }}>Save</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="border border-[#E8E5E0] bg-white p-4">
        <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-3">Land Acquisition</h3>
        <FieldRow label="Purchase price" note={landHasGst ? 'Contract price, inclusive of GST' : 'Contract price'}>
          <NumberInput value={data.landCost} onChange={v => update('landCost', v)} prefix="$" step={10000} />
        </FieldRow>
        <FieldRow label="GST on land" note="Not every land deal carries GST — e.g. going concern or input-taxed residential">
          <select value={data.landGst} onChange={e => update('landGst', e.target.value as 'inc' | 'none' | 'full')}>
            <option value="inc">GST in price — claim 1/11 credit</option>
            <option value="full">Full GST applicable — +10% on price, reclaimed</option>
            <option value="none">No GST — going concern / input-taxed</option>
          </select>
        </FieldRow>
        <FieldRow label="State / territory" note="Where the land is located">
          <select value={data.state} onChange={e => update('state', e.target.value as AuState)}>
            {ALL_STATES.map(s => <option key={s} value={s}>{s} — {STATE_LABELS[s]}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Property type">
          <select value={data.propertyType} onChange={e => update('propertyType', e.target.value as PropertyType)}>
            {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map(pt => (
              <option key={pt} value={pt}>{PROPERTY_TYPE_LABELS[pt]}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Settlement date" note="Stamp duty is due at settlement">
          <input type="date" value={data.settlementDate} onChange={e => update('settlementDate', e.target.value)} />
        </FieldRow>
        <div className="flex items-center gap-2 py-2.5">
          <input
            type="checkbox"
            id="foreign-buyer"
            checked={data.foreignBuyer}
            onChange={e => update('foreignBuyer', e.target.checked)}
            style={{ width: 'auto', accentColor: '#1A1A1A' }}
          />
          <label htmlFor="foreign-buyer" className="text-[11px] text-[#555] tracking-wide cursor-pointer">
            Foreign purchaser surcharge applies (foreign-owned entity/trust)
          </label>
        </div>
        <div className="flex items-center gap-2 py-2.5">
          <input
            type="checkbox"
            id="apply-duty"
            checked={data.applyStampDuty}
            onChange={e => update('applyStampDuty', e.target.checked)}
            style={{ width: 'auto', accentColor: '#1A1A1A' }}
          />
          <label htmlFor="apply-duty" className="text-[11px] text-[#555] tracking-wide cursor-pointer">
            Add stamp duty to the land cost in feasibility
          </label>
        </div>
        <div className="flex items-center gap-2 py-2.5">
          <input
            type="checkbox"
            id="inkind"
            checked={data.isInKind}
            onChange={e => update('isInKind', e.target.checked)}
            className="w-4 h-4"
            style={{ width: 'auto', accentColor: '#7A4AAA' }}
          />
          <label htmlFor="inkind" className="text-[11px] text-[#555] tracking-wide cursor-pointer">
            Land is provided in-kind (e.g. church land swap — $0 cash cost)
          </label>
        </div>
      </div>

      {/* ── Acquisition breakdown — duty + GST on the contract price ── */}
      {data.landCost > 0 && (
        <div className="border border-[#E8E5E0] bg-white p-4">
          <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-3">
            Land Acquisition Breakdown{duty ? ` — ${data.state} ${PROPERTY_TYPE_LABELS[data.propertyType]}` : ''}
          </h3>
          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#888]">Purchase price{landHasGst ? ' (inc GST)' : ' (no GST)'}</span>
              <span className="font-mono text-[#1A1A1A]">${Math.round(data.landCost).toLocaleString()}</span>
            </div>
            {gstCredit > 0 && (
              <div className="flex justify-between">
                <span className="text-[#888]">Less GST input credit (1/11)</span>
                <span className="font-mono text-[#2A7A4F]">−${Math.round(gstCredit).toLocaleString()}</span>
              </div>
            )}
            {duty && (
              <div className="flex justify-between">
                <span className="text-[#888]">Stamp duty ({data.state}, general rate)</span>
                <span className="font-mono text-[#9B2335]">+${Math.round(duty.duty).toLocaleString()}</span>
              </div>
            )}
            {duty && duty.foreignSurcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-[#888]">Foreign purchaser surcharge</span>
                <span className="font-mono text-[#9B2335]">+${Math.round(duty.foreignSurcharge).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[#E8E5E0]">
              <span className="font-semibold text-[#1A1A1A] text-[10px] tracking-widest uppercase">Land cost in feasibility</span>
              <span className="font-mono font-bold text-[#B8963C]">${Math.round(acquisitionTotal).toLocaleString()}</span>
            </div>
            {duty && data.settlementDate && (
              <p className="text-[10px] text-[#888] pt-1">
                Duty of <span className="font-mono font-semibold text-[#9B2335]">${Math.round(duty.total).toLocaleString()}</span> is due at settlement on <span className="font-semibold text-[#1A1A1A]">{new Date(data.settlementDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>.
              </p>
            )}
            {duty && duty.notes.length > 0 && (
              <ul className="pt-1 space-y-1">
                {duty.notes.map((n, i) => (
                  <li key={i} className="text-[10px] text-[#AAA] leading-relaxed">• {n}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {data.isInKind && (
        <div className="border border-[#C8C0D8] bg-[#F8F5FC] p-4">
          <h3 className="text-[#7A4AAA] text-[9px] tracking-[0.18em] uppercase font-semibold mb-3">In-Kind Vendor Consideration</h3>
          <p className="text-[#888] text-xs mb-3">
            Treated as a construction cost with no debt, finance, or holding cost — as modelled in Werribee and Geelong.
          </p>
          <FieldRow label="Label">
            <input
              className="w-full text-[#1A1A1A]"
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #C8C0D8', borderRadius: 0, padding: '4px 0', outline: 'none' }}
              placeholder="e.g. Church convention centre"
              value={data.inKindLabel}
              onChange={e => update('inKindLabel', e.target.value)}
            />
          </FieldRow>
          <FieldRow label="Delivery GFA (sqm)">
            <NumberInput value={data.inKindGFA} onChange={v => update('inKindGFA', v)} />
          </FieldRow>
          <FieldRow label="Build rate ($/sqm)">
            <NumberInput value={data.inKindRatePerSqm} onChange={v => update('inKindRatePerSqm', v)} prefix="$" step={100} />
          </FieldRow>
          <FieldRow label="Note">
            <input
              className="w-full text-[#1A1A1A]"
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #C8C0D8', borderRadius: 0, padding: '4px 0', outline: 'none' }}
              value={data.inKindNote}
              onChange={e => update('inKindNote', e.target.value)}
            />
          </FieldRow>
          {inKindCost > 0 && (
            <div className="mt-3 pt-3 border-t border-[#C8C0D8] flex justify-between">
              <span className="text-[#888] text-xs">Implied in-kind cost</span>
              <span className="text-[#7A4AAA] font-mono font-bold">${inKindCost.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
      </div>{/* /grid */}
      </div>
    </div>
  )
}
