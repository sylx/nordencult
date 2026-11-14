import { RELIC_LIST, RELIC_MAP, type Relic, type RelicWorkCost } from '../../data/relics'
import { TECH_MAP } from '../../data/techs'
import { PAPAL_REPAIR_MAX_GOLD, PAPAL_REPAIR_RATE, PAPAL_REPAIR_RATE_KNOWN, PAPAL_REPAIR_RATE_RISE, PAPAL_REPAIR_RISE_POINTS } from '../economy/balance'
import { commandProblem, constructionBusyProblem, withCity } from '../economy/domestic'
import { GameRuleError } from '../errors'
import { citiesOf } from '../queries'
import { addResearchPoints, availableTechs, researchOf } from '../research/research'
import type { CityConstruction, CityId, FactionId, GameState, RelicItem, RelicWork } from '../types'
import { addRelic, relicsOf, withRelics } from './box'

/**
 * What a faction does with its relics (研究＞遺物): dismantling one for research points, repairing or producing one
 * in a city (in the place of a building: CityState.construction) and asking 法王府 to repair one. Each has a
 * `…Problem` function saying why it is not allowed (or null); the command throws GameRuleError with that reason
 */

/** 法王府, which repairs relics for gold */
export const PAPAL_FACTION: FactionId = 'sede'

const check = (problem: string | null) => {
  if (problem) throw new GameRuleError(problem)
}

const itemOf = (state: GameState, factionId: FactionId, itemId: string): RelicItem | undefined =>
  relicsOf(state, factionId).find((item) => item.id === itemId)

const withoutItem = (state: GameState, factionId: FactionId, itemId: string): GameState =>
  withRelics(state, factionId, relicsOf(state, factionId).filter((item) => item.id !== itemId))

const withGold = (state: GameState, factionId: FactionId, change: number): GameState =>
  ({ ...state, gold: { ...state.gold, [factionId]: (state.gold[factionId] ?? 0) + change } })

/** Why the faction cannot act on its relics now (not its strategy phase), or null */
function turnProblem(state: GameState, factionId: FactionId): string | null {
  return state.phase === 'strategy' && state.activeFaction === factionId ? null : '手番ではありません'
}

/** Why a broken relic of the box cannot be dismantled, repaired or sent to 法王府 */
function brokenItemProblem(item: RelicItem | undefined): string | null {
  if (!item) return '遺物がありません'
  if (item.repaired) return '修復済みの遺物です'
  if (item.papalRepair) return '法王府に依頼中です'
  return null
}

/** Why the work's technology bars the faction from it, or null */
function techProblem(state: GameState, factionId: FactionId, cost: RelicWorkCost): string | null {
  if (!cost.tech || researchOf(state, factionId).researched.includes(cost.tech)) return null
  return `技術「${TECH_MAP[cost.tech]?.name ?? cost.tech}」の研究が必要です`
}

/** Why the city cannot take on repairing or producing at this cost now (it is the active faction's: commandProblem), or null */
function workProblem(state: GameState, cityId: CityId, cost: RelicWorkCost): string | null {
  const problem = techProblem(state, state.activeFaction ?? '', cost) ?? commandProblem(state, cityId) ?? constructionBusyProblem(state, cityId)
  if (problem) return problem
  return (state.gold[state.activeFaction!] ?? 0) < cost.gold ? '金が足りません' : null
}

/** The city starts on the work, paying its gold; the city's 生産 goes into it from the next turn */
function startWork(state: GameState, cityId: CityId, work: RelicWork, cost: RelicWorkCost): GameState {
  const construction: CityConstruction = { work, requiredSupplies: cost.supplies, investedSupplies: 0 }
  return withGold(withCity(state, cityId, { construction }), state.activeFaction!, -cost.gold)
}

// ── Dismantling ──

export function dismantleProblem(state: GameState, factionId: FactionId, itemId: string): string | null {
  const item = itemOf(state, factionId, itemId)
  const problem = turnProblem(state, factionId) ?? brokenItemProblem(item)
  if (problem) return problem
  if (RELIC_MAP[item!.relicId]?.dismantlePoints === undefined) return '解体できない遺物です'
  // The relic would be lost for nothing, the points having nowhere to go
  if (availableTechs(state, factionId).length === 0) return '研究できる技術が残っていません'
  return null
}

/**
 * Dismantles a broken relic for good: its research points go into the technology the faction researches, completing
 * it should they reach its cost, or 宙に浮いた when it researches none (addResearchPoints)
 */
