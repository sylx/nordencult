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
  /** The factions the player plays (?faction=, more than one for trying out what happens between factions) */
  playerFactions: readonly FactionId[]
  /** Current faction of each city (starts from the city data's belongTo); a city not listed is neutral */
  cityOwners: Readonly<Record<CityId, FactionId>>
  characters: Readonly<Record<CharacterId, CharacterState>>
  /** What changes in each city turn by turn (the city data holds where it starts) */
  cities: Readonly<Record<CityId, CityState>>
  /** Each faction's treasury */
  gold: Readonly<Record<FactionId, number>>
  /** Each faction's research (研究) of the technology tree */
  research: Readonly<Record<FactionId, FactionResearch>>
  /** Each faction's アイテムボックス of relics; one being repaired is not in it but in its city's construction */
  relics: Readonly<Record<FactionId, readonly RelicItem[]>>
  /** Every mercenary's soldiers and contract, those not hired too */
  mercenaries: Readonly<Record<CharacterId, MercenaryState>>
  /** Each faction's standing with the mercenaries (傭兵業界の友好度, -100..100); no screen shows it */
  mercenaryStanding: Readonly<Record<FactionId, number>>
  /** What the latest economy run (at the start of the turn) did, for showing the cities grow; null on turn 1 */
  lastEconomy: EconomyReport | null
  /** Each city's numbers at the start of every turn so far (oldest first), with how the economy run got there */
  cityHistory: Readonly<Record<CityId, readonly CityRecord[]>>
  /** Invasions ordered this turn, in the order they were made */
  orders: readonly InvasionOrder[]
  /** Moves ordered this turn, in the order they were made; they set out in the progress phase */
  moveOrders: readonly MoveOrder[]
  /** Transports ordered this turn, in the order they were made; they set out in the progress phase with the moves */
  transportOrders: readonly TransportOrder[]
  /**
   * Knights on their way to a city of their faction, every faction's (set out in this or an earlier progress phase):
   * moves, and transports there and back
   */
  movements: readonly Movement[]
  /** The progress phase (進行フェーズ, 'march'): the moves, then the orders still to resolve and the battle being fought */
  march: MarchState | null
  /** The latest battle's outcome (for the result screen) */
  lastBattle: BattleReport | null
  /** Events to tell the player (a cut-in, then a notice each), oldest first; each is dropped once told (dismissEvent) */
  events: readonly GameEvent[]
  /**
   * What the dialogue scenes remember ('<scene id>:<name>', e.g. 'travelingMerchant:met'; a scene may read another's).
   * None at first; no screen shows them (the debug console's flag list does)
   */
  flags: Readonly<Record<string, number | boolean>>
  /** Next number for order and battle ids */
  serial: number
}

export interface CharacterState {
  /**
   * City they serve in; null when serving nobody (放浪, or a mercenary not hired: `roaming`). On a move or a transport
   * (GameState.movements) they still serve in the city they set out from, away from it (movementOf), until they get
   * where they are going; null when that city was lost
   */
  cityId: CityId | null
  /** Faction they serve; null when serving nobody. A prisoner's: the faction they served when captured (null once it fell) */
  factionId: FactionId | null
  /** The city they are in, serving nobody: 放浪 knights and mercenaries not hired, going from city to city (runRoaming) */
  roaming?: CityId
  /** 怨恨勢力: the faction that destroyed theirs, which they will not serve */
  grudge?: FactionId
  /**
   * 捕虜: held prisoner in `cityId` (a city of another faction), not serving there. They may escape in a progress
   * phase (runEscapes) and be taken to another city of its faction on a move or a transport (MoveOrder.prisoners)
   */
  prisoner?: boolean
}

/** A mercenary's own soldiers, apart from any city's, and their contract */
export interface MercenaryState {
  /** Their soldiers now; below their 最大兵力 with no contract they are recovering (isRecovering), off the market */
  soldiers: number
  /** null: not hired */
  contract: MercenaryContract | null
}

export interface MercenaryContract {
  /** What they are paid each economy run, fixed by the standing when they were hired */
  monthly: number
  /** The turn they were hired or the contract last renewed */
  since: number
}

