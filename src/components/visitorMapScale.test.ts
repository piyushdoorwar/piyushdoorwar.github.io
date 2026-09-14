import { describe, expect, it } from 'vitest'
import { visitColor } from './visitorMapScale'

function brightness(color: string): number {
  return [...color.matchAll(/\d+/g)].reduce((total, match) => total + Number(match[0]), 0)
}

describe('visitColor', () => {
  it('brightens every step as visit counts rise', () => {
    const colors = [2, 10, 60, 300, 1_361].map((visits) =>
      brightness(visitColor(visits, 1_361)),
    )

    expect(colors).toEqual([...colors].sort((left, right) => left - right))
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('uses a logarithmic ramp so mid-volume countries do not collapse into the low end', () => {
    const low = brightness(visitColor(2, 1_361))
    const middle = brightness(visitColor(300, 1_361))
    const high = brightness(visitColor(1_361, 1_361))

    expect(middle - low).toBeGreaterThan(high - middle)
  })

  it('brightens a country on hover without changing its count-based base shade', () => {
    expect(brightness(visitColor(10, 1_361, true))).toBeGreaterThan(
      brightness(visitColor(10, 1_361)),
    )
  })
})
