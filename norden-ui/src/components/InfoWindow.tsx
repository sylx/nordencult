import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { useWindowSize } from '../hooks/useWindowSize'
import type { WindowSize } from '../hooks/useWindowSize'
import { resolveWindowSkin, windowSkinStyle } from '../skins'
import type { InfoWindowSkin } from '../skins'
import './InfoWindow.css'

export interface InfoWindowProps {
  title: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  skin?: InfoWindowSkin
  width?: number | 'auto'
  height?: number | 'auto'
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  x?: number
  y?: number
  draggable?: boolean
  resizable?: boolean
  /** @deprecated Use resizable. Kept for compatibility with nordencult-old. */
  resizeable?: boolean
  onPositionChange?: (position: { x: number; y: number }) => void
  onSizeChange?: (size: WindowSize) => void
  /** Decorations placed outside the content viewport (e.g. the tab rail). */
  chrome?: ReactNode
}

interface PointerOperation {
  kind: 'drag' | 'resize'
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
  width: number
  height: number
}

export default function InfoWindow({
  title, children, className = '', style, width = 'auto', height = 'auto',
  minWidth = 320, maxWidth = 720, minHeight = 240, x = 0, y = 0,
  draggable = true, resizable, resizeable = false, onPositionChange, onSizeChange, chrome, skin,
}: InfoWindowProps) {
  const titleId = useId()
  const contentRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const frameRef = useRef<HTMLElement>(null)
  const operation = useRef<PointerOperation | null>(null)
  const [position, setPosition] = useState({ x, y })
  const [interaction, setInteraction] = useState<'drag' | 'resize' | null>(null)
  const [manualSize, setManualSize] = useState<WindowSize | null>(null)
  const resolvedSkin = resolveWindowSkin(skin)
  const layout = resolvedSkin.layout
  const horizontalPadding = layout.paddingLeft + layout.paddingRight
  const verticalPadding = layout.paddingTop + layout.paddingBottom
  const titlePadding = layout.titleCapWidth * 2 + 32
  const minimumSize = 2 * (resolvedSkin.frame?.width ?? layout.cornerSize)
  const { size, widthLimit } = useWindowSize({
    contentRef, titleRef, width, height, minWidth, maxWidth, minHeight, horizontalPadding,
    verticalPadding, titlePadding, minimumSize,
  })
  const actualSize = manualSize ? { ...manualSize, width: Math.min(manualSize.width, widthLimit) } : size
  const canResize = resizable ?? resizeable

  useEffect(() => { setPosition({ x, y }) }, [x, y])
  useEffect(() => { setManualSize(null) }, [width, height, minWidth, maxWidth, minHeight, horizontalPadding, verticalPadding, titlePadding, minimumSize, resolvedSkin.name])

  const start = (event: PointerEvent<HTMLElement>, kind: 'drag' | 'resize') => {
    if (event.button !== 0 || !event.isPrimary || (kind === 'drag' && !draggable)) return
    event.preventDefault()
    const bounds = frameRef.current?.getBoundingClientRect()
    operation.current = {
      kind, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      ...position, width: bounds?.width ?? actualSize.width, height: bounds?.height ?? actualSize.height,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setInteraction(kind)
  }

  const resize = (next: WindowSize) => {
    const clamped = {
      width: Math.min(widthLimit, Math.max(Math.min(widthLimit, Math.max(minimumSize, minWidth)), next.width)),
      height: Math.max(minimumSize, minHeight, next.height),
    }
    setManualSize(clamped)
    onSizeChange?.(clamped)
  }

  const move = (event: PointerEvent<HTMLElement>) => {
    const current = operation.current
    if (!current || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (current.kind === 'resize') {
      resize({ width: current.width + dx, height: current.height + dy })
    } else {
      const next = { x: current.x + dx, y: current.y + dy }
      setPosition(next)
      onPositionChange?.(next)
    }
  }

  const end = (event: PointerEvent<HTMLElement>) => {
    if (operation.current?.pointerId !== event.pointerId) return
    operation.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setInteraction(null)
  }

  const sizingStyle = {
    ...windowSkinStyle(resolvedSkin),
    '--norden-content-max-width': `${Math.max(1, widthLimit - horizontalPadding)}px`,
    ...style,
    ...actualSize,
    left: position.x, top: position.y,
  } as CSSProperties

  return (
    <section ref={frameRef} aria-labelledby={titleId} data-skin={resolvedSkin.name}
      className={`norden-info-window ${interaction === 'drag' ? 'is-dragging' : interaction === 'resize' ? 'is-resizing' : ''} ${className}`}
      style={sizingStyle}
    >
      <div className="norden-info-window-decoration" aria-hidden="true">
        <div className="norden-info-window-paper" />
        {resolvedSkin.frame ? <div className="norden-info-window-frame is-nine-slice" /> : <div className="norden-info-window-frame">
        <div className="norden-info-window-corner is-top-left" /><div className="norden-info-window-top" />
        <div className="norden-info-window-corner is-top-right" /><div className="norden-info-window-left" />
        <div className="norden-info-window-center" /><div className="norden-info-window-right" />
        <div className="norden-info-window-corner is-bottom-left" /><div className="norden-info-window-bottom" />
        <div className="norden-info-window-corner is-bottom-right" />
        </div>}
      </div>
      <div className={`norden-info-window-title ${draggable ? 'is-draggable' : ''}`}
        onPointerDown={event => start(event, 'drag')} onPointerMove={move}
        onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      >
        <span className="norden-info-window-title-corner" aria-hidden="true" />
        <span id={titleId} className="norden-info-window-title-text" title={title}>{title}</span>
        <span className="norden-info-window-title-corner" aria-hidden="true" />
      </div>
      <span ref={titleRef} className="norden-info-window-title-measure" aria-hidden="true">{title}</span>
      <div className="norden-info-window-content">
        <div ref={contentRef} className={`norden-info-window-measure ${width !== 'auto' || manualSize ? 'is-fixed-width' : ''}`}>
          {children}
        </div>
      </div>
      {chrome}
      {canResize && <button type="button" className="norden-info-window-resize" aria-label="ウィンドウのサイズ変更"
        onPointerDown={event => start(event, 'resize')} onPointerMove={move}
        onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
        onKeyDown={event => {
          const delta = event.shiftKey ? 40 : 10
          const keys: Record<string, WindowSize> = {
            ArrowRight: { width: actualSize.width + delta, height: actualSize.height },
            ArrowLeft: { width: actualSize.width - delta, height: actualSize.height },
            ArrowDown: { width: actualSize.width, height: actualSize.height + delta },
            ArrowUp: { width: actualSize.width, height: actualSize.height - delta },
          }
          const next = keys[event.key]
          if (next) { event.preventDefault(); resize(next) }
        }}
      />}
    </section>
  )
}
