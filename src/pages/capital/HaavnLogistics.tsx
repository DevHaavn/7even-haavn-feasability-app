import React, { useState } from 'react'
import { saveKV } from '../../lib/cloudStore'

// ── HAAVN LOGISTICS — every home tracked from purchase to lift ──────────────
// Lives inside the War Room CRM. Field · Light working surface. Shipment
// board, six-step order lifecycle, site readiness and end-to-end cost per
// home — all editable, held locally. Sample records seeded from the Command
// Center build; replace with live orders.

export const LIFECYCLE = ['Purchase', 'Land + Civils', 'Manufacture', 'Sea Freight', 'Transport', 'Crane Install'] as const

interface Shipment {
  id: string; label: string; homes: number; vessel: string; route: string
  stageIdx: number; eta: string; note?: string
}
interface Readiness { status: 'ok' | 'warn'; title: string; detail: string }
interface CostItem { name: string; amountK: number; note: string }
interface LogisticsData { shipments: Shipment[]; readiness: Readiness[]; costPerHome: CostItem[] }

const SEED: LogisticsData = {
  shipments: [
    { id: 'HV-2211', label: 'Homes 9–18', homes: 10, vessel: 'MV Orient · Ningbo→BNE', route: '6 × 40HC', stageIdx: 4, eta: '08 Jul' },
    { id: 'HV-2214', label: 'Homes 21–32', homes: 12, vessel: 'MV Pacific · Ningbo→BNE', route: '8 × 40HC', stageIdx: 3, eta: '22 Jul', note: 'delayed 6d — crane window needs rebooking' },
    { id: 'HV-2216', label: 'Homes 33–44', homes: 12, vessel: 'MV Coral · Shanghai→BNE', route: '8 × 40HC', stageIdx: 2, eta: '11 Aug' },
    { id: 'HV-2219', label: 'Homes 45–52', homes: 8, vessel: 'TBA · Shanghai→MEL', route: '5 × 40HC', stageIdx: 0, eta: 'Sep' },
    { id: 'HV-2221', label: 'Homes 53–58', homes: 6, vessel: 'TBA · Ningbo→BNE', route: '4 × 40HC', stageIdx: 0, eta: 'Sep' },
  ],
  readiness: [
    { status: 'ok', title: 'Land settled', detail: 'All sites titled' },
    { status: 'warn', title: 'Civils / services', detail: 'Pads 4 days behind — earthworks variance' },
    { status: 'warn', title: 'Crane windows', detail: 'HV-2214 crane needs rebooking (ETA slip)' },
    { status: 'ok', title: 'Transport / escorts', detail: 'Oversize permits approved' },
  ],
  costPerHome: [
    { name: 'Manufacture (CN)', amountK: 118, note: 'FOB Ningbo' },
    { name: 'Freight + Duty', amountK: 26, note: 'Sea · 40HC × 0.66' },
    { name: 'Land + Civils', amountK: 164, note: 'Per lot allocation' },
    { name: 'Transport + Crane', amountK: 31, note: 'Escort + lift' },
  ],
}

const STORE_KEY = 'haavn_logistics_v1'
const load = (): LogisticsData => {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
    // migrate from the deployment store where logistics briefly lived
    const v2 = localStorage.getItem('capital_deploy_v2')
    if (v2) {
      const d = JSON.parse(v2)
      if (d.shipments) return { shipments: d.shipments, readiness: d.readiness ?? SEED.readiness, costPerHome: d.costPerHome ?? SEED.costPerHome }
    }
  } catch { /* seed */ }
  return JSON.parse(JSON.stringify(SEED))
}
const save = (d: LogisticsData) => saveKV(STORE_KEY, d)

