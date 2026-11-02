import type { CityTier } from '../../data/buildings'

/**
 * The numbers of the economy, all provisional: tune them by playing a few turns
 * (M002-27). Tests compute what they expect from these, so changing them does
 * not break the tests.
 */

/** Gold in a faction's treasury at the start when its data does not say */
export const INITIAL_GOLD = 500

/** Gold a turn per point of effective 商業 (1: a city's income is its 商業) */
export const GOLD_PER_MARKET = 1
/** Gold each knight of a faction is paid a turn (none for now) */
export const SALARY = 0

/** Morale of a city's soldiers at the start when its data does not say */
export const INITIAL_MORALE = 70

/** A city's supplies and soldiers at the start, per point of 生産, when its data does not say */
export const INITIAL_SUPPLIES_PER_PRODUCTION = 2
export const INITIAL_TROOPS_PER_PRODUCTION = 5

/** The population a city needs for tier 2 (中都市) and tier 3 (大都市); its tier rises as its population reaches them */
export const CITY_POPULATION_TIER_2 = 10000
export const CITY_POPULATION_TIER_3 = 30000
export const TIER_POPULATION: readonly [number, number] = [CITY_POPULATION_TIER_2, CITY_POPULATION_TIER_3]
/** Building slots of each tier */
export const TIER_SLOTS: Readonly<Record<CityTier, number>> = { 1: 2, 2: 4, 3: 6 }
/** Building slots of a city with a fixed picture (聖地・要塞: City.image), whatever its tier */
export const FIXED_SLOTS = 4

/**
 * The governor's bonus from an ability: none up to ABILITY_BASE, rising
 * linearly to GOVERNOR_MAX_BONUS at 100 (商業: 政治, 生産: 政治と知力の平均)
 */
export const ABILITY_BASE = 50
export const GOVERNOR_MAX_BONUS = 0.125

/** Morale soldiers gain each turn by themselves */
export const NATURAL_TRAINING = 1

/** Knights holding one officer role at most */
export const OFFICERS_PER_ROLE = 2

/**
 * 内政担当官. A role's power X is the sum of its officers' weighted abilities
 * (商業・生産: (政治×2 + 知力) / 3, 訓練: (武力×2 + 統率) / 3, 募兵: (魅力×3 + 武力) / 4, 研究: 知力).
 * Each turn the 商業・生産・募兵・研究 officers spend a random AFFAIRS_BUDGET_MIN..MAX of their budget (what is left of it at most):
 * - 商業・生産: base + spent × X/100 × GROWTH_COEF_*, its fraction rounded up by that chance (0.22: 22% of the turns)
 * - 研究: research points for the faction, spent × X/100 × GROWTH_COEF_RESEARCH rounded as 商業・生産
 * - 募兵: soldiers + spent × X/100 (joining at the recruits' morale)
 * - 訓練 (no gold): 練度 + max(1, X × GROWTH_COEF_TRAINING)
 */
export const AFFAIRS_BUDGET_MIN = 80
export const AFFAIRS_BUDGET_MAX = 150
/** Gold a city can set aside for each role */
export const AFFAIRS_BUDGET_LIMIT = 1000
export const GROWTH_COEF_COMMERCE = 0.033
export const GROWTH_COEF_PRODUCTION = 0.033
export const GROWTH_COEF_TRAINING = 0.1
export const GROWTH_COEF_RESEARCH = 0.15

/**
 * The research buildings' points (their researchPoints effect) are × (1 + RESEARCH_BRANCH_BONUS) while the
 * faction researches a technology of their branch (物理文明・魔法文明); the officers' have no branch
 */
export const RESEARCH_BRANCH_BONUS = 0.5

/**
 * Population growth a turn, from the base 商業・生産 after the officers raised them:
 * floor((経済 + 施設) × 領主 × (1 + the buildings' 人口の伸び)), where
 * - 経済: 商業 × POP_GROWTH_COEF_MARKET + 生産 × POP_GROWTH_COEF_PRODUCTION
 * - 施設: the buildings standing × POP_GROWTH_FACILITY_BASE
 * - 領主: 1 + (政治 + 魅力) / POP_GROWTH_GOVERNOR_DIVISOR (1 without a lord)
 */
export const POP_GROWTH_COEF_MARKET = 0.5
export const POP_GROWTH_COEF_PRODUCTION = 0.2
export const POP_GROWTH_FACILITY_BASE = 50
export const POP_GROWTH_GOVERNOR_DIVISOR = 800

/** Soldiers a city can recruit in a turn, per point of effective 生産 (before the bonuses) */
export const RECRUIT_PER_PRODUCTION = 5
/** Gold per soldier recruited */
export const RECRUIT_GOLD = 0.2
/** Morale of new soldiers (before the buildings') */
export const RECRUIT_MORALE = 20

/** 法王府 repairs a relic for ceil((its repair's gold + supplies) × PAPAL_REPAIR_RATE) gold */
export const PAPAL_REPAIR_RATE = 2.5

/** A mercenary's monthly fee is their 契約金 / this */
export const MERCENARY_MONTHLY_DIVISOR = 6
/** How many roads from a city it can hire mercenaries at, without and with a 酒場 (a 傭兵ギルド: every city) */
export const MERCENARY_REACH = 1
export const MERCENARY_REACH_TAVERN = 2
/** Soldiers a mercenary gets back each economy run, as a share of their 最大兵力 */
export const MERCENARY_RECOVERY_RATE = 0.1
/** Morale of a mercenary's soldiers, whatever the city's */
export const MERCENARY_MORALE = 70
/** A contract asks no renewal fee for this many months; after that, at this chance each economy run */
export const MERCENARY_RENEWAL_MIN_MONTHS = 6
export const MERCENARY_RENEWAL_CHANCE = 1 / 3
/** The renewal fee as a share of the 契約金 */
export const MERCENARY_RENEWAL_RATE = 0.5
/** The standing with the mercenaries goes from -this to this */
export const MERCENARY_STANDING_LIMIT = 100
/** Standing gained by hiring a mercenary, and each economy run by each 酒場 and 傭兵ギルド of the faction */
export const STANDING_HIRE = 5
export const STANDING_TAVERN = 1
export const STANDING_GUILD = 2
/** Standing lost when the contract of a mercenary short of soldiers ends (dismissed, not renewed, not paid), and when one is wiped out */
export const STANDING_DISMISS_REDUCED = -10
export const STANDING_WIPED_OUT = -15
/** The price of a mercenary is × (1 − standing / 100 × their プライド × this) */
export const STANDING_PRICE_RATE = 0.1
/** A mercenary signs at a standing of (their プライド − STANDING_PRIDE_BASE) × STANDING_PRIDE_STEP or more */
export const STANDING_PRIDE_BASE = 3
export const STANDING_PRIDE_STEP = 20

/** The chance a mercenary not hired or a 放浪 knight goes on to a neighbouring city in a progress phase */
export const ROAM_MOVE_CHANCE = 0.5

/** Supplies and gold each soldier setting out on an invasion costs */
export const SORTIE_SUPPLIES = 0.2
export const SORTIE_GOLD = 0.05
