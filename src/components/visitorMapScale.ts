type Rgb = readonly [number, number, number]

const LOW_VISIT_COLOR: Rgb = [19, 78, 55]
const HIGH_VISIT_COLOR: Rgb = [61, 220, 132]
const HOVER_COLOR: Rgb = [92, 240, 160]

function mixColor(from: Rgb, to: Rgb, amount: number): Rgb {
  const progress = Math.min(1, Math.max(0, amount))
  return from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * progress),
  ) as unknown as Rgb
}

function asCssColor(color: Rgb): string {
  return `rgb(${color.join(' ')})`
}

/**
 * Traffic varies by several orders of magnitude, so a linear scale makes every
 * country outside the top one or two look alike. A log ramp preserves the true
 * ordering while giving low and mid-volume countries useful visual separation.
 */
export function visitColor(visits: number, maxVisits: number, hovered = false): string {
  const safeMaximum = Math.max(1, maxVisits)
  const safeVisits = Math.min(safeMaximum, Math.max(0, visits))
  const intensity = Math.log1p(safeVisits) / Math.log1p(safeMaximum)
  const baseColor = mixColor(LOW_VISIT_COLOR, HIGH_VISIT_COLOR, intensity)

  return asCssColor(hovered ? mixColor(baseColor, HOVER_COLOR, 0.28) : baseColor)
}
