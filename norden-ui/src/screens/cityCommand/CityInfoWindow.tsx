import InfoWindowWithTabs from '../../components/window/InfoWindowWithTabs'
import type { InfoWindowWithTabsProps, TabInfo } from '../../components/window/InfoWindowWithTabs'
import KnightCard from '../../components/parts/KnightCard'
import FactionMark from '../../components/parts/FactionMark'
import iconCity from '../../assets/ui/icons/icon_home.webp'
import iconKnights from '../../assets/ui/icons/icon_people.webp'
import iconRoads from '../../assets/ui/icons/icon_stat.webp'
import type { CityView, NeighbourView } from '../types'
import './CityInfoWindow.css'

export interface CityInfoWindowProps extends Omit<InfoWindowWithTabsProps, 'tabs' | 'title'> {
  city: CityView
  /** Makes the cities on the 街道 tab buttons */
  onSelectNeighbour?: (cityId: string) => void
}

/** A city's information, knights and roads in a tabbed window */
export default function CityInfoWindow({ city, onSelectNeighbour, ...windowProps }: CityInfoWindowProps) {
  const tabs: TabInfo[] = [
    { id: 'city', name: '都市情報', icon: iconCity, content: <CityInfo city={city} /> },
    {
      id: 'knights', name: '騎士', icon: iconKnights,
      content: <div className="norden-city-knights">
        {city.knights?.length
          ? city.knights.map(knight => <KnightCard key={knight.id} knight={knight} />)
          : <p className="norden-city-empty">この都市に所属する騎士はいません。</p>}
      </div>,
    },
    { id: 'roads', name: '街道', icon: iconRoads, content: <Neighbours ids={city.neighbours ?? []} onSelect={onSelectNeighbour} /> },
  ]
  return <InfoWindowWithTabs {...windowProps} title={`${city.faction?.name ?? ''} ${city.name}`.trim()} tabs={tabs} />
}

function CityInfo({ city }: { city: CityView }) {
  return (
    <div className="norden-city-info">
      <header className="norden-city-info-header">
        {city.faction?.emblem && <img className="norden-city-info-emblem" src={city.faction.emblem} alt="" />}
        <div>
          <h2 className="norden-city-info-name">{city.name}</h2>
          <span className="norden-city-info-sub">{[city.faction?.name ?? '中立', city.typeLabel].filter(Boolean).join(' ・ ')}</span>
        </div>
      </header>
      <div className="norden-city-info-body">
        <dl className="norden-city-info-facts">
          {city.population !== undefined && <div><dt>人口</dt><dd>{city.population.toLocaleString()}</dd></div>}
          {city.scaleLabel && <div><dt>規模</dt><dd>{city.scaleLabel}</dd></div>}
          {city.special && <div><dt>特殊</dt><dd>{city.special}</dd></div>}
          <div><dt>騎士</dt><dd>{city.knights?.length ?? 0}人</dd></div>
        </dl>
        {city.art && <img className="norden-city-info-art" src={city.art} alt="" />}
      </div>
      {city.stats && city.stats.length > 0 && (
        <dl className="norden-city-info-stats">
          {city.stats.map(stat => (
            <div key={stat.label} className="norden-city-info-stat">
              <dt>{stat.label}</dt>
              <dd>
                <span className="norden-city-info-bar"><span style={{ width: `${Math.min(100, (stat.value / stat.max) * 100)}%` }} /></span>
                <span className="norden-city-info-value">{stat.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {city.tags && city.tags.length > 0 && (
        <ul className="norden-city-info-tags" aria-label="特徴">
          {city.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      )}
    </div>
  )
}

function Neighbours({ ids, onSelect }: { ids: readonly NeighbourView[]; onSelect?: (id: string) => void }) {
  if (ids.length === 0) return <p className="norden-city-empty">街道でつながる都市はありません。</p>
  return (
    <ul className="norden-city-roads">
      {ids.map(neighbour => {
        const body = <>
          <FactionMark faction={neighbour.faction} emblemOnly />
          <span className="norden-city-roads-name">{neighbour.name}</span>
          <span className="norden-city-roads-faction">{neighbour.faction?.name ?? '中立'}</span>
        </>
        return (
          <li key={neighbour.id}>
            {onSelect
              ? <button type="button" className="norden-city-roads-row" onClick={() => onSelect(neighbour.id)}>{body}</button>
              : <div className="norden-city-roads-row">{body}</div>}
          </li>
        )
      })}
    </ul>
  )
}
