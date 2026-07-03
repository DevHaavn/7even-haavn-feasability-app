export function calculatePortfolioPoolValuation(
  assetNOIs: { projectName: string; noi: number; standaloneCapRate: number }[],
  institutionalPoolCapRate: number
) {
  const combinedNOI = assetNOIs.reduce((s, a) => s + a.noi, 0)
  const standaloneGAVSum = assetNOIs.reduce((s, a) => s + a.noi / a.standaloneCapRate, 0)
  const poolGAV = combinedNOI / institutionalPoolCapRate
  const portfolioPremium = poolGAV - standaloneGAVSum
  return { combinedNOI, standaloneGAVSum, poolGAV, portfolioPremium }
}
