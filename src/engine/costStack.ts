export interface InKindLineItem {
  label: string
  gfa: number
  ratePerSqm: number
  note: string
}

export interface CostStackInputs {
  gba: number
  buildRatePerSqm: number
  contingencyPct: number
  prelimsPct: number
  professionalFeesPct: number
  statutoryFixed: number
  financePct: number
  projectManagementFixed: number
  marketingFixed: number
  amenityFitoutFixed: number
  inKindLineItem?: InKindLineItem
}

export interface CostStackResult {
  construction: number
  contingency: number
  prelims: number
  professionalFees: number
  finance: number
  subtotal: number
  inKindCost: number
  totalDevelopmentCost: number
}

export function calculateCostStack(inputs: CostStackInputs): CostStackResult {
  const construction = inputs.gba * inputs.buildRatePerSqm
  const contingency = construction * inputs.contingencyPct
  const prelims = construction * inputs.prelimsPct
  const professionalFees = construction * inputs.professionalFeesPct
  const finance = construction * inputs.financePct
  const subtotal =
    construction +
    contingency +
    prelims +
    professionalFees +
    inputs.statutoryFixed +
    finance +
    inputs.projectManagementFixed +
    inputs.marketingFixed +
    inputs.amenityFitoutFixed
  const inKindCost = inputs.inKindLineItem
    ? inputs.inKindLineItem.gfa * inputs.inKindLineItem.ratePerSqm
    : 0
  const totalDevelopmentCost = subtotal + inKindCost
  return { construction, contingency, prelims, professionalFees, finance, subtotal, inKindCost, totalDevelopmentCost }
}
