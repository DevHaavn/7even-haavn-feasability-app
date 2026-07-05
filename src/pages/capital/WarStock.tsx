import React, { useMemo, useState } from 'react'

// ── 7EVEN DEVELOPMENTS · STOCK LEDGER ────────────────────────────────────────
// The industry-standard core of a developer sales CRM: every apartment, home
// and lot as live inventory. The sales pipeline drives status automatically —
// reserve a buyer and the unit locks; settle the sale and the unit settles.

export const UNIT_STATUSES = ['Available', 'Hold', 'Reserved', 'Exchanged', 'Settled'] as const
export type UnitStatus = typeof UNIT_STATUSES[number]

export interface StockUnit {
  id: string           // UNIT-0001
  project: string      // Saint Village · Preston
  unit: string         // e.g. 1204, TH-07, Lot 12
  type: string         // 1B / 2B / 3B / TH / Lot
  price: number
  status: UnitStatus
  buyer?: string       // set by the sales pipeline
}

interface StockData { units: StockUnit[]; seq: number }

const STORE_KEY = 'sales_stock_v1'
export const loadStock = (): StockData => {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return JSON.parse(raw) } catch { /* fresh */ }
  return { units: [], seq: 0 }
}
export const saveStock = (d: StockData) => localStorage.setItem(STORE_KEY, JSON.stringify(d))

/** Called by the sales pipeline when a linked sale moves stage or is removed. */
export function setUnitStatus(unitId: string, status: UnitStatus, buyer?: string) {
  const d = loadStock()
  saveStock({ ...d, units: d.units.map(u => u.id === unitId ? { ...u, status, buyer: status === 'Available' ? undefined : (buyer ?? u.buyer) } : u) })
}
export function availableUnits(): StockUnit[] {
  return loadStock().units.filter(u => u.status === 'Available')
}

