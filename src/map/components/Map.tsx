import React, { useEffect, useRef, useState } from 'react'
import MagBackground from '../../assets/map/map_background.webp'
import MapStrategy from '../../assets/map/map_strategy.webp'
import './Map.css'

interface StrategyTransform {
  x: number
  y: number
  scale: number
}

export default function Map() {
  const computeScale = () => (Math.max(800, window.innerWidth) / 7170) * 1.25
  const [scale, setScale] = useState<number>(() => computeScale())
  const [strategy, setStrategy] = useState<StrategyTransform>({
    x: 0,
    y: 0,
    scale: 0.2,
  })
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

      setStrategy((prev) => ({
        ...prev,
        x: dragState.startTranslateX + deltaX,
        y: dragState.startTranslateY + deltaY,
      }))
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
        const zoomFactor = Math.exp(-event.deltaY * 0.0015)
        const nextScale = Math.min(3, Math.max(0.05, prev.scale * zoomFactor))

        if (nextScale === prev.scale) return prev

        // Image point under cursor in image-local coordinates
        const imgX = (pointerX - prev.x) / prev.scale
        const imgY = (pointerY - prev.y) / prev.scale

        return {
          x: pointerX - imgX * nextScale,
          y: pointerY - imgY * nextScale,
          scale: nextScale,
        }
      })
    }

    background.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      background.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const handleStrategyPointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
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
      <img
        src={MagBackground}
        alt="Map Background"
        className="background-image"
        style={{ transform: `scale(${scale})` }}
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
    </div>
  )
}

