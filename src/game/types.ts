import type { CityTier } from '../data/buildings'

export type { CityTier }

/** An id of FACTION_LIST */
export type FactionId = string
/** 'P000'..'P030' */
export type CityId = string
/** '001'.. */
export type CharacterId = string
/** An id of UNIT_TYPES */
export type UnitTypeId = string

export type Phase = 'strategy' | 'march'

export interface GameState {
  turn: number
  phase: Phase
  /** The faction whose turn it is in the strategy phase (null in the march phase) */
  activeFaction: FactionId | null
  playerFaction: FactionId
  /** Current faction of each city (starts from the city data's belongTo); a city not listed is neutral */
  cityOwners: Readonly<Record<CityId, FactionId>>
  characters: Readonly<Record<CharacterId, CharacterState>>
  /** What changes in each city turn by turn (the city data holds where it starts) */
  cities: Readonly<Record<CityId, CityState>>
  /** Each faction's treasury */
  gold: Readonly<Record<FactionId, number>>
  /** What the latest economy run (at the start of the turn) did, for showing the cities grow; null on turn 1 */
  lastEconomy: EconomyReport | null
  /** Each city's numbers at the start of every turn so far (oldest first), with how the economy run got there */
  cityHistory: Readonly<Record<CityId, readonly CityRecord[]>>
  /** Invasions ordered this turn, in the order they were made */
  orders: readonly InvasionOrder[]
  /** Moves ordered this turn, in the order they were made; they set out in the progress phase */
  moveOrders: readonly MoveOrder[]
  /** Knights on their way to a city of their faction, every faction's (set out in this or an earlier progress phase) */
  movements: readonly Movement[]
  /** The progress phase (進行フェーズ, 'march'): the moves, then the orders still to resolve and the battle being fought */
  march: MarchState | null
  /** The latest battle's outcome (for the result screen) */
  lastBattle: BattleReport | null
  /** Next number for order and battle ids */
  serial: number
}

export interface CharacterState {
  /** City they serve in; null when unaffiliated (在野), or on their way to a city of their faction (GameState.movements) */
  cityId: CityId | null
  /** Faction they serve; null when unaffiliated */
  factionId: FactionId | null
}

/** A building under construction in a city */
export interface CityConstruction {
  buildingId: string
  /** Supplies (hammers) it takes: the building's when it was started */
  requiredSupplies: number
  investedSupplies: number
  /** Paused: the city's 生産 goes to storedSupplies instead of this construction */
  paused?: boolean
}

/**
 * 内政担当官, at work in the economy run: 商業・生産 (by 政治 2 : 知力 1) spend gold of the city's budget
 * raising its base 商業・生産, 訓練 (by 武力 2 : 統率 1) trains its soldiers for nothing and
 * 募兵 (by 魅力 3 : 武力 1) spends gold of the budget on new soldiers
 */
export type OfficerRole = 'commerce' | 'production' | 'training' | 'recruitment'

/** The officer roles spending gold, each from its own budget of the city */
export type FundedRole = Exclude<OfficerRole, 'training'>

/**
 * Knights assigned to the work of their city. A knight holds one assignment at most, in the city they serve in;
 * the governor (the lord) holds no officer role
 */
export interface CityAssignments {
  /** 領主: the lord of the city */
  governor?: CharacterId
  /** The officers of each role, OFFICERS_PER_ROLE at most */
  officers: Partial<Record<OfficerRole, readonly CharacterId[]>>
}

export type AssignmentRole = 'governor' | OfficerRole

export interface CityState {
  population: number
  /** Base 商業・生産 (before the governor's and the buildings' bonuses), raised by the 商業・生産 officers */
  market: number
  production: number
  storedSupplies: number
  troops: number
  /** Morale of the soldiers (0..MAX_MORALE), which every unit setting out from the city has */
  troopMorale: number
  /** Buildings standing, in slot order */
  buildings: readonly string[]
  construction: CityConstruction | null
  assignments: CityAssignments
  /**
   * Gold set aside for each funded role (AFFAIRS_BUDGET_LIMIT at most), taken from the treasury when set aside
   * and spent by the role's officers turn by turn; none when omitted
   */
  affairsBudget: Partial<Record<FundedRole, number>>
  /** Soldiers recruited this turn (a turn's recruiting is limited) */
  recruited: number
}

