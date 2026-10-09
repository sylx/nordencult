# DateBar の装飾と調整

2026-10-09、組み込み imagegen ツールでDateBarのフレームを再生成しました。球・天文儀の円盤をなくし、控えめな葉飾りから濃紺の帯・下の金線までつながる一枚の画像にしました。設定メニュー用の帯素材は前回の生成画像を使用しています。

| 保存先（norden-ui からの相対パス） | サイズ | 処理 |
| --- | --- | --- |
| `src/assets/ui/hud/date-frame.png` | 600 × 198 | 2172 × 724 の透明PNGの上端8pxを切り詰めてLanczos縮小。アルファを保持 |
| `src/assets/ui/hud/date-center.png` | 384 × 128 | 2172 × 724 の不透明PNGをLanczos縮小 |

画像の縮小には FFmpeg を使用しています。フレームは `border-image-slice: 0 0 30% 20% fill` で描画し、左の40pxと下の20pxを固定して濃紺部分を伸ばします。左端を別画像で重ねないため、輪郭のない背景がはみ出しません。球のある旧 `date-left.png` は削除しました。

## 手で変更する箇所

`src/components/hud/DateBar.css` 冒頭のカスタムプロパティで基本の見た目を調整できます。

| 変数 | 初期値 | 対象 |
| --- | --- | --- |
| `--date-phase-size` | 14px | フェーズの文字サイズ |
| `--date-faction-size` | 24px | 勢力名の文字サイズ |
| `--date-suffix-size` | 13px | 「のターン」の文字サイズ |
| `--date-calendar-size` | 26px | 年月の数字の文字サイズ |
| `--date-calendar-label-size` | 11px | 王歴・年・月などの文字サイズ |
| `--date-bar-height` | 40px | 情報帯の高さ |
| `--date-ornament-size` | 40px | 左装飾の固定幅 |
| `--date-ornament-drop` | 20px | 下端の装飾領域の高さ・帯からの張り出し |
| `--date-content-inset` | 40px | 文字領域の左端 |
| `--date-section-gap` | 8px | 各項目の左右の間隔 |
| `--date-separator-height` | 28px | 下の金線から立ち上がる曲線の高さ |

各項目の色・太さは `.norden-date-bar-phase`、`.norden-date-bar-faction`、`.norden-date-bar-turn-suffix`、`.norden-date-bar-date-number`、`.norden-date-bar-date-label` で変更します。
年月は `DateBarCalendar` で数字とそれ以外の文字に分けて描画します。数字はGeorgia、単位は日本語の明朝体を使い、ベースラインを揃えます。半角・全角の数字に対応し、渡された日付文字列は保持します。
設定ボタンの幅・アイコンサイズは `.norden-date-bar-settings` とその `svg` のルールで変更します。
設定ボタンは常に背景なしで、ホバー・開いている状態ではアイコンの色だけを変えます。
セパレーターは `DateBar.tsx` の `DateBarSeparator` で、下の金線から上へ跳ね上がる曲線を描画します。`.norden-date-bar-separator` を下端に揃え、`translate: 0 1px` で線をフレームにつなげています。色・縁取りは `.norden-date-bar-separator-rail` と `.norden-date-bar-separator-edge` で変更します。装飾は `aria-hidden` にして、読み上げの順番に含めません。
700px以下の画面・埋め込み先では末尾の `@media` / `@container` が小さい文字・装飾サイズに切り替えます。狭い幅も調整するときはこちらも変更してください。

`src/components/hud/DateBar.tsx` の `.norden-date-bar-content` 内で表示順を変更します。入力は `phaseLabel`、`factionName`、`dateLabel` に分離しました。
`factionName: null` は「全勢力の行動を解決中」、省略は「ターン進行中」です。設定内容は `children` で渡し、無い場合も設定ボタンの位置を保持して無効にします。

