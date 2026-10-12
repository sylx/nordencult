import { orderProblem, ownerOf, retreatCities, turnOrder } from './queries'
import type {
  Battle, BattleReport, BattleRetreat, BattleWinner, CharacterMove, CharacterState, GameState, InvasionOrder,
} from './types'
import { neighbours } from './world'

/** An action not allowed in the current state (a bug in the caller, or a stale UI) */
export class GameRuleError extends Error {}

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
 * after the last one the march phase starts with every order queued in the
 * factions' turn order.
 */
export function endFactionTurn(state: GameState): GameState {
  if (state.phase !== 'strategy' || !state.activeFaction) throw new GameRuleError('戦略フェーズではありません')
  const order = turnOrder(state)
  const next = order[order.indexOf(state.activeFaction) + 1]
  if (next) return { ...state, activeFaction: next }
  const rank = (factionId: string) => order.indexOf(factionId)
  // Stable sort: one faction's orders keep the order they were made in
  const queue = [...state.orders].sort((a, b) => rank(a.factionId) - rank(b.factionId)).map((o) => o.id)
  return { ...state, phase: 'march', activeFaction: null, march: { queue, current: null } }
}

/**
 * In the march phase with no battle under way: takes the next order and
 * creates its battle (the march to it is shown, then it is fought). Orders
 * no longer possible (the target became the faction's own, the city it set
 * out from was lost, its knights are gone) are skipped; the knights stay
 * where they are. With no order left the next turn starts. Does nothing
 * while a battle is under way, so calling it twice is harmless.
 */
export function startNextBattle(state: GameState): GameState {
  if (state.phase !== 'march' || !state.march) throw new GameRuleError('行軍フェーズではありません')
  if (state.march.current) return state
  const queue = [...state.march.queue]
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    const order = state.orders.find((o) => o.id === id)
    if (!order) continue
    const battle = createBattle(state, order)
    if (battle) return { ...state, march: { queue, current: battle }, serial: state.serial + 1 }
  }
  return startTurn(state)
}

function createBattle(state: GameState, order: InvasionOrder): Battle | null {
  const { factionId, from, to } = order
  if (ownerOf(state, from) !== factionId || ownerOf(state, to) === factionId) return null
  const knights = order.knights.filter((id) => {
    const c = state.characters[id]
    return c?.cityId === from && c.factionId === factionId
  })
  if (knights.length === 0) return null
  const units = order.units?.filter((u) => knights.includes(u.knightId))
  const defender = ownerOf(state, to) ?? null
  return {
    id: `battle-${state.serial}`,
    orderId: order.id,
    cityId: to,
    attacker: { factionId, from, knights, ...(units && { units }) },
    defender: {
      factionId: defender,
      knights: Object.keys(state.characters).sort()
        .filter((id) => state.characters[id].cityId === to && state.characters[id].factionId === defender),
    },
  }
}

function startTurn(state: GameState): GameState {
  const next: GameState = { ...state, turn: state.turn + 1, phase: 'strategy', orders: [], march: null }
  return { ...next, activeFaction: turnOrder(next)[0] ?? null }
}

/**
 * Applies the outcome of the battle under way.
 * - The attacker wins: the city changes hands and the attacking knights move
 *   in. The defenders retreat to the first neighbouring city of their own
 *   (in ROAD_LINKS order), or become unaffiliated when there is none.
 * - The defender wins: the attacking knights go back where they set out from.
 * - Knights who retreated from the battlefield (`retreats`) go to the city they
 *   chose instead, whoever wins (an attacker retreating to where they set out
 *   from goes back there). Knights captured retreating stay as they are for now
 *   (prisoners are not decided yet); the report lists them.
 * Characters who move lose their lordship.
 */
export function resolveBattle(
  state: GameState, battleId: string, winner: BattleWinner, retreats: readonly BattleRetreat[] = [],
): GameState {
  const battle = state.march?.current
  if (!state.march || !battle || battle.id !== battleId) throw new GameRuleError(`戦闘 ${battleId} は進行中ではありません`)
  const { attacker, defender, cityId } = battle
  for (const r of retreats) {
    if (r.knightId !== null && !battle[r.side].knights.includes(r.knightId)) {
      throw new GameRuleError(`${r.knightId} はこの戦闘の${r.side === 'attacker' ? '攻撃側' : '防衛側'}の騎士ではありません`)
    }
    if (!retreatCities(state, battle, r.side).includes(r.to)) throw new GameRuleError(`${r.to} へは退却できません`)
  }
  /** Knights who left the battlefield by retreating (or were captured trying) */
  const left = new Set(retreats.flatMap((r) => r.knightId ?? []))
  const characters: Record<string, CharacterState> = { ...state.characters }
  const cityOwners = { ...state.cityOwners }
  const moves: CharacterMove[] = []
  const move = (characterId: string, kind: CharacterMove['kind'], to: string | null) => {
    const before = characters[characterId]
    moves.push({ characterId, kind, from: kind === 'return' ? attacker.from : before.cityId, to })
    characters[characterId] = to === null
      ? { cityId: null, factionId: null, isLord: false }
      : { ...before, cityId: to, isLord: before.isLord && to === before.cityId }
  }

  for (const r of retreats) {
    if (r.knightId === null || r.captured) continue
    if (r.side === 'attacker') move(r.knightId, r.to === attacker.from ? 'return' : 'retreat', r.to)
    // Only defenders still in the city (another battle may have moved them)
    else if (characters[r.knightId].cityId === cityId && characters[r.knightId].factionId === defender.factionId) {
      move(r.knightId, 'retreat', r.to)
    }
  }

  if (winner === 'attacker') {
    cityOwners[cityId] = attacker.factionId
    for (const id of attacker.knights) if (!left.has(id)) move(id, 'enter', cityId)
    const refuge = defender.factionId
      ? neighbours(cityId).find((id) => cityOwners[id] === defender.factionId)
      : undefined
    for (const id of defender.knights) {
      // Only those still in the city (another battle may have moved them)
      if (left.has(id) || characters[id].cityId !== cityId || characters[id].factionId !== defender.factionId) continue
      move(id, refuge ? 'retreat' : 'wander', refuge ?? null)
    }
  } else {
    for (const id of attacker.knights) if (!left.has(id)) move(id, 'return', attacker.from)
  }

  const report: BattleReport = { battle, winner, cityCaptured: winner === 'attacker', moves, retreats: [...retreats] }
  return { ...state, cityOwners, characters, march: { ...state.march, current: null }, lastBattle: report }
}