/**
 * A faction's research. Its research points are not stored: each economy run puts them into the technology it
 * researches, or, researching none, into `carry` until it chooses one (setResearch)
 */
export interface FactionResearch {
  /** The technology it researches; null: none chosen yet, or one just completed */
  current: string | null
  /** Research points put into each technology so far (kept when it researches another) */
  progress: Readonly<Record<string, number>>
  /** The technologies it has researched, in the order it completed them */
  researched: readonly string[]
  /**
   * Research points 宙に浮いた: those of turns it researched nothing and the surplus of a technology completed,
   * put into the next technology it chooses
   */
  carry: number
}

/** A relic in a faction's アイテムボックス, each its own (a knight will equip one of them) */
export interface RelicItem {
  id: string
  /** An id of RELIC_LIST */
  relicId: string
  repaired: boolean
  /** 法王府に依頼中: repaired by the next economy run. It stays in the box, neither dismantled nor repaired meanwhile */
  papalRepair?: boolean
}

/** Repairing a relic of the faction's, or producing one, in a city: lost with the city, unlike a building (BattleReport.lostRelicWork) */
export type RelicWork =
  | { kind: 'relicRepair'; relicId: string }
  | { kind: 'relicProduction'; relicId: string }

/** What a city's 生産 goes into */
export type ConstructionWork = { kind: 'building'; buildingId: string } | RelicWork

/** A building being built in a city, or a relic being repaired or produced there, one at a time */
export interface CityConstruction {
  work: ConstructionWork
  /** Supplies (hammers) it takes: the building's or the relic's when it was started */
  requiredSupplies: number
  investedSupplies: number
  /** Paused: the city's 生産 goes to storedSupplies instead of this */
  paused?: boolean
}

/**
 * 内政担当官, at work in the economy run: 商業・生産 (by 政治 2 : 知力 1) spend gold of the city's budget
 * raising its base 商業・生産, 訓練 (by 武力 2 : 統率 1) trains its soldiers for nothing,
 * 募兵 (by 魅力 3 : 武力 1) spends gold of the budget on new soldiers and
 * 研究 (by 知力) spends gold of the budget on research points for the faction
 */
export type OfficerRole = 'commerce' | 'production' | 'training' | 'recruitment' | 'research'

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
  | { kind: 'relicCompleted'; relicId: string }

export interface FactionEconomy {
  /** Gold from the cities' 商業 */
  income: number
  /** Gold paid to the knights (as much as there was) */
  salary: number
  /** Gold paid to the mercenaries hired (those it could pay: mercenaryFees) */
  mercenaryFees: number
  before: number
  after: number
}

/** What a role's officers did in an economy run: the gold they spent and what it raised (商業・生産, soldiers, 練度, research points) */
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
  /** e.g. 金 120 × 能力 85.3 / 100 × 0.033 = 3.38 → 3（端数は確率で切り上げ） */
  formula: string
}

/** A faction's research points of an economy run and where they went */
export interface FactionResearchResult {
  /** From its research buildings (with the branch bonus) and its 研究 officers, and the sum */
  buildings: number
  officers: number
  total: number
  /** The technology they went into; null: none researched, they went into `carry` (or were lost, nothing being left to research) */
  techId: string | null
  /** The technology completed by them */
  completed: string | null
}

/** What an economy run did */
export interface EconomyReport {
  /** The turn it started */
  turn: number
  factions: Readonly<Record<FactionId, FactionEconomy>>
  /** Each faction's research (runResearch) */
  research: Readonly<Record<FactionId, FactionResearchResult>>
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
  /** Prisoners held in `from` taken along, as soldiers and supplies are; none when omitted or riding alone */
  prisoners?: readonly CharacterId[]
}

/**
 * Soldiers and supplies taken from a city of the faction to another (輸送) by a knight, who unloads them there and
 * rides back alone to `from` (like 単騎移動). Any city of the faction the roads lead to, the months as a move's
 */
export interface TransportOrder {
  id: string
  factionId: FactionId
  from: CityId
  to: CityId
  /** The knight in charge */
  knight: CharacterId
  troops: number
  supplies: number
  /** Prisoners held in `from` taken along and left in `to`; none when omitted */
  prisoners?: readonly CharacterId[]
}

