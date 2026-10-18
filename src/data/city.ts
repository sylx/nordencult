import cityData from './cityData.json'

/**
 * Master data of a city (written by norden-data's city editor): what it is and
 * where it starts. What changes turn by turn (population, supplies, soldiers,
 * buildings, assignments) is game state (src/game/'s CityState), starting from
 * these values. The map draws the cities the game gives it (their names, pictures
 * and factions: src/scenes/strategy/views.ts' mapCities) at the places it keeps.
 */
export interface City {
  /** 'P000'..'P030' */
  id: string
  name: string
  nameEn: string
  /** e.g. port_city, military_city */
  type: string
  /**
   * A fixed picture on the map: 聖地 (temple) or 要塞 (fortress1, fortress2). Such a city does not follow
   * its tier: its scale and picture stay, and it has FIXED_SLOTS building slots. Omitted: by its tier
   */
  image?: 'temple' | 'fortress1' | 'fortress2'
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

// The JSON's strings are not narrowed to `image`'s; src/data/city.test.ts checks them
export const CITY_LIST: readonly City[] = cityData as readonly City[]

export const CITY_MAP: Readonly<Record<string, City>> = Object.fromEntries(CITY_LIST.map((c) => [c.id, c]))
