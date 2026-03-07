import React, { useEffect, useRef, useState } from 'react'
import MagBackground from '../../assets/map/map_background.webp'
import MapStrategy from '../../assets/map/map_strategy_low.webp'
import PlaceCity from '../../assets/map/place_city.webp'
import PlaceFortress1 from '../../assets/map/place_fortress1.webp'
import PlaceFortress2 from '../../assets/map/place_fortress2.webp'
import PlaceMetropolice from '../../assets/map/place_metropolice.webp'
import PlaceTemple from '../../assets/map/place_temple.webp'
import PlaceTown from '../../assets/map/place_town.webp'
import MapOverlay, { type MapOverlayProps } from './MapOverlay'
import './Map.css'

// --- Tunable constants ---------------------------------------------------
/** Zoom limits */
const SCALE_MIN = 0.075
const SCALE_MAX = 0.60
/**
 * Pan limits in image-space pixels.
 * These define which image-space coordinate can be placed at the viewport
 * centre. Because the constraint is in image space, a single pair of
 * min/max values works identically at every zoom level.
 */
const PAN_IMG_X_MIN = 1000
const PAN_IMG_X_MAX = 8192
const PAN_IMG_Y_MIN = 0
const PAN_IMG_Y_MAX = 8192
// -------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface StrategyTransform {
  x: number
  y: number
  scale: number
}

const OVERLAY_PLACES: NonNullable<MapOverlayProps['places']> = {
  P000: { imageSrc: PlaceTemple,imageScale: 3.0 },
  P001: { imageSrc: PlaceTown },
  P002: { imageSrc: PlaceFortress1 },
  P003: { imageSrc: PlaceTown },
  P004: { imageSrc: PlaceMetropolice },
  P005: { imageSrc: PlaceCity },
  P006: { imageSrc: PlaceFortress2 },
  P007: { imageSrc: PlaceTown },
  P008: { imageSrc: PlaceCity },
  P009: { imageSrc: PlaceFortress1 },
  P010: { imageSrc: PlaceTown },
  P011: { imageSrc: PlaceMetropolice },
  P012: { imageSrc: PlaceFortress2 },
  P013: { imageSrc: PlaceCity },
  P014: { imageSrc: PlaceTown },
  P015: { imageSrc: PlaceFortress1 },
  P016: { imageSrc: PlaceTown },
  P017: { imageSrc: PlaceFortress2 },
  P018: { imageSrc: PlaceCity },
  P019: { imageSrc: PlaceTown },
  P020: { imageSrc: PlaceMetropolice },
  P021: { imageSrc: PlaceTown },
  P022: { imageSrc: PlaceFortress1 },
  P023: { imageSrc: PlaceMetropolice, },
  P024: { imageSrc: PlaceFortress2 },
  P025: { imageSrc: PlaceCity },
  P026: { imageSrc: PlaceTown },
  P027: { imageSrc: PlaceFortress1 },
  P028: { imageSrc: PlaceTown },
  P029: { imageSrc: PlaceCity },
  P030: { imageSrc: PlaceTown },
}

/**
 * Clamp scale and pan position.
 * Converts the viewport-centre to image-space, clamps to the allowed
 * rectangle, then converts back to screen-space translation.
 */
function clampStrategy(
  s: StrategyTransform,
  viewW: number,
  viewH: number,
): StrategyTransform {
  const scale = clamp(s.scale, SCALE_MIN, SCALE_MAX)
  // Image-space coordinate currently at viewport centre
  const imgCenterX = (viewW / 2 - s.x) / scale
  const imgCenterY = (viewH / 2 - s.y) / scale
  // Clamp to allowed range
  const cx = clamp(imgCenterX, PAN_IMG_X_MIN, PAN_IMG_X_MAX)
  const cy = clamp(imgCenterY, PAN_IMG_Y_MIN, PAN_IMG_Y_MAX)
  // Convert back to screen-space
  return { x: viewW / 2 - cx * scale, y: viewH / 2 - cy * scale, scale }
}

