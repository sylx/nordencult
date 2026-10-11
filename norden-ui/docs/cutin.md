# カットイン

「戦闘開始」「ROUND 1」「第一章」などの、画面中央に出る文字の演出です。
カタログのカットインエディタで作ったJSON（テンプレート）を、ゲームが `useCutIn().play()` で再生します。

```text
カットインエディタ（demo/、#cutin-editor）
  └─ JSONを書き出す（コピー／ダウンロード）
       └─ ゲームに置く（例: src/cutins/battle-start.json）
            └─ useCutIn().play(json, { text }) → CutInLayer が canvas に描く（src/cutin/）
```

描画はCanvas 2D に requestAnimationFrame で毎フレーム描きます。
文字ごとに「光彩」「影＋外側の縁取り」「縁取り＋塗り」の3層の画像を最初に作り、フェード中に下の層が透けないよう文字の形でくり抜いています。
乱数は時刻と文字番号から決まるので、同じ時刻なら必ず同じ絵になります（エディタのプレビューとゲームの見た目が一致します）。

## エディタ

`npm run dev` → http://localhost:5173/#cutin-editor

| タブ | 内容 |
| --- | --- |
| テンプレ | 出発点にする見本（戦闘・シーン・時間・その他）。選ぶと編集中の内容が置き換わります |
| 文字 | 名前、メイン・サブの文字、書字方向、フォント（font-family）、文字サイズ、配置 |
| 見た目 | 塗り（単色・グラデーション）、縁取り、外側の縁取り、影、光彩、グリッチの色 |
| 装飾 | 帯・虎柄テープ・ボックス・タイトル枠・ライン類、画面全体の背景 |
| 動き | 登場・表示中・退場の効果と時間、サブテキストの登場、前後の空白 |
| JSON | コピー、ダウンロード、ファイルを開く、貼り付けて反映 |

- プレビューの下のバーは登場（緑）・表示中（金）・退場（赤）の区間です。バーを押すとその時刻を表示します。
- 「ゲームと同じ再生」は `useCutIn` と `CutInLayer` で再生します。画面を押すとスキップし、終わるとログに出ます。
- プレビューの縦横比（16:9・21:9・4:3）と背景（地図・暗い・白・市松模様）を変えられます。
- 編集中のテンプレートはこのブラウザに保存され、再読み込みしても残ります。ファイルとして残すときはJSONタブでダウンロードしてください。
- フォントの一覧はエディタ用に Google Fonts から読み込みます。一覧にない書体は font-family の欄に直接書けます（ゲームで読み込む書体名）。

見本は `demo/cutin/presets.ts` にあります（ライブラリには含めません）。

## ゲームでの再生

```tsx
import { CutInLayer, useCutIn } from 'norden-ui'
import battleStart from './cutins/battle-start.json'

const cutIn = useCutIn()
await cutIn.play(battleStart)
await cutIn.play(round, { text: `ROUND ${n}`, subText: '' })

<div style={{ position: 'relative' }}>
  {/* 画面 */}
  <CutInLayer cutIn={cutIn} />
</div>
```

- `play` は再生が終わると解決します。再生中に呼ぶと、前のカットインが終わるまで待ちます。
- `text` / `subText` を渡すと、テンプレートの見本の文字を差し替えます（`subText: ''` でサブを消す）。数字だけが違う演出は1つのテンプレートで済みます。
- JSONの足りない項目は初期値（`CUTIN_DEFAULTS`）で補います。知らない項目、型の違う値、効果名などの一覧にない値は初期値に戻します（`normalizeCutInTemplate`）。
- 画面のどこかを押すと退場へ飛ばし、退場中ならすぐ終えます。`cutIn.skip()` でも同じです。クリックは下の画面にも届きます（レイヤーはクリックを受けません）。`skipOnClick={false}` で無効にできます。
- `cutIn.clear()` は再生中と順番待ちをすべて終えます。`useCutIn` を使うコンポーネントが外れたときも同じです（待っている `play` は解決します）。
- 再生中は文字をスクリーンリーダー向けに読み上げます（`aria-live="polite"`）。

### 画面サイズ

