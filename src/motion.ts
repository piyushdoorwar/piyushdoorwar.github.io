/**
 * Motion tokens.
 *
 * Springs rather than tweens: a spring animates from wherever the value *currently*
 * is, so it can be grabbed and redirected mid-flight. A fixed-duration tween has to
 * restart from a logical value, which shows up as a visible jump on interrupt.
 *
 * `bounce: 0` is critically damped — the default for anything the interface itself
 * initiates. Overshoot is reserved for motion the user's own gesture set going.
 */

/** Reveals, repositions, glides — anything the interface initiates. */
export const springSettle = { type: 'spring', bounce: 0, duration: 0.4 } as const

/** A 180° card flip. Longer, still no overshoot: a click carries no momentum. */
export const springFlip = { type: 'spring', bounce: 0, duration: 0.55 } as const

/** Release after a drag or flick, where the gesture did carry momentum. */
export const springFling = { type: 'spring', bounce: 0.18, duration: 0.55 } as const

/** UIScrollView's deceleration rate. 0.99 reads noticeably snappier. */
export const DECELERATION_RATE = 0.998

/**
 * Where a flick comes to rest, given its release velocity in px/s.
 *
 * Apple's projection function from *Designing Fluid Interfaces* — exponential decay,
 * not the physics-textbook `v²/(2a)`. Snapping to the nearest point from the *release*
 * position ignores the throw; projecting first is what makes a flick feel thrown.
 */
export function projectDecay(velocity: number, decelerationRate = DECELERATION_RATE): number {
  return (velocity / 1000) * (decelerationRate / (1 - decelerationRate))
}

/** The value in `points` closest to `target`. Returns `target` if there are none. */
export function nearestPoint(points: readonly number[], target: number): number {
  if (points.length === 0) return target
  return points.reduce((best, point) =>
    Math.abs(point - target) < Math.abs(best - target) ? point : best,
  )
}

export interface PointerSample {
  x: number
  t: number
}

/**
 * Release velocity in px/s, measured over the tail of the gesture only.
 *
 * Averaging the whole drag would report a slow drag-then-flick as slow; the last
 * ~100ms is what the hand actually did at the moment of release.
 */
export function releaseVelocity(samples: readonly PointerSample[], windowMs = 100): number {
  if (samples.length < 2) return 0

  const last = samples[samples.length - 1]!
  const first = samples.find((sample) => last.t - sample.t <= windowMs) ?? samples[0]!
  const elapsed = last.t - first.t
  if (elapsed <= 0) return 0

  return ((last.x - first.x) / elapsed) * 1000
}
