import { MAX_SOLDIERS, defaultUnitType, mixMorale } from './army'
import { defenderArmy } from './defense'
import { successorLord, withGovernor, withoutAssignee } from './economy/domestic'
import { runEconomy } from './economy/runEconomy'
import { GameRuleError } from './errors'
import { runMovements } from './movement'
import {
  commandRank, defenseProblem, isPlayerFaction, leadingKnight, movementOf, orderProblem, ownerOf, retreatCities, stationedIn, turnOrder,
} from './queries'
import type {
  ArmyUnit, Battle, BattleEndReason, BattleReport, BattleRetreat, BattleSide, BattleSurvivor, BattleWinner, BattleWipeout, CharacterId,
  CharacterMove, CharacterState, CityId, CityState, DefenseDraft, Entry, GameState, GovernorAppointment, InvasionOrder, SoldierReturn,
} from './types'
import { neighbours } from './world'

export { GameRuleError }

/** Adds an invasion to this turn's orders */
export function addOrder(state: GameState, draft: Omit<InvasionOrder, 'id'>): GameState {
  const problem = orderProblem(state, draft)
  if (problem) throw new GameRuleError(problem)
  const order: InvasionOrder = {
    ...draft, knights: [...draft.knights], ...(draft.units && { units: draft.units.map((u) => ({ ...u })) }),
    id: `order-${state.serial}`,
  }
  return { ...state, orders: [...state.orders, order], serial: state.serial + 1 }
}

/** Takes back an order of the active faction during its strategy phase */
export function cancelOrder(state: GameState, orderId: string): GameState {
  const order = state.orders.find((o) => o.id === orderId)
  if (!order) return state
  if (state.phase !== 'strategy' || state.activeFaction !== order.factionId) {
    throw new GameRuleError('手番でない勢力の予約は取り消せません')
  }
  return { ...state, orders: state.orders.filter((o) => o.id !== orderId) }
}

/**
 * The active faction ends its strategy phase: the next faction plays, or
 * after the last one the progress phase (進行フェーズ, 'march') starts with every
 * order queued in the factions' turn order (by 国力), each faction's in the order they were made.
 * Its moves come first (the move part: runMovements), then the invasions one by one (the invasion part).
 */
export function endFactionTurn(state: GameState): GameState {
  if (state.phase !== 'strategy' || !state.activeFaction) throw new GameRuleError('戦略フェーズではありません')
  const order = turnOrder(state)
  const next = order[order.indexOf(state.activeFaction) + 1]
  if (next) return { ...state, activeFaction: next }
  const rank = (factionId: string) => order.indexOf(factionId)
  // Stable sort: one faction's orders keep the order they were made in
  const queue = [...state.orders].sort((a, b) => rank(a.factionId) - rank(b.factionId)).map((o) => o.id)
  return {
    ...state, phase: 'march', activeFaction: null,
    march: { moved: false, queue, owners: state.cityOwners, current: null, entry: null, decision: null, confirmed: [] },
  }
}

/**
 * In the progress phase with nothing under way: makes the moves if they are
 * not made yet (the move part: runMovements), then takes the next order of the invasion part:
 * - Orders no longer possible (the city it set out from was lost, its knights are gone) are skipped; the knights
 *   stay where they are.
 * - The target was taken by the faction earlier in the invasion part (another of its invasions): the army marches
 *   into it, as a move does (entry, then finishEntry). The city keeps its lord.
 * - The target was taken by another faction earlier in the invasion part: a faction the player plays chooses
 *   whether to go on (decision, then decideInvasion); others go on.
 * - Otherwise its battle is created (the march to it is shown, then it is fought). The invasions still to come
 *   from the city attacked are called off: their knights are there and defend it. A city without its lord there
 *   (a neutral city has none) or without soldiers is taken without a battle (undefended). Another faction
 *   defends with an army of its own (defenderArmy); a faction the player plays forms it (pendingDefense, then
 *   formDefense). The soldiers of each army are taken from its city.
 * The army's soldiers are taken from the city it sets out from (as many as it has left), entering or invading.
 * With no order left the next turn starts. Does nothing while a battle, an entry or a decision is under way, so
 * calling it twice is harmless.
 * A lord setting out on the invasion is followed by another in their city (setOutLord), as one moving away is.
 */
