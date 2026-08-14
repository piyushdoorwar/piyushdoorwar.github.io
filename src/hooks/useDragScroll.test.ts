import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDragScroll } from './useDragScroll'
import { projectDecay } from '../motion'

const CLIENT_WIDTH = 500
const SCROLL_WIDTH = 2000
const MAX_SCROLL = SCROLL_WIDTH - CLIENT_WIDTH // 1500

/**
 * jsdom performs no layout, so scroll geometry is defined by hand. `scrollLeft` is a
 * real settable property that clamps the way a browser's does, which is what the
 * landing assertions depend on.
 */
function createRail() {
  const element = document.createElement('div')
  let scrollLeft = 0

  Object.defineProperty(element, 'clientWidth', { value: CLIENT_WIDTH })
  Object.defineProperty(element, 'scrollWidth', { value: SCROLL_WIDTH })
  Object.defineProperty(element, 'scrollLeft', {
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = Math.max(0, Math.min(value, MAX_SCROLL))
    },
  })

  const captured = new Set<number>()
  element.setPointerCapture = (id: number) => void captured.add(id)
  element.releasePointerCapture = (id: number) => void captured.delete(id)
  element.hasPointerCapture = (id: number) => captured.has(id)

  // The rubber band is written onto the rail's children, so there have to be some.
  for (let index = 0; index < 3; index += 1) element.append(document.createElement('div'))

  return element
}

/** The rubber-band offset the children are currently carrying, in px. */
function bandOffset(rail: HTMLDivElement): number {
  const transforms = new Set(
    Array.from(rail.children).map((child) => (child as HTMLElement).style.transform),
  )
  // Every child moves together, so a split reading means the band was applied unevenly.
  expect(transforms.size).toBe(1)

  const [transform = ''] = transforms
  if (transform === '') return 0
  return Number(/translateX\((-?[\d.]+)px\)/.exec(transform)?.[1] ?? NaN)
}

interface FakePointer {
  pointerId?: number
  pointerType?: string
  button?: number
  clientX: number
  timeStamp: number
}

