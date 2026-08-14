import { describe, expect, it } from 'vitest'
import { formatStat, stats } from './stats'

describe('formatStat', () => {
  it('shows an em dash when a stat is missing', () => {
    // A failed data refresh must read as "unknown", never as zero.
    expect(formatStat(null)).toBe('—')
    expect(formatStat(undefined)).toBe('—')
  })

  it('distinguishes a genuine zero from a missing value', () => {
    expect(formatStat(0)).toBe('0')
  })

  it('prints small numbers exactly', () => {
    expect(formatStat(7)).toBe('7')
    expect(formatStat(999)).toBe('999')
  })

  it('abbreviates thousands to one decimal', () => {
    expect(formatStat(1_000)).toBe('1.0k')
    expect(formatStat(1_500)).toBe('1.5k')
    expect(formatStat(12_345)).toBe('12.3k')
  })

  it('abbreviates millions to one decimal', () => {
    expect(formatStat(1_000_000)).toBe('1.0M')
    expect(formatStat(2_540_000)).toBe('2.5M')
  })

  it('switches unit exactly at each threshold', () => {
    expect(formatStat(999)).toBe('999')
    expect(formatStat(1_000)).toBe('1.0k')
    expect(formatStat(999_999)).toBe('1000.0k')
    expect(formatStat(1_000_000)).toBe('1.0M')
  })

  it('rounds rather than truncating', () => {
    expect(formatStat(1_960)).toBe('2.0k')
  })
})

describe('generated stats data', () => {
  it('exposes the totals the impact section renders', () => {
    expect(stats.totals).toBeTypeOf('object')
    for (const key of ['stars', 'installs', 'downloads'] as const) {
      const value = stats.totals[key]
      expect(value === null || typeof value === 'number', key).toBe(true)
    }
  })

  it('carries a parseable refresh timestamp when present', () => {
    if (stats.generatedAt === null) return
    expect(Number.isNaN(Date.parse(stats.generatedAt))).toBe(false)
  })

  it('never reports a negative total', () => {
    for (const value of Object.values(stats.totals)) {
      if (value !== null) expect(value).toBeGreaterThanOrEqual(0)
    }
  })
})
