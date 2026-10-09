import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react'
import './CommandToolbar.css'

export interface ToolbarCommand {
  id: string
  label: string
  icon?: ReactNode
  /** Called for a command without children. */
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  /** Tooltip, e.g. why the command is disabled. */
  title?: string
  /** `accent` stands out from the others (e.g. ending the turn). */
  tone?: 'normal' | 'accent'
  /** Sub-commands opened above the toolbar when the command is pressed. */
  children?: readonly ToolbarCommand[]
}

export interface CommandToolbarProps {
  commands: readonly ToolbarCommand[]
  width?: CSSProperties['width']
  /** Show the drag handles on both ends. */
  movable?: boolean
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}

interface DragState {
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
}

export default function CommandToolbar({
  commands, width, movable = true, className = '', style, 'aria-label': label = 'コマンド',
}: CommandToolbarProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [flyoutX, setFlyoutX] = useState(0)
  const dragRef = useRef<DragState | null>(null)
  const rootRef = useRef<HTMLElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const flyoutId = useId()
  const open = commands.find(command => command.id === openId && command.children && !command.disabled)
  const openedId = open?.id

  // Keyed by id: the commands are usually rebuilt on every render of the parent
  useEffect(() => {
    if (!openedId) return
    flyoutRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const close = (focusParent: boolean) => {
      setOpenId(null)
      if (focusParent) buttonRefs.current.get(openedId)?.focus()
    }
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close(false)
    }
    // Escape closes the sub-commands first. preventDefault tells ScreenHost not to go back a screen.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      close(true)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openedId])

  const toggle = (command: ToolbarCommand) => {
    if (openId === command.id) { setOpenId(null); return }
    // The flyout sits outside the scrolling item row, centered over its button.
    const button = buttonRefs.current.get(command.id)
    const root = rootRef.current
    if (button && root) {
      const bounds = button.getBoundingClientRect()
      setFlyoutX(bounds.left + bounds.width / 2 - root.getBoundingClientRect().left)
    }
    setOpenId(command.id)
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !event.isPrimary || dragRef.current) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: offset.x, offsetY: offset.y }
    setIsDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setOffset({ x: drag.offsetX + event.clientX - drag.startX, y: drag.offsetY + event.clientY - drag.startY })
  }

  const handlePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (dragRef.current) return
    const step = event.shiftKey ? 1 : 10
    const directions: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }
    const delta = directions[event.key]
    if (!delta) return
    event.preventDefault()
    event.stopPropagation()
    setOffset(current => ({ x: current.x + delta.x, y: current.y + delta.y }))
  }

  return (
    <nav
      ref={rootRef}
      className={`norden-command-toolbar ${movable ? 'is-movable' : ''} ${isDragging ? 'is-dragging' : ''} ${className}`}
      style={{ width, ...style, translate: `${offset.x}px ${offset.y}px` }}
      aria-label={label}
    >
      {movable && (['left', 'right'] as const).map(side => (
        <button
          key={side}
          type="button"
          className={`norden-command-toolbar-drag-handle norden-command-toolbar-drag-handle--${side}`}
          aria-label={`${label}を移動（${side === 'left' ? '左端' : '右端'}）`}
          title="ドラッグまたは矢印キーで移動（Shift＋矢印キーで微調整）"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLostPointerCapture={handlePointerEnd}
          onKeyDown={handleKeyDown}
          onClick={event => event.stopPropagation()}
        />
      ))}
      <div className="norden-command-toolbar-items" onScroll={() => setOpenId(null)}>
        {commands.map(command => {
          const hasChildren = Boolean(command.children)
          const expanded = open?.id === command.id
          return (
            <button
              key={command.id}
              ref={element => { if (element) buttonRefs.current.set(command.id, element); else buttonRefs.current.delete(command.id) }}
              type="button"
              className={`norden-command-toolbar-button ${command.tone === 'accent' ? 'is-accent' : ''}`}
              disabled={command.disabled}
              aria-pressed={hasChildren ? undefined : command.active}
              aria-expanded={hasChildren ? expanded : undefined}
              aria-controls={expanded ? flyoutId : undefined}
              onClick={hasChildren ? () => toggle(command) : command.onClick}
              title={command.title}
            >
              {command.icon && <span className="norden-command-toolbar-icon" aria-hidden="true">{command.icon}</span>}
              <span>{command.label}</span>
              {hasChildren && <span className="norden-command-toolbar-caret" aria-hidden="true">▴</span>}
            </button>
          )
        })}
      </div>
      {open && (
        <div ref={flyoutRef} id={flyoutId} className="norden-command-toolbar-flyout" role="group" aria-label={open.label}
          style={{ left: flyoutX }}>
          {open.children!.map(child => (
            <button key={child.id} type="button" className="norden-command-toolbar-subbutton"
              disabled={child.disabled} title={child.title} aria-pressed={child.active}
              onClick={() => { setOpenId(null); child.onClick?.() }}>
              {child.icon && <span className="norden-command-toolbar-icon" aria-hidden="true">{child.icon}</span>}
              <span>{child.label}</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
