import type { FeedbackEntry } from '../../workflow.ts'

// 各組への試聴の感想。ユーザーの発言をそのまま残し、AI の推測を入れない。
export const feedback: FeedbackEntry[] = [
  {
    batchId: 'strategy-screen-valhardt-retake-hooks-001',
    candidates: [
      'valhardt2-hook-silver-eagle-banner',
      'valhardt2-hook-ashen-guardian',
      'valhardt2-hook-caucasa-gate',
      'valhardt2-hook-hexaria-astrolabe',
      'valhardt2-hook-northern-legion',
      'valhardt2-hook-rime-oath',
      'valhardt2-hook-renhaus-forge',
      'valhardt2-hook-algarde-dispatch',
      'valhardt2-hook-winter-wheat',
      'valhardt2-hook-imperial-almanac',
      'valhardt2-hook-black-eagle-silver',
      'valhardt2-hook-envoy-to-ashdar',
    ],
    mode: 'hooks',
    preferred: 'valhardt2-hook-northern-legion',
    keep: '○ 見込みあり: 「北方軍団の行進」「灰都への使者」／「北方軍団の行進」: 悪くない／「灰都への使者」: これも悪くはない',
    change:
      '× 見送り: 「銀鷲の旗印」「灰の守護者」「コーカサの関所」「ヘクサリアの星盤」「霧氷の誓約」「レンハウスの鍛冶歌」「アルガルデの早馬」「冬越しの麦」「旧帝国の暦」「黒鷲と白銀」／「銀鷲の旗印」: 可もなく不可もなく／「灰の守護者」: 良くない／「コーカサの関所」: 良くない／「ヘクサリアの星盤」: いい気もするが確信がもてない／「霧氷の誓約」: 可もなく不可もなく／「レンハウスの鍛冶歌」: トリッキーすぎる／「アルガルデの早馬」: 良くない／「冬越しの麦」: っぽいんだけど違う／「旧帝国の暦」: 平凡／「黒鷲と白銀」: トリッキー',
    userWords:
      '派生元: 「北方軍団の行進」 (parentId: valhardt2-hook-northern-legion)／○ 見込みあり: 「北方軍団の行進」「灰都への使者」／× 見送り: 「銀鷲の旗印」「灰の守護者」「コーカサの関所」「ヘクサリアの星盤」「霧氷の誓約」「レンハウスの鍛冶歌」「アルガルデの早馬」「冬越しの麦」「旧帝国の暦」「黒鷲と白銀」／「銀鷲の旗印」へのメモ: 可もなく不可もなく／「灰の守護者」へのメモ: 良くない／「コーカサの関所」へのメモ: 良くない／「ヘクサリアの星盤」へのメモ: いい気もするが確信がもてない／「北方軍団の行進」へのメモ: 悪くない／「霧氷の誓約」へのメモ: 可もなく不可もなく／「レンハウスの鍛冶歌」へのメモ: トリッキーすぎる／「アルガルデの早馬」へのメモ: 良くない／「冬越しの麦」へのメモ: っぽいんだけど違う／「旧帝国の暦」へのメモ: 平凡／「黒鷲と白銀」へのメモ: トリッキー／「灰都への使者」へのメモ: これも悪くはない',
  },
  {
    batchId: 'strategy-screen-valhardt-retake-themes-001',
    candidates: [
      'valhardt2-theme-northern-whole-step',
      'valhardt2-theme-northern-minor-third',
      'valhardt2-theme-northern-minor-third-down',
      'valhardt2-theme-northern-home-modal',
    ],
    mode: 'theme-with-harmony',
    preferred: 'valhardt2-theme-northern-home-modal',
    keep: '「北方軍団の行進 — 短3度下（嬰ハ短調）へ沈み、再び登る」: 陰りがあっていいんじゃないかね／「北方軍団の行進 — 主調のまま bII（Fmaj7）の陰りで深める」: これで良さそう',
    change:
      '「北方軍団の行進 — 全音上（嬰ヘ短調）で留まり、高みから帰る」: いいところがない／「北方軍団の行進 — 言い直しから短3度上（ト短調）へ開く」: ところどころピントが外れている',
    userWords:
      '派生元: 「北方軍団の行進 — 主調のまま bII（Fmaj7）の陰りで深める」 (parentId: valhardt2-theme-northern-home-modal)／「北方軍団の行進 — 全音上（嬰ヘ短調）で留まり、高みから帰る」へのメモ: いいところがない／「北方軍団の行進 — 言い直しから短3度上（ト短調）へ開く」へのメモ: ところどころピントが外れている／「北方軍団の行進 — 短3度下（嬰ハ短調）へ沈み、再び登る」へのメモ: 陰りがあっていいんじゃないかね／「北方軍団の行進 — 主調のまま bII（Fmaj7）の陰りで深める」へのメモ: これで良さそう',
  },
  {
    batchId: 'strategy-screen-valhardt-retake-structure-001',
    candidates: [
      'valhardt2-struct-arch-csharp',
      'valhardt2-struct-rondo-distant',
      'valhardt2-struct-climax-aminor',
    ],
    mode: 'structure',
    preferred: 'neither',
    change:
      '主題以外の部分に驚きや感動がなかった。もう一度考え直してほしい／「導入から嬰ハ短調の陰りを越えて、高音の山場へ（Intro–A–B–A′–Coda）」: 高音がちょっと…／「春のト長調と遠隔の変ロ長調を巡るロンド（A–B–A′–C–A″）」: もっと憂いが残るほうがいいんだよなあ／「長い導入からハ長調の行進とイ短調の頂点へ（Intro–A–B–C–A′）」: Introが意味不明。B対比からの盛り上がりに欠ける',
    userWords:
      '派生元: 「北方軍団の行進 — 主調のまま bII（Fmaj7）の陰りで深める」 (parentId: valhardt2-theme-northern-home-modal)／全体への要望: 主題以外の部分に驚きや感動がなかった。もう一度考え直してほしい／「導入から嬰ハ短調の陰りを越えて、高音の山場へ（Intro–A–B–A′–Coda）」へのメモ: 高音がちょっと…／「春のト長調と遠隔の変ロ長調を巡るロンド（A–B–A′–C–A″）」へのメモ: もっと憂いが残るほうがいいんだよなあ／「長い導入からハ長調の行進とイ短調の頂点へ（Intro–A–B–C–A′）」へのメモ: Introが意味不明。B対比からの盛り上がりに欠ける',
  },
  {
    batchId: 'strategy-screen-valhardt-retake-structure-002',
    candidates: [
      'valhardt2-struct2-neapolitan-lament',
      'valhardt2-struct2-csharp-elegy',
      'valhardt2-struct2-eb-mirage',
    ],
    mode: 'structure',
    preferred: 'valhardt2-struct2-eb-mirage',
    keep: '「ト長調〜ロ短調の陰影から、半音下の変ホ長調へ飛ぶ（A–B–C–A′）」: 転調はうまくいってる',
    change:
      '「ハ短調の深い憂いから、ナポリのヘ長調へ開く（A–B–C–A′）」: ちょっととりとめがない／「刻みの導入から、嬰ハ短調の追憶と再起へ（Intro–A–B–A′–Coda）」: なんか破綻しそうでギリギリの感／「ト長調〜ロ短調の陰影から、半音下の変ホ長調へ飛ぶ（A–B–C–A′）」: ループとして成立しているかは微妙',
    userWords:
      '派生元: 「ト長調〜ロ短調の陰影から、半音下の変ホ長調へ飛ぶ（A–B–C–A′）」 (parentId: valhardt2-struct2-eb-mirage)／「ハ短調の深い憂いから、ナポリのヘ長調へ開く（A–B–C–A′）」へのメモ: ちょっととりとめがない／「刻みの導入から、嬰ハ短調の追憶と再起へ（Intro–A–B–A′–Coda）」へのメモ: なんか破綻しそうでギリギリの感／「ト長調〜ロ短調の陰影から、半音下の変ホ長調へ飛ぶ（A–B–C–A′）」へのメモ: 転調はうまくいってるループとして成立しているかは微妙',
  },
]
