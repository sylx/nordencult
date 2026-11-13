import { CHARACTER_MAP } from '../data/character'
import { isMercenary, mixMorale } from './army'
import { assignmentLabel, assignmentOf, successorLord, withGovernor, withoutAssignee } from './economy/domestic'
import { GameRuleError } from './errors'
import {
  availableKnights, availablePrisoners, citiesOf, engagementOf, isPrisoner, nearestCity, ownerOf, prisonerMovementOf, prisonerOrderOf, soldiersLeft,
  stationedIn, suppliesLeft,
} from './queries'
import { releaseEquipment } from './relics/equipment'
import { wanderer } from './roaming'
import type { CharacterId, CharacterState, CityId, CityState, FactionId, GameState, MoveLeg, MoveOrder, Movement, MovementKind, TransportOrder } from './types'
import { neighbours } from './world'

/**
 * Moves (移動): knights going from a city of their faction to another, with soldiers and supplies or alone (単騎移動).
 * Ordered in the strategy phase, they set out at the start of the progress phase and go a month's way in each
 * progress phase, before the battles: knights arriving defend their new city in that month's battles.
 * On the way the knights still serve in the city they set out from (listed there, but away: they do not defend it
 * and cannot be given orders), until they get where they are going.
 * Transports (輸送) go the same way as a move with soldiers and supplies: a knight takes them to another city of
 * the faction, unloads them there and rides back alone (as 単騎移動) to the city they set out from.
 * Both take prisoners held in the city along as they take soldiers and supplies (not riding alone): the prisoners
 * are held in the city they set out from until they get there.
 */

/** A move with soldiers and supplies goes this many cities a month (half a month a road) */
export const MOVE_HOPS_PER_MONTH = 2
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

/** Why the prisoners cannot be taken along from `from` this turn, or null when they can */
function prisonersProblem(state: GameState, from: CityId, prisoners: readonly CharacterId[]): string | null {
  if (new Set(prisoners).size !== prisoners.length) return '同じ捕虜が重複しています'
  for (const id of prisoners) {
    if (!isPrisoner(state, id) || state.characters[id].cityId !== from) return `${id} は出発拠点の捕虜ではありません`
    if (prisonerMovementOf(state, id)) return `${id} は移送中です`
    if (prisonerOrderOf(state, id)) return `${id} はすでに移送を予約しています`
  }
  return null
}

/** Why a move cannot be ordered now, or null when it can */
export function moveOrderProblem(state: GameState, draft: Omit<MoveOrder, 'id'>): string | null {
  const { factionId, from, to, knights, troops, supplies, solo, prisoners = [] } = draft
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
    const engaged = engagementOf(state, id)
    if (engaged) return `${id} は${engaged}です`
  }
  if (![troops, supplies].every((n) => Number.isInteger(n) && n >= 0)) return '数が正しくありません'
  if (solo && knights.some(isMercenary)) return '傭兵は単騎移動できません'
  if (solo && (troops > 0 || supplies > 0)) return '単騎移動では兵と物資を運べません'
  if (solo && prisoners.length > 0) return '単騎移動では捕虜を連れて行けません'
  if (troops > soldiersLeft(state, from)) return '兵が足りません'
  if (supplies > suppliesLeft(state, from)) return '物資が足りません'
  return prisonersProblem(state, from, prisoners)
}

