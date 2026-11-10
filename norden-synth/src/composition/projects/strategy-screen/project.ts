import type { CompositionProject } from '../../workflow.ts'
import { feedback } from './feedback.ts'
import { firstThemes } from './themes-001.ts'
import { secondThemes } from './themes-002.ts'
import { thirdThemes } from './themes-003.ts'
import { fourthThemes } from './themes-004.ts'
import { fifthThemes } from './themes-005.ts'
import { borderlineScoutsHarmonies } from './harmony-001.ts'
import { borderlineScoutsOrchestrated } from './orchestration-001.ts'

// プロジェクト化より前の作業を移したもの。ブリーフは当時のユーザーの感想
// （feedback.ts の themes-001）から用途だけを写し、その他は空のまま残す。
export const strategyScreen: CompositionProject = {
  id: 'strategy-screen',
  title: '戦略画面のBGM',
  brief: {
    purpose: 'ファンタジーSLGの戦略画面のBGM',
    image: '',
    avoid: '',
    references: [],
  },
  adoptedSongId: 'borderline-scouts',
  // 新しい組は末尾に追加する。既存の組・候補は上書きしない。
  batches: [
    { id: 'themes-001', title: '主題集 01 — 五つの風景', stage: 'themes', candidates: firstThemes },
    { id: 'themes-002', title: '主題集 02 — 盤上の六つの局面', stage: 'themes', candidates: secondThemes },
    { id: 'themes-003', title: '主題集 03 — 戦線と地図の六つの主題', stage: 'themes', candidates: thirdThemes },
    { id: 'themes-004', title: '主題集 04 — 斥候の輪郭と響きの六つの主題', stage: 'themes', candidates: fourthThemes },
    { id: 'themes-005', title: '主題集 05 — 軍議と旅路の六つの主題', stage: 'themes', candidates: fifthThemes },
    {
      id: 'borderline-scouts-harmony-001',
      title: '国境線の斥候 — 和声案 01',
      stage: 'harmony',
      parentId: 'borderline-scouts',
      candidates: borderlineScoutsHarmonies,
    },
    {
      id: 'borderline-scouts-orchestration-001',
      title: '国境線の斥候 — 編曲 01',
      stage: 'orchestration',
      parentId: 'borderline-scouts-pedal-drive',
      candidates: [borderlineScoutsOrchestrated],
    },
  ],
  feedback,
}