/**
 * What a movement is: a move; a transport on its way there (unloading in `to`, then going back to `from` as a
 * 'return'); a transport's knight riding back alone (its `from` is where they unloaded); a prisoner who escaped
 * riding alone to the nearest city of their faction ('escape': they serve nowhere until they get there)
 */
export type MovementKind = 'move' | 'transport' | 'return' | 'escape'

/** A move or a transport under way: where it is and the months it still takes */
export interface Movement extends MoveOrder {
  /** Omitted: 'move' */
  kind?: MovementKind
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
  /** Omitted: 'move' */
  kind?: MovementKind
  factionId: FactionId
  /** The city it set out from */
  from: CityId
  solo: boolean
  knights: readonly CharacterId[]
  /** The cities passed this month: from where it is to where it gets (a single city: it stays there) */
  route: readonly CityId[]
  /** Where it is going (another city of the faction when the one it set out for was lost) */
  to: CityId
  arrives: boolean
  /** Prisoners it takes along; none when omitted */
  prisoners?: readonly CharacterId[]
}

/**
 * The progress phase: the move part (移動パート: every faction's moves and transports at once, runMovements), then
 * the invasion part (侵攻パート: the invasions one by one, the factions by their 国力, each faction's in the order made)
 */
export interface MarchState {
  /** The moves of this progress phase were made (runMovements); the battles come after them */
  moved: boolean
  /** Orders not resolved yet, in resolving order */
  queue: readonly string[]
  /** The owners of the cities as the invasion part started, for telling the cities taken in it */
  owners: Readonly<Record<CityId, FactionId>>
  /** The battle of the order being resolved (marching, then fighting) */
  current: Battle | null
  /** The order being resolved marching into a city its faction took earlier in the invasion part (no battle) */
  entry: Entry | null
  /**
   * The order first in the queue whose target another faction took earlier in the invasion part, waiting for its
   * faction (one the player plays) to choose whether to go on (decideInvasion)
   */
  decision: string | null
  /** Orders whose faction chose to go on */
  confirmed: readonly string[]
}

/** An invasion's army marching into a city of its own faction (taken by another of its invasions), as a move does */
export interface Entry {
  id: string
  orderId: string
  factionId: FactionId
  from: CityId
  to: CityId
  knights: readonly CharacterId[]
  /** Soldiers of its units (taken from `from` as it set out), joining those of `to`, and their morale */
  soldiers: number
  morale: number
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
  /** The invasion's army, from the city it set out from (its soldiers taken from there as it set out) */
  attacker: BattleArmy & { factionId: FactionId; from: CityId; commander: CharacterId }
  /**
   * The city's faction (null for a neutral city) and the army defending it, its soldiers taken from the city's:
   * formed by the faction (defenderArmy) or, for one the player plays, by the player (pendingDefense).
   * Undefended: the knights in the city, who are captured
   */
  defender: BattleArmy
  /**
   * No battle: the city has no lord there (a neutral city has none) or no soldiers. The attackers take it at once,
   * with its soldiers and supplies, and capture the knights there
   */
  undefended: boolean
  /** The defender is a faction the player plays: it forms its army (formDefense) once the invaders arrive. No units till then */
  pendingDefense: boolean
}

