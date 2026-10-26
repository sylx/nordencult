import type { CSSProperties } from 'react'
import './parts.css'

export interface VolumeSliderProps {
  label: string
  /** 0..1 */
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
}

/** A volume (0..1) as a slider in 5% steps, with the percentage beside it. The text takes the color of the surface it is on */
export default function VolumeSlider({ label, value, onChange, disabled = false, className = '' }: VolumeSliderProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <label className={`norden-volume ${className}`}>
      <span className="norden-volume-label">{label}</span>
      <input type="range" className="norden-quantity-range norden-volume-range" min={0} max={100} step={5} value={percent}
        aria-valuetext={`${percent}%`} disabled={disabled}
        style={{ '--norden-range-progress': `${percent}%` } as CSSProperties}
        onChange={event => onChange(event.target.valueAsNumber / 100)} />
      <span className="norden-volume-value" aria-hidden="true">{percent}%</span>
    </label>
  )
}