テンプレートの長さ（文字サイズ・余白・線の太さなど）は 1280×720 の画面を基準にした値です。
`CutInLayer` は配置先いっぱいに canvas を広げ、`min(幅 / 1280, 高さ / 720)` 倍で描きます（`cutInViewport`）。
縦横比が違うときは、長い方の辺が広がるだけで文字の大きさは変わりません。帯・テープ・背景は画面の端まで伸び、配置（右上など）は画面の端を基準にします。
画面の大きさが変わると、文字を並べ直します。

### フォント

テンプレートには書体の名前（CSSの font-family。例: `"Cinzel", "Noto Serif JP", serif`）だけを書きます。
書体はゲーム側のCSS（`@font-face` や Google Fonts）で読み込んでください。
再生の前に `document.fonts.load` で書体を待ちます。3秒たっても読み込めない場合は、使える書体で描きます（`loadCutInFonts`）。
欧文の書体には、日本語を書けるように和文の書体を後ろに並べておきます。

## 再生の流れ

```text
startDelay → 装飾が開く → 登場（文字ごとにずらす／全体） → 表示中（hold 秒） → 退場 → 装飾が閉じる → endDelay
```

- 帯・テープ・タイトル枠・ボックスは、装飾が開き始めてから少し遅れて文字が出ます。
- 効果には文字ごとのもの（フェード・浮かび上がる など）と、全体にかかるもの（叩きつけ・ワイプ・グリッチ など。エディタでは「（全体）」）があります。
- サブテキストは、メインの登場が終わる時刻から `subDelay` 秒ずらして登場します（`subFx: 'same'` ならメインと同じ効果）。
- 「表示中の動き」は登場から退場まで続きます（点滅は登場し終えてから）。

## テンプレートの項目

| 項目 | 内容 |
| --- | --- |
| `text`, `subText` | 見本の文字。改行で複数行 |
| `subPosition`, `writing`, `align`, `autoFit` | サブの位置（上・下）、横書き・縦書き、揃え、はみ出すときの自動縮小 |
| `anchor`, `marginX/Y`, `offsetX/Y` | 基準位置（`mc` は中央、`tl` は左上…）、画面端からの余白、微調整 |
| `fontFamily`, `weight`, `italic`, `fontSize`, `letterSpacing`, `lineHeight` | メインの書体（字間は em） |
| `subFontFamily`（空でメインと同じ）, `subWeight`, `subItalic`, `subSize`（メイン比）, `subLetterSpacing`, `subGap` | サブの書体 |
| `fill`, `fillOpacity`, `stroke`, `stroke2`, `shadow`, `glow`, `subColorOn`, `subColor` | 塗り・縁取り・影・光彩 |
| `deco` | 装飾（`type`: band / tape / box / frame / lines / underline / sides / bar / corners） |
| `bg` | 画面全体の背景（solid / vignette / bottom / top） |
| `inFx`, `inDur`, `inStagger`, `inOrder`, `inEase`, `inPower`, `inDir` | 登場 |
| `hold`, `holdFx`, `holdPower` | 表示中 |
| `outFx`, `outDur`, `outStagger`, `outOrder`, `outEase`, `outPower`, `outDir` | 退場 |
| `glitchColor`, `glitchColor2` | グリッチでずれる2色 |
| `subFx`, `subDelay`, `startDelay`, `endDelay` | タイミング |

型と初期値は `src/cutin/template.ts` にあります。

## 自分の canvas に描く

`CutInRenderer` を使うと、任意の canvas（three.js のテクスチャ用など）に、好きな時刻の絵を描けます。

```ts
import { CutInRenderer, cutInViewport, loadCutInFonts, normalizeCutInTemplate } from 'norden-ui'

const template = normalizeCutInTemplate(json)
await loadCutInFonts(template)
const renderer = new CutInRenderer()
const view = cutInViewport(canvas.width, canvas.height)
const { timeline } = renderer.prepare(template, view.W, view.H)
renderer.render(canvas.getContext('2d')!, seconds, view.unit) // 0 〜 timeline.duration
```

`timeline` には登場の終わり（`inEnd`）、退場の始まり（`holdEnd`）、全体の長さ（`duration`）などが入っています。