// Field · Light tokens
const FIELD = '#E8E8EA', LINE = '#D3D4D8', INK = '#0D0D0F', INK_SOFT = '#4A4B50'
const GREEN_DEEP = '#0F9E52'
const HUD: React.CSSProperties = { fontFamily: "'Chakra Petch', sans-serif", textTransform: 'uppercase' }
const fieldPanelS: React.CSSProperties = { background: '#F6F6F7', border: `1px solid ${LINE}`, borderRadius: 10, padding: '20px 22px' }
const fieldTitle: React.CSSProperties = { ...HUD, color: INK_SOFT, fontSize: 9, letterSpacing: '0.26em', fontWeight: 700, marginBottom: 4 }
const fieldSub: React.CSSProperties = { color: INK_SOFT, fontSize: 10, marginBottom: 16, opacity: 0.8 }
const textCell: React.CSSProperties = {
  background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, color: INK,
  fontSize: 13, padding: '8px 10px', outline: 'none', width: '100%',
}
const numCell: React.CSSProperties = {
  ...textCell, fontFamily: 'var(--font-mono)', textAlign: 'right', width: 74,
}

export default function HaavnLogistics() {
  const [data, setData] = useState<LogisticsData>(load)
  const update = (next: LogisticsData) => { setData(next); save(next) }
  const editShipment = (i: number, k: keyof Shipment, v: string | number) =>
    update({ ...data, shipments: data.shipments.map((s, idx) => idx === i ? { ...s, [k]: v } : s) })
  const num = (v: string) => parseFloat(v) || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={fieldPanelS}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <p style={fieldTitle}>HAAVN Logistics — Shipment Board</p>
            <p style={fieldSub}>{data.shipments.length} orders live · {data.shipments.filter(sh => sh.stageIdx === 3).reduce((t, sh) => t + sh.homes, 0)} homes on the water · purchase → land+civils → manufacture → sea freight → transport → crane install</p>
          </div>
          <button className="wr-btn wr-solid wr-green" onClick={() => update({ ...data, shipments: [...data.shipments, { id: 'HV-NEW', label: 'Homes —', homes: 0, vessel: 'TBA', route: '—', stageIdx: 0, eta: 'TBA' }] })}
            style={{ ...HUD, marginLeft: 'auto', color: '#fff', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, padding: '8px 16px' }}>
            + New Order
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 900 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '96px minmax(110px,1fr) 68px minmax(150px,1.4fr) 94px minmax(130px,1.1fr) 80px 24px', gap: 10, alignItems: 'center', padding: '4px 2px', marginTop: 8 }}>
          {['Order', 'Homes', 'Qty', 'Vessel · Route', 'Containers', 'Stage', 'ETA', ''].map((h, i) => (
            <span key={i} style={{ ...HUD, color: INK_SOFT, fontSize: 8, letterSpacing: '0.2em', fontWeight: 700 }}>{h}</span>
          ))}
        </div>
        {data.shipments.map((sh, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '96px minmax(110px,1fr) 68px minmax(150px,1.4fr) 94px minmax(130px,1.1fr) 80px 24px', gap: 10, alignItems: 'center', padding: '5px 2px' }}>
            <input key={`i${i}${sh.id}`} defaultValue={sh.id} onBlur={e => e.target.value !== sh.id && editShipment(i, 'id', e.target.value)} style={{ ...textCell, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            <input key={`l${i}${sh.label}`} defaultValue={sh.label} onBlur={e => e.target.value !== sh.label && editShipment(i, 'label', e.target.value)} style={textCell} />
            <input key={`h${i}${sh.homes}`} type="number" defaultValue={sh.homes} onBlur={e => { const n = num(e.target.value); n !== sh.homes && editShipment(i, 'homes', n) }} style={{ ...numCell, width: 60 }} />
            <input key={`v${i}${sh.vessel}`} defaultValue={sh.vessel} onBlur={e => e.target.value !== sh.vessel && editShipment(i, 'vessel', e.target.value)} style={textCell} />
            <input key={`r${i}${sh.route}`} defaultValue={sh.route} onBlur={e => e.target.value !== sh.route && editShipment(i, 'route', e.target.value)} style={textCell} />
            <select key={`s${i}${sh.stageIdx}`} value={sh.stageIdx} onChange={e => editShipment(i, 'stageIdx', parseInt(e.target.value))} style={textCell}>
              {LIFECYCLE.map((st, idx) => <option key={idx} value={idx}>{st}</option>)}
            </select>
            <input key={`e${i}${sh.eta}`} defaultValue={sh.eta} onBlur={e => e.target.value !== sh.eta && editShipment(i, 'eta', e.target.value)} style={{ ...textCell, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            <button onClick={() => update({ ...data, shipments: data.shipments.filter((_, idx) => idx !== i) })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_SOFT, fontSize: 13 }}>×</button>
          </div>
        ))}
        </div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {/* Lifecycle tracker for the furthest-along in-flight order */}
        <div style={fieldPanelS}>
          <p style={fieldTitle}>Order Lifecycle</p>
          {(() => {
            const active = [...data.shipments].filter(sh => sh.stageIdx < LIFECYCLE.length - 1).sort((a, b) => b.stageIdx - a.stageIdx)[0]
            if (!active) return <p style={{ color: INK_SOFT, fontSize: 12 }}>No orders in flight.</p>
            return (
              <>
                <p style={fieldSub}>{active.id} · {active.label}{active.note ? ` · ${active.note}` : ''}</p>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {LIFECYCLE.map((st, idx) => {
                    const done = idx < active.stageIdx
                    const current = idx === active.stageIdx
                    return (
                      <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: `1px solid ${LINE}` }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: done ? GREEN_DEEP : current ? '#0D0D0F' : '#fff',
                          border: `1.5px solid ${done ? GREEN_DEEP : current ? '#0D0D0F' : LINE}`,
                          color: done || current ? '#fff' : INK_SOFT, fontSize: 10, fontWeight: 700,
                        }}>{done ? '✓' : idx + 1}</span>
                        <span style={{ color: done || current ? INK : INK_SOFT, fontSize: 12, fontWeight: current ? 700 : 400 }}>{st}</span>
                        {current && <span style={{ ...HUD, marginLeft: 'auto', color: GREEN_DEEP, fontSize: 8, letterSpacing: '0.18em', fontWeight: 700 }}>ETA {active.eta}</span>}
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>

        {/* Site readiness + cost per home */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={fieldPanelS}>
            <p style={fieldTitle}>Site Readiness</p>
            <p style={fieldSub}>{data.readiness.filter(r => r.status === 'warn').length} flags</p>
            {data.readiness.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
                <span onClick={() => update({ ...data, readiness: data.readiness.map((x, idx) => idx === i ? { ...x, status: x.status === 'ok' ? 'warn' : 'ok' } : x) })}
                  title="Toggle status"
                  style={{ cursor: 'pointer', width: 9, height: 9, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: r.status === 'ok' ? GREEN_DEEP : '#E08A2E' }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ color: INK, fontSize: 11.5, fontWeight: 600, margin: 0 }}>{r.title}</p>
                  <input key={`rd${i}${r.detail}`} defaultValue={r.detail}
                    onBlur={e => e.target.value !== r.detail && update({ ...data, readiness: data.readiness.map((x, idx) => idx === i ? { ...x, detail: e.target.value } : x) })}
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: INK_SOFT, fontSize: 10.5, width: '100%', padding: 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={fieldPanelS}>
            <p style={fieldTitle}>End-to-End Cost per Home</p>
            <p style={fieldSub}>total ${data.costPerHome.reduce((t, c) => t + c.amountK, 0)}K · edit any line</p>
            {data.costPerHome.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.2fr) 80px minmax(100px,1fr)', gap: 10, alignItems: 'center', padding: '4px 0' }}>
                <span style={{ color: INK, fontSize: 11.5 }}>{c.name}</span>
                <input key={`c${i}${c.amountK}`} type="number" defaultValue={c.amountK}
                  onBlur={e => { const n = num(e.target.value); n !== c.amountK && update({ ...data, costPerHome: data.costPerHome.map((x, idx) => idx === i ? { ...x, amountK: n } : x) }) }}
                  style={{ ...numCell, width: 74 }} />
                <span style={{ color: INK_SOFT, fontSize: 10 }}>{c.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
