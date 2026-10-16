import { BUILDING_MAP, type BuildingEffectKind, type CityTier } from '../../data/buildings'
import { CHARACTER_MAP } from '../../data/character'
import { CITY_MAP } from '../../data/city'
import type { CharacterId, CityId, CityState, GameState } from '../types'
import {
  ABILITY_BASE, GOLD_PER_MARKET, GOVERNOR_MAX_BONUS, GROWTH_MARKET, GROWTH_MAX, GROWTH_RATE, GROWTH_SLOWDOWN_POPULATION,
  MILITARY_FALLOFF, MILITARY_MAX_RECRUIT_BONUS, MILITARY_MAX_TRAINING, NATURAL_TRAINING, PERSONALITY_BONUSES, RECRUIT_MORALE,
  RECRUIT_PER_PRODUCTION, TIER_POPULATION, TIER_SLOTS,
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

export interface MilitaryBonus {
  /** Morale added a turn */
  training: number
  /** Soldiers a turn can recruit (a fraction) */
  recruit: number
}

/** The buildings' effects summed; the percentages as fractions, recruitMorale as morale */
export type BuildingBonus = Record<Exclude<BuildingEffectKind, 'mercenary'>, number>

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

/** The best officer counts fully, each one after MILITARY_FALLOFF of the one before */
const diminishing = (values: number[]) =>
  values.sort((a, b) => b - a).reduce((sum, value, i) => sum + value * MILITARY_FALLOFF ** i, 0)

export function militaryBonus(officers: readonly CharacterId[]): MilitaryBonus {
  const characters = officers.flatMap((id) => CHARACTER_MAP[id] ?? [])
  return {
    training: diminishing(characters.map((c) => abilityScale(c.leadership) * MILITARY_MAX_TRAINING)),
    recruit: diminishing(characters.map((c) => abilityScale(c.charm) * MILITARY_MAX_RECRUIT_BONUS)),
  }
}

export function buildingBonus(buildings: readonly string[]): BuildingBonus {
  const bonus: BuildingBonus = { marketPct: 0, productionPct: 0, growthPct: 0, trainingPct: 0, recruitPct: 0, recruitMorale: 0 }
  for (const id of buildings) {
    for (const effect of BUILDING_MAP[id]?.effects ?? []) {
      if (effect.kind === 'mercenary') continue
      bonus[effect.kind] += effect.kind === 'recruitMorale' ? effect.value : effect.value / 100
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
  /** Effective 商業・生産: the base with the governor's and the buildings' bonuses */
  market: number
  production: number
  governor: GovernorBonus
  military: MilitaryBonus
  buildings: BuildingBonus
  /** Gold the city adds to its faction's treasury a turn */
  income: number
  /** Population it gains next turn */
  growth: number
  /** Morale its soldiers gain next turn (none without soldiers) */
  training: number
  /** Soldiers it can recruit in a turn */
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
  const military = militaryBonus(city.assignments.military)
  const buildings = buildingBonus(city.buildings)
  const market = Math.round(baseMarket * (1 + governor.market + buildings.marketPct))
  const production = Math.round(baseProduction * (1 + governor.production + buildings.productionPct))
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
    military,
    buildings,
    income: Math.floor(market * GOLD_PER_MARKET),
    growth,
    training: city.troops > 0 ? Math.round((NATURAL_TRAINING + military.training) * (1 + buildings.trainingPct)) : 0,
    recruitCap: Math.floor(production * RECRUIT_PER_PRODUCTION * (1 + military.recruit + buildings.recruitPct)),
    recruitMorale: RECRUIT_MORALE + buildings.recruitMorale,
  }
}
