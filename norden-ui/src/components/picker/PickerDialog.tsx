import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Button from '../parts/Button'
import ThinFrameWithTitle from '../parts/ThinFrameWithTitle'
import './Picker.css'

export interface PickerDialogProps {
  title: string
  /** A line above the list, e.g. what choosing does */
  message?: ReactNode
  /** The list to choose from (KnightPicker, RelicPicker) */
  children: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Nothing chosen yet: 決定 cannot be pressed */
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

/**
 * A modal window to choose something from a list, with 決定 and やめる, over the whole page (rendered into the body, so a window
 * it opens from does not clip it). Escape (or a click outside) is やめる; it takes the key before the screen or window under it
 */
export default function PickerDialog({
  title, message, children, confirmLabel = '決定', cancelLabel = 'やめる', confirmDisabled = false, onConfirm, onCancel, className = '',
}: PickerDialogProps) {
  const messageId = useId()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onCancel()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onCancel])

  return createPortal(
    <div className="norden-picker-backdrop" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label={title} aria-describedby={message ? messageId : undefined}
        className="norden-picker-dialog-wrap" onClick={event => event.stopPropagation()}>
        <ThinFrameWithTitle as="div" title={title} className={`norden-picker-dialog ${className}`}>
          {message && <p id={messageId} className="norden-picker-message">{message}</p>}
          <div className="norden-picker-body">{children}</div>
          <div className="norden-picker-actions">
            <Button size="small" variant="primary" disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
            <Button size="small" onClick={onCancel}>{cancelLabel}</Button>
          </div>
        </ThinFrameWithTitle>
      </div>
    </div>,
    document.body,
  )
}
