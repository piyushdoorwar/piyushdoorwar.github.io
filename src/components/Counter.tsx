import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import { formatStat } from '../data/stats'

interface CounterProps {
  value: number | null | undefined
  duration?: number
}

/** Counts up from 0 to `value` when scrolled into view. Renders "—" when value is missing. */
export default function Counter({ value, duration = 1400 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === null || value === undefined) return
    if (!inView) return
    if (reduce) {
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration, reduce])

  return <span ref={ref}>{value === null || value === undefined ? '—' : formatStat(display)}</span>
}
