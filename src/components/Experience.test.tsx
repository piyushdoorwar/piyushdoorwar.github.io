import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import Experience from './Experience'

beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  Object.assign(globalThis, {
    IntersectionObserver: class extends NoopObserver {
      root = null
      rootMargin = ''
      thresholds = []
    },
    // jsdom leaves HTMLMediaElement.play unimplemented, and the flip sound chains a
    // `.catch` onto it. The sound is not what this suite is about.
    Audio: class {
      preload = ''
      volume = 0
      currentTime = 0
      play() {
        return Promise.resolve()
      }
      pause() {}
    },
  })
})

afterEach(cleanup)

const settle = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })

/** framer writes one composed transform string; these pull the two parts apart. */
function readRotation(element: HTMLElement): number {
  return Number(/rotateY\((-?[\d.]+)deg\)/.exec(element.style.transform)?.[1] ?? 0)
}

function readScale(element: HTMLElement): number {
  return Number(/scale\((-?[\d.]+)\)/.exec(element.style.transform)?.[1] ?? 1)
}

function setup() {
  const view = render(<Experience />)
  const faces = view.container.querySelectorAll<HTMLElement>('[class*="preserve-3d"]')
  const toggles = view.container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')
  return { ...view, face: faces[0]!, toggle: toggles[0]!, secondFace: faces[1]! }
}

describe('flipping a card', () => {
  it('still turns the full half-circle', async () => {
    const { face, toggle } = setup()
    expect(readRotation(face)).toBe(0)
    expect(toggle.getAttribute('aria-pressed')).toBe('false')

    act(() => toggle.click())
    await settle(900)

    // The lift rides on the same element as the rotation, so the flip itself is the
    // thing most at risk from wiring a motion value into `style` beside `animate`.
    expect(readRotation(face)).toBe(180)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
  })

  it('lifts the card toward the eye at the halfway point, and only there', async () => {
    const { face, toggle } = setup()
    expect(readScale(face)).toBe(1)

    act(() => toggle.click())
    await settle(140)

    const midRotation = readRotation(face)
    const midScale = readScale(face)
    expect(midRotation).toBeGreaterThan(0)
    expect(midRotation).toBeLessThan(180)
    expect(midScale).toBeGreaterThan(1)

    await settle(900)
    // Edge-on is the peak; face-on at either end sits flat again.
    expect(readScale(face)).toBeCloseTo(1, 5)
  })

  it('lifts on the way back too', async () => {
    const { face, toggle } = setup()
    act(() => toggle.click())
    await settle(900)
    expect(readScale(face)).toBeCloseTo(1, 5)

    act(() => toggle.click())
    await settle(140)
    expect(readScale(face)).toBeGreaterThan(1)

    await settle(900)
    expect(readRotation(face)).toBe(0)
    expect(readScale(face)).toBeCloseTo(1, 5)
  })

  it('leaves the other cards flat', async () => {
    const { face, secondFace, toggle } = setup()

    act(() => toggle.click())
    await settle(140)

    // The lift is derived from each card's own angle, so a sibling flipping — or any
    // other re-render — cannot make this one twitch.
    expect(readScale(face)).toBeGreaterThan(1)
    expect(readScale(secondFace)).toBe(1)
    expect(readRotation(secondFace)).toBe(0)

    await settle(900)
  })
})
