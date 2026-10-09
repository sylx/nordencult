import type { CSSProperties } from 'react'
import { CITIES, CITY_MAP, FACTIONS, ROADS } from './data'
import './MockMap.css'

export interface MapRoad { from: string; to: string; color: string }

interface Props {
  selected?: string
  /** Candidates of a pick step: highlighted, the others are dimmed */
  candidates?: readonly string[]
  /** Roads drawn over the network, e.g. ordered invasions */
  routes?: readonly MapRoad[]
  onSelect?: (id: string) => void
}

/** A stand-in for norden-strategy's map: cities on a plain background */
export default function MockMap({ selected, candidates, routes = [], onSelect }: Props) {
  const picking = candidates !== undefined
  return (
    <div className={`mock-map ${picking ? 'is-picking' : ''}`}>
      <svg className="mock-map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {ROADS.map(([a, b]) => <Line key={`${a}-${b}`} from={a} to={b} className="mock-map-road" />)}
        {routes.map(route => <Line key={`${route.from}-${route.to}`} from={route.from} to={route.to} className="mock-map-route" color={route.color} />)}
      </svg>
      {CITIES.map(city => {
        const faction = city.owner ? FACTIONS[city.owner] : undefined
        const candidate = candidates?.includes(city.id)
        return (
          <button key={city.id} type="button" className={`mock-map-city ${selected === city.id ? 'is-selected' : ''} ${candidate ? 'is-candidate' : ''}`}
            style={{ left: `${city.at.x}%`, top: `${city.at.y}%`, '--faction': faction?.color ?? '#777' } as CSSProperties}
            disabled={picking && !candidate} onClick={() => onSelect?.(city.id)}>
            {faction?.emblem ? <img src={faction.emblem} alt="" /> : <span className="mock-map-neutral" />}
            <span className="mock-map-name">{city.name}</span>
          </button>
        )
      })}
    </div>
  )
}

function Line({ from, to, className, color }: { from: string; to: string; className: string; color?: string }) {
  const a = CITY_MAP[from]?.at
  const b = CITY_MAP[to]?.at
  if (!a || !b) return null
  return <line className={className} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} vectorEffect="non-scaling-stroke" />
}
