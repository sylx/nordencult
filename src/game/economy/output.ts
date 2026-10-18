import { BUILDING_MAP, type BuildingEffectKind, type CityTier } from '../../data/buildings'
import { CHARACTER_MAP } from '../../data/character'
import type { CharacterId, CityAssignments, CityId, CityState, FundedRole, GameState, OfficerRole } from '../types'
import {
  ABILITY_BASE, AFFAIRS_BUDGET_MAX, AFFAIRS_BUDGET_MIN, GOLD_PER_MARKET, GOVERNOR_MAX_BONUS, GROWTH_COEF_COMMERCE, GROWTH_COEF_PRODUCTION,
  GROWTH_COEF_TRAINING, GROWTH_MARKET, GROWTH_MAX, GROWTH_RATE, GROWTH_SLOWDOWN_POPULATION, NATURAL_TRAINING,
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

/** Each officer role's power (X): the sum of its officers' weighted abilities, 0 without officers */
export type OfficerPower = Record<OfficerRole, number>

type Ability = 'politics' | 'intelligence' | 'leadership' | 'strength' | 'charm'

/** The abilities each role weighs, and how much */
export const OFFICER_WEIGHTS: Readonly<Record<OfficerRole, Partial<Record<Ability, number>>>> = {
  commerce: { politics: 2, intelligence: 1 },
  production: { politics: 2, intelligence: 1 },
  training: { strength: 2, leadership: 1 },
  recruitment: { charm: 3, strength: 1 },
}

export const FUNDED_ROLES: readonly FundedRole[] = ['commerce', 'production', 'recruitment']

/** The buildings' effects summed; the percentages as fractions, recruitMorale as morale, tradeRoutes as routes (not used yet) */
export type BuildingBonus = Record<Exclude<BuildingEffectKind, 'etc'>, number>

/** 0 up to ABILITY_BASE, 1 at 100 */
const abilityScale = (value: number) => Math.max(0, (value - ABILITY_BASE) / (100 - ABILITY_BASE))

export function governorBonus(characterId: CharacterId | undefined): GovernorBonus {
  const character = characterId ? CHARACTER_MAP[characterId] : undefined
  if (!character) return { market: 0, production: 0, growth: 0 }
  return {
    market: abilityScale(character.politics) * GOVERNOR_MAX_BONUS,
    production: abilityScale((character.politics + character.intelligence) / 2) * GOVERNOR_MAX_BONUS,
    growth: abilityScale(character.charm) * GOVERNOR_MAX_BONUS,
  }
}

/** A knight's weighted ability for a role, e.g. (政治×2 + 知力) / 3 for 商業 */
export function officerAbility(characterId: CharacterId, role: OfficerRole): number {
  const character = CHARACTER_MAP[characterId]
  if (!character) return 0
  const weights = Object.entries(OFFICER_WEIGHTS[role]) as [Ability, number][]
  return weights.reduce((sum, [ability, weight]) => sum + character[ability] * weight, 0) / weights.reduce((sum, [, weight]) => sum + weight, 0)
}

export function officerPower(officers: CityAssignments['officers']): OfficerPower {
  const power = (role: OfficerRole) => (officers[role] ?? []).reduce((sum, id) => sum + officerAbility(id, role), 0)
  return { commerce: power('commerce'), production: power('production'), training: power('training'), recruitment: power('recruitment') }
}

/**
 * What a funded role's officers of this power raise spending this much gold: base 商業・生産 by
 * max(1, spent × X/100 × GROWTH_COEF_*), or as many soldiers as spent × X/100 (with the buildings' 募兵 bonus).
 * Nothing when they spend nothing
 */
export function affairsGain(role: FundedRole, power: number, spent: number, recruitPct = 0): number {
  if (spent <= 0 || power <= 0) return 0
  if (role === 'recruitment') return Math.floor(spent * (power / 100) * (1 + recruitPct))
  const coef = role === 'commerce' ? GROWTH_COEF_COMMERCE : GROWTH_COEF_PRODUCTION
  return Math.round(Math.max(1, spent * (power / 100) * coef))
}

/** Morale the 訓練 officers of this power add a turn: max(1, X × GROWTH_COEF_TRAINING), none without officers */
export const officerTraining = (power: number) => (power > 0 ? Math.max(1, power * GROWTH_COEF_TRAINING) : 0)

/** What a funded role's officers will do next turn, the gold rolled being anything from AFFAIRS_BUDGET_MIN to MAX */
export interface AffairsForecast {
  /** Gold they spend, least and most (what is left of the budget at most; [0, 0] when it is used up) */
  spend: readonly [number, number]
  /** What it raises, least and most */
  gain: readonly [number, number]
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
  /** Base 商業・生産 (the city data's at the start, raised by the officers since) */
  baseMarket: number
  baseProduction: number
  /** Effective 商業・生産: the base with the governor's and the buildings' bonuses */
  market: number
  production: number
  governor: GovernorBonus
  officers: OfficerPower
  /** What the funded roles' officers will do next turn (roles without officers left out) */
  affairs: Partial<Record<FundedRole, AffairsForecast>>
  buildings: BuildingBonus
  /** Gold the city adds to its faction's treasury a turn */
  income: number
  /** Population it gains next turn */
  growth: number
  /** Morale its soldiers gain next turn, by themselves and by its 訓練 officers (none without soldiers) */
  training: number
  /** Soldiers it can recruit in a turn (for gold) */
  recruitCap: number
  /** Morale of the soldiers it recruits */
  recruitMorale: number
}

/** What a city in the state puts out (the economy run applies it at the start of the next turn) */
export function cityOutput(state: GameState, cityId: CityId): CityOutput {
  return outputOf(state.cities[cityId])
}

export function outputOf(city: CityState): CityOutput {
  const { market: baseMarket, production: baseProduction } = city
  const tier = tierOf(city.population)
  const governor = governorBonus(city.assignments.governor)
  const officers = officerPower(city.assignments.officers)
  const buildings = buildingBonus(city.buildings)
  const market = Math.round(baseMarket * (1 + governor.market + buildings.marketPct))
  const production = Math.round(baseProduction * (1 + governor.production + buildings.productionPct))
  const affairs: Partial<Record<FundedRole, AffairsForecast>> = {}
  for (const role of FUNDED_ROLES) {
    if (officers[role] <= 0) continue
    const budget = city.affairsBudget[role] ?? 0
    const spend = [Math.min(budget, AFFAIRS_BUDGET_MIN), Math.min(budget, AFFAIRS_BUDGET_MAX)] as const
    const gain = (spent: number) => affairsGain(role, officers[role], spent, buildings.recruitPct)
    affairs[role] = { spend, gain: [gain(spend[0]), gain(spend[1])] }
  }
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
    affairs,
    buildings,
    income: Math.floor(market * GOLD_PER_MARKET),
    growth,
    training: city.troops > 0 ? Math.round((NATURAL_TRAINING + officerTraining(officers.training)) * (1 + buildings.trainingPct)) : 0,
    recruitCap: Math.floor(production * RECRUIT_PER_PRODUCTION * (1 + buildings.recruitPct)),
    recruitMorale: RECRUIT_MORALE + buildings.recruitMorale,
  }
}
