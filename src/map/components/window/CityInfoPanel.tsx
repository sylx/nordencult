import CharacterImage from '../../../ui/components/CharacterImage'
import { type City } from '../../../data/city'
import type { Character } from '../../../data/character'
import FACTIONS from '../../../data/faction'

import PlaceTown from '../../../assets/map/place_town.webp'
import PlaceCity from '../../../assets/map/place_city.webp'
import PlaceMetropolice from '../../../assets/map/place_metropolice.webp'
import PlaceFortress1 from '../../../assets/map/place_fortress1.webp'
import PlaceFortress2 from '../../../assets/map/place_fortress2.webp'
import PlaceTemple from '../../../assets/map/place_temple.webp'

import './CityInfoPanel.css'

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

type PlaceType = 'town' | 'city' | 'metropolice' | 'fortress1' | 'fortress2' | 'temple'

const PLACE_IMAGES: Record<PlaceType, string> = {
  town: PlaceTown,
  city: PlaceCity,
  metropolice: PlaceMetropolice,
  fortress1: PlaceFortress1,
  fortress2: PlaceFortress2,
  temple: PlaceTemple,
}

const CITY_SCALE_LABELS: Record<PlaceType, string> = {
  town: '小さな町',
  city: '大きな街',
  metropolice: '大都市',
  fortress1: '要塞',
  fortress2: '要塞',
  temple: '聖地',
}

function resolvePlaceType(city: City): PlaceType {
  if (city.image) return city.image
  if (city.population >= 15000) return 'metropolice'
  if (city.population >= 8000) return 'city'
  return 'town'
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

export default function CityInfoPanel({ city, lord }: { city: City; lord?: Character }) {
  const faction = city.belongTo ? FACTION_MAP[city.belongTo] : undefined
  const placeType = resolvePlaceType(city)

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
          <div className="map-window-stat-row">
            <span className="map-window-stat-label">規模</span>
            <span className="map-window-stat-value">{CITY_SCALE_LABELS[placeType]}</span>
          </div>
        </div>
        <div className="spacer" />
        <div className="map-window-city-graphic">
          <img src={PLACE_IMAGES[placeType]} alt={city.name} className="map-window-city-graphic-img" />
        </div>
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