export function dismantleRelic(state: GameState, factionId: FactionId, itemId: string): GameState {
  check(dismantleProblem(state, factionId, itemId))
  const { relicId } = itemOf(state, factionId, itemId)!
  return addResearchPoints(withoutItem(state, factionId, itemId), factionId, RELIC_MAP[relicId].dismantlePoints!)
}

// ── Repairing in a city ──

export function repairProblem(state: GameState, cityId: CityId, itemId: string): string | null {
  const factionId = state.activeFaction
  if (state.phase !== 'strategy' || !factionId) return '手番ではありません'
  const item = itemOf(state, factionId, itemId)
  const problem = brokenItemProblem(item)
  if (problem) return problem
  const cost = RELIC_MAP[item!.relicId]?.repair
  return cost ? workProblem(state, cityId, cost) : '修復できない遺物です'
}

/** The relic leaves the box for the city, which repairs it in the place of a building (paying the gold now; a repair takes no building slot) */
export function startRelicRepair(state: GameState, cityId: CityId, itemId: string): GameState {
  check(repairProblem(state, cityId, itemId))
  const factionId = state.activeFaction!
  const { relicId } = itemOf(state, factionId, itemId)!
  return startWork(withoutItem(state, factionId, itemId), cityId, { kind: 'relicRepair', relicId }, RELIC_MAP[relicId].repair!)
}

/** The broken relics of the box the faction has the technology to repair, none of them with 法王府 */
export const repairableRelics = (state: GameState, factionId: FactionId): RelicItem[] =>
  relicsOf(state, factionId).filter((item) => {
    const cost = RELIC_MAP[item.relicId]?.repair
    return !brokenItemProblem(item) && cost && !techProblem(state, factionId, cost)
  })

// ── Producing in a city ──

export function productionProblem(state: GameState, cityId: CityId, relicId: string): string | null {
  const relic = RELIC_MAP[relicId]
  if (!relic) return `${relicId} は遺物ではありません`
  return relic.production ? workProblem(state, cityId, relic.production) : '生産できない遺物です'
}

/** The city produces the relic (none is needed) in the place of a building, paying the gold now; it comes into the box repaired */
export function startRelicProduction(state: GameState, cityId: CityId, relicId: string): GameState {
  check(productionProblem(state, cityId, relicId))
  return startWork(state, cityId, { kind: 'relicProduction', relicId }, RELIC_MAP[relicId].production!)
}

/** The relics the faction has the technology to produce, in data order */
export const producibleRelics = (state: GameState, factionId: FactionId): Relic[] =>
  RELIC_LIST.filter((relic) => relic.production && !techProblem(state, factionId, relic.production))

// ── 法王府 ──

/** The technology and every one it requires, however far back (each once) */
function techLineage(techId: string): string[] {
  const seen = new Set<string>()
  const visit = (id: string) => {
    if (seen.has(id) || !TECH_MAP[id]) return
    seen.add(id)
    for (const required of TECH_MAP[id].requires) visit(required)
  }
  visit(techId)
  return [...seen]
}

/**
 * The research points the faction lacks to reach the relic's repair technology: those of it and every technology it
 * requires (all are needed, so this is the shortest way there) not researched yet, less what it has put into them;
 * 0 when it is researched. undefined: its repair needs no technology
 */
export function papalRepairShortfall(state: GameState, factionId: FactionId, relic: Relic): number | undefined {
  const tech = relic.repair?.tech
  if (!tech || !TECH_MAP[tech]) return undefined
  const { researched, progress } = researchOf(state, factionId)
  return techLineage(tech)
    .filter((id) => !researched.includes(id))
    .reduce((sum, id) => sum + Math.max(0, TECH_MAP[id].cost - (progress[id] ?? 0)), 0)
}

/** The rate of the relic's repair 法王府 asks of the faction (balance.ts' PAPAL_REPAIR_RATE…) */
export function papalRepairRate(state: GameState, factionId: FactionId, relic: Relic): number {
  const shortfall = papalRepairShortfall(state, factionId, relic)
  if (shortfall === undefined) return PAPAL_REPAIR_RATE
  return PAPAL_REPAIR_RATE_KNOWN + (PAPAL_REPAIR_RATE_RISE * shortfall) / PAPAL_REPAIR_RISE_POINTS
}

/** Gold 法王府 takes from the faction to repair the relic: dearer the farther the faction is from its technology */
export const papalRepairCost = (state: GameState, factionId: FactionId, relic: Relic): number =>
  Math.ceil(((relic.repair?.gold ?? 0) + (relic.repair?.supplies ?? 0)) * papalRepairRate(state, factionId, relic))

