import { calculateStampDuty } from './stampDuty'
import type { LandTerms } from '../db/schema'

export interface LandCostBreakdown {
  dealType: NonNullable<LandTerms['dealType']>
  price: number              // cash purchase price used in the feasibility
  inKindValue: number        // in-kind consideration (GFA × build rate), 0 unless in-kind
  jvValue: number            // land value credited to the JV, 0 unless JV
  considerationValue: number // cash + in-kind + JV — the base for duty & %-commission
  dutiableValue: number      // value duty is assessed on (may differ for in-kind/JV)
  gstCredit: number          // input tax credit recovered on the price
  stampDuty: number
  foreignSurcharge: number   // FPAD — residential only (commercial = 0)
  financeOnTerms: number     // deferred-balance interest / non-credited option fee
  adjustments: number        // rates + water + legal apportioned at settlement
  acquisitionCosts: number   // agent/acquisition fee, legals, accounting, DD
  rebate: number             // vendor rebate (reduces the effective cost)
  total: number              // EFFECTIVE LAND COST — the one downstream number
  effectivePerSqm?: number
  settlementDate: string
  dutyNotes: string[]        // from the duty engine (CIPT etc.)
  flags: string[]            // structure/timing flags (option, margin scheme, …)
}

/**
 * Compose the effective land cost from price + duty + surcharge + finance-on-terms
 * + settlement adjustments − vendor rebate. This is the single auditable figure the
 * Cost Stack, Finance, Compare and Summary tabs consume (via getEffectiveLandCost).
 */
export function computeLandCost(land: LandTerms, gstEnabled: boolean): LandCostBreakdown {
  const dealType = land.dealType ?? (land.isInKind ? 'inkind' : 'standard')

  // COMPOSITIONAL model — no deal structure blocks the common land inputs. Every
  // deal may carry a cash price, stamp duty, settlement adjustments, acquisition
  // costs / commission and a payment schedule; the structure only ADDS its own
  // mechanics (deferred interest, option fee, rebate, in-kind, JV) on top.
  const cashPrice = land.landCost || 0                                     // respected for ALL types (was forced 0 for in-kind, which also zeroed %-commission)
  const inKindValue = land.isInKind ? (land.inKindGFA || 0) * (land.inKindRatePerSqm || 0) : 0
  const jvValue = dealType === 'jv' ? (land.jvLandValue ?? 0) : 0
  // Full consideration given for the land — the base for stamp duty AND for
  // %-based acquisition costs, so a % sales commission applies even on an
  // in-kind or JV deal (previously it was × cash price = 0).
  const considerationValue = cashPrice + inKindValue + jvValue
  const price = cashPrice
  const dutiableValue = considerationValue

  // GST is recoverable only on the CASH portion (in-kind / JV carry no cash GST).
  const gstCredit = !gstEnabled ? 0
    : land.landGst === 'inc'  ? cashPrice / 11
    : land.landGst === 'full' ? cashPrice * 0.10
    : 0
  const grossCash = land.landGst === 'full' ? cashPrice * 1.10 : cashPrice
  const exGstCash = grossCash - gstCredit

  // Stamp duty (+ FPAD) — engine gates FPAD to residential; commercial surcharge = 0.
  const duty = land.applyStampDuty && dutiableValue > 0
    ? calculateStampDuty(land.state, dutiableValue, land.propertyType, { foreignBuyer: land.foreignBuyer })
    : null
  const stampDuty = duty?.duty ?? 0
  const foreignSurcharge = duty?.foreignSurcharge ?? 0

  // Cost of the terms
  let financeOnTerms = 0
  if (dealType === 'deferred') {
    financeOnTerms = (land.deferredAmount ?? 0) * (land.deferredRate ?? 0) * ((land.deferredMonths ?? 0) / 12)
  } else if (dealType === 'option') {
    // Fee credited on exercise = part of price; non-credited = a real sunk terms cost.
    financeOnTerms = land.optionFeeCredited ? 0 : (land.optionFee ?? 0)
  }

  const adjustments = (land.adjRates ?? 0) + (land.adjWater ?? 0) + (land.adjLegal ?? 0)

  // Acquisition costs — agent/acquisition fee, legals, accounting, DD. Each is a
  // fixed $ or a % of the purchase price (the cash price, before GST credit).
  // Acquisition costs / commission — a % rate is of the FULL consideration (not
  // just the cash price), so a sales commission applies on in-kind & JV deals too.
  const acquisitionCosts = (land.acquisitionCosts ?? []).reduce((sum, c) =>
    sum + (c.mode === 'pct' ? (c.pct ?? 0) * considerationValue : (c.amount ?? 0)), 0)

  const rebate = dealType === 'rebate' ? (land.rebateAmount ?? 0) : 0

  // Effective land cost = whole consideration (cash net of GST + in-kind + JV) +
  // duty + terms cost + settlement adjustments + acquisition costs − rebate. The
  // in-kind / JV portions carry no cash outflow, so the finance waterfall (which
  // draws on land.landCost) charges no holding interest on them — an in-kind /
  // at-completion settlement saves the interest, not the cost.
  const total = exGstCash + inKindValue + jvValue + stampDuty + foreignSurcharge + financeOnTerms + adjustments + acquisitionCosts - rebate

  const siteArea = land.siteAreaSqm ?? 0
  const effectivePerSqm = siteArea > 0 ? total / siteArea : undefined

  // Structure / timing flags the advisor confirms per deal
  const flags: string[] = []
  if (dealType === 'option') {
    flags.push('Put & call — duty is assessed at exercise, not on the option. The exercise/settlement date drives when duty is payable.')
    if (land.optionDaConditional) flags.push('DA-conditional — settlement proceeds only on planning approval (de-risks the buy, extends the timeline).')
  }
  if (dealType === 'deferred') flags.push('Vendor finance — interest on the deferred balance is a real holding cost carried in the land line.')
  if (dealType === 'jv') flags.push('JV / profit share — the vendor takes profit/product in lieu of cash; land value credited to the JV is the cost basis, profit share sits in the equity waterfall.')
  if (land.landGst === 'margin') flags.push('GST margin scheme — affects GST on the END sale, not the acquisition. Legal/DD and stamp duty are excluded from the margin base; eligibility depends on how the land was bought.')
  if (land.state === 'VIC' && land.propertyType === 'commercial') flags.push('VIC CIPT — commercial/industrial pays duty once upfront (above), then a 1% annual property tax from year 11 (model that as a holding cost, not a second duty).')

  return {
    dealType, price, inKindValue, jvValue, considerationValue, dutiableValue, gstCredit, stampDuty, foreignSurcharge,
    financeOnTerms, adjustments, acquisitionCosts, rebate, total, effectivePerSqm,
    settlementDate: land.settlementDate,
    dutyNotes: duty?.notes ?? [],
    flags,
  }
}
