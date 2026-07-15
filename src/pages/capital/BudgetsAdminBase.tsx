import React, { useState } from 'react'
import BudgetsAdmin from './BudgetsAdmin'

/** Accounts Pillar 01 landing. Splits Administration into two books:
 *  01 · 7EVEN Capital Administration (ATRIUM) — the 7even / 7even Capital entity,
 *       its project-linked budgets and dashboards.
 *  02 · HAAVN Administration — the HAAVN group entities (Pty Ltd, Management,
 *       Precision, Technologies), kept separate from 7even.
 *  Picking a book opens BudgetsAdmin filtered to that group. */

type Group = '7even' | 'haavn'

const BOOKS: { id: Group; num: string; brand: string; title: string; sub: string; blurb: string; color: string }[] = [
  {
    id: '7even', num: '01', brand: 'ATRIUM', title: '7EVEN Capital Administration',
    sub: 'Dashboards · Projects · Budgets',
    blurb: '7EVEN & 7EVEN Capital books — project-linked budgets tracked live against the feasibility studio, invoice register and dashboards.',
    color: '#C4973A',
  },
  {
    id: 'haavn', num: '02', brand: 'HAAVN', title: 'HAAVN Administration',
    sub: 'Accounts & Settlement · Client revenue · FY27',
    blurb: 'The full ATRIUM Accounts & Settlement surface — client revenue, manager splits, group settlement, inter-co loans and the FY27 budget across every HAAVN entity, consolidated.',
    color: '#3DAA6A',
  },
]

export default function BudgetsAdminBase() {
  const [group, setGroup] = useState<Group | null>(null)

  // 7EVEN Capital — the entity budget system, filtered to the 7even book.
  if (group === '7even') {
    return <BudgetsAdmin key={group} group={group} onBackToGroups={() => setGroup(null)} />
  }

  // HAAVN Administration — Dom's full ATRIUM Accounts & Settlement module
  // (Client revenue · Group settlement · FY27 budget · Command overview),
  // running as its own ATRIUM-native surface. Owns the screen; a discreet
  // carbon pill returns to the two-book landing.
  if (group === 'haavn') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#050706', display: 'flex', flexDirection: 'column' }}>
        <iframe
          title="ATRIUM — Accounts & Settlement"
          src="/atrium-accounts.html"
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }}
        />
        <button onClick={() => setGroup(null)}
          style={{ position: 'fixed', bottom: 16, right: 18, zIndex: 501,
            padding: '9px 16px', fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', fontWeight: 700,
            color: '#C6CDCF', background: 'rgba(10,13,12,0.92)', border: '1px solid #3A4146', borderRadius: 999,
            cursor: 'pointer', backdropFilter: 'blur(6px)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          ← Administration
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, padding: '48px 32px', maxWidth: 1000, width: '100%', margin: '0 auto' }}>
      <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.34em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>Accounts · Two Sets of Books</p>
      <h1 style={{ color: '#F0EFED', fontFamily: 'var(--font-heading)', fontWeight: 300, fontSize: 'clamp(24px, 4vw, 36px)', letterSpacing: '0.10em', textTransform: 'uppercase', textAlign: 'center', margin: '0 0 6px' }}>
        Administration
      </h1>
      <p style={{ color: '#A7A7A7', fontSize: 12, textAlign: 'center', margin: '0 0 40px' }}>
        Choose a set of books — 7EVEN Capital and HAAVN are kept separate.
      </p>

      <div style={{ height: 2, borderRadius: 2, background: 'linear-gradient(to right, transparent, #3A3A3A 16%, #D9D9D9 50%, #3A3A3A 84%, transparent)', boxShadow: '0 1px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.05)', maxWidth: 320, margin: '0 auto 40px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22, alignItems: 'stretch' }}>
        {BOOKS.map(b => (
          <button key={b.id} onClick={() => setGroup(b.id)}
            className="cap-pillar"
            style={{
              textAlign: 'left', cursor: 'pointer', minHeight: '44vh',
              border: '1px solid rgba(255,255,255,0.10)', borderRadius: 18,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.25))',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 16,
              transition: 'all 0.2s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 44px rgba(0,0,0,0.40)',
            }}
            onMouseEnter={e => { const t = e.currentTarget; t.style.borderColor = `${b.color}66`; t.style.transform = 'translateY(-4px)'; t.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.16), 0 22px 52px rgba(0,0,0,0.5), 0 0 30px ${b.color}22` }}
            onMouseLeave={e => { const t = e.currentTarget; t.style.borderColor = 'rgba(255,255,255,0.10)'; t.style.transform = 'translateY(0)'; t.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 44px rgba(0,0,0,0.40)' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="chrome-black-text" style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700 }}>{b.num}</span>
            </div>
            <div>
              <span style={{ color: b.color, fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 18, letterSpacing: '0.10em', display: 'block', margin: '0 0 12px' }}>{b.brand}</span>
              <h2 style={{ color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 20, letterSpacing: '0.04em', margin: '0 0 8px' }}>{b.title}</h2>
              <p style={{ color: b.color, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>{b.sub}</p>
            </div>
            <div style={{ height: 1, background: `linear-gradient(to right, ${b.color}55, transparent)` }} />
            <p style={{ color: '#999', fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>{b.blurb}</p>

            {/* Xero — the accounts backbone of both books */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Powered by</span>
              <img src="/xero-logo.png" alt="Xero" draggable={false}
                style={{ width: 86, height: 'auto', opacity: 0.92, filter: 'drop-shadow(0 0 12px rgba(19,181,234,0.25))' }} />
            </div>

            <span className="chrome-black-text" style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>Enter Books →</span>
          </button>
        ))}
      </div>
    </div>
  )
}
