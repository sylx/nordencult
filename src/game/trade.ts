import { GameRuleError } from './errors'
import { ownerOf } from './queries'
import type { CityId, GameState } from './types'

/** Why the faction holding the city cannot buy supplies there for `price` gold (from a travelling merchant), or null */
export function buySuppliesProblem(state: GameState, cityId: CityId, price: number): string | null {
  const factionId = ownerOf(state, cityId)
  if (!factionId) return '勢力の都市ではありません'
  return price > (state.gold[factionId] ?? 0) ? '金が足りません' : null
}

/** The faction holding the city buys `supplies` for `price` gold: they go into the city's store */
export function buySupplies(state: GameState, cityId: CityId, supplies: number, price: number): GameState {
  const problem = buySuppliesProblem(state, cityId, price)
  if (problem) throw new GameRuleError(problem)
  const factionId = ownerOf(state, cityId)!
  const city = state.cities[cityId]
  return {
    ...state,
    gold: { ...state.gold, [factionId]: state.gold[factionId] - price },
    cities: { ...state.cities, [cityId]: { ...city, storedSupplies: city.storedSupplies + supplies } },
  }
}
