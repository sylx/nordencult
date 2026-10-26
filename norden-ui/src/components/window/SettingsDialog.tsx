import { useEffect, type ReactNode } from 'react'
import Button from '../parts/Button'
import ThinFrameWithTitle from '../parts/ThinFrameWithTitle'
import './ConfirmDialog.css'

export interface SettingsDialogProps {
  title?: string
  /** The settings (e.g. VolumeSlider) */
  children: ReactNode
  closeLabel?: string
  /** The close button, Escape or a click outside the dialog */
  onClose: () => void
}

/**
 * A modal window of settings with a close button, made as ConfirmDialog is.
 * Intercepts Escape in capture phase so the screen under it does not take it.
 */
export default function SettingsDialog({ title = '設定', children, closeLabel = '閉じる', onClose }: SettingsDialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
      <div role="dialog" aria-modal="true" aria-label={title} className="norden-confirm-dialog-wrap" onClick={event => event.stopPropagation()}>
        <ThinFrameWithTitle as="div" title={title} className="norden-confirm-dialog norden-settings-dialog">
          <div className="norden-settings-content">{children}</div>
          <div className="norden-confirm-actions">
            <Button size="small" variant="primary" autoFocus onClick={onClose}>{closeLabel}</Button>
          </div>
        </ThinFrameWithTitle>
      </div>
    </div>
  )
}
