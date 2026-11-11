import type { FeedbackEntry } from '../../workflow.ts'

// 各組への試聴の感想。ユーザーの発言をそのまま残し、AI の推測を入れない。
export const feedback: FeedbackEntry[] = [
  {
    batchId: 'strategy-screen-autumn-retake-hooks-001',
    candidates: [
      'autumn-retake-hook-harvest-horn',
      'autumn-retake-hook-falling-leaves-waltz',
      'autumn-retake-hook-belfry',
      'autumn-retake-hook-clear-sky',
      'autumn-retake-hook-threshing',
      'autumn-retake-hook-campaign-map',
      'autumn-retake-hook-weathervane',
      'autumn-retake-hook-migrating-flock',
      'autumn-retake-hook-dusk-stairs',
      'autumn-retake-hook-banner-beyond-pass',
      'autumn-retake-hook-first-frost',
      'autumn-retake-hook-northbound-clouds',
    ],
    mode: 'hooks',
    preferred: 'neither',
    keep: '○ 見込みあり: 「落葉のワルツ」「澄んだ空、遠い雲」「麦打ちの輪」「風見鶏の旋回」／「落葉のワルツ」: 悪くはない／「澄んだ空、遠い雲」: イメージには近い／「麦打ちの輪」: 悪くはない／「風見鶏の旋回」: 可もなく不可もなく／「峠の向こうの旗」: 最初はいい',
    change: '× 見送り: 「刈り入れの角笛」「鐘楼の見張り」「遠征の地図」「渡り鳥の隊列」「夕暮れの石段」「峠の向こうの旗」「初霜の予感」「北へ向かう雲」／「刈り入れの角笛」: 後半がだめ／「落葉のワルツ」: イメージとは異なる／「鐘楼の見張り」: 良くない／「澄んだ空、遠い雲」: 少し？になはる／「麦打ちの輪」: イメージと違う／「遠征の地図」: AIっぽさがある／「渡り鳥の隊列」: やりたいことはわかるが違う／「夕暮れの石段」: やりたいことはわかるがイメージと違う／「峠の向こうの旗」: 次がだめ／「初霜の予感」: イメージが湧かない／「北へ向かう雲」: E6 へ5度跳ね上がるがだめ',
    userWords:
      '悪くないのもあるが、いいのもないという印象。やろうとしていることは評価できる／○ 見込みあり: 「落葉のワルツ」「澄んだ空、遠い雲」「麦打ちの輪」「風見鶏の旋回」／× 見送り: 「刈り入れの角笛」「鐘楼の見張り」「遠征の地図」「渡り鳥の隊列」「夕暮れの石段」「峠の向こうの旗」「初霜の予感」「北へ向かう雲」／「刈り入れの角笛」へのメモ: 後半がだめ／「落葉のワルツ」へのメモ: 悪くはないが、イメージとは異なる／「鐘楼の見張り」へのメモ: 良くない／「澄んだ空、遠い雲」へのメモ: イメージには近い。少し？になはる／「麦打ちの輪」へのメモ: 悪くはないが、イメージと違う／「遠征の地図」へのメモ: AIっぽさがある／「風見鶏の旋回」へのメモ: 可もなく不可もなく／「渡り鳥の隊列」へのメモ: やりたいことはわかるが違う／「夕暮れの石段」へのメモ: やりたいことはわかるがイメージと違う／「峠の向こうの旗」へのメモ: 最初はいいんだが、次がだめ／「初霜の予感」へのメモ: イメージが湧かない／「北へ向かう雲」へのメモ: E6 へ5度跳ね上がるがだめ',
  },
  {
    batchId: 'strategy-screen-autumn-retake-hooks-002',
    candidates: [
      'autumn-retake-hook2-golden-scout',
      'autumn-retake-hook2-north-beacon',
      'autumn-retake-hook2-frost-march',
      'autumn-retake-hook2-harvest-bonfire',
      'autumn-retake-hook2-birch-ridge',
      'autumn-retake-hook2-amber-corridor',
      'autumn-retake-hook2-wild-geese',
      'autumn-retake-hook2-valley-watchtower',
      'autumn-retake-hook2-leaves-and-hooves',
      'autumn-retake-hook2-late-autumn-banner',
      'autumn-retake-hook2-early-frost-rampart',
      'autumn-retake-hook2-harvest-oath',
    ],
    mode: 'hooks',
    preferred: 'autumn-retake-hook2-birch-ridge',
    keep: '○ 見込みあり: 「黄金の斥候」「白樺の稜線」「谷風の物見櫓」／「北風の狼煙」: ベースラインは好き／「白樺の稜線」: 有望／「谷風の物見櫓」: いいんだけど／「晩秋の陣旗」: 堂々としてるのはいい',
    change:
      '× 見送り: 「北風の狼煙」「霜降る朝の行軍」「収穫の篝火」「琥珀の回廊」「雁の遠鳴き」「落葉と蹄音」「晩秋の陣旗」「早霜の城壁」「収穫の誓い」／「霜降る朝の行軍」: 良さが見つからない／「谷風の物見櫓」: この後が問題だと思う／「晩秋の陣旗」: 稚拙／「収穫の誓い」: 二回目がだめ',
    userWords:
      '派生元: 「白樺の稜線」 (parentId: autumn-retake-hook2-birch-ridge)／○ 見込みあり: 「黄金の斥候」「白樺の稜線」「谷風の物見櫓」／× 見送り: 「北風の狼煙」「霜降る朝の行軍」「収穫の篝火」「琥珀の回廊」「雁の遠鳴き」「落葉と蹄音」「晩秋の陣旗」「早霜の城壁」「収穫の誓い」／「北風の狼煙」へのメモ: ベースラインは好き／「霜降る朝の行軍」へのメモ: 良さが見つからない／「白樺の稜線」へのメモ: 有望／「谷風の物見櫓」へのメモ: いいんだけど、この後が問題だと思う／「晩秋の陣旗」へのメモ: 堂々としてるのはいいのだが、稚拙／「収穫の誓い」へのメモ: 二回目がだめ',
  },
  {
    batchId: 'strategy-screen-autumn-retake-themes-001',
    candidates: [
      'autumn-retake-theme-birch-whole-step',
      'autumn-retake-theme-birch-minor-third',
      'autumn-retake-theme-birch-whole-step-down',
      'autumn-retake-theme-birch-stay-diatonic',
    ],
    mode: 'theme-with-harmony',
    preferred: 'neither',
    keep: '「白樺の稜線 — 全音下へ沈み、低音の推進力で戻る」: 悪くない／「白樺の稜線 — 平行移動せず主調で歌い広げる」: 一番まとも',
    change:
      '何が悪いのかうまく言えないが、良くない。／「白樺の稜線 — 全音上で留まり、高みへ開く」: まったく頭に入ってこない展開／「白樺の稜線 — 言い直しから短3度上の雪明かりへ」: ちょっと無理やりで、４帰着でそれが顕著になる／「白樺の稜線 — 全音下へ沈み、低音の推進力で戻る」: ところどころで？になる。なにより平行移動がうまくいってないのは致命的／「白樺の稜線 — 平行移動せず主調で歌い広げる」: ちょっと高すぎる。言い直しもうまくいったとは言えない',
    userWords:
      '何が悪いのかうまく言えないが、良くない。／「白樺の稜線 — 全音上で留まり、高みへ開く」へのメモ: まったく頭に入ってこない展開／「白樺の稜線 — 言い直しから短3度上の雪明かりへ」へのメモ: ちょっと無理やりで、４帰着でそれが顕著になる／「白樺の稜線 — 全音下へ沈み、低音の推進力で戻る」へのメモ: 悪くないが、ところどころで？になる。なにより平行移動がうまくいってないのは致命的／「白樺の稜線 — 平行移動せず主調で歌い広げる」へのメモ: 一番まともだが、ちょっと高すぎる。言い直しもうまくいったとは言えない',
  },
  {
    batchId: 'strategy-screen-autumn-retake-themes-002',
    candidates: [
      'autumn-retake-theme2-birch-diatonic-pure',
      'autumn-retake-theme2-birch-dominant-shift',
      'autumn-retake-theme2-birch-ab-refined',
      'autumn-retake-theme2-birch-subdominant-shift',
    ],
    mode: 'theme-with-harmony',
    preferred: 'autumn-retake-theme2-birch-diatonic-pure',
    keep: '「白樺の稜線 — 主調のまま澄んだ稜線を歌い継ぐ」: うまくまとまっていることは確か',
    change:
      '「白樺の稜線 — 主調のまま澄んだ稜線を歌い継ぐ」: 最後のトニックが落ち着きすぎてる。ちょっとテンションコードなどでオシャレにしたいところ。／「白樺の稜線 — 言い直しから属調（ヘ長調）へ平行移動」: 平行移動に失敗している／「白樺の稜線 — 言い直しから全音下（変イ長調）へ平行移動」: 平行移動に失敗している／「白樺の稜線 — 下属調（変ホ長調）へ平行移動し、実りを広げる」: 平行移動に失敗している',
    userWords:
      '派生元: 「白樺の稜線 — 主調のまま澄んだ稜線を歌い継ぐ」 (parentId: autumn-retake-theme2-birch-diatonic-pure)／「白樺の稜線 — 主調のまま澄んだ稜線を歌い継ぐ」へのメモ: 最後のトニックが落ち着きすぎてる。ちょっとテンションコードなどでオシャレにしたいところ。しかしうまくまとまっていることは確か／「白樺の稜線 — 言い直しから属調（ヘ長調）へ平行移動」へのメモ: 平行移動に失敗している／「白樺の稜線 — 言い直しから全音下（変イ長調）へ平行移動」へのメモ: 平行移動に失敗している／「白樺の稜線 — 下属調（変ホ長調）へ平行移動し、実りを広げる」へのメモ: 平行移動に失敗している',
  },
  {
    batchId: 'strategy-screen-autumn-retake-structure-001',
    candidates: [
      'autumn-retake-struct-birch-frost-reprise',
      'autumn-retake-struct-birch-golden-rondo',
      'autumn-retake-struct-birch-fortress-march',
    ],
    mode: 'structure',
    preferred: 'autumn-retake-struct-birch-frost-reprise',
    keep: '「白樺の稜線 — 秋霜の対比と夕照の再現」: 無難',
    change: '「白樺の稜線 — 風渡る前哨と黄金の展開」: とってつけたような展開／「白樺の稜線 — 暮れゆく砦の行軍歌」: 中途半端',
    userWords:
      '派生元: 「白樺の稜線 — 秋霜の対比と夕照の再現」 (parentId: autumn-retake-struct-birch-frost-reprise)／「白樺の稜線 — 秋霜の対比と夕照の再現」へのメモ: 無難／「白樺の稜線 — 風渡る前哨と黄金の展開」へのメモ: とってつけたような展開／「白樺の稜線 — 暮れゆく砦の行軍歌」へのメモ: 中途半端',
  },
]
