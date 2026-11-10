import type { FeedbackEntry } from '../../workflow.ts'

// 各組への試聴の感想。ユーザーの発言をそのまま残し、AI の推測を入れない。
// 最初の lantern-a/b は作曲工房より前の A/B 比較で、対応する組はない。
export const feedback: FeedbackEntry[] = [
  {
    candidates: [
      "lantern-a",
      "lantern-b"
    ],
    preferred: "neither",
    userWords: "そもそもの主題がどちらも良くないケースになってる。主題と和声を個別にする意味もない。"
  },
  {
    batchId: "themes-001",
    candidates: [
      "snowlight-return",
      "harbor-wind",
      "brass-moon",
      "distant-lighthouse",
      "cobblestone-tailwind"
    ],
    mode: "theme-with-harmony",
    preferred: "neither",
    userWords: "欲しいイメージではない。ファンタジーSLGの戦略画面のBGMの雰囲気ではない。／「風を待つ港」: 唯一見込みがあるが曲調が楽天的すぎて、欲しいイメージではない／「石畳の追い風」: 変拍子いらないだろ"
  },
  {
    batchId: "themes-002",
    candidates: [
      "ashen-war-council",
      "corridor-of-counsel",
      "foghorn-strait",
      "scales-of-the-throne",
      "iron-and-parchment",
      "azure-star-chart"
    ],
    mode: "theme-with-harmony",
    preferred: "neither",
    userWords: "02密議の回廊・03霧笛の海峡は少し見込みがあると感じたが、詰めが甘い。バロック的な感じはいらない／「灰冠の軍議」: メロディが良さそうで、弱い。奇妙だが印象には残るには一歩たりない。音数がちょっとだけ多いのかもしれない／「密議の回廊」: 悪くないが、バロック臭が強い／「霧笛の海峡」: 悪くない。→Ebm6まではいいけど、その次のコード進行が駄目。コードにひっぱられすぎてメロディが破綻している／「玉座の天秤」: 宮廷から離れよう。退屈。後半のテンションコードはいい／「鉄と羊皮紙」: リズムが変すぎる／「蒼き星図」: ぼんやりした印象"
  },
  {
    batchId: "themes-003",
    candidates: [
      "expedition-tide",
      "borderline-scouts",
      "winter-watchfires",
      "obsidian-frontline",
      "skyline-campaign",
      "weathered-monolith"
    ],
    mode: "theme-with-harmony",
    preferred: "neither",
    keep: "「国境線の斥候」: 良い。平行移動も上手くいってる／「風蝕の石碑」: テンション和声／「蒼穹の遠征路」: 後半の展開はいい",
    change: "「遠征の潮風」: 後半のメロディの無理やり感が強い／「冬の街道、遠き篝火」: 退屈／「黒曜の戦線」: 無難な感じがある。後半、転調をもうちょっと上手く活かせれば／「蒼穹の遠征路」: シンコペーションは失敗している／「風蝕の石碑」: 無難な感じだが、少し後半のメロディに隙がある気がする",
    userWords: "全般的に良くなった。しかし、あえてもうワンテイクしてほしい。02国境線の斥候の路線、06風蝕の石碑のテンション和声をいかしたものを希望する／「遠征の潮風」: 後半のメロディの無理やり感が強い。／「国境線の斥候」: 良い。平行移動も上手くいってる。／「冬の街道、遠き篝火」: 退屈。後半はちょっといい／「黒曜の戦線」: 無難な感じがある。後半、転調をもうちょっと上手く活かせれば／「蒼穹の遠征路」: シンコペーションは失敗している。後半の展開はいい／「風蝕の石碑」: 無難な感じだが、黒曜の戦線よりこちらのほうが好み。少し後半のメロディに隙がある気がする"
  },
  {
    batchId: "themes-004",
    candidates: [
      "ridge-signal-fires",
      "rime-boundary-marker",
      "white-night-outpost",
      "frozen-sea-vanguard",
      "coldlight-war-table",
      "azure-frontline-map"
    ],
    mode: "theme-with-harmony",
    preferred: "neither",
    keep: "「冷光の作戦卓」: 比較的まとも（終盤手前まで）",
    change: "全般的にしょうもなくなった。すこし凝りすぎていると思う／複雑すぎる・印象に残らない／「冷光の作戦卓」: 最後なんかしょうもなくなる",
    userWords: "全般的にしょうもなくなった。すこし凝りすぎていると思う／「狼煙の稜線」: しょうもないメロディ／「霧氷の境界標」: 複雑すぎる／「白夜の前哨」: 複雑すぎて印象に残らない／「氷海の先鋒」: しょうもないメロディ／「冷光の作戦卓」: 比較的まともだが最後なんかしょうもなくなる／「蒼風の前線図」: 印象に残らない"
  },
  {
    batchId: "themes-005",
    candidates: [
      "northern-border-map",
      "afterglow-monolith",
      "snowfield-cavalry",
      "crimson-scout-trail",
      "ashen-citadel-dawn",
      "jade-war-board"
    ],
    mode: "theme-with-harmony",
    preferred: "borderline-scouts",
    userWords: "結局、主題集03を超えられてない。これ以上は無駄と判断／派生元: 「国境線の斥候」 (parentId: borderline-scouts)／和声的によくなるかはよくわからないが、バリエーションを出してほしい。メロディを変えても良い"
  },
  {
    batchId: "borderline-scouts-harmony-001",
    candidates: [
      "borderline-scouts-monolith",
      "borderline-scouts-sparse",
      "borderline-scouts-lament",
      "borderline-scouts-major-shift",
      "borderline-scouts-pedal-drive"
    ],
    mode: "harmony-variation",
    preferred: "borderline-scouts-pedal-drive",
    keep: "「国境線の斥候 — 保続の鼓動」: リズム感的にはこれでいいと思う",
    change: "「国境線の斥候 — 霧の石碑」: 無難だと思う／「国境線の斥候 — 透徹の五度」: ちょっと退屈。悪くはない／「国境線の斥候 — 下降する低音」: 邪魔をする和声／「国境線の斥候 — 陽光の転回」: あまり効果的だとは思わないけど、おしゃれ",
    userWords: "「国境線の斥候 — 霧の石碑」へのメモ: 無難だと思う／「国境線の斥候 — 透徹の五度」へのメモ: ちょっと退屈。悪くはない／「国境線の斥候 — 下降する低音」へのメモ: 邪魔をする和声／「国境線の斥候 — 陽光の転回」へのメモ: あまり効果的だとは思わないけど、おしゃれ／「国境線の斥候 — 保続の鼓動」へのメモ: リズム感的にはこれでいいと思う"
  },
  {
    batchId: "borderline-scouts-orchestration-001",
    candidates: [
      "borderline-scouts-orchestrated"
    ],
    mode: "orchestration",
    preferred: "borderline-scouts-orchestrated",
    userWords: "満足です。この曲をsongsに登録してください"
  }
]
