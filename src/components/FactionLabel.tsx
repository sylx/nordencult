import { factionEmblem, factionName } from '../data/faction'
import './FactionLabel.css'

interface Props {
  /** undefined / null: neutral */
  factionId: string | null | undefined
  className?: string
}

/** A faction's emblem and name */
export function FactionLabel({ factionId, className = '' }: Props) {
  const emblem = factionEmblem(factionId)
  const name = factionName(factionId)
  return (
    <span className={`faction-label ${className}`}>
      {emblem ? <img src={emblem} alt="" /> : <span className="faction-label__blank" />}
      <span className="faction-label__name">{name}</span>
    </span>
  )
}
