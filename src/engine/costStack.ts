import { gstIncluded } from './gst'

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
  // JW: regional loading layers the locational cost impact on top of the standard
  // build rate; POS is a Public Open Space contribution set as a % of land value.
  // `landCost` is the cash land value used as the POS base when not in-kind.
  regionalLoadingPct?: number
  posContributionPct?: number
  landCost?: number
  // ── Itemised Cost Stack overrides (hybrid feasibility) ──
  // When the CFO itemises a section, its total overrides the top-down figure:
  //   constructionOverride     → all-in hard build cost (contingency & prelims
  //                              are treated as included, so not re-added)
  //   professionalFeesOverride → itemised Consultant & Professional fees
  // Statutory / management / marketing flow through the existing fixed fields.
  constructionOverride?: number
  professionalFeesOverride?: number
  // Costs are entered GST-inclusive; when enabled, GST on the commercial/
  // consultant lines is claimed back as input tax credits and TDC is net of
  // those credits. Statutory (GST-free), finance (input-taxed) and in-kind
  // (land consideration) carry no GST.
  gstEnabled?: boolean
}

export interface CostStackResult {
  construction: number
  contingency: number
  prelims: number
  professionalFees: number
  finance: number
  /** Public Open Space contribution (0 unless a % is set) */
  posContribution: number
  subtotal: number
  inKindCost: number
  /** Input tax credits claimed back on GST-able cost lines (0 when GST off) */
  gstCredits: number
  totalDevelopmentCost: number
}

export function calculateCostStack(inputs: CostStackInputs): CostStackResult {
  // Standard build rate held constant; regional loading layered on top. When the
  // CFO itemises Construction, that all-in total overrides the top-down build and
  // already carries its own contingency/prelims lines (so those are not re-added).
  const itemisedBuild = inputs.constructionOverride != null && inputs.constructionOverride > 0
  const construction = itemisedBuild
    ? inputs.constructionOverride!
    : inputs.gba * inputs.buildRatePerSqm * (1 + (inputs.regionalLoadingPct ?? 0))
  const contingency = itemisedBuild ? 0 : construction * inputs.contingencyPct
  const prelims = itemisedBuild ? 0 : construction * inputs.prelimsPct
  const professionalFees = inputs.professionalFeesOverride != null && inputs.professionalFeesOverride > 0
    ? inputs.professionalFeesOverride
    : construction * inputs.professionalFeesPct
  const finance = construction * inputs.financePct
  const inKindCost = inputs.inKindLineItem
    ? inputs.inKindLineItem.gfa * inputs.inKindLineItem.ratePerSqm
    : 0
  // POS = % of land value (in-kind consideration when in-kind, else cash landCost).
  const landValue = inKindCost > 0 ? inKindCost : (inputs.landCost ?? 0)
  const posContribution = (inputs.posContributionPct ?? 0) * landValue
  const subtotal =
    construction +
    contingency +
    prelims +
    professionalFees +
    inputs.statutoryFixed +
    posContribution +
    finance +
    inputs.projectManagementFixed +
    inputs.marketingFixed +
    inputs.amenityFitoutFixed
  const gstableCosts =
    construction +
    contingency +
    prelims +
    professionalFees +
    inputs.projectManagementFixed +
    inputs.marketingFixed +
    inputs.amenityFitoutFixed
  const gstCredits = inputs.gstEnabled ? gstIncluded(gstableCosts) : 0
  const totalDevelopmentCost = subtotal + inKindCost - gstCredits
  return { construction, contingency, prelims, professionalFees, finance, posContribution, subtotal, inKindCost, gstCredits, totalDevelopmentCost }
}
