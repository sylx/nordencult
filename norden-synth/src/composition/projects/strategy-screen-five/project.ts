import type { CompositionProject } from '../../workflow.ts'
import { feedback } from './feedback.ts'
import { firstHooks } from './hooks-001.ts'
import { crystalMapDevelopments } from './themes-001.ts'
import { secondCrystalMapDevelopments } from './themes-002.ts'
import { crystalMapStructures } from './structure-001.ts'
import { crystalValleyOrchestrations } from './orchestration-001.ts'

export const strategyScreenFive: CompositionProject = {
  id: 'strategy-screen-five',
  title: '戦略画面のBGMその5',
  adoptedSongId: 'crystal-map',
  // 画面で入力された値をそのまま書く。
  brief: {
    purpose: 'ファンタジーSLGの戦略画面のBGM',
    image:
      'norden-synth/src/songs/source_midi/srb\n内のmidiファイルや、analysis内のデータを元にして、\nコード感や調を再現して、不思議なテイストのあるリズミカルなテーマ曲',
    avoid: '戦闘画面ほどの緊張感はいらない\nゆっくりすぎるテンポ',
    references: [],
  },
  // 新しい組は末尾に追加する。既存の組・候補は上書きしない。
  batches: [
    {
      id: 'strategy-screen-five-hooks-001',
      title: 'フック集 01 — 付加音と借用和音の不思議な十二の冒頭',
      stage: 'hooks',
      candidates: firstHooks,
    },
    {
      id: 'strategy-screen-five-themes-001',
      title: '水晶の地図 — 主題の展開 01',
      stage: 'themes',
      parentId: 'screen5-hook-crystal-map',
      candidates: crystalMapDevelopments,
    },
    {
      id: 'strategy-screen-five-themes-002',
      title: '水晶の地図 — 主題の展開 02',
      stage: 'themes',
      parentId: 'screen5-hook-crystal-map',
      candidates: secondCrystalMapDevelopments,
    },
    {
      id: 'strategy-screen-five-structure-001',
      title: '水晶の地図 — 構成案 01',
      stage: 'structure',
      parentId: 'screen5-theme2-crystal-dotted-sequence',
      candidates: crystalMapStructures,
    },
    {
      id: 'strategy-screen-five-orchestration-001',
      title: '水晶の地図 — 編曲 01',
      stage: 'orchestration',
      parentId: 'screen5-struct-crystal-valley',
      candidates: crystalValleyOrchestrations,
    },
  ],
  feedback,
}
