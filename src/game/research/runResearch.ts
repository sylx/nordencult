import { TECH_MAP } from '../../data/techs'
import { roundByChance } from '../economy/output'
import { citiesOf, isPlayerFaction } from '../queries'
import type { CityId, FactionId, FactionResearch, FactionResearchResult, GameState, TechCompleted } from '../types'
import { FACTION_IDS } from '../world'
import { availableTechs, buildingResearchPoints, researchOf, withCpuResearch, withResearch } from './research'

/**
 * Each faction's research in the economy run, after its officers' work (`officerPoints`: the research points each
 * city's 研究 officers made). `state` is as the run started (the research buildings standing then):
 * 1. its cities' research buildings' points, × (1 + RESEARCH_BRANCH_BONUS) for those of the branch of the technology
 *    it researches, the fraction rounded up by that chance (`random`),
 * 2. and its officers' points, go into the technology it researches; reaching its cost, the technology is researched
 *    (completed: none researched now) and the surplus 宙に浮いた (carry). Researching nothing, they all go into carry,
 *    or are lost when nothing is left to research,
 * 3. a CPU faction researching nothing chooses something (chooseResearchForCpu), the carry going into it.
 * A faction the player plays is told the technology completed (TechCompleted on `turn`, the turn starting)
 */
export function runResearch(
  state: GameState, turn: number, officerPoints: Readonly<Record<CityId, number>>, random: () => number = Math.random,
): { research: Record<FactionId, FactionResearch>; report: Record<FactionId, FactionResearchResult>; events: TechCompleted[]; serial: number } {
  const research: Record<FactionId, FactionResearch> = { ...state.research }
  const report: Record<FactionId, FactionResearchResult> = {}
  const events: TechCompleted[] = []
  let serial = state.serial
  for (const factionId of FACTION_IDS) {
    const before = researchOf(state, factionId)
    const tech = before.current ? TECH_MAP[before.current] : undefined
    const buildings = roundByChance(buildingResearchPoints(state, factionId, tech?.branch ?? null), random)
    const officers = citiesOf(state, factionId).reduce((sum, id) => sum + (officerPoints[id] ?? 0), 0)
    const total = buildings + officers
    let next = before
    let completed: string | null = null
    if (tech) {
      const invested = (before.progress[tech.id] ?? 0) + total
      if (invested >= tech.cost) {
        completed = tech.id
        next = {
          current: null, progress: { ...before.progress, [tech.id]: tech.cost }, researched: [...before.researched, tech.id],
          carry: before.carry + invested - tech.cost,
        }
      } else {
        next = { ...before, progress: { ...before.progress, [tech.id]: invested } }
      }
    } else if (total > 0) {
      next = { ...before, carry: availableTechs(state, factionId).length > 0 ? before.carry + total : 0 }
    }
    // Nothing left to research once it completed the last: what is 宙に浮いた is lost
    if (completed && availableTechs(withResearch(state, factionId, next), factionId).length === 0) next = { ...next, carry: 0 }
    if (!isPlayerFaction(state, factionId) && citiesOf(state, factionId).length > 0) next = withCpuResearch(next, state, factionId)
    if (completed && isPlayerFaction(state, factionId)) {
      events.push({ id: `event-${serial++}`, kind: 'techCompleted', turn, factionId, techId: completed })
    }
    research[factionId] = next
    report[factionId] = { buildings, officers, total, techId: tech?.id ?? null, completed }
  }
  return { research, report, events, serial }
}
