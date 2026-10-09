# DateBar の装飾と調整

2026-10-09、組み込み imagegen ツールで装飾2点を新規生成しました。旧実装の画像は参照せず、円形の天文儀・曲線的な葉飾りと濃紺の帯を組み合わせています。

| 保存先（norden-ui からの相対パス） | サイズ | 処理 |
| --- | --- | --- |
| `src/assets/ui/hud/date-left.png` | 256 × 256 | 1254 × 1254 の透明PNGをLanczos縮小。アルファを保持 |
| `src/assets/ui/hud/date-center.png` | 384 × 128 | 2172 × 724 の不透明PNGをLanczos縮小 |

画像の縮小には FFmpeg を使用しています。帯の下端はCSSで3pxに固定し、濃紺部分だけを伸ばします。右側には左装飾の反転コピーを配置しません。

## 手で変更する箇所

`src/components/hud/DateBar.css` 冒頭のカスタムプロパティで基本の見た目を調整できます。

| 変数 | 初期値 | 対象 |
| --- | --- | --- |
| `--date-phase-size` | 14px | フェーズの文字サイズ |
| `--date-faction-size` | 24px | 勢力名の文字サイズ |
| `--date-suffix-size` | 13px | 「のターン」の文字サイズ |
| `--date-calendar-size` | 16px | 年月の文字サイズ |
| `--date-bar-height` | 64px | 情報帯の高さ |
| `--date-ornament-size` | 112px | 左装飾の幅・高さ |
| `--date-content-inset` | 120px | 左装飾と文字領域の間隔 |
| `--date-section-gap` | 18px | 各項目の左右の間隔 |

各項目の色・太さは `.norden-date-bar-phase`、`.norden-date-bar-faction`、`.norden-date-bar-turn-suffix`、`.norden-date-bar-date` で変更します。
設定ボタンの幅・アイコンサイズは `.norden-date-bar-settings` とその `svg` のルールで変更します。
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

## 左装飾の最終プロンプト

```text
Use case: stylized-concept. Asset type: one production transparent PNG left-hand ornament for a medieval fantasy strategy game's DATE/TURN information bar, shown at 112px square at the screen's top right. Primary request: a large elegant circular antique brass astrolabe/calendar medallion framed by sweeping curved acanthus leaves and a restrained laurel flourish, with a small pendant leaf tapering downward. Circular midnight-blue enamel center with delicate brass concentric orbital arcs and tiny unlettered time ticks. Only abstract astronomical geometry, no numbers, no lettering, no faces, no animals. The ornament's strongest mass is in the upper two thirds; lower leaves taper softly. Polished hand-painted high-end strategy-game UI material, refined worn gold, ivory highlights, deep muted blue. Single centered compact ornament filling 94 percent of a square canvas. Actual transparent background outside the clean ornamental silhouette, including every gap between curved leaves. This is a standalone left cap to overlap a plain midnight-blue rectangular HUD ribbon. Avoid angular diamond toolbar caps, rectangular frames, mirrored endcaps, scenery, purple, detached glows or cast shadows, stray pixels, text, watermarks. Keep silhouette legible at 112px and leave no extraneous background material.
```

生成オプション: `transparent_background: true`。

## 情報帯の最終プロンプト

```text
Use case: stylized-concept. Asset type: production full-bleed horizontal background PNG strip for a medieval fantasy strategy game's top-right DATE/TURN information ribbon. Primary request: an understated dark midnight-blue enamel and finely grained leather surface with a SINGLE thin antique brass ornamental rail running completely straight across the BOTTOM edge. Wide rectangular canvas 3:1. Texture fills the ENTIRE canvas edge to edge, including the top, left and right; completely square corners. Almost black desaturated blue center is very quiet and empty, with subtle fine grain suitable behind bright Japanese text. At the bottom only, a warm antique gold/brass hairline rail, restrained engraved material; bottom rail occupies the bottom 5 percent of image height. Flat front-on game UI asset, realistic hand-painted material. Uniform material at the left and right boundaries, intended for horizontal stretching, no isolated endcaps or corner embellishments. No top border, no side borders, no double frame, no central ornaments, no radial glow, no vignette that changes across width, no padding around rectangle, no transparent exterior margins, no lettering, no watermark, no interface mockup. This navy and gold ribbon matches a circular brass astrolabe ornament, and is deliberately visually distinct from a brown angular command toolbar.
```

生成オプション: `transparent_background: false`。

