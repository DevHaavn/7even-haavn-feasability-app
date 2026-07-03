import SiteLinks from '../../components/SiteLinks'
import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, PctInput, Button } from '../../components/ui'
import type { LandTerms } from '../../db/schema'

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

  return (
    <div className="flex flex-col">

      <div className="relative p-4 md:p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <SectionHeading sub="Land acquisition cost and any in-kind vendor consideration">Land & Vendor Terms</SectionHeading>
        {undoRef.current && <Button size="sm" variant="ghost" onClick={handleUndo}>Undo</Button>}
        {dirty && <Button size="sm" onClick={() => { saveLandTerms(data); undoRef.current = null; setDirty(false) }}>Save</Button>}
      </div>

      <div className="border border-[#E8E5E0] bg-white p-4 mb-4">
        <h3 className="text-[9px] tracking-[0.2em] uppercase text-[#888] mb-3">Land Acquisition</h3>
        <FieldRow label="Land cost" note={gstEnabled ? 'Inclusive of GST' : undefined}>
          <NumberInput value={data.landCost} onChange={v => update('landCost', v)} prefix="$" step={10000} />
        </FieldRow>
        {gstEnabled && data.landCost > 0 && (
          <p className="text-[10px] text-[#888] mt-1 leading-relaxed">
            GST input credit (1/11): <span className="font-mono font-semibold text-[#2A7A4F]">${Math.round(data.landCost / 11).toLocaleString()}</span> — the deal carries <span className="font-mono font-semibold text-[#1A1A1A]">${Math.round(data.landCost - data.landCost / 11).toLocaleString()}</span> ex GST.
          </p>
        )}
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

      {data.isInKind && (
        <div className="border border-[#C8C0D8] bg-[#F8F5FC] p-4 mb-4">
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
      </div>
      {/* Render strip */}
      <div style={{ height: 320, backgroundImage: 'url(/renders/haavn-render3.png)', backgroundSize: 'cover', backgroundPosition: 'center 65%', width: '100%', flexShrink: 0 }} />
      <SiteLinks />
    </div>
  )
}
