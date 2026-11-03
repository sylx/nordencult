import Card from '../../components/parts/Card'
import { KnightStats } from '../../components/parts/KnightCard'
import { KnightFace, knightAbilityStats } from '../domestic/DomesticOfficers'
import type { MercenaryProfileView } from '../types'
import '../../components/parts/parts.css'
import './MercenaryProfile.css'

export interface MercenaryProfileProps {
  mercenary: MercenaryProfileView
  /** Their abilities under the name (the hiring talk shows them; the mercenary screen does not) */
  abilities?: boolean
  /** Their figure (立ち絵) to the left; without it, or when there is no picture, their face */
  figure?: boolean
  className?: string
}

const count = (value: number) => value.toLocaleString()

/**
 * A mercenary on parchment: the figure, the company and the knight with the rank to the right (coloured by rank),
 * their abilities when asked, and their unit, strength and the city they are in
 */
export default function MercenaryProfile({ mercenary, abilities = false, figure = true, className = '' }: MercenaryProfileProps) {
  const { knight, company, rank, unitType, unitImage, soldiers, maxSoldiers, cityName } = mercenary
  const picture = figure ? (knight.imageSrc ? <img src={knight.imageSrc} alt="" /> : knight.image) : undefined
  return (
    <Card className={`norden-mercenary-profile ${className}`}>
      {picture
        ? <div className="norden-mercenary-figure" role="img" aria-label={`${knight.name}の立ち絵`}>{picture}</div>
        : <span className="norden-knight-face"><KnightFace knight={knight} /></span>}
      <div className="norden-mercenary-summary">
        <div className="norden-mercenary-heading">
          <span className="norden-mercenary-rank" aria-label={`ランク${rank}`}><span>ランク</span><b className="norden-mercenary-rank-letter" data-rank={rank}>{rank}</b></span>
          <h3 className="norden-mercenary-company">{company}</h3>
          <p className="norden-mercenary-name">{knight.name}{knight.subtitle && <span>{knight.subtitle}</span>}</p>
        </div>
        {abilities && <KnightStats stats={knightAbilityStats(knight)} />}
        <div className="norden-mercenary-unit">
          {unitImage && <img src={unitImage} alt="" />}
          <div className="norden-mercenary-unit-facts">
            <span><span className="norden-mercenary-unit-label">兵科</span>{unitType}</span>
            <span><span className="norden-mercenary-unit-label">兵数</span>{`${count(soldiers)} / ${count(maxSoldiers)}`}</span>
            <span><span className="norden-mercenary-unit-label">所在地</span>{cityName}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
