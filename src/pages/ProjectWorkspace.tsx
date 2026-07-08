import React, { type CSSProperties, useState, useEffect, useRef } from 'react'
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

export default function ProjectWorkspace({ onManage, onLogout }: { onManage?: () => void; onLogout?: () => void }) {
  const { activeProjectId, activeTab, setActiveTab, setActiveProject, projects } = useStore()
  const role = useRole()
  const project = projects.find(p => p.id === activeProjectId)
  // JB Light (default) / JB BLK (dark-gold) — persisted per browser.
  const [theme, setTheme] = useState<'light' | 'blk'>(() => (localStorage.getItem('jb_theme') as 'light' | 'blk') || 'light')
  const pickTheme = (t: 'light' | 'blk') => { setTheme(t); localStorage.setItem('jb_theme', t) }
  // Manage dropdown — holds Manage Project, theme switch and Log Out (declutters the header)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

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
            MENU
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
          {project.address && <p className="text-[#606060] text-[11px] md:text-[12px] truncate tracking-[0.12em] mt-0.5 font-medium">{project.address}</p>}
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
        {/* Dashboard + Manage menu (Manage Project · theme · Log Out) — decluttered header */}
        <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto', marginRight: 19 }}>
          {role !== 'external' && (
            <button onClick={() => setActiveTab('insights')} title="Dashboard" aria-label="Dashboard"
              style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 12, background: activeTab === 'insights' ? '#000' : '#161616', border: '1px solid rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: activeTab === 'insights' ? '0 2px 10px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.25)', transition: 'background 0.18s, transform 0.15s, box-shadow 0.18s' }}
              onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.transform = 'translateY(-1px)'; t.style.background = '#000' }}
              onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.transform = 'translateY(0)'; t.style.background = activeTab === 'insights' ? '#000' : '#161616' }}>
              {/* Bento dashboard glyph — matches the icon device */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                <rect x="4" y="4" width="7" height="9" rx="1.6" />
                <rect x="4" y="15" width="7" height="5" rx="1.6" />
                <rect x="13" y="4" width="7" height="5" rx="1.6" />
                <rect x="13" y="11" width="7" height="9" rx="1.6" />
              </svg>
            </button>
          )}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button className="glass-btn glass-btn-light" onClick={() => setMenuOpen(v => !v)}
              style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 14px', whiteSpace: 'nowrap', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              ⊞ Manage <span style={{ opacity: 0.6 }}>▾</span>
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300, background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', minWidth: 190, boxShadow: '0 14px 34px rgba(0,0,0,0.6)' }}>
                {onManage && (
                  <button onClick={() => { onManage(); setMenuOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '12px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #1A1A1A', color: '#E4E1DC', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>
                    ⊞ Manage Project
                  </button>
                )}
                <div style={{ padding: '11px 14px 8px' }}>
                  <p style={{ fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666', marginBottom: 8 }}>Colour theme</p>
                  <div className="jb-switch jb-switch-dark">
                    <button className={theme === 'light' ? 'on' : ''} onClick={() => pickTheme('light')}>JB Light</button>
                    <button className={theme === 'blk' ? 'on' : ''} onClick={() => pickTheme('blk')}>JB Blk</button>
                  </div>
                </div>
                {onLogout && (
                  <button onClick={() => { onLogout(); setMenuOpen(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', background: 'transparent', border: 'none', borderTop: '1px solid #1A1A1A', color: '#D08A8A', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}>
                    Log Out
                  </button>
                )}
              </div>
            )}
          </div>
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
