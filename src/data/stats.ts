import generated from './stats.generated.json'

export interface ProjectStat {
  stars?: number | null
  forks?: number | null
  /** VS Code Marketplace installs. */
  installs?: number | null
  /** GitHub release download count. */
  downloads?: number | null
  /** npm monthly downloads. */
  npmDownloads?: number | null
  /** Active users shown on the Chrome Web Store listing. */
  users?: number | null
  /** Average Chrome Web Store rating, out of five. */
  rating?: number | null
  /** Number of Chrome Web Store ratings. */
  ratingCount?: number | null
}

export interface Stats {
  generatedAt: string | null
  github: { followers: number | null }
  projects: Record<string, ProjectStat>
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
