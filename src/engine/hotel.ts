export interface HotelIncomeInputs {
  keys: number
  adr: number
  occupancyPct: number
  otherRevenuePerKeyPerYear: number
  gopMarginPct: number
  managementFeePct: number
  ffeReservePct: number
}

export interface HotelIncomeResult {
  revpar: number
  roomRevenue: number
  otherRevenue: number
  totalRevenue: number
  gop: number
  managementFee: number
  ffeReserve: number
  noi: number
}

export interface HotelValuationResult {
  gav: number
  rlv: number
}

export function calculateHotelIncome(inputs: HotelIncomeInputs): HotelIncomeResult {
  const revpar = inputs.adr * inputs.occupancyPct
  const roomRevenue = revpar * 365 * inputs.keys
  const otherRevenue = inputs.otherRevenuePerKeyPerYear * inputs.keys
  const totalRevenue = roomRevenue + otherRevenue
  const gop = totalRevenue * inputs.gopMarginPct
  const managementFee = totalRevenue * inputs.managementFeePct
  const ffeReserve = totalRevenue * inputs.ffeReservePct
  const noi = gop - managementFee - ffeReserve
  return { revpar, roomRevenue, otherRevenue, totalRevenue, gop, managementFee, ffeReserve, noi }
}

export function calculateHotelValuation(
  noi: number,
  hotelCapRate: number,
  totalDevelopmentCost: number,
  devMarginPct: number
): HotelValuationResult {
  const gav = hotelCapRate > 0 ? noi / hotelCapRate : 0
  const denom = 1 + devMarginPct
  const rlv = denom !== 0 ? (gav - totalDevelopmentCost) / denom : 0
  return { gav, rlv }
}
