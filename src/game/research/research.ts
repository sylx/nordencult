import { BUILDING_MAP } from '../../data/buildings'
import { TECH_LIST, TECH_MAP, type TechBranch } from '../../data/techs'
import { RESEARCH_BRANCH_BONUS } from '../economy/balance'
import { cityOutput, researchedBonus, type BuildingBonus } from '../economy/output'
import { GameRuleError } from '../errors'
import { citiesOf, isPlayerFaction } from '../queries'
import type { CityId, FactionId, FactionResearch, GameState, TechCompleted } from '../types'

/**
 * A faction's research of the technology tree (研究＞技術): what it can research, the points it gets a turn
 * (its research buildings and 研究 officers) and choosing what they go into. The economy run puts them in (runResearch)
 */

export const NO_RESEARCH: FactionResearch = { current: null, progress: {}, researched: [], carry: 0 }

export const researchOf = (state: GameState, factionId: FactionId): FactionResearch => state.research[factionId] ?? NO_RESEARCH

export const withResearch = (state: GameState, factionId: FactionId, research: FactionResearch): GameState =>
  ({ ...state, research: { ...state.research, [factionId]: research } })

/**
 * How a technology stands for a faction: researched, available (every technology it requires researched; a root is),
 * visible (one of them researched: its name and effects are shown) or hidden (shown as ???)
 */
export type TechStatus = 'researched' | 'available' | 'visible' | 'hidden'

export function techStatus(state: GameState, factionId: FactionId, techId: string): TechStatus {
  const { researched } = researchOf(state, factionId)
  if (researched.includes(techId)) return 'researched'
  const requires = TECH_MAP[techId]?.requires ?? []
  if (requires.every((id) => researched.includes(id))) return 'available'
  return requires.some((id) => researched.includes(id)) ? 'visible' : 'hidden'
}

/** The technologies a faction can research now, in data order */
export const availableTechs = (state: GameState, factionId: FactionId): string[] =>
  TECH_LIST.filter((t) => techStatus(state, factionId, t.id) === 'available').map((t) => t.id)

/** Why a faction cannot research a technology (not that it is not its turn), or null */
export function researchProblem(state: GameState, factionId: FactionId, techId: string): string | null {
  const tech = TECH_MAP[techId]
  if (!tech) return `${techId} は技術ではありません`
  const { researched } = researchOf(state, factionId)
  if (researched.includes(techId)) return 'すでに研究し終えています'
  const missing = tech.requires.filter((id) => !researched.includes(id))
  if (missing.length > 0) return `前提の技術（${missing.map((id) => TECH_MAP[id]?.name ?? id).join('・')}）が要ります`
  return null
}

/** Why the faction cannot choose to research the technology now (in its strategy phase), or null */
export function setResearchProblem(state: GameState, factionId: FactionId, techId: string): string | null {
  if (state.phase !== 'strategy' || state.activeFaction !== factionId) return '手番ではありません'
  return researchProblem(state, factionId, techId)
}

/**
 * The research with `points` put into `techId`. Should they reach its cost it is completed there and then (none
 * researched now), the surplus 宙に浮いた for the next, or lost with nothing left to research
 */
function invest(state: GameState, factionId: FactionId, research: FactionResearch, techId: string, points: number): FactionResearch {
  const invested = (research.progress[techId] ?? 0) + points
  const cost = TECH_MAP[techId]?.cost ?? Infinity
  if (invested < cost) return { ...research, current: techId, progress: { ...research.progress, [techId]: invested } }
  const done: FactionResearch = {
    current: null, progress: { ...research.progress, [techId]: cost }, researched: [...research.researched, techId], carry: research.carry + invested - cost,
  }
  return availableTechs(withResearch(state, factionId, done), factionId).length > 0 ? done : { ...done, carry: 0 }
}

