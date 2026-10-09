import type { CSSProperties } from 'react'
import ThinFrame from './ThinFrame'
import Button from './Button'
import './parts.css'

export interface CityNavigatorProps {
  name: string
  onPrev?: () => void
  onNext?: () => void
  /** Shown as "index / count" (index is 0-based) */
  position?: { index: number; count: number }
  className?: string
  style?: CSSProperties
}

/** ◀ city ▶: steps through the player's cities */
export default function CityNavigator({ name, onPrev, onNext, position, className = '', style }: CityNavigatorProps) {
  return (
    <div className={`norden-city-navigator ${className}`} role="group" aria-label="都市の切り替え" style={style}>
      <ThinFrame />
      <Button variant="quiet" size="small" className="norden-city-navigator-step" aria-label="前の都市" disabled={!onPrev} onClick={onPrev}>◀</Button>
      <span className="norden-city-navigator-name" aria-live="polite">
        {name}
        {position && <span className="norden-city-navigator-position">{position.index + 1} / {position.count}</span>}
      </span>
      <Button variant="quiet" size="small" className="norden-city-navigator-step" aria-label="次の都市" disabled={!onNext} onClick={onNext}>▶</Button>
    </div>
  )
}
