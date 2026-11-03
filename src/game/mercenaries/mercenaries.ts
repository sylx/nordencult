import { CHARACTER_MAP } from '../../data/character'
import { isMercenary } from '../army'
import {
  MERCENARY_MONTHLY_DIVISOR, MERCENARY_REACH, MERCENARY_REACH_TAVERN, MERCENARY_RENEWAL_RATE, MERCENARY_STANDING_LIMIT, STANDING_DISMISS_REDUCED,
  STANDING_HIRE, STANDING_PRICE_RATE, STANDING_PRIDE_BASE, STANDING_PRIDE_STEP,
} from '../economy/balance'
import { commandProblem } from '../economy/domestic'
import { GameRuleError } from '../errors'
import { escapeOf } from '../movement'
import { moveOrderOf, movementOf, orderOf, transportOrderOf } from '../queries'
import { wanderer } from '../roaming'
import type { CharacterId, CharacterState, CityId, FactionId, GameState, MercenaryRenewal, MercenaryState, Movement } from '../types'
import { CITY_IDS, neighbours } from '../world'

/**
 * Mercenaries (傭兵): knights with soldiers of their own (GameState.mercenaries), hired for a 契約金 and a monthly fee.
 * Hired, they serve in a city as any knight does; not hired, they roam from city to city (CharacterState.roaming).
 * Each has a `…Problem` function saying why it is not allowed (or null); the command throws GameRuleError with that reason.
 */

const check = (problem: string | null) => {
  if (problem) throw new GameRuleError(problem)
}

const info = (id: CharacterId) => CHARACTER_MAP[id].mercenaryInfo!

const withMercenary = (state: GameState, id: CharacterId, change: Partial<MercenaryState>): GameState =>
  ({ ...state, mercenaries: { ...state.mercenaries, [id]: { ...state.mercenaries[id], ...change } } })

/** Recovering (回復中): not hired and short of soldiers, off the market until they are back at full strength */
export function isRecovering(state: GameState, id: CharacterId): boolean {
  const mercenary = state.mercenaries[id]
  return Boolean(mercenary && !mercenary.contract && mercenary.soldiers < (CHARACTER_MAP[id].mercenaryInfo?.maxSoldiers ?? 0))
}

/** Mercenaries a faction hired, in id order */
export const hiredMercenaries = (state: GameState, factionId: FactionId): CharacterId[] =>
  Object.keys(state.mercenaries).sort().filter((id) => state.mercenaries[id].contract && state.characters[id]?.factionId === factionId)

/** The city where a hired mercenary is now: where they are on their way, or the one they serve in */
export const mercenaryAt = (state: GameState, id: CharacterId): CityId | null =>
  movementOf(state, id)?.route[0] ?? state.characters[id]?.cityId ?? null

/** The city's reach for hiring mercenaries, in roads (Infinity: every city). Only the city's own buildings count */
export function mercenaryReach(state: GameState, cityId: CityId): number {
  const buildings = state.cities[cityId]?.buildings ?? []
  if (buildings.includes('guild')) return Infinity
  return buildings.includes('tavern') ? MERCENARY_REACH_TAVERN : MERCENARY_REACH
}

/** The cities up to `hops` roads from a city, the city included */
function citiesWithin(cityId: CityId, hops: number): Set<CityId> {
  if (hops === Infinity) return new Set(CITY_IDS)
  const seen = new Set([cityId])
  let front = [cityId]
  for (let hop = 0; hop < hops; hop++) {
    front = front.flatMap((id) => neighbours(id).filter((next) => !seen.has(next)))
    for (const id of front) seen.add(id)
  }
  return seen
}

/** The mercenaries a city can reach, whoever holds the cities they are in, in id order: those not hired and not recovering */
export function mercenaryMarket(state: GameState, cityId: CityId): CharacterId[] {
  const reach = citiesWithin(cityId, mercenaryReach(state, cityId))
  return Object.keys(state.mercenaries).sort().filter((id) => {
    const at = state.characters[id]?.roaming
    return at !== undefined && reach.has(at) && !state.mercenaries[id].contract && !isRecovering(state, id)
  })
}

const standingOf = (state: GameState, factionId: FactionId) => state.mercenaryStanding[factionId] ?? 0

