import type { SpriteImage } from '../src'

/** A technology with what the demo needs to apply the game's research rules */
export interface TechSpec {
  id: string
  name: string
  description: string
  branch: 'physical' | 'arcane'
  cost: number
  requires: readonly string[]
  effects: readonly string[]
  image?: SpriteImage
}

/** The game's technology data (src/data/techs.ts, written by norden-data) */
interface RepositoryTech {
  id: string
  name: string
  description: string
  branch: 'physical' | 'arcane'
  cost: number
  requires: string[]
  effects: unknown[]
  sprite?: { x: number; y: number }
}

interface TechsModule {
  TECH_LIST: readonly RepositoryTech[]
}

interface BuildingsModule {
  describeEffect: (effect: unknown) => string
}

/** Optional access to the parent game's technologies; the standalone catalog falls back to its own mock data. */
const modules = import.meta.glob<TechsModule>('../../src/data/techs.ts', { eager: true })
const buildingModules = import.meta.glob<BuildingsModule>('../../src/data/buildings.ts', { eager: true })
const sheets = import.meta.glob<string>('../../src/assets/techs.webp', { eager: true, query: '?url', import: 'default' })
const sprites = import.meta.glob<{ width: number; height: number; cellWidth: number; cellHeight: number }>('../../src/data/techSprite.json', { eager: true, import: 'default' })
const game = Object.values(modules)[0]
const describeEffect = Object.values(buildingModules)[0]?.describeEffect
const sheet = Object.values(sheets)[0]
const sprite = Object.values(sprites)[0]

/** null outside the game's repository */
export const repositoryTechs: TechSpec[] | null = game && describeEffect && sheet && sprite
  ? game.TECH_LIST.map(tech => ({
    id: tech.id,
    name: tech.name,
    description: tech.description,
    branch: tech.branch,
    cost: tech.cost,
    requires: tech.requires,
    effects: tech.effects.map(describeEffect),
    image: tech.sprite && {
      src: sheet,
      sheetWidth: sprite.width,
      sheetHeight: sprite.height,
      ...tech.sprite,
      width: sprite.cellWidth,
      height: sprite.cellHeight,
    },
  }))
  : null

const spec = (id: string, name: string, branch: TechSpec['branch'], cost: number, requires: string[], effects: string[] = []): TechSpec =>
  ({ id, name, description: `${name}の研究。`, branch, cost, requires, effects })

/** The catalog's own tree, when it runs outside the game's repository */
export const MOCK_TECHS: readonly TechSpec[] = [
  spec('physical_civ', '物理文明', 'physical', 100, [], ['生産 +5%']),
  spec('tactics', '兵法', 'physical', 200, ['physical_civ'], ['新兵の練度 +5']),
  spec('melee', '白兵戦', 'physical', 400, ['tactics'], ['歩兵の攻撃力 +5%']),
  spec('gunpowder', '火薬', 'physical', 200, ['physical_civ']),
  spec('rifle', 'ライフル', 'physical', 400, ['gunpowder'], ['壊れたライフルの修復']),
  spec('arcane_civ', '魔法文明', 'arcane', 100, [], ['生産 +5%']),
  spec('fire_magic', '火魔法', 'arcane', 300, ['arcane_civ'], ['フレイムランス']),
  spec('earth_magic', '土魔法', 'arcane', 300, ['arcane_civ'], ['アーススパイク']),
  spec('archmage', '上級魔術師', 'arcane', 800, ['fire_magic', 'earth_magic']),
]
