import { describe, expect, it } from 'vitest'
import {
  DECELERATION_RATE,
  nearestPoint,
  projectDecay,
  releaseVelocity,
  springFling,
  springFlip,
  springSettle,
} from './motion'

describe('projectDecay', () => {
  it('projects where a flick comes to rest, not where it was released', () => {
    // (500 / 1000) * (0.998 / 0.002) = 249.5
    expect(projectDecay(500)).toBeCloseTo(249.5, 5)
  })

  it('keeps the direction of travel', () => {
    expect(projectDecay(-1200)).toBeCloseTo(-598.8, 5)
    expect(projectDecay(-500)).toBeCloseTo(-projectDecay(500), 5)
  })

  it('does not coast when there is no velocity', () => {
    expect(projectDecay(0)).toBe(0)
  })

  it('coasts further the faster the release', () => {
    const distances = [100, 500, 1500, 3000].map((v) => projectDecay(v))
    const ascending = [...distances].sort((a, b) => a - b)
    expect(distances).toEqual(ascending)
  })

  it('coasts less as the deceleration rate drops', () => {
    // 0.99 is the documented "snappier" alternative to the scroll-feel default.
    expect(projectDecay(500, 0.99)).toBeLessThan(projectDecay(500, DECELERATION_RATE))
  })

  it('uses the exponential-decay form rather than v²/2a', () => {
    // A textbook kinematic model is quadratic in velocity; this one is linear.
    expect(projectDecay(1000) / projectDecay(500)).toBeCloseTo(2, 5)
  })
})

describe('nearestPoint', () => {
  it('picks the closest snap point', () => {
    expect(nearestPoint([0, 100, 200, 300], 178)).toBe(200)
    expect(nearestPoint([0, 100, 200, 300], 120)).toBe(100)
  })

  it('clamps to the ends rather than extrapolating past them', () => {
    expect(nearestPoint([0, 100, 200], -500)).toBe(0)
    expect(nearestPoint([0, 100, 200], 9999)).toBe(200)
  })

  it('falls back to the target when there are no snap points', () => {
    expect(nearestPoint([], 42)).toBe(42)
  })

  it('handles a single snap point', () => {
    expect(nearestPoint([70], 0)).toBe(70)
  })

  it('resolves an exact tie to the earlier point', () => {
    expect(nearestPoint([0, 100], 50)).toBe(0)
  })
})

describe('releaseVelocity', () => {
  it('reports px/s from the sample timeline', () => {
    // 100px over 100ms
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: 50, t: 50 }, { x: 100, t: 100 }])).toBeCloseTo(1000, 5)
  })

  it('measures the end of the gesture, not the whole drag', () => {
    // A slow crawl, then a fast flick. Averaging the lot would report ~244px/s.
    const samples = [
      { x: 0, t: 0 },
      { x: 5, t: 400 },
      { x: 10, t: 450 },
      { x: 110, t: 500 },
    ]
    expect(releaseVelocity(samples)).toBeGreaterThan(900)
  })

  it('keeps the sign of travel', () => {
    expect(releaseVelocity([{ x: 100, t: 0 }, { x: 0, t: 100 }])).toBeCloseTo(-1000, 5)
  })

  it('reports a slow drag as slow', () => {
    expect(releaseVelocity([{ x: 0, t: 0 }, { x: 6, t: 300 }, { x: 8, t: 400 }])).toBeLessThan(100)
  })

  it('treats too little history as no movement', () => {
    expect(releaseVelocity([])).toBe(0)
    expect(releaseVelocity([{ x: 10, t: 5 }])).toBe(0)
  })

  it('never divides by a zero time delta', () => {
    const velocity = releaseVelocity([{ x: 0, t: 5 }, { x: 9, t: 5 }])
    expect(velocity).toBe(0)
    expect(Number.isFinite(velocity)).toBe(true)
  })

  it('cancels momentum when the gesture came to rest before release', () => {
    // Dragged fast, then held still for 500ms. Letting go must not fling.
    const samples = [
      { x: 0, t: 0 },
      { x: 100, t: 100 },
      { x: 100, t: 600 }, // the release, at the same position
    ]
    expect(releaseVelocity(samples)).toBe(0)
  })

  it('respects a custom window', () => {
    const samples = [{ x: 0, t: 0 }, { x: 200, t: 400 }]
    // Default 100ms window excludes the first sample entirely.
    expect(releaseVelocity(samples)).toBe(0)
    // A window wide enough to reach it measures the full span.
    expect(releaseVelocity(samples, 500)).toBeCloseTo(500, 5)
  })
})

describe('spring tokens', () => {
  it('keeps interface-initiated motion critically damped', () => {
    expect(springSettle.bounce).toBe(0)
    expect(springFlip.bounce).toBe(0)
  })

  it('reserves overshoot for gesture-driven release', () => {
    expect(springFling.bounce).toBeGreaterThan(0)
  })

  it('declares springs rather than fixed-duration tweens', () => {
    for (const token of [springSettle, springFlip, springFling]) {
      expect(token.type).toBe('spring')
      expect(token.duration).toBeGreaterThan(0)
    }
  })
})