/** The army a faction the player plays defends a city with: its commander and units (the commander's first) */
export interface DefenseDraft {
  commander: CharacterId
  units: readonly ArmyUnit[]
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
 * forced to retreat (each choosing where to), so they come as retreats too.
 * undefended: no battle (Battle.undefended)
 */
export type BattleEndReason = 'eliminated' | 'stronghold' | 'commander' | 'commanderRetreat' | 'undefended'

/**
 * A unit that left the battlefield by retreating, as the battle screen reports
 * it (battle-runtime's RetreatReport). The retreat may fail: the knight is then
 * taken prisoner by the other side (BattleReport.prisoners).
 */
export interface BattleRetreat {
  side: BattleSide
  /** The knight leading the unit; null for the battle screen's placeholder units (not tied to knights yet) */
  knightId: CharacterId | null
  /** The city retreated to (one of retreatCities) */
  to: CityId
  /** Failed to retreat and was taken prisoner */
  captured: boolean
  /** Soldiers of the unit as it retreated, joining the city retreated to. Omitted: those it had when the battle started */
  soldiers?: number
}

/** A unit still on the battlefield when the battle was decided (battle-runtime's RemainingUnit) */
export interface BattleSurvivor {
  side: BattleSide
  /** The knight leading the unit; null for units led indirectly or by nobody */
  knightId: CharacterId | null
  soldiers: number
}

/** Soldiers a city got after a battle: survivors entering it or coming back, units retreating to it */
export interface SoldierReturn {
  cityId: CityId
  soldiers: number
}

/**
 * A unit wiped out on the battlefield, as the battle screen reports it
 * (battle-runtime's WipeoutReport). Its knight retreats on their own and may be
 * captured: a prisoner, like a knight captured retreating. Otherwise they get
 * away to the first city their side can retreat to, or with none to where
 * resolveBattle sends knights with nowhere to retreat to (rejoinCity).
 * A mercenary's contract ends instead, wherever their side can retreat to.
 */
export interface BattleWipeout {
  side: BattleSide
  /** The knight leading the unit; null for the battle screen's placeholder units (not tied to knights yet) */
  knightId: CharacterId | null
  /** The knight was captured and taken prisoner */
  captured: boolean
  /** The city the knight got away to (one of retreatCities); null when captured, or with nowhere to go */
  to: CityId | null
}

/**
 * enter: into the captured city, return: back to where the attack started, retreat: to a city of their own,
 * rejoin: with nowhere to retreat to, back to their faction (rejoinCity), wander: 放浪 (their faction has no city left),
 * released: a mercenary whose contract ended
 */
export type MoveKind = 'enter' | 'return' | 'retreat' | 'rejoin' | 'wander' | 'released'

export interface CharacterMove {
  characterId: CharacterId
  kind: MoveKind
  from: CityId | null
  to: CityId | null
}

/** A knight taken prisoner in a battle, and the city they are held in */
export interface Imprisonment {
  characterId: CharacterId
  cityId: CityId
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
  /** Knights captured in a city taken without a battle (undefended) */
  captives: readonly CharacterId[]
  /** Knights taken prisoner (captured retreating, wiped out or in a city taken), and where they are held */
  prisoners: readonly Imprisonment[]
  /** Prisoners of the attacker's faction held in the city captured, set free: they serve there now */
  freed: readonly CharacterId[]
  /** Soldiers each city got after the battle, in the order they got there (a mercenary's stay theirs) */
  soldiers: readonly SoldierReturn[]
  /** The repair or production lost with the city captured: its supplies, its gold and a relic being repaired are gone. null: none */
  lostRelicWork: RelicWork | null
}

/** A faction lost its last city (in a battle) and is no more: every knight of it took to wandering (放浪) */
export interface FactionDestroyed {
  id: string
  kind: 'factionDestroyed'
  turn: number
  factionId: FactionId
  /** Its last city */
  cityId: CityId
  /** The faction that took it */
  by: FactionId
  /** Its knights, 放浪 now (not the mercenaries it hired) */
  knights: readonly CharacterId[]
}

/** A faction the player plays completed researching a technology (in the economy run starting the turn) */
export interface TechCompleted {
  id: string
  kind: 'techCompleted'
  turn: number
  factionId: FactionId
  techId: string
}

/** A relic of a faction the player plays was repaired or produced (in the economy run starting the turn) */
export interface RelicCompleted {
  id: string
  kind: 'relicCompleted'
  turn: number
  factionId: FactionId
  relicId: string
  /** The city that repaired or produced it; null: 法王府 repaired it */
  cityId: CityId | null
}

/** A mercenary a faction the player plays hired demands the renewal fee; it stays until the player chooses (decideRenewal) */
export interface MercenaryRenewal {
  id: string
  kind: 'mercenaryRenewal'
  turn: number
  factionId: FactionId
  characterId: CharacterId
  gold: number
}

/** A faction the player plays could not pay a mercenary's monthly fee, and the contract ended */
export interface MercenaryUnpaid {
  id: string
  kind: 'mercenaryUnpaid'
  turn: number
  factionId: FactionId
  characterId: CharacterId
}

export type GameEvent = FactionDestroyed | TechCompleted | RelicCompleted | MercenaryRenewal | MercenaryUnpaid
