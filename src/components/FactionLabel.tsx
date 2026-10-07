import { FACTION_MAP, emblemUrl } from 'norden-strategy'
import './FactionLabel.css'

interface Props {
  /** undefined / null: neutral */
  factionId: string | null | undefined
  className?: string
}

/** A faction's emblem and name */
export function FactionLabel({ factionId, className = '' }: Props) {
  const emblem = emblemUrl(factionId ?? undefined)
  const name = factionId ? FACTION_MAP[factionId]?.name ?? factionId : '中立'
  return (
    <span className={`faction-label ${className}`}>
      {emblem ? <img src={emblem} alt="" /> : <span className="faction-label__blank" />}
      <span className="faction-label__name">{name}</span>
    </span>
  )
}
