/**
 * HAAVN St Village Preston · BTR
 * Complete Cost Stack data from HAAVN_Design_Review_2.html
 * Populated with all line items across all 6 sub-tabs
 */

import type { CostLineItem } from './schema'

// ── CONSTRUCTION — CFO catalogue (Cost_Stack_Grouped.xlsx). Flat, units mode.
export const HAAVN_CONSTRUCTION: CostLineItem[] = [
  'Construction Costs | Basement (s)',
  'Construction Costs | Apartment',
  'Construction Costs | Cold Shell',
  'Construction Costs | Common Area',
  'Construction Costs | Ammenities',
  'Construction Costs | Balconies',
  'Construction Costs | External Works',
  'Construction Costs | Commercial Fit Out',
  'Demolition | Temporary Works',
  'Demolition | Hard Works',
  'Contingency',
].map((label, i): CostLineItem => ({ id: `construction-${i}`, label, amount: 0, notes: '', sCurve: 'scurve', fundedBy: 'equity', gstFree: false }))
//    Amounts start blank; the CFO/DM fills them per project. Grouping is by `notes`.
const CONSULTANT_CATALOGUE: [string, string[]][] = [
  ['Acoustic Engineer', ['Planning', 'Schematic', 'Construction']],
  ['Arborist', ['Planning', 'Project Arobrist']],
  ['Architect', ['Feasibility DPO', 'Master Planning DPO', 'Feasibility Permit', 'Master Planning Permit', '50% Sketch Design - Planning Lodgment', '100% Sketch Design – Balance', '50% Design Development - Marketing/GMP', '100% Design Development - Tender', 'Construction Documentation', 'Construction Services']],
  ['Audio Visual', ['Schematic', 'Construction drawings']],
  ['BIM', ['Management | Design Stage', 'Management | Construction Stage']],
  ['Building Surveyor', ['BCA Review', 'Construction']],
  ['Services and Infrastructure Report', ['Town Planning']],
  ['Flooding and Stormwater Management Plan', ['Town Planning']],
  ['Civil Eng', ['Design Development', 'Construction Drawings']],
  ['Cultural Heritage', ['CHMP', 'Project CH Review']],
  ['DDA', ['Town Plannng', 'Design Development']],
  ['Demolition', ['Permit and Documents']],
  ['Enviromental', []],
  ['End of Trip', ['Scope', 'Documentation']],
  ['ESD', ['Town Planning', 'JV3 Green Star']],
  ['Facade Eng', ['Town Planning', 'Design Development', 'Construction Drawings']],
  ['Fire Engineering', ['Schematic', 'FEB', 'FER', 'Construction']],
  ['Geotechnical Engineer', ['Report', 'Acid Sulphate']],
  ['Heritage', ['Town Planning', 'Design Development', 'Construction Services']],
  ['Housing Diversity Report', []],
  ['Hotel Management', ['Feasability', 'Operator Selection']],
  ['Intergrated Comms', ['Schematic', 'Design development', 'Construction']],
  ['Interior Design', ['Schematic', 'Marketing', 'Design Development', 'Construction']],
  ['Investigations', ['HAZMAT testing']],
  ['Land Surveyor', ['Feature & Level Survey', 'Title Re-establishment Survey', 'Plan of Subdivision', 'Subdivision Certification Process']],
  ['Landscape', ['DPO', 'Town Planning Submissiom', 'Design Development', 'Contract Documentation', 'Construction Services', 'Defect Liability Period']],
  ['Legal', ['Head Contracts', 'Sales Contract']],
  ['Project Management', ['Design Stage', 'Construction']],
  ['Quanitiy Surveyor', ['initial Report', 'Monthly Claims']],
  ['Security', ['Scope', 'Documentation']],
  ['Specialist Lighting', ['Schematic', 'Design Development']],
  ['Specialist Engineer', ['FP 1.4', 'Zero Fall', 'Threshold']],
  ['Seismic', ['Report']],
  ['Service Diversion', ['Design', 'Construction Services']],
  ['Services', ['Schematic', 'Design Development', 'Construction Drawings', 'Construction Services']],
  ['Structural Eng', ['Schematic', 'Design Development', 'Construction Drawings', 'Construction Services']],
  ['Superintendent', ['Monthly Reporting']],
  ['Technology', ['Program Writing']],
  ['Temporary Works Engineering', []],
  ['Town Planner', ['Strategy & Approval Process', 'Project Team Appointment & Design Inputs', 'DFP Engagement', 'Lodgement DPO / TP', 'RFI DPO / TPO']],
  ['Traffic Management', ['Town Planning', 'CMP']],
  ['Urban Design', ['Concept & Development Plan Scoping', 'Development Plan Preparation', 'TP Application Support *Refer to Fee Proposal']],
  ['VCAT', ['Expert Witness', 'Legal', 'Town Planner']],
  ['Waste Management', ['Town Planning']],
  ['Way Finding and Signage', ['Scope', 'Documents']],
  ['Wind', ['Town Planing', 'Design Development']],
  ['Contingency', []],
]