/** `state` with the faction's standing with the mercenaries changed by `change`, within MERCENARY_STANDING_LIMIT */
export function withStanding(state: GameState, factionId: FactionId, change: number): GameState {
  const standing = Math.max(-MERCENARY_STANDING_LIMIT, Math.min(MERCENARY_STANDING_LIMIT, standingOf(state, factionId) + change))
  return { ...state, mercenaryStanding: { ...state.mercenaryStanding, [factionId]: standing } }
}

/** `base` gold at the faction's standing, rounded up: × (1 − standing / 100 × プライド × STANDING_PRICE_RATE) */
function priced(state: GameState, factionId: FactionId, id: CharacterId, base: number): number {
  const rate = 1 - standingOf(state, factionId) / 100 * info(id).pride * STANDING_PRICE_RATE
  // Past the rounding errors of the rate, so that a round price is not rounded up
  return Math.ceil(Number((base * rate).toFixed(6)))
}

/** What hiring a mercenary costs the faction now, and what it would pay each month */
export function contractPrice(state: GameState, factionId: FactionId, id: CharacterId): { fee: number; monthly: number } {
  const { fee } = info(id)
  return { fee: priced(state, factionId, id, fee), monthly: priced(state, factionId, id, fee / MERCENARY_MONTHLY_DIVISOR) }
}

/** The renewal fee of a mercenary's contract at the faction's standing now */
export const renewalPrice = (state: GameState, factionId: FactionId, id: CharacterId): number =>
  priced(state, factionId, id, info(id).fee * MERCENARY_RENEWAL_RATE)

/** Why the mercenary will not sign with the faction: the standing it needs is not told. null: they will */
function prideProblem(state: GameState, factionId: FactionId, id: CharacterId): string | null {
  const needed = (info(id).pride - STANDING_PRIDE_BASE) * STANDING_PRIDE_STEP
  return standingOf(state, factionId) < needed ? `${info(id).name}は我々との契約に応じません` : null
}

/**
 * Why the active faction cannot talk a mercenary in the city into a contract now, or null: all but the gold, which
 * the hiring scene tells (the mercenary screen opens it whatever the treasury holds)
 */
export function hireOfferProblem(state: GameState, cityId: CityId, id: CharacterId): string | null {
  const problem = commandProblem(state, cityId)
  if (problem) return problem
  if (!isMercenary(id) || !state.mercenaries[id]) return `${id} は傭兵ではありません`
  if (state.mercenaries[id].contract) return 'すでに契約中です'
  if (isRecovering(state, id)) return '回復中です'
  if (!mercenaryMarket(state, cityId).includes(id)) return 'この都市からは届きません'
  return prideProblem(state, state.activeFaction!, id)
}

/** Why the active faction cannot hire a mercenary in the city now, or null */
export function hireProblem(state: GameState, cityId: CityId, id: CharacterId): string | null {
  const factionId = state.activeFaction
  return hireOfferProblem(state, cityId, id)
    ?? (contractPrice(state, factionId!, id).fee > (state.gold[factionId!] ?? 0) ? '金が足りません' : null)
}

/**
 * The active faction hires a mercenary, paying the 契約金 at once: they serve in the city from this turn, wherever
 * they were, and the price stays as the standing makes it now for as long as the contract lasts
 */
export function hireMercenary(state: GameState, cityId: CityId, id: CharacterId): GameState {
  check(hireProblem(state, cityId, id))
  const factionId = state.activeFaction!
  const { fee, monthly } = contractPrice(state, factionId, id)
  const hired = withMercenary(state, id, { contract: { monthly, since: state.turn } })
  const characters = { ...state.characters, [id]: { cityId, factionId } }
  return withStanding({ ...hired, characters, gold: { ...state.gold, [factionId]: state.gold[factionId] - fee } }, factionId, STANDING_HIRE)
}

/**
 * A contract ends: the mercenary is in `at` serving nobody (the market has them back, or they recover when short of
 * soldiers). They leave the move or the transport they were on; one left with no knights ends, its soldiers and
 * supplies lost and its prisoners set free (escapeOf). All the ways a contract ends come here: what they do to the
 * standing is theirs to do. A renewal they were asking for is off
 */
