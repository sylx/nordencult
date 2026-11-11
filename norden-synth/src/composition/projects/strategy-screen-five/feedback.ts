import type { FeedbackEntry } from '../../workflow.ts'

// 各組への試聴の感想。ユーザーの発言をそのまま残し、AI の推測を入れない。
export const feedback: FeedbackEntry[] = [
  {
    batchId: 'strategy-screen-five-hooks-001',
    candidates: [
      'screen5-hook-moon-dial',
      'screen5-hook-crystal-map',
      'screen5-hook-alchemist-scale',
      'screen5-hook-windmill-almanac',
      'screen5-hook-mist-ferry',
      'screen5-hook-star-chart',
      'screen5-hook-clockwork-hall',
      'screen5-hook-floating-isle',
      'screen5-hook-lost-forest',
      'screen5-hook-glass-crown',
      'screen5-hook-shadow-peddler',
      'screen5-hook-old-map-compass',
    ],
    mode: 'hooks',
    preferred: 'screen5-hook-crystal-map',
    keep: '○ 見込みあり: 「水晶の地図」「風車の暦」「霧の渡し場」「からくり時計の広間」「迷い森の道標」「硝子の王冠」「影絵の行商人」「古地図の羅針盤」／「水晶の地図」: とってもいいです！／「風車の暦」: いい感じ／「霧の渡し場」: いい感じする／「からくり時計の広間」: これもいい／「迷い森の道標」: 印象に残るメロディ／「硝子の王冠」: いいねー／「影絵の行商人」: いい雰囲気／「古地図の羅針盤」: わりとよくなる雰囲気はある／「月時計の広場」: いいんだけど／「錬金術師の天秤」: オシャレ',
    change: '× 見送り: 「月時計の広場」「錬金術師の天秤」「星図の卓」「浮島の航路」／「月時計の広場」: イメージと違う／「錬金術師の天秤」: 二回目が違う／「風車の暦」: 楽天的／「星図の卓」: ちょっとシンプルすぎるかな／「浮島の航路」: 最後の音が外れてる／「古地図の羅針盤」: 二回目ちょっとどうかと思った',
    userWords:
      '派生元: 「水晶の地図」 (parentId: screen5-hook-crystal-map)／○ 見込みあり: 「水晶の地図」「風車の暦」「霧の渡し場」「からくり時計の広間」「迷い森の道標」「硝子の王冠」「影絵の行商人」「古地図の羅針盤」／× 見送り: 「月時計の広場」「錬金術師の天秤」「星図の卓」「浮島の航路」／「月時計の広場」へのメモ: いいんだけど、イメージと違う／「水晶の地図」へのメモ: とってもいいです！／「錬金術師の天秤」へのメモ: オシャレだが二回目が違う／「風車の暦」へのメモ: いい感じだが楽天的／「霧の渡し場」へのメモ: いい感じする／「星図の卓」へのメモ: ちょっとシンプルすぎるかな／「からくり時計の広間」へのメモ: これもいい／「浮島の航路」へのメモ: 最後の音が外れてる／「迷い森の道標」へのメモ: 印象に残るメロディ／「硝子の王冠」へのメモ: いいねー／「影絵の行商人」へのメモ: いい雰囲気／「古地図の羅針盤」へのメモ: 二回目ちょっとどうかと思ったが、わりとよくなる雰囲気はある',
  },
  {
    batchId: 'strategy-screen-five-themes-001',
    candidates: [
      'screen5-theme-crystal-whole-step-down',
      'screen5-theme-crystal-minor-third-down',
      'screen5-theme-crystal-home-key',
      'screen5-theme-crystal-fifth-down',
    ],
    mode: 'theme-with-harmony',
    preferred: 'neither',
    change:
      'いい加減にしろ。リズムが全部同じで、和音が違うだけ。それはメロディではないアルペジオだ。／「水晶の地図 — 全音下の影に留まり、bIII・bVI を通って帰る」: ずっと一緒すぎてビビる／「水晶の地図 — 言い直しから短3度下へ、同主短調の影から帰る」: ずっと一緒すぎてビビる／「水晶の地図 — 平行移動せず、主調の借用和音で歌い広げる」: ずっと一緒すぎてビビる／「水晶の地図 — 5度下のニ長調へ沈み、属和音を主和音に読み替えて帰る」: ずっと一緒すぎてビビる',
    userWords:
      'いい加減にしろ。リズムが全部同じで、和音が違うだけ。それはメロディではないアルペジオだ。／「水晶の地図 — 全音下の影に留まり、bIII・bVI を通って帰る」へのメモ: ずっと一緒すぎてビビる／「水晶の地図 — 言い直しから短3度下へ、同主短調の影から帰る」へのメモ: ずっと一緒すぎてビビる／「水晶の地図 — 平行移動せず、主調の借用和音で歌い広げる」へのメモ: ずっと一緒すぎてビビる／「水晶の地図 — 5度下のニ長調へ沈み、属和音を主和音に読み替えて帰る」へのメモ: ずっと一緒すぎてビビる',
  },
  {
    batchId: 'strategy-screen-five-themes-002',
    candidates: [
      'screen5-theme2-crystal-answer-whole-step',
      'screen5-theme2-crystal-flat-six-offbeat',
      'screen5-theme2-crystal-stretch',
      'screen5-theme2-crystal-dotted-sequence',
    ],
    mode: 'theme-with-harmony',
    preferred: 'screen5-theme2-crystal-dotted-sequence',
    keep:
      '「水晶の地図 — 平行移動せず、動機を伸ばして縮めて伸ばす」: 最後の余韻がいいね／「水晶の地図 — 付点で駆ける応答を、句ごと短3度上へ」: いいんじゃない？トリッキーだけど',
    change:
      '「水晶の地図 — 刻む応答から全音下へ」: 意外性はあるが、使える使えないでいうと使えない／「水晶の地図 — bVI のヘ長調へ移り、裏拍で歌って帰る」: アレンジ次第でなんとかなるかなあ、といった程度',
    userWords:
      '派生元: 「水晶の地図 — 付点で駆ける応答を、句ごと短3度上へ」 (parentId: screen5-theme2-crystal-dotted-sequence)／「水晶の地図 — 刻む応答から全音下へ」へのメモ: 意外性はあるが、使える使えないでいうと使えない／「水晶の地図 — bVI のヘ長調へ移り、裏拍で歌って帰る」へのメモ: アレンジ次第でなんとかなるかなあ、といった程度／「水晶の地図 — 平行移動せず、動機を伸ばして縮めて伸ばす」へのメモ: 最後の余韻がいいね／「水晶の地図 — 付点で駆ける応答を、句ごと短3度上へ」へのメモ: いいんじゃない？トリッキーだけど',
  },
  {
    batchId: 'strategy-screen-five-structure-001',
    candidates: [
      'screen5-struct-crystal-valley',
      'screen5-struct-crystal-march-inversion',
      'screen5-struct-crystal-split-summit',
    ],
    mode: 'structure',
    preferred: 'screen5-struct-crystal-valley',
    keep: '「水晶の地図 — 嬰ヘ短調の谷を登り、余韻で帰る」: まあいいと思う',
    change:
      '「水晶の地図 — 3+3+2 のニ長調と、ニ短調の反行展開」: 凝りすぎ／「水晶の地図 — 主題を割って三連の歌を挟み、ハ長調の頂で再現」: 悪くはないんだけど…',
    userWords:
      '派生元: 「水晶の地図 — 嬰ヘ短調の谷を登り、余韻で帰る」 (parentId: screen5-struct-crystal-valley)／「水晶の地図 — 嬰ヘ短調の谷を登り、余韻で帰る」へのメモ: まあいいと思う／「水晶の地図 — 3+3+2 のニ長調と、ニ短調の反行展開」へのメモ: 凝りすぎ／「水晶の地図 — 主題を割って三連の歌を挟み、ハ長調の頂で再現」へのメモ: 悪くはないんだけど…',
  },
  {
    batchId: 'strategy-screen-five-orchestration-001',
    candidates: ['screen5-orch-crystal-valley-glass', 'screen5-orch-crystal-valley-march'],
    mode: 'orchestration',
    preferred: 'screen5-orch-crystal-valley-glass',
    userWords: '01水晶の地図 — 管弦楽／硝子\nのほうをsongsに登録してください。1軍　タグ：戦略画面、春です',
  },
]
