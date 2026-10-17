import { BUILDING_MAP, upgradesOf } from '../../data/buildings'
import { CITY_MAP } from '../../data/city'
import { mixMorale } from '../army'
import { GameRuleError } from '../errors'
import { orderOf, ownerOf, soldiersLeft } from '../queries'
import type { AssignmentRole, CharacterId, CityAssignments, CityId, CityState, FactionId, GameState } from '../types'
import { neighbours } from '../world'
import { RECRUIT_GOLD } from './balance'
import { cityOutput } from './output'

/**
 * The domestic commands of a city: assigning its knights, building, recruiting
 * and transporting. Each has a `…Problem` function saying why it is not
 * allowed (or null); the command throws GameRuleError with that reason.
 */

const withCity = (state: GameState, cityId: CityId, change: Partial<CityState>): GameState =>
  ({ ...state, cities: { ...state.cities, [cityId]: { ...state.cities[cityId], ...change } } })

/** Why the active faction cannot give domestic commands to a city now, or null */
export function commandProblem(state: GameState, cityId: CityId): string | null {
  if (state.phase !== 'strategy' || !state.activeFaction) return '手番ではありません'
  if (!state.cities[cityId] || ownerOf(state, cityId) !== state.activeFaction) return '自勢力の都市ではありません'
  return null
}

const check = (problem: string | null) => {
  if (problem) throw new GameRuleError(problem)
}

// ── Assignments ──

/** The assignment a knight holds in their city, or null */
export function assignmentOf(state: GameState, characterId: CharacterId): AssignmentRole | null {
  const cityId = state.characters[characterId]?.cityId
  const assignments = cityId ? state.cities[cityId]?.assignments : undefined
  if (assignments?.governor === characterId) return 'governor'
  if (assignments?.military.includes(characterId)) return 'military'
  return null
}

/** The assignments with a knight taken off theirs */
export function withoutAssignee(assignments: CityAssignments, characterId: CharacterId): CityAssignments {
  if (assignments.governor !== characterId && !assignments.military.includes(characterId)) return assignments
  return {
    ...(assignments.governor !== characterId && { governor: assignments.governor }),
    military: assignments.military.filter((id) => id !== characterId),
  }
}

export function assignmentProblem(state: GameState, cityId: CityId, characterId: CharacterId, role: AssignmentRole): string | null {
  const problem = commandProblem(state, cityId)
  if (problem) return problem
  const character = state.characters[characterId]
  if (character?.cityId !== cityId || character.factionId !== ownerOf(state, cityId)) return `${characterId} はこの都市の騎士ではありません`
  if (orderOf(state, characterId)) return '出撃予約中です'
  if (assignmentOf(state, characterId) === role) return role === 'governor' ? 'すでに代官です' : 'すでに軍事担当です'
  return null
}

/**
 * Assigns a knight of the city to a role, taking them off the one they held.
 * A new governor replaces the one before, who is left without an assignment
 */
export function assign(state: GameState, cityId: CityId, characterId: CharacterId, role: AssignmentRole): GameState {
  check(assignmentProblem(state, cityId, characterId, role))
  const rest = withoutAssignee(state.cities[cityId].assignments, characterId)
  const assignments: CityAssignments = role === 'governor'
    ? { governor: characterId, military: rest.military }
    : { ...rest, military: [...rest.military, characterId] }
  return withCity(state, cityId, { assignments })
}

/** Takes a knight of the city off their assignment (nothing changes if they hold none) */
export function unassign(state: GameState, cityId: CityId, characterId: CharacterId): GameState {
  check(commandProblem(state, cityId))
  const assignments = withoutAssignee(state.cities[cityId].assignments, characterId)
  return assignments === state.cities[cityId].assignments ? state : withCity(state, cityId, { assignments })
}

// ── Construction ──

