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

function dotColor(type?: string, status?: string) {
  if (status === 'on-hold') return '#EF4444'
  if (status === 'pending') return '#EAB308'
  switch (type) {
    case 'hotel': return '#A855F7'
    case 'btr':   return '#22C55E'
    case 'bts':   return '#3B82F6'
    default:      return '#C4973A'
  }
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
  { id: 'cashflow', label: 'Cashflow' },
  { id: 'finance', label: 'Finance' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'btr', label: 'BTR' },
  { id: 'bts', label: 'BTS' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'compare', label: 'Compare' },
  { id: 'summary', label: 'Summary' },
  { id: 'insights', label: 'Dashboard' },
]

// Every project tab floats in a card hovering over the dark texture.
const PREMIUM_TABS = ['site', 'land', 'mix', 'cost', 'cashflow', 'finance', 'timeline', 'btr', 'bts', 'hotel', 'compare', 'summary', 'insights']

export default function ProjectWorkspace({ onManage, onLogout, theme = 'light' }: { onManage?: () => void; onLogout?: () => void; theme?: 'light' | 'blk' }) {
  const { activeProjectId, activeTab, setActiveTab, setActiveProject, projects } = useStore()
  const role = useRole()
  const project = projects.find(p => p.id === activeProjectId)

  if (!project) return null

  const visibleTabs = role === 'external'
    ? TABS.filter(t => EXTERNAL_TABS.includes(t.id))
    : TABS

  // If current tab is not visible (e.g. after role switch), reset to first allowed
  const safeTab = visibleTabs.find(t => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? 'site'

  return (
    <div className={`ws-root flex flex-col h-full ${theme === 'blk' ? 'theme-blk' : ''}`}>
      {/* Header — floats as a rounded panel over the texture on premium tabs */}
      <div className={PREMIUM_TABS.includes(safeTab) ? 'ws-header-float relative z-50' : 'contents'}>
      {/* Topbar */}
      <div className="ws-topbar drag-region relative z-50 flex items-center gap-4 md:gap-8 px-4 md:px-8 py-3 md:py-4 border-b border-[#1C1C1C]"
        style={{ background: PREMIUM_TABS.includes(safeTab)
          ? 'linear-gradient(rgba(238,236,232,0.74), rgba(224,221,216,0.80)), url(/header-bg.jpg) center / cover no-repeat, #ECEAE6'
          : 'linear-gradient(rgba(8,8,8,0.78), rgba(8,8,8,0.84)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A' }}>
        <div className="flex items-center justify-center flex-shrink-0" style={{ minWidth: 80 }}>
          <button
            onClick={() => setActiveProject(null)}
            className="no-drag text-[#1A1A1A] hover:text-[#8A6A28] transition-colors text-[11px] tracking-[0.25em] cursor-pointer uppercase font-bold"
          >
            HOME
          </button>
        </div>
        <div className="w-[1px] h-7 bg-[#C4C0B8] flex-shrink-0 hidden sm:block" />
        <span className="hidden sm:block"><Wordmark size="md" tone="black" /></span>
        <div className="w-[1px] h-7 bg-[#C4C0B8] flex-shrink-0 hidden sm:block" />
        <div className="flex-1 min-w-0 hidden sm:block">
          <div className="flex items-center gap-2">
            <WorkspaceStatusDot type={project.type} status={project.status} />
            <h1 className="font-heading font-semibold text-[#1A1A1A] text-[14px] md:text-[16px] tracking-[0.08em] truncate">{project.name}</h1>
          </div>
          {project.address && (
            <p className="text-[#606060] text-[11px] md:text-[12px] truncate tracking-[0.12em] mt-0.5 font-medium flex items-center gap-1.5">
              {project.address}<AutoSaveCloud />
            </p>
          )}
        </div>
        <div className="flex-1 min-w-0 sm:hidden">
          <div className="flex items-center gap-2">
            <WorkspaceStatusDot type={project.type} status={project.status} />
            <h1 className="font-heading font-semibold text-[#1A1A1A] text-[13px] tracking-[0.06em] truncate">{project.name}</h1>
          </div>
        </div>
        {role === 'external' && (
          <span style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C4973A44', border: '1px solid #C4973A22', padding: '3px 8px', flexShrink: 0 }}>
            Consultant
          </span>
        )}
        {/* Dashboard · Manage — compact glass icon buttons */}
        <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto', marginRight: 19 }}>
          {role !== 'external' && (
            <button onClick={() => setActiveTab('insights')} title="Dashboard" aria-label="Dashboard"
              className={activeTab === 'insights' ? 'ws-bento-btn ws-bento-btn-on' : 'ws-bento-btn'}>
              {/* Bento dashboard glyph — chrome shiny-black stealth tiles (latest design) */}
              <svg width="15" height="15" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="bentoChrome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6A6A6E" />
                    <stop offset="16%" stopColor="#2C2C30" />
                    <stop offset="52%" stopColor="#0A0A0C" />
                    <stop offset="100%" stopColor="#000000" />
                  </linearGradient>
                </defs>
                <rect x="4" y="4" width="7" height="9" rx="1.6" />
                <rect x="4" y="15" width="7" height="5" rx="1.6" />
                <rect x="13" y="4" width="7" height="5" rx="1.6" />
                <rect x="13" y="11" width="7" height="9" rx="1.6" />
              </svg>
            </button>
          )}
          {onManage && (
            <button className="ws-bento-btn" onClick={onManage} title="Manage" aria-label="Manage">
              {/* Black-gloss "M" inside the soft grey glass square */}
              <svg width="17" height="17" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="bentoChromeM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6A6A6E" />
                    <stop offset="16%" stopColor="#2C2C30" />
                    <stop offset="52%" stopColor="#0A0A0C" />
                    <stop offset="100%" stopColor="#000000" />
                  </linearGradient>
                </defs>
                <text x="12" y="18.5" textAnchor="middle" fontFamily="'Optima','Gill Sans',serif" fontSize="20" fontWeight="800" fill="url(#bentoChromeM)">M</text>
              </svg>
            </button>
          )}
          {/* Consultants have no Manage screen — keep a direct Log Out for them */}
          {!onManage && onLogout && (
            <button className="glass-btn glass-btn-light" onClick={onLogout}
              style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 14px', whiteSpace: 'nowrap', fontWeight: 700 }}>
              Log Out
            </button>
          )}
        </div>
      </div>

      {/* Tabs — z-40 keeps it above fixed tab backgrounds */}
      <div className="relative z-40">
        <TabBar
          tabs={visibleTabs.filter(t => t.id !== 'insights')}
          active={safeTab}
          onChange={setActiveTab}
          accentTabId={project.type === 'hotel' ? 'hotel' : project.type === 'btr' ? 'btr' : project.type === 'bts' ? 'bts' : undefined}
          accentColor={project.type === 'hotel' ? '#A855F7' : project.type === 'btr' ? '#22C55E' : project.type === 'bts' ? '#3B82F6' : undefined}
        />
      </div>
      </div>{/* /header float */}

      {/* Tab content — relative so absolute render-bg-fixed divs work on iOS */}
      <div className={`flex-1 overflow-auto workspace-content relative ${PREMIUM_TABS.includes(safeTab) ? 'premium-stage' : ''}`} style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
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
          return PREMIUM_TABS.includes(safeTab) ? <div key={safeTab} className="premium-card">{content}</div> : content
        })()}
        {/* Footer — the site links float on the texture below the card */}
        {PREMIUM_TABS.includes(safeTab) && <div className="premium-footer"><SiteLinks /></div>}
      </div>

      <Project7Mark size={58} bottom={12} right={16} />
    </div>
  )
}
