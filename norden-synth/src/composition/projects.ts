import type { CompositionStudy } from './study.ts'
import type { CompositionProject } from './workflow.ts'
import { strategyScreen } from './projects/strategy-screen/project.ts'
import { strategyScreenSummer } from './projects/strategy-screen-summer/project.ts'
import { strategyScreenAutumn } from './projects/strategy-screen-autumn/project.ts'
import { strategyScreenAutumnRetake } from './projects/strategy-screen-autumn-retake/project.ts'
import { strategyScreenFive } from './projects/strategy-screen-five/project.ts'

// 作曲プロジェクトの一覧。新しいプロジェクトは末尾に追加する。
// 各プロジェクトは projects/<id>/project.ts に、ブリーフ・候補の組・感想をまとめて持つ。
export const PROJECTS: CompositionProject[] = [
  strategyScreen,
  strategyScreenSummer,
  strategyScreenAutumn,
  strategyScreenAutumnRetake,
  strategyScreenFive,
]

// 診断 CLI 用の索引。通常のゲーム用 SONGS には登録しない。
export const STUDIES: CompositionStudy[] = PROJECTS.flatMap((p) => p.batches.flatMap((b) => b.candidates))
