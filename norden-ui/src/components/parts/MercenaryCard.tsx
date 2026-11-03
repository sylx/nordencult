import { KnightStats, type KnightCardData } from './KnightCard'
import './parts.css'

export interface MercenaryCardProps {
  /** The company's leader; their stats are shown under the name when there are any */
  knight: KnightCardData
  company: string
  /** Their rank, e.g. S, shown where the prices are */
  rank?: string
  /** What they cost, e.g. 月額 */
  prices?: readonly { label: string; value: number }[]
  /** Shown after the knight's name, e.g. their unit type and city */
  notes?: readonly string[]
  selected?: boolean
  onSelect: () => void
  className?: string
}

/** A mercenary in a list: a button on parchment with their face, company, rank, what they cost and stats */
export default function MercenaryCard({ knight, company, rank, prices = [], notes = [], selected = false, onSelect, className = '' }: MercenaryCardProps) {
  return (
    <button type="button" className={`norden-card norden-mercenary-card ${selected ? 'is-selected' : ''} ${className}`}
      aria-label={`${company}（${knight.name}）`} aria-pressed={selected} onClick={onSelect}>
      <span className="norden-knight-face">{knight.portraitSrc
        ? <img src={knight.portraitSrc} alt="" />
        : knight.portrait ?? <span className="norden-knight-initial">{knight.name.slice(0, 1)}</span>}</span>
      <span className="norden-mercenary-card-body">
        <span className="norden-mercenary-card-head">
          <span className="norden-mercenary-card-title">
            <span className="norden-mercenary-card-company">{company}</span>
            <span className="norden-mercenary-card-note">{[knight.name, ...notes].join('・')}</span>
          </span>
          <span className="norden-mercenary-card-prices">
            {rank && <span className="norden-mercenary-card-rank">ランク<b>{rank}</b></span>}
            {prices.map(({ label, value }) => <span key={label}>{label}<b>{value.toLocaleString()}</b></span>)}
          </span>
        </span>
        {knight.stats && knight.stats.length > 0 && <KnightStats stats={knight.stats} />}
      </span>
    </button>
  )
}
