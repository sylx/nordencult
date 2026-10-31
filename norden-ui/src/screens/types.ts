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
  /** What the bonuses add, drawn stacked on the base at the end of the bar (they are part of `value`) */
  boosts?: readonly StatBoostView[]
  /** Further lines for its tooltip, e.g. 訓練 +3/ターン */
  notes?: readonly string[]
}

/** A city's population growth next turn (a forecast), for the domestic screen */
export interface PopulationGrowthView {
  /** Population it gains a turn */
  perTurn: number
  /** The next tier and the turns until it at this growth (null: it does not grow); omitted at the top tier */
  nextTier?: { tier: number; turns: number | null }
  /** How the growth is made up, for its tooltip, e.g. 経済 +164 */
  details?: readonly string[]
}

/** A share of a stat added by one source, e.g. the buildings' +48 of 商業 */
export interface StatBoostView {
  /** e.g. 施設, 領主 */
  label: string
  value: number
  /** building: the buildings' share, set apart in the bar */
  source?: 'building' | 'other'
  /** Its breakdown for the tooltip, e.g. 市場 +5% */
  details?: readonly string[]
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

/** What a city's 生産 goes into: a building, or a relic repaired or produced (which takes no building slot) */
export type ConstructionKindView = 'building' | 'relicRepair' | 'relicProduction'

/** What a city builds, repairs or produces */
export interface ConstructionView {
  /** The building, or the relic as a building to draw */
  building: BuildingView
  /** Omitted: a building */
  kind?: ConstructionKindView
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

/**
 * A city's domestic officers (内政担当官), up to two for each role:
 * 商業・生産 (by 政治 2 : 知力 1) spend the city's budget raising the base of those stats, 訓練 (by 武力 2 : 統率 1)
 * raises the soldiers' 練度 for nothing, 募兵 (by 魅力 3 : 武力 1) spends the budget on soldiers and
 * 研究 (by 知力) spends it on research points for the faction, each turn
 */
export type DomesticOfficerRole = 'commerce' | 'production' | 'training' | 'recruitment' | 'research'

/** The officer roles spending gold set aside for them */
export type DomesticFundedRole = Exclude<DomesticOfficerRole, 'training'>

/** Gold the city has set aside for each funded role */
export type DomesticBudgetsView = Partial<Record<DomesticFundedRole, number>>

/** Ids of the knights holding each domestic officer role */
export type DomesticOfficersView = Partial<Record<DomesticOfficerRole, readonly string[]>>

/** The knights holding the city's assignments (ids of its knights): its lord (領主) and its officers */
export interface CityAssignmentsView {
  governor?: string
  officers: DomesticOfficersView
}

export type AssignmentRoleView = 'governor' | DomesticOfficerRole

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
  /** The governor (領主, the city's lord): name and full character illustration (URL or host-rendered sprite). */
  lord?: { id?: string; name: string; image?: ReactNode; imageSrc?: string }
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
  /** Prisoners held in the city (捕虜), knights of other factions: `faction` is the one they served (null: 在野) */
  prisoners?: readonly KnightView[]
  /** The city's numbers at the start of each turn so far, oldest first */
  history?: readonly CityHistoryView[]
}

/** A city's numbers at the start of a turn, for following its growth */
export interface CityHistoryView {
  turn: number
  population: number
  /** Effective 商業・生産 */
  market: number
  production: number
  /** How the turn's economy run reached them (none for the first turn) */
  log?: readonly CityLogLineView[]
}

/** A number the economy run changed (or left), e.g. 商業（基礎） 440 → 442, and the formula with the numbers it used */
export interface CityLogLineView {
  label: string
  before: number
  after: number
  formula: string
}

/** A knight's abilities (0-100); the domestic screen weighs its lord and officers by them */
export interface KnightAbilitiesView {
  leadership?: number
  strength?: number
  intelligence?: number
  politics?: number
  charm?: number
}

export interface KnightView extends KnightCardData {
  id: string
  /** Abilities beyond the card's stats (e.g. 政治・魅力); the stats of the same label are used when omitted */
  abilities?: KnightAbilitiesView
  /** Full character illustration for the profile (URL or host-rendered sprite); the face is shown when omitted */
  image?: ReactNode
  imageSrc?: string
  /** 所属勢力 for the profile; null: 在野 (no faction), undefined: not shown */
  faction?: FactionView | null
  /** Where they are now, e.g. a city's name; not shown when omitted */
  location?: string
  /** 略歴. 名前（001） names another knight: only the name is shown, as a link to their profile */
  biography?: string
  /** Unit type chosen first when they are picked for an army */
  defaultUnitType?: string
  /** Ids of the unit types they can lead; all of them when omitted */
  unitTypes?: readonly string[]
  /** Knights with a rank must be the commander when they join an army; the highest rank leads (e.g. 君主 2, 領主 1) */
  commandRank?: number
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
  /** Its research; omitted: not shown */
  research?: FactionResearchSummaryView
}

/** A faction's research on the faction bar: its points a turn, and the technology it researches */
export interface FactionResearchSummaryView {
  /** Research points it gets a turn, least and most */
  perTurn: readonly [number, number]
  /** The technology it researches; omitted: none */
  tech?: { name: string; progress: number; cost: number; turns?: number | null }
  /** Every technology researched: nothing is left to research */
  complete?: boolean
}

/** How a technology stands for the faction: researched, being researched, researchable, seen by name, or ??? */
export type TechStatusView = 'researched' | 'researching' | 'available' | 'visible' | 'hidden'

/** A technology of the tree (研究＞技術). A hidden one has only its id and the technologies it requires (its frame and lines are drawn) */
export interface TechView {
  id: string
  status: TechStatusView
  /** Ids of the technologies it requires (every one of them), drawn as lines into it; none for a root */
  requires: readonly string[]
  /** A technology in a column to the left, whose row it is drawn on; given for a hidden one too, so that its place does not give way once known */
  alignWith?: string
  name?: string
  /** Its picture on the game's technology sheet */
  image?: SpriteImage
  description?: string
  /** e.g. 生産 +5% */
  effects?: readonly string[]
  /** Research points it takes, and those put in so far */
  cost?: number
  progress?: number
  /** Turns to complete it researching it from now on (0: the points 宙に浮いた complete it as it is chosen); null: never at the points a turn now */
  turns?: number | null
  /** Why it cannot be researched now, e.g. 前提の技術（火魔法）が要ります */
  unavailableReason?: string
}

/** A relic the city could repair or produce (the 内政 screen lists them with the buildings); `id` is that of the host's relic to repair, or the relic's to produce */
export interface RelicOptionView extends BuildOptionView {
  kind: 'relicRepair' | 'relicProduction'
}

export type RelicRarityView = 'S' | 'A' | 'B' | 'C'

/** A relic of the box: broken, being repaired in a city, being repaired by 法王府 or repaired; or being produced in a city */
export type RelicStatusView = 'broken' | 'repairing' | 'producing' | 'papalRepair' | 'repaired'

export interface RelicView {
  /** Passed back to the screen's callbacks (a relic being repaired or produced has no actions) */
  id: string
  status: RelicStatusView
  name: string
  /** Its picture on the game's relic sheet, broken or repaired */
  image?: SpriteImage
  rarity: RelicRarityView
  /** What it is for repaired, e.g. 施設 */
  useLabel: string
  description?: string
  /** repairing, producing: the city doing it */
  cityName?: string
  /** Dismantling it: the research points it gives */
  dismantle?: { points: number; unavailableReason?: string }
  /** Repairing it in the city the screen is opened on */
  repair?: { supplies: number; gold: number; turns?: number | null; unavailableReason?: string }
  /** Asking 法王府 to repair it */
  papalRepair?: { gold: number; unavailableReason?: string }
}

/** A relic the faction has the technology to produce */
export interface RelicProductionView {
  /** The relic's id */
  id: string
  name: string
  image?: SpriteImage
  rarity: RelicRarityView
  useLabel: string
  description?: string
  supplies: number
  gold: number
  turns?: number | null
  unavailableReason?: string
}

export interface UnitTypeView {
  id: string
  name: string
  icon?: ReactNode
  /** Picture of the unit, facing right (e.g. the battle screen's unit sprite) */
  image?: string
  description?: string
}
