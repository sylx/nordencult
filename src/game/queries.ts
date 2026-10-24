import { CHARACTER_MAP } from '../data/character'
import { INDIRECT_UNIT_TYPES, UNIT_TYPE_MAP } from '../data/unitTypes'
import { MAX_SOLDIERS, MAX_UNITS, unitTypesOf } from './army'
import type {
  ArmyUnit, Battle, BattleSide, CharacterId, CityId, DefenseDraft, FactionId, GameState, InvasionOrder, MoveOrder, Movement, TransportOrder,
} from './types'
import { CITY_IDS, FACTION_IDS, areNeighbours, neighbours } from './world'

/** The faction of a city; undefined when neutral */
export const ownerOf = (state: GameState, cityId: CityId): FactionId | undefined => state.cityOwners[cityId]

/** A faction the player plays */
export const isPlayerFaction = (state: GameState, factionId: FactionId | null | undefined) =>
  factionId != null && state.playerFactions.includes(factionId)

export const isPlayerTurn = (state: GameState) =>
  state.phase === 'strategy' && isPlayerFaction(state, state.activeFaction)

/** The faction the screens show: the one playing its strategy phase when the player plays it, or else the player's first */
export const viewFaction = (state: GameState): FactionId =>
  isPlayerTurn(state) ? state.activeFaction! : state.playerFactions[0]

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

/** 国力: the population of the faction's cities */
export const factionPower = (state: GameState, factionId: FactionId): number =>
  citiesOf(state, factionId).reduce((sum, id) => sum + (state.cities[id]?.population ?? 0), 0)

/**
 * Factions in the order they play the strategy phase (and their invasions
 * are resolved): by 国力 (factionPower), the highest first, those of the same
 * as in FACTION_LIST. Factions without a city are out of the game.
 */
export function turnOrder(state: GameState): FactionId[] {
  const owners = new Set(Object.values(state.cityOwners))
  const power = new Map(FACTION_IDS.map((id) => [id, factionPower(state, id)]))
  return FACTION_IDS.filter((id) => owners.has(id)).sort((a, b) => power.get(b)! - power.get(a)!)
}

/** Cities of a faction, in city id order */
export const citiesOf = (state: GameState, factionId: FactionId): CityId[] =>
  CITY_IDS.filter((id) => state.cityOwners[id] === factionId)

/** Characters serving in a city, in id order, those away on a move or a transport included */
export function charactersIn(state: GameState, cityId: CityId): CharacterId[] {
  return Object.keys(state.characters).filter((id) => state.characters[id].cityId === cityId).sort()
}

/** The move or transport (there or riding back) a character is away on, if any */
export const movementOf = (state: GameState, characterId: CharacterId): Movement | undefined =>
  state.movements.find((m) => m.knights.includes(characterId))

/** 移動中 or 輸送中 (a transport's knight riding back too) for a character away on a movement, or null */
export function awayReason(state: GameState, characterId: CharacterId): string | null {
  const movement = movementOf(state, characterId)
  if (!movement) return null
  return movement.kind ? '輸送中' : '移動中'
}

/** Characters in a city now, in id order: those serving there and not away (they defend it) */
export const stationedIn = (state: GameState, cityId: CityId): CharacterId[] =>
  charactersIn(state, cityId).filter((id) => !movementOf(state, id))

/** The order a character is part of, if any */
export const orderOf = (state: GameState, characterId: CharacterId): InvasionOrder | undefined =>
  state.orders.find((o) => o.knights.includes(characterId))

/** The move a character is part of this turn, if any */
export const moveOrderOf = (state: GameState, characterId: CharacterId): MoveOrder | undefined =>
  state.moveOrders.find((o) => o.knights.includes(characterId))

/** The transport a character is in charge of this turn, if any */
export const transportOrderOf = (state: GameState, characterId: CharacterId): TransportOrder | undefined =>
  state.transportOrders.find((o) => o.knight === characterId)

/** Characters in a city not yet sent on an invasion, a move or a transport */
export const availableKnights = (state: GameState, cityId: CityId): CharacterId[] =>
  stationedIn(state, cityId).filter((id) => !orderOf(state, id) && !moveOrderOf(state, id) && !transportOrderOf(state, id))

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

/** Soldiers of a city not yet sent on an invasion, a move or a transport this turn */
export function soldiersLeft(state: GameState, cityId: CityId): number {
  const sent = state.orders.filter((o) => o.from === cityId).flatMap((o) => o.units ?? [])
  const moved = [...state.moveOrders, ...state.transportOrders].filter((o) => o.from === cityId)
  return (state.cities[cityId]?.troops ?? 0) - sent.reduce((sum, u) => sum + u.soldiers, 0) - moved.reduce((sum, o) => sum + o.troops, 0)
}