/** The numbers of a city the economy run changes, before and after */
export interface CitySnapshot {
  population: number
  tier: CityTier
  /** Effective 商業・生産 */
  market: number
  production: number
  storedSupplies: number
  troops: number
  troopMorale: number
  construction: CityConstruction | null
}

export type EconomyEvent =
  | { kind: 'buildingCompleted'; buildingId: string }
  | { kind: 'tierUp'; tier: CityTier }

export interface FactionEconomy {
  /** Gold from the cities' 商業 */
  income: number
  /** Gold paid to the knights (as much as there was) */
  salary: number
  before: number
  after: number
}

/** What a role's officers did in an economy run: the gold they spent and what it raised (商業・生産, soldiers, 練度) */
export interface AffairsResult {
  spent: number
  gain: number
}

export interface CityEconomy {
  before: CitySnapshot
  after: CitySnapshot
  /** The roles whose officers were at work */
  affairs: Partial<Record<OfficerRole, AffairsResult>>
  /** Buildings completed, the city growing a tier */
  events: readonly EconomyEvent[]
}

/** A city's numbers at the start of a turn, for following its growth turn by turn */
export interface CityRecord {
  turn: number
  population: number
  /** Effective 商業・生産 (with the governor's and the buildings' bonuses) */
  market: number
  production: number
  /** Base 商業・生産 */
  baseMarket: number
  baseProduction: number
  /** How the economy run at the start of the turn changed them (empty for turn 1) */
  log: readonly CityLogLine[]
}

/** base*: the base values the officers raise; market・production: the effective values */
export type CityLogStat = 'population' | 'baseMarket' | 'baseProduction' | 'market' | 'production'

/** A number an economy run changed (or left), and the formula with the numbers it used */
export interface CityLogLine {
  stat: CityLogStat
  before: number
  after: number
  /** e.g. max(1, 金 120 × 能力 85.3 / 100 × 0.033) = 3.38 → 3 */
  formula: string
}

/** What an economy run did */
export interface EconomyReport {
  /** The turn it started */
  turn: number
  factions: Readonly<Record<FactionId, FactionEconomy>>
  cities: Readonly<Record<CityId, CityEconomy>>
}

export interface InvasionOrder {
  id: string
  factionId: FactionId
  /** One city per order in M001. Joint invasions will give each knight their own */
  from: CityId
  to: CityId
  /** The knight who leads the invasion: one of `knights`, the one of the highest commandRank */
  commander: CharacterId
  knights: readonly CharacterId[]
  /**
   * The units, MAX_UNITS at most: each knight's, in the order of `knights`, and those the
   * commander leads indirectly among them. Omitted: no soldiers chosen (battles do not use them yet)
   */
  units?: readonly ArmyUnit[]
}

/** A unit of an invasion: the knight leading it, its unit type and soldiers */
export interface ArmyUnit {
  /** null: no knight of its own; the commander leads it indirectly (INDIRECT_UNIT_TYPES only) */
  knightId: CharacterId | null
  unitType: UnitTypeId
  soldiers: number
}

/**
 * Knights moving from a city of their faction to another, with soldiers and supplies (or alone: 単騎移動).
 * They serve in the city they move to once there
 */
export interface MoveOrder {
  id: string
  factionId: FactionId
  from: CityId
  to: CityId
  knights: readonly CharacterId[]
  /** Soldiers and supplies taken from `from`; none when riding alone */
  troops: number
  supplies: number
  /** 単騎移動: the knights alone, faster (moveMonths) */
  solo: boolean
}

/** A move under way: where it is and the months it still takes */
export interface Movement extends MoveOrder {
  /** Morale of its soldiers: their city's when they set out */
  troopMorale: number
  /** The cities along the roads from where it is now to `to` (the first is where it is) */
  route: readonly CityId[]
  /** Months until it arrives in `to` */
  monthsLeft: number
}

/** What the moves of a progress phase do this month, for showing them on the map */
export interface MoveLeg {
  id: string
  factionId: FactionId
  solo: boolean
  knights: readonly CharacterId[]
  /** The cities passed this month: from where it is to where it gets (a single city: it stays there) */
  route: readonly CityId[]
  /** Where it is going (another city of the faction when the one it set out for was lost) */
  to: CityId
  arrives: boolean
}

