// ── GST (Australia, 10%) ──────────────────────────────────────────────────────
// All dollar inputs in the app are entered GST-INCLUSIVE. The GST component of
// an inclusive amount is amount × r/(1+r) — i.e. 1/11 at the 10% rate.
//
// Treatment by line:
//  • Property sales (BTS units + commercial/childcare) — GST payable on sale,
//    deducted from gross revenue.
//  • Commercial costs & consultants (construction, contingency, prelims,
//    professional fees, PM, marketing, amenity fitout) — GST paid is claimed
//    back as input tax credits, so the ex-GST cost is what the deal carries.
//  • Statutory/authority charges — GST-free, no credit.
//  • Finance costs — input-taxed financial supplies, no GST.
//  • Land / in-kind consideration — outside this model (margin scheme /
//    going-concern treatment varies per deal), left untouched.

export const GST_RATE = 0.10

/** GST component contained in a GST-inclusive amount (1/11 at 10%). */
export function gstIncluded(inclusiveAmount: number, rate: number = GST_RATE): number {
  return inclusiveAmount * rate / (1 + rate)
}

/** Strip GST from a GST-inclusive amount. */
export function exGst(inclusiveAmount: number, rate: number = GST_RATE): number {
  return inclusiveAmount - gstIncluded(inclusiveAmount, rate)
}
