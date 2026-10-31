import { BUILDING_MAP } from '../../data/buildings'
import { MAX_MORALE, mixMorale } from '../army'
import type {
  AffairsResult, CityEconomy, CityId, CityRecord, CitySnapshot, CityState, ConstructionWork, EconomyEvent, EconomyReport, FactionEconomy, FactionId,
  GameState, OfficerRole,
} from '../types'
import { runRelics } from '../relics/runRelics'
import { runResearch } from '../research/runResearch'
import { CITY_IDS, FACTION_IDS } from '../world'
import { AFFAIRS_BUDGET_MAX, AFFAIRS_BUDGET_MIN, SALARY } from './balance'
import { cityRecord, explainCity } from './cityLog'
import { affairsGain, cityTechBonus, FUNDED_ROLES, officerTraining, outputOf, populationGrowth, tierOf, type BuildingBonus, type CityOutput, type PopulationGrowth } from './output'

function snapshot(city: CityState, cityId: CityId, tech: BuildingBonus): CitySnapshot {
  const { tier, market, production } = outputOf(city, cityId, tech)
  const { population, storedSupplies, troops, troopMorale, construction } = city
  return { population, tier, market, production, storedSupplies, troops, troopMorale, construction }
}

/**
 * What a faction's treasury gains and pays at the next economy run: the income
 * of its cities and its knights' salaries (paid as far as the gold goes)
 */
export function treasuryForecast(state: GameState, factionId: FactionId): FactionEconomy {
  const income = CITY_IDS.filter((id) => state.cityOwners[id] === factionId)
    .reduce((sum, id) => sum + outputOf(state.cities[id], id, cityTechBonus(state, id)).income, 0)
  // Its knights held prisoner are paid nothing
  const knights = Object.values(state.characters).filter((c) => c.factionId === factionId && !c.prisoner).length
  const before = state.gold[factionId] ?? 0
  const salary = Math.min(before + income, knights * SALARY)
  return { income, salary, before, after: before + income - salary }
}

/**
 * The officers' work: each funded role with officers spends a random AFFAIRS_BUDGET_MIN..MAX of its budget
 * (what is left at most; a role with no budget left does nothing) and rolls again to round what it raises (affairsGain),
 * the 訓練 officers train for nothing
 */
function runAffairs(city: CityState, cityId: CityId, tech: BuildingBonus, random: () => number) {
  const output = outputOf(city, cityId, tech)
  const affairs: Partial<Record<OfficerRole, AffairsResult>> = {}
  const affairsBudget = { ...city.affairsBudget }
  for (const role of FUNDED_ROLES) {
    const budget = affairsBudget[role] ?? 0
    if (output.officers[role] <= 0 || budget <= 0) continue
    const rolled = AFFAIRS_BUDGET_MIN + Math.floor(random() * (AFFAIRS_BUDGET_MAX - AFFAIRS_BUDGET_MIN + 1))
    const spent = Math.min(budget, rolled)
    affairsBudget[role] = budget - spent
    affairs[role] = { spent, gain: affairsGain(role, output.officers[role], spent, output.buildings.recruitPct + output.tech.recruitPct, random) }
  }
  if (output.officers.training > 0 && city.troops > 0) affairs.training = { spent: 0, gain: Math.round(officerTraining(output.officers.training)) }
  return { affairs, affairsBudget }
}

/** What is completed by a work: a building standing (an upgrade in the place of the one it was built over), or a relic to go into the box */
function completeWork(work: ConstructionWork, buildings: readonly string[]): { buildings: readonly string[]; event: EconomyEvent } {
  if (work.kind !== 'building') return { buildings, event: { kind: 'relicCompleted', relicId: work.relicId } }
  const { buildingId } = work
  const replaced = BUILDING_MAP[buildingId]?.upgradeFrom
  return {
    buildings: replaced && buildings.includes(replaced)
      ? buildings.map((id) => (id === replaced ? buildingId : id))
      : [...buildings, buildingId],
    event: { kind: 'buildingCompleted', buildingId },
  }
}

/**
 * A city's turn: its officers at work, supplies into what it builds, repairs or produces (or its store),
 * its soldiers trained and recruited, its population grown (its faction's technologies `tech` as the run started)
 */