export function startNextBattle(state: GameState, random: () => number = Math.random): GameState {
  if (state.phase !== 'march' || !state.march) throw new GameRuleError('進行フェーズではありません')
  if (state.march.current || state.march.entry || state.march.decision) return state
  if (!state.march.moved) state = runMovements(state, random)
  const march = state.march!
  const queue = [...march.queue]
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    const order = state.orders.find((o) => o.id === id)
    const army = order && armyOf(state, order)
    if (!order || !army) continue
    const { factionId, from, to } = order
    const { knights, units } = army
    const owner = ownerOf(state, to)
    if (owner === factionId) {
      const entry: Entry = {
        id: `entry-${state.serial}`, orderId: order.id, factionId, from, to, knights,
        soldiers: sumSoldiers(units), morale: state.cities[from].troopMorale,
      }
      const departed = withTroops(setOutLord(state, from, knights, queue, random), from, -entry.soldiers)
      return { ...departed, march: { ...march, moved: true, queue, entry }, serial: state.serial + 1 }
    }
    if (owner !== march.owners[to] && isPlayerFaction(state, factionId) && !march.confirmed.includes(order.id)) {
      return { ...state, march: { ...march, moved: true, queue: [order.id, ...queue], decision: order.id } }
    }
    const battle = createBattle(state, order, army)
    const left = queue.filter((q) => state.orders.find((o) => o.id === q)?.from !== to)
    let departed = withTroops(setOutLord(state, from, knights, left, random), from, -sumSoldiers(battle.attacker.units))
    departed = withTroops(departed, to, -sumSoldiers(battle.defender.units))
    return { ...departed, march: { ...march, moved: true, queue: left, current: battle }, serial: state.serial + 1 }
  }
  return startTurn(state)
}

/**
 * A faction the player plays forms the army defending the city of the battle under way (pendingDefense):
 * its soldiers are taken from the city's
 */
export function formDefense(state: GameState, battleId: string, draft: DefenseDraft): GameState {
  const battle = state.march?.current
  if (!state.march || !battle || battle.id !== battleId) throw new GameRuleError(`戦闘 ${battleId} は進行中ではありません`)
  const problem = defenseProblem(state, battle, draft)
  if (problem) throw new GameRuleError(problem)
  const units = draft.units.map((u) => ({ ...u }))
  const knights = units.flatMap((u) => (u.knightId === null ? [] : [u.knightId]))
  const defended: Battle = { ...battle, pendingDefense: false, defender: { ...battle.defender, knights, commander: draft.commander, units } }
  return { ...withTroops(state, battle.cityId, -sumSoldiers(units)), march: { ...state.march, current: defended } }
}

/**
 * The faction of the order waiting for a decision (its target taken by another faction earlier in the invasion
 * part) goes on with it (`goOn`: its battle comes next) or calls it off (its knights stay where they are)
 */
export function decideInvasion(state: GameState, orderId: string, goOn: boolean): GameState {
  const march = state.march
  if (!march || march.decision !== orderId) throw new GameRuleError(`侵攻 ${orderId} は判断を待っていません`)
  return {
    ...state,
    march: goOn
      ? { ...march, decision: null, confirmed: [...march.confirmed, orderId] }
      : { ...march, decision: null, queue: march.queue.filter((id) => id !== orderId) },
  }
}

/**
 * The army of the entry under way gets into the city of its faction: its knights serve there, as knights moving
 * there do (leaving their assignments in the city they set out from), and its soldiers join the city's. The city's lord stays
 */
export function finishEntry(state: GameState, entryId: string): GameState {
  const entry = state.march?.entry
  if (!state.march || !entry || entry.id !== entryId) throw new GameRuleError(`入城 ${entryId} は進行中ではありません`)
  const characters: Record<string, CharacterState> = { ...state.characters }
  let city = state.cities[entry.from]
  for (const id of entry.knights) {
    city = { ...city, assignments: withoutAssignee(city.assignments, id) }
    characters[id] = { ...characters[id], cityId: entry.to }
  }
  const entered = withTroops({ ...state, cities: { ...state.cities, [entry.from]: city } }, entry.to, entry.soldiers, entry.morale)
  return { ...entered, characters, march: { ...state.march, entry: null } }
}

/**
 * An invasion's army sets out: when the lord of the city it sets out from is among its knights, they are lord no
 * longer and another follows them (successorLord): not one of the army, nor of the invasions still to come, nor
 * one on a move
 */
