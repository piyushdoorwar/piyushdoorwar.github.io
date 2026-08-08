import { useEffect, useRef } from 'react'

const GRID_SIZE = 40
const SAMPLE_STEP = 10
const EFFECT_RADIUS = 230
const MAX_PULL = 14
const NODE_RADIUS = 1.1
const PACKET_COUNT = 8
const PACKET_TRAIL = 96
const PACKET_SEGMENTS = 8

interface GridPointer {
  x: number
  y: number
  targetX: number
  targetY: number
  strength: number
  targetStrength: number
}

/** A packet travels one grid line like traffic on a wire, then respawns elsewhere. */
interface Packet {
  axis: 'x' | 'y'
  /** Grid line the packet rides, in grid units. */
  lane: number
  /** Head position along the axis of travel, in pixels. */
  head: number
  direction: 1 | -1
  speed: number
  /** Cyan packets are rarer, so the traffic reads as mixed rather than uniform. */
  cyan: boolean
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
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    let animationFrame: number | null = null
    let lastFrameTime = 0
    let packets: Packet[] = []

    // The unwarped grid never changes between resizes, so it is rasterised once and
    // blitted while the pointer is idle. That keeps the always-on packet loop cheap.
    const staticLayer = document.createElement('canvas')
    const staticContext = staticLayer.getContext('2d')

    function spawnPacket(): Packet {
      const axis: 'x' | 'y' = Math.random() < 0.5 ? 'x' : 'y'
      const laneCount = Math.max(1, Math.floor((axis === 'x' ? height : width) / GRID_SIZE))
      const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1
      const travel = axis === 'x' ? width : height

      return {
        axis,
        lane: Math.floor(Math.random() * (laneCount + 1)),
        head: direction === 1 ? -PACKET_TRAIL - Math.random() * travel : travel + PACKET_TRAIL + Math.random() * travel,
        direction,
        speed: 90 + Math.random() * 130,
        cyan: Math.random() < 0.25,
      }
    }

    function resetPackets() {
      packets = Array.from({ length: PACKET_COUNT }, spawnPacket)
    }

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

    function buildGridPath(target: CanvasRenderingContext2D) {
      target.beginPath()

      for (let x = 0; x <= width + GRID_SIZE; x += GRID_SIZE) {
        let firstPoint = true
        for (let y = -SAMPLE_STEP; y <= height + SAMPLE_STEP; y += SAMPLE_STEP) {
          const point = warpedPoint(x, y)
          if (firstPoint) target.moveTo(point.x, point.y)
          else target.lineTo(point.x, point.y)
          firstPoint = false
        }
      }

      for (let y = 0; y <= height + GRID_SIZE; y += GRID_SIZE) {
        let firstPoint = true
        for (let x = -SAMPLE_STEP; x <= width + SAMPLE_STEP; x += SAMPLE_STEP) {
          const point = warpedPoint(x, y)
          if (firstPoint) target.moveTo(point.x, point.y)
          else target.lineTo(point.x, point.y)
          firstPoint = false
        }
      }
    }

    /** Rasterises the resting grid plus its constellation nodes into the offscreen layer. */
    function renderStaticLayer() {
      if (!staticContext) return

      staticLayer.width = Math.round(width * pixelRatio)
      staticLayer.height = Math.round(height * pixelRatio)
      staticContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      staticContext.clearRect(0, 0, width, height)

      buildGridPath(staticContext)
      staticContext.lineWidth = 1
      staticContext.strokeStyle = 'rgba(255, 255, 255, 0.02)'
      staticContext.stroke()

      staticContext.fillStyle = 'rgba(255, 255, 255, 0.05)'
      for (let x = 0; x <= width + GRID_SIZE; x += GRID_SIZE) {
        for (let y = 0; y <= height + GRID_SIZE; y += GRID_SIZE) {
          staticContext.beginPath()
          staticContext.arc(x, y, NODE_RADIUS, 0, Math.PI * 2)
          staticContext.fill()
        }
      }
    }

    /** Lights the intersections inside the pointer halo so the grid reads as a live mesh. */
    function drawLitNodes() {
      if (pointer.strength < 0.001) return

      const startX = Math.floor((pointer.x - EFFECT_RADIUS) / GRID_SIZE) * GRID_SIZE
      const endX = pointer.x + EFFECT_RADIUS
      const startY = Math.floor((pointer.y - EFFECT_RADIUS) / GRID_SIZE) * GRID_SIZE
      const endY = pointer.y + EFFECT_RADIUS

      for (let x = startX; x <= endX; x += GRID_SIZE) {
        for (let y = startY; y <= endY; y += GRID_SIZE) {
          const distance = Math.hypot(pointer.x - x, pointer.y - y)
          if (distance >= EFFECT_RADIUS) continue

          const proximity = 1 - distance / EFFECT_RADIUS
          const intensity = proximity * proximity * pointer.strength
          const point = warpedPoint(x, y)

          context.beginPath()
          context.fillStyle = `rgba(92, 240, 160, ${0.5 * intensity})`
          context.arc(point.x, point.y, NODE_RADIUS + 1.1 * intensity, 0, Math.PI * 2)
          context.fill()
        }
      }
    }

