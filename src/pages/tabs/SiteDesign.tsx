import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, Button, Card } from '../../components/ui'
import ProjectMap from '../../components/ProjectMap'
import type { SiteDesign } from '../../db/schema'

interface Props { projectId: string }

export default function SiteDesignTab({ projectId }: Props) {
  const { getSiteDesign, saveSiteDesign, projects } = useStore()
  const project = projects.find(p => p.id === projectId)
  const [data, setData] = useState<SiteDesign>(getSiteDesign(projectId))
  const [pasteText, setPasteText] = useState('')
  const [showParser, setShowParser] = useState(false)
  const [dirty, setDirty] = useState(false)
  const undoRef = useRef<SiteDesign | null>(null)

  useEffect(() => { setData(getSiteDesign(projectId)); setDirty(false); undoRef.current = null }, [projectId])

  function update(field: keyof SiteDesign, value: number | string) {
    if (!undoRef.current) undoRef.current = structuredClone(data)
    setData(d => ({ ...d, [field]: value }))
    setDirty(true)
  }

  function handleSave() {
    saveSiteDesign(data)
    setDirty(false)
    undoRef.current = null
  }

  function handleUndo() {
    if (undoRef.current) { setData(undoRef.current); undoRef.current = null; setDirty(false) }
  }

  // Reconciliation checks
  const nsaGFAEff = data.resiGFA > 0 ? data.resiNSA / data.resiGFA : 0
  const nsaGFAFlag = nsaGFAEff > 0 && (nsaGFAEff < 0.78 || nsaGFAEff > 0.87)
  const totalGBA = data.resiGBA + data.childcareGFA + data.churchGFA
    + (data.commercialGFA || 0) + (data.retailGFA || 0) + (data.communalGFA || 0) + data.otherGFA

  // PDF text parser
  function parsePaste() {
    const lines = pasteText.split('\n')
    let resiNSA = 0, resiGFA = 0, resiGBA = 0, balcony = 0
    lines.forEach(line => {
      const nums = line.match(/[\d,]+(\.\d+)?/g)?.map(n => parseFloat(n.replace(/,/g, ''))) ?? []
      const lower = line.toLowerCase()
      if (lower.includes('total nsa') || lower.includes('net sellable')) resiNSA = nums[0] ?? resiNSA
      if (lower.includes('total gfa') || lower.includes('gross floor')) resiGFA = nums[0] ?? resiGFA
      if (lower.includes('total gba') || lower.includes('gross build')) resiGBA = nums[0] ?? resiGBA
      if (lower.includes('balcony') || lower.includes('terrace')) balcony = nums[0] ?? balcony
    })
    if (resiNSA || resiGFA || resiGBA) {
      setData(d => ({ ...d, resiNSA: resiNSA || d.resiNSA, resiGFA: resiGFA || d.resiGFA, resiGBA: resiGBA || d.resiGBA, balcony: balcony || d.balcony }))
      setDirty(true)
      setShowParser(false)
      setPasteText('')
    }
  }

  return (
    <div className="flex flex-col">
      <style>{`
        .sd-panel label { color: #3A3A3A !important; }
        .sd-panel .field-row-mobile label { color: #3A3A3A !important; }
        .sd-panel input[type=number] { color: #1A1A1A !important; font-weight: 700; }
      `}</style>

      <div className="relative flex flex-col md:flex-row">

      {/* ── Left: data panels ── */}
      <div className="sd-panel p-4 md:p-6 md:w-1/2 flex-shrink-0">
      <div className="flex items-center justify-between mb-6">
        <SectionHeading sub="GBA, GFA, NSA and ancillary areas from architect's schedule">Site &amp; Design</SectionHeading>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowParser(!showParser)}>Paste Schedule</Button>
          {undoRef.current && <Button size="sm" variant="ghost" onClick={handleUndo}>Undo</Button>}
          {dirty && <Button size="sm" onClick={handleSave}>Save</Button>}
        </div>
      </div>

      {showParser && (
        <div className="mb-6 bg-white border border-[#D0CEC9] p-4">
          <p style={{ color: '#555', fontSize: 11, marginBottom: 8, letterSpacing: '0.04em' }}>Paste extracted text from an architect's area schedule PDF. The parser will auto-detect NSA, GFA, GBA, and balcony totals.</p>
          <textarea
            className="w-full h-32 text-xs font-mono text-[#1A1A1A]"
            style={{ background: '#F5F3F0', border: '1px solid #D0CEC9', borderRadius: 0, padding: '8px' }}
            placeholder="Paste schedule text here..."
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={parsePaste}>Parse &amp; Import</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowParser(false); setPasteText('') }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="border border-[#E8E5E0] bg-white p-4 mb-4">
        <h3 style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#2E2E2E', marginBottom: 12, fontWeight: 700 }}>Residential Areas</h3>
        <FieldRow label="Resi NSA (sqm)">
          <NumberInput value={data.resiNSA} onChange={v => update('resiNSA', v)} />
        </FieldRow>
        <FieldRow label="Resi GFA (sqm)">
          <NumberInput value={data.resiGFA} onChange={v => update('resiGFA', v)} />
        </FieldRow>
        <FieldRow label="Resi GBA (sqm)" note="Used for cost stack">
          <NumberInput value={data.resiGBA} onChange={v => update('resiGBA', v)} />
        </FieldRow>
        <FieldRow label="Balcony (sqm)">
          <NumberInput value={data.balcony} onChange={v => update('balcony', v)} />
        </FieldRow>
        <FieldRow label="Basement (sqm)">
          <NumberInput value={data.basementTotal} onChange={v => update('basementTotal', v)} />
        </FieldRow>
        <FieldRow label="Car spaces">
          <NumberInput value={data.carSpaces} onChange={v => update('carSpaces', v)} />
        </FieldRow>
      </div>

      <div className="border border-[#E8E5E0] bg-white p-4 mb-4">
        <h3 style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#2E2E2E', marginBottom: 12, fontWeight: 700 }}>Ancillary Areas</h3>
        <FieldRow label="Childcare GFA (sqm)">
          <NumberInput value={data.childcareGFA} onChange={v => update('childcareGFA', v)} />
        </FieldRow>
        <FieldRow label="Church / Vendor GFA (sqm)">
          <NumberInput value={data.churchGFA} onChange={v => update('churchGFA', v)} />
        </FieldRow>
        <FieldRow label="Church / Vendor NSA (sqm)">
          <NumberInput value={data.churchNSA} onChange={v => update('churchNSA', v)} />
        </FieldRow>
        <FieldRow label="Commercial GFA (sqm)">
          <NumberInput value={data.commercialGFA || 0} onChange={v => update('commercialGFA', v)} />
        </FieldRow>
        <FieldRow label="Commercial NSA (sqm)">
          <NumberInput value={data.commercialNSA || 0} onChange={v => update('commercialNSA', v)} />
        </FieldRow>
        <FieldRow label="Retail GFA (sqm)">
          <NumberInput value={data.retailGFA || 0} onChange={v => update('retailGFA', v)} />
        </FieldRow>
        <FieldRow label="Retail NSA (sqm)">
          <NumberInput value={data.retailNSA || 0} onChange={v => update('retailNSA', v)} />
        </FieldRow>
        <FieldRow label="Communal areas GFA (sqm)">
          <NumberInput value={data.communalGFA || 0} onChange={v => update('communalGFA', v)} />
        </FieldRow>
        <FieldRow label="Other GFA (sqm)">
          <NumberInput value={data.otherGFA} onChange={v => update('otherGFA', v)} />
        </FieldRow>
      </div>

      {/* Reconciliation panel */}
      {data.resiNSA > 0 && (
        <div className="border border-[#E8E5E0] bg-white p-4 mb-4">
          <h3 style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#2E2E2E', marginBottom: 12, fontWeight: 700 }}>Reconciliation Check</h3>
          <ReconciliationRow
            label="NSA/GFA Efficiency"
            value={`${(nsaGFAEff * 100).toFixed(1)}%`}
            flag={nsaGFAFlag}
            note="Typical 78–87%"
          />
          <ReconciliationRow
            label="Total ancillary GBA"
            value={`${totalGBA.toLocaleString()} sqm`}
            flag={false}
            note={`Resi ${data.resiGBA.toLocaleString()} + Other ${(totalGBA - data.resiGBA).toLocaleString()}`}
          />
        </div>
      )}

      {/* Notes */}
      <div style={{ borderTop: '2px solid transparent', borderImage: 'linear-gradient(to right, #2A2A2A, #B8B8B8 45%, #2A2A2A) 1', background: '#fff', padding: '20px 20px 20px', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: '#2E2E2E', fontWeight: 700 }}>Notes</span>
          <div style={{ flex: 1, height: 1, background: '#E8E5E0' }} />
        </div>
        <textarea
          style={{
            width: '100%', minHeight: 80, background: 'transparent', border: 'none',
            borderBottom: '1px solid #E0DDD8', borderRadius: 0, padding: '0 0 12px',
            resize: 'vertical', color: '#1A1A1A', fontSize: 13,
            fontFamily: "'Georgia','Times New Roman',serif", lineHeight: 1.8,
            letterSpacing: '0.02em', outline: 'none',
          }}
          placeholder="Site notes, council requirements, design caveats…"
          value={data.notes}
          onChange={e => update('notes', e.target.value)}
        />
      </div>
      </div>

      {/* Gold divider */}
      <div className="hidden md:block flex-shrink-0" style={{ width: 1, background: 'linear-gradient(to bottom, transparent, #2A2A2A 18%, #B8B8B8 50%, #2A2A2A 82%, transparent)', margin: '24px 0' }} />

      {/* ── Right: map ── */}
      <div className="hidden md:block md:w-1/2" style={{ minHeight: 500, position: 'relative' }}>
        <ProjectMap address={project?.address ?? ''} pinLabel={project?.mapPin} />
      </div>

      </div>

      {/* Map on mobile — full width below panels */}
      <div className="md:hidden" style={{ height: 300 }}>
        <ProjectMap address={project?.address ?? ''} pinLabel={project?.mapPin} />
      </div>
    </div>
  )
}

function ReconciliationRow({ label, value, flag, note }: { label: string; value: string; flag: boolean; note: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#F0EDE8] last:border-0">
      <span className="text-xs text-[#666]">{label}</span>
      <span className={`text-sm font-heading font-bold ${flag ? 'text-[#B8963C]' : 'text-[#2A7A4F]'}`}>{value}</span>
      <span className={`text-xs ${flag ? 'text-[#B8963C]' : 'text-[#888]'}`}>{flag ? '⚠ ' : '✓ '}{note}</span>
    </div>
  )
}
