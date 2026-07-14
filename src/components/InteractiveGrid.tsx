import { useEffect, useRef } from 'react'

const GRID_SIZE = 40
const SAMPLE_STEP = 10
const EFFECT_RADIUS = 230
const MAX_PULL = 14

interface GridPointer {
  x: number
  y: number
  targetX: number
  targetY: number
  strength: number
  targetStrength: number
}

export default function InteractiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return

    const renderingContext = canvasElement.getContext('2d')
    if (!renderingContext) return
    const canvas: HTMLCanvasElement = canvasElement
    const context: CanvasRenderingContext2D = renderingContext

    const pointer: GridPointer = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      strength: 0,
      targetStrength: 0,
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = window.innerWidth
    let height = window.innerHeight
    let animationFrame: number | null = null

    function warpedPoint(x: number, y: number) {
      if (pointer.strength < 0.001) return { x, y }

      const deltaX = pointer.x - x
      const deltaY = pointer.y - y
      const distance = Math.hypot(deltaX, deltaY)
      if (distance === 0 || distance >= EFFECT_RADIUS) return { x, y }

      const proximity = 1 - distance / EFFECT_RADIUS
      const falloff = proximity * proximity * (3 - 2 * proximity)
      const centerDamping = Math.min(1, distance / 18)
      const pull = MAX_PULL * pointer.strength * falloff * centerDamping

      return {
        x: x + (deltaX / distance) * pull,
        y: y + (deltaY / distance) * pull,
      }
    }

    function buildGridPath() {
      context.beginPath()

      for (let x = 0; x <= width + GRID_SIZE; x += GRID_SIZE) {
        let firstPoint = true
        for (let y = -SAMPLE_STEP; y <= height + SAMPLE_STEP; y += SAMPLE_STEP) {
          const point = warpedPoint(x, y)
          if (firstPoint) context.moveTo(point.x, point.y)
          else context.lineTo(point.x, point.y)
          firstPoint = false
        }
      }

      for (let y = 0; y <= height + GRID_SIZE; y += GRID_SIZE) {
        let firstPoint = true
        for (let x = -SAMPLE_STEP; x <= width + SAMPLE_STEP; x += SAMPLE_STEP) {
          const point = warpedPoint(x, y)
          if (firstPoint) context.moveTo(point.x, point.y)
          else context.lineTo(point.x, point.y)
          firstPoint = false
        }
      }
    }

    function draw() {
      context.clearRect(0, 0, width, height)

      if (pointer.strength > 0.001) {
        const ambientGlow = context.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          EFFECT_RADIUS * 1.15,
        )
        ambientGlow.addColorStop(0, `rgba(61, 220, 132, ${0.026 * pointer.strength})`)
        ambientGlow.addColorStop(0.55, `rgba(61, 220, 132, ${0.01 * pointer.strength})`)
        ambientGlow.addColorStop(1, 'rgba(61, 220, 132, 0)')
        context.fillStyle = ambientGlow
        context.fillRect(
          pointer.x - EFFECT_RADIUS * 1.15,
          pointer.y - EFFECT_RADIUS * 1.15,
          EFFECT_RADIUS * 2.3,
          EFFECT_RADIUS * 2.3,
        )
      }

      buildGridPath()
      context.lineWidth = 1
      context.strokeStyle = 'rgba(255, 255, 255, 0.02)'
      context.shadowBlur = 0
      context.stroke()

      if (pointer.strength > 0.001) {
        const lineGlow = context.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          EFFECT_RADIUS,
        )
        lineGlow.addColorStop(0, `rgba(61, 220, 132, ${0.24 * pointer.strength})`)
        lineGlow.addColorStop(0.35, `rgba(61, 220, 132, ${0.13 * pointer.strength})`)
        lineGlow.addColorStop(0.72, `rgba(61, 220, 132, ${0.035 * pointer.strength})`)
        lineGlow.addColorStop(1, 'rgba(61, 220, 132, 0)')
        context.strokeStyle = lineGlow
        context.shadowColor = `rgba(61, 220, 132, ${0.2 * pointer.strength})`
        context.shadowBlur = 7 * pointer.strength
        context.stroke()
        context.shadowBlur = 0
      }
    }

    function animate() {
      pointer.x += (pointer.targetX - pointer.x) * 0.14
      pointer.y += (pointer.targetY - pointer.y) * 0.14
      pointer.strength += (pointer.targetStrength - pointer.strength) * 0.09
      draw()

      const isMoving =
        Math.abs(pointer.targetX - pointer.x) > 0.1 ||
        Math.abs(pointer.targetY - pointer.y) > 0.1 ||
        Math.abs(pointer.targetStrength - pointer.strength) > 0.002

      if (isMoving) animationFrame = window.requestAnimationFrame(animate)
      else animationFrame = null
    }

    function startAnimation() {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(animate)
    }

    function resizeCanvas() {
      width = window.innerWidth
      height = window.innerHeight
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      draw()
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType === 'touch' || reducedMotion.matches) return

      if (pointer.strength < 0.001) {
        pointer.x = event.clientX
        pointer.y = event.clientY
      }
      pointer.targetX = event.clientX
      pointer.targetY = event.clientY
      pointer.targetStrength = 1
      startAnimation()
    }

    function releasePointer() {
      pointer.targetStrength = 0
      startAnimation()
    }

    function handleMotionPreference() {
      if (!reducedMotion.matches) return

      pointer.strength = 0
      pointer.targetStrength = 0
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      animationFrame = null
      draw()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('blur', releasePointer)
    document.documentElement.addEventListener('mouseleave', releasePointer)
    reducedMotion.addEventListener('change', handleMotionPreference)

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('blur', releasePointer)
      document.documentElement.removeEventListener('mouseleave', releasePointer)
      reducedMotion.removeEventListener('change', handleMotionPreference)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}
