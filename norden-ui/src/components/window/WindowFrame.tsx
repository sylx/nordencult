import { useEffect, useId, useRef, useState, type HTMLAttributes, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import './WindowFrame.css'
import './NavigationWindow.css'

export interface WindowFrameNavigation {
  onBack?: () => void
  onForward?: () => void
  backDisabled?: boolean
  forwardDisabled?: boolean
  backLabel?: string
  forwardLabel?: string
}

export interface WindowFrameProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  /** The close control's action. Omitted: no close control (a window that must be answered) */
  onClose?: () => void
  closeLabel?: string
  background?: 'parchment' | 'dark'
  navigation?: WindowFrameNavigation
  draggable?: boolean
  /** Offset from the window's layout position, in px. */
  position?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
}

/** Sculpted metal frame with a close control woven into its top-right corner.
 * The caller supplies its accessible name (or `title`) and controls its position and size via className/style.
 */
export default function WindowFrame({
  title, onClose, closeLabel = '閉じる', background = 'dark', navigation, className = '', children,
  draggable = false, position, onPositionChange, style,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, ...props
}: WindowFrameProps) {
  const titleId = useId()
  const x = position?.x ?? 0
  const y = position?.y ?? 0
  const [offset, setOffset] = useState({ x, y })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null)
  useEffect(() => { setOffset({ x, y }) }, [x, y])
  const moveTo = (next: { x: number; y: number }) => {
    setOffset(next)
    onPositionChange?.(next)
  }
  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggable || event.button !== 0 || !event.isPrimary || drag.current) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ...offset }
    setDragging(true)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!draggable || !current || current.pointerId !== event.pointerId) return
    event.stopPropagation()
    moveTo({ x: current.x + event.clientX - current.startX, y: current.y + event.clientY - current.startY })
  }
  const end = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    event.stopPropagation()
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!draggable || drag.current) return
    const step = event.shiftKey ? 1 : 10
    const directions: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    }
    const delta = directions[event.key]
    if (!delta && event.key !== 'Home') return
    event.preventDefault()
    event.stopPropagation()
    moveTo(delta ? { x: offset.x + delta.x, y: offset.y + delta.y } : { x: 0, y: 0 })
  }
  return (
    <section
      className={`norden-window-frame ${navigation ? 'norden-window-frame-with-navigation' : ''} ${dragging ? 'is-dragging' : ''} ${className}`}
      style={{ ...style, ...(draggable || position || offset.x !== 0 || offset.y !== 0 ? { translate: `${offset.x}px ${offset.y}px` } : {}) }}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? ariaLabelledby : (ariaLabelledby ?? (title ? titleId : undefined))}
      {...props}
      data-background={background}
    >
      <div className="norden-window-frame-decoration" aria-hidden="true">
        <div className="norden-window-frame-surface" />
        <div className="norden-window-frame-border" />
      </div>
      {navigation && (
        <div className="norden-window-frame-navigation" role="group" aria-label="ウィンドウの移動">
          <div className="norden-window-frame-navigation-decoration" aria-hidden="true" />
          {(['back', 'forward'] as const).map(direction => {
            const back = direction === 'back'
            const label = (back ? navigation.backLabel : navigation.forwardLabel) ?? (back ? '戻る' : '進む')
            const onClick = back ? navigation.onBack : navigation.onForward
            const disabled = (back ? navigation.backDisabled : navigation.forwardDisabled) || !onClick
            return <button key={direction} type="button"
              className={`norden-window-frame-navigation-button is-${direction}`}
              aria-label={label} title={label} onClick={onClick} disabled={disabled}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d={back ? 'M19 12H5m7-7-7 7 7 7' : 'M5 12h14m-7-7 7 7-7 7'} />
              </svg>
            </button>
          })}
        </div>
      )}
      {title !== undefined && title !== null && (
        <div className={`norden-window-frame-title ${draggable ? 'is-draggable' : ''}`}
          role={draggable ? 'button' : undefined} tabIndex={draggable ? 0 : undefined}
          aria-label={draggable ? 'ウィンドウを移動' : undefined}
          title={draggable ? 'タイトルをドラッグ、または矢印キーで移動（Shiftで微調整・Homeで元の位置）' : undefined}
          onPointerDown={start} onPointerMove={move} onPointerUp={end}
          onPointerCancel={end} onLostPointerCapture={end} onKeyDown={keyDown}>
          <span id={titleId} className="norden-window-frame-title-text">{title}</span>
        </div>
      )}
      {onClose && (
        <button type="button" className="norden-window-frame-close"
          aria-label={closeLabel} title={closeLabel} onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <path d="m5 5 14 14M19 5 5 19" />
          </svg>
        </button>
      )}
      <div className="norden-window-frame-content">{children}</div>
    </section>
  )
}
