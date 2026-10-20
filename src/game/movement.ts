import { mixMorale } from './army'
import { withoutAssignee } from './economy/domestic'
import { GameRuleError } from './errors'
import { availableKnights, citiesOf, moveOrderOf, orderOf, ownerOf, soldiersLeft, suppliesLeft } from './queries'
import type { CharacterState, CityId, CityState, FactionId, GameState, MoveLeg, MoveOrder, Movement } from './types'
import { neighbours } from './world'

/**
 * Moves (移動): knights going from a city of their faction to another, with soldiers and supplies or alone (単騎移動).
 * Ordered in the strategy phase, they set out at the start of the progress phase and go a month's way in each
 * progress phase, before the battles: knights arriving defend their new city in that month's battles.
 */

/** A move with soldiers takes a month for each city along the roads */
export const MOVE_HOPS_PER_MONTH = 1
/** Riding alone goes this many cities a month, and takes SOLO_MAX_MONTHS at most however far it goes */
export const SOLO_HOPS_PER_MONTH = 2
export const SOLO_MAX_MONTHS = 2

/** Months a move of `hops` roads takes */
export function moveMonths(hops: number, solo: boolean): number {
  if (hops <= 0) return 0
  return solo
    ? Math.min(SOLO_MAX_MONTHS, Math.ceil(hops / SOLO_HOPS_PER_MONTH))
    : Math.ceil(hops / MOVE_HOPS_PER_MONTH)
}

/** The shortest route along the roads (both ends included) whose cities in between are `passable`; null when there is none */
function shortestRoute(from: CityId, to: CityId, passable: (id: CityId) => boolean): CityId[] | null {
  const previous = new Map<CityId, CityId | null>([[from, null]])
  const queue = [from]
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    if (id === to) {
      const route: CityId[] = []
      for (let at: CityId | null = to; at !== null; at = previous.get(at) ?? null) route.unshift(at)
      return route
    }
    if (id !== from && !passable(id)) continue
    for (const next of neighbours(id)) {
      if (previous.has(next)) continue
      previous.set(next, id)
      queue.push(next)
    }
  }
  return null
}

/**
 * The route a faction's move takes from `from` to `to` (both included): the shortest through its own cities,
 * or else the shortest through any; null when the roads do not join them
 */
export function moveRoute(state: GameState, factionId: FactionId, from: CityId, to: CityId): CityId[] | null {
  return shortestRoute(from, to, (id) => ownerOf(state, id) === factionId) ?? shortestRoute(from, to, () => true)
}

/** Cities a faction's knights can move to from a city: every other city of its own the roads lead to */
export function moveTargets(state: GameState, from: CityId): CityId[] {
  const factionId = ownerOf(state, from)
  if (!factionId) return []
  return citiesOf(state, factionId).filter((id) => id !== from && moveRoute(state, factionId, from, id) !== null)
}

/** Why the active faction cannot start a move from the city, or null when it can */
export function moveFromProblem(state: GameState, cityId: CityId): string | null {
  if (state.phase !== 'strategy' || !state.activeFaction) return '手番ではありません'
  if (ownerOf(state, cityId) !== state.activeFaction) return '自勢力の都市ではありません'
  if (availableKnights(state, cityId).length === 0) return '移動できる騎士がいません'
  if (moveTargets(state, cityId).length === 0) return '移動できる自勢力の都市がありません'
  return null
}

/** Why a move cannot be ordered now, or null when it can */
export function moveOrderProblem(state: GameState, draft: Omit<MoveOrder, 'id'>): string | null {
  const { factionId, from, to, knights, troops, supplies, solo } = draft
  if (state.phase !== 'strategy' || state.activeFaction !== factionId) return '手番ではありません'
  if (ownerOf(state, from) !== factionId) return '出発拠点が自勢力の都市ではありません'
  if (from === to) return '出発拠点と同じ都市です'
  if (ownerOf(state, to) !== factionId) return '移動先が自勢力の都市ではありません'
  if (!moveRoute(state, factionId, from, to)) return '移動先へ街道がつながっていません'
  if (knights.length === 0) return '騎士を1人以上選んでください'
  if (new Set(knights).size !== knights.length) return '同じ騎士が重複しています'
  for (const id of knights) {
    const character = state.characters[id]
    if (!character || character.cityId !== from || character.factionId !== factionId) return `${id} は出発拠点の騎士ではありません`
    if (orderOf(state, id)) return `${id} は侵攻を予約しています`
    if (moveOrderOf(state, id)) return `${id} はすでに移動を予約しています`
  }
  if (![troops, supplies].every((n) => Number.isInteger(n) && n >= 0)) return '数が正しくありません'
  if (solo && (troops > 0 || supplies > 0)) return '単騎移動では兵と物資を運べません'
  if (troops > soldiersLeft(state, from)) return '兵が足りません'
  if (supplies > suppliesLeft(state, from)) return '物資が足りません'
  return null
}

/** Adds a move to this turn's orders */
export function addMoveOrder(state: GameState, draft: Omit<MoveOrder, 'id'>): GameState {
  const problem = moveOrderProblem(state, draft)
  if (problem) throw new GameRuleError(problem)
  const order: MoveOrder = { ...draft, knights: [...draft.knights], id: `move-${state.serial}` }
  return { ...state, moveOrders: [...state.moveOrders, order], serial: state.serial + 1 }
}