    function packetPoint(packet: Packet, distanceBehindHead: number) {
      const along = packet.head - packet.direction * distanceBehindHead
      const across = packet.lane * GRID_SIZE
      return packet.axis === 'x' ? warpedPoint(along, across) : warpedPoint(across, along)
    }

    function drawPackets() {
      for (const packet of packets) {
        const head = packetPoint(packet, 0)
        const tail = packetPoint(packet, PACKET_TRAIL)
        const rgb = packet.cyan ? '34, 211, 238' : '61, 220, 132'

        const trailGradient = context.createLinearGradient(tail.x, tail.y, head.x, head.y)
        trailGradient.addColorStop(0, `rgba(${rgb}, 0)`)
        trailGradient.addColorStop(1, `rgba(${rgb}, 0.5)`)

        context.beginPath()
        context.moveTo(tail.x, tail.y)
        for (let segment = PACKET_SEGMENTS - 1; segment >= 0; segment -= 1) {
          const point = packetPoint(packet, (PACKET_TRAIL * segment) / PACKET_SEGMENTS)
          context.lineTo(point.x, point.y)
        }
        context.strokeStyle = trailGradient
        context.lineWidth = 1.4
        context.lineCap = 'round'
        context.stroke()

        context.beginPath()
        context.fillStyle = `rgba(${rgb}, 0.85)`
        context.shadowColor = `rgba(${rgb}, 0.55)`
        context.shadowBlur = 6
        context.arc(head.x, head.y, 1.7, 0, Math.PI * 2)
        context.fill()
        context.shadowBlur = 0
      }
    }

    function advancePackets(deltaSeconds: number) {
      for (let index = 0; index < packets.length; index += 1) {
        const packet = packets[index]!
        packet.head += packet.direction * packet.speed * deltaSeconds

        const travel = packet.axis === 'x' ? width : height
        const finished =
          packet.direction === 1
            ? packet.head - PACKET_TRAIL > travel
            : packet.head + PACKET_TRAIL < 0

        if (finished) {
          const replacement = spawnPacket()
          replacement.head =
            replacement.direction === 1
              ? -PACKET_TRAIL
              : (replacement.axis === 'x' ? width : height) + PACKET_TRAIL
          packets[index] = replacement
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

        buildGridPath(context)
        context.lineWidth = 1
        context.strokeStyle = 'rgba(255, 255, 255, 0.02)'
        context.shadowBlur = 0
        context.stroke()

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

        drawLitNodes()
      } else if (staticContext && staticLayer.width > 0 && staticLayer.height > 0) {
        // A viewport that measures 0 at mount (hidden tab, prerender, display:none frame)
        // rasterises a 0x0 static layer, and drawImage throws InvalidStateError on one.
        // Skipping the blit lets setup finish, so the resize handler is still registered
        // and repaints properly once the viewport reports real dimensions.
        context.drawImage(staticLayer, 0, 0, width, height)
      }

      if (!reducedMotion.matches) drawPackets()
    }

    function animate(timestamp: number) {
      const deltaSeconds = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.05) : 0
      lastFrameTime = timestamp

      pointer.x += (pointer.targetX - pointer.x) * 0.14
      pointer.y += (pointer.targetY - pointer.y) * 0.14
      pointer.strength += (pointer.targetStrength - pointer.strength) * 0.09
      if (!reducedMotion.matches) advancePackets(deltaSeconds)
      draw()

      const warpSettling =
        Math.abs(pointer.targetX - pointer.x) > 0.1 ||
        Math.abs(pointer.targetY - pointer.y) > 0.1 ||
        Math.abs(pointer.targetStrength - pointer.strength) > 0.002

      // Packets keep the loop alive on their own; reduced motion falls back to the
      // original behaviour where the frame loop stops once the warp settles.
      if (warpSettling || !reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(animate)
      } else {
        animationFrame = null
      }
    }

    function startAnimation() {
      if (animationFrame === null) {
        lastFrameTime = 0
        animationFrame = window.requestAnimationFrame(animate)
      }
    }

    function stopAnimation() {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      animationFrame = null
    }

    function resizeCanvas() {
      width = window.innerWidth
      height = window.innerHeight
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      renderStaticLayer()
      resetPackets()
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

    // A backgrounded tab should not burn frames on traffic nobody can see.
    function handleVisibilityChange() {
      if (document.hidden) stopAnimation()
      else if (!reducedMotion.matches) startAnimation()
    }

    function handleMotionPreference() {
      if (reducedMotion.matches) {
        pointer.strength = 0
        pointer.targetStrength = 0
        stopAnimation()
        draw()
      } else {
        resetPackets()
        startAnimation()
      }
    }

    resizeCanvas()
    if (!reducedMotion.matches) startAnimation()
    window.addEventListener('resize', resizeCanvas, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('blur', releasePointer)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.documentElement.addEventListener('mouseleave', releasePointer)
    reducedMotion.addEventListener('change', handleMotionPreference)

    return () => {
      stopAnimation()
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('blur', releasePointer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