function setOutLord(
  state: GameState, from: CityId, knights: readonly CharacterId[], queue: readonly string[], random: () => number,
): GameState {
  const city = state.cities[from]
  const lord = city.assignments.governor
  if (!lord || !knights.includes(lord)) return state
  const excluded = new Set([
    ...knights,
    ...state.orders.filter((o) => queue.includes(o.id)).flatMap((o) => o.knights),
    ...state.movements.flatMap((m) => (m.kind ? [] : m.knights)),
  ])
  const assignments = withGovernor(withoutAssignee(city.assignments, lord), successorLord(state, from, excluded, random))
  return { ...state, cities: { ...state.cities, [from]: { ...city, assignments } } }
}

const sumSoldiers = (units: readonly ArmyUnit[]) => units.reduce((sum, u) => sum + u.soldiers, 0)

/** `state` with `soldiers` added to (or, negative, taken from) a city's, those added at `morale` */
function withTroops(state: GameState, cityId: CityId, soldiers: number, morale = 0): GameState {
  const city = state.cities[cityId]
  if (!city || soldiers === 0) return state
  const troops = Math.max(0, city.troops + soldiers)
  const troopMorale = soldiers > 0 ? mixMorale(city.troops, city.troopMorale, soldiers, morale) : city.troopMorale
  return { ...state, cities: { ...state.cities, [cityId]: { ...city, troops, troopMorale } } }
}

/**
 * The army of an order as it sets out: its knights still in the city it sets out from and their units, the
 * soldiers as many as the city has left (in the order of the units). An order without units (none chosen) sends
 * each knight with their default unit type, as many soldiers as a unit holds. Knights left without soldiers stay.
 * null when no knight goes, or the city was lost
 */
function armyOf(state: GameState, order: InvasionOrder): { knights: CharacterId[]; units: ArmyUnit[] } | null {
  const { factionId, from } = order
  if (ownerOf(state, from) !== factionId) return null
  const present = order.knights.filter((id) => {
    const c = state.characters[id]
    return c?.cityId === from && c.factionId === factionId
  })
  let pool = state.cities[from]?.troops ?? 0
  const units = (order.units ?? present.map((id) => ({ knightId: id, unitType: defaultUnitType(id), soldiers: MAX_SOLDIERS })))
    .filter((u) => u.knightId === null || present.includes(u.knightId))
    .flatMap((u) => {
      const soldiers = Math.min(u.soldiers, pool)
      pool -= soldiers
      return soldiers > 0 ? [{ ...u, soldiers }] : []
    })
  const knights = present.filter((id) => units.some((u) => u.knightId === id))
  return knights.length > 0 ? { knights, units } : null
}

function createBattle(state: GameState, order: InvasionOrder, army: { knights: CharacterId[]; units: ArmyUnit[] }): Battle {
  const { factionId, from, to } = order
  const { knights, units } = army
  // A commander who is gone hands the command (and the indirect units) to the knight of the highest rank left
  const leader = leadingKnight(state, knights)!
  const commander = knights.includes(order.commander) && commandRank(state, order.commander) >= commandRank(state, leader)
    ? order.commander : leader
  const defender = ownerOf(state, to) ?? null
  const city = state.cities[to]
  // Knights away on a move or a transport do not defend
  const defenders = stationedIn(state, to).filter((id) => state.characters[id].factionId === defender)
  const lord = city.assignments.governor
  const undefended = !defender || !lord || !defenders.includes(lord) || city.troops <= 0
  const pendingDefense = !undefended && isPlayerFaction(state, defender)
  return {
    id: `battle-${state.serial}`,
    orderId: order.id,
    cityId: to,
    attacker: { factionId, from, commander, knights, units, morale: state.cities[from].troopMorale },
    defender: undefended || pendingDefense
      ? { factionId: defender, knights: undefended ? defenders : [], commander: null, units: [], morale: city.troopMorale }
      : defenderArmy(state, to, defender, defenders),
    undefended,
    pendingDefense,
  }
}

/** Every battle fought: the cities' economy runs (runEconomy), then the next turn's strategy phase starts */
function startTurn(state: GameState): GameState {
  const turn = state.turn + 1
  const next: GameState = { ...runEconomy(state, turn), turn, phase: 'strategy', orders: [], moveOrders: [], transportOrders: [], march: null }
  return { ...next, activeFaction: turnOrder(next)[0] ?? null }
}

