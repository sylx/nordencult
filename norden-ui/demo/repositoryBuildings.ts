import type { BuildingView } from '../src'

/** A building with what the demo needs to apply the game's construction rules */
export interface BuildingSpec extends BuildingView {
  supplies: number
  gold: number
  /** The city needs one of these tags */
  requiredTags?: readonly string[]
  /** Built over this building, which it replaces */
  upgradeFrom?: string
  /** Relic its faction must hold (never held yet) */
  requiredRelic?: string
}

/** The game's building data (src/data/buildings.ts, written by norden-data) */
interface RepositoryBuilding {
  id: string
  name: string
  description: string
  supplies: number
  gold: number
  requiredTags?: string[]
  upgradeFrom?: string
  requiredRelic?: string
  effects: unknown[]
  sprite?: { x: number; y: number }
}

interface BuildingsModule {
  BUILDING_LIST: readonly RepositoryBuilding[]
  describeEffect: (effect: unknown) => string
}

/** Optional access to the parent game's buildings; the standalone catalog falls back to its own mock data. */
const modules = import.meta.glob<BuildingsModule>('../../src/data/buildings.ts', { eager: true })
const sheets = import.meta.glob<string>('../../src/assets/buildings.webp', { eager: true, query: '?url', import: 'default' })
const sprites = import.meta.glob<{ width: number; height: number; cellWidth: number; cellHeight: number }>('../../src/data/buildingSprite.json', { eager: true, import: 'default' })
const game = Object.values(modules)[0]
const sheet = Object.values(sheets)[0]
const sprite = Object.values(sprites)[0]

/** null outside the game's repository */
export const repositoryBuildings: BuildingSpec[] | null = game && sheet && sprite
  ? game.BUILDING_LIST.map(building => ({
    id: building.id,
    name: building.name,
    description: building.description,
    effects: building.effects.map(game.describeEffect),
    supplies: building.supplies,
    gold: building.gold,
    requiredTags: building.requiredTags,
    upgradeFrom: building.upgradeFrom,
    requiredRelic: building.requiredRelic,
    image: building.sprite && {
      src: sheet,
      sheetWidth: sprite.width,
      sheetHeight: sprite.height,
      ...building.sprite,
      width: sprite.cellWidth,
      height: sprite.cellHeight,
    },
  }))
  : null
