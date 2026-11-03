# norden-dialogue

nordencult の会話システム。騎士の立ち絵・顔付きのセリフ・背景・BGM・効果音で、簡易なノベルゲームのような場面を見せる。

- `src/` — 再生の仕組み。ゲーム本体（nordencult）がソースのまま使う（ルートの `vite.config.ts` の alias `norden-dialogue`）。ゲームの状態は知らない（状態の型は型引数）。騎士・都市・背景・音はゲームが渡す（`DialogueProviders`）
- エディタ（`editor/`）— 親（nordencult）の `src/dialogue/` の台本を一覧・プレビュー・編集する。単体では動かない（親の `src/dialogue/`・`src/data/`・`src/assets/`・`src/audio/` を読む）

シーンそのもの（台本と流れ）はゲームのデータなので、親の `src/dialogue/<id>.json`・`<id>.ts` に置く。設計の経緯は親の `docs/milestones/m006.md`。

## 使い方

```sh
npm install
npm run dev        # エディタ（http://localhost:5176）
npm run typecheck  # src・editor と、エディタが読む親のソース
npm test           # 台本の検査・書式・シーンの実行
```

## 台本と流れ

1 シーンにつき、台本（JSON）と流れ（TypeScript）の 2 つで書く。台本には分岐を入れず、流れはゲームの規則の関数をそのまま呼ぶ。

### 台本（`src/dialogue/<id>.json`）

```json
{
  "$schema": "../../norden-dialogue/script.schema.json",
  "title": "傭兵を雇う",
  "params": { "merc": "character", "price": "number" },
  "blocks": {
    "greet": [
      { "bg": "tavern", "fx": "fade" },
      { "show": "$merc", "at": "right" },
      { "say": "$merc", "text": "{merc.name}だ。{price}金貨で雇われよう。",
        "tones": {
          "wild_berserker": ["{merc.name}様だ。", "てめぇ、金はあるんだろうな？"],
          "cool_female": "……{merc.name}だ。"
        } }
    ],
    "accept": [
      { "se": "coins" },
      { "say": "$merc", "text": "契約成立だ。" }
    ]
  },
  "choices": {
    "hire": { "options": { "yes": "契約する（{price}金貨）", "no": "やめておく" } }
  }
}
```

- `params`: 流れから渡す変数（`ctx.bind`）。型は `character`（騎士 ID）・`city`（都市 ID）・`number`・`string`
- `blocks`: ブロック名 → 命令の列。流れが `ctx.play('greet')` で再生する。背景・立ち絵・BGM はシーンの中ならブロックをまたいで残る
- `choices`: 選択肢の名前 → 選択肢のキーと文言。流れが `ctx.choose('hire')` で選ばせ、選んだキー（`'yes'`）が返る
- テキストの中: `{price}`（変数。数は `1,000` のように）、`{merc.name}`・`{merc}`（騎士・都市の名前）、`\n`（改行）

命令（1 つのオブジェクトに 1 つ。先頭のキーで種類が決まる）:

| 命令 | 書き方 | 内容 |
| --- | --- | --- |
| `say` | `{ "say": "$merc" \| "001", "text": "…" \| ["…"], "name"?: "…", "tones"?: { "<口調>": "…" \| ["…"] } }` | 顔付きのセリフ。`name` で名前だけ差し替える（顔は出たまま） |
| `name` | `{ "name": "村人", "text": "…" }` | 顔の無い話し手 |
| `narrate` | `{ "narrate": "…" }` | 地の文 |
| `show` | `{ "show": "$merc", "at": "left" \| "center" \| "right", "fx"?: "fade" \| "slide" \| "none" }` | 立ち絵を出す（既定は fade） |
| `hide` | `{ "hide": "$merc" \| "all", "fx"?: … }` | 立ち絵を消す |
| `move` | `{ "move": "$merc", "at": "center" }` | 立ち絵を動かす |
| `bg` | `{ "bg": "tavern" \| null, "fx"?: "fade" \| "cut" }` | 背景（親の `src/assets/bg/<名前>.webp`。無ければ名前から決まる色の仮のグラデーション）。`null` で黒 |
| `fade` | `{ "fade": "out" \| "in", "color"?: "black" \| "white", "ms"?: 600 }` | 画面全体の暗転・明転 |
| `shake` | `{ "shake": "small" \| "large" }` | 画面を揺らす |
| `flash` | `{ "flash": "white" \| "red" }` | 一瞬光らせる |
| `wait` | `{ "wait": 500 }` | 待つ（ミリ秒） |
| `bgm` | `{ "bgm": "曲 id" \| null }` | 曲を変える（norden-synth の曲 id）。`null` でフェードアウト |
| `se` | `{ "se": "coins" }` | 効果音（親の `src/assets/se/` の名前） |

- 話し手は騎士 ID か変数で書き、JSON に名前は書かない（エディタは名前と顔で出す）。話している騎士の立ち絵は明るく、ほかは暗くなる
- 文言を配列にすると 1 要素が 1 ページ。`[]` なら何も言わない
- **口調別のセリフ**: `say` の `tones` に 口調 → 文言 を書くと、その行の話し手の騎士の口調（`voiceTone`）で差し替える。話し手に口調が無いか、`tones` にその口調が無ければ `text`。差し替えるのは文言だけで、演出（背景・立ち絵・音）は口調で変えない。演出まで変えるときは、流れで `ctx.toneOf('merc')` を見て別のブロックを再生する
- 書式: 命令は 1 行に 1 つ、`tones` を持つ `say` だけは口調ごとに 1 行（`formatScript`）。エディタの保存も手で直すときもこの書式にする（親の `npm test` が確かめる）

