import type { RateDetails } from '@/lib/rabbitmq/types'

export interface Series {
  ts: number[]
  vals: number[]
}

/** Cumulative counter samples → per-second rates. */
export function ratesFromSamples(details?: RateDetails): Series {
  const samples = details?.samples
  if (!samples || samples.length < 2) return { ts: [], vals: [] }
  const sorted = [...samples].sort((a, b) => a.timestamp - b.timestamp)
  const ts: number[] = []
  const vals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const dt = (sorted[i].timestamp - sorted[i - 1].timestamp) / 1000
    if (dt <= 0) continue
    ts.push(sorted[i].timestamp / 1000)
    vals.push(Math.max(0, (sorted[i].sample - sorted[i - 1].sample) / dt))
  }
  return { ts, vals }
}

/** Gauge samples (queue lengths) → values as-is. */
export function gaugeFromSamples(details?: RateDetails): Series {
  const samples = details?.samples
  if (!samples || samples.length === 0) return { ts: [], vals: [] }
  const sorted = [...samples].sort((a, b) => a.timestamp - b.timestamp)
  return {
    ts: sorted.map((s) => s.timestamp / 1000),
    vals: sorted.map((s) => s.sample),
  }
}

/**
 * Pick the best shared x-axis from candidate series: the longest
 * timestamp array, so one missing series never blanks the others.
 */
export function pickBaseAxis(...series: Series[]): number[] {
  let base: number[] = []
  for (const s of series) {
    if (s.ts.length > base.length) base = s.ts
  }
  return base
}

/** Align a series onto a base timestamp axis by nearest timestamp. */
export function alignToAxis(base: number[], series: Series): number[] {
  if (series.ts.length === 0) return base.map(() => 0)
  if (series.ts === base || series.ts.length === base.length) return series.vals
  return base.map((t) => {
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < series.ts.length; i++) {
      const d = Math.abs(series.ts[i] - t)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    return series.vals[best] ?? 0
  })
}
