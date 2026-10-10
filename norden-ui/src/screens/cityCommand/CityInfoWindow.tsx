import InfoWindowWithTabs from '../../components/window/InfoWindowWithTabs'
import type { InfoWindowWithTabsProps, TabInfo } from '../../components/window/InfoWindowWithTabs'
import KnightCard from '../../components/parts/KnightCard'
import FactionMark from '../../components/parts/FactionMark'
import StatBar from '../../components/parts/StatBar'
import iconAgriculture from '../../assets/ui/icons/icon-agriculture.svg'
import iconCommerce from '../../assets/ui/icons/icon-commerce.svg'
import iconProduction from '../../assets/ui/icons/icon-production.svg'
import iconCity from '../../assets/ui/icons/icon_home.webp'
import iconKnights from '../../assets/ui/icons/icon_people.webp'
import iconRoads from '../../assets/ui/icons/icon_stat.webp'
import type { CityStatView, CityView, NeighbourView } from '../types'
import './CityInfoWindow.css'

export interface CityInfoWindowProps extends Omit<InfoWindowWithTabsProps, 'tabs' | 'title'> {
  city: CityView
  /** Makes the cities on the 街道 tab buttons */
  onSelectNeighbour?: (cityId: string) => void
}

/** A city's information, knights and roads in a tabbed window */
export default function CityInfoWindow({ city, onSelectNeighbour, ...windowProps }: CityInfoWindowProps) {
  return <InfoWindowWithTabs {...windowProps} title={`${city.faction?.name ?? ''} ${city.name}`.trim()}
    tabs={createCityInfoTabs(city, onSelectNeighbour)} />
}

/** Shared city panels for the game window and component catalog. */
export function createCityInfoTabs(city: CityView, onSelectNeighbour?: (cityId: string) => void): [TabInfo, TabInfo, TabInfo] {
  return [
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
}

const statKinds = { 農業: 'agriculture', 商業: 'commerce', 生産: 'production' } as const
const statIcons = { agriculture: iconAgriculture, commerce: iconCommerce, production: iconProduction }

function statKind(stat: CityStatView) {
  return stat.kind ?? statKinds[stat.label as keyof typeof statKinds] ?? 'commerce'
}

function CityInfo({ city }: { city: CityView }) {
  return (
    <div className="norden-city-info">
      <div className={`norden-city-info-overview ${city.lord?.image || city.lord?.imageSrc ? 'has-lord' : ''}`}>
        <header className="norden-city-info-header">
          {city.faction?.emblem && <img className="norden-city-info-emblem" src={city.faction.emblem} alt="" />}
          <div>
            <h2 className="norden-city-info-name">{city.name}</h2>
            <span className="norden-city-info-sub">{[city.faction?.name ?? '中立', city.typeLabel].filter(Boolean).join(' ・ ')}</span>
          </div>
        </header>
        <div className="norden-city-info-body">
          <dl className="norden-city-info-facts">
            {city.lord && <div><dt>領主</dt><dd>{city.lord.name}</dd></div>}
            {city.population !== undefined && <div><dt>人口</dt><dd>{city.population.toLocaleString()}</dd></div>}
            {city.scaleLabel && <div><dt>規模</dt><dd>{city.scaleLabel}</dd></div>}
            {city.special && <div><dt>特殊</dt><dd>{city.special}</dd></div>}
            <div><dt>騎士</dt><dd>{city.knights?.length ?? 0}人</dd></div>
          </dl>
          {city.art && <img className="norden-city-info-art" src={city.art} alt="" />}
        </div>
        {city.lord && (city.lord.imageSrc || city.lord.image) && (
          <div className="norden-city-info-lord" role="img" aria-label={`${city.lord.name}の立ち絵`}>
            {city.lord.imageSrc ? <img src={city.lord.imageSrc} alt="" /> : city.lord.image}
          </div>
        )}
      </div>
      {city.stats && city.stats.length > 0 && (
        <dl className="norden-city-info-stats">
          {city.stats.map(stat => (
            <div key={stat.label} className="norden-city-info-stat">
              <dt><img src={statIcons[statKind(stat)]} alt="" /><span>{stat.label}</span></dt>
              <dd><StatBar label={stat.label} value={stat.value} max={stat.max} tone={statKind(stat)} /></dd>
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
