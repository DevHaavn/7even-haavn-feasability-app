export interface SensitivityDelta<T> {
  label: string
  apply: (inputs: T) => T
}

export interface SensitivityResult {
  label: string
  rlv: number
  rlvDelta: number
}

export function runSensitivity<T>(
  baseInputs: T,
  baseRLV: number,
  deltas: SensitivityDelta<T>[],
  valuate: (inputs: T) => number
): SensitivityResult[] {
  return deltas.map(d => {
    const modified = d.apply(baseInputs)
    const rlv = valuate(modified)
    return { label: d.label, rlv, rlvDelta: rlv - baseRLV }
  })
}
