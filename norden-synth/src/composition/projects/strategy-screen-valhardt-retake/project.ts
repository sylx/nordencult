import type { CompositionProject } from '../../workflow.ts'
import { feedback } from './feedback.ts'
import { firstHooks } from './hooks-001.ts'
import { northernLegionDevelopments } from './themes-001.ts'
import { northernHomeModalStructures } from './structure-001.ts'
import { northernHomeModalStructures02 } from './structure-002.ts'
import { ebMirageOrchestrations } from './orchestration-001.ts'

export const strategyScreenValhardtRetake: CompositionProject = {
  id: 'strategy-screen-valhardt-retake',
  title: '戦略画面BGMその7「ヴァルハルト家（再」',
  adoptedSongId: 'northern-vista',
  // 画面で入力された値をそのまま書く。
  brief: {
    purpose:
      'ファンタジーSLGの戦略画面のBGMです。春はそれぞれの勢力のテーマが流れるようにしたいので、そのうちヴァルハルト家のテーマになります。',
    image:
      'ヴァルハルト家についてはnorden-data/docs/design/factions.mdを参照してください\nnorden-synth/src/songs/source_midi/srb\n内のmidiファイルや、analysis内のデータを元にして、\nコード感や調を再現して、不思議なテイストのある勇ましくリズミカルなテーマ曲にしてください。\nごく普通の4/4拍子がいいと思います。',
    avoid: '戦闘画面ほどの緊張感はいらない\nゆっくりすぎるテンポ\n変拍子、ワルツ',
    references: [],
  },
  // 新しい組は末尾に追加する。既存の組・候補は上書きしない。
  batches: [
    {
      id: 'strategy-screen-valhardt-retake-hooks-001',
      title: 'フック集 01 — 4/4拍子・勇ましく不思議なヴァルハルトの十二の冒頭',
      stage: 'hooks',
      candidates: firstHooks,
    },
    {
      id: 'strategy-screen-valhardt-retake-themes-001',
      title: '北方軍団の行進 — 主題の展開 01',
      stage: 'themes',
      parentId: 'valhardt2-hook-northern-legion',
      candidates: northernLegionDevelopments,
    },
    {
      id: 'strategy-screen-valhardt-retake-structure-001',
      title: '主調のまま bII（Fmaj7）の陰りで深める — 構成案 01',
      stage: 'structure',
      parentId: 'valhardt2-theme-northern-home-modal',
      candidates: northernHomeModalStructures,
    },
    {
      id: 'strategy-screen-valhardt-retake-structure-002',
      title: '主調のまま bII（Fmaj7）の陰りで深める — 構成案 02（憂いと転調の驚き）',
      stage: 'structure',
      parentId: 'valhardt2-theme-northern-home-modal',
      candidates: northernHomeModalStructures02,
    },
    {
      id: 'strategy-screen-valhardt-retake-orchestration-001',
      title: 'ト長調〜ロ短調の陰影から、半音下の変ホ長調へ飛ぶ — 編曲 01',
      stage: 'orchestration',
      parentId: 'valhardt2-struct2-eb-mirage',
      candidates: ebMirageOrchestrations,
    },
  ],
  feedback,
}
