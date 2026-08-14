import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, type AnimationPlaybackControls } from 'framer-motion'
import {
  nearestPoint,
  projectDecay,
  releaseVelocity,
  rubberBand,
  springFling,
  springIndicator,
  springSettle,
  type PointerSample,
} from '../motion'

/** Movement before a drag commits to a direction, so a click is never stolen. */
const DRAG_THRESHOLD = 5

/** Only the tail of the gesture matters at release, so history stays short. */
const MAX_SAMPLES = 12

/**
 * The elements the rubber-band offset is written to: the rail's own children.
 *
 * Not the scroller itself — it clips them, so translating it would carry content and
 * clip box together and nothing would read as overscrolled. Children are expected to
 * be layout wrappers that carry no transform of their own; anything animating a
 * transform belongs one level further in.
 */
function railItems(element: HTMLElement): HTMLElement[] {
  return Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )
}

/**
 * Grab-drag for a horizontal scroller, with a real hand-off from finger to animation.
 *
 * Setting `scrollLeft` directly gives 1:1 tracking but bypasses native scroll momentum,
 * so a flick would otherwise stop dead the instant the button came up. On release the
 * gesture's velocity is projected forward, the nearest snap point to that projection
 * wins, and the spring enters carrying the same velocity — no seam between drag and glide.
 *
 * Bypassing native scrolling also forfeits its overscroll behaviour: `scrollLeft` cannot
 * hold a value outside the range, so a drag past either end used to go nowhere at all.
 * The distance the rail refuses is instead rendered as a resisted offset on its children
 * and sprung back on release, which is the same trade the momentum hand-off makes.
 *
 * Touch is left to the native scroller throughout, including its own rubber band.
 *
 * @param getSnapPoints Candidate resting `scrollLeft` values. Empty means free scrolling.
 */
