/**
 * Road maps (norden-battle/assets/maps/road-*.json) generated from the
 * strategy map's geography: the macro terrain and the roads of
 * norden-strategy, turned into HEX maps by map-runtime's generateGeoRoadMap,
 * with the cities drawn as template castles by their kind and size.
 * Run through generate.mjs (it writes the files).
 */
import { generateGeoRoadMap, type GeoCity, type GeoCityTemplate } from '@norden/map-runtime/core/geoMap'
import { parseMapData, stringifyMapData } from '@norden/map-runtime/core/mapData'
import { generateWorld, PLACE_POINTS, ROAD_LINKS, WorldSampler, type PlaceType, type WorldData } from 'norden-strategy/world'
import { CITY_MAP, type City } from '../../src/data/city'
import { tierOf } from '../../src/game/economy'
import { roadMapFile } from '../../src/scenes/battle/battleMap'

export { roadMapFile }

/** Every road of the strategy map, as `<id>-<id>` with the ids sorted */
export const ROAD_KEYS: readonly string[] = ROAD_LINKS.map(([a, b]) => [a, b].sort().join('-'))

const TIER_PLACE_TYPES = { 1: 'town', 2: 'city', 3: 'metropolice' } as const

/** The city's picture on the map at the start (as src/scenes/strategy/views.ts' placeTypeOf): it sets the ground levelled under it */
const placeTypeOf = (city: City): PlaceType => city.image ?? TIER_PLACE_TYPES[tierOf(city.population)]

/** The castle drawn for a city: larger with its tier, a castle for the military cities, a palisade for the small frontier towns and ruins */
function templateOf(city: City): GeoCityTemplate {
  const tier = tierOf(city.population)
  if (city.type === 'pope_city' || tier === 3) return 'castle-l'
  if (city.type === 'military_city' || city.image === 'fortress1' || city.image === 'fortress2') return tier >= 2 ? 'castle-l' : 'castle-m'
  if (tier === 2) return 'castle-m'
  if (city.type === 'ruin_city' || city.type === 'frontier_city') return 'fort'
  return 'castle-s'
}

/** 「灰都 アシュダール」 → 「アシュダール」 */
const shortName = (city: City) => city.name.split(/\s+/).pop() ?? city.id

let world: { data: WorldData; sampler: WorldSampler } | null = null

/** The strategy map's terrain, generated once (with the cities as the game starts) */
function worldOf() {
  if (!world) {
    const data = generateWorld({
      places: Object.entries(PLACE_POINTS).flatMap(([id, p]) => {
        const city = CITY_MAP[id]
        return city ? [{ id, name: city.name, type: placeTypeOf(city), ...p }] : []
      }),
    })
    world = { data, sampler: new WorldSampler(data) }
  }
  return world
}

export interface RoadMapFile {
  key: string
  file: string
  text: string
}

/** The road map of a road (`<id>-<id>`), as the JSON to write */
export function buildRoadMap(key: string): RoadMapFile {
  const [a, b] = key.split('-').sort()
  if (!ROAD_KEYS.includes(`${a}-${b}`)) throw new Error(`${key}: 戦略マップにない街道です`)
  const { data: w, sampler } = worldOf()
  const geoCity = (id: string): GeoCity => {
    const city = CITY_MAP[id]
    const p = PLACE_POINTS[id]
    if (!city || !p) throw new Error(`${id}: 都市のデータか位置がありません`)
    return { id, ...p, template: templateOf(city), villages: tierOf(city.population) + 1 }
  }
  const road = w.roads.find((r) => [r.from, r.to].sort().join('-') === `${a}-${b}`)
  const map = generateGeoRoadMap({
    name: `${shortName(CITY_MAP[a])}–${shortName(CITY_MAP[b])}`,
    seed: Number(a.slice(1)) * 100 + Number(b.slice(1)),
    source: { sample: (x, z) => sampler.sample(x, z), roads: w.roads.map((r) => r.points) },
    cities: [geoCity(a), geoCity(b)],
    road: road?.points,
  })
  const text = stringifyMapData(map)
  // The file must load as the game and the editors load it
  parseMapData(JSON.parse(text))
  return { key: `${a}-${b}`, file: roadMapFile(a, b), text }
}
