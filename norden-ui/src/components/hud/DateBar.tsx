import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './DateBar.css'

export interface DateBarProps {
  text: string
  icon?: ReactNode
  /** Settings contents (buttons, forms...). The gear button is shown only when given. */
  children?: ReactNode
  width?: CSSProperties['width']
  settingsLabel?: string
  className?: string
  style?: CSSProperties
}

export default function DateBar({
  text, icon, children, width, settingsLabel = '設定', className = '', style,
}: DateBarProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const firstControl = panel?.querySelector<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
    )
    const focusTarget = firstControl ?? panel
    focusTarget?.focus()

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={`norden-date-bar ${className}`}
      style={{ width, ...style }}
      onBlur={event => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <div className="norden-date-bar-content">
        {icon && <span className="norden-date-bar-icon" aria-hidden="true">{icon}</span>}
        <span className="norden-date-bar-text" title={text}>{text}</span>
        {children != null && <button
          ref={buttonRef}
          className="norden-date-bar-settings"
          type="button"
          aria-label={settingsLabel}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen(value => !value)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="m9 3 1-2h4l1 2 2 1 2-.2 2 3.4-1.2 1.8v3l1.2 1.8-2 3.4-2-.2-2 1-1 2h-4l-1-2-2-1-2 .2-2-3.4L4.2 12V9L3 7.2l2-3.4 2 .2Z" transform="translate(0 1)" />
            <circle cx="12" cy="11.5" r="3.5" />
          </svg>
        </button>}
      </div>
      {children != null && <div ref={panelRef} id={menuId} className="norden-date-bar-menu" role="region" aria-label={settingsLabel} tabIndex={-1} hidden={!open}>
        {children}
      </div>}
    </div>
  )
}
