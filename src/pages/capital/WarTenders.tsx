import React, { useMemo, useState } from 'react'

// ── HAAVN MANAGEMENT · TENDERS ───────────────────────────────────────────────
// The owner's-rep procurement core (Mastt / Owner Insite pattern): for each
// engagement, break the works into packages, invite contractors to quote,
// compare submissions cheapest-first against budget, and award. Feeds the
// Tender phase-gate of the engagement pipeline.

interface Quote {
  id: string
  contractor: string
  amountK: number      // ex-GST, thousands
  note?: string
}
interface Pkg {
  id: string           // PKG-0001
  project: string      // client engagement
  trade: string        // Earthworks & Civils, Structure, Facade…
  budgetK: number
  quotes: Quote[]
  awardedQuoteId?: string
}
interface TenderData { packages: Pkg[]; seq: number }

const STORE_KEY = 'hm_tenders_v1'
const load = (): TenderData => {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return JSON.parse(raw) } catch { /* fresh */ }
  return { packages: [], seq: 0 }
}
const save = (d: TenderData) => localStorage.setItem(STORE_KEY, JSON.stringify(d))

const fmtK = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(2)}M` : `$${Math.round(n)}K`
const uid = () => Math.random().toString(36).slice(2, 9)

const LINE = '#D3D4D8', INK = '#0D0D0F', INK_SOFT = '#4A4B50'
const GREEN_DEEP = '#0F9E52', RED = '#FF2F00', AMBER = '#E08A2E'
const HUD: React.CSSProperties = { fontFamily: "'Chakra Petch', sans-serif", textTransform: 'uppercase' }
const fieldPanel: React.CSSProperties = { background: '#F6F6F7', border: `1px solid ${LINE}`, borderRadius: 10, padding: '20px 22px' }
const fieldTitle: React.CSSProperties = { ...HUD, color: INK_SOFT, fontSize: 9, letterSpacing: '0.26em', fontWeight: 700, marginBottom: 4 }
const fieldSub: React.CSSProperties = { color: INK_SOFT, fontSize: 10, marginBottom: 16, opacity: 0.8 }
const fieldLabel: React.CSSProperties = { ...HUD, color: INK_SOFT, fontSize: 8, letterSpacing: '0.22em', display: 'block', marginBottom: 5, fontWeight: 600 }
const cell: React.CSSProperties = {
  background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, color: INK,
  fontSize: 13, padding: '8px 10px', outline: 'none', width: '100%',
}

export default function WarTenders() {
  const [data, setData] = useState<TenderData>(load)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [fProject, setFProject] = useState('')
  const [fTrade, setFTrade] = useState('')
  const [fBudget, setFBudget] = useState('')
  // per-package quote entry
  const [qContractor, setQContractor] = useState<Record<string, string>>({})
  const [qAmount, setQAmount] = useState<Record<string, string>>({})

  const update = (next: TenderData) => { setData(next); save(next) }

  const totals = useMemo(() => {
    let budget = 0, awarded = 0, open = 0
    data.packages.forEach(p => {
      budget += p.budgetK
      const won = p.quotes.find(q => q.id === p.awardedQuoteId)
      if (won) awarded += won.amountK
      else open++
    })
    return { budget, awarded, open }
  }, [data])

  function addPackage() {
    if (!fProject.trim() || !fTrade.trim()) return
    const seq = data.seq + 1
    update({
      seq,
      packages: [{ id: `PKG-${String(seq).padStart(4, '0')}`, project: fProject.trim(), trade: fTrade.trim(), budgetK: parseFloat(fBudget) || 0, quotes: [] }, ...data.packages],
    })
    setFTrade(''); setFBudget(''); setShowAdd(false)
  }
  function addQuote(pkgId: string) {
    const c = (qContractor[pkgId] || '').trim()
    const a = parseFloat(qAmount[pkgId] || '')
    if (!c || !a) return
    update({
      ...data,
      packages: data.packages.map(p => p.id === pkgId
        ? { ...p, quotes: [...p.quotes, { id: uid(), contractor: c, amountK: a }] }
        : p),
    })
    setQContractor({ ...qContractor, [pkgId]: '' })
    setQAmount({ ...qAmount, [pkgId]: '' })
  }
  const award = (pkgId: string, quoteId: string) =>
    update({ ...data, packages: data.packages.map(p => p.id === pkgId ? { ...p, awardedQuoteId: p.awardedQuoteId === quoteId ? undefined : quoteId } : p) })
  const removeQuote = (pkgId: string, quoteId: string) =>
    update({ ...data, packages: data.packages.map(p => p.id === pkgId ? { ...p, quotes: p.quotes.filter(q => q.id !== quoteId), awardedQuoteId: p.awardedQuoteId === quoteId ? undefined : p.awardedQuoteId } : p) })
  const removePkg = (pkgId: string) => update({ ...data, packages: data.packages.filter(p => p.id !== pkgId) })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { label: 'Packages', value: String(data.packages.length), color: INK },
          { label: 'Tender Budget', value: fmtK(totals.budget), color: INK },
          { label: 'Awarded', value: fmtK(totals.awarded), color: GREEN_DEEP },
          { label: 'Open Packages', value: String(totals.open), color: totals.open ? AMBER : INK_SOFT },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, padding: '14px 16px' }}>
            <p style={{ ...HUD, color: INK_SOFT, fontSize: 7.5, letterSpacing: '0.22em', margin: '0 0 8px', fontWeight: 700 }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: 19, fontWeight: 700, margin: 0, fontFamily: 'var(--font-mono)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div style={fieldPanel}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <div>
            <p style={fieldTitle}>Tender Register — Packages &amp; Quotes</p>
            <p style={fieldSub}>compare submissions cheapest-first against budget, then award</p>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className={showAdd ? 'wr-btn' : 'wr-btn wr-solid wr-hot'}
            style={{ ...HUD, marginLeft: 'auto', color: '#fff', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, padding: '8px 16px' }}>
            {showAdd ? 'Close' : '+ New Package'}
          </button>
        </div>

        {showAdd && (
          <div style={{ border: `1px solid ${RED}55`, borderRadius: 8, padding: 16, margin: '12px 0 4px', background: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div><label style={fieldLabel}>Engagement / Client</label><input value={fProject} onChange={e => setFProject(e.target.value)} placeholder="e.g. Riverside Childcare" style={cell} /></div>
              <div><label style={fieldLabel}>Package / Trade</label><input value={fTrade} onChange={e => setFTrade(e.target.value)} placeholder="e.g. Structure" style={cell} /></div>
              <div><label style={fieldLabel}>Budget ($K)</label><input type="number" value={fBudget} onChange={e => setFBudget(e.target.value)} placeholder="0" style={cell} /></div>
            </div>
            <button onClick={addPackage} className="wr-btn wr-solid wr-hot"
              style={{ ...HUD, marginTop: 14, color: '#fff', fontSize: 9, letterSpacing: '0.22em', fontWeight: 700, padding: '9px 22px' }}>
              Open Package
            </button>
          </div>
        )}

        {data.packages.length === 0 ? (
          <p style={{ color: INK_SOFT, fontSize: 12, marginTop: 8 }}>No packages out to tender yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {data.packages.map(p => {
              const sorted = [...p.quotes].sort((a, b) => a.amountK - b.amountK)
              const low = sorted[0]
              const won = p.quotes.find(q => q.id === p.awardedQuoteId)
              const open = expanded[p.id] ?? true
              const headline = won ? won.amountK : low?.amountK
              const variance = headline != null && p.budgetK ? headline - p.budgetK : undefined
              return (
                <div key={p.id} style={{ background: '#fff', border: `1px solid ${won ? `${GREEN_DEEP}55` : LINE}`, borderRadius: 8, overflow: 'hidden' }}>
                  {/* Package header */}
                  <div onClick={() => setExpanded({ ...expanded, [p.id]: !open })}
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(130px,1.4fr) minmax(120px,1.2fr) 96px 96px minmax(120px,1fr) 24px', gap: 12, alignItems: 'center', padding: '12px 14px', cursor: 'pointer', borderBottom: open ? `1px solid ${LINE}` : 'none' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: INK, fontSize: 13, fontWeight: 700, margin: 0 }}>
                        <span style={{ color: INK_SOFT, marginRight: 7, fontSize: 10 }}>{open ? '▾' : '▸'}</span>{p.trade}
                      </p>
                      <p style={{ color: INK_SOFT, fontSize: 10, margin: '2px 0 0 17px' }}>{p.project} · {p.id}</p>
                    </div>
                    <span style={{ color: INK_SOFT, fontSize: 11 }}>{p.quotes.length} quote{p.quotes.length !== 1 ? 's' : ''}</span>
                    <span style={{ color: INK_SOFT, fontSize: 11.5, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{p.budgetK ? fmtK(p.budgetK) : '—'}</span>
                    <span style={{ color: won ? GREEN_DEEP : INK, fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'right' }}>{headline != null ? fmtK(headline) : '—'}</span>
                    <span style={{ textAlign: 'right' }}>
                      {won ? (
                        <span style={{ ...HUD, background: GREEN_DEEP, color: '#fff', fontSize: 8, letterSpacing: '0.14em', fontWeight: 700, borderRadius: 4, padding: '4px 9px' }}>Awarded</span>
                      ) : variance != null ? (
                        <span style={{ color: variance <= 0 ? GREEN_DEEP : RED, fontSize: 11, fontFamily: 'var(--font-mono)' }}>{variance <= 0 ? '' : '+'}{fmtK(variance)} v budget</span>
                      ) : (
                        <span style={{ ...HUD, color: AMBER, fontSize: 8, letterSpacing: '0.14em', fontWeight: 700 }}>Out to tender</span>
                      )}
                    </span>
                    <button onClick={e => { e.stopPropagation(); removePkg(p.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_SOFT, fontSize: 13 }}>×</button>
                  </div>

                  {open && (
                    <div style={{ padding: '10px 14px 14px', background: '#FAFAFB' }}>
                      {sorted.length === 0 ? (
                        <p style={{ color: INK_SOFT, fontSize: 11.5, marginBottom: 12 }}>No quotes in yet.</p>
                      ) : sorted.map((q, idx) => {
                        const awarded = q.id === p.awardedQuoteId
                        const vsBudget = p.budgetK ? q.amountK - p.budgetK : undefined
                        return (
                          <div key={q.id} style={{ display: 'grid', gridTemplateColumns: '24px minmax(120px,1.6fr) 100px minmax(110px,1fr) 96px 24px', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${LINE}` }}>
                            <span style={{ ...HUD, color: idx === 0 ? GREEN_DEEP : INK_SOFT, fontSize: 9, fontWeight: 700 }}>{idx === 0 ? '★' : idx + 1}</span>
                            <span style={{ color: INK, fontSize: 12.5, fontWeight: awarded ? 700 : 500 }}>{q.contractor}</span>
                            <span style={{ color: INK, fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'right' }}>{fmtK(q.amountK)}</span>
                            <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: vsBudget == null ? INK_SOFT : vsBudget <= 0 ? GREEN_DEEP : RED, textAlign: 'right' }}>
                              {vsBudget == null ? '—' : `${vsBudget <= 0 ? '' : '+'}${fmtK(vsBudget)}`}
                            </span>
                            <button onClick={() => award(p.id, q.id)}
                              style={{
                                ...HUD, cursor: 'pointer', borderRadius: 4, padding: '5px 0', fontSize: 8, letterSpacing: '0.12em', fontWeight: 700,
                                border: awarded ? 'none' : `1px solid ${LINE}`,
                                background: awarded ? GREEN_DEEP : '#fff', color: awarded ? '#fff' : INK_SOFT,
                              }}>
                              {awarded ? 'Awarded' : 'Award'}
                            </button>
                            <button onClick={() => removeQuote(p.id, q.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK_SOFT, fontSize: 13 }}>×</button>
                          </div>
                        )
                      })}
                      {/* Add quote */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 90px', gap: 8, marginTop: 12 }}>
                        <input value={qContractor[p.id] || ''} onChange={e => setQContractor({ ...qContractor, [p.id]: e.target.value })} placeholder="Contractor"
                          onKeyDown={e => e.key === 'Enter' && addQuote(p.id)} style={cell} />
                        <input type="number" value={qAmount[p.id] || ''} onChange={e => setQAmount({ ...qAmount, [p.id]: e.target.value })} placeholder="Quote $K"
                          onKeyDown={e => e.key === 'Enter' && addQuote(p.id)} style={{ ...cell, fontFamily: 'var(--font-mono)', textAlign: 'right' }} />
                        <button onClick={() => addQuote(p.id)} className="wr-btn wr-solid"
                          style={{ ...HUD, color: '#fff', fontSize: 8.5, letterSpacing: '0.16em', fontWeight: 700, padding: '7px 0' }}>
                          + Quote
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
