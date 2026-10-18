import type { HTMLAttributes } from 'react'
import './parts.css'

export interface SectionFrameProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string
  /** Whether to render the subtle dark translucent surface behind the frame. Defaults to true. */
  surface?: boolean
}

/**
 * Gold foil stamped border frame on dark leather texture, used for section dividers.
 * Fills the nearest positioned ancestor behind its content; give that ancestor `isolation: isolate`.
 */
export default function SectionFrame({ className = '', surface = true, ...props }: SectionFrameProps) {
  return (
    <span className={`norden-section-frame ${className}`} aria-hidden="true" {...props}>
      {surface && <span className="norden-section-frame-surface" />}
      <span className="norden-section-frame-border" />
    </span>
  )
}

