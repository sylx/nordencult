import './parts.css'

export interface FactionMarkProps {
  /** undefined: neutral */
  faction?: { name: string; emblem?: string }
  /** Hide the name and show only the emblem (the name stays as alt text) */
  emblemOnly?: boolean
  className?: string
}

/** A faction's emblem and name */
export default function FactionMark({ faction, emblemOnly = false, className = '' }: FactionMarkProps) {
  const name = faction?.name ?? '中立'
  return (
    <span className={`norden-faction-mark ${className}`}>
      {faction?.emblem
        ? <img src={faction.emblem} alt={emblemOnly ? name : ''} />
        : <span className="norden-faction-mark-blank" aria-hidden={!emblemOnly} aria-label={emblemOnly ? name : undefined} />}
      {!emblemOnly && <span className="norden-faction-mark-name">{name}</span>}
    </span>
  )
}
