import { CHARACTER_MAP } from '../data/character'
import { INDIRECT_UNIT_TYPES, UNIT_TYPE_MAP } from '../data/unitTypes'
import { MAX_UNITS, indirectMaxSoldiers, maxSoldiers, unitTypesOf } from './army'
import type { ArmyUnit, Battle, BattleSide, CharacterId, CityId, FactionId, GameState, InvasionOrder } from './types'
import { CITY_IDS, FACTION_IDS, areNeighbours, neighbours } from './world'

/** The faction of a city; undefined when neutral */
export const ownerOf = (state: GameState, cityId: CityId): FactionId | undefined => state.cityOwners[cityId]

export const isPlayerTurn = (state: GameState) =>
  state.phase === 'strategy' && state.activeFaction === state.playerFaction

/** The game starts in 灰歴312年4月 and a turn is a month */
const START_YEAR = 312
const START_MONTH = 4

export function dateOf(turn: number): { year: number, month: number } {
  const months = START_MONTH - 1 + turn - 1
  return { year: START_YEAR + Math.floor(months / 12), month: months % 12 + 1 }
}

export type Season = '春' | '夏' | '秋' | '冬'

/** 3〜5月は春、6〜8月は夏、9〜11月は秋、12〜2月は冬 */
export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return '春'
  if (month >= 6 && month <= 8) return '夏'
  if (month >= 9 && month <= 11) return '秋'
  return '冬'
}

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

/**
 * Cities a side of a battle can retreat to from the battlefield: the
 * neighbours of the city fought over held by the side's faction, in ROAD_LINKS
 * order (for the attacker this includes the city it set out from). None for
 * the defender of a neutral city.
 */
export function retreatCities(state: GameState, battle: Battle, side: BattleSide): CityId[] {
  const factionId = side === 'attacker' ? battle.attacker.factionId : battle.defender.factionId
  return factionId ? neighbours(battle.cityId).filter((id) => ownerOf(state, id) === factionId) : []
}

/** Soldiers of a city not yet sent on an invasion this turn */
export function soldiersLeft(state: GameState, cityId: CityId): number {
  const sent = state.orders.filter((o) => o.from === cityId).flatMap((o) => o.units ?? [])
  return (state.cities[cityId]?.troops ?? 0) - sent.reduce((sum, u) => sum + u.soldiers, 0)
}

/** The governor (代官) of a city: its lord */
export const governorOf = (state: GameState, cityId: CityId): CharacterId | undefined =>
  state.cities[cityId]?.assignments.governor

/**
 * Who must lead an invasion they join: 君主 (2) over 領主 (1, the governor of their city); 0 for anyone else.
 * The commander of an invasion is a knight of its highest rank.
 */
export function commandRank(state: GameState, id: CharacterId): number {
  if (CHARACTER_MAP[id]?.isPatriarch) return 2
  const cityId = state.characters[id]?.cityId
  return cityId && governorOf(state, cityId) === id ? 1 : 0
}

/** The knight of the highest commandRank, the first of them on a tie */
export function leadingKnight(state: GameState, knights: readonly CharacterId[]): CharacterId | undefined {
  return knights.reduce<CharacterId | undefined>(
    (best, id) => (best === undefined || commandRank(state, id) > commandRank(state, best) ? id : best), undefined)
}

/** Why the units of an order are not allowed, or null */
function unitsProblem(
  state: GameState, from: CityId, commander: CharacterId, knights: readonly CharacterId[], units: readonly ArmyUnit[],
) {
  const led = units.filter((u) => u.knightId !== null)
  if (led.length !== knights.length || led.some((u, i) => u.knightId !== knights[i])) {
    return '部隊の騎士が予約の騎士と一致しません'
  }
  if (units.length > MAX_UNITS) return `部隊は${MAX_UNITS}つまでです`
  for (const u of units) {
    if (!UNIT_TYPE_MAP[u.unitType]) return `${u.unitType} は兵科ではありません`
    if (!Number.isInteger(u.soldiers) || u.soldiers <= 0) return '兵数が0の部隊があります'
    if (u.knightId === null) {
      if (!INDIRECT_UNIT_TYPES.some((id) => id === u.unitType)) return `間接指揮部隊は${UNIT_TYPE_MAP[u.unitType].name}にできません`
      if (u.soldiers > indirectMaxSoldiers(commander)) return '間接指揮部隊の兵数が上限を超えています'
      continue
    }
    if (!unitTypesOf(u.knightId).some((id) => id === u.unitType)) return `${u.knightId} は${UNIT_TYPE_MAP[u.unitType].name}を率いられません`
    if (u.soldiers > maxSoldiers(u.knightId)) return `${u.knightId} の兵数が率兵の上限を超えています`
  }
  if (units.reduce((sum, u) => sum + u.soldiers, 0) > soldiersLeft(state, from)) return '出撃できる兵が足りません'
  return null
}

/** Why an invasion cannot be ordered now, or null when it can */
export function orderProblem(state: GameState, draft: Omit<InvasionOrder, 'id'>): string | null {
  const { factionId, from, to, commander, knights } = draft
  if (state.phase !== 'strategy' || state.activeFaction !== factionId) return '手番ではありません'
  if (ownerOf(state, from) !== factionId) return '出発拠点が自勢力の都市ではありません'
  if (!areNeighbours(from, to)) return '目標が街道でつながっていません'
  if (ownerOf(state, to) === factionId) return '目標が自勢力の都市です'
  if (knights.length === 0) return '騎士を1人以上選んでください'
  if (new Set(knights).size !== knights.length) return '同じ騎士が重複しています'
  if (knights.length > MAX_UNITS) return `部隊は${MAX_UNITS}つまでです`
  for (const id of knights) {
    const character = state.characters[id]
    if (!character || character.cityId !== from || character.factionId !== factionId) {
      return `${id} は出発拠点の騎士ではありません`
    }
    if (orderOf(state, id)) return `${id} はすでに別の侵攻に加わっています`
  }
  if (!knights.includes(commander)) return '軍団長が出撃する騎士にいません'
  const leader = leadingKnight(state, knights)!
  if (commandRank(state, commander) < commandRank(state, leader)) {
    return `${leader} が出撃するときは軍団長になります`
  }
  if (state.orders.some((o) => o.factionId === factionId && o.to === to)) return 'この目標にはすでに侵攻を予約しています'
  return draft.units ? unitsProblem(state, from, commander, knights, draft.units) : null
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
