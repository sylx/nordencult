import { BUILDING_MAP } from '../../data/buildings'
import { MAX_MORALE } from '../army'
import type {
  CityEconomy, CityId, CitySnapshot, CityState, EconomyEvent, EconomyReport, FactionEconomy, FactionId, GameState,
} from '../types'
import { CITY_IDS, FACTION_IDS } from '../world'
import { SALARY } from './balance'
import { outputOf, tierOf } from './output'

function snapshot(cityId: CityId, city: CityState): CitySnapshot {
  const { tier, market, production } = outputOf(cityId, city)
  const { population, storedSupplies, troops, troopMorale, construction } = city
  return { population, tier, market, production, storedSupplies, troops, troopMorale, construction }
}

/**
 * What a faction's treasury gains and pays at the next economy run: the income
 * of its cities and its knights' salaries (paid as far as the gold goes)
 */
export function treasuryForecast(state: GameState, factionId: FactionId): FactionEconomy {
  const income = CITY_IDS.filter((id) => state.cityOwners[id] === factionId)
    .reduce((sum, id) => sum + outputOf(id, state.cities[id]).income, 0)
  const knights = Object.values(state.characters).filter((c) => c.factionId === factionId).length
  const before = state.gold[factionId] ?? 0
  const salary = Math.min(before + income, knights * SALARY)
  return { income, salary, before, after: before + income - salary }
}

/** A city's turn: supplies into its construction (or its store), its soldiers trained, its population grown */
function growCity(cityId: CityId, city: CityState): { city: CityState; events: EconomyEvent[] } {
  const output = outputOf(cityId, city)
  const events: EconomyEvent[] = []
  let { storedSupplies, construction, buildings } = city
  if (construction && !construction.paused) {
    const invested = construction.investedSupplies + output.production
    if (invested >= construction.requiredSupplies) {
      // An upgrade takes the place of the building it was built over
      const { buildingId } = construction
      const replaced = BUILDING_MAP[buildingId]?.upgradeFrom
      buildings = replaced && buildings.includes(replaced)
        ? buildings.map((id) => (id === replaced ? buildingId : id))
        : [...buildings, buildingId]
      storedSupplies += invested - construction.requiredSupplies
      events.push({ kind: 'buildingCompleted', buildingId: construction.buildingId })
      construction = null
    } else {
      construction = { ...construction, investedSupplies: invested }
    }
  } else {
    storedSupplies += output.production
  }
  const population = city.population + output.growth
  if (tierOf(population) > output.tier) events.push({ kind: 'tierUp', tier: tierOf(population) })
  return {
    city: {
      ...city,
      population,
      storedSupplies,
      troopMorale: Math.min(MAX_MORALE, city.troopMorale + output.training),
      buildings,
      construction,
      recruited: 0,
    },
    events,
  }
}

/**
 * The economy of every city, run once a turn between the march phase and the
 * next strategy phase (after the battles moved the cities and the knights):
 * 1. each faction gains the gold of its cities' effective 商業 and pays its knights' salaries (down to 0, not below),
 * 2. each city's effective 生産 goes into its construction (the surplus of a completed building into its store)
 *    or, with nothing being built, into its store,
 * 3. its soldiers train (by themselves, and by its military officers and buildings),
 * 4. its population grows, and its tier with it.
 * The governor's, officers' and buildings' bonuses are those before the run (a building completed now counts from the next).
 * `turn` is the turn starting; the report (lastEconomy) keeps each city's numbers before and after.
 */
export function runEconomy(state: GameState, turn: number): GameState {
  const factions: Record<FactionId, FactionEconomy> = {}
  const gold = { ...state.gold }
  for (const factionId of FACTION_IDS) {
    factions[factionId] = treasuryForecast(state, factionId)
    gold[factionId] = factions[factionId].after
  }

  const cities: Record<CityId, CityState> = {}
  const reports: Record<CityId, CityEconomy> = {}
  for (const id of CITY_IDS) {
    const before = state.cities[id]
    const { city, events } = growCity(id, before)
    cities[id] = city
    reports[id] = { before: snapshot(id, before), after: snapshot(id, city), events }
  }

  const report: EconomyReport = { turn, factions, cities: reports }
  return { ...state, gold, cities, lastEconomy: report }
}