function pointerEvent({ pointerId = 1, pointerType = 'mouse', button = 0, clientX, timeStamp }: FakePointer) {
  return {
    pointerId,
    pointerType,
    button,
    clientX,
    timeStamp,
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent<HTMLDivElement>
}

// Realistic snap points: evenly spaced and spanning exactly the scrollable range,
// so the last one is reachable rather than being clamped away.
const SNAP_POINTS = [0, 375, 750, 1125, MAX_SCROLL]

function setup({ reduceMotion = true, snapPoints = SNAP_POINTS } = {}) {
  const rail = createRail()
  const getSnapPoints = () => [...snapPoints]
  const { result } = renderHook(() => useDragScroll(getSnapPoints, reduceMotion))
  // In the app React populates this ref from JSX. Standing in for that means writing
  // it directly, which the read-only RefObject type does not describe.
  ;(result.current.ref as React.MutableRefObject<HTMLDivElement | null>).current = rail
  return { rail, result }
}

/** Drives a drag as a sequence of x positions on a 16ms cadence. */
function drag(
  result: ReturnType<typeof setup>['result'],
  positions: number[],
  { releaseAfterMs = 16 } = {},
) {
  const handlers = result.current.dragHandlers
  let time = 0
  const [start = 0, ...moves] = positions

  act(() => handlers.onPointerDown(pointerEvent({ clientX: start, timeStamp: time })))
  for (const x of moves) {
    time += 16
    act(() => handlers.onPointerMove(pointerEvent({ clientX: x, timeStamp: time })))
  }
  time += releaseAfterMs
  const last = positions[positions.length - 1]!
  act(() => handlers.onPointerUp(pointerEvent({ clientX: last, timeStamp: time })))
}

describe('scroll snapping handover', () => {
  it('suspends snapping on press so the opening pixels are not swallowed', () => {
    const { rail, result } = setup()
    act(() => result.current.dragHandlers.onPointerDown(pointerEvent({ clientX: 300, timeStamp: 0 })))
    expect(rail.style.scrollSnapType).toBe('none')
  })

  it('hands snapping straight back after a press that never travelled', () => {
    const { rail, result } = setup()
    const handlers = result.current.dragHandlers
    act(() => handlers.onPointerDown(pointerEvent({ clientX: 300, timeStamp: 0 })))
    act(() => handlers.onPointerUp(pointerEvent({ clientX: 300, timeStamp: 10 })))
    expect(rail.style.scrollSnapType).toBe('')
  })

  it('reclaims snapping when an in-flight glide is interrupted', () => {
    const { rail, result } = setup({ reduceMotion: false })
    rail.style.scrollSnapType = 'none'
    act(() => result.current.stopAnimation())
    expect(rail.style.scrollSnapType).toBe('')
  })
})

describe('one-to-one tracking', () => {
  it('moves the rail exactly as far as the pointer, opposite the finger', () => {
    const { rail, result } = setup()
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0 })))
    act(() => handlers.onPointerMove(pointerEvent({ clientX: 850, timeStamp: 16 })))
    expect(rail.scrollLeft).toBe(50)

    act(() => handlers.onPointerMove(pointerEvent({ clientX: 800, timeStamp: 32 })))
    expect(rail.scrollLeft).toBe(100)
  })

  it('measures from the grab point rather than accumulating deltas', () => {
    const { rail, result } = setup()
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0 })))
    // Out and back: returning to the grab point must return the rail to where it began.
    act(() => handlers.onPointerMove(pointerEvent({ clientX: 700, timeStamp: 16 })))
    act(() => handlers.onPointerMove(pointerEvent({ clientX: 900, timeStamp: 32 })))
    expect(rail.scrollLeft).toBe(0)
  })

  it('waits for the drag threshold before moving anything', () => {
    const { rail, result } = setup()
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0 })))
    act(() => handlers.onPointerMove(pointerEvent({ clientX: 897, timeStamp: 16 })))
    expect(rail.scrollLeft).toBe(0)
    expect(result.current.isDragging).toBe(false)
  })

  it('reports dragging once the threshold is crossed', () => {
    const { result } = setup()
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0 })))
    act(() => handlers.onPointerMove(pointerEvent({ clientX: 880, timeStamp: 16 })))
    expect(result.current.isDragging).toBe(true)
  })

  it('survives a pointer whose capture cannot be taken', () => {
    const { rail, result } = setup()
    rail.setPointerCapture = () => {
      throw new DOMException('No active pointer', 'NotFoundError')
    }
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0 })))
    expect(() =>
      act(() => handlers.onPointerMove(pointerEvent({ clientX: 850, timeStamp: 16 }))),
    ).not.toThrow()
    // Tracking still happened, which is the point of not letting capture abort it.
    expect(rail.scrollLeft).toBe(50)
  })
})