### 流れ（`src/dialogue/<id>.ts`）

```ts
import { hireMercenary, hireProblem } from '../game'
import { gameScene } from './define'
import script from './hireMercenary.json'

export const hireMercenaryScene = gameScene(script, { city: 'city', merc: 'character' }, async (ctx, { city, merc }) => {
  ctx.bind({ merc, price: 1000 })
  await ctx.play('greet')
  const pick = await ctx.choose('hire', { disabled: { yes: hireProblem(ctx.state, city, merc) } })
  if (pick === 'yes') {
    ctx.update((s) => hireMercenary(s, city, merc))
    await ctx.play('accept')
  }
}, (state) => /* エディタ・デバッグコンソールで入力を省いたときの値 */ null)
```

- `gameScene` は親の `src/dialogue/define.ts`（norden-dialogue の `defineScene` を、状態の型をゲームの `GameState` に決めて包んだもの）。2 つ目の引数が流れの入力の宣言で、エディタの通し再生とデバッグコンソールはこれを見て値を選ばせる
- `ctx.play` のブロック名、`ctx.choose` の選択肢の名前と戻り値、`ctx.bind` の変数名、`ctx.toneOf` の変数名には台本から型が付き、書き間違いは型検査で落ちる
- `ctx.state` はシーン用の写しで、`ctx.update` で変える。シーンが終わったときに一度にゲームへ反映する。流れの中で投げられたもの（`GameRuleError` など）はシーンを打ち切り、何も反映しない
- `ctx.choose(…, { disabled: { yes: '理由' } })` で押せない選択肢と理由を渡す（`null`・`undefined` は押せる）
- 乱数は `ctx.random()`（ゲームでは `Math.random`、エディタでは種を決めた乱数）。シーンの中で `Math.random` は使わない
- 新しいシーンは、親の `src/dialogue/index.ts` の `SCENES` に足す

## API（`src/index.ts`）

| もの | 内容 |
| --- | --- |
| `validateScript(json, catalog?)` | 台本の検査（知らない命令・欠けた項目・宣言していない変数・使っていない宣言は警告）。`catalog` を渡すと騎士 ID・曲・効果音・口調（エラー）と背景（警告）も照合する |
| `script.schema.json` | 手で書いた JSON Schema（VSCode の補完と検査）。口調の id は知らない（ゲームのテストで照合する） |
| `defineScene(script, input, run, sample?)`・`SceneContext` | シーンの定義 |
| `runScene(scene, input, { state, player, random?, replay?, onChoose?, tones? })` | シーンを流し、最後の状態を返す。`replay` の選択の履歴までは演出を飛ばして流し直す。`tones` は変数の騎士の口調の代わり（エディタ） |
| `playBlock(script, block, vars, { player, tones? })` | 1 ブロックだけ再生する（エディタのプレビュー） |
| `DialoguePlayer`・`DialogueView` | 画面の状態と、それを描く React の部品（背景・立ち絵・メッセージウィンドウ・選択肢・暗転・揺れ・光）。クリック・Enter・Space で文字送り（表示の途中なら全文を出す）、数字キーで選択。`modal`（既定）なら会話中のキーをすべて受ける |
| `DialogueProviders` | ゲームが渡すもの: 騎士（名前・口調・シート画像・セル・顔）・都市・背景の URL・BGM・効果音 |
| `ScriptedPlayer` | テスト用のプレイヤー（命令を記録し、選択肢は決めた順に選ぶ） |
| `formatScript(script)` | 決まった書式の JSON |

メッセージウィンドウと選択肢のボタンは norden-ui の部品（`ThinFrame`・`Button`）を使う。

## エディタ

- 左: シーンの一覧（エラーの数。直して保存していないものに ●）
- 中央: 台本。ブロックごとに命令を 1 行ずつ並べ、話し手は顔と名前で出す（`$merc` はプレビューの変数に選んだ騎士の顔）。検査のエラー・警告を命令の下に出す。`tones` を持つ行に「◆ 口調別」、題の下にシーンで書き分けた口調の一覧
- 直せるもの: 題・セリフの文言（空行でページを分ける）・口調別の文言（口調の追加・削除）・話し手（騎士の名前から選ぶ）・名前だけの話し手の名前・地の文・選択肢の文言。命令やブロックの追加・削除・並べ替えは JSON を直接直す
- 保存（Ctrl+S）: dev サーバーのプラグイン（`PUT /api/dialogue/<id>`。`editor/server/dialoguePlugin.ts`）が決まった書式で書く。差分は直した行だけ。書いたファイルは HMR でエディタにも開いているゲームにも反映される。VSCode で JSON を直してもそのまま反映される（直している途中なら「ファイルが外で変わりました」と出る）
- 右: プレビュー
  - ブロックの再生: 変数に仮の値を選んで（騎士は一覧から、数は入力）、ブロックの ▶ で再生する。騎士の変数ごとに口調を選び直せる（騎士の口調より優先。「口調なし」で共通の文言）
  - 通し再生: 流れごと、ゲームの初期状態（`createInitialState()`）から再生する。入力の既定はシーンの `sample`。選択肢は手で選び、終わると状態の変化（金・物資・兵・フラグ・騎士の所属・傭兵の契約）を出す。選択の履歴の「ここから選び直す」で、そこまでを同じ乱数の種で流し直す
  - 背景の画像が無ければ、仮のグラデーションに背景の名前を重ねて出す