export function papalRepairProblem(state: GameState, factionId: FactionId, itemId: string): string | null {
  const item = itemOf(state, factionId, itemId)
  const problem = turnProblem(state, factionId) ?? brokenItemProblem(item)
  if (problem) return problem
  const relic = RELIC_MAP[item!.relicId]
  if (!relic?.repair) return '修復できない遺物です'
  if (factionId === PAPAL_FACTION) return '法王府は自らに依頼できません'
  if (citiesOf(state, PAPAL_FACTION).length === 0) return '法王府は滅んでいます'
  if (relicsOf(state, factionId).some((other) => other.papalRepair)) return '法王府への依頼は同時に1件までです'
  const cost = papalRepairCost(state, factionId, relic)
  if (cost > PAPAL_REPAIR_MAX_GOLD) return `金${PAPAL_REPAIR_MAX_GOLD.toLocaleString()}を超える修復は法王府に断られます`
  return (state.gold[factionId] ?? 0) < cost ? '金が足りません' : null
}

/**
 * Asks 法王府 to repair the relic: the gold goes to its treasury now, for good, and the relic stays in the box until
 * the next economy run (runRelics) repairs it. No technology or city is needed
 */
export function requestPapalRepair(state: GameState, factionId: FactionId, itemId: string): GameState {
  check(papalRepairProblem(state, factionId, itemId))
  const cost = papalRepairCost(state, factionId, RELIC_MAP[itemOf(state, factionId, itemId)!.relicId])
  const items = relicsOf(state, factionId).map((item) => (item.id === itemId ? { ...item, papalRepair: true } : item))
  return withGold(withGold(withRelics(state, factionId, items), factionId, -cost), PAPAL_FACTION, cost)
}

// ── What the screens ask ──

/** A repair or production under way in a city of the faction */
export interface RelicWorkInfo {
  cityId: CityId
  work: RelicWork
  construction: CityConstruction
}

/** The repairs and productions under way in the faction's cities (a relic being repaired is not in the box) */
export function relicWorks(state: GameState, factionId: FactionId): RelicWorkInfo[] {
  return citiesOf(state, factionId).flatMap((cityId) => {
    const construction = state.cities[cityId].construction
    return construction && construction.work.kind !== 'building' ? [{ cityId, work: construction.work, construction }] : []
  })
}

/** What a broken relic of the box can give, and why each cannot be done now (null: it can) */
export interface RelicItemInfo {
  item: RelicItem
  relic: Relic
  dismantlePoints?: number
  dismantleProblem: string | null
  repair?: RelicWorkCost
  /** Repairing it in `cityId` */
  repairProblem: string | null
  /** The gold 法王府 takes */
  papalGold?: number
  /** papalGold against the rate for a relic needing no technology: below 1 cheaper, above dearer (the technology researched); undefined: no such relic */
  papalRateRatio?: number
  /** The research points the faction lacks to reach the repair's technology (papalRepairShortfall); undefined: no such relic */
  papalShortfall?: number
  papalProblem: string | null
}

/** What can be done with a relic of the faction's box, repairing it in `cityId` (the city the screen is opened on); undefined: none such */
export function relicItemInfo(state: GameState, factionId: FactionId, cityId: CityId, itemId: string): RelicItemInfo | undefined {
  const item = itemOf(state, factionId, itemId)
  const relic = item && RELIC_MAP[item.relicId]
  if (!item || !relic) return undefined
  return {
    item,
    relic,
    dismantlePoints: relic.dismantlePoints,
    dismantleProblem: dismantleProblem(state, factionId, itemId),
    repair: relic.repair,
    repairProblem: repairProblem(state, cityId, itemId),
    papalGold: relic.repair && papalRepairCost(state, factionId, relic),
    papalRateRatio: relic.repair?.tech ? papalRepairRate(state, factionId, relic) / PAPAL_REPAIR_RATE : undefined,
    papalShortfall: papalRepairShortfall(state, factionId, relic),
    papalProblem: papalRepairProblem(state, factionId, itemId),
  }
}

/** Debugging: a relic for the faction, repaired or else broken when it can be (a 魔導書 cannot) */
export function debugAddRelic(state: GameState, factionId: FactionId, relicId: string, repaired = false): GameState {
  return addRelic(state, factionId, relicId, repaired || RELIC_MAP[relicId]?.brokenName === undefined)
}