/** Why a building cannot be started in the city now, or null (the command's checks too) */
export function buildingProblem(state: GameState, cityId: CityId, buildingId: string): string | null {
  const building = BUILDING_MAP[buildingId]
  if (!building) return `${buildingId} は施設ではありません`
  const city = state.cities[cityId]
  if (!city) return '都市がありません'
  if (city.buildings.includes(buildingId)) return 'すでに建っています'
  const upgraded = upgradesOf(buildingId).find((id) => city.buildings.includes(id))
  if (upgraded) return `${BUILDING_MAP[upgraded].name}が建っています`
  const tags = CITY_MAP[cityId]?.tags ?? []
  if (building.requiredTags && !building.requiredTags.some((tag) => tags.includes(tag))) {
    return `${building.requiredTags.join('・')}の都市で建てられます`
  }
  if (building.requiredRelic) return `遺物「${building.requiredRelic}」が必要です`
  // An upgrade is built over the building it replaces, taking no slot of its own
  if (building.upgradeFrom) {
    return city.buildings.includes(building.upgradeFrom) ? null : `${BUILDING_MAP[building.upgradeFrom]?.name ?? building.upgradeFrom}がある都市で建てられます`
  }
  if (city.buildings.length >= cityOutput(state, cityId).slots) return '施設の空きがありません'
  return null
}

export function constructionProblem(state: GameState, cityId: CityId, buildingId: string): string | null {
  const problem = commandProblem(state, cityId) ?? buildingProblem(state, cityId, buildingId)
  if (problem) return problem
  if (state.cities[cityId].construction) return 'ほかの施設を建設中です'
  if ((state.gold[state.activeFaction!] ?? 0) < BUILDING_MAP[buildingId].gold) return '金が足りません'
  return null
}

/** Starts building in the city, paying the building's gold; the city's 生産 goes into it from the next turn */
export function startConstruction(state: GameState, cityId: CityId, buildingId: string): GameState {
  check(constructionProblem(state, cityId, buildingId))
  const building = BUILDING_MAP[buildingId]
  const factionId = state.activeFaction!
  const next = withCity(state, cityId, {
    construction: { buildingId, requiredSupplies: building.supplies, investedSupplies: 0 },
  })
  return { ...next, gold: { ...state.gold, [factionId]: state.gold[factionId] - building.gold } }
}

/** Gives up the building under construction; half of the supplies put into it return to the city's store */
export function cancelConstruction(state: GameState, cityId: CityId): GameState {
  check(commandProblem(state, cityId))
  const city = state.cities[cityId]
  if (!city.construction) return state
  const refund = Math.floor(city.construction.investedSupplies / 2)
  return withCity(state, cityId, {
    construction: null,
    storedSupplies: city.storedSupplies + refund,
  })
}

/** Pauses or resumes the building under construction; while paused, the city's 生産 goes into its store */
export function pauseConstruction(state: GameState, cityId: CityId, paused = true): GameState {
  check(commandProblem(state, cityId))
  const construction = state.cities[cityId].construction
  if (!construction) return state
  return withCity(state, cityId, { construction: { ...construction, paused } })
}

/** Demolishes a standing building in the city */
export function demolishBuilding(state: GameState, cityId: CityId, buildingId: string): GameState {
  check(commandProblem(state, cityId))
  const buildings = state.cities[cityId].buildings
  if (!buildings.includes(buildingId)) return state
  return withCity(state, cityId, { buildings: buildings.filter((id) => id !== buildingId) })
}

/**
 * Turns until a building is completed at the city's effective 生産: the one
 * under construction, or `buildingId` if it were started now. null when the city produces nothing
 */
export function constructionTurns(state: GameState, cityId: CityId, buildingId?: string): number | null {
  const { production } = cityOutput(state, cityId)
  const construction = state.cities[cityId]?.construction
  const left = buildingId === undefined || construction?.buildingId === buildingId
    ? (construction ? construction.requiredSupplies - construction.investedSupplies : 0)
    : (BUILDING_MAP[buildingId]?.supplies ?? 0)
  if (left <= 0) return 0
  return production > 0 ? Math.ceil(left / production) : null
}

// ── Recruiting ──

export const recruitCost = (soldiers: number) => Math.ceil(soldiers * RECRUIT_GOLD)

