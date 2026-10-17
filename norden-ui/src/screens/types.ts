import type { ReactNode } from 'react'
import type { KnightCardData } from '../components/parts/KnightCard'

/**
 * Display data the screens draw. The game turns its state into these; norden-ui knows nothing about the game rules.
 */

export interface FactionView {
  name: string
  /** Emblem image URL */
  emblem?: string
}

export interface CityStatView {
  label: string
  /** Visual treatment; known Japanese labels also resolve automatically. */
  kind?: 'agriculture' | 'commerce' | 'production' | 'morale'
  value: number
  /** Full length of the bar */
  max: number
  /** The value before bonuses (e.g. the city's base 商業), shown beside when it differs */
  base?: number
}

/** A picture cut out of a sprite sheet: the sheet's URL and size, and the cell's place and size in it (pixels) */
export interface SpriteImage {
  src: string
  sheetWidth: number
  sheetHeight: number
  x: number
  y: number
  width: number
  height: number
}

/** A building: standing in a slot, being built, or one to build */
export interface BuildingView {
  id: string
  name: string
  /** Its picture on the game's building sheet */
  image?: SpriteImage
  description?: string
  /** e.g. 商業 +15% */
  effects?: readonly string[]
  /** Id of the building it is built over and replaces in its slot (e.g. 大市場 over 市場); omitted: built in an empty slot */
  upgradeFrom?: string
}

/** The building under construction in a city */
export interface ConstructionView {
  building: BuildingView
  /** Supplies put in so far and needed in all */
  invested: number
  required: number
  /** Turns until it is completed; null: never at the current 生産 */
  turnsLeft?: number | null
  /** Paused: produced supplies go to the city's stockpile instead of this construction */
  paused?: boolean
}

/** A building the city could start: its costs, and why it cannot now */
export interface BuildOptionView extends BuildingView {
  /** Supplies it takes and gold paid when started */
  supplies: number
  gold: number
  /** Turns to complete it at the city's 生産; null: never */
  turns?: number | null
  /** Why it cannot be started now (shown, but cannot be chosen) */
  unavailableReason?: string
  /**
   * It cannot be built in this city at all yet (a tag or relic it needs is missing,
   * or the building it upgrades is not standing): left out of the lists so it is not revealed
   */
  locked?: boolean
}

/** The knights holding the city's assignments (ids of its knights) */
export interface CityAssignmentsView {
  governor?: string
  military: readonly string[]
}

export type AssignmentRoleView = 'governor' | 'military'

/** A city's building slots: those built (in slot order), the one being built and the empty ones up to `slots` */
export interface CityBuildingsView {
  slots: number
  built: readonly BuildingView[]
  construction?: ConstructionView | null
}

export interface CityView {
  id: string
  name: string
  /** undefined: neutral */
  faction?: FactionView
  /** e.g. 港湾都市 */
  typeLabel?: string
  /** e.g. 大きな街 */
  scaleLabel?: string
  population?: number
  /** City tier (e.g. 2), which decides its building slots */
  tier?: number
  /** The governor (代官, the city's lord): name and full character illustration (URL or host-rendered sprite). */
  lord?: { name: string; image?: ReactNode; imageSrc?: string }
  special?: string
  /** e.g. 商業・生産 */
  stats?: readonly CityStatView[]
  /** 兵数 */
  troops?: number
  /** 練度 of the soldiers (0..100) */
  troopMorale?: number
  /** 備蓄物資 */
  supplies?: number
  buildings?: CityBuildingsView
  tags?: readonly string[]
  knights?: readonly KnightView[]
  /** Cities linked by a road */
  neighbours?: readonly NeighbourView[]
}

export interface NeighbourView {
  id: string
  name: string
  faction?: FactionView
}

export interface KnightView extends KnightCardData {
  id: string
  /** Most soldiers they can lead */
  maxSoldiers?: number
  /** Unit type chosen first when they are picked for an army */
  defaultUnitType?: string
  /** Ids of the unit types they can lead; all of them when omitted */
  unitTypes?: readonly string[]
  /** Knights with a rank must be the commander when they join an army; the highest rank leads (e.g. 君主 2, 領主 1) */
  commandRank?: number
  /** Most soldiers of each unit they lead indirectly as the commander; maxSoldiers when omitted */
  indirectSoldiers?: number
  /** Why they cannot be picked (they are shown but cannot be selected) */
  unavailableReason?: string
}

export interface TurnView {
  turn: number
  /** e.g. 戦略フェーズ */
  phaseLabel: string
  /** e.g. 灰歴312年1月 冬 (a season after a space is drawn as large as the numbers) */
  dateLabel?: string
  /** Whose turn it is; null while every faction's orders are resolved */
  activeFaction?: FactionView | null
}

/** The player's faction at a glance (the faction bar) */
export interface FactionSummaryView {
  /** The treasury, and how it changes at the start of the next turn (income less salaries) */
  gold: number
  goldForecast?: number
  /** 総生産: the 生産 of all its cities */
  production: number
  /** 総兵力: the soldiers of all its cities */
  troops: number
}

export interface UnitTypeView {
  id: string
  name: string
  icon?: ReactNode
  /** Picture of the unit, facing right (e.g. the battle screen's unit sprite) */
  image?: string
  description?: string
}