const catId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// A category with no listed sub-items becomes a single line named after the category.
export const HAAVN_CONSULTANTS: CostLineItem[] = CONSULTANT_CATALOGUE.flatMap(([cat, items]) =>
  (items.length ? items : [cat]).map((label, i): CostLineItem => ({
    id: `cons-${catId(cat)}-${i}`,
    label,
    amount: 0,
    notes: cat,
    sCurve: 'scurve',
    fundedBy: 'equity',
    gstFree: false,
  }))
)

// ── STATUTORY — CFO catalogue (Cost_Stack_Grouped.xlsx). Flat list, amounts blank.
export const HAAVN_STATUTORY: CostLineItem[] = [
  'Asset Protection Bond | Demo',
  'Asset Protection Bond | Construction',
  'Building Application Fee',
  'Metropolitan Planning Levy',
  'Open Space Contribution',
  'Planning Application Fee',
  'Subdivision Costs',
  'Development Contribution | Residential',
  'Development Contribution | Commercial',
  'Tenant Relocation',
].map((label, i): CostLineItem => ({ id: `stat-${i}`, label, amount: 0, notes: '', sCurve: 'scurve', fundedBy: 'equity', gstFree: true }))

// ── HEADWORKS & ENVIRO — CFO catalogue. Flat, amounts blank.
export const HAAVN_HEADWORKS: CostLineItem[] = [
  'Asset Relocation | Headworks',
  'Enviro Consultant | Soil Classification',
  'Enviro Consultant | PSI and Sampling',
  'Enviro Consultant | Assess and monitoring',
  'Enviro Consultant | Site Remediation',
  'Enviro Consultant | Assessment',
  'Enviromental Auditor | Assessment',
  'Enviromental Auditor | Site Review',
  'Enviromental Auditor | Final Assessment',
  'Gas | Application',
  'NBN / Comms | Application',
  'Power Application | Site Power',
  'Power Application | Powerline Change',
  'Sewer and Water | Application',
  'Sewer and Water | PIC',
  'Sewer Manhole | CMP and Permits',
  'Sewer Manhole | Site works',
  'Storm Water | Connection',
  'Storm Water | Diversion',
  'Substation | Design',
  'Substation | Works',
].map((label, i): CostLineItem => ({ id: `headworks-${i}`, label, amount: 0, notes: '', sCurve: 'scurve', fundedBy: 'equity', gstFree: false }))
// ── MANAGEMENT — CFO catalogue. Flat, amounts blank.
export const HAAVN_MANAGEMENT: CostLineItem[] = [
  'Administration Management',
  'Accounting Management',
  'Legal Management',
  'Marketing Management',
  'Development Management',
].map((label, i): CostLineItem => ({ id: `management-${i}`, label, amount: 0, notes: '', sCurve: 'scurve', fundedBy: 'equity', gstFree: false }))
// ── MARKETING (3 groups, $166.4K) ─────────────────────────────────────
export const HAAVN_MARKETING: CostLineItem[] = [
  // Marketing collateral (4 items)
  {
    id: 'mkt-renders-draft',
    label: 'Marketing — renders drafts',
    amount: 45_000,
    notes: 'Collateral',
    sCurve: 'upfront',
    fundedBy: 'equity',
    phase: 'acqplan',
    startDate: '2026-03',
    endDate: '2026-06',
    gstFree: false,
  },
  {
    id: 'mkt-renders-final',
    label: 'Marketing — renders final',
    amount: 85_000,
    notes: 'Collateral',
    sCurve: 'upfront',
    fundedBy: 'equity',
    phase: 'preconst',
    startDate: '2026-10',
    endDate: '2027-01',
    gstFree: false,
  },
  {
    id: 'mkt-website',
    label: 'Marketing — website',
    amount: 28_000,
    notes: 'Collateral',
    sCurve: 'upfront',
    fundedBy: 'equity',
    phase: 'preconst',
    startDate: '2026-10',
    endDate: '2026-11',
    gstFree: false,
  },
  {
    id: 'mkt-website-hosting',
    label: 'Marketing — website hosting',
    amount: 8_400,
    notes: 'Collateral',
    sCurve: 'linear',
    fundedBy: 'equity',
    phase: 'allphases',
    startDate: '2026-10',
    endDate: '2029-03',
    gstFree: false,
  },

  // Display suite (optional — not yet costed)
  // Advertising (optional — not yet costed)
]
