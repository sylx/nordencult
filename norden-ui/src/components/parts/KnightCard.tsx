import type { ReactNode } from 'react'
import './parts.css'

export interface KnightCardData {
  name: string
  /** Face image (e.g. the game's CharacterImage). The initial is shown when omitted */
  portrait?: ReactNode
  /** Type and notes, e.g. 騎士 / 領主 */
  subtitle?: string
  /** A few stats, e.g. 統率 82 */
  stats?: readonly { label: string; value: ReactNode }[]
}

export interface KnightCardProps {
  knight: KnightCardData
  /** Makes the card a checkbox */
  selection?: { selected: boolean; onToggle: () => void; disabled?: boolean }
  /** Highlights the card, e.g. the one being edited */
  current?: boolean
  /** Shown at the end of the card */
  aside?: ReactNode
  compact?: boolean
  className?: string
}

/** A character's face, name, subtitle and stats (all characters are "knights" in the UI) */
export default function KnightCard({ knight, selection, current = false, aside, compact = false, className = '' }: KnightCardProps) {
  const body = <>
    {selection && <input type="checkbox" checked={selection.selected} disabled={selection.disabled} onChange={selection.onToggle} />}
    <span className="norden-knight-face">{knight.portrait ?? <span className="norden-knight-initial">{knight.name.slice(0, 1)}</span>}</span>
    <span className="norden-knight-info">
      <span className="norden-knight-name">{knight.name}</span>
      {knight.subtitle && <span className="norden-knight-subtitle">{knight.subtitle}</span>}
      {knight.stats && knight.stats.length > 0 && (
        <span className="norden-knight-stats">
          {knight.stats.map(stat => <span key={stat.label}>{stat.label} <b>{stat.value}</b></span>)}
        </span>
      )}
    </span>
    {aside && <span className="norden-knight-aside">{aside}</span>}
  </>
  const classes = `norden-knight-card ${compact ? 'is-compact' : ''} ${selection?.selected ? 'is-selected' : ''} ${current ? 'is-current' : ''} ${className}`
  return selection
    ? <label className={`${classes} is-selectable`}>{body}</label>
    : <div className={classes}>{body}</div>
}
