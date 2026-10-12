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
  /** Invasions ordered this turn, in the order they were made */
  orders: readonly InvasionOrder[]
  /** The march phase: orders still to resolve and the battle being fought */
  march: MarchState | null
  /** The latest battle's outcome (for the result screen) */
  lastBattle: BattleReport | null
  /** Next number for order and battle ids */
  serial: number
}

export interface CharacterState {
  /** City they serve in; null when unaffiliated (在野) */
  cityId: CityId | null
  /** Faction they serve; null when unaffiliated */
  factionId: FactionId | null
  /** Lord of their city */
  isLord: boolean
}

export interface InvasionOrder {
  id: string
  factionId: FactionId
  /** One city per order in M001. Joint invasions will give each knight their own */
  from: CityId
  to: CityId
  knights: readonly CharacterId[]
  /** Each knight's unit, in the order of `knights`. Omitted: no soldiers chosen (battles do not use them yet) */
  units?: readonly ArmyUnit[]
}

/** The unit type a knight leads into an invasion and its soldiers */
export interface ArmyUnit {
  knightId: CharacterId
  unitType: UnitTypeId
  soldiers: number
}

export interface MarchState {
  /** Orders not resolved yet, in resolving order */
  queue: readonly string[]
  /** The battle of the order being resolved (marching, then fighting) */
  current: Battle | null
}

export interface Battle {
  id: string
  orderId: string
  cityId: CityId
  attacker: { factionId: FactionId; from: CityId; knights: readonly CharacterId[]; units?: readonly ArmyUnit[] }
  /** The city's faction (null for a neutral city) and the knights in it */
  defender: { factionId: FactionId | null; knights: readonly CharacterId[] }
}

export type BattleSide = 'attacker' | 'defender'

export type BattleWinner = BattleSide

/**
 * How the battle was decided on the battlefield (battle-runtime's BattleEndReason).
 * eliminated: every unit of the losing side was wiped out or retreated,
 * stronghold: an attacking unit entered the defenders' stronghold
 */
export type BattleEndReason = 'eliminated' | 'stronghold'

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
}