/** Takes back a move of the active faction during its strategy phase */
export function cancelMoveOrder(state: GameState, orderId: string): GameState {
  const order = state.moveOrders.find((o) => o.id === orderId)
  if (!order) return state
  if (state.phase !== 'strategy' || state.activeFaction !== order.factionId) {
    throw new GameRuleError('手番でない勢力の予約は取り消せません')
  }
  return { ...state, moveOrders: state.moveOrders.filter((o) => o.id !== orderId) }
}

/** The faction's city nearest to `from` along the roads (`from` itself when it is one), or null when it has none */
function nearestCity(state: GameState, factionId: FactionId, from: CityId): CityId | null {
  const seen = new Set([from])
  const queue = [from]
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    if (ownerOf(state, id) === factionId) return id
    for (const next of neighbours(id)) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return null
}

/**
 * A movement heading for a city its faction still holds: when the city it set out for was lost, it heads for
 * the faction's city nearest to where it is instead. null when the faction has no city left
 */
function heading(state: GameState, movement: Movement): Movement | null {
  if (ownerOf(state, movement.to) === movement.factionId) return movement
  const here = movement.route[0]
  const to = nearestCity(state, movement.factionId, here)
  const route = to && moveRoute(state, movement.factionId, here, to)
  if (!to || !route) return null
  return { ...movement, to, route, monthsLeft: moveMonths(route.length - 1, movement.solo) }
}

/** A month of a movement: the cities it passes and where it is after it */
function monthOf(movement: Movement): { leg: CityId[]; next: Movement } {
  const { route, monthsLeft } = movement
  const hops = monthsLeft > 0 ? Math.ceil((route.length - 1) / monthsLeft) : route.length - 1
  return {
    leg: route.slice(0, hops + 1),
    next: { ...movement, route: route.slice(hops), monthsLeft: Math.max(0, monthsLeft - 1) },
  }
}

/** Movements of the orders of this turn still possible, as they set out: their knights still in the city they leave */
function setOut(state: GameState): { state: GameState; movements: Movement[] } {
  const characters: Record<string, CharacterState> = { ...state.characters }
  const cities: Record<string, CityState> = { ...state.cities }
  const movements: Movement[] = []
  for (const order of state.moveOrders) {
    const { factionId, from, to } = order
    if (ownerOf(state, from) !== factionId) continue
    const knights = order.knights.filter((id) => characters[id]?.cityId === from && characters[id].factionId === factionId)
    const route = moveRoute(state, factionId, from, to)
    if (knights.length === 0 || !route) continue
    const city = cities[from]
    const troops = Math.min(order.troops, city.troops)
    const supplies = Math.min(order.supplies, city.storedSupplies)
    let assignments = city.assignments
    for (const id of knights) {
      assignments = withoutAssignee(assignments, id)
      characters[id] = { ...characters[id], cityId: null }
    }
    cities[from] = { ...city, troops: city.troops - troops, storedSupplies: city.storedSupplies - supplies, assignments }
    movements.push({
      ...order, knights, troops, supplies, troopMorale: city.troopMorale, route, monthsLeft: moveMonths(route.length - 1, order.solo),
    })
  }
  return { state: { ...state, characters, cities, moveOrders: [] }, movements }
}

/**
 * What the moves of this progress phase do (runMovements), for showing them before they are made: the moves
 * ordered this turn setting out and every movement going a month's way, those arriving included
 */
export function movementLegs(state: GameState): MoveLeg[] {
  const { state: departed, movements } = setOut(state)
  return [...departed.movements, ...movements].flatMap((m) => {
    const movement = heading(departed, m)
    if (!movement) return []
    const { leg, next } = monthOf(movement)
    return [{ id: m.id, factionId: m.factionId, solo: m.solo, knights: m.knights, route: leg, to: next.to, arrives: next.monthsLeft === 0 }]
  })
}

/**
 * The moves of a progress phase, before its battles: the moves ordered this turn set out (their knights
 * leave their city and their assignments there, their soldiers and supplies are taken from it), then every
 * movement goes a month's way. Those arriving join their city: the knights serve there, the soldiers join its
 * own (their morale mixing) and the supplies its store. A movement whose city was lost heads for the
 * faction's nearest city instead; when the faction has no city left, its knights become unaffiliated
 * and its soldiers and supplies are lost.
 */
export function runMovements(state: GameState): GameState {
  const { state: departed, movements: setOff } = setOut(state)
  const characters: Record<string, CharacterState> = { ...departed.characters }
  const cities: Record<string, CityState> = { ...departed.cities }
  const movements: Movement[] = []
  for (const m of [...departed.movements, ...setOff]) {
    const movement = heading(departed, m)
    if (!movement) {
      for (const id of m.knights) characters[id] = { cityId: null, factionId: null }
      continue
    }
    const { next } = monthOf(movement)
    if (next.monthsLeft > 0) {
      movements.push(next)
      continue
    }
    for (const id of next.knights) characters[id] = { ...characters[id], cityId: next.to }
    const city = cities[next.to]
    cities[next.to] = {
      ...city,
      troops: city.troops + next.troops,
      troopMorale: mixMorale(city.troops, city.troopMorale, next.troops, next.troopMorale),
      storedSupplies: city.storedSupplies + next.supplies,
    }
  }
  return {
    ...departed, characters, cities, movements,
    ...(departed.march && { march: { ...departed.march, moved: true } }),
  }
}
