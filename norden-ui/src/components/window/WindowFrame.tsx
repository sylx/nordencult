import type { HTMLAttributes } from 'react'
import './WindowFrame.css'

export interface WindowFrameProps extends HTMLAttributes<HTMLElement> {
  onClose: () => void
  closeLabel?: string
}

/** Sculpted metal frame with a close control woven into its top-right corner.
 * The caller supplies its accessible name and controls its position and size via className/style.
 */
export default function WindowFrame({ onClose, closeLabel = '閉じる', className = '', children, ...props }: WindowFrameProps) {
  return (
    <section className={`norden-window-frame ${className}`} {...props}>
      <div className="norden-window-frame-decoration" aria-hidden="true">
        <div className="norden-window-frame-surface" />
        <div className="norden-window-frame-border" />
      </div>
      <button type="button" className="norden-window-frame-close"
        aria-label={closeLabel} title={closeLabel} onClick={onClose}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
          <path d="m5 5 14 14M19 5 5 19" />
        </svg>
      </button>
      <div className="norden-window-frame-content">{children}</div>
    </section>
  )
}
