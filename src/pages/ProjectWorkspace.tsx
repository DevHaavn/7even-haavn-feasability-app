import React, { type CSSProperties } from 'react'
import { useStore } from '../store'
import { Wordmark, TabBar, Project7Mark } from '../components/ui'
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
import SiteLinks from '../components/SiteLinks'
import AutoSaveCloud from '../components/AutoSaveButton'
import ThemeToggle from '../components/ThemeToggle'
import { setAtriumTheme } from '../lib/atriumTheme'

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
  const { activeProjectId, activeTab, setActiveTab, setActiveProject, projects } = useStore()
  const role = useRole()
  const project = projects.find(p => p.id === activeProjectId)

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
        {/* The real 7EVEN · HAAVN mark. The chrome rebuild had replaced the logo
            artwork with hand-typed "7EVEN"/"HAAVN" text, which is not the brand. */}
        <span className="fx-brand"><Wordmark size="md" tone="white" /></span>
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
          <span className="fx-atr">ATRIUM</span>
          <ThemeToggle chrome="dark" />
          {onManage && (
            <button className="fx-grid" onClick={onManage} title="Manage" aria-label="Manage">⊞</button>
          )}
          {!onManage && onLogout && (
            <button className="fx-tgl" onClick={onLogout} style={{ fontWeight: 600 }}>LOG OUT</button>
          )}
        </div>
      </div>
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
        {/* Footer — the site links float on the texture below the card (not on the
            fill-height timeline, which owns the full stage) */}
        {PREMIUM_TABS.includes(safeTab) && safeTab !== 'timeline' && <div className="premium-footer"><SiteLinks tone="light" /></div>}
      </div>

      <Project7Mark size={58} bottom={12} right={16} />
    </div>
  )
}
