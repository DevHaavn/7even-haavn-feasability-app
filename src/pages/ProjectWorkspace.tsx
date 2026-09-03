import React, { useEffect, useState, type CSSProperties } from 'react'
import { useStore } from '../store'
import { useRole, EXTERNAL_TABS } from '../lib/role'
import SiteDesignTab from './tabs/SiteDesign'
import LandTermsTab from './tabs/LandTerms'
import ProductMixTab from './tabs/ProductMix'
import CostStackTab from './tabs/CostStackTab'
import CashflowTab from './tabs/CashflowTab'
import FinanceTab from './tabs/FinanceTab'
import BTRTab from './tabs/BTRTab'
import BTSTab from './tabs/BTSTab'
import HotelTab from './tabs/HotelTab'
import ScenarioComparison from './tabs/ScenarioComparison'
import SummaryTab from './tabs/SummaryTab'
import ProjectDashboard from './tabs/ProjectDashboard'
import ProjectTimeline from './tabs/ProjectTimeline'
import AutoSaveCloud from '../components/AutoSaveButton'
import { setAtriumTheme } from '../lib/atriumTheme'

function FootClock() {
  const [now, setNow] = useState('--:--:--')
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('en-AU', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="ff-clock">{now}</span>
}

// Status dot — functional only: green = running, amber = pending, red = on-hold.
// It used to colour by project type as well (purple/green/blue, gold default),
// which was decorative rainbow and the last of the old gold left in the chrome.
// No information is lost: the type is already spelled out in the address line
// beside it (e.g. "35 Corio Street … · MIXED").
function dotColor(_type?: string, status?: string) {
  if (status === 'on-hold') return 'var(--red)'
  if (status === 'pending') return 'var(--amber)'
  return 'var(--emerald)'
}

function WorkspaceStatusDot({ type, status }: { type?: string; status?: string }) {
  const color = dotColor(type, status)
  const pulse = status === 'on-hold' || status === 'pending'
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 10, height: 10, flexShrink: 0 }}>
      {pulse && (
        <span style={{ position: 'absolute', borderRadius: '50%', width: 16, height: 16, background: color, opacity: 0.25, animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' } as CSSProperties} />
      )}
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block' }} />
    </span>
  )
}

const TABS = [
  { id: 'site', label: 'Site & Design' },
  { id: 'land', label: 'Land & Terms' },
  { id: 'mix', label: 'Product Mix' },
  { id: 'cost', label: 'Cost Stack' },
  { id: 'finance', label: 'Finance' },
  { id: 'cashflow', label: 'Cash Flow' },
  { id: 'timeline', label: 'Timeline' },
  // BTR / BTS / Hotel / Compare now live as pull-down sub-tabs inside Product Mix
  { id: 'summary', label: 'Overview' },
  { id: 'insights', label: 'Dashboard' },
]

// Every project tab floats in a card hovering over the dark texture.
const PREMIUM_TABS = ['site', 'land', 'mix', 'cost', 'cashflow', 'finance', 'timeline', 'btr', 'bts', 'hotel', 'compare', 'summary', 'insights']

