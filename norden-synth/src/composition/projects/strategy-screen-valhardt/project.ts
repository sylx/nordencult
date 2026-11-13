import type { CompositionProject } from '../../workflow.ts'
import { feedback } from './feedback.ts'
import { firstHooks } from './hooks-001.ts'
import { greyThroneDevelopments } from './themes-001.ts'
import { greyThroneStructures } from './structure-001.ts'
import { greyThroneOrchestrations } from './orchestration-001.ts'

export const strategyScreenValhardt: CompositionProject = {
  id: 'strategy-screen-valhardt',
  title: '戦略画面のBGMその6「ヴァルハルト家」',
  adoptedSongId: 'silver-banner',
  // 画面で入力された値をそのまま書く。
  brief: {
    purpose:
      'ファンタジーSLGの戦略画面のBGMです。春はそれぞれの勢力のテーマが流れるようにしたいので、そのうちヴァルハルト家のテーマになります。',
    image:
      'ヴァルハルト家についてはnorden-data/docs/design/factions.mdを参照してください\nnorden-synth/src/songs/source_midi/srb\n内のmidiファイルや、analysis内のデータを元にして、\nコード感や調を再現して、不思議なテイストのあるリズミカルなテーマ曲にしてください。',
    avoid: '戦闘画面ほどの緊張感はいらない\nゆっくりすぎるテンポ',
    references: [],
  },
  // 新しい組は末尾に追加する。既存の組・候補は上書きしない。
  batches: [
    {
      id: 'strategy-screen-valhardt-hooks-001',
      title: 'フック集 01 — 灰の守護者と srb の和声による十二の冒頭',
      stage: 'hooks',
      candidates: firstHooks,
    },
    {
      id: 'strategy-screen-valhardt-themes-001',
      title: '灰座への敬礼 — 主題の展開 01',
      stage: 'themes',
      parentId: 'valhardt-hook-grey-throne',
      candidates: greyThroneDevelopments,
    },
    {
      id: 'strategy-screen-valhardt-structure-001',
      title: '灰座への敬礼 — 構成案 01',
      stage: 'structure',
      parentId: 'valhardt-theme-grey-restate-minor-third-up',
      candidates: greyThroneStructures,
    },
    {
      id: 'strategy-screen-valhardt-orchestration-001',
      title: '灰座への敬礼 — 編曲 01',
      stage: 'orchestration',
      parentId: 'valhardt-struct-bminor-arch',
      candidates: greyThroneOrchestrations,
    },
  ],
  feedback,
}
