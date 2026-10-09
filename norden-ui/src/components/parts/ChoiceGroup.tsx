import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import './parts.css'

export interface ChoiceOption<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
  disabled?: boolean
  title?: string
}

export interface ChoiceGroupProps<T extends string = string> {
  /** Accessible name of the group */
  label: string
  options: readonly ChoiceOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** One choice out of a few, as a row of buttons (WAI-ARIA radio group: arrow keys move the selection) */
export default function ChoiceGroup<T extends string = string>({ label, options, value, onChange, className = '' }: ChoiceGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const enabled = options.filter(option => !option.disabled)
  const focusable = options.some(option => option.value === value && !option.disabled) ? value : enabled[0]?.value

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step || enabled.length === 0) return
    event.preventDefault()
    const current = enabled.findIndex(option => option.value === value)
    const next = enabled[(current + step + enabled.length) % enabled.length]!
    onChange(next.value)
    refs.current[options.indexOf(next)]?.focus()
  }

  return (
    <div className={`norden-choice-group ${className}`} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((option, index) => (
        <button key={option.value} ref={element => { refs.current[index] = element }} type="button" role="radio"
          className={`norden-button norden-choice ${option.value === value ? 'is-primary' : 'is-normal'}`} aria-checked={option.value === value} disabled={option.disabled}
          tabIndex={option.value === focusable ? 0 : -1} title={option.title} onClick={() => onChange(option.value)}>
          {option.icon && <span className="norden-choice-icon" aria-hidden="true">{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
