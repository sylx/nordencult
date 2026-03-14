import { useRef, useState } from 'react'

import './InfoWindow.css'

export interface InfoWindowProps {
  title: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  resizeable?: boolean
  width?: number
  height?: number | 'auto',
  x?: number
  y?: number
}

interface DragState {
  pointerStartX: number
  pointerStartY: number
  windowStartX: number
  windowStartY: number
}

export default function InfoWindow({
  title,
  children,
  className,
  style,
  resizeable = false,
  width = 300,
  height = 'auto',
  x = 0,
  y = 0,
}: InfoWindowProps) {
  const [position, setPosition] = useState(() => ({ x, y }))
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef<DragState | null>(null)

  const handleTitlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    dragStateRef.current = {
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      windowStartX: position.x,
      windowStartY: position.y,
    }
    setIsDragging(true)
  }

  const handleTitlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStateRef.current) {
      return
    }

    const dragState = dragStateRef.current
    const deltaX = event.clientX - dragState.pointerStartX
    const deltaY = event.clientY - dragState.pointerStartY

    setPosition({
      x: dragState.windowStartX + deltaX,
      y: dragState.windowStartY + deltaY,
    })
  }

  const handleTitlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragStateRef.current = null
    setIsDragging(false)
  }

  return (
    <div
      className={`info-window ${resizeable ? 'resizeable' : ''} ${isDragging ? 'is-dragging' : ''} ${className || ''}`}
      style={{ width, height, ...style, left: position.x, top: position.y }}
    >
      <div className="info-window-bg-container">
        <div className="info-window-corner --left-top" />
        <div className="info-window-top"></div>
        <div className="info-window-corner --right-top" />
        <div className="info-window-left" />
        <div className="info-window-center"></div>
        <div className="info-window-right" />
        <div className="info-window-corner --left-bottom" />
        <div className="info-window-bottom" />
        <div className="info-window-corner --right-bottom" />
      </div>
      <div
        className="info-window-title"
        onPointerDown={handleTitlePointerDown}
        onPointerMove={handleTitlePointerMove}
        onPointerUp={handleTitlePointerEnd}
        onPointerCancel={handleTitlePointerEnd}
      >
        <span className="info-window-title-corner" />
        <span className="info-window-title-text">{title}</span>
        <span className="info-window-title-corner" />
      </div>
      <div className="info-window-content">
        {children}
      </div>
    </div>
  )
}