const fmt$ = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`

const LINE = '#D3D4D8', INK = '#0D0D0F', INK_SOFT = '#4A4B50', GREEN_DEEP = '#0F9E52', RED = '#FF2F00'
const HUD: React.CSSProperties = { fontFamily: "'Chakra Petch', sans-serif", textTransform: 'uppercase' }
const fieldPanel: React.CSSProperties = { background: '#F6F6F7', border: `1px solid ${LINE}`, borderRadius: 10, padding: '20px 22px' }
const fieldTitle: React.CSSProperties = { ...HUD, color: INK_SOFT, fontSize: 9, letterSpacing: '0.26em', fontWeight: 700, marginBottom: 4 }
const fieldSub: React.CSSProperties = { color: INK_SOFT, fontSize: 10, marginBottom: 16, opacity: 0.8 }
const cell: React.CSSProperties = {
  background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, color: INK,
  fontSize: 13, padding: '8px 10px', outline: 'none', width: '100%',
}

const STATUS_COLOR: Record<UnitStatus, { bg: string; fg: string }> = {
  Available: { bg: '#E4E4E7', fg: '#4A4B50' },
  Hold: { bg: '#7A7C84', fg: '#fff' },
  Reserved: { bg: RED, fg: '#fff' },
  Exchanged: { bg: '#0D0D0F', fg: '#fff' },
  Settled: { bg: GREEN_DEEP, fg: '#fff' },
}

export default function WarStock() {
  const [data, setData] = useState<StockData>(loadStock)
  const [fProject, setFProject] = useState('')
  const [fUnit, setFUnit] = useState('')
  const [fType, setFType] = useState('2B')
  const [fPrice, setFPrice] = useState('')
  const [filter, setFilter] = useState<'all' | UnitStatus>('all')

  const update = (next: StockData) => { setData(next); saveStock(next) }

  const shown = useMemo(
    () => (filter === 'all' ? data.units : data.units.filter(u => u.status === filter)),
    [data, filter],
  )
  const byStatus = (st: UnitStatus) => data.units.filter(u => u.status === st)

  function addUnit() {
    if (!fProject.trim() || !fUnit.trim()) return
    const seq = data.seq + 1
    update({
      seq,
      units: [...data.units, {
        id: `UNIT-${String(seq).padStart(4, '0')}`, project: fProject.trim(), unit: fUnit.trim(),
        type: fType, price: parseFloat(fPrice) || 0, status: 'Available',
      }],
    })
    setFUnit(''); setFPrice('')
  }
  const editUnit = (id: string, k: keyof StockUnit, v: string | number) =>
    update({ ...data, units: data.units.map(u => u.id === id ? { ...u, [k]: v } : u) })
  const cycleStatus = (id: string) =>
    update({
      ...data,
      units: data.units.map(u => u.id === id
        ? { ...u, status: UNIT_STATUSES[(UNIT_STATUSES.indexOf(u.status) + 1) % UNIT_STATUSES.length] }
        : u),
    })

  return (
    <div style={fieldPanel}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={fieldTitle}>Stock Ledger — Units, Homes &amp; Lots</p>
          <p style={fieldSub}>live availability · the sales pipeline locks and settles units automatically</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', ...UNIT_STATUSES] as const).map(st => (
            <button key={st} onClick={() => setFilter(st as 'all' | UnitStatus)}
              style={{
                ...HUD, cursor: 'pointer', borderRadius: 5, padding: '5px 10px', fontSize: 8, letterSpacing: '0.14em', fontWeight: 700,
                border: `1px solid ${filter === st ? INK : LINE}`,
                background: filter === st ? INK : '#fff', color: filter === st ? '#fff' : INK_SOFT,
              }}>
              {st === 'all' ? `All ${data.units.length}` : `${st} ${byStatus(st as UnitStatus).length}`}
            </button>
          ))}
        </div>
      </div>

      {/* Availability summary */}
      <div style={{ display: 'flex', gap: 8, margin: '4px 0 14px', flexWrap: 'wrap' }}>
        {UNIT_STATUSES.map(st => {
          const units = byStatus(st)
          return (
            <div key={st} style={{ flex: 1, minWidth: 120, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, padding: '9px 12px' }}>
              <span style={{ ...HUD, fontSize: 7.5, letterSpacing: '0.14em', fontWeight: 700, color: INK_SOFT }}>{st}</span>
              <p style={{ color: INK, fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', margin: '3px 0 0' }}>
                {units.length}<span style={{ color: INK_SOFT, fontSize: 9.5, fontWeight: 400 }}> · {fmt$(units.reduce((s, u) => s + u.price, 0))}</span>
              </p>
            </div>
          )
        })}
      </div>

      {/* Add unit */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 14 }}>
        <input value={fProject} onChange={e => setFProject(e.target.value)} placeholder="Project" style={cell} />
        <input value={fUnit} onChange={e => setFUnit(e.target.value)} placeholder="Unit / Lot no." style={cell} />
        <select value={fType} onChange={e => setFType(e.target.value)} style={cell}>
          {['1B', '2B', '3B', 'TH', 'House', 'Lot', 'Hotel', 'Retail'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="number" value={fPrice} onChange={e => setFPrice(e.target.value)} placeholder="Price" style={cell} />
        <button onClick={addUnit} className="wr-btn wr-solid wr-hot"
          style={{ ...HUD, color: '#fff', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, padding: '8px 0' }}>
          + Add Unit
        </button>
      </div>

      {/* Ledger */}
      {shown.length === 0 ? (
        <p style={{ color: INK_SOFT, fontSize: 12 }}>No stock {filter !== 'all' ? `in ${filter}` : 'loaded yet — add the first release above'}.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '92px minmax(140px,1.4fr) 90px 70px 110px minmax(110px,1fr) 104px 24px', gap: 10, alignItems: 'center', padding: '4px 2px' }}>
              {['Ref', 'Project', 'Unit', 'Type', 'Price', 'Buyer', 'Status', ''].map((h, i) => (
                <span key={i} style={{ ...HUD, color: INK_SOFT, fontSize: 8, letterSpacing: '0.2em', fontWeight: 700 }}>{h}</span>
              ))}
            </div>
            {shown.map(u => (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '92px minmax(140px,1.4fr) 90px 70px 110px minmax(110px,1fr) 104px 24px', gap: 10, alignItems: 'center', padding: '5px 2px' }}>
                <span style={{ color: INK_SOFT, fontSize: 10.5, fontFamily: 'var(--font-mono)' }}>{u.id}</span>
                <input key={`p${u.id}${u.project}`} defaultValue={u.project} onBlur={e => e.target.value !== u.project && editUnit(u.id, 'project', e.target.value)} style={cell} />
                <input key={`u${u.id}${u.unit}`} defaultValue={u.unit} onBlur={e => e.target.value !== u.unit && editUnit(u.id, 'unit', e.target.value)} style={cell} />
                <input key={`t${u.id}${u.type}`} defaultValue={u.type} onBlur={e => e.target.value !== u.type && editUnit(u.id, 'type', e.target.value)} style={cell} />
                <input key={`$${u.id}${u.price}`} type="number" defaultValue={u.price || ''} onBlur={e => { const n = parseFloat(e.target.value) || 0; n !== u.price && editUnit(u.id, 'price', n) }} style={{ ...cell, fontFamily: 'var(--font-mono)', textAlign: 'right' }} />
                <span style={{ color: u.buyer ? INK : INK_SOFT, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.buyer || '—'}</span>
                <button onClick={() => cycleStatus(u.id)} title="Cycle status (pipeline-linked units update automatically)"
                  style={{ ...HUD, cursor: 'pointer', borderRadius: 4, padding: '5px 0', fontSize: 8, letterSpacing: '0.12em', fontWeight: 700, border: 'none', background: STATUS_COLOR[u.status].bg, color: STATUS_COLOR[u.status].fg }}>
                  {u.status}
                </button>
                <button onClick={() => update({ ...data, units: data.units.filter(x => x.id !== u.id) })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_SOFT, fontSize: 13 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