export interface MarchState {
  /** The moves of this progress phase were made (runMovements); the battles come after them */
  moved: boolean
  /** Orders not resolved yet, in resolving order */
  queue: readonly string[]
  /** The battle of the order being resolved (marching, then fighting) */
  current: Battle | null
}

/** A side of a battle: its knights and the units it fights with (the battle screen's troops) */
export interface BattleArmy {
  /** null: a neutral city's defenders */
  factionId: FactionId | null
  knights: readonly CharacterId[]
  /** The knight who leads the side; null when no knight does (a city without knights) */
  commander: CharacterId | null
  /** Each knight's unit and those the commander (or nobody, without one) leads indirectly, MAX_UNITS at most */
  units: readonly ArmyUnit[]
  /** Morale of the units (0..MAX_MORALE): their city's */
  morale: number
}

export interface Battle {
  id: string
  orderId: string
  cityId: CityId
  /** The invasion's army, from the city it set out from */
  attacker: BattleArmy & { factionId: FactionId; from: CityId; commander: CharacterId }
  /** The city's faction (null for a neutral city), the knights in it and the army they defend with (defenderArmy) */
  defender: BattleArmy
}

export type BattleSide = 'attacker' | 'defender'

export type BattleWinner = BattleSide

/**
 * How the battle was decided on the battlefield (battle-runtime's BattleEndReason).
 * eliminated: every unit of the losing side was wiped out or retreated,
 * stronghold: an attacking unit entered the defenders' stronghold,
 * commander: the losing side's commander's unit was wiped out,
 * commanderRetreat: the losing side's commander's unit retreated (or was captured trying).
 * On stronghold, commander and commanderRetreat, the losing side's remaining units were
 * forced to retreat (each choosing where to), so they come as retreats too
 */
export type BattleEndReason = 'eliminated' | 'stronghold' | 'commander' | 'commanderRetreat'

/**
 * A unit that left the battlefield by retreating, as the battle screen reports
 * it (battle-runtime's RetreatReport). The retreat may fail: the knight is then
 * taken prisoner by the other side. What happens to prisoners is not decided
 * yet; for now they stay where they were and are only listed in the report.
 */
export interface BattleRetreat {
  side: BattleSide
  /** The knight leading the unit; null for the battle screen's placeholder units (not tied to knights yet) */
  knightId: CharacterId | null
  /** The city retreated to (one of retreatCities) */
  to: CityId
  /** Failed to retreat and was taken prisoner */
  captured: boolean
}

/**
 * A unit wiped out on the battlefield, as the battle screen reports it
 * (battle-runtime's WipeoutReport). Its knight may be captured: a prisoner,
 * like a knight captured retreating. Otherwise they get away and go with
 * their side as if they had fought on.
 */
export interface BattleWipeout {
  side: BattleSide
  /** The knight leading the unit; null for the battle screen's placeholder units (not tied to knights yet) */
  knightId: CharacterId | null
  /** The knight was captured and taken prisoner */
  captured: boolean
}

/** enter: into the captured city, return: back to where the attack started, retreat: to a city of their own, wander: unaffiliated */
export type MoveKind = 'enter' | 'return' | 'retreat' | 'wander'

export interface CharacterMove {
  characterId: CharacterId
  kind: MoveKind
  from: CityId | null
  to: CityId | null
}

/** A knight made the lord (governor) of a city after a battle */
export interface GovernorAppointment {
  cityId: CityId
  characterId: CharacterId
}

export interface BattleReport {
  battle: Battle
  winner: BattleWinner
  /** How it was decided; null when decided without fighting it out (the debug buttons) */
  reason: BattleEndReason | null
  cityCaptured: boolean
  moves: readonly CharacterMove[]
  /** Units that retreated from the battlefield or were captured trying, in the order they did */
  retreats: readonly BattleRetreat[]
  /** Units wiped out, in the order they were (with whether their knight was captured) */
  wipeouts: readonly BattleWipeout[]
  /** Lords made after the battle: of the captured city, and of cities retreated to that had none */
  governors: readonly GovernorAppointment[]
}
