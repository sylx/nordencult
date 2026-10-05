import { InfoWindowWithTabs, type InfoWindowWithTabsProps, type TabInfo } from 'norden-ui'
import { CITY_MAP, FACTION_MAP, PLACE_ART, PLACES, emblemUrl, type City, type PlaceType } from 'norden-strategy'
import iconHome from '../../assets/icons/icon_home.webp'
import iconRoads from '../../assets/icons/icon_stat.webp'
import './CityWindow.css'

const CITY_TYPE_LABELS: Readonly<Record<string, string>> = {
  pope_city: '聖都',
  port_city: '港湾都市',
  farm_city: '農業都市',
  trade_city: '交易都市',
  military_city: '軍事都市',
  ruin_city: '遺跡都市',
  frontier_city: '辺境都市',
}

const SCALE_LABELS: Readonly<Record<PlaceType, string>> = {
  town: '小さな町',
  city: '大きな街',
  metropolice: '大都市',
  fortress1: '要塞',
  fortress2: '要塞',
  temple: '聖地',
}

const PLACE_TYPES = new Map(PLACES.map((p) => [p.id, p.type]))

interface Props extends Omit<InfoWindowWithTabsProps, 'tabs' | 'title'> {
  city: City
  /** Cities linked by a road */
  neighbours: readonly string[]
  onSelectCity: (id: string) => void
}

/** Information window for the city selected on the map */
export function CityWindow({ city, neighbours, onSelectCity, ...windowProps }: Props) {
  const faction = city.belongTo ? FACTION_MAP[city.belongTo] : undefined
  const tabs: TabInfo[] = [
    { id: 'city', name: '都市情報', icon: iconHome, content: <CityInfo city={city} /> },
    {
      id: 'roads', name: '街道', icon: iconRoads,
      content: <Neighbours ids={neighbours} onSelect={onSelectCity} />,
    },
  ]
  return <InfoWindowWithTabs {...windowProps} title={`${faction?.name ?? ''} ${city.name}`.trim()} tabs={tabs} />
}

function CityInfo({ city }: { city: City }) {
  const faction = city.belongTo ? FACTION_MAP[city.belongTo] : undefined
  const emblem = emblemUrl(city.belongTo)
  const type = PLACE_TYPES.get(city.id) ?? 'town'
  return (
    <div className="city-info">
      <header className="city-info__header">
        {emblem && <img className="city-info__emblem" src={emblem} alt="" />}
        <div>
          <h2 className="city-info__name">{city.name}</h2>
          <span className="city-info__sub">{faction?.name ?? '中立'} ・ {CITY_TYPE_LABELS[city.type] ?? city.type}</span>
        </div>
      </header>
      <div className="city-info__body">
        <dl className="city-info__facts">
          <div><dt>人口</dt><dd>{city.population.toLocaleString()}</dd></div>
          <div><dt>規模</dt><dd>{SCALE_LABELS[type]}</dd></div>
          {city.special && <div><dt>特殊</dt><dd>{city.special}</dd></div>}
        </dl>
        <img className="city-info__art" src={PLACE_ART[type].url} alt="" />
      </div>
      <dl className="city-info__stats">
        <Stat label="農業" value={city.agriculture} max={720} />
        <Stat label="商業" value={city.market} max={720} />
        <Stat label="軍事" value={city.military} max={640} />
      </dl>
      {city.tags.length > 0 && (
        <ul className="city-info__tags" aria-label="特徴">
          {city.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="city-info__stat">
      <dt>{label}</dt>
      <dd>
        <span className="city-info__bar"><span style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></span>
        <span className="city-info__value">{value}</span>
      </dd>
    </div>
  )
}

function Neighbours({ ids, onSelect }: { ids: readonly string[]; onSelect: (id: string) => void }) {
  if (ids.length === 0) return <p className="city-roads__empty">街道でつながる都市はありません。</p>
  return (
    <ul className="city-roads">
      {ids.map((id) => {
        const city = CITY_MAP[id]
        const faction = city?.belongTo ? FACTION_MAP[city.belongTo] : undefined
        const emblem = emblemUrl(city?.belongTo)
        return (
          <li key={id}>
            <button type="button" onClick={() => onSelect(id)}>
              {emblem ? <img src={emblem} alt="" /> : <span className="city-roads__blank" />}
              <span className="city-roads__name">{city?.name ?? id}</span>
              <span className="city-roads__faction">{faction?.name ?? '中立'}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
