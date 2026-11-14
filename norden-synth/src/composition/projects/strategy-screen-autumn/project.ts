import type { CompositionProject } from '../../workflow.ts'
import { feedback } from './feedback.ts'
import { firstThemes } from './themes-001.ts'
import { secondThemes } from './themes-002.ts'
import { thirdThemes } from './themes-003.ts'
import { fourthThemes } from './themes-004.ts'
import { homewardStructures } from './structure-001.ts'
import { eveningBellOrchestrations } from './orchestration-001.ts'

export const strategyScreenAutumn: CompositionProject = {
  id: 'strategy-screen-autumn',
  title: '戦略画面のBGMその3(秋)',
  adoptedSongId: 'golden-homeward',
  // 画面で入力された値をそのまま書く。
  brief: {
    purpose: 'ファンタジーSLGの戦略画面のBGM。秋に流す',
    image: '実りの秋に期待感が高まるような曲。。平行移動が好みなので、取り入れるのもいい。',
    avoid: '行進曲的な感じにしない（戦闘画面ではない）\n複雑にしない',
    references: [
      {
        songId: 'noon-fair-wind',
        notes: 'トナルセンターの曖昧な浮遊感、メロディはもうちょっと頑張ってほしかったが。',
      },
    ],
  },
  // 新しい組は末尾に追加する。既存の組・候補は上書きしない。
  batches: [
    {
      id: 'strategy-screen-autumn-themes-001',
      title: '主題集 01 — 実りの秋、浮遊と期待の六案',
      stage: 'themes',
      candidates: firstThemes,
    },
    {
      id: 'strategy-screen-autumn-themes-002',
      title: '主題集 02 — 歌える主題と抑揚を練り直した六案',
      stage: 'themes',
      candidates: secondThemes,
    },
    {
      id: 'strategy-screen-autumn-themes-003',
      title: '主題集 03 — キャッチーな旋律と透明な和声の六案',
      stage: 'themes',
      candidates: thirdThemes,
    },
    {
      id: 'strategy-screen-autumn-themes-004',
      title: '主題集 04 — 音階で歌い、和声に溶ける六案',
      stage: 'themes',
      candidates: fourthThemes,
    },
    {
      id: 'autumn-golden-homeward-structure-001',
      title: '黄金の穂波、帰り道 — 構成案 01',
      stage: 'structure',
      parentId: 'autumn-golden-homeward',
      candidates: homewardStructures,
    },
    {
      id: 'autumn-homeward-evening-bell-orchestration-001',
      title: '黄金の穂波 — 夕暮れの遠い鐘 — 編曲 01',
      stage: 'orchestration',
      parentId: 'autumn-homeward-evening-bell',
      candidates: eveningBellOrchestrations,
    },
  ],
  feedback,
}
