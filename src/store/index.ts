import { create } from 'zustand'
import type { Project, SiteDesign, MixScenario, UnitType, CostStack, BTRAssumptions, BTSAssumptions, HotelAssumptions, LandTerms } from '../db/schema'
import * as db from '../db'

interface AppState {
  projects: Project[]
  activeProjectId: string | null
  activeScenarioId: string | null
  activeTab: string

  // Actions
  loadProjects: () => void
  setActiveProject: (id: string | null) => void
  setActiveScenario: (id: string | null) => void
  setActiveTab: (tab: string) => void
  createProject: (name: string, address: string, brand?: '7even' | 'haavn') => Project
  updateProject: (project: Project) => void
  deleteProject: (id: string) => void

  // Derived helpers (read from db on demand)
  getSiteDesign: (projectId: string) => SiteDesign
  saveSiteDesign: (data: SiteDesign) => void
  getLandTerms: (projectId: string) => LandTerms
  saveLandTerms: (data: LandTerms) => void
  getEffectiveLandCost: (projectId: string) => number
  getMixScenarios: (projectId: string) => MixScenario[]
  createMixScenario: (projectId: string, name: string) => MixScenario
  getUnitTypes: (scenarioId: string) => UnitType[]
  saveUnitTypes: (scenarioId: string, units: UnitType[]) => void
  getCostStack: (projectId: string) => CostStack
  saveCostStack: (data: CostStack) => void
  getDetailedCostStack: (projectId: string) => import('../db/schema').DetailedCostStack
  saveDetailedCostStack: (data: import('../db/schema').DetailedCostStack) => void
  getBTRAssumptions: (scenarioId: string) => BTRAssumptions
  saveBTRAssumptions: (data: BTRAssumptions) => void
  getBTSAssumptions: (scenarioId: string) => BTSAssumptions
  saveBTSAssumptions: (data: BTSAssumptions) => void
  getHotelAssumptions: (scenarioId: string) => HotelAssumptions
  saveHotelAssumptions: (data: HotelAssumptions) => void
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  activeScenarioId: null,
  activeTab: 'site',

  loadProjects: () => {
    set({ projects: db.getProjects().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) })
  },

  setActiveProject: (id) => set({ activeProjectId: id, activeScenarioId: null, activeTab: 'site' }),
  setActiveScenario: (id) => set({ activeScenarioId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  createProject: (name, address, brand = '7even') => {
    const project: Project = {
      id: db.generateId(),
      name,
      address,
      suburb: '',
      state: 'VIC',
      zone: '',
      responsibleAuthority: '',
      status: 'active',
      brand,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    db.saveProject(project)
    get().loadProjects()
    return project
  },

  updateProject: (project) => {
    db.saveProject(project)
    get().loadProjects()
  },

  deleteProject: (id) => {
    db.deleteProject(id)
    set({ activeProjectId: null })
    get().loadProjects()
  },

  getSiteDesign: (projectId) => db.getSiteDesign(projectId),
  saveSiteDesign: (data) => { db.saveSiteDesign(data); get().loadProjects() },

  getLandTerms: (projectId) => db.getLandTerms(projectId),
  getEffectiveLandCost: (projectId) => db.getEffectiveLandCost(projectId),
  saveLandTerms: (data) => { db.saveLandTerms(data); get().loadProjects() },

  getMixScenarios: (projectId) => db.getMixScenarios(projectId),

  createMixScenario: (projectId, name) => {
    const scenario: MixScenario = {
      id: db.generateId(),
      projectId,
      name,
      createdAt: new Date().toISOString(),
    }
    db.saveMixScenario(scenario)
    return scenario
  },

  getUnitTypes: (scenarioId) => db.getUnitTypes(scenarioId),
  saveUnitTypes: (scenarioId, units) => db.saveUnitTypes(scenarioId, units),

  getCostStack: (projectId) => db.getCostStack(projectId),
  saveCostStack: (data) => { db.saveCostStack(data); get().loadProjects() },
  getDetailedCostStack: (projectId) => db.getDetailedCostStack(projectId),
  saveDetailedCostStack: (data) => { db.saveDetailedCostStack(data) },

  getBTRAssumptions: (scenarioId) => db.getBTRAssumptions(scenarioId),
  saveBTRAssumptions: (data) => db.saveBTRAssumptions(data),

  getBTSAssumptions: (scenarioId) => db.getBTSAssumptions(scenarioId),
  saveBTSAssumptions: (data) => db.saveBTSAssumptions(data),

  getHotelAssumptions: (scenarioId) => db.getHotelAssumptions(scenarioId),
  saveHotelAssumptions: (data) => db.saveHotelAssumptions(data),
}))
