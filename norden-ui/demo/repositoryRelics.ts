import type { RelicRarityView, SpriteImage } from '../src'

/** A relic with what the demo needs to apply the game's rules of relics */
export interface RelicSpec {
  id: string
  name: string
  brokenName?: string
  description: string
  rarity: RelicRarityView
  useLabel: string
  dismantlePoints?: number
  repair?: { supplies: number; gold: number; tech?: string }
  production?: { supplies: number; gold: number; tech?: string }
  image?: SpriteImage
  brokenImage?: SpriteImage
}

/** The game's relic data (src/data/relics.ts, written by norden-data) */
interface RepositoryRelic extends Omit<RelicSpec, 'useLabel' | 'image' | 'brokenImage'> {
  use: string
  sprite?: { x: number; y: number }
  brokenSprite?: { x: number; y: number }
}

interface RelicsModule {
  RELIC_LIST: readonly RepositoryRelic[]
  RELIC_USE_LABELS: Readonly<Record<string, string>>
}

/** Optional access to the parent game's relics; the standalone catalog falls back to its own mock data. */
const modules = import.meta.glob<RelicsModule>('../../src/data/relics.ts', { eager: true })
const sheets = import.meta.glob<string>('../../src/assets/relics.webp', { eager: true, query: '?url', import: 'default' })
const sprites = import.meta.glob<{ width: number; height: number; cellWidth: number; cellHeight: number }>('../../src/data/relicSprite.json', { eager: true, import: 'default' })
const game = Object.values(modules)[0]
const sheet = Object.values(sheets)[0]
const sprite = Object.values(sprites)[0]

const cellImage = (cell?: { x: number; y: number }): SpriteImage | undefined => (cell && sheet && sprite
  ? { src: sheet, sheetWidth: sprite.width, sheetHeight: sprite.height, ...cell, width: sprite.cellWidth, height: sprite.cellHeight }
  : undefined)

/** null outside the game's repository */
export const repositoryRelics: RelicSpec[] | null = game && sheet && sprite
  ? game.RELIC_LIST.map(({ use, sprite: repaired, brokenSprite, ...relic }) => ({
    ...relic, useLabel: game.RELIC_USE_LABELS[use] ?? use, image: cellImage(repaired), brokenImage: cellImage(brokenSprite),
  }))
  : null

/** The catalog's own relics, when it runs outside the game's repository */
export const MOCK_RELICS: readonly RelicSpec[] = [
  {
    id: 'rifle', name: 'ライフル', brokenName: '壊れたライフル', description: '火薬で鉛の弾を撃ち出す、旧文明の携行兵器。', rarity: 'C', useLabel: '装備', dismantlePoints: 300,
    repair: { supplies: 400, gold: 150, tech: 'rifle' }, production: { supplies: 300, gold: 100, tech: 'rifle_production' },
  },
  { id: 'ballista', name: 'バリスタ', brokenName: '壊れたバリスタ', description: '太い矢を弦で放つ大型の弩。', rarity: 'C', useLabel: '施設', dismantlePoints: 200, repair: { supplies: 500, gold: 150 } },
  {
    id: 'golem', name: 'ゴーレム', brokenName: 'ゴーレムの残骸', description: '命令のままに歩く石の巨人。', rarity: 'A', useLabel: '召喚', dismantlePoints: 500,
    repair: { supplies: 1000, gold: 400, tech: 'golem' }, production: { supplies: 1500, gold: 600, tech: 'artificial_golem' },
  },
  { id: 'behemoth', name: 'ベヒーモス', brokenName: 'ベヒーモスの残骸', description: '都市ひとつを踏み潰したと伝わる魔導の巨獣。', rarity: 'S', useLabel: '召喚', dismantlePoints: 1000, repair: { supplies: 2000, gold: 800, tech: 'behemoth' } },
  { id: 'grimoire_flame_lance', name: 'フレイムランスの魔導書', description: '炎を一条の槍に束ねて放つ術式を記した書。', rarity: 'B', useLabel: '装備', production: { supplies: 400, gold: 200, tech: 'fire_magic' } },
]
