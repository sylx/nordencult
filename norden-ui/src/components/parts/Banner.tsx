import type { CSSProperties, ReactNode } from 'react'
import ThinFrame from './ThinFrame'
import './parts.css'

export interface BannerProps {
  children: ReactNode
  /** Buttons after the message, e.g. やめる */
  actions?: ReactNode
  className?: string
  style?: CSSProperties
}

/** A short notice on the HUD, e.g. the guide for choosing a city on the map */
export default function Banner({ children, actions, className = '', style }: BannerProps) {
  return (
    <div className={`norden-banner ${className}`} role="status" style={style}>
      <ThinFrame />
      <span className="norden-banner-message">{children}</span>
      {actions && <span className="norden-banner-actions">{actions}</span>}
    </div>
  )
}
