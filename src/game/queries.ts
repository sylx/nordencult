import type { CharacterId, CityId, FactionId, GameState, InvasionOrder } from './types'
import { CITY_IDS, FACTION_IDS, areNeighbours, neighbours } from './world'

/** The faction of a city; undefined when neutral */
export const ownerOf = (state: GameState, cityId: CityId): FactionId | undefined => state.cityOwners[cityId]

export const isPlayerTurn = (state: GameState) =>
  state.phase === 'strategy' && state.activeFaction === state.playerFaction

/**
 * Factions in the order they play the strategy phase (and their invasions
 * are resolved): the player first, then the others as in FACTION_LIST.
 * Factions without a city are out of the game.
 */
export function turnOrder(state: GameState): FactionId[] {
  const owners = new Set(Object.values(state.cityOwners))
  return [state.playerFaction, ...FACTION_IDS.filter((id) => id !== state.playerFaction)]
    .filter((id) => owners.has(id))
}

/** Cities of a faction, in city id order */
export const citiesOf = (state: GameState, factionId: FactionId): CityId[] =>
  CITY_IDS.filter((id) => state.cityOwners[id] === factionId)

/** Characters serving in a city, in id order */
export function charactersIn(state: GameState, cityId: CityId): CharacterId[] {
  return Object.keys(state.characters).filter((id) => state.characters[id].cityId === cityId).sort()
}

/** The order a character is part of, if any */
export const orderOf = (state: GameState, characterId: CharacterId): InvasionOrder | undefined =>
  state.orders.find((o) => o.knights.includes(characterId))

/** Characters of a city not yet sent on an invasion */
export const availableKnights = (state: GameState, cityId: CityId): CharacterId[] =>
  charactersIn(state, cityId).filter((id) => !orderOf(state, id))

/** Cities a faction can invade from a city: joined by a road and not its own (neutral ones too) */
export function invasionTargets(state: GameState, from: CityId): CityId[] {
  const faction = ownerOf(state, from)
  return neighbours(from).filter((id) => ownerOf(state, id) !== faction)
}

/** Why an invasion cannot be ordered now, or null when it can */
export function orderProblem(state: GameState, draft: Omit<InvasionOrder, 'id'>): string | null {
  const { factionId, from, to, knights } = draft
  if (state.phase !== 'strategy' || state.activeFaction !== factionId) return '手番ではありません'
  if (ownerOf(state, from) !== factionId) return '出発拠点が自勢力の都市ではありません'
  if (!areNeighbours(from, to)) return '目標が街道でつながっていません'
  if (ownerOf(state, to) === factionId) return '目標が自勢力の都市です'
  if (knights.length === 0) return '騎士を1人以上選んでください'
  if (new Set(knights).size !== knights.length) return '同じ騎士が重複しています'
  for (const id of knights) {
    const character = state.characters[id]
    if (!character || character.cityId !== from || character.factionId !== factionId) {
      return `${id} は出発拠点の騎士ではありません`
    }
    if (orderOf(state, id)) return `${id} はすでに別の侵攻に加わっています`
  }
  if (state.orders.some((o) => o.factionId === factionId && o.to === to)) return 'この目標にはすでに侵攻を予約しています'
  return null
}

/** Whether the city can start an invasion: the active faction's, with free knights and a target */
export function canInvadeFrom(state: GameState, cityId: CityId): boolean {
  const faction = ownerOf(state, cityId)
  return state.phase === 'strategy' && faction !== undefined && faction === state.activeFaction
    && availableKnights(state, cityId).length > 0
    && invasionTargets(state, cityId).some((to) => !state.orders.some((o) => o.factionId === faction && o.to === to))
}
