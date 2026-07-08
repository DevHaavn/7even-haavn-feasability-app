import { calculateStampDuty } from './stampDuty'
import type { LandTerms } from '../db/schema'

export interface LandCostBreakdown {
  dealType: NonNullable<LandTerms['dealType']>
  price: number              // cash purchase price used in the feasibility
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
  const dealType = land.dealType ?? 'standard'

  // Cash price + the value duty is assessed on (they can differ)
  const price = dealType === 'inkind' ? 0 : land.landCost
  const inKindValue = (land.inKindGFA || 0) * (land.inKindRatePerSqm || 0)
  const dutiableValue =
    dealType === 'inkind' ? inKindValue :
    dealType === 'jv'     ? (land.jvLandValue ?? land.landCost) :
    land.landCost

  // GST at acquisition. 'inc' embeds GST (1/11 credit); 'full' adds 10% reclaimed;
  // 'none' / 'margin' recover nothing at acquisition (margin scheme hits the end sale).
  const gstCredit = !gstEnabled ? 0
    : land.landGst === 'inc'  ? price / 11
    : land.landGst === 'full' ? price * 0.10
    : 0
  const grossPrice = land.landGst === 'full' ? price * 1.10 : price
  const exGstPrice = grossPrice - gstCredit

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
  const acquisitionCosts = (land.acquisitionCosts ?? []).reduce((sum, c) =>
    sum + (c.mode === 'pct' ? (c.pct ?? 0) * price : (c.amount ?? 0)), 0)

  const rebate = dealType === 'rebate' ? (land.rebateAmount ?? 0) : 0

  const total = exGstPrice + stampDuty + foreignSurcharge + financeOnTerms + adjustments + acquisitionCosts - rebate

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
    dealType, price, dutiableValue, gstCredit, stampDuty, foreignSurcharge,
    financeOnTerms, adjustments, acquisitionCosts, rebate, total, effectivePerSqm,
    settlementDate: land.settlementDate,
    dutyNotes: duty?.notes ?? [],
    flags,
  }
}
