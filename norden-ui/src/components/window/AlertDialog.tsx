import { useEffect, useId, type ReactNode } from 'react'
import Button from '../parts/Button'
import ThinFrameWithTitle from '../parts/ThinFrameWithTitle'
import './ConfirmDialog.css'

export interface AlertDialogProps {
  title?: ReactNode
  message: ReactNode
  okLabel?: string
  /** OK, Escape, Enter or a click outside the dialog */
  onClose: () => void
}

/**
 * A notice with a single OK button, made as ConfirmDialog is.
 * Intercepts Escape and Enter in capture phase so the screen under it does not take them.
 */
export default function AlertDialog({ title = 'お知らせ', message, okLabel = 'OK', onClose }: AlertDialogProps) {
  const messageId = useId()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div className="norden-confirm-backdrop" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'お知らせ'}
        aria-describedby={messageId}
        className="norden-confirm-dialog-wrap"
        onClick={event => event.stopPropagation()}
      >
        <ThinFrameWithTitle as="div" title={title} className="norden-confirm-dialog">
          <div id={messageId} className="norden-confirm-message">{message}</div>
          <div className="norden-confirm-actions">
            <Button size="small" variant="primary" autoFocus onClick={onClose}>{okLabel}</Button>
          </div>
        </ThinFrameWithTitle>
      </div>
    </div>
  )
}