// `scrollLeft` cannot hold a value outside the range, so the distance the rail refuses
// is rendered on its children instead of being thrown away at the boundary.
describe('rubber banding', () => {
  /** Presses at 900 and drags to `to`, which is past an edge in these tests. */
  function pull(to: number, { reduceMotion = false, from = 0 } = {}) {
    const { rail, result } = setup({ reduceMotion })
    rail.scrollLeft = from
    const handlers = result.current.dragHandlers
    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0 })))
    act(() => handlers.onPointerMove(pointerEvent({ clientX: to, timeStamp: 16 })))
    return { rail, result, handlers }
  }

  it('gives against the start instead of stopping dead', () => {
    // Dragging right from a rail already at 0 asks for scrollLeft -100.
    const { rail } = pull(1000)
    expect(bandOffset(rail)).toBeCloseTo(49.5495, 3)
  })

  it('gives against the end as well', () => {
    // Dragging left from a rail already at its limit asks for scrollLeft 1600.
    const { rail } = pull(800, { from: MAX_SCROLL })
    expect(bandOffset(rail)).toBeCloseTo(-49.5495, 3)
  })

  it('resists, rather than tracking the finger past the edge', () => {
    const { rail } = pull(1000)
    // 100px of gesture, well under 100px of give.
    expect(Math.abs(bandOffset(rail))).toBeLessThan(100)
    expect(Math.abs(bandOffset(rail))).toBeGreaterThan(0)
  })

  it('leaves the rail itself pinned to the edge', () => {
    expect(pull(1000).rail.scrollLeft).toBe(0)
    expect(pull(800, { from: MAX_SCROLL }).rail.scrollLeft).toBe(MAX_SCROLL)
  })

  it('lets go the moment the gesture comes back into range', () => {
    const { rail, handlers } = pull(1000)
    expect(bandOffset(rail)).toBeGreaterThan(0)

    act(() => handlers.onPointerMove(pointerEvent({ clientX: 850, timeStamp: 32 })))
    expect(bandOffset(rail)).toBe(0)
    expect(rail.scrollLeft).toBe(50)
  })

  it('holds snapping off until the band has returned', () => {
    const { rail, handlers } = pull(1000)
    act(() => handlers.onPointerUp(pointerEvent({ clientX: 1000, timeStamp: 32 })))
    // Snap areas are measured through their transforms, so re-snapping here would
    // fight the return.
    expect(rail.style.scrollSnapType).toBe('none')
  })

  it('springs the band back to the edge and reclaims snapping', async () => {
    const { rail, handlers } = pull(1000)
    expect(bandOffset(rail)).toBeGreaterThan(0)

    act(() => handlers.onPointerUp(pointerEvent({ clientX: 1000, timeStamp: 32 })))

    // springSettle is a 0.4s spring; give it real time to run to completion.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 700))
    })

    expect(bandOffset(rail)).toBe(0)
    expect(rail.scrollLeft).toBe(0)
    expect(rail.style.scrollSnapType).toBe('')
  })

  it('hands the band back when an in-flight return is interrupted', () => {
    const { rail, result } = pull(1000)
    act(() => result.current.stopAnimation())
    expect(bandOffset(rail)).toBe(0)
    expect(rail.style.scrollSnapType).toBe('')
  })

  it('keeps the hard edge under reduced motion', () => {
    const { rail } = pull(1000, { reduceMotion: true })
    expect(bandOffset(rail)).toBe(0)
    expect(rail.scrollLeft).toBe(0)
  })
})

describe('ignored pointers', () => {
  it('leaves touch to native scrolling', () => {
    const { rail, result } = setup()
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0, pointerType: 'touch' })))
    expect(rail.style.scrollSnapType).toBe('')

    act(() => handlers.onPointerMove(pointerEvent({ clientX: 800, timeStamp: 16, pointerType: 'touch' })))
    expect(rail.scrollLeft).toBe(0)
  })

  it('ignores non-primary mouse buttons', () => {
    const { rail, result } = setup()
    act(() => result.current.dragHandlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0, button: 2 })))
    expect(rail.style.scrollSnapType).toBe('')
  })

  it('ignores moves from a pointer it is not tracking', () => {
    const { rail, result } = setup()
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ pointerId: 1, clientX: 900, timeStamp: 0 })))
    act(() => handlers.onPointerMove(pointerEvent({ pointerId: 9, clientX: 700, timeStamp: 16 })))
    expect(rail.scrollLeft).toBe(0)
  })
})

