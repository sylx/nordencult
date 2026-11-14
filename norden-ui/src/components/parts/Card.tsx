import type { HTMLAttributes } from 'react'
import './parts.css'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'article' | 'section' | 'label'
}

/** A parchment surface with an ink-drawn frame, for characters or other content. */
export default function Card({ as: Element = 'div', className = '', ...props }: CardProps) {
  return <Element className={`norden-card ${className}`} {...props} />
}
