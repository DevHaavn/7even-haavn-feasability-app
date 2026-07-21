import React, { useState, useEffect } from 'react'
import BudgetsAdmin, { ensureAdminData, publishProjectCosts } from './BudgetsAdmin'
import { AtriumApex } from '../../components/AtriumMark'

/** Accounts Pillar 01 landing. Splits Administration into two books:
 *  01 · 7EVEN Capital Administration (ATRIUM) — the 7even / 7even Capital entity,
 *       its project-linked budgets and dashboards.
 *  02 · HAAVN Administration — the HAAVN group entities (Pty Ltd, Management,
 *       Precision, Technologies), kept separate from 7even.
 *  Picking a book opens BudgetsAdmin filtered to that group. */

type Group = '7even' | 'haavn'

const BOOKS: { id: Group; num: string; title: string; sub: string; blurb: string; color: string }[] = [
  {
    id: '7even', num: '01', title: '7EVEN Capital Administration',
    sub: 'Dashboards · Projects · Budgets',
    blurb: '7EVEN & 7EVEN Capital books — project-linked budgets tracked live against the feasibility studio, invoice register and dashboards.',
    // Was the retired gold #C4973A. Xero blue — this book IS the Xero-backed
    // 7EVEN set, and it matches pillar 01 on the gateway it sits under.
    color: '#13B5EA',
  },
  {
    id: 'haavn', num: '02', title: 'HAAVN Administration',
    sub: 'Accounts & Settlement · Client revenue · FY27',
    blurb: 'The full ATRIUM Accounts & Settlement surface — client revenue, manager splits, group settlement, inter-co loans and the FY27 budget across every HAAVN entity, consolidated.',
    color: '#3DAA6A',
  },
]


