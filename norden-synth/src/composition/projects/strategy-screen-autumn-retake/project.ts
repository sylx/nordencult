import type { CompositionProject } from '../../workflow.ts'
import { feedback } from './feedback.ts'
import { firstHooks } from './hooks-001.ts'
import { secondHooks } from './hooks-002.ts'
import { birchOrchestrations } from './orchestration-001.ts'
import { birchStructures } from './structure-001.ts'
import { birchRidgeDevelopments } from './themes-001.ts'
import { secondBirchRidgeDevelopments } from './themes-002.ts'

export const strategyScreenAutumnRetake: CompositionProject = {
  id: 'strategy-screen-autumn-retake',
  title: '戦略画面のBGMその4（秋・リテイク）',
  adoptedSongId: 'birch-ridge',
  // 画面で入力された値をそのまま書く。
  brief: {
    purpose: 'ファンタジーSLGの戦略画面のBGM',
    image:
      '秋ということで、実りの秋の攻勢への期待感を増しつつ、来たるべき冬への不安感が同居しているような、明るいが緊張感のあるイメージが欲しい。シンプルだが印象的なメロディに複雑な転調（並行移動）やテンションコードを組み合わせるといいかもしれない。',
    avoid: '戦闘画面ほどの緊張感はいらない\nゆっくりすぎるテンポ',
    references: [],
  },
  // 新しい組は末尾に追加する。既存の組・候補は上書きしない。
  batches: [
    {
      id: 'strategy-screen-autumn-retake-hooks-001',
      title: 'フック集 01 — 実りの期待と冬の影、十二の冒頭',
      stage: 'hooks',
      candidates: firstHooks,
    },
    {
      id: 'strategy-screen-autumn-retake-hooks-002',
      title: 'フック集 02 — 実りと霜気、十二の旋律線',
      stage: 'hooks',
      candidates: secondHooks,
    },
    {
      id: 'strategy-screen-autumn-retake-themes-001',
      title: '白樺の稜線 — 主題の展開 01',
      stage: 'themes',
      parentId: 'autumn-retake-hook2-birch-ridge',
      candidates: birchRidgeDevelopments,
    },
    {
      id: 'strategy-screen-autumn-retake-themes-002',
      title: '白樺の稜線 — 主題の展開 02',
      stage: 'themes',
      parentId: 'autumn-retake-hook2-birch-ridge',
      candidates: secondBirchRidgeDevelopments,
    },
    {
      id: 'strategy-screen-autumn-retake-structure-001',
      title: '白樺の稜線 — フル尺の構成案 01',
      stage: 'structure',
      parentId: 'autumn-retake-theme2-birch-diatonic-pure',
      candidates: birchStructures,
    },
    {
      id: 'strategy-screen-autumn-retake-orchestration-001',
      title: '白樺の稜線 — 管弦楽編曲 01',
      stage: 'orchestration',
      parentId: 'autumn-retake-struct-birch-frost-reprise',
      candidates: birchOrchestrations,
    },
  ],
  feedback,
}
