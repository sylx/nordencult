import React, { useEffect, useRef, useState } from 'react'
import MagBackground from '../../assets/map/map_background.webp'
import MapStrategy from '../../assets/map/map_strategy.webp'
import './Map.css'

export default function Map() {
  const computeScale = () => Math.max(800,window.innerWidth) / 7170 * 1.25
  const [scale, setScale] = useState<number>(() => computeScale())
  const [strategyPosition, setStrategyPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
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

      setStrategyPosition({
        x: dragState.startTranslateX + deltaX,
        y: dragState.startTranslateY + deltaY,
      })
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

  const handleStrategyPointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
    event.preventDefault()

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTranslateX: strategyPosition.x,
      startTranslateY: strategyPosition.y,
    }

    setIsDragging(true)
  }

  return (
    <div className="background">
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
        onPointerDown={handleStrategyPointerDown}
        style={{
          transform: `translate(${strategyPosition.x}px, ${strategyPosition.y}px) scale(0.2)`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      />
    </div>
  )
}

