import SiteLinks from '../../components/SiteLinks'
import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { SectionHeading, FieldRow, NumberInput, PctInput, Button } from '../../components/ui'
import { calculateCostStack } from '../../engine/costStack'
import { getCostPresets } from '../../db'
import type { CostStack, CostLineItem, DetailedCostStack } from '../../db/schema'
import { useRole } from '../../lib/role'
import { getProjectAdminSpend, projectLinkFor } from '../capital/BudgetsAdmin'

interface Props { projectId: string }

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n.toLocaleString()}`

// Live spend the admin / Xero register has tracked against this project.
// Only shows for projects linked to a budget entity (Preston, Caloundra, …).
function AdminSpendBanner({ projectId, tdc }: { projectId: string; tdc: number }) {
  if (!projectLinkFor(projectId)) return null
  const { spend, awaiting, count } = getProjectAdminSpend(projectId)
  if (count === 0 && spend === 0) return null
  const pct = tdc > 0 ? spend / tdc : 0
  const over = tdc > 0 && spend > tdc
  const warn = pct > 0.85
  const col = over ? '#9B2335' : warn ? '#B8860B' : '#2A7A4F'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 16px', background: '#F5F3F0', borderBottom: '2px solid #E0DDD8' }}>
      <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>Admin · Xero tracked spend</span>
      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#1A1A1A', fontWeight: 700 }}>${spend.toLocaleString()}</span>
      <span style={{ fontSize: 11, color: '#999' }}>of {fmt(tdc)} TDC · {(pct * 100).toFixed(0)}%</span>
      {awaiting > 0 && <span style={{ fontSize: 10, color: '#B8860B' }}>${awaiting.toLocaleString()} awaiting</span>}
      <span style={{ marginLeft: 'auto', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: col }}>
        {over ? '⚠ Over budget' : warn ? '● Approaching budget' : '● On budget'}
      </span>
      <div style={{ flexBasis: '100%', height: 5, borderRadius: 3, background: '#E0DDD8', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(2, Math.min(100, pct * 100))}%`, height: '100%', background: col }} />
      </div>
    </div>
  )
}

// ── Inner sub-tab bar ─────────────────────────────────────────────────────────
const INNER_TABS = [
  { id: 'summary',     label: 'Summary' },
  { id: 'hard',        label: 'Hard Costs' },
  { id: 'consultants', label: 'Consultants' },
  { id: 'statutory',   label: 'Statutory & Finance' },
  { id: 'marketing',   label: 'Marketing & Other' },
]