/** Supplies of a city not yet sent on a move or a transport this turn */
export function suppliesLeft(state: GameState, cityId: CityId): number {
  const moved = [...state.moveOrders, ...state.transportOrders].filter((o) => o.from === cityId)
  return (state.cities[cityId]?.storedSupplies ?? 0) - moved.reduce((sum, o) => sum + o.supplies, 0)
}

/** The governor (領主) of a city: its lord */
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

/** Why the units of an army (of `pool` soldiers at most) are not allowed, or null */
function unitsProblem(knights: readonly CharacterId[], units: readonly ArmyUnit[], pool: number) {
  const led = units.filter((u) => u.knightId !== null)
  if (led.length !== knights.length || led.some((u, i) => u.knightId !== knights[i])) {
    return '部隊の騎士が予約の騎士と一致しません'
  }
  if (units.length > MAX_UNITS) return `部隊は${MAX_UNITS}つまでです`
  for (const u of units) {
    if (!UNIT_TYPE_MAP[u.unitType]) return `${u.unitType} は兵科ではありません`
    if (!Number.isInteger(u.soldiers) || u.soldiers <= 0) return '兵数が0の部隊があります'
    if (u.soldiers > MAX_SOLDIERS) return `1部隊の兵数は${MAX_SOLDIERS}までです`
    if (u.knightId === null) {
      if (!INDIRECT_UNIT_TYPES.some((id) => id === u.unitType)) return `間接指揮部隊は${UNIT_TYPE_MAP[u.unitType].name}にできません`
      continue
    }
    if (!unitTypesOf(u.knightId).some((id) => id === u.unitType)) return `${u.knightId} は${UNIT_TYPE_MAP[u.unitType].name}を率いられません`
  }
  if (units.reduce((sum, u) => sum + u.soldiers, 0) > pool) return '出撃できる兵が足りません'
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
    const away = awayReason(state, id)
    if (away) return `${id} は${away}です`
    if (orderOf(state, id)) return `${id} はすでに別の侵攻に加わっています`
    if (moveOrderOf(state, id)) return `${id} は移動を予約しています`
    if (transportOrderOf(state, id)) return `${id} は輸送を予約しています`
  }
  if (!knights.includes(commander)) return '軍団長が出撃する騎士にいません'
  const leader = leadingKnight(state, knights)!
  if (commandRank(state, commander) < commandRank(state, leader)) {
    return `${leader} が出撃するときは軍団長になります`
  }
  if (state.orders.some((o) => o.factionId === factionId && o.from === from && o.to === to)) return 'この目標にはすでに侵攻を予約しています'
  return draft.units ? unitsProblem(knights, draft.units, soldiersLeft(state, from)) : null
}

/** Knights who can defend the city of a battle: the defender's knights there (those of invasions called off too) */
export const defenseKnights = (state: GameState, battle: Battle): CharacterId[] =>
  stationedIn(state, battle.cityId).filter((id) => state.characters[id].factionId === battle.defender.factionId)

/** Why the army a faction the player plays defends a city with is not allowed, or null */
export function defenseProblem(state: GameState, battle: Battle, draft: DefenseDraft): string | null {
  const { commander, units } = draft
  if (!battle.pendingDefense) return '防衛軍団はもう編成されています'
  const knights = units.flatMap((u) => (u.knightId === null ? [] : [u.knightId]))
  if (knights.length === 0) return '騎士を1人以上選んでください'
  if (new Set(knights).size !== knights.length) return '同じ騎士が重複しています'
  const allowed = defenseKnights(state, battle)
  const outsider = knights.find((id) => !allowed.includes(id))
  if (outsider) return `${outsider} はこの拠点で防衛できる騎士ではありません`
  if (!knights.includes(commander)) return '軍団長が防衛する騎士にいません'
  const leader = leadingKnight(state, knights)!
  if (commandRank(state, commander) < commandRank(state, leader)) return `${leader} が防衛するときは軍団長になります`
  return unitsProblem(knights, units, state.cities[battle.cityId]?.troops ?? 0)
}

/**
 * Targets still open from a city: its invasion targets not already ordered from it (another city of the faction may
 * invade the same target: the invasions go one by one, and one coming after a city was taken marches into it)
 */
export function openInvasionTargets(state: GameState, from: CityId): CityId[] {
  return invasionTargets(state, from).filter((to) => !state.orders.some((o) => o.from === from && o.to === to))
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
