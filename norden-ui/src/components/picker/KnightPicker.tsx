import { useState, type ReactNode } from 'react'
import { ABILITIES, ABILITY_LABELS, knightAbility } from '../../screens/domestic/DomesticOfficers'
import type { KnightView } from '../../screens/types'
import './Picker.css'

/** A knight to choose */
export interface KnightPickItem {
  knight: KnightView
  /** A line under the name, e.g. 装備: ライフル / 空き */
  note?: ReactNode
  /** Why they cannot be chosen: shown under the name, greyed out */
  disabledReason?: string
}

type Ability = (typeof ABILITIES)[number]
/** The column the list is sorted by: the order given, the names, or an ability (the highest first, then the lowest) */
type SortKey = 'given' | 'name' | Ability
type Sort = { key: SortKey; descending: boolean }

export interface KnightPickerProps {
  items: readonly KnightPickItem[]
  /** Ids chosen */
  selected: readonly string[]
  /** The ids chosen now: one at most unless `multiple` */
  onChange: (ids: string[]) => void
  multiple?: boolean
  /** The list's name */
  label?: string
  /** Shown when there is nobody to choose */
  emptyText?: string
}

const compareBy = (key: SortKey) => (a: KnightPickItem, b: KnightPickItem) =>
  key === 'name' ? a.knight.name.localeCompare(b.knight.name, 'ja') : (knightAbility(a.knight, key as Ability) ?? -1) - (knightAbility(b.knight, key as Ability) ?? -1)

/**
 * A list of knights to choose one (or several) from: face, name, type (the subtitle) and a note, and the five abilities in columns,
 * sorted by a column's header (again: the other way). Those who cannot be chosen are greyed out with why. It knows nothing of the
 * game's rules: the host gives each row's note and reason
 */
export default function KnightPicker({ items, selected, onChange, multiple = false, label = '騎士', emptyText = '選べる騎士はいません。' }: KnightPickerProps) {
  const [sort, setSort] = useState<Sort>({ key: 'given', descending: false })
  if (items.length === 0) return <p className="norden-picker-empty">{emptyText}</p>
  const sorted = sort.key === 'given' ? items : [...items].sort((a, b) => (sort.descending ? -1 : 1) * compareBy(sort.key)(a, b))
  const sortBy = (key: SortKey) => setSort(now => (now.key === key
    ? { key, descending: !now.descending }
    // Abilities from the highest, names from the start
    : { key, descending: key !== 'name' }))
  const toggle = (id: string) => {
    const chosen = selected.includes(id)
    onChange(multiple ? (chosen ? selected.filter(other => other !== id) : [...selected, id]) : chosen ? [] : [id])
  }
  const header = (key: SortKey, text: string, className: string) => (
    <button type="button" className={`norden-knight-picker-sort ${className} ${sort.key === key ? 'is-sorted' : ''}`}
      aria-label={`${text}で並べ替え`} aria-pressed={sort.key === key} onClick={() => sortBy(key)}>
      {text}{sort.key === key && <span aria-hidden="true">{sort.descending ? '▼' : '▲'}</span>}
    </button>
  )

  return (
    <div className="norden-knight-picker">
      <div className="norden-knight-picker-header">
        <span className="norden-knight-picker-face" />
        {header('name', '名前', 'is-name')}
        {ABILITIES.map(ability => <span key={ability}>{header(ability, ABILITY_LABELS[ability], 'is-ability')}</span>)}
      </div>
      <ul className="norden-knight-picker-list" aria-label={label}>
        {sorted.map(({ knight, note, disabledReason }) => {
          const chosen = selected.includes(knight.id)
          return (
            <li key={knight.id}>
              <button type="button" className={`norden-knight-picker-row ${chosen ? 'is-selected' : ''} ${disabledReason ? 'is-disabled' : ''}`}
                aria-label={knight.name} aria-pressed={chosen} disabled={Boolean(disabledReason)} onClick={() => toggle(knight.id)}>
                <span className="norden-knight-picker-face">
                  {knight.portraitSrc ? <img src={knight.portraitSrc} alt="" /> : knight.portrait ?? <span className="norden-knight-initial">{knight.name.slice(0, 1)}</span>}
                </span>
                <span className="norden-knight-picker-name">
                  <b>{knight.name}</b>
                  {knight.subtitle && <span className="norden-knight-picker-sub">{knight.subtitle}</span>}
                  {note && <span className="norden-knight-picker-note">{note}</span>}
                  {disabledReason && <span className="norden-knight-picker-reason" role="note">{disabledReason}</span>}
                </span>
                {ABILITIES.map(ability => <span key={ability} className="norden-knight-picker-ability">{knightAbility(knight, ability) ?? '—'}</span>)}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