/** The research with `techId` chosen: the points 宙に浮いた (carry) go into it */
function choose(state: GameState, factionId: FactionId, research: FactionResearch, techId: string): FactionResearch {
  if (research.carry <= 0) return { ...research, current: techId }
  return invest(state, factionId, { ...research, carry: 0 }, techId, research.carry)
}

/** The faction's research as `research`: a faction the player plays is told should it have completed `techId` now (TechCompleted) */
function withInvested(state: GameState, factionId: FactionId, research: FactionResearch, techId: string): GameState {
  const next = withResearch(state, factionId, research)
  if (!research.researched.includes(techId) || !isPlayerFaction(state, factionId)) return next
  const event: TechCompleted = { id: `event-${state.serial}`, kind: 'techCompleted', turn: state.turn, factionId, techId }
  return { ...next, events: [...next.events, event], serial: state.serial + 1 }
}

/**
 * The faction researches the technology from now on (in place of the one it researched, whose progress is kept),
 * the points 宙に浮いた going into it. Should they reach its cost it is completed now (a faction the player plays is
 * told: TechCompleted), and what is left over 宙に浮いた for the next it chooses
 */
export function setResearch(state: GameState, factionId: FactionId, techId: string): GameState {
  const problem = setResearchProblem(state, factionId, techId)
  if (problem) throw new GameRuleError(problem)
  const research = researchOf(state, factionId)
  if (research.current === techId) return state
  return withInvested(state, factionId, choose(state, factionId, research, techId), techId)
}

/**
 * Research points for the faction at once (dismantling a relic): they go into the technology it researches, as
 * setResearch's do, or, researching none, 宙に浮いた until it chooses one
 */
export function addResearchPoints(state: GameState, factionId: FactionId, points: number): GameState {
  const research = researchOf(state, factionId)
  if (!research.current) return withResearch(state, factionId, { ...research, carry: research.carry + points })
  return withInvested(state, factionId, invest(state, factionId, research, research.current, points), research.current)
}

/**
 * Research points 宙に浮いた: the faction researches nothing while it has points to put in, and something is left to
 * research. A faction the player plays chooses before it ends its turn
 */
export function mustChooseResearch(state: GameState, factionId: FactionId): boolean {
  const research = researchOf(state, factionId)
  return research.current === null && research.carry > 0 && availableTechs(state, factionId).length > 0
}

/** What a CPU faction researches: of the technologies it can, the one taking the fewest points (the first in data order of those) */
export function chooseResearchForCpu(state: GameState, factionId: FactionId): string | null {
  const available = availableTechs(state, factionId).map((id) => TECH_MAP[id])
  if (available.length === 0) return null
  return available.reduce((best, t) => (t.cost < best.cost ? t : best)).id
}

/**
 * A CPU faction researching nothing chooses something (chooseResearchForCpu), the points 宙に浮いた going into it;
 * those completing it, the next too
 */
export function withCpuResearch(research: FactionResearch, state: GameState, factionId: FactionId): FactionResearch {
  let next = research
  while (next.current === null) {
    const techId = chooseResearchForCpu(withResearch(state, factionId, next), factionId)
    if (!techId) break
    next = choose(state, factionId, next, techId)
  }
  return next
}

/** The research points each branch of a city's research buildings gives a turn, before the branch bonus */
export function cityResearchPoints(state: GameState, cityId: CityId): Record<TechBranch, number> {
  const points: Record<TechBranch, number> = { physical: 0, arcane: 0 }
  for (const id of state.cities[cityId]?.buildings ?? []) {
    for (const effect of BUILDING_MAP[id]?.effects ?? []) if (effect.kind === 'researchPoints') points[effect.branch] += effect.value
  }
  return points
}

/** The faction's research buildings' points a turn researching a technology of `branch` (none: no bonus), before rounding */
export function buildingResearchPoints(state: GameState, factionId: FactionId, branch: TechBranch | null): number {
  let sum = 0
  for (const cityId of citiesOf(state, factionId)) {
    const points = cityResearchPoints(state, cityId)
    for (const b of ['physical', 'arcane'] as const) sum += points[b] * (b === branch ? 1 + RESEARCH_BRANCH_BONUS : 1)
  }
  return sum
}

