import type { CompositionProject } from '../../workflow.ts'
import { feedback } from './feedback.ts'
import { firstThemes } from './themes-001.ts'
import { secondThemes } from './themes-002.ts'
import { thirdThemes } from './themes-003.ts'
import { fourthThemes } from './themes-004.ts'
import { noonMidDbHarmonies } from './harmony-002.ts'
import { noonFairWindOrchestrated } from './orchestration-001.ts'
import { noonFairWindOrchestrations } from './orchestration-002.ts'
import { noonAscentHarmonies } from './harmony-001.ts'

export const strategyScreenSummer: CompositionProject = {
  id: 'strategy-screen-summer',
  title: '戦略画面のBGMその2(夏)',
  // 画面で入力された値をそのまま書く。
  brief: {
    purpose: 'ファンタジーSLGの戦略画面のBGM。夏に流す',
    image: 'リズミカルで軽快な曲。勇ましく、乗れる感じにしてほしい。平行移動が好みなので、取り入れるのもいい。ベースラインをディスコ的にするのもいいかもしれない。クラシックのジャンルを超えて考えてほしい',
    avoid: '行進曲的な感じにしない（戦闘画面ではない）\n複雑にしない',
    references: [],
  },
  adoptedSongId: 'noon-fair-wind',
  // 新しい組は末尾に追加する。既存の組・候補は上書きしない。
  batches: [
    {
      id: 'strategy-screen-summer-themes-001',
      title: '主題集 01 — 夏の六つのグルーヴ',
      stage: 'themes',
      candidates: firstThemes,
    },
    {
      id: 'strategy-screen-summer-themes-002',
      title: '主題集 02 — 平行移動と長い歌の六つの主題',
      stage: 'themes',
      candidates: secondThemes,
    },
    {
      id: 'summer-noon-fair-wind-ascent-harmony-001',
      title: '真昼の凱風、ふたたび — 和声案 01',
      stage: 'harmony',
      parentId: 'summer-noon-fair-wind-ascent',
      candidates: noonAscentHarmonies,
    },
    // 9〜12小節目の旋律を作り直す依頼のため、和声案ではなく主題の組として追加した。
    {
      id: 'strategy-screen-summer-themes-003',
      title: '主題集 03 — 真昼の凱風、Abmaj7 に留まる五つの中間部',
      stage: 'themes',
      candidates: thirdThemes,
    },
    {
      id: 'strategy-screen-summer-themes-004',
      title: '主題集 04 — 真昼の凱風、中間部の旋律を作り直した六案',
      stage: 'themes',
      candidates: fourthThemes,
    },
    {
      id: 'summer-noon-mid-db-parallel-harmony-001',
      title: '真昼の凱風 — 変ニへ沈む、二行の詩 — 和声案 01',
      stage: 'harmony',
      parentId: 'summer-noon-mid-db-parallel',
      candidates: noonMidDbHarmonies,
    },
    {
      id: 'summer-noon-mid-db-four-colors-orchestration-001',
      title: '真昼の凱風 — 編曲 01',
      stage: 'orchestration',
      parentId: 'summer-noon-mid-db-four-colors',
      candidates: [noonFairWindOrchestrated],
    },
    {
      id: 'summer-noon-mid-db-four-colors-orchestration-002',
      title: '真昼の凱風 — 編曲 02（管弦楽・後半は変奏）',
      stage: 'orchestration',
      parentId: 'summer-noon-mid-db-four-colors',
      candidates: noonFairWindOrchestrations,
    },
  ],
  feedback,
}
