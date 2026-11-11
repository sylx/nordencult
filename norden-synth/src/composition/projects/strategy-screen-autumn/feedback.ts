import type { FeedbackEntry } from '../../workflow.ts'

// 各組への試聴の感想。ユーザーの発言をそのまま残し、AI の推測を入れない。
export const feedback: FeedbackEntry[] = [
  {
    batchId: 'strategy-screen-autumn-themes-001',
    candidates: [
      'autumn-golden-ripples',
      'autumn-amber-harvest',
      'autumn-wheatfield-breeze',
      'autumn-crimson-road',
      'autumn-orchard-afternoon',
      'autumn-harvest-lanterns',
    ],
    mode: 'theme-with-harmony',
    preferred: 'neither',
    keep: 'コード進行、転調はどれも好みでいい／「黄金の風紋」: イメージはいい。転調も悪くない／「麦穂を渡る風」: コード進行的には良い／「紅葉の街道、暮れゆく光」: コード進行はgood／「収穫の灯火」: 序盤のメロディはこれでいいかもしれない',
    change: 'ただメロディの創意がなさすぎる。アルベジエーターでも作れそうな旋律は主題とは呼べない。やり直し／「黄金の風紋」: 序盤が振るわない。メロディに印象的な部分がない／「琥珀の収穫祭」: 魅力がない／「麦穂を渡る風」: 序盤以降のメロディが振るわない／「紅葉の街道、暮れゆく光」: メロディに創意がない（これではアルベジエーターである）／「果樹園の午後」: これもメロディに創意がない。コード進行についていくすぎである／「収穫の灯火」: ずっと続くので退屈',
    userWords:
      'コード進行、転調はどれも好みでいい。ただメロディの創意がなさすぎる。アルベジエーターでも作れそうな旋律は主題とは呼べない。やり直し／「黄金の風紋」へのメモ: イメージはいい。転調も悪くないが、序盤が振るわない。メロディに印象的な部分がない／「琥珀の収穫祭」へのメモ: 魅力がない／「麦穂を渡る風」へのメモ: コード進行的には良い。序盤以降のメロディが振るわない／「紅葉の街道、暮れゆく光」へのメモ: メロディに創意がない（これではアルベジエーターである）。コード進行はgood／「果樹園の午後」へのメモ: これもメロディに創意がない。コード進行についていくすぎである。／「収穫の灯火」へのメモ: 序盤のメロディはこれでいいかもしれないが、ずっと続くので退屈。',
  },
  {
    batchId: 'strategy-screen-autumn-themes-002',
    candidates: [
      'autumn-wind-waiting-ridge',
      'autumn-migrating-sky',
      'autumn-harvest-bells',
      'autumn-fallen-leaves-corridor',
      'autumn-golden-horizon',
      'autumn-distant-lantern-oath',
    ],
    mode: 'theme-with-harmony',
    preferred: 'neither',
    keep: 'コード進行、転調などはそれほど問題がない／「落葉の回廊」: 比較的聴きやすい／「黄金の水平線」: イメージはできている／「遠い灯りの約束」: 少し良くなった気はする',
    change:
      '全般的に、複雑で聴きにくい。もっとキャッチーなメロディを心がけてほしい／「風待ちの稜線」: いいところは特にない／「秋の渡り、空の記憶」: 楽天的すぎる。特に魅力なし／「豊穣の鐘、夕映えの丘」: 奇妙なメロディ。よくない／「落葉の回廊」: まだ複雑／「黄金の水平線」: 魅力がない／「遠い灯りの約束」: 聴きやすくない',
    userWords:
      '全般的に、複雑で聴きにくい。もっとキャッチーなメロディを心がけてほしい。コード進行、転調などはそれほど問題がないのだから、できるはず／「風待ちの稜線」へのメモ: いいところは特にない／「秋の渡り、空の記憶」へのメモ: 楽天的すぎる。特に魅力なし／「豊穣の鐘、夕映えの丘」へのメモ: 奇妙なメロディ。よくない／「落葉の回廊」へのメモ: 比較的聴きやすいがまだ複雑／「黄金の水平線」へのメモ: 魅力がない。イメージはできているが。／「遠い灯りの約束」へのメモ: 少し良くなった気はするが、聴きやすくない',
  },
  {
    batchId: 'strategy-screen-autumn-themes-003',
    candidates: [
      'autumn-amber-map-wind',
      'autumn-dusk-banners',
      'autumn-highland-harvest',
      'autumn-belltower-promise',
      'autumn-mist-astrolabe',
      'autumn-golden-great-expectation',
    ],
    mode: 'theme-with-harmony',
    preferred: 'neither',
    keep: '「金風、稜線を渡る」: 音数についてはこれでいい／「黄金の大地、大いなる予感」: 前半はこの中で一番いい',
    change:
      'どのメロディも印象に残らない。印象深いメロディとはシンプル（スケールをそのまま移動するようなCDEFGみたいな）なもので、コードと綺麗に調和するようなメロディだと思う／「琥珀の地図、風が立つ」: 単調すぎる／「夕凪の城下、実りの旗」: 並行移動を始めてから移動しつづけるのではなくて、しばらく同じ調でメロディで変化をつけてほしい／「金風、稜線を渡る」: 単調／「実りの鐘楼、遠い約束」: メロディに変化がない。単調／「秋霧の星盤」: 印象に残らない／「黄金の大地、大いなる予感」: 最後が転調にひっぱられて変化がないか、無理やりになっている',
    userWords:
      'どのメロディも印象に残らない。印象深いメロディとはシンプル（スケールをそのまま移動するようなCDEFGみたいな）なもので、コードと綺麗に調和するようなメロディだと思う／「琥珀の地図、風が立つ」へのメモ: 単調すぎる／「夕凪の城下、実りの旗」へのメモ: 並行移動を始めてから移動しつづけるのではなくて、しばらく同じ調でメロディで変化をつけてほしい／「金風、稜線を渡る」へのメモ: 音数についてはこれでいいんだが単調／「実りの鐘楼、遠い約束」へのメモ: メロディに変化がない。単調／「秋霧の星盤」へのメモ: 印象に残らない／「黄金の大地、大いなる予感」へのメモ: 前半はこの中で一番いいが、最後が転調にひっぱられて変化がないか、無理やりになっている',
  },
  {
    batchId: 'strategy-screen-autumn-themes-004',
    candidates: [
      'autumn-sunlit-slope-song',
      'autumn-gleaning-waltz',
      'autumn-vineyard-afternoon',
      'autumn-golden-homeward',
      'autumn-dusk-cobblestone',
      'autumn-harvest-morning-bells',
    ],
    mode: 'theme-with-harmony',
    preferred: 'autumn-golden-homeward',
    change: '後半のメロディを工夫してください。前半の主題の影響を受けながら変化があるような感じ',
    userWords:
      '派生元: 「黄金の穂波、帰り道」 (parentId: autumn-golden-homeward)／後半のメロディを工夫してください。前半の主題の影響を受けながら変化があるような感じ',
  },
  {
    batchId: 'autumn-golden-homeward-structure-001',
    candidates: [
      'autumn-homeward-over-the-hill',
      'autumn-homeward-ab-meadow',
      'autumn-homeward-evening-bell',
    ],
    mode: 'structure',
    preferred: 'autumn-homeward-evening-bell',
    keep: '「黄金の穂波 — 夕暮れの遠い鐘」: 比較的緊張感があって良い。最後もGood',
    change: '「黄金の穂波 — 丘を越える歌」: 悪くはないが無難で退屈。／「黄金の穂波 — 変イの野へ」: a′以降うまくいってない',
    userWords:
      '派生元: 「黄金の穂波 — 夕暮れの遠い鐘」 (parentId: autumn-homeward-evening-bell)／「黄金の穂波 — 丘を越える歌」へのメモ: 悪くはないが無難で退屈。／「黄金の穂波 — 変イの野へ」へのメモ: a′以降うまくいってない／「黄金の穂波 — 夕暮れの遠い鐘」へのメモ: 比較的緊張感があって良い。最後もGood',
  },
]
