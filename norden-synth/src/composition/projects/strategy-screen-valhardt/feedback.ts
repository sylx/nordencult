import type { FeedbackEntry } from '../../workflow.ts'

// 各組への試聴の感想。ユーザーの発言をそのまま残し、AI の推測を入れない。
export const feedback: FeedbackEntry[] = [
  {
    batchId: 'strategy-screen-valhardt-hooks-001',
    candidates: [
      'valhardt-hook-ashen-eagle',
      'valhardt-hook-caucasa-watch',
      'valhardt-hook-hexaria-seal',
      'valhardt-hook-iron-oath',
      'valhardt-hook-mine-lantern',
      'valhardt-hook-imperial-calendar',
      'valhardt-hook-northern-garrison',
      'valhardt-hook-silver-wing',
      'valhardt-hook-frost-bastion',
      'valhardt-hook-algarde-caravan',
      'valhardt-hook-grey-throne',
      'valhardt-hook-forbidden-archive',
    ],
    mode: 'hooks',
    preferred: 'valhardt-hook-grey-throne',
    keep: '○ 見込みあり: 「ヘクサリアの封印」「レンハウスの坑道灯」「銀鷲の滑空」「灰座への敬礼」／「ヘクサリアの封印」: とてもいい／「レンハウスの坑道灯」: 悪くはない／「銀鷲の滑空」: いいね！／「灰座への敬礼」: 気に入った！',
    change:
      '× 見送り: 「灰鷲の紋章」「コーカサの稜線」「誓約騎士の歩み」「旧帝国の暦」「北方軍団の号令」「霜降る城壁」「アルガルデの交易路」「禁忌の書庫」／「灰鷲の紋章」: ピンとこない／「コーカサの稜線」: 単調／「ヘクサリアの封印」: 二回目が外れてる／「誓約騎士の歩み」: メロディに創意がない／「旧帝国の暦」: 二回目が外れてる／「北方軍団の号令」: 無理がある／「霜降る城壁」: 二回目にひっかかる／「アルガルデの交易路」: 二回目にひっかかる／「禁忌の書庫」: 二回目が外れてる',
    userWords:
      '派生元: 「灰座への敬礼」 (parentId: valhardt-hook-grey-throne)／○ 見込みあり: 「ヘクサリアの封印」「レンハウスの坑道灯」「銀鷲の滑空」「灰座への敬礼」／× 見送り: 「灰鷲の紋章」「コーカサの稜線」「誓約騎士の歩み」「旧帝国の暦」「北方軍団の号令」「霜降る城壁」「アルガルデの交易路」「禁忌の書庫」／「灰鷲の紋章」へのメモ: ピンとこない／「コーカサの稜線」へのメモ: 単調／「ヘクサリアの封印」へのメモ: とてもいいが、二回目が外れてる／「誓約騎士の歩み」へのメモ: メロディに創意がない／「レンハウスの坑道灯」へのメモ: 悪くはない／「旧帝国の暦」へのメモ: 二回目が外れてる／「北方軍団の号令」へのメモ: 無理がある／「銀鷲の滑空」へのメモ: いいね！／「霜降る城壁」へのメモ: 二回目にひっかかる／「アルガルデの交易路」へのメモ: 二回目にひっかかる／「灰座への敬礼」へのメモ: 気に入った！／「禁忌の書庫」へのメモ: 二回目が外れてる',
  },
  {
    batchId: 'strategy-screen-valhardt-themes-001',
    candidates: [
      'valhardt-theme-grey-whole-step-up',
      'valhardt-theme-grey-restate-minor-third-up',
      'valhardt-theme-grey-flat-six',
      'valhardt-theme-grey-home-modal',
    ],
    mode: 'theme-with-harmony',
    preferred: 'valhardt-theme-grey-restate-minor-third-up',
    keep: '「灰座への敬礼 — 言い直しから短3度上（ヘ長調）へ」: 破綻がない。いいと思う／「灰座への敬礼 — ♭VI（変ロ長調）の陰りへ沈む」: 下降はわるくないのだが',
    change:
      '「灰座への敬礼 — 全音上（ホ長調）の遠望」: フックを引っ張りすぎかなあ／「灰座への敬礼 — ♭VI（変ロ長調）の陰りへ沈む」: フックを引っ張りすぎ／「灰座への敬礼 — 平行移動せず、主調の借用和音で深める」: 細かいところで外れてる',
    userWords:
      '派生元: 「灰座への敬礼 — 言い直しから短3度上（ヘ長調）へ」 (parentId: valhardt-theme-grey-restate-minor-third-up)／「灰座への敬礼 — 全音上（ホ長調）の遠望」へのメモ: フックを引っ張りすぎかなあ／「灰座への敬礼 — 言い直しから短3度上（ヘ長調）へ」へのメモ: 破綻がない。いいと思う／「灰座への敬礼 — ♭VI（変ロ長調）の陰りへ沈む」へのメモ: フックを引っ張りすぎ。下降はわるくないのだが／「灰座への敬礼 — 平行移動せず、主調の借用和音で深める」へのメモ: 細かいところで外れてる',
  },
  {
    batchId: 'strategy-screen-valhardt-structure-001',
    candidates: [
      'valhardt-struct-bminor-arch',
      'valhardt-struct-am-fm-journey',
      'valhardt-struct-rondo-ab',
    ],
    mode: 'structure',
    preferred: 'valhardt-struct-bminor-arch',
    keep: '「ロ短調の霧を越えて、高音域の再現へ（A–B–A′）」: 細かいところで外れてるような気もするが無難／「鐘の導入から主題を割り、変イ長調を挟む（Intro–A₁–B–A₂–Coda）」: Introは他案でもとりいれてほしい。',
    change:
      '「ロ短調の霧を越えて、高音域の再現へ（A–B–A′）」: 細かいところで外れてるような気もする／「イ短調の誓約からヘ短調の展開を経て帰る（A–B–C–A′）」: ちょっと転調がイカツすぎる／「鐘の導入から主題を割り、変イ長調を挟む（Intro–A₁–B–A₂–Coda）」: 主題以外に見るべきところがない。',
    userWords:
      '派生元: 「ロ短調の霧を越えて、高音域の再現へ（A–B–A′）」 (parentId: valhardt-struct-bminor-arch)／「ロ短調の霧を越えて、高音域の再現へ（A–B–A′）」へのメモ: 細かいところで外れてるような気もするが無難／「イ短調の誓約からヘ短調の展開を経て帰る（A–B–C–A′）」へのメモ: ちょっと転調がイカツすぎる／「鐘の導入から主題を割り、変イ長調を挟む（Intro–A₁–B–A₂–Coda）」へのメモ: Introは他案でもとりいれてほしい。主題以外に見るべきところがない。',
  },
]