export default function Map() {
  const computeScale = () => (Math.max(800, window.innerWidth) / 7170) * 1.25
  const [scale, setScale] = useState<number>(() => computeScale())
  const [strategy, setStrategy] = useState<StrategyTransform>(() =>
    clampStrategy(
      { x: 582, y: 6, scale: 0.1 },
      window.innerWidth,
      window.innerHeight,
    )
  )
  const [isDragging, setIsDragging] = useState(false)
  const backgroundRef = useRef<HTMLDivElement | null>(null)
  const strategyImageRef = useRef<HTMLImageElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startTranslateX: number
    startTranslateY: number
  } | null>(null)

  useEffect(() => {
    let raf = 0
    const handleResize = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setScale(computeScale())
        // Re-clamp strategy for new viewport size
        setStrategy((prev) =>
          clampStrategy(prev, window.innerWidth, window.innerHeight)
        )
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current
      if (!dragState || dragState.pointerId !== event.pointerId) return

      const deltaX = event.clientX - dragState.startX
      const deltaY = event.clientY - dragState.startY

      setStrategy((prev) =>
        clampStrategy(
          {
            ...prev,
            x: dragState.startTranslateX + deltaX,
            y: dragState.startTranslateY + deltaY,
          },
          window.innerWidth,
          window.innerHeight,
        )
      )
    }

    const handlePointerUp = (event: PointerEvent) => {
      const dragState = dragStateRef.current
      if (!dragState || dragState.pointerId !== event.pointerId) return

      dragStateRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [])

  useEffect(() => {
    const background = backgroundRef.current
    if (!background) return

    const handleWheel = (event: WheelEvent) => {
      const rect = background.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top

      if (
        pointerX < 0 ||
        pointerX > rect.width ||
        pointerY < 0 ||
        pointerY > rect.height
      )
        return

      setStrategy((prev) => {
        const zoomFactor = Math.exp(-event.deltaY * 0.001)
        const nextScale = clamp(prev.scale * zoomFactor, SCALE_MIN, SCALE_MAX)

        if (nextScale === prev.scale) return prev

        // Image point under cursor in image-local coordinates
        const imgX = (pointerX - prev.x) / prev.scale
        const imgY = (pointerY - prev.y) / prev.scale

        return clampStrategy(
          {
            x: pointerX - imgX * nextScale,
            y: pointerY - imgY * nextScale,
            scale: nextScale,
          },
          rect.width,
          rect.height,
        )
      })
    }

    background.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      background.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const handleStrategyPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault()

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTranslateX: strategy.x,
      startTranslateY: strategy.y,
    }

    setIsDragging(true)
  }

  return (
    <div className="background" ref={backgroundRef}>
      <div className="background-container">
        <img
          src={MagBackground}
          alt="Map Background"
          className="background-image"
          style={{ transform: `scale(${scale})` }}
        />
        <div className="mask-bg" />
        <div className="light-fg" />
      </div>
      <div className="strategy-container">
        <div className="sea-bg"
          onPointerDown={handleStrategyPointerDown}
          style={{
            transform: `translate(${strategy.x}px, ${strategy.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        />
        <img
          src={MapStrategy}
          alt="Map Strategy"
          className="strategy-image"
          ref={strategyImageRef}
          onPointerDown={handleStrategyPointerDown}
          style={{
            transform: `translate(${strategy.x}px, ${strategy.y}px) scale(${strategy.scale})`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        />
        <MapOverlay
          places={OVERLAY_PLACES}
          style={{
            transform: `translate(${strategy.x}px, ${strategy.y}px) scale(${strategy.scale})`,
          }}
        />
      </div>
      <div className="debug-info">
        <div>Scale: {strategy.scale.toFixed(2)}</div>
        <div>Translate: ({strategy.x.toFixed(0)}, {strategy.y.toFixed(0)})</div>
      </div>
    </div>
  )
}

