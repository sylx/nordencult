import type { ReactNode } from 'react'
import { CHARACTER_MAP, CHARACTER_TYPE_LABELS } from '../data/character'
import { CharacterImage } from './CharacterImage'
import './KnightList.css'

interface Props {
  ids: readonly string[]
  /** Short notes after the type, e.g. 領主 */
  notes?: (id: string) => readonly string[]
  /** Shown at the end of the row */
  aside?: (id: string) => ReactNode
  /** Rows become checkboxes */
  selection?: { selected: ReadonlySet<string>; onToggle: (id: string) => void }
  /** Shown when there is nobody */
  empty?: string
  compact?: boolean
}

/** Characters with their face, name and type (all of them are "knights" in the UI) */
export function KnightList({ ids, notes, aside, selection, empty = '騎士はいません。', compact = false }: Props) {
  if (ids.length === 0) return <p className="knight-list__empty">{empty}</p>
  return (
    <ul className={`knight-list ${compact ? 'knight-list--compact' : ''}`}>
      {ids.map((id) => {
        const character = CHARACTER_MAP[id]
        if (!character) return <li key={id}>{id}</li>
        const body = (
          <>
            {selection && (
              <input type="checkbox" checked={selection.selected.has(id)} onChange={() => selection.onToggle(id)} />
            )}
            <span className="knight-list__face"><CharacterImage character={character} mode="face" /></span>
            <span className="knight-list__info">
              <span className="knight-list__name">{character.name}</span>
              <span className="knight-list__type">
                {[CHARACTER_TYPE_LABELS[character.type], ...(notes?.(id) ?? [])].join(' / ')}
              </span>
            </span>
            {aside && <span className="knight-list__aside">{aside(id)}</span>}
          </>
        )
        return (
          <li key={id} className={selection?.selected.has(id) ? 'knight-list__item--selected' : undefined}>
            {selection ? <label className="knight-list__row">{body}</label> : <div className="knight-list__row">{body}</div>}
          </li>
        )
      })}
    </ul>
  )
}

/** 統率・武力・知力 of a character, for choosing who to send */
export function KnightStats({ id }: { id: string }) {
  const c = CHARACTER_MAP[id]
  if (!c) return null
  return (
    <span className="knight-stats">
      <span>統率 <b>{c.leadership}</b></span>
      <span>武力 <b>{c.strength}</b></span>
      <span>知力 <b>{c.intelligence}</b></span>
    </span>
  )
}