/** Soldiers the city can still recruit this turn */
export function recruitLeft(state: GameState, cityId: CityId): number {
  return Math.max(0, cityOutput(state, cityId).recruitCap - (state.cities[cityId]?.recruited ?? 0))
}

/** Most soldiers the city can recruit now: what is left of this turn's, as many as its faction can pay for */
export function maxRecruit(state: GameState, cityId: CityId): number {
  const gold = state.gold[ownerOf(state, cityId) ?? ''] ?? 0
  let soldiers = Math.min(recruitLeft(state, cityId), Math.floor(gold / RECRUIT_GOLD))
  while (soldiers > 0 && recruitCost(soldiers) > gold) soldiers--
  return soldiers
}

export function recruitProblem(state: GameState, cityId: CityId, soldiers: number): string | null {
  const problem = commandProblem(state, cityId)
  if (problem) return problem
  if (!Number.isInteger(soldiers) || soldiers <= 0) return '兵数を選んでください'
  if (soldiers > recruitLeft(state, cityId)) return 'このターンに募兵できる数を超えています'
  if (recruitCost(soldiers) > (state.gold[state.activeFaction!] ?? 0)) return '金が足りません'
  return null
}

/** Recruits soldiers in the city for gold; they come in at the recruits' morale, lowering the city's */
export function recruit(state: GameState, cityId: CityId, soldiers: number): GameState {
  check(recruitProblem(state, cityId, soldiers))
  const city = state.cities[cityId]
  const factionId = state.activeFaction!
  const next = withCity(state, cityId, {
    troops: city.troops + soldiers,
    troopMorale: mixMorale(city.troops, city.troopMorale, soldiers, cityOutput(state, cityId).recruitMorale),
    recruited: city.recruited + soldiers,
  })
  return { ...next, gold: { ...state.gold, [factionId]: state.gold[factionId] - recruitCost(soldiers) } }
}

// ── Transport ──

export interface Cargo {
  troops?: number
  supplies?: number
}

/** Whether `to` can be reached from `from` along roads through the faction's own cities */
export function connectedByOwnRoads(state: GameState, factionId: FactionId, from: CityId, to: CityId): boolean {
  const seen = new Set([from])
  const queue = [from]
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    if (id === to) return true
    for (const next of neighbours(id)) {
      if (seen.has(next) || ownerOf(state, next) !== factionId) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return false
}

export function transportProblem(state: GameState, from: CityId, to: CityId, { troops = 0, supplies = 0 }: Cargo): string | null {
  const problem = commandProblem(state, from)
  if (problem) return problem
  if (from === to) return '同じ都市です'
  if (ownerOf(state, to) !== state.activeFaction || !state.cities[to]) return '輸送先が自勢力の都市ではありません'
  if (!connectedByOwnRoads(state, state.activeFaction!, from, to)) return '自勢力の街道でつながっていません'
  if (![troops, supplies].every((n) => Number.isInteger(n) && n >= 0)) return '数が正しくありません'
  if (troops === 0 && supplies === 0) return '輸送するものを選んでください'
  if (troops > soldiersLeft(state, from)) return '兵が足りません'
  if (supplies > state.cities[from].storedSupplies) return '物資が足りません'
  return null
}

/**
 * Moves soldiers and supplies at once to a city of the faction joined by its
 * own roads (taking turns comes with the transport screen). The soldiers'
 * morale mixes with the city's they join
 */
export function transport(state: GameState, from: CityId, to: CityId, cargo: Cargo): GameState {
  check(transportProblem(state, from, to, cargo))
  const { troops = 0, supplies = 0 } = cargo
  const source = state.cities[from]
  const target = state.cities[to]
  const moved = withCity(state, from, { troops: source.troops - troops, storedSupplies: source.storedSupplies - supplies })
  return withCity(moved, to, {
    troops: target.troops + troops,
    troopMorale: mixMorale(target.troops, target.troopMorale, troops, source.troopMorale),
    storedSupplies: target.storedSupplies + supplies,
  })
}