/** The research points a faction gets next turn */
export interface ResearchForecast {
  /** Its research buildings' points by branch (before the bonus), and with the bonus for the technology (before rounding) */
  branches: Readonly<Record<TechBranch, number>>
  buildings: number
  /** Its 研究 officers', least and most (the gold they spend rolled, the fractions rounded) */
  officers: readonly [number, number]
  /** In all, least and most */
  total: readonly [number, number]
}

/** What the faction's research gets next turn researching `techId` (the branch bonus its; omitted: what it researches) */
export function researchOutput(state: GameState, factionId: FactionId, techId: string | null = researchOf(state, factionId).current): ResearchForecast {
  const branch = techId ? TECH_MAP[techId]?.branch ?? null : null
  const branches: Record<TechBranch, number> = { physical: 0, arcane: 0 }
  let officers: [number, number] = [0, 0]
  for (const cityId of citiesOf(state, factionId)) {
    const points = cityResearchPoints(state, cityId)
    branches.physical += points.physical
    branches.arcane += points.arcane
    const gain = cityOutput(state, cityId).affairs.research?.gain
    if (gain) officers = [officers[0] + gain[0], officers[1] + gain[1]]
  }
  const buildings = buildingResearchPoints(state, factionId, branch)
  return { branches, buildings, officers, total: [Math.floor(buildings) + officers[0], Math.ceil(buildings) + officers[1]] }
}

/** Research points still to put into a technology: its cost less its progress (and the points 宙に浮いた choosing it would put in) */
export function researchLeft(state: GameState, factionId: FactionId, techId: string): number {
  const tech = TECH_MAP[techId]
  if (!tech) return 0
  const research = researchOf(state, factionId)
  if (research.researched.includes(techId)) return 0
  const carry = research.current === techId ? 0 : research.carry
  return Math.max(0, tech.cost - (research.progress[techId] ?? 0) - carry)
}

/**
 * Economy runs until a technology is completed, researching it from now on at what the faction gets a turn (the
 * middle of researchOutput): 0 when researched or when the points 宙に浮いた complete it as it is chosen, 1 at the
 * next run when nothing is left to put in, null when it gets no points
 */
export function researchTurns(state: GameState, factionId: FactionId, techId: string | null = researchOf(state, factionId).current): number | null {
  if (!techId || !TECH_MAP[techId]) return null
  const research = researchOf(state, factionId)
  if (research.researched.includes(techId)) return 0
  const left = researchLeft(state, factionId, techId)
  if (left <= 0) return research.current !== techId && research.carry > 0 ? 0 : 1
  const [least, most] = researchOutput(state, factionId, techId).total
  const perTurn = (least + most) / 2
  return perTurn > 0 ? Math.max(1, Math.ceil(left / perTurn)) : null
}

/** The effects of the technologies the faction has researched on each of its cities (cityOutput adds them) */
export const techBonus = (state: GameState, factionId: FactionId): BuildingBonus => researchedBonus(researchOf(state, factionId).researched)

/** Debugging: research points for the faction, into the technology it researches (or 宙に浮いた) */
export function debugAddResearchPoints(state: GameState, factionId: FactionId, points: number): GameState {
  const research = researchOf(state, factionId)
  return withResearch(state, factionId, research.current
    ? { ...research, progress: { ...research.progress, [research.current]: (research.progress[research.current] ?? 0) + points } }
    : { ...research, carry: research.carry + points })
}

/** Debugging: the technology the faction researches gets all the points it takes, completed by the next economy run */
export function debugFillResearch(state: GameState, factionId: FactionId): GameState {
  const research = researchOf(state, factionId)
  const tech = research.current ? TECH_MAP[research.current] : undefined
  return tech ? withResearch(state, factionId, { ...research, progress: { ...research.progress, [tech.id]: tech.cost } }) : state
}
