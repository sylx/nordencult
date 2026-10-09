import { UNIT_TYPE_MAP } from '../data/unitTypes'
import { maxSoldiers, soldierPool } from './army'
import type { ArmyUnit, CharacterId, CityId, FactionId, GameState, InvasionOrder } from './types'
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

/** Soldiers of a city not yet sent on an invasion this turn */
export function soldiersLeft(state: GameState, cityId: CityId): number {
  const sent = state.orders.filter((o) => o.from === cityId).flatMap((o) => o.units ?? [])
  return soldierPool(cityId) - sent.reduce((sum, u) => sum + u.soldiers, 0)
}

/** Why the units of an order are not allowed, or null */
function unitsProblem(state: GameState, from: CityId, knights: readonly CharacterId[], units: readonly ArmyUnit[]) {
  if (units.length !== knights.length || units.some((u, i) => u.knightId !== knights[i])) {
    return '部隊の騎士が予約の騎士と一致しません'
  }
  for (const u of units) {
    if (!UNIT_TYPE_MAP[u.unitType]) return `${u.unitType} は兵科ではありません`
    if (!Number.isInteger(u.soldiers) || u.soldiers <= 0) return '兵数が0の騎士がいます'
    if (u.soldiers > maxSoldiers(u.knightId)) return `${u.knightId} の兵数が率兵の上限を超えています`
  }
  if (units.reduce((sum, u) => sum + u.soldiers, 0) > soldiersLeft(state, from)) return '出撃できる兵が足りません'
  return null
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
  return draft.units ? unitsProblem(state, from, knights, draft.units) : null
}

/** Targets still open from a city: its invasion targets not already ordered by the city's faction */
export function openInvasionTargets(state: GameState, from: CityId): CityId[] {
  const faction = ownerOf(state, from)
  return invasionTargets(state, from).filter((to) => !state.orders.some((o) => o.factionId === faction && o.to === to))
}

/** Why the active faction cannot start an invasion from the city, or null when it can */
export function invadeFromProblem(state: GameState, cityId: CityId): string | null {
  if (state.phase !== 'strategy' || !state.activeFaction) return '手番ではありません'
  if (ownerOf(state, cityId) !== state.activeFaction) return '自勢力の都市ではありません'
  if (availableKnights(state, cityId).length === 0) return '出撃できる騎士がいません'
  if (openInvasionTargets(state, cityId).length === 0) return '侵攻できる隣接都市がありません'
  if (soldiersLeft(state, cityId) <= 0) return '出撃できる兵がいません'
  return null
}