export default function ProjectWorkspace({ onManage, onLogout, theme = 'light' }: { onManage?: () => void; onLogout?: () => void; theme?: 'light' | 'blk' }) {
  const { activeProjectId, activeTab, setActiveTab, setActiveProject, projects, createProject } = useStore()
  const role = useRole()
  const project = projects.find(p => p.id === activeProjectId)
  // Quick project switcher — centred glass menu (same system as the workspace menu)
  const [projOpen, setProjOpen] = React.useState(false)
  const [npOpen, setNpOpen] = React.useState(false)
  const [npName, setNpName] = React.useState('')
  const [npAddr, setNpAddr] = React.useState('')

  // Projects always open on the light work surface — the data-heavy tabs are hard to
  // read in dark. The topbar light/dark toggle still lets you switch to dark in-session.
  React.useEffect(() => { setAtriumTheme('light') }, [activeProjectId])

  if (!project) return null

  const visibleTabs = role === 'external'
    ? TABS.filter(t => EXTERNAL_TABS.includes(t.id))
    : TABS

  // If current tab is not visible (e.g. after role switch), reset to first allowed
  const safeTab = visibleTabs.find(t => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? 'site'

  return (
    <div className={`ws-root flex flex-col h-full fxs ${theme === 'blk' ? 'dark' : ''}`}>
      {/* ── Chrome — header + tab bar, always dark (ATRIUM reskin) ── */}
      <div className="fx-topbar drag-region">
        <button className="fx-home no-drag" onClick={() => setActiveProject(null)}>HOME</button>
        <div className="fx-div" />
        <button className="fx-home no-drag" style={{ fontSize: 11, letterSpacing: '0.26em' }} onClick={() => setProjOpen(true)} title="Switch project">PROJECTS</button>
        <div className="fx-div" />
        <div className="fx-proj">
          <div className="fx-projname">
            <WorkspaceStatusDot type={project.type} status={project.status} />
            <span className="fx-nm">{project.name}</span>
            <span className="no-drag" style={{ display: 'inline-flex', alignItems: 'center' }}><AutoSaveCloud /></span>
          </div>
          {project.address && (
            <div className="fx-addr">{project.address}{project.type ? ` · ${project.type.toUpperCase()}` : ''}</div>
          )}
        </div>
        {role === 'external' && (
          <span style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--chrome-dim)', border: '1px solid var(--chrome-line)', padding: '4px 9px', borderRadius: 20, flexShrink: 0 }}>
            Consultant
          </span>
        )}
        <div className="fx-right no-drag">
          <img className="fx-seven" src="/seven-mark-white-hd.png" alt="7EVEN" />
          {onManage && (
            <button className="fx-burger" onClick={onManage} title="Menu" aria-label="Menu"><span /><span /><span /></button>
          )}
          {!onManage && onLogout && (
            <button className="fx-tgl" onClick={onLogout} style={{ fontWeight: 600 }}>LOG OUT</button>
          )}
        </div>
      </div>
      {projOpen && (() => {
        const live = projects.filter(p => p.status !== 'archived' && p.status !== 'deleted')
        const mono = "'JetBrains Mono',monospace"
        const rowS: React.CSSProperties = {
          display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', cursor: 'pointer',
          background: 'transparent', border: '1px solid rgba(255,255,255,0.32)', borderRadius: 2, textAlign: 'left',
          fontFamily: mono, fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff',
          textShadow: '0 1px 8px rgba(0,0,0,.6)', transition: 'all .25s',
        }
        const inpS: React.CSSProperties = {
          flex: 1, minWidth: 0, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.35)',
          color: '#fff', fontFamily: mono, fontSize: 13, letterSpacing: '0.08em', padding: '9px 2px', outline: 'none',
        }
        const doCreate = () => {
          if (!npName.trim()) return
          const p = createProject(npName.trim(), npAddr.trim(), '7even')
          setNpName(''); setNpAddr(''); setNpOpen(false); setProjOpen(false)
          setActiveProject(p.id)
        }
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', background: 'rgba(3,4,5,0.5)', backdropFilter: 'blur(21px)', WebkitBackdropFilter: 'blur(21px)' }}
            onClick={e => { if (e.target === e.currentTarget) setProjOpen(false) }}>
            <div style={{ width: 'min(620px,92vw)', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.44em', textTransform: 'uppercase', color: '#d6b36a', paddingLeft: '0.44em', textShadow: '0 0 8px rgba(244,227,189,.45), 0 0 18px rgba(214,179,106,.28)' }}>Projects</span>
                <button onClick={() => setProjOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', display: 'flex' }}>
                  <span style={{ position: 'relative', display: 'inline-block', width: 24, height: 18 }} aria-hidden>
                    <span style={{ position: 'absolute', top: '50%', left: 0, width: 10.6, height: 18, transform: 'translateY(-50%)', background: '#d6b36a', clipPath: 'polygon(0 0,23% 0,100% 50%,23% 100%,0 100%,77% 50%)', filter: 'brightness(1.3) drop-shadow(0 0 9px rgba(244,227,189,.95)) drop-shadow(0 0 26px rgba(214,179,106,.9))' }} />
                    <span style={{ position: 'absolute', top: '50%', right: 0, width: 10.6, height: 18, transform: 'translateY(-50%)', background: '#d6b36a', clipPath: 'polygon(100% 0,77% 0,0 50%,77% 100%,100% 100%,23% 50%)', filter: 'brightness(1.3) drop-shadow(0 0 9px rgba(244,227,189,.95)) drop-shadow(0 0 26px rgba(214,179,106,.9))' }} />
                  </span>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 8 }}>
                <button style={rowS} onClick={() => { setProjOpen(false); setActiveProject(null) }}>
                  <span style={{ flex: 1 }}>Home — Main App</span><span style={{ color: '#d6b36a' }}>→</span>
                </button>
                <button style={{ ...rowS, borderColor: 'rgba(47,224,122,0.55)', color: '#2fe07a' }} onClick={() => setNpOpen(v => !v)}>
                  <span style={{ flex: 1 }}>+ New Project — Start a New Feasibility</span><span>{npOpen ? '▴' : '▾'}</span>
                </button>
                {npOpen && (
                  <div style={{ border: '1px solid rgba(47,224,122,0.4)', borderRadius: 2, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input style={inpS} placeholder="PROJECT NAME" value={npName} onChange={e => setNpName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doCreate() }} autoFocus />
                    <input style={inpS} placeholder="ADDRESS" value={npAddr} onChange={e => setNpAddr(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doCreate() }} />
                    <button onClick={doCreate} disabled={!npName.trim()}
                      style={{ alignSelf: 'flex-end', fontFamily: mono, fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: npName.trim() ? '#2fe07a' : 'rgba(255,255,255,0.3)', background: 'transparent', border: `1px solid ${npName.trim() ? 'rgba(47,224,122,0.6)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 2, padding: '9px 18px', cursor: npName.trim() ? 'pointer' : 'default' }}>
                      Create &amp; Open →
                    </button>
                  </div>
                )}
                {live.map(p => {
                  const on = p.id === activeProjectId
                  return (
                    <button key={p.id}
                      style={{ ...rowS, borderColor: on ? '#d6b36a' : 'rgba(255,255,255,0.32)', color: on ? '#d6b36a' : '#fff', boxShadow: on ? '0 0 9px rgba(244,227,189,.35), 0 0 22px rgba(214,179,106,.22), inset 0 0 9px rgba(214,179,106,.14)' : 'none' }}
                      onClick={() => { setProjOpen(false); if (!on) setActiveProject(p.id) }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: on ? '#d6b36a' : '#2fe07a', boxShadow: `0 0 8px ${on ? '#d6b36a' : '#2fe07a'}` }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        {p.address && <span style={{ display: 'block', fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'none' }}>{p.address}</span>}
                      </span>
                      <span style={{ color: '#d6b36a' }}>{on ? '●' : '→'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      <div className="fx-tabnav no-drag">
        {visibleTabs.map(t => (
          <button key={t.id} className={`fx-tab ${t.id === safeTab ? 'on' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Tab content — relative so absolute render-bg-fixed divs work on iOS.
          Every tab scrolls, the timeline included: it was overflow-hidden on the
          theory that the Gantt scrolled internally, but the Gantt sizes to its
          content, so its rows past the fold were clipped and unreachable. The
          timeline keeps `card-static` (no rise animation) because that
          animation's transform persists and breaks the Gantt's sticky columns. */}
      <div className={`flex-1 workspace-content relative overflow-auto ${PREMIUM_TABS.includes(safeTab) ? 'premium-stage' : ''}`} style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {(() => {
          const content = (
            <>
              {activeTab === 'site' && <SiteDesignTab projectId={project.id} />}
              {activeTab === 'land' && <LandTermsTab projectId={project.id} />}
              {activeTab === 'mix' && <ProductMixTab projectId={project.id} />}
              {activeTab === 'cost' && <CostStackTab projectId={project.id} />}
              {activeTab === 'cashflow' && <CashflowTab projectId={project.id} />}
              {activeTab === 'finance' && <FinanceTab projectId={project.id} />}
              {activeTab === 'btr' && <BTRTab projectId={project.id} />}
              {activeTab === 'bts' && <BTSTab projectId={project.id} />}
              {activeTab === 'hotel' && <HotelTab projectId={project.id} />}
              {activeTab === 'compare' && <ScenarioComparison projectId={project.id} />}
              {activeTab === 'summary' && <SummaryTab projectId={project.id} />}
              {activeTab === 'insights' && <ProjectDashboard projectId={project.id} />}
              {activeTab === 'timeline' && <ProjectTimeline projectId={project.id} />}
            </>
          )
          // Premium tabs float in a card hovering over the dark texture.
          return PREMIUM_TABS.includes(safeTab) ? <div key={safeTab} className={`premium-card${safeTab === 'timeline' ? ' card-static' : ''}`}>{content}</div> : content
        })()}
      </div>

      {/* ── Fixed one-line footer — main-app style ── */}
      <div className="fx-foot no-drag">
        <div className="ff-hair" />
        <div className="ff-rail">
          <div className="ff-l">
            <button className="ff-atr" onClick={() => setActiveProject(null)}><span className="ff-tri" />ATRIUM</button>
            <span className="ff-vd" />
            <img className="ff-hm" src="/hm-device-white.png" alt="HM" />
            <span className="ff-vd" />
            <img className="ff-hb" src="/haavn-black-logo.png" alt="HAAVN BLACK" />
          </div>
          <div className="ff-c"><span className="ff-livedot" />LIVE&nbsp;&nbsp;<FootClock />&nbsp;·&nbsp;MELBOURNE</div>
          <div className="ff-r">
            <a className="ff-chip" href="https://7even.au" target="_blank" rel="noopener">7EVEN.AU <span className="x">↗</span></a>
            <a className="ff-chip" href="https://www.haavn.au" target="_blank" rel="noopener">HAAVN.AU <span className="x">↗</span></a>
            <button className="ff-chip" onClick={() => window.location.reload()}><span className="ring" />UPDATE</button>
            {onLogout && <button className="ff-chip" onClick={onLogout}>LOG OUT</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
