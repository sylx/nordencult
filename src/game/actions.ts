import { CHARACTER_MAP } from '../data/character'
import { MAX_SOLDIERS, defaultUnitType, hasOwnSoldiers, isMercenary, mixMorale, ownSoldiers } from './army'
import { defenderArmy } from './defense'
import { successorLord, withGovernor, withoutAssignee } from './economy/domestic'
import { STANDING_WIPED_OUT } from './economy/balance'
import { runEconomy } from './economy/runEconomy'
import { GameRuleError } from './errors'
import { endContract, withStanding } from './mercenaries/mercenaries'
import { escapeOf, runMovements } from './movement'
import { runEscapes } from './prisoners'
import { mustChooseResearch } from './research/research'
import {
  canCommand, citySoldiers, commandRank, defenseProblem, isPlayerFaction, leadingKnight, movementOf, orderProblem, ownerOf, prisonerMovementOf, retreatCities,
  stationedIn, turnOrder,
} from './queries'
import { rejoinCity, runRoaming, wanderer } from './roaming'
import type {
  ArmyUnit, Battle, BattleEndReason, BattleReport, BattleRetreat, BattleSide, BattleSurvivor, BattleWinner, BattleWipeout, CharacterId,
  CharacterMove, CharacterState, CityId, CityState, DefenseDraft, Entry, FactionDestroyed, FactionId, GameState, GovernorAppointment, Imprisonment,
  InvasionOrder, MercenaryState, Movement, SoldierReturn,
} from './types'
import { relicsOf, withoutRelicItem, withRelics } from './relics/box'
import { releaseEquipment } from './relics/equipment'
import { isSummon } from './summons/character'
import { releaseSummons, removeSummons, withSummonHp } from './summons/summons'
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

/** Why the active faction cannot end its strategy phase now, or null: a faction the player plays has research points 宙に浮いた (mustChooseResearch) */
export function endFactionTurnProblem(state: GameState): string | null {
  if (state.phase !== 'strategy' || !state.activeFaction) return '戦略フェーズではありません'
  if (isPlayerFaction(state, state.activeFaction) && mustChooseResearch(state, state.activeFaction)) return '研究先を選んでください'
  return null
}

/**
 * The active faction ends its strategy phase (endFactionTurnProblem): the next faction plays, or
 * after the last one the progress phase (進行フェーズ, 'march') starts with every
 * order queued in the factions' turn order (by 国力), each faction's in the order they were made.
 * Its moves come first (the move part: runMovements), then the invasions one by one (the invasion part).
 * As it starts the prisoners may escape (runEscapes), riding off in its moves, and those serving nobody go on (runRoaming).
 */
export function endFactionTurn(state: GameState, random: () => number = Math.random): GameState {
  const problem = endFactionTurnProblem(state)
  if (problem || !state.activeFaction) throw new GameRuleError(problem ?? '戦略フェーズではありません')
  const order = turnOrder(state)
  const next = order[order.indexOf(state.activeFaction) + 1]
  if (next) return { ...state, activeFaction: next }
  const rank = (factionId: string) => order.indexOf(factionId)
  // Stable sort: one faction's orders keep the order they were made in
  const queue = [...state.orders].sort((a, b) => rank(a.factionId) - rank(b.factionId)).map((o) => o.id)
  return {
    ...runRoaming(runEscapes(state, random), random), phase: 'march', activeFaction: null,
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
 * The army's soldiers are taken from the city it sets out from (as many as it has left), entering or invading,
 * but for a mercenary's, who are their own.
 * With no order left the next turn starts. Does nothing while a battle, an entry or a decision is under way, so
 * calling it twice is harmless.
 * Knights setting out on the invasion leave their assignments, and a lord is followed by another in their city
 * (setOutArmy), as those moving away are.
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
        soldiers: citySoldiers(units), morale: state.cities[from].troopMorale,
      }
      const departed = withTroops(setOutArmy(state, from, knights, queue, random), from, -entry.soldiers)
      return { ...departed, march: { ...march, moved: true, queue, entry }, serial: state.serial + 1 }
    }
    if (owner !== march.owners[to] && isPlayerFaction(state, factionId) && !march.confirmed.includes(order.id)) {
      return { ...state, march: { ...march, moved: true, queue: [order.id, ...queue], decision: order.id } }
    }
    const battle = createBattle(state, order, army)
    const left = queue.filter((q) => state.orders.find((o) => o.id === q)?.from !== to)
    let departed = withTroops(setOutArmy(state, from, knights, left, random), from, -citySoldiers(battle.attacker.units))
    departed = withTroops(departed, to, -citySoldiers(battle.defender.units))
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
  return { ...withTroops(state, battle.cityId, -citySoldiers(units)), march: { ...state.march, current: defended } }
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
 * An invasion's army sets out: its knights leave their assignments in the city it sets out from, as knights moving
 * away do (they do not get them back when they come back). When the lord is among them, another follows them
 * (successorLord): not one of the army, nor of the invasions still to come, nor one on a move
 */
