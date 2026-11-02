import { MAX_MORALE } from '../army'
import type { CityId, CityState, FactionId, GameState } from '../types'

/** Debugging: the faction's treasury (never below nothing) */
export const debugSetGold = (state: GameState, factionId: FactionId, gold: number): GameState =>
  ({ ...state, gold: { ...state.gold, [factionId]: Math.max(0, gold) } })

/** The numbers of a city debugging can set */
export type DebugCityField = 'population' | 'market' | 'production' | 'storedSupplies' | 'troops' | 'troopMorale'

/** Debugging: a number of the city (never below nothing, nor morale above MAX_MORALE) */
export function debugSetCity(state: GameState, cityId: CityId, field: DebugCityField, value: number): GameState {
  const most = field === 'troopMorale' ? MAX_MORALE : Infinity
  const city: CityState = { ...state.cities[cityId], [field]: Math.min(most, Math.max(0, value)) }
  return { ...state, cities: { ...state.cities, [cityId]: city } }
}
