import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import WindowFrame from './WindowFrame'
import './SettingsWindow.css'

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export interface SettingsWindowProps {
  title?: string
  /** The settings: SettingsSection with SettingsItem rows */
  children: ReactNode
  /** Under the settings, outside their scrolling (e.g. 初期値に戻す) */
  footer?: ReactNode
  closeLabel?: string
  /** The × control, Escape or a click on the mask */
  onClose: () => void
  className?: string
  style?: CSSProperties
}

/**
 * A modal settings window in the middle of its host (`position: relative`) over a mask.
 * Escape is taken in capture phase and no key reaches the page under it (e.g. the battle screen's shortcuts).
 * Tab stays in the window, and the focus goes back where it was when it closes.
 */
export default function SettingsWindow({ title = '設定', children, footer, closeLabel = '閉じる', onClose, className = '', style }: SettingsWindowProps) {
  const maskRef = useRef<HTMLDivElement>(null)
  /** A press that started on the mask (a drag from a slider released over the mask does not close the window) */
  const pressedMask = useRef(false)

  useEffect(() => {
    const restore = document.activeElement instanceof HTMLElement ? document.activeElement : null
    maskRef.current?.querySelector<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true })
    return () => { if (restore?.isConnected) restore.focus({ preventScroll: true }) }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (event.key !== 'Tab') return
    const dialog = maskRef.current?.querySelector<HTMLElement>('[role="dialog"]')
    // In document order, without the controls Tab skips (e.g. the unchecked radios)
    const focusable = [...dialog?.querySelectorAll<HTMLElement>('*') ?? []].filter(element => element.tabIndex >= 0 && element.matches(FOCUSABLE))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) { event.preventDefault(); return }
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === dialog)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
  }

  return (
    <div ref={maskRef} className="norden-settings-mask"
      onPointerDown={event => { pressedMask.current = event.target === event.currentTarget }}
      onClick={event => { if (pressedMask.current && event.target === event.currentTarget) onClose() }}
      onKeyDown={keyDown} onKeyUp={event => event.stopPropagation()}>
      <WindowFrame role="dialog" aria-modal="true" tabIndex={-1} title={title} onClose={onClose} closeLabel={closeLabel}
        className={`norden-settings-window ${className}`} style={style}>
        <div className="norden-settings-body">{children}</div>
        {footer != null && <div className="norden-settings-footer">{footer}</div>}
      </WindowFrame>
    </div>
  )
}

export interface SettingsSectionProps {
  /** The heading over the section's items (e.g. サウンド) */
  title: ReactNode
  children: ReactNode
  className?: string
}

/** A group of settings under a heading */
export function SettingsSection({ title, children, className = '' }: SettingsSectionProps) {
  const id = useId()
  return (
    <section className={`norden-settings-section ${className}`} aria-labelledby={id}>
      <h3 id={id} className="norden-settings-section-title">{title}</h3>
      <div className="norden-settings-items">{children}</div>
    </section>
  )
}

export interface SettingsItemProps {
  label: ReactNode
  /** A short explanation under the label */
  description?: ReactNode
  /** The control (ChoiceGroup, VolumeSlider with `hideLabel`, Button…) or a value to show. Give it its own accessible name */
  children: ReactNode
  className?: string
}

/** One setting: the label (and its explanation) on the left, the control on the right. Stacked in a narrow window */
export function SettingsItem({ label, description, children, className = '' }: SettingsItemProps) {
  const labelId = useId()
  const descriptionId = useId()
  return (
    <div className={`norden-settings-item ${className}`} role="group" aria-labelledby={labelId}
      aria-describedby={description != null ? descriptionId : undefined}>
      <div className="norden-settings-item-text">
        <span id={labelId} className="norden-settings-item-label">{label}</span>
      </div>
      <div className="norden-settings-item-control">{children}
      {description != null && <span id={descriptionId} className="norden-settings-item-description">{description}</span>}
      </div>
    </div>
  )
}