export function endContract(state: GameState, id: CharacterId, at: CityId): GameState {
  const characters: Record<string, CharacterState> = { ...state.characters, [id]: wanderer(at) }
  const movements: Movement[] = []
  let serial = state.serial
  for (const m of state.movements) {
    if (!m.knights.includes(id)) {
      movements.push(m)
      continue
    }
    const knights = m.knights.filter((k) => k !== id)
    if (knights.length > 0) {
      movements.push({ ...m, knights })
      continue
    }
    for (const prisoner of m.prisoners ?? []) {
      const escape = escapeOf({ ...state, characters }, prisoner, m.route[0], `escape-${serial++}`)
      characters[prisoner] = escape.character
      if (escape.movement) movements.push(escape.movement)
    }
  }
  const events = state.events.filter((e) => !(e.kind === 'mercenaryRenewal' && e.characterId === id))
  return withMercenary({ ...state, characters, movements, events, serial }, id, { contract: null })
}

/** The faction ends a mercenary's contract (dismissed, not renewed, not paid): one short of soldiers does its standing harm */
export function releaseMercenary(state: GameState, id: CharacterId): GameState {
  const factionId = state.characters[id].factionId!
  const short = state.mercenaries[id].soldiers < info(id).maxSoldiers
  const ended = endContract(state, id, mercenaryAt(state, id)!)
  return short ? withStanding(ended, factionId, STANDING_DISMISS_REDUCED) : ended
}

/** Why the active faction cannot dismiss a mercenary now, or null: not while they are ordered somewhere */
export function dismissProblem(state: GameState, id: CharacterId): string | null {
  if (state.phase !== 'strategy' || !state.activeFaction) return '手番ではありません'
  if (!state.mercenaries[id]?.contract || state.characters[id]?.factionId !== state.activeFaction) return '自勢力の傭兵ではありません'
  if (orderOf(state, id)) return '侵攻の予約中は打ち切れません'
  if (moveOrderOf(state, id)) return '移動の予約中は打ち切れません'
  if (transportOrderOf(state, id)) return '輸送の予約中は打ち切れません'
  return null
}

/** The active faction dismisses a mercenary. The gold paid does not come back */
export function dismissMercenary(state: GameState, id: CharacterId): GameState {
  check(dismissProblem(state, id))
  return releaseMercenary(state, id)
}

/**
 * The monthly fees of a faction's mercenaries from `available` gold: in id order, those it cannot pay left out (and
 * those after them still paid as far as the gold goes)
 */
export function mercenaryFees(state: GameState, factionId: FactionId, available: number): { paid: number; unpaid: CharacterId[] } {
  let paid = 0
  const unpaid: CharacterId[] = []
  for (const id of hiredMercenaries(state, factionId)) {
    const { monthly } = state.mercenaries[id].contract!
    if (paid + monthly <= available) paid += monthly
    else unpaid.push(id)
  }
  return { paid, unpaid }
}

const renewalOf = (state: GameState, eventId: string): MercenaryRenewal | undefined =>
  state.events.find((e): e is MercenaryRenewal => e.id === eventId && e.kind === 'mercenaryRenewal')

/** Why the renewal cannot be paid, or null */
export function renewalProblem(state: GameState, eventId: string): string | null {
  const event = renewalOf(state, eventId)
  if (!event) return '更新料は求められていません'
  return event.gold > (state.gold[event.factionId] ?? 0) ? '金が足りません' : null
}

/**
 * The faction chooses on a renewal asked for: paying it the months start over, no renewal being asked for again until
 * MERCENARY_RENEWAL_MIN_MONTHS have gone by; refusing it ends the contract as a dismissal does
 */
export function decideRenewal(state: GameState, eventId: string, renew: boolean): GameState {
  const event = renewalOf(state, eventId)
  if (!event) throw new GameRuleError(`更新料 ${eventId} は求められていません`)
  if (!renew) return releaseMercenary(state, event.characterId)
  check(renewalProblem(state, eventId))
  const contract = { ...state.mercenaries[event.characterId].contract!, since: state.turn }
  const renewed = withMercenary(state, event.characterId, { contract })
  return {
    ...renewed,
    gold: { ...state.gold, [event.factionId]: state.gold[event.factionId] - event.gold },
    events: state.events.filter((e) => e.id !== eventId),
  }
}

/** Debugging: the mercenary's soldiers (from none to their 最大兵力) */
export const debugSetMercenarySoldiers = (state: GameState, id: CharacterId, soldiers: number): GameState =>
  withMercenary(state, id, { soldiers: Math.max(0, Math.min(info(id).maxSoldiers, soldiers)) })

/** Debugging: the faction's standing with the mercenaries */
export const debugSetStanding = (state: GameState, factionId: FactionId, standing: number): GameState =>
  withStanding(state, factionId, standing - standingOf(state, factionId))
