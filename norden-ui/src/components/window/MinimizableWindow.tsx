import { useId, useState } from 'react'
import ThinFrameWithTitle from '../parts/ThinFrameWithTitle'
import type { ThinFrameWithTitleProps } from '../parts/ThinFrameWithTitle'
import './MinimizableWindow.css'

export interface MinimizableWindowProps extends Omit<ThinFrameWithTitleProps, 'titleAction'> {
  /** Omitted: the window keeps this itself, starting from `defaultMinimized` */
  minimized?: boolean
  defaultMinimized?: boolean
  onMinimizedChange?: (minimized: boolean) => void
  minimizeLabel?: string
  restoreLabel?: string
}

/**
 * A HUD panel (ThinFrameWithTitle) that folds down to its title plaque with a control on the plaque.
 * The content stays mounted while folded, so it keeps its scroll position and state.
 */
export default function MinimizableWindow({
  minimized, defaultMinimized = false, onMinimizedChange, minimizeLabel = '最小化', restoreLabel = '元に戻す', className = '', children, ...props
}: MinimizableWindowProps) {
  const bodyId = useId()
  const [ownMinimized, setOwnMinimized] = useState(defaultMinimized)
  const folded = minimized ?? ownMinimized
  const label = folded ? restoreLabel : minimizeLabel
  const toggle = () => {
    setOwnMinimized(!folded)
    onMinimizedChange?.(!folded)
  }
  return (
    <ThinFrameWithTitle {...props} className={`norden-minimizable-window ${folded ? 'is-minimized' : ''} ${className}`}
      titleAction={
        <button type="button" className="norden-minimizable-window-toggle" aria-label={label} title={label}
          aria-expanded={!folded} aria-controls={bodyId} onClick={toggle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d={folded ? 'm5 9 7 7 7-7' : 'm5 15 7-7 7 7'} />
          </svg>
        </button>
      }>
      <div id={bodyId} hidden={folded}>{children}</div>
    </ThinFrameWithTitle>
  )
}