export function useDragScroll(
  getSnapPoints: (element: HTMLDivElement) => number[],
  reduceMotion: boolean,
) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ pointerId: -1, startX: 0, scrollLeft: 0, moved: false })
  const samples = useRef<PointerSample[]>([])
  const playback = useRef<AnimationPlaybackControls | null>(null)
  const overscroll = useRef(0)
  const overscrollPlayback = useRef<AnimationPlaybackControls | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  /** Writes the current rubber-band offset onto the rail's children. */
  const setOverscroll = useCallback((value: number) => {
    overscroll.current = value
    const element = ref.current
    if (!element) return

    const transform = value === 0 ? '' : `translateX(${value}px)`
    for (const item of railItems(element)) item.style.transform = transform
  }, [])

  /** Stops an in-flight glide and hands snapping back, leaving the rubber band alone. */
  const stopGlide = useCallback(() => {
    playback.current?.stop()
    playback.current = null
    const element = ref.current
    if (element) element.style.scrollSnapType = ''
  }, [])

  /** Any in-flight motion yields to new input immediately, rather than finishing first. */
  const stopAnimation = useCallback(() => {
    stopGlide()
    overscrollPlayback.current?.stop()
    overscrollPlayback.current = null
    if (overscroll.current !== 0) setOverscroll(0)
  }, [setOverscroll, stopGlide])

  useEffect(() => stopAnimation, [stopAnimation])

  /** Springs the band back to the edge. No bounce: an edge should not ring. */
  const settleOverscroll = useCallback(() => {
    const element = ref.current
    if (reduceMotion || !element) {
      setOverscroll(0)
      return
    }

    // Snap areas are measured through their transforms, so mandatory snapping would
    // re-snap the rail while the band is still stretched.
    element.style.scrollSnapType = 'none'
    overscrollPlayback.current = animate(overscroll.current, 0, {
      ...springSettle,
      onUpdate: setOverscroll,
      onComplete: () => {
        overscrollPlayback.current = null
        const settled = ref.current
        if (settled) settled.style.scrollSnapType = ''
      },
    })
  }, [reduceMotion, setOverscroll])

  /** Springs `scrollLeft` to `target`, entering at `velocity` px/s. */
  const animateTo = useCallback(
    (target: number, velocity = 0) => {
      const element = ref.current
      if (!element) return

      // Also restores snapping, so every early return below leaves it reclaimed. The
      // band is deliberately untouched: a release past the edge starts both at once.
      stopGlide()

      const from = element.scrollLeft
      const limit = element.scrollWidth - element.clientWidth
      const to = Math.max(0, Math.min(target, limit))

      if (reduceMotion) {
        element.scrollLeft = to
        return
      }
      if (Math.abs(to - from) < 1 && Math.abs(velocity) < 1) return

      // Mandatory snapping would yank the rail mid-glide; it is restored on landing,
      // which is a snap point either way.
      element.style.scrollSnapType = 'none'
      playback.current = animate(from, to, {
        ...(velocity === 0 ? springSettle : springFling),
        velocity,
        onUpdate: (value) => {
          element.scrollLeft = value
        },
        onComplete: () => {
          playback.current = null
          element.style.scrollSnapType = ''
        },
      })
    },
    [reduceMotion, stopGlide],
  )

  /**
   * A one-time nudge saying the rail moves. It borrows the rubber band's offset rather
   * than scrolling, so it demonstrates the gesture without changing where the rail
   * actually sits — and so every path that already cancels the band cancels this too.
   *
   * Out fast and back slower: a nudge that returns as briskly as it left reads as a
   * twitch rather than as something being shown to you.
   */
  const peek = useCallback(
    (distance = 24) => {
      const element = ref.current
      if (reduceMotion || !element) return
      // Nothing to demonstrate on a rail that does not move, and a rail the reader has
      // already moved has made the point for itself.
      if (element.scrollWidth <= element.clientWidth) return
      if (element.scrollLeft > 2) return

      stopAnimation()
      overscrollPlayback.current = animate(0, -distance, {
        ...springIndicator,
        onUpdate: setOverscroll,
        // `.stop()` does not run this, so an interrupted nudge never springs back on
        // its own — `stopAnimation` has already put the offset away.
        onComplete: () => {
          overscrollPlayback.current = animate(-distance, 0, {
            ...springSettle,
            onUpdate: setOverscroll,
            onComplete: () => {
              overscrollPlayback.current = null
            },
          })
        },
      })
    },
    [reduceMotion, setOverscroll, stopAnimation],
  )

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const element = ref.current
      if (event.pointerType !== 'mouse' || event.button !== 0 || !element) return

      // Grabbing the rail takes precedence over whatever it was doing.
      stopAnimation()

      // Snapping is suspended here rather than once the drag commits, so the style has
      // a frame to flush: mandatory snapping overrides any `scrollLeft` written before
      // it does, which otherwise costs the opening pixels of the drag. A press that
      // never becomes a drag reclaims it on release.
      element.style.scrollSnapType = 'none'

      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        scrollLeft: element.scrollLeft,
        moved: false,
      }
      samples.current = [{ x: event.clientX, t: event.timeStamp }]
    },
    [stopAnimation],
  )

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current
    const current = drag.current
    if (!element || event.pointerId !== current.pointerId) return

    const distance = event.clientX - current.startX
    if (!current.moved && Math.abs(distance) > DRAG_THRESHOLD) {
      current.moved = true
      // Capture keeps tracking alive once the pointer leaves the rail, but it throws if
      // the pointer is already gone. That is an enhancement, not a precondition, so it
      // must not abort the drag it was meant to improve.
      try {
        element.setPointerCapture(event.pointerId)
      } catch {
        /* pointer already released — plain tracking still works */
      }
      setIsDragging(true)
    }
    if (!current.moved) return

    event.preventDefault()
    const desired = current.scrollLeft - distance
    element.scrollLeft = desired

    if (!reduceMotion) {
      // `scrollLeft` silently clamps, so the difference between what the gesture asked
      // for and what the rail accepted is exactly the overshoot to render.
      const limit = element.scrollWidth - element.clientWidth
      if (desired < 0) setOverscroll(rubberBand(-desired, element.clientWidth))
      else if (desired > limit) setOverscroll(-rubberBand(desired - limit, element.clientWidth))
      else if (overscroll.current !== 0) setOverscroll(0)
    }

    samples.current.push({ x: event.clientX, t: event.timeStamp })
    if (samples.current.length > MAX_SAMPLES) samples.current.shift()
  }, [reduceMotion, setOverscroll])

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const element = ref.current
      const current = drag.current
      if (event.pointerId !== current.pointerId) return

      if (element?.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId)
      }
      current.pointerId = -1
      setIsDragging(false)

      if (element && current.moved) {
        // Record the release itself, so a gesture that stopped before letting go
        // reports no velocity instead of flinging on a stale sample.
        samples.current.push({ x: event.clientX, t: event.timeStamp })

        const stretched = overscroll.current
        // Released past an edge, the gesture's momentum points off the end of the rail
        // and the return to the edge is the whole animation, so the glide enters at rest.
        // The rail travels opposite the finger, so scrollLeft velocity inverts.
        const velocity = stretched === 0 ? -releaseVelocity(samples.current) : 0
        // Snap points are measured from the children, which are still carrying the band.
        const points = getSnapPoints(element).map((point) => point - stretched)
        const projected = element.scrollLeft + projectDecay(velocity)

        animateTo(nearestPoint(points, projected), velocity)
        if (stretched !== 0) settleOverscroll()
      } else if (element) {
        // A press that never travelled: hand snapping straight back.
        element.style.scrollSnapType = ''
      }

      samples.current = []
      // The click event follows pointerup; reset only after it has had a chance to be
      // suppressed, so dragging across a card never activates it.
      window.setTimeout(() => {
        drag.current.moved = false
      }, 0)
    },
    [animateTo, getSnapPoints, settleOverscroll],
  )

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!drag.current.moved) return
    event.preventDefault()
    event.stopPropagation()
  }, [])

  return {
    ref,
    isDragging,
    stopAnimation,
    animateTo,
    peek,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onClickCapture,
    },
  }
}
