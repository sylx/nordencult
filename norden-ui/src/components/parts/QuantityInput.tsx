import { useId } from 'react'
import './parts.css'

export interface QuantityInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max: number
  step?: number
  unit?: string
  disabled?: boolean
  className?: string
}

/** A number with a slider, − / + buttons and a text box. Values are clamped to min..max */
export default function QuantityInput({
  label, value, onChange, min = 0, max, step = 10, unit, disabled = false, className = '',
}: QuantityInputProps) {
  const id = useId()
  const top = Math.max(min, max)
  const set = (next: number) => {
    if (Number.isNaN(next)) return
    const clamped = Math.min(top, Math.max(min, Math.round(next)))
    if (clamped !== value) onChange(clamped)
  }
  return (
    <div className={`norden-quantity ${className}`} role="group" aria-labelledby={id}>
      <span id={id} className="norden-quantity-label">{label}</span>
      <button type="button" className="norden-quantity-step" aria-label={`${label}を減らす`}
        disabled={disabled || value <= min} onClick={() => set(value - step)}>−</button>
      <input type="range" className="norden-quantity-range" aria-label={label} min={min} max={top} step={step}
        value={value} disabled={disabled || top === min} onChange={event => set(event.target.valueAsNumber)} />
      <button type="button" className="norden-quantity-step" aria-label={`${label}を増やす`}
        disabled={disabled || value >= top} onClick={() => set(value + step)}>＋</button>
      <span className="norden-quantity-value">
        <input type="number" aria-label={`${label}（数値）`} min={min} max={top} step={step} value={value} disabled={disabled}
          onChange={event => set(event.target.valueAsNumber)} />
        {unit && <span className="norden-quantity-unit">{unit}</span>}
      </span>
      <span className="norden-quantity-max">/ {top}</span>
    </div>
  )
}
