import React, { type CSSProperties, useState, useEffect } from 'react'
import { useStore } from '../store'
import { Wordmark, TabBar, Project7Mark } from '../components/ui'
import { useRole, EXTERNAL_TABS } from '../lib/role'
import SiteDesignTab from './tabs/SiteDesign'
import LandTermsTab from './tabs/LandTerms'
import ProductMixTab from './tabs/ProductMix'
import CostStackTab from './tabs/CostStackTab'
import FinanceTab from './tabs/FinanceTab'
import BTRTab from './tabs/BTRTab'
import BTSTab from './tabs/BTSTab'
import HotelTab from './tabs/HotelTab'
import ScenarioComparison from './tabs/ScenarioComparison'
import SummaryTab from './tabs/SummaryTab'
import ProjectDashboard from './tabs/ProjectDashboard'
import ProjectTimeline from './tabs/ProjectTimeline'

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
  { id: 'finance', label: 'Finance' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'btr', label: 'BTR' },
  { id: 'bts', label: 'BTS' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'compare', label: 'Compare' },
  { id: 'summary', label: 'Summary' },
  { id: 'insights', label: 'Dashboard' },
]

export default function ProjectWorkspace() {
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
    <div className="ws-root flex flex-col h-full">
      {/* Topbar — z-50 keeps it above fixed tab backgrounds */}
      <div className="ws-topbar drag-region relative z-50 flex items-center gap-4 md:gap-8 px-4 md:px-8 py-3 md:py-4 border-b border-[#1C1C1C]"
        style={{ background: 'linear-gradient(rgba(8,8,8,0.78), rgba(8,8,8,0.84)), url(/home-bg.jpg) center / cover no-repeat, #0A0A0A' }}>
        <div className="flex items-center justify-center flex-shrink-0" style={{ minWidth: 80 }}>
          <button
            onClick={() => setActiveProject(null)}
            className="no-drag text-white hover:text-[#C4973A] transition-colors text-[11px] tracking-[0.25em] cursor-pointer uppercase font-bold"
          >
            MENU
          </button>
        </div>
        <div className="w-[1px] h-7 bg-[#2A2A2A] flex-shrink-0 hidden sm:block" />
        <span className="hidden sm:block"><Wordmark size="sm" /></span>
        <div className="w-[1px] h-7 bg-[#2A2A2A] flex-shrink-0 hidden sm:block" />
        <div className="flex-1 min-w-0 hidden sm:block">
          <div className="flex items-center gap-2">
            <WorkspaceStatusDot type={project.type} status={project.status} />
            <h1 className="font-heading font-semibold text-white text-[14px] md:text-[16px] tracking-[0.08em] truncate">{project.name}</h1>
          </div>
          {project.address && <p className="text-[#606060] text-[11px] md:text-[12px] truncate tracking-[0.12em] mt-0.5 font-medium">{project.address}</p>}
        </div>
        <div className="flex-1 min-w-0 sm:hidden">
          <div className="flex items-center gap-2">
            <WorkspaceStatusDot type={project.type} status={project.status} />
            <h1 className="font-heading font-semibold text-white text-[13px] tracking-[0.06em] truncate">{project.name}</h1>
          </div>
        </div>
        {role === 'external' && (
          <span style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C4973A44', border: '1px solid #C4973A22', padding: '3px 8px', flexShrink: 0 }}>
            Consultant
          </span>
        )}
      </div>

      {/* Tabs — z-40 keeps it above fixed tab backgrounds */}
      <div className="relative z-40">
        <TabBar
          tabs={visibleTabs}
          active={safeTab}
          onChange={setActiveTab}
          accentTabId={project.type === 'hotel' ? 'hotel' : project.type === 'btr' ? 'btr' : project.type === 'bts' ? 'bts' : undefined}
          accentColor={project.type === 'hotel' ? '#A855F7' : project.type === 'btr' ? '#22C55E' : project.type === 'bts' ? '#3B82F6' : undefined}
          goldTabId="insights"
        />
      </div>

      {/* Tab content — relative so absolute render-bg-fixed divs work on iOS */}
      <div className="flex-1 overflow-auto workspace-content relative" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {activeTab === 'site' && <SiteDesignTab projectId={project.id} />}
        {activeTab === 'land' && <LandTermsTab projectId={project.id} />}
        {activeTab === 'mix' && <ProductMixTab projectId={project.id} />}
        {activeTab === 'cost' && <CostStackTab projectId={project.id} />}
        {activeTab === 'finance' && <FinanceTab projectId={project.id} />}
        {activeTab === 'btr' && <BTRTab projectId={project.id} />}
        {activeTab === 'bts' && <BTSTab projectId={project.id} />}
        {activeTab === 'hotel' && <HotelTab projectId={project.id} />}
        {activeTab === 'compare' && <ScenarioComparison projectId={project.id} />}
        {activeTab === 'summary' && <SummaryTab projectId={project.id} />}
        {activeTab === 'insights' && <ProjectDashboard projectId={project.id} />}
        {activeTab === 'timeline' && <ProjectTimeline projectId={project.id} />}
      </div>

      <Project7Mark size={58} bottom={12} right={16} />
    </div>
  )
}
