import { BUILDING_MAP, type BuildingEffectKind, type CityTier } from '../../data/buildings'
import { CHARACTER_MAP } from '../../data/character'
import { CITY_MAP } from '../../data/city'
import type { CharacterId, CityAssignments, CityId, CityState, GameState } from '../types'
import {
  ABILITY_BASE, GOLD_PER_MARKET, GOVERNOR_MAX_BONUS, GROWTH_MARKET, GROWTH_MAX, GROWTH_RATE, GROWTH_SLOWDOWN_POPULATION,
  NATURAL_TRAINING, OFFICER_FALLOFF, OFFICER_MAX_BONUS, OFFICER_MAX_RECRUIT_RATE, OFFICER_MAX_TRAINING, PERSONALITY_BONUSES,
  RECRUIT_MORALE, RECRUIT_PER_PRODUCTION, TIER_POPULATION, TIER_SLOTS,
} from './balance'

/** What a city puts out in a turn, shared by the economy run and the screens' forecasts */

export const tierOf = (population: number): CityTier =>
  population >= TIER_POPULATION[1] ? 3 : population >= TIER_POPULATION[0] ? 2 : 1

export const slotsOf = (tier: CityTier): number => TIER_SLOTS[tier]

/** Bonuses as fractions (0.1 = +10%) */
export interface GovernorBonus {
  market: number
  production: number
  growth: number
}

/** What the officers add */
export interface OfficerBonus {
  /** 商業・生産 as fractions of the base */
  market: number
  production: number
  /** Morale added a turn */
  training: number
  /** Share of the population drawn into soldiers a turn */
  recruitRate: number
}

/** The buildings' effects summed; the percentages as fractions, recruitMorale as morale, tradeRoutes as routes (not used yet) */
export type BuildingBonus = Record<Exclude<BuildingEffectKind, 'etc'>, number>

/** 0 up to ABILITY_BASE, 1 at 100 */
const abilityScale = (value: number) => Math.max(0, (value - ABILITY_BASE) / (100 - ABILITY_BASE))

export function governorBonus(characterId: CharacterId | undefined): GovernorBonus {
  const character = characterId ? CHARACTER_MAP[characterId] : undefined
  if (!character) return { market: 0, production: 0, growth: 0 }
  const bonus = {
    market: abilityScale(character.politics) * GOVERNOR_MAX_BONUS,
    production: abilityScale((character.politics + character.intelligence) / 2) * GOVERNOR_MAX_BONUS,
    growth: abilityScale(character.charm) * GOVERNOR_MAX_BONUS,
  }
  for (const tag of character.personality ?? []) {
    const extra = PERSONALITY_BONUSES[tag]
    bonus.market += extra?.market ?? 0
    bonus.production += extra?.production ?? 0
    bonus.growth += extra?.growth ?? 0
  }
  return bonus
}

/** The best officer counts fully, each one after OFFICER_FALLOFF of the one before */
const diminishing = (values: number[]) =>
  values.sort((a, b) => b - a).reduce((sum, value, i) => sum + value * OFFICER_FALLOFF ** i, 0)

export function officerBonus(officers: CityAssignments['officers']): OfficerBonus {
  const scaled = (ids: readonly CharacterId[] | undefined, ability: 'politics' | 'strength' | 'charm', max: number) =>
    diminishing((ids ?? []).flatMap((id) => CHARACTER_MAP[id] ?? []).map((c) => abilityScale(c[ability]) * max))
  return {
    market: scaled(officers.commerce, 'politics', OFFICER_MAX_BONUS),
    production: scaled(officers.production, 'politics', OFFICER_MAX_BONUS),
    training: scaled(officers.training, 'strength', OFFICER_MAX_TRAINING),
    recruitRate: scaled(officers.recruitment, 'charm', OFFICER_MAX_RECRUIT_RATE),
  }
}

export function buildingBonus(buildings: readonly string[]): BuildingBonus {
  const bonus: BuildingBonus = { marketPct: 0, productionPct: 0, growthPct: 0, trainingPct: 0, recruitPct: 0, recruitMorale: 0, tradeRoutes: 0 }
  for (const id of buildings) {
    for (const effect of BUILDING_MAP[id]?.effects ?? []) {
      if (effect.kind === 'etc') continue
      bonus[effect.kind] += effect.kind === 'recruitMorale' || effect.kind === 'tradeRoutes' ? effect.value : effect.value / 100
    }
  }
  return bonus
}

export interface CityOutput {
  tier: CityTier
  slots: number
  /** 商業・生産 of the city data */
  baseMarket: number
  baseProduction: number
  /** Effective 商業・生産: the base with the governor's, the officers' and the buildings' bonuses */
  market: number
  production: number
  governor: GovernorBonus
  officers: OfficerBonus
  buildings: BuildingBonus
  /** Gold the city adds to its faction's treasury a turn */
  income: number
  /** Population it gains next turn */
  growth: number
  /** Morale its soldiers gain next turn (none without soldiers) */
  training: number
  /** Soldiers its 募兵 officers draw from the population next turn */
  drafted: number
  /** Soldiers it can recruit in a turn (for gold) */
  recruitCap: number
  /** Morale of the soldiers it recruits */
  recruitMorale: number
}

/** What a city in the state puts out (the economy run applies it at the start of the next turn) */
export function cityOutput(state: GameState, cityId: CityId): CityOutput {
  return outputOf(cityId, state.cities[cityId])
}

export function outputOf(cityId: CityId, city: CityState): CityOutput {
  const data = CITY_MAP[cityId]
  const baseMarket = data?.market ?? 0
  const baseProduction = data?.production ?? 0
  const tier = tierOf(city.population)
  const governor = governorBonus(city.assignments.governor)
  const officers = officerBonus(city.assignments.officers)
  const buildings = buildingBonus(city.buildings)
  const market = Math.round(baseMarket * (1 + governor.market + officers.market + buildings.marketPct))
  const production = Math.round(baseProduction * (1 + governor.production + officers.production + buildings.productionPct))
  const growth = Math.min(GROWTH_MAX, Math.round(
    city.population * GROWTH_RATE * (market / GROWTH_MARKET) / (1 + city.population / GROWTH_SLOWDOWN_POPULATION)
    * (1 + governor.growth + buildings.growthPct)))
  return {
    tier,
    slots: slotsOf(tier),
    baseMarket,
    baseProduction,
    market,
    production,
    governor,
    officers,
    buildings,
    income: Math.floor(market * GOLD_PER_MARKET),
    growth,
    training: city.troops > 0 ? Math.round((NATURAL_TRAINING + officers.training) * (1 + buildings.trainingPct)) : 0,
    drafted: Math.floor(city.population * officers.recruitRate * (1 + buildings.recruitPct)),
    recruitCap: Math.floor(production * RECRUIT_PER_PRODUCTION * (1 + buildings.recruitPct)),
    recruitMorale: RECRUIT_MORALE + buildings.recruitMorale,
  }
}
