import { BUILDING_MAP } from '../../data/buildings'
import { MAX_MORALE, mixMorale } from '../army'
import type {
  AffairsResult, CityEconomy, CityId, CitySnapshot, CityState, EconomyEvent, EconomyReport, FactionEconomy, FactionId, GameState, OfficerRole,
} from '../types'
import { CITY_IDS, FACTION_IDS } from '../world'
import { AFFAIRS_BUDGET_MAX, AFFAIRS_BUDGET_MIN, SALARY } from './balance'
import { affairsGain, FUNDED_ROLES, officerTraining, outputOf, populationGrowth, tierOf } from './output'

function snapshot(city: CityState, cityId: CityId): CitySnapshot {
  const { tier, market, production } = outputOf(city, cityId)
  const { population, storedSupplies, troops, troopMorale, construction } = city
  return { population, tier, market, production, storedSupplies, troops, troopMorale, construction }
}

/**
 * What a faction's treasury gains and pays at the next economy run: the income
 * of its cities and its knights' salaries (paid as far as the gold goes)
 */
export function treasuryForecast(state: GameState, factionId: FactionId): FactionEconomy {
  const income = CITY_IDS.filter((id) => state.cityOwners[id] === factionId)
    .reduce((sum, id) => sum + outputOf(state.cities[id], id).income, 0)
  const knights = Object.values(state.characters).filter((c) => c.factionId === factionId).length
  const before = state.gold[factionId] ?? 0
  const salary = Math.min(before + income, knights * SALARY)
  return { income, salary, before, after: before + income - salary }
}

/**
 * The officers' work: each funded role with officers spends a random AFFAIRS_BUDGET_MIN..MAX of its budget
 * (what is left at most; a role with no budget left does nothing), the 訓練 officers train for nothing
 */
function runAffairs(city: CityState, cityId: CityId, random: () => number) {
  const output = outputOf(city, cityId)
  const affairs: Partial<Record<OfficerRole, AffairsResult>> = {}
  const affairsBudget = { ...city.affairsBudget }
  for (const role of FUNDED_ROLES) {
    const budget = affairsBudget[role] ?? 0
    if (output.officers[role] <= 0 || budget <= 0) continue
    const rolled = AFFAIRS_BUDGET_MIN + Math.floor(random() * (AFFAIRS_BUDGET_MAX - AFFAIRS_BUDGET_MIN + 1))
    const spent = Math.min(budget, rolled)
    affairsBudget[role] = budget - spent
    affairs[role] = { spent, gain: affairsGain(role, output.officers[role], spent, output.buildings.recruitPct) }
  }
  if (output.officers.training > 0 && city.troops > 0) affairs.training = { spent: 0, gain: Math.round(officerTraining(output.officers.training)) }
  return { affairs, affairsBudget }
}

/**
 * A city's turn: its officers at work, supplies into its construction (or its store),
 * its soldiers trained and recruited, its population grown
 */
function growCity(
  city: CityState, cityId: CityId, random: () => number,
): { city: CityState; events: EconomyEvent[]; affairs: CityEconomy['affairs'] } {
  const output = outputOf(city, cityId)
  const { affairs, affairsBudget } = runAffairs(city, cityId, random)
  const recruits = affairs.recruitment?.gain ?? 0
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
  // Raised now, the base counts for the effective values from the next run (for the population at once)
  const market = city.market + (affairs.commerce?.gain ?? 0)
  const production = city.production + (affairs.production?.gain ?? 0)
  // People are drawn by the 商業・生産 the officers have just raised and the buildings standing now
  const population = city.population + populationGrowth({ market, production, buildings, assignments: city.assignments }).total
  // A 聖地・要塞 does not grow in scale
  if (!output.fixedScale && tierOf(population) > output.tier) events.push({ kind: 'tierUp', tier: tierOf(population) })
  // The soldiers train, then the recruits join them at the recruits' morale
  const trained = Math.min(MAX_MORALE, city.troopMorale + output.training)
  return {
    city: {
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
    },
    events,
    affairs,
  }
}

/**
 * The economy of every city, run once a turn between the march phase and the
 * next strategy phase (after the battles moved the cities and the knights):
 * 1. each faction gains the gold of its cities' effective 商業 and pays its knights' salaries (down to 0, not below),
 * 2. each city's 商業・生産 officers spend gold of their budget raising its base 商業・生産,
 * 3. its effective 生産 goes into its construction (the surplus of a completed building into its store)
 *    or, with nothing being built, into its store,
 * 4. its soldiers train (by themselves, and by its 訓練 officers and buildings), and its 募兵 officers
 *    spend gold of their budget on soldiers, who join at the recruits' morale,
 * 5. its population grows by its base 商業・生産 (as the officers raised them), its buildings (with one completed now)
 *    and its lord, and its tier and building slots with it (tierOf, slotsOf; a 聖地・要塞 keeps FIXED_SLOTS).
 * Otherwise the bonuses and the base values are those before the run (a building completed or a base raised now counts from the next).
 * `turn` is the turn starting; `random` rolls the gold the officers spend.
 * The report (lastEconomy) keeps each city's numbers before and after, and what its officers did.
 */
export function runEconomy(state: GameState, turn: number, random: () => number = Math.random): GameState {
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
    const { city, events, affairs } = growCity(before, id, random)
    cities[id] = city
    reports[id] = { before: snapshot(before, id), after: snapshot(city, id), affairs, events }
  }

  const report: EconomyReport = { turn, factions, cities: reports }
  return { ...state, gold, cities, lastEconomy: report }
}