function setOutArmy(
  state: GameState, from: CityId, knights: readonly CharacterId[], queue: readonly string[], random: () => number,
): GameState {
  const city = state.cities[from]
  const lord = city.assignments.governor
  let assignments = knights.reduce(withoutAssignee, city.assignments)
  if (lord && knights.includes(lord)) {
    const excluded = new Set([
      ...knights,
      ...state.orders.filter((o) => queue.includes(o.id)).flatMap((o) => o.knights),
      ...state.movements.flatMap((m) => (m.kind ? [] : m.knights)),
    ])
    assignments = withGovernor(assignments, successorLord(state, from, excluded, random))
  }
  return assignments === city.assignments ? state : { ...state, cities: { ...state.cities, [from]: { ...city, assignments } } }
}

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
 * A mercenary's or a summoned unit's has their own soldiers as they are now (hasOwnSoldiers) and takes none of the city's.
 * null when no knight who can lead the army goes, or the city was lost
 */
function armyOf(state: GameState, order: InvasionOrder): { knights: CharacterId[]; units: ArmyUnit[] } | null {
  const { factionId, from } = order
  if (ownerOf(state, from) !== factionId) return null
  const present = order.knights.filter((id) => {
    const c = state.characters[id]
    return c?.cityId === from && c.factionId === factionId
  })
  let pool = state.cities[from]?.troops ?? 0
  const units = (order.units ?? present.map((id) => ({ knightId: id, unitType: defaultUnitType(state, id), soldiers: MAX_SOLDIERS })))
    .filter((u) => u.knightId === null || present.includes(u.knightId))
    .flatMap((u) => {
      if (u.knightId !== null && hasOwnSoldiers(u.knightId)) {
        return [{ ...u, unitType: defaultUnitType(state, u.knightId), soldiers: ownSoldiers(state, u.knightId)! }]
      }
      const soldiers = Math.min(u.soldiers, pool)
      pool -= soldiers
      return soldiers > 0 ? [{ ...u, soldiers }] : []
    })
  const knights = present.filter((id) => units.some((u) => u.knightId === id))
  return knights.some(canCommand) ? { knights, units } : null
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
 *   (in ROAD_LINKS order). With none they go back to their faction (rejoinCity), or take to wandering (放浪) when it
 *   has no city left.
 * - The defender wins: the attacking knights go back where they set out from.
 * - A city taken without a battle (undefended): the attacker wins, and the knights in the city are captured
 *   (the report lists them as captives).
 * - Knights who retreated from the battlefield (`retreats`) go to the city they
 *   chose instead, whoever wins (an attacker can only go back where they set out from).
 * - Knights captured (retreating, wiped out, or in a city taken) by the side that won are its prisoners
 *   (CharacterState.prisoner), held in the city fought over. Those the losing side captured are set free and go back
 *   where they were: an attacker to the city they set out from, a defender staying in their city.
 *   Knights of units wiped out who got away go to the city they got away to whoever wins; when their side had
 *   nowhere to retreat to, as those of a city lost with no city next to it.
 * - Prisoners of the attacker's faction held in the city it takes are set free and serve there; those of other
 *   factions are the attacker's prisoners now. Those being taken away on a move or a transport go on.
 * Soldiers: units retreating take theirs to the city they retreat to (lost when captured). The units still on the
 * battlefield (`survivors`; omitted: every unit not retreated or wiped out, with the soldiers it started with) go
 * with their knights: the winner's into the city fought over (the attacker's joining the soldiers the defender did
 * not send out), the attacker's back where they set out from, the defender's to where its knights retreat (lost
 * when they have nowhere to go). Soldiers joining a city mix their morale with its soldiers'.
 * Knights who leave their faction (captured, wandering, released) take off what they wear (releaseEquipment).
 * Mercenaries are not captured and their soldiers stay their own whatever happens, won or lost. They are no lords. One
 * wiped out leaves the contract, wherever their side could retreat to, at a cost to the faction's standing; one with
 * nowhere to retreat to out of the city lost leaves it too, with their soldiers. They stay where the battle was.
 * Characters who leave their city leave their assignment there (a governor is
 * no longer its lord); a city taken loses every assignment. A building under construction there goes on for the
 * new owner, but a relic being repaired or produced there is lost, with its supplies and gold (the report lists it as
 * lostRelicWork). `reason` is how the battlefield decided it (the report keeps it); null when decided without fighting it out.
 * Lords (governors) are then made (appointGovernor), and listed in the report:
 * - A city the head of a faction (君主) retreated, went back or rejoined to: the head, in place of the lord there.
 * - The captured city: the attacking commander, when they entered it.
 * - Each city knights retreated, went back or rejoined to, if it has no lord: the commander of
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
  for (const r of [...retreats, ...wipeouts]) {
    if (r.to !== null && !retreatCities(state, battle, r.side).includes(r.to)) throw new GameRuleError(`${r.to} へは退却できません`)
  }
  // Mercenaries and summoned units are never captured
  const captives = battle.undefended ? defender.knights.filter((id) => !hasOwnSoldiers(id)) : []
  // Where the defender's knights retreat out of the city lost, and their soldiers go when it holds
  const refuge = defender.factionId
    ? neighbours(cityId).find((id) => state.cityOwners[id] === defender.factionId)
    : undefined
  /** Knights captured, and their side */
  const captured = new Map<CharacterId, BattleSide>([
    ...retreats.flatMap((r) => (r.captured && r.knightId && !isSummon(r.knightId) ? [[r.knightId, r.side] as const] : [])),
    ...wipeouts.flatMap((w) => (w.captured && w.knightId && !isSummon(w.knightId) ? [[w.knightId, w.side] as const] : [])),
    ...captives.map((id) => [id, 'defender'] as const),
  ])
  // Only the side that won keeps those it captured, held in the city fought over
  const prisoners: Imprisonment[] = [...captured].flatMap(([characterId, side]) => (side === winner ? [] : [{ characterId, cityId }]))
  // The losing side's captures come to nothing: the attackers it took go back where they set out from (the defenders it took are in their city)
  const released = [...captured].flatMap(([id, side]) => (side === winner && side === 'attacker' ? [id] : []))
  /** Knights who left the battlefield by retreating (or getting away wiped out), were taken prisoner, or were set free and go back */
  const left = new Set([
    ...[...retreats, ...wipeouts].flatMap((r) => (r.knightId && !r.captured ? [r.knightId] : [])),
    ...prisoners.map((p) => p.characterId),
    ...released,
  ])
  const characters: Record<string, CharacterState> = { ...state.characters }
  const cityOwners = { ...state.cityOwners }
  let cities: Record<string, CityState> = { ...state.cities }
  /** The soldiers of the mercenaries who fought, as the battle left them */
  const mercenaryLeft = new Map<CharacterId, number>()
  /** The HP of the summoned units who fought, as the battle left them, and those lost (wiped out, or with nowhere to go) */
  const summonLeft = new Map<CharacterId, number>()
  const lostSummons: CharacterId[] = []
  /** Soldiers of their own as the battle left them: a mercenary's or a summoned unit's (false: anyone else's, the city's) */
  const keepOwn = (knightId: CharacterId | null, count: number): boolean => {
    if (knightId === null || !hasOwnSoldiers(knightId)) return false
    ;(isSummon(knightId) ? summonLeft : mercenaryLeft).set(knightId, count)
    return true
  }
  const moves: CharacterMove[] = []
  const move = (characterId: string, kind: CharacterMove['kind'], to: string | null) => {
    const before = characters[characterId]
    moves.push({ characterId, kind, from: kind === 'return' ? attacker.from : before.cityId, to })
    const left = before.cityId !== null && before.cityId !== to ? cities[before.cityId] : undefined
    if (left) cities[before.cityId!] = { ...left, assignments: withoutAssignee(left.assignments, characterId) }
    characters[characterId] = to === null ? wanderer(cityId) : { ...before, cityId: to }
  }
  /**
   * Out of the battle with nowhere to retreat to: a mercenary's contract ends, a knight goes back to their faction or,
   * with no city of it left, wanders; a summoned unit goes back too or, with nowhere to go, is lost
   */
  const strand = (characterId: CharacterId) => {
    if (isMercenary(characterId)) return move(characterId, 'released', null)
    const owners = winner === 'attacker' ? { ...state.cityOwners, [cityId]: attacker.factionId } : state.cityOwners
    const home = rejoinCity({ ...state, characters, cityOwners: owners }, characters[characterId].factionId!, cityId)
    if (!home && isSummon(characterId)) return lostSummons.push(characterId)
    move(characterId, home ? 'rejoin' : 'wander', home)
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

  // Prisoners leave their assignments in the city they served in
  for (const { characterId, cityId: held } of prisoners) {
    const before = characters[characterId]
    const served = before.cityId ? cities[before.cityId] : undefined
    if (served) cities[before.cityId!] = { ...served, assignments: withoutAssignee(served.assignments, characterId) }
    characters[characterId] = { cityId: held, factionId: before.factionId, prisoner: true }
  }

  for (const r of retreats) {
    if (r.captured) continue
    const leaving = r.soldiers ?? startedWith(r.side, r.knightId)
    if (!keepOwn(r.knightId, leaving)) addSoldiers(r.to, leaving, battle[r.side].morale)
    if (r.knightId === null) continue
    if (r.side === 'attacker') move(r.knightId, 'return', r.to)
    // Only defenders still in the city (another battle may have moved them)
    else if (characters[r.knightId].cityId === cityId && characters[r.knightId].factionId === defender.factionId) {
      move(r.knightId, 'retreat', r.to)
    }
  }
  // Knights of units wiped out who got away (they have no soldiers left); the mercenaries among them leave, and the summoned units are lost
  const wipedOut = wipeouts.filter((w) => w.knightId !== null && isMercenary(w.knightId))
  for (const w of wipeouts) {
    if (w.knightId !== null && isSummon(w.knightId)) {
      lostSummons.push(w.knightId)
      continue
    }
    if (w.captured || w.knightId === null) continue
    if (wipedOut.includes(w)) {
      mercenaryLeft.set(w.knightId, 0)
      move(w.knightId, 'released', null)
    } else if (w.side === 'attacker') {
      if (w.to) move(w.knightId, 'return', w.to)
      else strand(w.knightId)
    } else if (characters[w.knightId].cityId === cityId && characters[w.knightId].factionId === defender.factionId) {
      if (w.to) move(w.knightId, 'retreat', w.to)
      else strand(w.knightId)
    }
  }

  const freed: CharacterId[] = []
  let lostRelicWork: BattleReport['lostRelicWork'] = null
  if (winner === 'attacker') {
    cityOwners[cityId] = attacker.factionId
    // A repair, a production or a building using a relic is lost with the city (the relic too); a building needing none goes on for the attacker
    const work = cities[cityId].construction?.work
    lostRelicWork = work && (work.kind !== 'building' || work.relicItemId) ? work : null
    cities[cityId] = { ...cities[cityId], assignments: { officers: {} }, ...(lostRelicWork && { construction: null }) }
    for (const id of attacker.knights) if (!left.has(id)) move(id, 'enter', cityId)
    for (const id of released) move(id, 'return', attacker.from)
    // The defender's knights in the city, those not in its army too (only those still there: another battle may have moved them)
    const garrison = Object.keys(characters).sort().filter((id) => {
      const c = characters[id]
      return c.cityId === cityId && c.factionId === defender.factionId && !c.prisoner && !movementOf(state, id)
    })
    for (const id of garrison) {
      if (left.has(id) || lostSummons.includes(id)) continue
      if (refuge) move(id, 'retreat', refuge)
      else strand(id)
    }
    for (const id of Object.keys(characters).sort()) {
      const c = characters[id]
      if (c.cityId !== cityId) continue
      if (c.prisoner) {
        // Prisoners being taken away go on, held nowhere until they get there; the attacker's own held there are free
        if (prisonerMovementOf(state, id)) characters[id] = { ...c, cityId: null }
        else if (c.factionId === attacker.factionId) {
          characters[id] = { cityId, factionId: c.factionId }
          freed.push(id)
        }
      // Knights away on a move or a transport no longer serve in the city lost: they go on to where they were heading
      } else if (c.factionId !== attacker.factionId && movementOf(state, id)) {
        characters[id] = { ...c, cityId: null }
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
    if (keepOwn(unit.knightId, unit.soldiers)) continue
    const won = unit.side === winner
    const target = won ? cityId : unit.side === 'attacker' ? attacker.from : refuge
    addSoldiers(target, unit.soldiers, battle[unit.side].morale)
  }

  const governors: GovernorAppointment[] = []
  // The head of a faction (君主) retreating to a city of theirs (from the battlefield, or out of the city lost), going
  // back where they set out from or rejoining their faction becomes its lord in place of the one there
  for (const m of moves) {
    if (!m.to || !CHARACTER_MAP[m.characterId]?.isPatriarch) continue
    if (m.kind !== 'retreat' && m.kind !== 'return' && m.kind !== 'rejoin') continue
    if (cityOwners[m.to] !== characters[m.characterId].factionId || cities[m.to].assignments.governor === m.characterId) continue
    cities[m.to] = { ...cities[m.to], assignments: withGovernor(cities[m.to].assignments, m.characterId) }
    governors.push({ cityId: m.to, characterId: m.characterId })
  }
  /**
   * Makes a lord of `target` if it has none: the commander of `side` when they are there,
   * or else one of the owner's knights there at random
   */
  const appointGovernor = (target: CityId, side: BattleSide) => {
    const city = cities[target]
    const owner = cityOwners[target]
    if (!city || !owner || city.assignments.governor) return
    const here = Object.keys(characters)
      .filter((id) => characters[id].cityId === target && characters[id].factionId === owner && !characters[id].prisoner && !movementOf(state, id) && !hasOwnSoldiers(id)
        && !lostSummons.includes(id))
    if (here.length === 0) return
    const commander = battle[side].commander
    const governor = commander && here.includes(commander) ? commander : here[Math.floor(random() * here.length)]
    // A governor holds no officer role
    cities[target] = { ...city, assignments: { ...withoutAssignee(city.assignments, governor), governor } }
    governors.push({ cityId: target, characterId: governor })
  }
  if (winner === 'attacker') appointGovernor(cityId, 'attacker')
  // Cities retreated, gone back or rejoined to, once each, in the order the knights got there
  const sideOf = (id: CharacterId): BattleSide => (attacker.knights.includes(id) ? 'attacker' : 'defender')
  const refuges = new Map<CityId, BattleSide>()
  for (const m of moves) {
    if ((m.kind === 'retreat' || m.kind === 'return' || m.kind === 'rejoin') && m.to && !refuges.has(m.to)) refuges.set(m.to, sideOf(m.characterId))
  }
  for (const [target, side] of refuges) appointGovernor(target, side)

  const report: BattleReport = {
    battle, winner, reason, cityCaptured: winner === 'attacker', moves, retreats: [...retreats], wipeouts: [...wipeouts], governors,
    captives, prisoners, freed, soldiers, lostRelicWork,
    summons: Object.fromEntries([...attacker.knights, ...defender.knights, ...lostSummons].flatMap((id) => (state.summons[id] ? [[id, state.summons[id]]] : []))),
    lostSummons,
  }
  const mercenaries: Record<CharacterId, MercenaryState> = { ...state.mercenaries }
  for (const [id, soldiers] of mercenaryLeft) mercenaries[id] = { ...mercenaries[id], soldiers }
  let resolved: GameState = { ...state, cityOwners, characters, cities, mercenaries, march: { ...state.march, current: null }, lastBattle: report }
  // The relic a building lost used leaves the box of the city's owner before (as the faction may be destroyed now, before its box goes to the attacker)
  const formerOwner = state.cityOwners[cityId]
  if (lostRelicWork?.kind === 'building' && lostRelicWork.relicItemId && formerOwner) {
    resolved = withoutRelicItem(resolved, formerOwner, lostRelicWork.relicItemId)
  }
  for (const [id, hp] of summonLeft) resolved = withSummonHp(resolved, id, hp)
  // A summoned unit left with no HP (a retreat with none) is lost too
  for (const [id, hp] of summonLeft) if (hp <= 0 && !lostSummons.includes(id)) lostSummons.push(id)
  resolved = removeSummons(resolved, lostSummons)
  for (const m of moves) if (m.kind === 'released') resolved = endContract(resolved, m.characterId, cityId)
  for (const w of wipedOut) resolved = withStanding(resolved, battle[w.side].factionId!, STANDING_WIPED_OUT)
  const lost = defender.factionId
  const destroyed = winner === 'attacker' && lost && !Object.values(cityOwners).includes(lost)
    ? destroyFaction(resolved, lost, cityId, attacker.factionId, Object.keys(state.characters).filter((id) => state.characters[id].factionId === lost))
    : resolved
  // The relics those captured, wandering or released wore stay in the box of the faction they served; summoned units serving nobody are gone
  return releaseSummons(releaseEquipment(destroyed))
}

/**
 * A faction that lost its last city (`cityId`, to `by`) is destroyed: every knight of it (`served`, as the battle
 * started: some wandered off in it) wanders (放浪) from that city with a grudge against `by`, those on a move or a
 * transport too (their movements end), and the event is told (FactionDestroyed). The contracts of its mercenaries end
 * there, without a grudge. Its knights held prisoner stay prisoners, of no faction
 * (they no longer escape); the prisoners it was taking along on its moves and transports are set free where they are (escapeOf).
 * Its relics go into the box of `by` as they are, those 法王府 is repairing too (nobody wearing them: resolveBattle releases them).
 * Its summoned units are gone
 */
function destroyFaction(state: GameState, factionId: FactionId, cityId: CityId, by: FactionId, served: readonly CharacterId[]): GameState {
  const knights = served.filter((id) => !hasOwnSoldiers(id)).sort()
  const characters: Record<string, CharacterState> = { ...state.characters }
  for (const id of knights) {
    const c = characters[id]
    characters[id] = c.prisoner ? { ...c, factionId: null } : wanderer(cityId, by)
  }
  const event: FactionDestroyed = { id: `event-${state.serial}`, kind: 'factionDestroyed', turn: state.turn, factionId, cityId, by, knights }
  let serial = state.serial + 1
  const movements: Movement[] = []
  for (const m of state.movements) {
    if (m.factionId !== factionId) {
      movements.push(m)
      continue
    }
    for (const id of m.prisoners ?? []) {
      const escape = escapeOf({ ...state, characters }, id, m.route[0], `escape-${serial++}`)
      characters[id] = escape.character
      if (escape.movement) movements.push(escape.movement)
    }
  }
  const relics = withRelics(withRelics(state, by, [...relicsOf(state, by), ...relicsOf(state, factionId)]), factionId, []).relics
  const destroyed: GameState = removeSummons({ ...state, characters, movements, relics, events: [...state.events, event], serial }, served.filter(isSummon))
  return served.filter((id) => destroyed.mercenaries[id]?.contract).reduce((next, id) => endContract(next, id, cityId), destroyed)
}

/** The event told to the player is dropped */
export const dismissEvent = (state: GameState, eventId: string): GameState =>
  (state.events.some((e) => e.id === eventId) ? { ...state, events: state.events.filter((e) => e.id !== eventId) } : state)
