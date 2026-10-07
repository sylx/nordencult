import { CITY_LIST, FACTION_LIST, ROAD_LINKS } from 'norden-strategy/data'
import type { CityId, FactionId } from './types'

/** The static world the game is played on: cities, factions and the roads between the cities */

export const CITY_IDS: readonly CityId[] = CITY_LIST.map((c) => c.id)

export const FACTION_IDS: readonly FactionId[] = FACTION_LIST.map((f) => f.id)

export const isFactionId = (value: string | null | undefined): value is FactionId =>
  value != null && FACTION_IDS.includes(value)

const NEIGHBOURS = new Map<CityId, CityId[]>()
for (const [a, b] of ROAD_LINKS) {
  for (const [from, to] of [[a, b], [b, a]]) {
    const list = NEIGHBOURS.get(from) ?? []
    if (!list.includes(to)) list.push(to)
    NEIGHBOURS.set(from, list)
  }
}

/** Cities joined to a city by a road, in the order of ROAD_LINKS (the order decides ties, e.g. where to retreat) */
export function neighbours(id: CityId): readonly CityId[] {
  return NEIGHBOURS.get(id) ?? []
}

export const areNeighbours = (a: CityId, b: CityId) => neighbours(a).includes(b)
