import { emblemImage } from 'norden-strategy/data'
import factionData from './factionData.json'

/**
 * Master data of a faction (written by norden-data's faction editor). Its gold
 * as the game goes on is game state (src/game/'s GameState), starting from
 * `gold`. The map keeps its own copy (norden-strategy's FACTION_LIST) for
 * drawing the emblems. The order of the list is the order of the turns
 * (after the player's).
 */
export interface Faction {
  /** e.g. 'carta' */
  id: string
  name: string
  /** Number of the emblem image (norden-strategy's src/assets/emblems/emblem_NN.png) */
  emblem: number
  /** What its head is called, e.g. 当主, 皇帝 */
  patriarchLabel: string
  /** Colour of its armies on the map ('#rrggbb') */
  color: string
  /** Gold in its treasury at the start; omitted: INITIAL_GOLD (src/game/economy/balance.ts) */
  gold?: number
}

export const FACTION_LIST: readonly Faction[] = factionData

export const FACTION_MAP: Readonly<Record<string, Faction>> = Object.fromEntries(FACTION_LIST.map((f) => [f.id, f]))

/** Name of a faction (null / undefined: neutral) */
export const factionName = (id: string | null | undefined) => (id ? FACTION_MAP[id]?.name ?? id : '中立')

/** URL of a faction's emblem image; undefined for neutral */
export const factionEmblem = (id: string | null | undefined) => emblemImage(id ? FACTION_MAP[id]?.emblem : undefined)

export const NEUTRAL_COLOR = '#8a8a80'

/** Colour of a faction's armies on the map; neutral and unknown factions are grey */
export const factionColor = (id: string | null | undefined) => (id && FACTION_MAP[id]?.color) || NEUTRAL_COLOR
