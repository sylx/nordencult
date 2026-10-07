/** An id of FACTION_LIST */
export type FactionId = string
/** 'P000'..'P030' */
export type CityId = string
/** '001'.. */
export type CharacterId = string

export type Phase = 'strategy' | 'march'

export interface GameState {
  turn: number
  phase: Phase
  /** The faction whose turn it is in the strategy phase (null in the march phase) */
  activeFaction: FactionId | null
  playerFaction: FactionId
  /** Current faction of each city (starts from CITY_LIST's belongTo); a city not listed is neutral */
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
  attacker: { factionId: FactionId; from: CityId; knights: readonly CharacterId[] }
  /** The city's faction (null for a neutral city) and the knights in it */
  defender: { factionId: FactionId | null; knights: readonly CharacterId[] }
}

export type BattleWinner = 'attacker' | 'defender'

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
  cityCaptured: boolean
  moves: readonly CharacterMove[]
}