配置は `src/screens/screens.css` の `.norden-city-command .norden-screen-top-right` の `top: 0; right: 0` です。画面レイヤーのホストに密着します。
1000px以下のホストでは都市切り替えと都市ウィンドウを下へずらし、DateBarとの重なりを避けます。
単体使用時は `position: relative` の配置先に、`position: absolute; top: 0; right: 0` のラッパーを置いてください。
ホスト幅でコンパクト表示に切り替える場合、ラッパーに `container: norden-date-host / inline-size` と `width: 100%` を指定します。実例は `demo/entries/DateBarEntry.tsx` と `demo/demo.css` にあります。

```tsx
<DateBar phaseLabel="戦略フェーズ" factionName="カルタ書院" dateLabel="王歴312年4月">
  <button onClick={save}>セーブ</button>
</DateBar>
```

## 一体型フレームの最終プロンプト

```text
Use case: precise-object-edit. Asset type: one production transparent PNG horizontal DATE/TURN HUD ribbon for a medieval strategy game, to attach flush to the top-right screen corner. Inputs: Image 1 is the previous oversized astrolabe ornament to simplify; Image 2 is the dark navy ribbon texture and bottom gold rail to preserve. Primary request: replace the astrolabe completely with a restrained curved acanthus leaf cap that is integrated seamlessly into a long dark navy rectangular ribbon. REMOVE ALL circular discs, spherical shapes, orbital arcs, globes, astrolabe rings and medallions. ONE continuous unified shape, NOT separate floating ornament and rectangle. Wide canvas exactly 3:1. Ribbon top and right edges touch the canvas edges with zero padding; top edge runs straight across, right edge is square and flush. The ribbon's navy field occupies the top 84 percent of canvas height and continues uniformly to the right edge; bottom 16 percent is transparent except a few fine left-end leaves trailing down. Leftmost 18 percent contains a modest, slender antique brass S-shaped carved acanthus flourish that forms the ACTUAL left boundary of the navy ribbon: curl inward at the upper-left and descend in a smooth tapered leaf curve into the bottom rail. All navy filling on the left has a clean visible brass contour, no unbordered navy rectangle protruding to the left or above a leaf. Gold outline at left must flow smoothly into the SINGLE very thin straight bottom gold rail extending across the entire remaining ribbon to the right edge. Left cap never contains a large circular focal point or a chunky gold cluster. Keep most of the canvas an empty uninterrupted nearly-black midnight-blue, subtly grained surface for text. Flat frontal refined hand-painted game-UI material, muted worn brass instead of bright yellow. Avoid detached ornaments, heavy bevels, angular diamond endcaps, toolbar frame, top gold border, right end ornament, vertical separators, lettering, numbers, icons, scenery, outer glow, cast shadow, watermark. Actual transparency outside the continuous ribbon silhouette and in negative spaces among the fine leaves. No outside margin or extra backdrop. This single asset will be nine-sliced so the slim decorated left cap and lower gold rail stay fixed, while the navy text field stretches horizontally.
```

生成オプション: `transparent_background: true`。

## 情報帯の最終プロンプト

```text
Use case: stylized-concept. Asset type: production full-bleed horizontal background PNG strip for a medieval fantasy strategy game's top-right DATE/TURN information ribbon. Primary request: an understated dark midnight-blue enamel and finely grained leather surface with a SINGLE thin antique brass ornamental rail running completely straight across the BOTTOM edge. Wide rectangular canvas 3:1. Texture fills the ENTIRE canvas edge to edge, including the top, left and right; completely square corners. Almost black desaturated blue center is very quiet and empty, with subtle fine grain suitable behind bright Japanese text. At the bottom only, a warm antique gold/brass hairline rail, restrained engraved material; bottom rail occupies the bottom 5 percent of image height. Flat front-on game UI asset, realistic hand-painted material. Uniform material at the left and right boundaries, intended for horizontal stretching, no isolated endcaps or corner embellishments. No top border, no side borders, no double frame, no central ornaments, no radial glow, no vignette that changes across width, no padding around rectangle, no transparent exterior margins, no lettering, no watermark, no interface mockup. This navy and gold ribbon matches a circular brass astrolabe ornament, and is deliberately visually distinct from a brown angular command toolbar.
```

生成オプション: `transparent_background: false`。

