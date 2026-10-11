import { useId } from 'react'
import type { ReactNode } from 'react'
import type { Options } from './labels'

interface RangeProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}

/** Slider with a number box */
export function Range({ label, value, min, max, step, unit = '', onChange }: RangeProps) {
  const id = useId()
  const set = (raw: string) => {
    const number = Number(raw)
    if (Number.isFinite(number)) onChange(number)
  }
  return (
    <div className="cutin-field">
      <div className="cutin-field-row">
        <label htmlFor={id}>{label}</label>
        <span className="cutin-number">
          <input type="number" aria-label={`${label}（数値）`} value={value} step={step} onChange={event => set(event.target.value)} />
          {unit}
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={event => set(event.target.value)} />
    </div>
  )
}

interface SelectProps<T extends string | number> {
  label: string
  value: T
  options: Options<T>
  onChange: (value: T) => void
}

export function Select<T extends string | number>({ label, value, options, onChange }: SelectProps<T>) {
  const id = useId()
  return (
    <div className="cutin-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={String(value)} onChange={event => {
        const found = options.find(([option]) => String(option) === event.target.value)
        if (found) onChange(found[0])
      }}>
        {options.map(([option, text]) => <option key={String(option)} value={String(option)}>{text}</option>)}
      </select>
    </div>
  )
}

export function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId()
  return (
    <div className="cutin-field cutin-color">
      <label htmlFor={id}>{label}</label>
      <span>
        <input id={id} type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={event => onChange(event.target.value)} />
        <input type="text" aria-label={`${label}（コード）`} value={value} onChange={event => onChange(event.target.value)} />
      </span>
    </div>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="checkbox cutin-check">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />{label}
    </label>
  )
}

/** A titled group of fields. With `enabled` the title is a switch and the fields show only when it is on */
export function Section({ title, enabled, onToggle, children }: { title: string; enabled?: boolean; onToggle?: (on: boolean) => void; children?: ReactNode }) {
  return (
    <fieldset className="cutin-section">
      <legend>
        {onToggle
          ? <label className="checkbox"><input type="checkbox" checked={Boolean(enabled)} onChange={event => onToggle(event.target.checked)} />{title}</label>
          : title}
      </legend>
      {(enabled ?? true) && children}
    </fieldset>
  )
}
