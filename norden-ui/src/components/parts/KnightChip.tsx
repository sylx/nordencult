import type { ReactNode } from 'react'
import type { KnightCardData } from './KnightCard'
import './parts.css'

export interface KnightChipProps {
  knight: Pick<KnightCardData, 'name' | 'portrait' | 'portraitSrc'>
  /** A short note after the name, e.g. 軍団長 */
  note?: ReactNode
  className?: string
}

/** A knight in little room: a small face and the name, in the colour of the text around it (KnightCard for more) */
export default function KnightChip({ knight, note, className = '' }: KnightChipProps) {
  return <span className={`norden-knight-chip ${className}`}>
    <span className="norden-knight-chip-face">{knight.portraitSrc
      ? <img src={knight.portraitSrc} alt="" />
      : knight.portrait ?? <span className="norden-knight-chip-initial">{knight.name.slice(0, 1)}</span>}</span>
    <span className="norden-knight-chip-name">{knight.name}</span>
    {note && <span className="norden-knight-chip-note">{note}</span>}
  </span>
}