/** Adds a move to this turn's orders */
export function addMoveOrder(state: GameState, draft: Omit<MoveOrder, 'id'>): GameState {
  const problem = moveOrderProblem(state, draft)
  if (problem) throw new GameRuleError(problem)
  const order: MoveOrder = {
    ...draft, knights: [...draft.knights], ...(draft.prisoners && draft.prisoners.length > 0 && { prisoners: [...draft.prisoners] }), id: `move-${state.serial}`,
  }
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

/**
 * What keeps a knight from taking a transport now: what keeps them from any order (engagementOf), or their officer
 * role (e.g. 商業担当官: an officer stays at their work); null when they can. A lord may go, staying the lord
 */
export function transportKnightProblem(state: GameState, characterId: CharacterId): string | null {
  const role = assignmentOf(state, characterId)
  return engagementOf(state, characterId) ?? (role && role !== 'governor' ? assignmentLabel(role) : null)
}

/** Knights in a city who can take a transport now */
export const transportKnights = (state: GameState, cityId: CityId): CharacterId[] =>
  stationedIn(state, cityId).filter((id) => !transportKnightProblem(state, id))

/** Why the active faction cannot start a transport from the city, or null when it can */
export function transportFromProblem(state: GameState, cityId: CityId): string | null {
  if (state.phase !== 'strategy' || !state.activeFaction) return '手番ではありません'
  if (ownerOf(state, cityId) !== state.activeFaction) return '自勢力の都市ではありません'
  if (transportKnights(state, cityId).length === 0) return '輸送を担当できる騎士がいません'
  if (soldiersLeft(state, cityId) <= 0 && suppliesLeft(state, cityId) <= 0 && availablePrisoners(state, cityId).length === 0) {
    return '輸送できる兵も物資もありません'
  }
  if (moveTargets(state, cityId).length === 0) return '輸送できる自勢力の都市がありません'
  return null
}

/** Why a transport cannot be ordered now, or null when it can */
export function transportOrderProblem(state: GameState, draft: Omit<TransportOrder, 'id'>): string | null {
  const { factionId, from, to, knight, troops, supplies, prisoners = [] } = draft
  if (state.phase !== 'strategy' || state.activeFaction !== factionId) return '手番ではありません'
  if (ownerOf(state, from) !== factionId) return '出発拠点が自勢力の都市ではありません'
  if (from === to) return '出発拠点と同じ都市です'
  if (ownerOf(state, to) !== factionId) return '輸送先が自勢力の都市ではありません'
  if (!moveRoute(state, factionId, from, to)) return '輸送先へ街道がつながっていません'
  if (!knight) return '担当の騎士を選んでください'
  const character = state.characters[knight]
  if (!character || character.cityId !== from || character.factionId !== factionId) return `${knight} は出発拠点の騎士ではありません`
  const unable = transportKnightProblem(state, knight)
  if (unable) return `${knight} は${unable}です`
  if (![troops, supplies].every((n) => Number.isInteger(n) && n >= 0)) return '数が正しくありません'
  if (troops === 0 && supplies === 0 && prisoners.length === 0) return '輸送するものを選んでください'
  if (troops > soldiersLeft(state, from)) return '兵が足りません'
  if (supplies > suppliesLeft(state, from)) return '物資が足りません'
  return prisonersProblem(state, from, prisoners)
}

/** Adds a transport to this turn's orders */
export function addTransportOrder(state: GameState, draft: Omit<TransportOrder, 'id'>): GameState {
  const problem = transportOrderProblem(state, draft)
  if (problem) throw new GameRuleError(problem)
  const order: TransportOrder = {
    ...draft, ...(draft.prisoners && draft.prisoners.length > 0 && { prisoners: [...draft.prisoners] }), id: `transport-${state.serial}`,
  }
  return { ...state, transportOrders: [...state.transportOrders, order], serial: state.serial + 1 }
}

/** Takes back a transport of the active faction during its strategy phase */
export function cancelTransportOrder(state: GameState, orderId: string): GameState {
  const order = state.transportOrders.find((o) => o.id === orderId)
  if (!order) return state
  if (state.phase !== 'strategy' || state.activeFaction !== order.factionId) {
    throw new GameRuleError('手番でない勢力の予約は取り消せません')
  }
  return { ...state, transportOrders: state.transportOrders.filter((o) => o.id !== orderId) }
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

/**
 * A transport's knight riding back alone from where they unloaded to the city they set out from; null when they
 * unloaded there (or the roads do not lead back): they stay
 */
function returnOf(state: GameState, transport: Movement): Movement | null {
  const route = moveRoute(state, transport.factionId, transport.to, transport.from)
  if (!route || route.length < 2) return null
  // Unloaded: no soldiers, supplies or prisoners
  const { id, factionId, knights, troopMorale } = transport
  return {
    id, kind: 'return', factionId, from: transport.to, to: transport.from, knights, troops: 0, supplies: 0, solo: true, troopMorale,
    route, monthsLeft: moveMonths(route.length - 1, true),
  }
}

/**
 * A prisoner set free (escaping, or let go) at `at`: riding alone (as 単騎移動) to the nearest city of their
 * faction, serving nowhere on the way (an 'escape' movement, `id`); straight into it when `at` is one. 放浪 from `at`
 * when the faction has no city left
 */
export function escapeOf(state: GameState, characterId: CharacterId, at: CityId, id: string): { character: CharacterState; movement: Movement | null } {
  const factionId = state.characters[characterId]?.factionId
  const to = factionId ? nearestCity(state, factionId, at) : null
  const route = factionId && to ? moveRoute(state, factionId, at, to) : null
  if (!factionId || !to || !route) return { character: wanderer(at), movement: null }
  if (route.length < 2) return { character: { cityId: to, factionId }, movement: null }
  return {
    character: { cityId: null, factionId },
    movement: {
      id, kind: 'escape', factionId, from: at, to, knights: [characterId], troops: 0, supplies: 0, solo: true, troopMorale: 0,
      route, monthsLeft: moveMonths(route.length - 1, true),
    },
  }
}

/**
 * Movements of the orders of this turn still possible (moves, then transports), as they set out: their knights
 * still in the city they leave. Knights moving away leave their assignments there, and a lord moving away is
 * followed by another (successorLord); a transport's knight keeps theirs, serving there all the while
 */
function setOut(state: GameState, random: () => number = Math.random): { state: GameState; movements: Movement[] } {
  const characters: Record<string, CharacterState> = { ...state.characters }
  const cities: Record<string, CityState> = { ...state.cities }
  const movements: Movement[] = []
  /** Cities whose lord moves away */
  const lordless = new Set<CityId>()
  const transports = state.transportOrders.map(({ knight, ...order }): [MoveOrder, MovementKind] => [{ ...order, knights: [knight], solo: false }, 'transport'])
  for (const [{ prisoners: ordered = [], ...order }, kind] of [...state.moveOrders.map((o): [MoveOrder, MovementKind] => [o, 'move']), ...transports]) {
    const { factionId, from, to } = order
    if (ownerOf(state, from) !== factionId) continue
    const knights = order.knights.filter((id) => characters[id]?.cityId === from && characters[id].factionId === factionId && !characters[id].prisoner)
    // Prisoners still held there (they may have escaped)
    const prisoners = ordered.filter((id) => characters[id]?.prisoner && characters[id].cityId === from && !prisonerMovementOf(state, id))
    const route = moveRoute(state, factionId, from, to)
    if (knights.length === 0 || !route) continue
    const city = cities[from]
    const troops = Math.min(order.troops, city.troops)
    const supplies = Math.min(order.supplies, city.storedSupplies)
    let assignments = city.assignments
    if (kind === 'move') {
      for (const id of knights) {
        if (assignments.governor === id) lordless.add(from)
        assignments = withoutAssignee(assignments, id)
      }
    }
    cities[from] = { ...city, troops: city.troops - troops, storedSupplies: city.storedSupplies - supplies, assignments }
    movements.push({
      ...order, ...(kind !== 'move' && { kind }), knights, troops, supplies, ...(prisoners.length > 0 && { prisoners }),
      troopMorale: city.troopMorale, route, monthsLeft: moveMonths(route.length - 1, order.solo),
    })
  }
  // Not the lord: knights moving away now or on a move already (serving in the city they set out from until they
  // arrive), nor those on an invasion
  const excluded = new Set([
    ...[...state.movements, ...movements].flatMap((m) => (m.kind ? [] : m.knights)), ...state.orders.flatMap((o) => o.knights),
  ])
  for (const cityId of lordless) {
    cities[cityId] = { ...cities[cityId], assignments: withGovernor(cities[cityId].assignments, successorLord(state, cityId, excluded, random)) }
  }
  return { state: { ...state, characters, cities, moveOrders: [], transportOrders: [] }, movements }
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
    return [{
      id: m.id, ...(m.kind && { kind: m.kind }), factionId: m.factionId, from: m.from, solo: m.solo, knights: m.knights, route: leg, to: next.to,
      arrives: next.monthsLeft === 0, ...(m.prisoners && { prisoners: m.prisoners }),
    }]
  })
}

