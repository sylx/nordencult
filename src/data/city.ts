import cityData from './cityData.json'

/**
 * Master data of a city (written by norden-data's city editor): what it is and
 * where it starts. What changes turn by turn (population, supplies, soldiers,
 * buildings, assignments) is game state (src/game/'s CityState), starting from
 * these values. The map keeps its own copy (norden-strategy's CITY_LIST) for
 * drawing the places.
 */
export interface City {
  /** 'P000'..'P030' */
  id: string
  name: string
  nameEn: string
  /** e.g. port_city, military_city */
  type: string
  tags: string[]
  special?: string
  /** The faction holding it when the game starts; omitted: neutral */
  belongTo?: string
  /** Population at the start */
  population: number
  /** Base 商業・生産, before the governor's and the buildings' bonuses */
  market: number
  production: number
  /** Supplies stored at the start; omitted: 生産 × 2 */
  storedSupplies?: number
  /** Soldiers at the start; omitted: 生産 × 5 */
  troops?: number
  /** Morale of the soldiers at the start (0..100); omitted: 70 */
  troopMorale?: number
  /** Buildings standing at the start (ids of BUILDING_LIST); omitted: none */
  buildings?: string[]
}

export const CITY_LIST: readonly City[] = cityData

export const CITY_MAP: Readonly<Record<string, City>> = Object.fromEntries(CITY_LIST.map((c) => [c.id, c]))
