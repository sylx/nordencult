import React, { useCallback, useEffect, useRef, useState } from 'react'
import MagBackground from '../../assets/map/map_background.webp'
import MapStrategy from '../../assets/map/map_strategy_low.webp'
import MapOverlay, { type PlaceConfig } from './MapOverlay'
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

const OVERLAY_PLACES: Readonly<Record<string, PlaceConfig>> = {
  P000: { type: 'temple', name: 'ザイオン' },
  P001: { type: 'town', belongTo: 2, name: 'P001' },
  P002: { type: 'city', belongTo: 2, name: 'P002' },
  P003: { type: 'town', belongTo: 2, name: 'P003' },
  P004: { type: 'town', belongTo: 6,name: 'P004' },
  P005: { type: 'town', belongTo: 6,name: 'P005' },
  P006: { type: 'town', belongTo: 1,name: 'P006' },
  P007: { type: 'town', belongTo: 1,name: 'P007' },
  P008: { type: 'city', belongTo: 1, name: 'P008' },
  P009: { type: 'town', belongTo: 4,name: 'P009' },
  P010: { type: 'town', belongTo: 6,name: 'P010' },
  P011: { type: 'city', belongTo: 6, name: 'P011' },
  P012: { type: 'town', belongTo: 7, name: 'P012' },
  P013: { type: 'town', belongTo: 5, name: 'P013' },
  P014: { type: 'town', belongTo: 6, name: 'P014' },
  P015: { type: 'town', belongTo: 6, name: 'P015' },
  P016: { type: 'town', belongTo: 5, name: 'P016' },
  P017: { type: 'town', belongTo: 3, name: 'P017' },
  P018: { type: 'city', belongTo: 3, name: 'P018' },
  P019: { type: 'town', belongTo: 3, name: 'P019' },
  P020: { type: 'town', belongTo: 3, name: 'P020' },
  P021: { type: 'town', belongTo: 5 , name: 'P021' },
  P022: { type: 'town', belongTo: 4, name: 'P022' },
  P023: { type: 'metropolice', belongTo: 6, name: 'P023' },
  P024: { type: 'fortress1', belongTo: 6, name: 'P024' },
  P025: { type: 'fortress1', belongTo: 6, name: 'P025' },
  P026: { type: 'city', belongTo: 7, name: 'P026' },
  P027: { type: 'city', belongTo: 3, name: 'P027' },
  P028: { type: 'city', belongTo: 5, name: 'P028' },
  P029: { type: 'fortress2', belongTo: 5, name: 'P029' },
  P030: { type: 'town', belongTo: 2,name: 'P030' },
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
  const [activePlace, setActivePlace] = useState<string>('P002')
  const activePlacePositionRef = useRef<{
    id: string
    x: number
    y: number
  } | null>(null)
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

  const handleActivatePlace = useCallback(
    (place: { id: string; x: number; y: number } | null) => {
      activePlacePositionRef.current = place

      if (!place || place.id !== activePlace) return

      const rect = backgroundRef.current?.getBoundingClientRect()
      const viewW = rect?.width ?? window.innerWidth
      const viewH = rect?.height ?? window.innerHeight

      setStrategy((prev) =>
        clampStrategy(
          {
            ...prev,
            x: viewW / 2 - place.x * prev.scale,
            y: viewH / 2 - place.y * prev.scale,
          },
          viewW,
          viewH,
        ),
      )
    },
    [activePlace],
  )

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
          activePlace={activePlace}
          places={OVERLAY_PLACES}
          scale={strategy.scale}
          onActivatePlace={handleActivatePlace}
          onPlaceClick={(placeId) => {
            setActivePlace(placeId)
          }}
          style={{
            transform: `translate(${strategy.x}px, ${strategy.y}px) scale(${strategy.scale})`,
          }}
        />
      </div>
      <div className="map-fg-coin" style={{ transform: `scale(${scale * 4})` }}/>
      <div className="map-fg-card" style={{ transform: `scale(${scale * 3.5})` }} />
      <div className="debug-info">
        <div>Scale: {strategy.scale.toFixed(2)}</div>
        <div>Translate: ({strategy.x.toFixed(0)}, {strategy.y.toFixed(0)})</div>
      </div>
    </div>
  )
}