function InnerTabBar({ active, onChange, tabs = INNER_TABS }: { active: string; onChange: (id: string) => void; tabs?: typeof INNER_TABS }) {
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid #E0DDD8', background: '#F5F3F0', flexShrink: 0, overflowX: 'auto' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 600,
            color: active === t.id ? '#1A1A1A' : '#999',
            borderBottom: active === t.id ? '2px solid #C4973A' : '2px solid transparent',
            marginBottom: -2, whiteSpace: 'nowrap', transition: 'color 0.15s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Line-item table ───────────────────────────────────────────────────────────
function LineItemTable({ items, onChange }: { items: CostLineItem[]; onChange: (items: CostLineItem[]) => void }) {
  function update(id: string, field: keyof CostLineItem, value: string | number) {
    onChange(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }
  function remove(id: string) { onChange(items.filter(item => item.id !== id)) }
  function add() {
    onChange([...items, { id: Math.random().toString(36).slice(2) + Date.now(), label: '', amount: 0, notes: '' }])
  }
  const total = items.reduce((s, i) => s + (i.amount || 0), 0)

  return (
    <div style={{ background: '#fff', border: '1px solid #E8E5E0' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 200px 32px', padding: '8px 14px', background: '#F7F5F2', borderBottom: '1px solid #E0DDD8' }}>
        {['Item Description', 'Budget ($)', 'Notes / Consultant', ''].map((h, i) => (
          <span key={i} style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', fontWeight: 600 }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      {items.map((item, idx) => (
        <div key={item.id} style={{
          display: 'grid', gridTemplateColumns: '1fr 160px 200px 32px',
          padding: '7px 14px', borderBottom: '1px solid #F5F3F0',
          background: idx % 2 === 0 ? '#fff' : '#FDFCFB', alignItems: 'center',
        }}>
          <input
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid transparent', padding: '3px 8px 3px 0', fontSize: 12, color: '#1A1A1A', outline: 'none', width: '100%' }}
            value={item.label}
            placeholder="Item description"
            onChange={e => update(item.id, 'label', e.target.value)}
            onFocus={e => (e.currentTarget.style.borderBottomColor = '#C4973A')}
            onBlur={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
          />
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: 16 }}>
            <span style={{ color: '#BBB', fontSize: 11, marginRight: 3, flexShrink: 0 }}>$</span>
            <input
              type="number" min={0}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid transparent', padding: '3px 0', fontSize: 12, fontFamily: 'monospace', color: '#1A1A1A', outline: 'none', width: '100%' }}
              value={item.amount || ''}
              placeholder="0"
              onChange={e => update(item.id, 'amount', parseFloat(e.target.value) || 0)}
              onFocus={e => (e.currentTarget.style.borderBottomColor = '#C4973A')}
              onBlur={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
            />
          </div>
          <input
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid transparent', padding: '3px 8px 3px 0', fontSize: 11, color: '#888', outline: 'none', width: '100%' }}
            value={item.notes}
            placeholder="Notes / firm name / ref"
            onChange={e => update(item.id, 'notes', e.target.value)}
            onFocus={e => (e.currentTarget.style.borderBottomColor = '#C4973A')}
            onBlur={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
          />
          <button
            onClick={() => remove(item.id)}
            style={{ background: 'none', border: 'none', color: '#DDD', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9B2335')}
            onMouseLeave={e => (e.currentTarget.style.color = '#DDD')}
          >×</button>
        </div>
      ))}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F7F5F2', borderTop: '1px solid #E0DDD8' }}>
        <button
          onClick={add}
          style={{ background: 'none', border: '1px solid #D0CEC9', color: '#888', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '6px 16px', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget.style.borderColor = '#C4973A'); (e.currentTarget.style.color = '#C4973A') }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = '#D0CEC9'); (e.currentTarget.style.color = '#888') }}
        >+ Add Row</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, color: '#AAA', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Section Total</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#C4973A' }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Grand total bar ───────────────────────────────────────────────────────────
function GstBadge({ gstEnabled }: { gstEnabled: boolean }) {
  // James/CFO: every cost table must state whether amounts are incl/excl GST.
  const label = gstEnabled ? 'AMOUNTS GST-INCLUSIVE · input tax credits claimed' : 'AMOUNTS EX-GST'
  const col = gstEnabled ? '#C4973A' : '#3DAA6A'
  return (
    <span title={gstEnabled ? 'Line amounts are entered GST-inclusive; the ex-GST cost carries into TDC (ITCs reclaimed).' : 'Line amounts exclude GST.'}
      style={{ fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: col, border: `1px solid ${col}55`, borderRadius: 4, padding: '3px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function GrandTotalBar({ detailed, gstEnabled }: { detailed: DetailedCostStack; gstEnabled: boolean }) {
  const sections = [
    { label: 'Hard Costs', items: detailed.hardCosts },
    { label: 'Consultants', items: detailed.consultants },
    { label: 'Statutory & Finance', items: detailed.statutory },
    { label: 'Marketing & Other', items: detailed.marketing },
  ]
  const totals = sections.map(s => ({ ...s, total: s.items.reduce((sum, i) => sum + (i.amount || 0), 0) }))
  const grand = totals.reduce((s, t) => s + t.total, 0)

  return (
    <div style={{ background: '#0A0A0A', padding: '14px 24px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#555', flexShrink: 0 }}>Detailed Total</span>
        <GstBadge gstEnabled={gstEnabled} />
        {totals.map(t => (
          <div key={t.label} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em' }}>{t.label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: t.total > 0 ? '#C4973A' : '#333' }}>{fmt(t.total)}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888' }}>Grand Total</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 20, color: grand > 0 ? '#C4973A' : '#444' }}>{fmt(grand)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Detail tab layout ─────────────────────────────────────────────────────────
const DETAIL_META: Record<string, { title: string; sub: string; key: keyof Omit<DetailedCostStack, 'projectId'>; hint: string }> = {
  hard: {
    title: 'Hard Costs — Construction',
    sub: 'Trade-by-trade construction budget. Enter actual quoted or estimated amounts per line item.',
    key: 'hardCosts',
    hint: 'Typical range: 60–70% of total development cost. Includes structure, services, fitout, prelims and contingency.',
  },
  consultants: {
    title: 'Consultant & Professional Fees',
    sub: 'All design, engineering and advisory consultant fees across the project lifecycle.',
    key: 'consultants',
    hint: 'Typical range: 3–8% of construction cost. Include all stages — concept, DD, documentation and CA.',
  },
  statutory: {
    title: 'Statutory, Government & Finance Costs',
    sub: 'Planning and building fees, government levies, headworks contributions and all finance costs.',
    key: 'statutory',
    hint: 'Statutory levies vary by council. Finance costs typically 6–10% of construction cost depending on loan term.',
  },
  marketing: {
    title: 'Marketing, Sales & Other Costs',
    sub: 'Sales agent fees, marketing spend, legal, insurance, developer management and defects reserve.',
    key: 'marketing',
    hint: 'BTS projects: 2–4% of gross revenue for sales/marketing. BTR projects: lower spend, no agent commission.',
  },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CostStackTab({ projectId }: Props) {
  const store = useStore()
  const role = useRole()
  const visibleInnerTabs = role === 'external' ? INNER_TABS.filter(t => t.id !== 'summary') : INNER_TABS
  const [innerTab, setInnerTab] = useState(role === 'external' ? 'hard' : 'summary')
  const [data, setData] = useState<CostStack>(store.getCostStack(projectId))
  const [detailed, setDetailed] = useState<DetailedCostStack>(store.getDetailedCostStack(projectId))
  const [dirty, setDirty] = useState(false)
  const [detailedDirty, setDetailedDirty] = useState(false)
  const undoRef = useRef<CostStack | null>(null)
  const undoDetailedRef = useRef<DetailedCostStack | null>(null)
  const presets = getCostPresets()

  const land = store.getLandTerms(projectId)
  const site = store.getSiteDesign(projectId)

  useEffect(() => {
    setData(store.getCostStack(projectId))
    setDetailed(store.getDetailedCostStack(projectId))
    setDirty(false); setDetailedDirty(false)
    undoRef.current = null; undoDetailedRef.current = null
  }, [projectId])

  function update<K extends keyof CostStack>(field: K, value: CostStack[K]) {
    if (!undoRef.current) undoRef.current = structuredClone(data)
    setData(d => ({ ...d, [field]: value })); setDirty(true)
  }
  function updateSection(key: keyof Omit<DetailedCostStack, 'projectId'>, items: CostLineItem[]) {
    if (!undoDetailedRef.current) undoDetailedRef.current = structuredClone(detailed)
    setDetailed(d => ({ ...d, [key]: items })); setDetailedDirty(true)
  }
  function saveDetailed() { store.saveDetailedCostStack(detailed); setDetailedDirty(false); undoDetailedRef.current = null }

  const inKindLineItem = land.isInKind && land.inKindGFA > 0 ? {
    label: land.inKindLabel || 'In-kind delivery',
    gfa: land.inKindGFA, ratePerSqm: land.inKindRatePerSqm, note: land.inKindNote,
  } : undefined

  const result = calculateCostStack({ ...data, gba: site.resiGBA, inKindLineItem })

  const summaryRows = [
    { label: 'Construction', value: result.construction },
    { label: `Contingency (${(data.contingencyPct * 100).toFixed(0)}%)`, value: result.contingency },
    { label: `Prelims (${(data.prelimsPct * 100).toFixed(0)}%)`, value: result.prelims },
    { label: `Professional fees (${(data.professionalFeesPct * 100).toFixed(0)}%)`, value: result.professionalFees },
    { label: 'Statutory & council', value: data.statutoryFixed },
    { label: `Finance (${(data.financePct * 100).toFixed(0)}%)`, value: result.finance },
    { label: 'Project management', value: data.projectManagementFixed },
    { label: 'Marketing', value: data.marketingFixed },
    { label: 'BTR amenity fitout', value: data.amenityFitoutFixed },
  ]

  // Active detail section
  const meta = innerTab !== 'summary' ? DETAIL_META[innerTab] : null

  return (
    <div className="flex flex-col" style={{ minHeight: 0 }}>

      <InnerTabBar active={innerTab} onChange={setInnerTab} tabs={visibleInnerTabs} />

      <AdminSpendBanner projectId={projectId} tdc={result.totalDevelopmentCost} />

      {innerTab !== 'summary' && <GrandTotalBar detailed={detailed} gstEnabled={data.gstEnabled} />}

      {/* ── SUMMARY TAB ── */}
      {innerTab === 'summary' && (
        <div className="relative p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8 overflow-auto flex-1">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center justify-between mb-6">
              <SectionHeading sub="Construction rate applied to GBA plus all soft costs">Cost Stack</SectionHeading>
              {undoRef.current && <Button size="sm" variant="ghost" onClick={() => { if (undoRef.current) { setData(undoRef.current); undoRef.current = null; setDirty(false) } }}>Undo</Button>}
              {dirty && <Button size="sm" onClick={() => { store.saveCostStack(data); undoRef.current = null; setDirty(false) }}>Save</Button>}
            </div>

            <div className="mb-5">
              <p className="text-[#888] text-[9px] tracking-[0.18em] uppercase mb-2">Build Rate Preset</p>
              <div style={{ display: 'inline-flex', border: '1px solid #D0CEC9' }}>
                {presets.map((p, i) => (
                  <button key={p.id}
                    onClick={() => update('buildRatePerSqm', p.buildRatePerSqm)}
                    className={`px-4 py-2 text-[10px] tracking-[0.1em] uppercase cursor-pointer transition-colors ${data.buildRatePerSqm === p.buildRatePerSqm ? 'bg-[#1A1A1A] text-white font-semibold' : 'text-[#888] hover:text-[#1A1A1A]'} ${i > 0 ? 'border-l border-[#D0CEC9]' : ''}`}
                    style={{ borderRadius: 0 }}
                  >{p.name}</button>
                ))}
              </div>
            </div>

            <InnerSection label="Construction">
              <FieldRow label="GBA (sqm)" note="From Site & Design">
                <span className="text-[#1A1A1A] font-mono text-sm">{site.resiGBA.toLocaleString()}</span>
              </FieldRow>
              <FieldRow label="Build rate ($/sqm)">
                <NumberInput value={data.buildRatePerSqm} onChange={v => update('buildRatePerSqm', v)} prefix="$" step={50} />
              </FieldRow>
            </InnerSection>

            <InnerSection label="Soft Costs — % of construction">
              <FieldRow label="Contingency"><PctInput value={data.contingencyPct} onChange={v => update('contingencyPct', v)} /></FieldRow>
              <FieldRow label="Prelims"><PctInput value={data.prelimsPct} onChange={v => update('prelimsPct', v)} /></FieldRow>
              <FieldRow label="Professional fees"><PctInput value={data.professionalFeesPct} onChange={v => update('professionalFeesPct', v)} /></FieldRow>
              <FieldRow label="Finance cost"><PctInput value={data.financePct} onChange={v => update('financePct', v)} /></FieldRow>
            </InnerSection>

            <InnerSection label="Fixed Costs">
              <FieldRow label="Statutory & council"><NumberInput value={data.statutoryFixed} onChange={v => update('statutoryFixed', v)} prefix="$" step={50000} /></FieldRow>
              <FieldRow label="Project management"><NumberInput value={data.projectManagementFixed} onChange={v => update('projectManagementFixed', v)} prefix="$" step={50000} /></FieldRow>
              <FieldRow label="Marketing"><NumberInput value={data.marketingFixed} onChange={v => update('marketingFixed', v)} prefix="$" step={50000} /></FieldRow>
              <FieldRow label="BTR amenity fitout"><NumberInput value={data.amenityFitoutFixed} onChange={v => update('amenityFitoutFixed', v)} prefix="$" step={50000} /></FieldRow>
            </InnerSection>

            <InnerSection label="GST — 10%">
              <FieldRow label="Apply GST" note="Costs entered GST-inclusive; credits claimed on commercial costs & consultants. Sales GST deducted in BTS.">
                <input type="checkbox" checked={data.gstEnabled} onChange={e => update('gstEnabled', e.target.checked)} />
              </FieldRow>
              {data.gstEnabled && (
                <p className="text-[#888] text-[10px] mt-2 leading-relaxed">
                  Input credits recovered: <span className="font-mono font-semibold text-[#2A7A4F]">${Math.round(result.gstCredits).toLocaleString()}</span>.
                  Statutory charges (GST-free), finance (input-taxed) and in-kind/land carry no GST.
                </p>
              )}
            </InnerSection>

            {land.isInKind && land.inKindGFA > 0 && (
              <div className="mt-4 border border-[#C8C0D8] bg-[#F8F5FC] p-4">
                <p className="text-[9px] tracking-[0.18em] uppercase text-[#7A4AAA] mb-2">In-Kind — {land.inKindLabel}</p>
                <p className="text-[#888] text-xs mb-2">{land.inKindNote}</p>
                <div className="flex justify-between">
                  <span className="text-[10px] text-[#666]">{land.inKindGFA.toLocaleString()} sqm × ${land.inKindRatePerSqm.toLocaleString()}/sqm</span>
                  <span className="text-[#1A1A1A] font-mono font-bold text-sm">${result.inKindCost.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Cost Summary waterfall */}
          <div className="w-72 flex-shrink-0">
            <SectionHeading>Cost Summary</SectionHeading>
            <div className="border border-[#E0DDD8] bg-white">
              {summaryRows.map((r, i) => (
                <div key={i} className="flex justify-between items-center px-4 py-3 border-b border-[#F0EDE8]">
                  <span className="text-[10px] text-[#888] tracking-wide">{r.label}</span>
                  <span className="text-sm font-mono font-semibold text-[#1A1A1A]">${r.value.toLocaleString()}</span>
                </div>
              ))}
              {land.isInKind && result.inKindCost > 0 && (
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#F0EDE8] bg-[#F8F5FC]">
                  <span className="text-[10px] text-[#7A4AAA] tracking-wide">{land.inKindLabel || 'In-kind'}</span>
                  <span className="text-sm font-mono font-semibold text-[#7A4AAA]">${result.inKindCost.toLocaleString()}</span>
                </div>
              )}
              {result.gstCredits > 0 && (
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#F0EDE8] bg-[#F2F7F3]">
                  <span className="text-[10px] text-[#2A7A4F] tracking-wide">Less GST input credits (1/11)</span>
                  <span className="text-sm font-mono font-semibold text-[#2A7A4F]">−${Math.round(result.gstCredits).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-4 border-t border-[#D0CEC9] bg-[#F5F3F0]">
                <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#1A1A1A]">Total Dev Cost{result.gstCredits > 0 ? ' (ex GST)' : ''}</span>
                <span className="font-mono font-bold text-2xl text-[#B8963C]">${(result.totalDevelopmentCost / 1_000_000).toFixed(1)}M</span>
              </div>
            </div>
            {site.resiGBA > 0 && (
              <p className="mt-2 text-[#AAA] text-[10px] text-right tracking-wide">
                ${Math.round(result.totalDevelopmentCost / site.resiGBA).toLocaleString()}/sqm GBA all-in
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── DETAIL TABS (hard / consultants / statutory / marketing) ── */}
      {meta && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #E8E5E0' }}>
            <div>
              <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 4 }}>Cost Breakdown</p>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 20, letterSpacing: '0.06em', color: '#1A1A1A', margin: '0 0 6px' }}>{meta.title}</h2>
              <p style={{ color: '#AAA', fontSize: 11, margin: 0 }}>{meta.sub}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 24 }}>
              {undoDetailedRef.current && (
                <button onClick={() => { if (undoDetailedRef.current) { setDetailed(undoDetailedRef.current); undoDetailedRef.current = null; setDetailedDirty(false) } }}
                  style={{ background: 'transparent', border: '1px solid #D0CEC9', color: '#888', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, padding: '8px 16px', cursor: 'pointer' }}>
                  Undo
                </button>
              )}
              {detailedDirty && (
                <button onClick={saveDetailed}
                  style={{ background: '#C4973A', border: 'none', color: '#000', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, padding: '8px 20px', cursor: 'pointer' }}>
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Market benchmark hint */}
          <div style={{ background: '#F7F5F2', border: '1px solid #E8E5E0', borderLeft: '3px solid #C4973A', padding: '10px 16px', marginBottom: 24 }}>
            <p style={{ fontSize: 10, color: '#888', margin: 0, letterSpacing: '0.04em' }}>
              <span style={{ color: '#C4973A', fontWeight: 700 }}>Market guide — </span>{meta.hint}
            </p>
          </div>

          {/* Line item table */}
          <div style={{ maxWidth: 960 }}>
            <LineItemTable
              items={detailed[meta.key]}
              onChange={items => updateSection(meta.key, items)}
            />
          </div>
        </div>
      )}

      {/* Render strip */}
      <div style={{ height: 280, backgroundImage: 'url(/renders/haavn-hero.png)', backgroundSize: 'cover', backgroundPosition: 'center 55%', width: '100%', flexShrink: 0 }} />
      <SiteLinks />
    </div>
  )
}

function InnerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border border-[#E8E5E0] bg-white">
      <div className="px-4 py-2 border-b border-[#E8E5E0] bg-[#F5F3F0]">
        <span className="text-[9px] tracking-[0.2em] uppercase text-[#888]">{label}</span>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}