/**
 * The moves of a progress phase, before its battles: the moves and transports ordered this turn set out (setOut:
 * the knights moving away leave their assignments in their city but still serve there until they arrive, a lord
 * moving away is followed by another, their soldiers and supplies are taken from it), then every
 * movement goes a month's way. Those arriving join their city: the knights serve there (the head of the faction,
 * 君主, moving in becomes its lord in place of the one there), the soldiers join its own (their morale mixing) and
 * the supplies its store, the prisoners it takes along are held there. A transport's knight does not stay: they ride back alone
 * to the city they set out from (serving there all the while), from the next month (returnOf). A movement whose city was lost heads for the
 * faction's nearest city instead; when the faction has no city left, its knights take to wandering (放浪) from where
 * they are, its soldiers and supplies are lost and its prisoners are set free (escapeOf).
 */
export function runMovements(state: GameState, random: () => number = Math.random): GameState {
  const { state: departed, movements: setOff } = setOut(state, random)
  const characters: Record<string, CharacterState> = { ...departed.characters }
  const cities: Record<string, CityState> = { ...departed.cities }
  const movements: Movement[] = []
  let serial = departed.serial
  for (const m of [...departed.movements, ...setOff]) {
    const movement = heading(departed, m)
    if (!movement) {
      for (const id of m.knights) characters[id] = wanderer(m.route[0])
      for (const id of m.prisoners ?? []) {
        const escape = escapeOf(departed, id, m.route[0], `escape-${serial++}`)
        characters[id] = escape.character
        if (escape.movement) movements.push(escape.movement)
      }
      continue
    }
    const { next } = monthOf(movement)
    if (next.monthsLeft > 0) {
      movements.push(next)
      continue
    }
    const city = cities[next.to]
    cities[next.to] = {
      ...city,
      troops: city.troops + next.troops,
      troopMorale: mixMorale(city.troops, city.troopMorale, next.troops, next.troopMorale),
      storedSupplies: city.storedSupplies + next.supplies,
    }
    for (const id of next.prisoners ?? []) characters[id] = { ...characters[id], cityId: next.to }
    const back = next.kind === 'transport' ? returnOf(departed, next) : null
    if (back) movements.push(back)
    else for (const id of next.knights) characters[id] = { ...characters[id], cityId: next.to }
    // The head of the faction (君主) moving in (or escaping back) becomes the lord of the city
    const head = next.kind && next.kind !== 'escape'
      ? undefined : next.knights.find((id) => CHARACTER_MAP[id]?.isPatriarch && characters[id].factionId === next.factionId)
    if (head) cities[next.to] = { ...cities[next.to], assignments: withGovernor(cities[next.to].assignments, head) }
  }
  // Knights wandering off take off what they wear
  return releaseEquipment({
    ...departed, characters, cities, movements, serial,
    ...(departed.march && { march: { ...departed.march, moved: true } }),
  })
}