function growCity(
  city: CityState, cityId: CityId, tech: BuildingBonus, random: () => number,
): { city: CityState; events: EconomyEvent[]; affairs: CityEconomy['affairs']; growth: PopulationGrowth; output: CityOutput } {
  const output = outputOf(city, cityId, tech)
  const { affairs, affairsBudget } = runAffairs(city, cityId, tech, random)
  const recruits = affairs.recruitment?.gain ?? 0
  const events: EconomyEvent[] = []
  let { storedSupplies, construction, buildings } = city
  if (construction && !construction.paused) {
    const invested = construction.investedSupplies + output.production
    if (invested >= construction.requiredSupplies) {
      const completed = completeWork(construction.work, buildings)
      buildings = completed.buildings
      storedSupplies += invested - construction.requiredSupplies
      events.push(completed.event)
      construction = null
    } else {
      construction = { ...construction, investedSupplies: invested }
    }
  } else {
    storedSupplies += output.production
  }
  // Raised now, the base counts for the effective values from the next run (for the population at once)
  const market = city.market + (affairs.commerce?.gain ?? 0)
  const production = city.production + (affairs.production?.gain ?? 0)
  // People are drawn by the 商業・生産 the officers have just raised and the buildings standing now
  const growth = populationGrowth({ market, production, buildings, assignments: city.assignments }, tech)
  const population = city.population + growth.total
  // A 聖地・要塞 does not grow in scale
  if (!output.fixedScale && tierOf(population) > output.tier) events.push({ kind: 'tierUp', tier: tierOf(population) })
  // The soldiers train, then the recruits join them at the recruits' morale
  const trained = Math.min(MAX_MORALE, city.troopMorale + output.training)
  const grown: CityState = {
    ...city,
    population,
    market,
    production,
    storedSupplies,
    troops: city.troops + recruits,
    troopMorale: mixMorale(city.troops, trained, recruits, output.recruitMorale),
    buildings,
    construction,
    affairsBudget,
    recruited: 0,
  }
  return { city: grown, events, affairs, growth, output }
}

/**
 * The economy of every city, run once a turn between the march phase and the
 * next strategy phase (after the battles moved the cities and the knights):
 * 1. each faction gains the gold of its cities' effective 商業 and pays its knights' salaries (down to 0, not below),
 * 2. each city's 商業・生産 officers spend gold of their budget raising its base 商業・生産,
 * 3. its effective 生産 goes into what it builds, repairs or produces (the surplus of one completed into its store)
 *    or, with none, into its store,
 * 4. its soldiers train (by themselves, and by its 訓練 officers and buildings), and its 募兵 officers
 *    spend gold of their budget on soldiers, who join at the recruits' morale,
 * 5. its population grows by its base 商業・生産 (as the officers raised them), its buildings (with one completed now)
 *    and its lord, and its tier and building slots with it (tierOf, slotsOf; a 聖地・要塞 keeps FIXED_SLOTS),
 * 6. each faction's research points (its research buildings' and its 研究 officers') go into the technology it
 *    researches (runResearch); a technology completed counts for its cities from the next run,
 * 7. the relics completed in its cities and those 法王府 was asked to repair come into its box (runRelics).
 * Otherwise the bonuses and the base values are those before the run (a building completed or a base raised now counts from the next).
 * `turn` is the turn starting; `random` rolls the gold the officers spend.
 * The report (lastEconomy) keeps each city's numbers before and after, and what its officers did;
 * cityHistory gains each city's numbers for the turn, with the formulas that reached them.
 */
export function runEconomy(state: GameState, turn: number, random: () => number = Math.random): GameState {
  const factions: Record<FactionId, FactionEconomy> = {}
  const gold = { ...state.gold }
  for (const factionId of FACTION_IDS) {
    factions[factionId] = treasuryForecast(state, factionId)
    gold[factionId] = factions[factionId].after
  }

  const cities: Record<CityId, CityState> = {}
  const grown: Record<CityId, ReturnType<typeof growCity>> = {}
  for (const id of CITY_IDS) {
    grown[id] = growCity(state.cities[id], id, cityTechBonus(state, id), random)
    cities[id] = grown[id].city
  }
  const officerPoints = Object.fromEntries(CITY_IDS.map((id) => [id, grown[id].affairs.research?.gain ?? 0]))
  const research = runResearch(state, turn, officerPoints, random)

  // The numbers of the new turn: with the technologies completed now
  const after: GameState = { ...state, gold, cities, research: research.research }
  const reports: Record<CityId, CityEconomy> = {}
  const cityHistory: Record<CityId, readonly CityRecord[]> = { ...state.cityHistory }
  for (const id of CITY_IDS) {
    const before = state.cities[id]
    const { city, events, affairs, growth, output } = grown[id]
    const tech = cityTechBonus(after, id)
    reports[id] = { before: snapshot(before, id, output.tech), after: snapshot(city, id, tech), affairs, events }
    const log = explainCity(id, before, city, output, affairs, growth, tech)
    cityHistory[id] = [...cityHistory[id] ?? [], cityRecord(city, id, turn, log, tech)]
  }

  const report: EconomyReport = { turn, factions, research: research.report, cities: reports }
  const told: GameState = { ...after, lastEconomy: report, cityHistory, events: [...state.events, ...research.events], serial: research.serial }
  return runRelics(told, turn, reports)
}
