import type { ReactNode } from 'react'
import Card from './Card'
import './parts.css'

export interface KnightCardData {
  name: string
  /** Face image (e.g. the game's CharacterImage). The initial is shown when omitted */
  portrait?: ReactNode
  /** Image URL, imported asset or object URL for a generated-character preview. Takes precedence over portrait. */
  portraitSrc?: string
  /** Type and notes, e.g. 騎士 / 領主 */
  subtitle?: string
  /** A few stats, e.g. 統率 82 */
  stats?: readonly { label: string; value: ReactNode; max?: number }[]
  /** A mercenary (傭兵): their company and their own soldiers, marked on the card */
  mercenary?: MercenaryMark
}

/** What marks a mercenary */
export interface MercenaryMark {
  company: string
  soldiers: number
  maxSoldiers: number
  /** Morale of their soldiers (0..100), whatever their city's. Omitted: their city's */
  morale?: number
  /** What they cost each month. Omitted: not hired */
  monthly?: number
  /** Months since the contract was made or renewed (0 in the month it was). Omitted: not hired */
  months?: number
}

function statTier(value: ReactNode, max = 100) {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 'neutral'
  const ratio = value / max
  return ratio >= 0.9 ? 'exceptional' : ratio >= 0.75 ? 'high' : ratio >= 0.5 ? 'mid' : 'low'
}

/** A knight's stats as the card shows them: label over a large number, colored by how high it is */
export function KnightStats({ stats, className = '' }: { stats: NonNullable<KnightCardData['stats']>; className?: string }) {
  return <span className={`norden-knight-stats ${className}`}>
    {stats.map(stat => <span key={stat.label} className={`norden-knight-stat is-${statTier(stat.value, stat.max)}`}>
      <span className="norden-knight-stat-label">{stat.label}</span>
      <b>{stat.value}</b>
    </span>)}
  </span>
}

export interface KnightCardProps {
  knight: KnightCardData
  /** Makes the card a checkbox, or a radio button of the group `name` (one knight of several) */
  selection?: { selected: boolean; onToggle: () => void; disabled?: boolean; type?: 'checkbox' | 'radio'; name?: string }
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
    {selection && <input type={selection.type ?? 'checkbox'} name={selection.name} aria-label={knight.name} checked={selection.selected} disabled={selection.disabled} onChange={selection.onToggle} />}
    <span className="norden-knight-face">{knight.portraitSrc
      ? <img src={knight.portraitSrc} alt="" />
      : knight.portrait ?? <span className="norden-knight-initial">{knight.name.slice(0, 1)}</span>}</span>
    <span className="norden-knight-info">
      <span className="norden-knight-name">{knight.name}</span>
      <span className="norden-knight-subtitle-outer">
        {knight.subtitle && <span className="norden-knight-subtitle">{knight.subtitle}</span>}
        {knight.mercenary && <span className="norden-knight-mercenary">
          <span className="norden-knight-mercenary-mark">傭兵</span>{knight.mercenary.company} {knight.mercenary.soldiers.toLocaleString()} / {knight.mercenary.maxSoldiers.toLocaleString()}
        </span>}
      </span>
      {knight.stats && knight.stats.length > 0 && <KnightStats stats={knight.stats} />}
    </span>
    {aside && <span className="norden-knight-aside">{aside}</span>}
  </>
  const classes = `norden-knight-card ${compact ? 'is-compact' : ''} ${selection?.selected ? 'is-selected' : ''} ${current ? 'is-current' : ''} ${selection?.disabled ? 'is-disabled' : ''} ${className}`
  return <Card as={selection ? 'label' : 'div'} className={`${classes} ${selection ? 'is-selectable' : ''}`}>{body}</Card>
}
