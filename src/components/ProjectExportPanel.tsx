import React, { useMemo, useState } from 'react'
import { useStore } from '../store'
import { collectImData } from '../lib/imDocument'

/**
 * Export — one document: the HORI7ON | 7EVEN | MARKETING IM.
 * The editorial sales memorandum, generated from this project's LIVE feasibility
 * numbers (cost stack · cashflow-plotted finance waterfall · valuation · returns).
 * The old tick-box data export is retired; `lib/exporters` is still on disk if a
 * numbers-only workbook is ever wanted back.
 */
export default function ProjectExportPanel({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { projects } = useStore()
  const project = projects.find(p => p.id === projectId)
  const [busy, setBusy] = useState<null | 'preview' | 'pdf'>(null)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Live headline figures — the same engine feed the document prints.
  const snap = useMemo(() => {
    try {
      const d = collectImData(projectId)
      const noRevenue = !d.best || d.proj.gdv <= 0
      const M = (n: number) => {
        const a = Math.abs(n)
        if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
        if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
        if (a >= 1e3) return `$${Math.round(n / 1e3)}K`
        return `$${Math.round(n)}`
      }
      return {
        ok: true, noRevenue,
        rows: [
          ['Gross development value', noRevenue ? '—' : M(d.proj.gdv)],
          ['Total development cost', M(d.proj.tdc)],
          ['Development profit', noRevenue ? '—' : M(d.metrics.profit)],
          ['Project IRR', noRevenue || d.metrics.irr == null ? '—' : `${(d.metrics.irr * 100).toFixed(1)}%`],
        ] as [string, string][],
      }
    } catch { return { ok: false, noRevenue: false, rows: [] as [string, string][] } }
  }, [projectId])

  async function openIm(print: boolean) {
    if (busy) return
    // Open the tab SYNCHRONOUSLY inside the click — a window.open after an
    // await has lost the user gesture and every browser blocks it.
    const win = window.open('', '_blank')
    if (win) win.document.write('<title>HORI7ON | 7EVEN — Marketing IM</title><body style="background:#050506;color:#d6b36a;font:12px/1.6 ui-monospace,monospace;letter-spacing:.24em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">Preparing the memorandum…</body>')
    setBusy(print ? 'pdf' : 'preview'); setDone(null); setError(null)
    try {
      const m = await import('../lib/imDocument')
      m.openImDocument(projectId, print, win)
      setDone(print ? 'Print dialog opened — choose “Save as PDF”' : 'Memorandum opened in a new tab')
    } catch (e) {
      try { win?.close() } catch { /* ignore */ }
      setError(`Export failed — ${e instanceof Error ? e.message : String(e)}`)
      console.error('[im]', e)
    } finally {
      setBusy(null)
      setTimeout(() => { setDone(null); setError(null) }, 7000)
    }
  }

  const contents = [
    ['01', 'Cover', 'Hero plate, strategy and headline value'],
    ['02', 'The deal', "Figures at a glance, contents and editor's note"],
    ['03', 'The vision', 'The idea, the address, the offer'],
    ['04', 'The life', 'Amenity and the ground plane'],
    ['05', 'The scheme', 'Live area schedule — NSA · GFA · GBA'],
    ['06', 'The feasibility', 'Full cost ledger, valuation and returns'],
    ['07', 'The capital', 'Tranche stack, peak debt and finance cost'],
    ['08', 'The case', 'Why this deal, now'],
    ['09', 'Partner with 7EVEN', 'Contact and disclaimer'],
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Masthead */}
        <p style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 12 }}>Capital raising · Marketing</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap', marginBottom: 12 }}>
          <img src="/hori7on-gold.png" alt="HORI7ON" style={{ height: 15, width: 'auto' }} />
          <span style={{ color: '#5a5e63', fontSize: 13 }}>|</span>
          <img src="/seven-mark-white-hd.png" alt="7EVEN" style={{ height: 15, width: 'auto' }} />
          <span style={{ color: '#5a5e63', fontSize: 13 }}>|</span>
          <span style={{ color: '#F0EFED', fontSize: 13, letterSpacing: '0.26em', textTransform: 'uppercase', fontWeight: 600 }}>Marketing IM</span>
        </div>
        <h2 style={{ color: '#F0EFED', fontFamily: "'Cormorant Garamond',Georgia,serif", fontWeight: 400, fontSize: 30, letterSpacing: '0.01em', margin: '0 0 10px' }}>
          {projectName}
        </h2>
        <p style={{ color: '#8a8e93', fontSize: 12, lineHeight: 1.7, margin: 0, maxWidth: 620 }}>
          The editorial investment memorandum — HORI7ON imagery in the 7EVEN issue design, carrying this
          project's <b style={{ color: '#D8D6D2', fontWeight: 600 }}>live feasibility numbers</b>: cost stack,
          cashflow-plotted finance waterfall, valuation, profit and IRR. Nine A4 pages, print-ready.
          Every figure is read from the model at the moment you export — nothing is typed twice.
        </p>

        {/* Live figures the document will carry */}
        {snap.ok && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: '#141414', border: '1px solid #1c1c1c', marginTop: 26 }}>
            {snap.rows.map(([l, v]) => (
              <div key={l} style={{ background: 'rgba(8,8,8,0.9)', padding: '15px 16px' }}>
                <div style={{ color: '#6a6e73', fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
                <div style={{ color: v === '—' ? '#5a5e63' : '#fff', fontFamily: "'JetBrains Mono',monospace", fontSize: 17, marginTop: 7 }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {snap.noRevenue && (
          <div style={{ border: '1px solid rgba(214,179,106,.4)', background: 'rgba(214,179,106,.06)', padding: '13px 16px', marginTop: 14 }}>
            <span style={{ color: '#C4973A', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 600 }}>Revenue model pending</span>
            <div style={{ color: '#9a978f', fontSize: 11, lineHeight: 1.65, marginTop: 6 }}>
              No revenue scenario is entered for this project, so the memorandum shows “—” for valuation, profit
              and returns and says why. The cost side is live and complete. Add a Product Mix scenario to populate it fully.
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
          <button
            onClick={() => openIm(false)} disabled={busy !== null}
            className="glass-btn"
            style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, padding: '15px 30px', color: '#d6b36a', border: '1px solid rgba(214,179,106,.55)' }}>
            {busy === 'preview' ? 'Opening…' : '◇ Preview'}
          </button>
          <button
            onClick={() => openIm(true)} disabled={busy !== null}
            className="glass-btn glass-btn-gold"
            style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, padding: '15px 30px' }}>
            {busy === 'pdf' ? 'Preparing…' : '⤓ Export IM · PDF'}
          </button>
          <div style={{ flex: 1 }} />
          {done && <span style={{ color: '#3DAA6A', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>✓ {done}</span>}
          {error && <span style={{ color: '#D4553E', fontSize: 10.5, maxWidth: 380 }}>{error}</span>}
        </div>
        <div style={{ color: '#4a4e53', fontSize: 10, marginTop: 10 }}>
          In the print dialog choose <b style={{ color: '#7a7e83' }}>Save as PDF</b>, A4 portrait, background graphics on.
        </div>

        {/* Contents */}
        <div style={{ marginTop: 36, borderTop: '1px solid #141414', paddingTop: 24 }}>
          <p style={{ color: '#6a6e73', fontSize: 8.5, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 16 }}>What's in the document</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '14px 26px' }}>
            {contents.map(([n, t, s]) => (
              <div key={n} style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: '#C4973A', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, flexShrink: 0, paddingTop: 2 }}>{n}</span>
                <div>
                  <div style={{ color: '#D8D6D2', fontSize: 12, fontWeight: 500 }}>{t}</div>
                  <div style={{ color: '#5a5e63', fontSize: 10.5, lineHeight: 1.5, marginTop: 2 }}>{s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: '#3a3e43', fontSize: 9.5, marginTop: 28, letterSpacing: '0.04em' }}>
          {project?.address ? `${project.address} · ` : ''}Confidential — by invitation. Figures are live model outputs as at export.
        </div>
      </div>
    </div>
  )
}
