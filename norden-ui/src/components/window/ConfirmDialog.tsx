import { useEffect, useId, type ReactNode } from 'react'
import Button from '../parts/Button'
import ThinFrameWithTitle from '../parts/ThinFrameWithTitle'
import './ConfirmDialog.css'

export interface ConfirmDialogProps {
  title?: ReactNode
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Temporary reusable confirmation dialog.
 * Intercepts Escape in capture phase so ScreenHost does not pop the underlying screen.
 */
export default function ConfirmDialog({
  title = '確認',
  message,
  confirmLabel = 'はい',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const messageId = useId()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onCancel])

  return (
    <div className="norden-confirm-backdrop" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : '確認'}
        aria-describedby={messageId}
        className="norden-confirm-dialog-wrap"
        onClick={event => event.stopPropagation()}
      >
        <ThinFrameWithTitle as="div" title={title} className="norden-confirm-dialog">
          <div id={messageId} className="norden-confirm-message">{message}</div>
          <div className="norden-confirm-actions">
            <Button size="small" variant="primary" onClick={onConfirm}>{confirmLabel}</Button>
            <Button size="small" onClick={onCancel}>{cancelLabel}</Button>
          </div>
        </ThinFrameWithTitle>
      </div>
    </div>
  )
}