export default function BudgetsAdminBase() {
  const [group, setGroup] = useState<Group | null>(null)

  // The books run in an iframe, so their in-page "← Administration" control
  // can't route this app — it posts a message instead. Origin is checked so
  // only our own pages can close the book.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      if (e.data && e.data.type === 'atrium:back-admin') setGroup(null)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  // The 7EVEN book reads capital_admin_v3 directly but cannot seed it. Ensure
  // the CFO seed exists (fresh browsers) before the book's expenses/budget tabs
  // try to read it. No-op when data already exists.
  useEffect(() => { ensureAdminData() }, [])

  // Publish each project's live cost stack (computed here, where the store is
  // hydrated) for the book to read. Refresh on a short interval and on focus so
  // a change in the feasibility studio flows into the admin without a reload.
  useEffect(() => {
    if (group !== '7even') return
    publishProjectCosts()
    const iv = setInterval(publishProjectCosts, 4000)
    const onFocus = () => publishProjectCosts()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [group])

  // 7EVEN Capital Administration — the live book: Xero connect / push / pull,
  // project tracking wired to the feasibility studio, the detailed cost stack
  // and the month-by-month budget grid.
  //
  // The book is the ATRIUM silver-glass HTML design (Dashboard, 7EVEN GROUP ·
  // Structure, Project tracking, Budget entry, Invoices & Bills, Project spend).
  // It is same-origin, so its own script wires the live functions directly:
  // shared localStorage for the feasibility cost stack and the budget store,
  // and fetch() to the Xero endpoints. The React BudgetsAdmin component is kept
  // as the data/logic reference the book's script mirrors.
  if (group === '7even') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#050706', display: 'flex', flexDirection: 'column' }}>
        <iframe
          title="ATRIUM — 7EVEN Capital Administration"
          src="/atrium-book01-7even-capital.html"
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }}
        />
        <button onClick={() => setGroup(null)}
          style={{ position: 'fixed', top: 70, left: 78, zIndex: 501,
            padding: '9px 16px', fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', fontWeight: 700,
            color: '#E8EDEF', background: 'rgba(10,13,12,0.94)', border: '1px solid #3A4146', borderRadius: 999,
            cursor: 'pointer', backdropFilter: 'blur(6px)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}>
          ← Administration
        </button>
      </div>
    )
  }

  // HAAVN Administration — Dom's full ATRIUM Accounts & Settlement module
  // (Client revenue · Group settlement · FY27 budget · Command overview),
  // running as its own ATRIUM-native surface. Owns the screen; a discreet
  // carbon pill returns to the two-book landing.
  if (group === 'haavn') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#050706', display: 'flex', flexDirection: 'column' }}>
        {/* The back control lives IN the book's own header bar (top-left),
            posting atrium:back-admin which the message listener above handles —
            same pattern as Book 01. No floating pill. */}
        <iframe
          title="ATRIUM — Accounts & Settlement"
          src="/atrium-accounts.html"
          style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      </div>
    )
  }

  return (
    <div style={{ flex: 1, padding: '48px 32px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
      {/* Silver kicker — the gold #C4973A is retired across the ATRIUM system. */}
      <p style={{ color: '#9aa8b6', fontSize: 11, letterSpacing: '0.34em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 0, textAlign: 'center' }}>Accounts · Two Sets of Books</p>
      <h1 style={{ color: '#F0EFED', fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontWeight: 600, fontSize: 'clamp(34px, 6vw, 64px)', letterSpacing: '0.06em', lineHeight: 1, textTransform: 'uppercase', textAlign: 'center', margin: '14px 0 0' }}>
        Administration
      </h1>
      <p style={{ color: '#A7A7A7', fontSize: 14, textAlign: 'center', margin: '16px 0 0' }}>
        Choose a set of books — 7EVEN Capital and HAAVN are kept separate.
      </p>

      {/* Hairline, replacing the heavy chrome bar */}
      <div style={{ width: 230, height: 1, background: 'linear-gradient(90deg, transparent, rgba(154,168,182,0.4), transparent)', margin: '22px auto 30px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22, alignItems: 'stretch' }}>
        {BOOKS.map(b => (
          <button key={b.id} onClick={() => setGroup(b.id)}
            className="cap-pillar"
            style={{
              textAlign: 'left', cursor: 'pointer', minHeight: 440,
              position: 'relative', overflow: 'hidden',   // anchors the accent top-rule
              border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.25))',
              backdropFilter: 'blur(18px) saturate(1.1)', WebkitBackdropFilter: 'blur(18px) saturate(1.1)',
              padding: '30px 28px 26px', display: 'flex', flexDirection: 'column', gap: 0,
              transition: 'all 0.3s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 44px rgba(0,0,0,0.40)',
            }}
            onMouseEnter={e => { const t = e.currentTarget; t.style.borderColor = `${b.color}66`; t.style.transform = 'translateY(-4px)'; t.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.16), 0 22px 52px rgba(0,0,0,0.5), 0 0 30px ${b.color}22` }}
            onMouseLeave={e => { const t = e.currentTarget; t.style.borderColor = 'rgba(255,255,255,0.10)'; t.style.transform = 'translateY(0)'; t.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 44px rgba(0,0,0,0.40)' }}>
            {/* Accent hairline across the top of the card */}
            <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${b.color}, transparent)`, opacity: 0.65 }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--mono, monospace)', fontSize: 34, fontWeight: 300, color: b.color, lineHeight: 1 }}>{b.num}</span>
              <span aria-hidden style={{ fontSize: 15, color: b.color, opacity: 0.75, lineHeight: 1 }}>▲</span>
            </div>
            <div>
              <p style={{ color: b.color, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 600, margin: '14px 0 6px' }}>{b.sub}</p>
              <h2 style={{ color: '#fff', fontFamily: 'var(--font-serif, "Cormorant Garamond", serif)', fontWeight: 500, fontSize: 30, letterSpacing: '0.01em', lineHeight: 1.05, margin: 0, display: 'flex', alignItems: 'baseline', gap: '0.2em' }}>
                {b.id === '7even' ? (
                  <>
                    <img src="/seven-mark-white.png" alt="7EVEN" style={{ height: '0.9em', width: 'auto' }} />
                    <span>Capital Administration</span>
                  </>
                ) : (
                  b.title
                )}
              </h2>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '4px 0' }} />
            <p style={{ color: '#999', fontSize: 13, lineHeight: 1.6, margin: 0, flex: 1 }}>{b.blurb}</p>

            {/* Xero — the accounts backbone of both books */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, letterSpacing: '0.26em', textTransform: 'uppercase' }}>Powered by</span>
              <img src="/xero-logo.png" alt="Xero" draggable={false}
                style={{ width: 86, height: 'auto', opacity: 0.92, filter: 'drop-shadow(0 0 12px rgba(19,181,234,0.25))' }} />
            </div>

            <span style={{ marginTop: 22, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9aa8b6' }}>Enter Books →</span>
          </button>
        ))}
      </div>
    </div>
  )
}
