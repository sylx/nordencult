// LLM が作った曲の一覧。新しい曲はファイルを足してここに並べる
import { battleCry } from './battle-cry.ts'
import { birchRidge } from './birch-ridge.ts'
import { borderlineScouts } from './borderline-scouts.ts'
import { condorBoard } from './condor-board.ts'
import { crimsonAlcazar } from './crimson-alcazar.ts'
import { crookedPendulum } from './crooked-pendulum.ts'
import { crystalMap } from './crystal-map.ts'
import { fairyRing } from './fairy-ring.ts'
import { fallenRequiem } from './fallen-requiem.ts'
import { glassRipples } from './glass-ripples.ts'
import { goldenHomeward } from './golden-homeward.ts'
import { goldenSails } from './golden-sails.ts'
import { highlandCovenant } from './highland-covenant.ts'
import { holdingBreath } from './holding-breath.ts'
import { hokuten } from './hokuten.ts'
import { imperialTriumph } from './imperial-triumph.ts'
import { ironBanners } from './iron-banners.ts'
import { maskedPassepied } from './masked-passepied.ts'
import { mirageDiwan } from './mirage-diwan.ts'
import { mistPilgrim } from './mist-pilgrim.ts'
import { noonFairWind } from './noon-fair-wind.ts'
import { northernOath } from './northern-oath.ts'
import { spiralCurrent } from './spiral-current.ts'
import { starReader } from './star-reader.ts'
import { tundraMarch } from './tundra-march.ts'
import { victorAccolade } from './victor-accolade.ts'
import { wanderingBird } from './wandering-bird.ts'
import { whiteSanctum } from './white-sanctum.ts'
import { winterCouncil } from './winter-council.ts'
import type { Song } from './song.ts'

export { barAt, compileSong, type CompiledSong, type Song, type SongBar, type SongNote, type SongPart, type SongSection } from './song.ts'

export type SongTier = 1 | 2

export interface CatalogSong extends Song {
  tier: SongTier
  tags: readonly string[]
}

// 分類とタグはここで管理する。新しい曲は未選抜の 2 軍・タグなしで登録する。
export const SONGS: CatalogSong[] = [
  { ...hokuten, tier: 2, tags: [] },
  { ...fairyRing, tier: 1, tags: ['戦略画面', 'ノルディス家'] },
  { ...fallenRequiem, tier: 1, tags: ['戦闘敗北'] },
  { ...imperialTriumph, tier: 2, tags: [] },
  { ...wanderingBird, tier: 2, tags: [] },
  { ...northernOath, tier: 2, tags: [] },
  { ...tundraMarch, tier: 1, tags: ['戦闘画面'] },
  { ...goldenSails, tier: 1, tags: ['戦略画面', 'アクア商会'] },
  { ...starReader, tier: 1, tags: ['戦略画面', 'ロザリア家'] },
  { ...whiteSanctum, tier: 1, tags: ['イベント', '法王府'] },
  { ...holdingBreath, tier: 2, tags: [] },
  { ...battleCry, tier: 1, tags: ['戦闘画面'] },
  { ...mistPilgrim, tier: 1, tags: ['タイトル画面'] },
  { ...winterCouncil, tier: 2, tags: [] },
  { ...glassRipples, tier: 2, tags: [] },
  { ...crookedPendulum, tier: 1, tags: ['イベント'] },
  { ...spiralCurrent, tier: 2, tags: [] },
  { ...maskedPassepied, tier: 1, tags: ['イベント'] },
  { ...condorBoard, tier: 2, tags: [] },
  { ...ironBanners, tier: 2, tags: [] },
  { ...highlandCovenant, tier: 2, tags: [] },
  { ...crimsonAlcazar, tier: 2, tags: [] },
  { ...mirageDiwan, tier: 2, tags: [] },
  { ...victorAccolade, tier: 1, tags: ['戦闘勝利'] },
  { ...borderlineScouts, tier: 1, tags: ['戦略画面', '冬'] },
  { ...noonFairWind, tier: 1, tags: ['戦略画面', '夏'] },
  { ...goldenHomeward, tier: 2, tags: ['戦略画面', '秋'] },
  { ...birchRidge, tier: 1, tags: ['戦略画面', '秋'] },
  { ...crystalMap, tier: 1, tags: ['戦略画面', '春'] },
]

// タグを複数指定した場合は、すべてを含む曲に絞る。
export function filterSongs(tier: SongTier | 'all', tags: readonly string[] = []): CatalogSong[] {
  return SONGS.filter((song) => (tier === 'all' || song.tier === tier) && tags.every((tag) => song.tags.includes(tag)))
}
