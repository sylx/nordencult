import cityData from './cityData.json'

/**
 * Initial data of a city (written by norden-data's city editor). The map keeps
 * its own copy (norden-strategy's CITY_LIST) for drawing the places.
 */
export interface City {
  /** 'P000'..'P030' */
  id: string
  name: string
  nameEn: string
  /** e.g. port_city, military_city */
  type: string
  tags: string[]
  population: number
  /** 農業・商業・生産 */
  agriculture: number
  market: number
  production: number
  special?: string
  /** The faction holding it when the game starts; omitted: neutral */
  belongTo?: string
}

export const CITY_LIST: readonly City[] = cityData

export const CITY_MAP: Readonly<Record<string, City>> = Object.fromEntries(CITY_LIST.map((c) => [c.id, c]))