/**
 * Applies the outcome of the battle under way.
 * - The attacker wins: the city changes hands and the attacking knights move
 *   in. The defender's knights there (in its army or not) retreat to the first neighbouring city of their own
 *   (in ROAD_LINKS order), or become unaffiliated when there is none.
 * - The defender wins: the attacking knights go back where they set out from.
 * - A city taken without a battle (undefended): the attacker wins, and the knights in the city are captured
 *   (they stay as they are for now, like other prisoners; the report lists them as captives).
 * - Knights who retreated from the battlefield (`retreats`) go to the city they
 *   chose instead, whoever wins (an attacker retreating to where they set out
 *   from goes back there). Knights captured retreating stay as they are for now
 *   (prisoners are not decided yet); the report lists them.
 * - Knights of units wiped out (`wipeouts`) who were captured stay as they are
 *   too, like those captured retreating; those who got away go with their side.
 * Soldiers: units retreating take theirs to the city they retreat to (lost when captured). The units still on the
 * battlefield (`survivors`; omitted: every unit not retreated or wiped out, with the soldiers it started with) go
 * with their knights: the winner's into the city fought over (the attacker's joining the soldiers the defender did
 * not send out), the attacker's back where they set out from, the defender's to where its knights retreat (lost
 * when they have nowhere to go). Soldiers joining a city mix their morale with its soldiers'.
 * Characters who leave their city leave their assignment there (a governor is
 * no longer its lord); a city taken loses every assignment. `reason` is how the battlefield
 * decided it (the report keeps it); null when decided without fighting it out.
 * Lords (governors) are then made (appointGovernor), and listed in the report:
 * - The captured city: the attacking commander, when they entered it.
 * - Each city knights retreated or went back to, if it has no lord: the commander of
 *   their side when they are there, or else one of the faction's knights there at random.
 */