// With reduced motion the spring is skipped and the landing position is written
// synchronously, which makes the projection and snap choice directly observable.
describe('momentum landing', () => {
  it('lands on the snap point nearest the projection, not the release', () => {
    const { rail, result } = setup()
    // 50px per 16ms leftward ≈ 3125px/s, projecting ~1559px beyond the release.
    drag(result, [900, 850, 800, 750, 700, 650])

    const releasedAt = 250 // 5 moves x 50px
    expect(projectDecay(3125)).toBeGreaterThan(1000)
    // Snapping from the release point would have stopped at 375, one point along.
    // The throw carries it several points further instead.
    expect(rail.scrollLeft).toBeGreaterThan(750)
    expect(SNAP_POINTS).toContain(rail.scrollLeft)
    expect(rail.scrollLeft).toBeGreaterThan(releasedAt)
  })

  it('settles on the nearest snap point after a slow drag', () => {
    const { rail, result } = setup()
    // ~2px per frame: barely any projection, so it snaps to whatever is closest.
    drag(result, [900, 898, 896, 894, 892, 890])
    expect(rail.scrollLeft).toBe(0)
  })

  it('does not fling when the gesture stopped before release', () => {
    const paused = setup()
    // A quick 300px drag, then 500ms of stillness before letting go.
    drag(paused.result, [900, 600], { releaseAfterMs: 500 })
    // Momentum is cancelled, so it settles on the point nearest where it already is.
    expect(paused.rail.scrollLeft).toBe(375)

    // The identical drag released immediately still carries its momentum.
    const thrown = setup()
    drag(thrown.result, [900, 600], { releaseAfterMs: 16 })
    expect(thrown.rail.scrollLeft).toBeGreaterThan(375)
  })

  it('clamps the landing to the scrollable range', () => {
    const { rail, result } = setup({ snapPoints: [0, 400, 800, 1200, 1600, 5000] })
    drag(result, [900, 700, 500, 300, 100, -100])
    expect(rail.scrollLeft).toBeLessThanOrEqual(MAX_SCROLL)
    expect(rail.scrollLeft).toBeGreaterThanOrEqual(0)
  })

  it('never scrolls past the start when flicking backwards', () => {
    const { rail, result } = setup()
    drag(result, [100, 300, 500, 700, 900, 1100])
    expect(rail.scrollLeft).toBe(0)
  })

  it('scrolls freely to the projection when there are no snap points', () => {
    const { rail, result } = setup({ snapPoints: [] })
    drag(result, [900, 880, 860, 840, 820, 800])
    // No snap points means the projected rest position is used as-is.
    expect(rail.scrollLeft).toBeGreaterThan(100)
    expect(SNAP_POINTS).not.toContain(rail.scrollLeft)
  })
})

describe('animateTo', () => {
  it('jumps straight to the target under reduced motion', () => {
    const { rail, result } = setup()
    act(() => result.current.animateTo(800))
    expect(rail.scrollLeft).toBe(800)
  })

  it('clamps a target beyond the scrollable range', () => {
    const { rail, result } = setup()
    act(() => result.current.animateTo(99_999))
    expect(rail.scrollLeft).toBe(MAX_SCROLL)

    act(() => result.current.animateTo(-500))
    expect(rail.scrollLeft).toBe(0)
  })

  it('suspends snapping while a spring runs', () => {
    const { rail, result } = setup({ reduceMotion: false })
    act(() => result.current.animateTo(800))
    expect(rail.style.scrollSnapType).toBe('none')
  })

  it('does not start a spring for a target it is already at', () => {
    const { rail, result } = setup({ reduceMotion: false })
    act(() => result.current.animateTo(0))
    expect(rail.style.scrollSnapType).toBe('')
  })
})

describe('click suppression', () => {
  it('swallows the click that follows a drag', () => {
    const { result } = setup()
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0 })))
    act(() => handlers.onPointerMove(pointerEvent({ clientX: 800, timeStamp: 16 })))

    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent<HTMLDivElement>
    act(() => handlers.onClickCapture(click))
    expect(click.preventDefault).toHaveBeenCalled()
    expect(click.stopPropagation).toHaveBeenCalled()
  })

  it('lets a click through when the pointer never travelled', () => {
    const { result } = setup()
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0 })))
    act(() => handlers.onPointerUp(pointerEvent({ clientX: 900, timeStamp: 10 })))

    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent<HTMLDivElement>
    act(() => handlers.onClickCapture(click))
    expect(click.preventDefault).not.toHaveBeenCalled()
  })

  it('stops suppressing clicks once the drag has settled', async () => {
    const { result } = setup()
    const handlers = result.current.dragHandlers

    act(() => handlers.onPointerDown(pointerEvent({ clientX: 900, timeStamp: 0 })))
    act(() => handlers.onPointerMove(pointerEvent({ clientX: 800, timeStamp: 16 })))
    act(() => handlers.onPointerUp(pointerEvent({ clientX: 800, timeStamp: 32 })))

    // The flag is cleared on a macrotask, after the click has had its chance.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const click = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent<HTMLDivElement>
    act(() => handlers.onClickCapture(click))
    expect(click.preventDefault).not.toHaveBeenCalled()
  })
})
