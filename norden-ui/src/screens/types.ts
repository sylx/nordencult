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
  kind?: 'agriculture' | 'commerce' | 'production'
  value: number
  /** Full length of the bar */
  max: number
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
  /** Illustration URL */
  art?: string
  /** Lord's name and full character illustration (URL or host-rendered sprite). */
  lord?: { name: string; image?: ReactNode; imageSrc?: string }
  special?: string
  /** e.g. 農業・商業・生産 */
  stats?: readonly CityStatView[]
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
  /** Why they cannot be picked (they are shown but cannot be selected) */
  unavailableReason?: string
}

export interface TurnView {
  turn: number
  /** e.g. 戦略フェーズ */
  phaseLabel: string
  /** e.g. 王歴312年4月 */
  dateLabel?: string
  /** Whose turn it is; null while every faction's orders are resolved */
  activeFaction?: FactionView | null
}

export interface UnitTypeView {
  id: string
  name: string
  icon?: ReactNode
  description?: string
}
