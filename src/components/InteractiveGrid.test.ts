import { describe, expect, it } from 'vitest'
import { IDLE_AFTER_MS, packetsActive, shouldContinueLoop } from './InteractiveGrid'

const active = { warpSettling: false, reducedMotion: false, idleFor: 0 }

describe('packetsActive', () => {
  it('runs the traffic while the page is being used', () => {
    expect(packetsActive(active)).toBe(true)
  })

  it('stops the traffic once attention has lapsed', () => {
    expect(packetsActive({ ...active, idleFor: IDLE_AFTER_MS + 1 })).toBe(false)
  })

  it('keeps running right up to the idle threshold', () => {
    expect(packetsActive({ ...active, idleFor: IDLE_AFTER_MS - 1 })).toBe(true)
    expect(packetsActive({ ...active, idleFor: IDLE_AFTER_MS })).toBe(true)
  })

  it('never runs the traffic under reduced motion, however recent the attention', () => {
    expect(packetsActive({ ...active, reducedMotion: true })).toBe(false)
    expect(packetsActive({ warpSettling: true, reducedMotion: true, idleFor: 0 })).toBe(false)
  })
})

describe('shouldContinueLoop', () => {
  it('keeps requesting frames while the traffic is running', () => {
    expect(shouldContinueLoop(active)).toBe(true)
  })

  it('lets the loop stop once the traffic is idle and the warp has settled', () => {
    // This is the whole point of the idle policy: a page nobody is touching
    // eventually stops asking for frames.
    expect(shouldContinueLoop({ ...active, idleFor: IDLE_AFTER_MS + 1 })).toBe(false)
  })

  it('always finishes settling the warp, even after the traffic has stopped', () => {
    // Otherwise the grid would freeze mid-distortion when the idle timer expired.
    expect(
      shouldContinueLoop({ warpSettling: true, reducedMotion: false, idleFor: IDLE_AFTER_MS + 5_000 }),
    ).toBe(true)
  })

  it('still settles the warp under reduced motion', () => {
    expect(shouldContinueLoop({ warpSettling: true, reducedMotion: true, idleFor: 0 })).toBe(true)
  })

  it('stops immediately under reduced motion with nothing left to settle', () => {
    expect(shouldContinueLoop({ warpSettling: false, reducedMotion: true, idleFor: 0 })).toBe(false)
  })

  it('idles within a plausible window rather than seconds or minutes', () => {
    expect(IDLE_AFTER_MS).toBeGreaterThanOrEqual(5_000)
    expect(IDLE_AFTER_MS).toBeLessThanOrEqual(60_000)
  })
})