export function resolveBattle(
  state: GameState, battleId: string, winner: BattleWinner, retreats: readonly BattleRetreat[] = [],
  reason: BattleEndReason | null = null, wipeouts: readonly BattleWipeout[] = [], random: () => number = Math.random,
  survivors?: readonly BattleSurvivor[],
): GameState {
  const battle = state.march?.current
  if (!state.march || !battle || battle.id !== battleId) throw new GameRuleError(`戦闘 ${battleId} は進行中ではありません`)
  if (battle.pendingDefense) throw new GameRuleError('防衛軍団がまだ編成されていません')
  if (battle.undefended && (winner !== 'attacker' || retreats.length > 0 || wipeouts.length > 0)) {
    throw new GameRuleError('戦闘の無い占領は攻撃側の勝利だけです')
  }
  if (battle.undefended) reason = 'undefended'
  const { attacker, defender, cityId } = battle
  for (const r of [...retreats, ...wipeouts]) {
    if (r.knightId !== null && !battle[r.side].knights.includes(r.knightId)) {
      throw new GameRuleError(`${r.knightId} はこの戦闘の${r.side === 'attacker' ? '攻撃側' : '防衛側'}の騎士ではありません`)
    }
  }
  for (const r of retreats) {
    if (!retreatCities(state, battle, r.side).includes(r.to)) throw new GameRuleError(`${r.to} へは退却できません`)
  }
  const captives = battle.undefended ? [...defender.knights] : []
  /** Knights who left the battlefield by retreating (or were captured trying), or were captured wiped out or in a city taken */
  const left = new Set([
    ...retreats.flatMap((r) => r.knightId ?? []),
    ...wipeouts.flatMap((w) => (w.captured && w.knightId) || []),
    ...captives,
  ])
  const characters: Record<string, CharacterState> = { ...state.characters }
  const cityOwners = { ...state.cityOwners }
  let cities: Record<string, CityState> = { ...state.cities }
  const moves: CharacterMove[] = []
  const move = (characterId: string, kind: CharacterMove['kind'], to: string | null) => {
    const before = characters[characterId]
    moves.push({ characterId, kind, from: kind === 'return' ? attacker.from : before.cityId, to })
    const left = before.cityId !== null && before.cityId !== to ? cities[before.cityId] : undefined
    if (left) cities[before.cityId!] = { ...left, assignments: withoutAssignee(left.assignments, characterId) }
    characters[characterId] = to === null ? { cityId: null, factionId: null } : { ...before, cityId: to }
  }
  const soldiers: SoldierReturn[] = []
  const addSoldiers = (target: CityId | null | undefined, count: number, morale: number) => {
    if (!target || count <= 0 || !cities[target]) return
    cities = withTroops({ ...state, cities }, target, count, morale).cities as Record<string, CityState>
    const known = soldiers.find((r) => r.cityId === target)
    if (known) known.soldiers += count
    else soldiers.push({ cityId: target, soldiers: count })
  }
  /** Soldiers of a knight's unit as the battle started */
  const startedWith = (side: BattleSide, knightId: CharacterId | null) =>
    battle[side].units.find((u) => u.knightId !== null && u.knightId === knightId)?.soldiers ?? 0

  for (const r of retreats) {
    if (r.captured) continue
    addSoldiers(r.to, r.soldiers ?? startedWith(r.side, r.knightId), battle[r.side].morale)
    if (r.knightId === null) continue
    if (r.side === 'attacker') move(r.knightId, r.to === attacker.from ? 'return' : 'retreat', r.to)
    // Only defenders still in the city (another battle may have moved them)
    else if (characters[r.knightId].cityId === cityId && characters[r.knightId].factionId === defender.factionId) {
      move(r.knightId, 'retreat', r.to)
    }
  }

  const refuge = defender.factionId
    ? neighbours(cityId).find((id) => cityOwners[id] === defender.factionId)
    : undefined
  if (winner === 'attacker') {
    cityOwners[cityId] = attacker.factionId
    cities[cityId] = { ...cities[cityId], assignments: { officers: {} } }
    for (const id of attacker.knights) if (!left.has(id)) move(id, 'enter', cityId)
    // The defender's knights in the city, those not in its army too (only those still there: another battle may have moved them)
    const garrison = Object.keys(characters).sort()
      .filter((id) => characters[id].cityId === cityId && characters[id].factionId === defender.factionId && !movementOf(state, id))
    for (const id of garrison) {
      if (left.has(id)) continue
      move(id, refuge ? 'retreat' : 'wander', refuge ?? null)
    }
    // Knights away on a move or a transport no longer serve in the city lost: they go on to where they were heading
    for (const id of Object.keys(characters)) {
      if (characters[id].cityId === cityId && characters[id].factionId !== attacker.factionId && movementOf(state, id)) {
        characters[id] = { ...characters[id], cityId: null }
      }
    }
  } else {
    for (const id of attacker.knights) if (!left.has(id)) move(id, 'return', attacker.from)
  }

  // The units still on the battlefield go with their knights
  const gone = new Set([...retreats.flatMap((r) => r.knightId ?? []), ...wipeouts.flatMap((w) => w.knightId ?? [])])
  const remaining = survivors ?? (['attacker', 'defender'] as const).flatMap((side) => battle[side].units
    .filter((u) => u.knightId === null || !gone.has(u.knightId))
    .map((u): BattleSurvivor => ({ side, knightId: u.knightId, soldiers: u.soldiers })))
  for (const unit of remaining) {
    const won = unit.side === winner
    const target = won ? cityId : unit.side === 'attacker' ? attacker.from : refuge
    addSoldiers(target, unit.soldiers, battle[unit.side].morale)
  }

  const governors: GovernorAppointment[] = []
  /**
   * Makes a lord of `target` if it has none: the commander of `side` when they are there,
   * or else one of the owner's knights there at random
   */
  const appointGovernor = (target: CityId, side: BattleSide) => {
    const city = cities[target]
    const owner = cityOwners[target]
    if (!city || !owner || city.assignments.governor) return
    const here = Object.keys(characters)
      .filter((id) => characters[id].cityId === target && characters[id].factionId === owner && !movementOf(state, id))
    if (here.length === 0) return
    const commander = battle[side].commander
    const governor = commander && here.includes(commander) ? commander : here[Math.floor(random() * here.length)]
    // A governor holds no officer role
    cities[target] = { ...city, assignments: { ...withoutAssignee(city.assignments, governor), governor } }
    governors.push({ cityId: target, characterId: governor })
  }
  if (winner === 'attacker') appointGovernor(cityId, 'attacker')
  // Cities retreated or gone back to, once each, in the order the knights got there
  const sideOf = (id: CharacterId): BattleSide => (attacker.knights.includes(id) ? 'attacker' : 'defender')
  const refuges = new Map<CityId, BattleSide>()
  for (const m of moves) if ((m.kind === 'retreat' || m.kind === 'return') && m.to && !refuges.has(m.to)) refuges.set(m.to, sideOf(m.characterId))
  for (const [target, side] of refuges) appointGovernor(target, side)

  const report: BattleReport = {
    battle, winner, reason, cityCaptured: winner === 'attacker', moves, retreats: [...retreats], wipeouts: [...wipeouts], governors,
    captives, soldiers,
  }
  return { ...state, cityOwners, characters, cities, march: { ...state.march, current: null }, lastBattle: report }
}
