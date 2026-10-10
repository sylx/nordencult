import { useId } from 'react'
import type { HTMLAttributes, ReactNode, Ref } from 'react'
import ThinFrame from './ThinFrame'
import './parts.css'

export interface ThinFrameWithTitleProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Shown on the plaque straddling the top edge; also the panel's accessible name */
  title: ReactNode
  as?: 'section' | 'div' | 'aside'
  ref?: Ref<HTMLElement>
}

/**
 * A HUD panel: the thin bezel (ThinFrame) with a title plaque on its top edge.
 * The plaque is a provisional CSS drawing until its image is ready (docs/parts-assets.md).
 * Other attributes and handlers (e.g. for dragging) go to the panel element.
 */
export default function ThinFrameWithTitle({ title, as = 'section', className = '', children, ref, ...props }: ThinFrameWithTitleProps) {
  const id = useId()
  const Tag = as as 'section'
  return <Tag ref={ref} aria-labelledby={id} className={`norden-thin-titled ${className}`} {...props}>
    <ThinFrame />
    <h2 id={id} className="norden-thin-titled-title"><span className="norden-thin-titled-title-text">{title}</span></h2>
    {children}
  </Tag>
}
