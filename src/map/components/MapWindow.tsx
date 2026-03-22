import { useMemo } from 'react'

import InfoWindowWithTabs, { type TabInfo } from '../../ui/components/InfoWindowWithTabs'
import type { InfoWindowProps } from '../../ui/components/InfoWindow'
import CharacterImage from '../../ui/components/CharacterImage'
import { CITY_MAP, type City } from '../../data/city'
import { CHARACTER_LIST, type Character } from '../../data/character'
import FACTIONS from '../../data/faction'
import './MapWindow.css'

import IconHome from '../../assets/ui/icons/icon_home.webp'
import IconPeople from '../../assets/ui/icons/icon_people.webp'
import IconHistory from '../../assets/ui/icons/icon_history.webp'
import IconStat from '../../assets/ui/icons/icon_stat.webp'

const FACTION_MAP = Object.fromEntries(FACTIONS.map((f) => [f.id, f]))

const CITY_TYPE_LABELS: Record<string, string> = {
  pope_city: '聖都',
  port_city: '港湾都市',
  farm_city: '農業都市',
  trade_city: '交易都市',
  military_city: '軍事都市',
  ruin_city: '遺跡都市',
  frontier_city: '辺境都市',
}

export interface MapWindowProps extends Omit<InfoWindowProps, 'children' | 'title'> {
  activePlace?: string | null
}

function CityInfoPanel({ city, lord }: { city: City; lord?: Character }) {
  const faction = city.belongTo ? FACTION_MAP[city.belongTo] : undefined

  return (
    <div className="map-window-city-info">
      <div className="map-window-city-header">
        <h2 className="map-window-city-name">{city.name}</h2>
        <span className="map-window-city-type">
          {CITY_TYPE_LABELS[city.type] ?? city.type}
        </span>
      </div>

      {lord && (
        <div className="map-window-lord">
          <div className="map-window-lord-image">
            <CharacterImage character={lord} mode="full" />
          </div>
        </div>
      )}
      <div className="map-window-city-description">
        <div className="map-window-city-basements">
          {faction && (
            <div className="map-window-stat-row">
              <span className="map-window-stat-label">所属</span>
              <span className="map-window-stat-value">{faction.name}</span>
            </div>
          )}
          {lord && (
            <div className="map-window-stat-row">
              <span className="map-window-stat-label">領主</span>
              <span className="map-window-stat-value">{lord.name}</span>
            </div>
          )}
          <div className="map-window-stat-row">
            <span className="map-window-stat-label">人口</span>
            <span className="map-window-stat-value">{city.population.toLocaleString()}</span>
          </div>
        </div>
        <div className="spacer" />
        <div className="map-window-city-stats">
          <div className="map-window-stat-row">
            <span className="map-window-stat-label">農業</span>
            <StatBar value={city.agriculture} max={720} />
          </div>
          <div className="map-window-stat-row">
            <span className="map-window-stat-label">商業</span>
            <StatBar value={city.market} max={720} />
          </div>
          <div className="map-window-stat-row">
            <span className="map-window-stat-label">軍事</span>
            <StatBar value={city.military} max={640} />
          </div>
          {city.special && (
            <div className="map-window-stat-row">
              <span className="map-window-stat-label">特殊</span>
              <span className="map-window-stat-value">{city.special}</span>
            </div>
          )}
        </div>
        {city.tags.length > 0 && (
          <div className="map-window-city-tags">
            {city.tags.map((tag) => (
              <span key={tag} className="map-window-tag">{tag}</span>
            ))}
          </div>
        )}
        <div className="spacer" />
      </div>
    </div>
  )
}

function StatBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <span className="map-window-stat-value">
      <span className="map-window-stat-bar">
        <span className="map-window-stat-bar-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="map-window-stat-number">{value}</span>
    </span>
  )
}

export default function MapWindow({
  activePlace,
  ...windowProps
}: MapWindowProps) {
  const city = activePlace ? CITY_MAP[activePlace] : undefined
  const lord = useMemo(() => {
    if (!activePlace) return undefined
    return CHARACTER_LIST.find((c) => c.belongTo === activePlace && c.isLord)
  }, [activePlace])

  const tabs: TabInfo[] = useMemo(() => {
    const cityTab: TabInfo = {
      name: '都市情報',
      icon: IconHome,
      content: city ? (
        <CityInfoPanel city={city} lord={lord} />
      ) : (
        <p className="map-window-no-city">地図上の都市をクリックしてください。</p>
      ),
    }

    return [
      cityTab,
      {
        name: '騎士',
        icon: IconPeople,
        content: (
          <>
            <p>The northern routes are controlled by old guilds that guard forgotten archives.</p>
            <p>Every city has its own emblem and local stories hidden in the map.</p>
          </>
        ),
      },
      {
        name: '統計',
        icon: IconStat,
        content: (
          <>
            <p>Keep track of your discoveries and progress in the stats tab.</p>
            <p>Compare your stats with friends and other explorers.</p>
          </>
        ),
      },
      {
        name: '歴史',
        icon: IconHistory,
        content: (
          <>
            <p>Click places on the map to open details.</p>
            <p>Keep an eye on symbols and landmarks. They often hint at side paths.</p>
          </>
        ),
      },
    ]
  }, [city, lord])

  const title = '都市情報'

  return (
    <InfoWindowWithTabs
      {...windowProps}
      title={title}
      tabs={tabs}
      defaultActiveTab={0}
    />
  )
}
