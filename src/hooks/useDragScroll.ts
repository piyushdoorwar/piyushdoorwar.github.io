import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, type AnimationPlaybackControls } from 'framer-motion'
import {
  nearestPoint,
  projectDecay,
  releaseVelocity,
  springFling,
  springSettle,
  type PointerSample,
} from '../motion'

/** Movement before a drag commits to a direction, so a click is never stolen. */
const DRAG_THRESHOLD = 5

/** Only the tail of the gesture matters at release, so history stays short. */
const MAX_SAMPLES = 12

/**
 * Grab-drag for a horizontal scroller, with a real hand-off from finger to animation.
 *
 * Setting `scrollLeft` directly gives 1:1 tracking but bypasses native scroll momentum,
 * so a flick would otherwise stop dead the instant the button came up. On release the
 * gesture's velocity is projected forward, the nearest snap point to that projection
 * wins, and the spring enters carrying the same velocity — no seam between drag and glide.
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
  const [isDragging, setIsDragging] = useState(false)

  /** Any in-flight glide yields to new input immediately, rather than finishing first. */
  const stopAnimation = useCallback(() => {
    playback.current?.stop()
    playback.current = null
    const element = ref.current
    if (element) element.style.scrollSnapType = ''
  }, [])

  useEffect(() => stopAnimation, [stopAnimation])

  /** Springs `scrollLeft` to `target`, entering at `velocity` px/s. */
  const animateTo = useCallback(
    (target: number, velocity = 0) => {
      const element = ref.current
      if (!element) return

      // Also restores snapping, so every early return below leaves it reclaimed.
      stopAnimation()

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
    [reduceMotion, stopAnimation],
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
    element.scrollLeft = current.scrollLeft - distance

    samples.current.push({ x: event.clientX, t: event.timeStamp })
    if (samples.current.length > MAX_SAMPLES) samples.current.shift()
  }, [])

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
        // The rail travels opposite the finger, so scrollLeft velocity inverts.
        const velocity = -releaseVelocity(samples.current)
        const projected = element.scrollLeft + projectDecay(velocity)
        animateTo(nearestPoint(getSnapPoints(element), projected), velocity)
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
    [animateTo, getSnapPoints],
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
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
      onClickCapture,
    },
  }
}
