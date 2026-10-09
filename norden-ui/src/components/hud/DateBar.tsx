import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './DateBar.css'

export interface DateBarProps {
  phaseLabel: string
  /** null: all factions' orders are being resolved. */
  factionName?: string | null
  dateLabel?: string
  /** Settings contents (buttons, forms...). Without contents, the gear is disabled. */
  children?: ReactNode
  width?: CSSProperties['width']
  settingsLabel?: string
  className?: string
  style?: CSSProperties
}

function DateBarSeparator() {
  return <span className="norden-date-bar-separator" aria-hidden="true">
    <svg viewBox="0 0 18 40" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path className="norden-date-bar-separator-edge" d="M0 39h3c5 0 5-4 5-10V18c0-6 2-10 5-13-1 6-3 10-3 15v10c0 6 1 9 5 9h3" />
      <path className="norden-date-bar-separator-rail" d="M0 39h3c5 0 5-4 5-10V18c0-6 2-10 5-13-1 6-3 10-3 15v10c0 6 1 9 5 9h3" />
    </svg>
  </span>
}

function DateBarCalendar({ label }: { label: string }) {
  return label.split(/([0-9０-９]+)/u).filter(Boolean).map((part, index) => (
    <span key={index} className={/^[0-9０-９]+$/u.test(part) ? 'norden-date-bar-date-number' : 'norden-date-bar-date-label'}>
      {part}
    </span>
  ))
}

export default function DateBar({
  phaseLabel, factionName, dateLabel, children, width, settingsLabel = '設定', className = '', style,
}: DateBarProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const hasSettings = children != null
  const turnLabel = factionName === null ? '全勢力の行動を解決中' : factionName ? `${factionName}のターン` : 'ターン進行中'

  useEffect(() => {
    if (!hasSettings) { setOpen(false); return }
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
      if (event.key === 'Escape' && !event.defaultPrevented) {
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
  }, [open, hasSettings])

  return (
    <div
      ref={rootRef}
      className={`norden-date-bar ${className}`}
      style={{ width, ...style }}
      role="group"
      aria-label="ターン情報"
      onBlur={event => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <div className="norden-date-bar-content">
        <span className="norden-date-bar-phase" title={phaseLabel}>{phaseLabel}</span>
        <DateBarSeparator />
        <span className="norden-date-bar-turn" title={turnLabel}>
          {factionName ? <>
            <span className="norden-date-bar-faction">{factionName}</span>
            <span className="norden-date-bar-turn-suffix">のターン</span>
          </> : <span className="norden-date-bar-turn-status">{turnLabel}</span>}
        </span>
        {dateLabel && <>
          <DateBarSeparator />
          <span className="norden-date-bar-date" title={dateLabel}><DateBarCalendar label={dateLabel} /></span>
        </>}
        <DateBarSeparator />
        <button
          ref={buttonRef}
          className="norden-date-bar-settings"
          type="button"
          aria-label={settingsLabel}
          disabled={!hasSettings}
          aria-expanded={hasSettings ? open : undefined}
          aria-controls={hasSettings ? menuId : undefined}
          onClick={() => setOpen(value => !value)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="m9 3 1-2h4l1 2 2 1 2-.2 2 3.4-1.2 1.8v3l1.2 1.8-2 3.4-2-.2-2 1-1 2h-4l-1-2-2-1-2 .2-2-3.4L4.2 12V9L3 7.2l2-3.4 2 .2Z" transform="translate(0 1)" />
            <circle cx="12" cy="11.5" r="3.5" />
          </svg>
        </button>
      </div>
      {children != null && <div ref={panelRef} id={menuId} className="norden-date-bar-menu" role="region" aria-label={settingsLabel} tabIndex={-1} hidden={!open}>
        {children}
      </div>}
    </div>
  )
}
