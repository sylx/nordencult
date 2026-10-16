import type { CityTier } from '../../data/buildings'
import type { PersonalityTag } from '../../data/characterVoice'

/**
 * The numbers of the economy, all provisional: tune them by playing a few turns
 * (M002-27). Tests compute what they expect from these, so changing them does
 * not break the tests.
 */

/** Gold in each faction's treasury at the start */
export const INITIAL_GOLD = 500

/** Gold a turn per point of effective 商業 */
export const GOLD_PER_MARKET = 0.2
/** Gold each knight of a faction is paid a turn */
export const SALARY = 5

/** Morale of a city's soldiers at the start when its data does not say */
export const INITIAL_MORALE = 70

/** A city's supplies and soldiers at the start, per point of 生産, when its data does not say */
export const INITIAL_SUPPLIES_PER_PRODUCTION = 2
export const INITIAL_TROOPS_PER_PRODUCTION = 5

/** The population a city needs for tier 2 and tier 3 */
export const TIER_POPULATION: readonly [number, number] = [5000, 15000]
/** Building slots of each tier */
export const TIER_SLOTS: Readonly<Record<CityTier, number>> = { 1: 2, 2: 4, 3: 6 }

/**
 * The governor's bonus from an ability: none up to ABILITY_BASE, rising
 * linearly to GOVERNOR_MAX_BONUS at 100 (商業: 政治, 生産: 政治と知力の平均, 成長: 魅力)
 */
export const ABILITY_BASE = 50
export const GOVERNOR_MAX_BONUS = 0.25

/** Bonuses (fractions) a governor's personality adds */
export const PERSONALITY_BONUSES: Partial<Record<PersonalityTag, { market?: number; production?: number; growth?: number }>> = {
  pragmatic: { market: 0.05 },
  strict: { production: 0.05 },
  generous: { growth: 0.1 },
}

/** Morale soldiers gain each turn by themselves */
export const NATURAL_TRAINING = 1
/**
 * Morale the first military officer adds a turn: none up to ABILITY_BASE 統率,
 * rising to MILITARY_MAX_TRAINING at 100. Each officer after adds MILITARY_FALLOFF
 * of what the one before them would (the best first)
 */
export const MILITARY_MAX_TRAINING = 2
/** What the first military officer adds to the soldiers a turn can recruit, likewise from 魅力 */
export const MILITARY_MAX_RECRUIT_BONUS = 0.25
export const MILITARY_FALLOFF = 0.5

/**
 * Population growth a turn: population × GROWTH_RATE × 実効商業 / GROWTH_MARKET,
 * slowed as the city grows (÷ (1 + population / GROWTH_SLOWDOWN_POPULATION)),
 * raised by the governor and the buildings, GROWTH_MAX at most
 */
export const GROWTH_RATE = 0.012
export const GROWTH_MARKET = 400
export const GROWTH_SLOWDOWN_POPULATION = 20000
export const GROWTH_MAX = 500

/** Soldiers a city can recruit in a turn, per point of effective 生産 (before the bonuses) */
export const RECRUIT_PER_PRODUCTION = 5
/** Gold per soldier recruited */
export const RECRUIT_GOLD = 0.2
/** Morale of new soldiers (before the buildings') */
export const RECRUIT_MORALE = 20

/** Supplies and gold each soldier setting out on an invasion costs */
export const SORTIE_SUPPLIES = 0.2
export const SORTIE_GOLD = 0.05
