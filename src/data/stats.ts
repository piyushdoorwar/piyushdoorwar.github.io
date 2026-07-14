import generated from './stats.generated.json'

export interface Stats {
  generatedAt: string | null
  totals: {
    stars: number | null
    installs: number | null
    downloads: number | null
  }
}

export const stats: Stats = generated as Stats

/** Format a number for display, or "—" when it is missing. */
export function formatStat(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}
