# UIパーツの装飾と画像

CityNavigatorとBannerはInfoWindowの最も細いベゼル（`windowSkins.thin`）を共用します。HUDに合わせて角領域を22pxで描き、背景を内側に配置して外周の透過を保ちます。

## ボタンとスライダー

`src/assets/ui/buttons/ornate-button.png` は組み込み image_gen ツールで生成した、真鍮装飾と羊皮紙の透過PNGです。CSSのborder-imageで9分割し、角の大きさを保って中央を伸縮します。通常・強調・暗いHUD用の色とhover・押下・無効・キーボードフォーカスに対応します。ChoiceGroup、都市の矢印、QuantityInputの±にも同じ画像を使います。

```tsx
<Button style={{ width: 240, height: 60 }}>出撃する</Button>
<Button variant="primary">予約</Button>
<Button variant="quiet" size="small">やめる</Button>
```

内容と装飾が収まる寸法を指定してください（通常は高さ40px以上、小さいボタンは32px以上）。幅は内容に応じて自動で決まるほか、`style` の数値・割合などで指定できます。

QuantityInputはネイティブのrangeを保ち、真鍮の溝・羊皮紙のつまみ・値に連動する充填を描画します。ChromiumとFirefoxの描画指定を含み、数値入力と範囲制限は従来のままです。

## 羊皮紙のCard

`Card` は共通の羊皮紙画像と `src/assets/ui/skins/ink-card-frame.svg` のインク装飾を重ねます。装飾SVGはコードで描き、角と線を9分割で伸縮します。

```tsx
<Card as="article" style={{ width: 360 }}>
  <h3>騎士団の記録</h3>
  <p>任意の内容を置けます。</p>
</Card>
```

KnightCardはこのCardを使用します。標準の顔画像は76px、compactは60px。能力値は24px（compactは20px）です。統率・武力・知力には既存のアイコンを付け、任意の能力には `stats[].icon` を指定できます。

数値は `stats[].max`（既定100）に対して、50%未満は赤、50%以上は茶、75%以上は緑、90%以上は紫に変わります。色に加えてラベルと数値も常に表示します。ReactNodeなど数値以外の値は通常色です。

## 騎士画像・生成キャラクターのプレビュー

`portraitSrc` は任意の画像URL、importした画像、生成画像のblob URLを受け付けます。

```tsx
<KnightCard knight={{
  name: '新しい騎士',
  portraitSrc: imageUrl,
  stats: [
    { label: '統率', value: 84 },
    { label: '武力', value: 86 },
    { label: '知力', value: 52 },
  ],
}} />
```

スプライトの切り出しや独自コンポーネントは、従来の `portrait: <CharacterImage ... />` もそのまま利用できます。両方渡す場合は `portraitSrc` を優先します。画像が未指定なら名前の頭文字を表示します。

カタログ `/#parts` の「騎士のプレビュー」から人物・名前・能力を変更できます。

- 「ゲームの人物素材」: `demo/repositoryCharacters.tsx` が親の `src/data/characterData.json` と `src/assets/character.webp` を任意のglob importで直接参照。顔領域をSVGのviewBoxで切り出します。ソース画像のコピーは不要です。親の素材がない単独チェックアウトでは頭文字を表示します。人物素材はデモにのみ取り込まれ、UIライブラリには含まれません。
- 「画像URL」: URLを直接指定。
- 「生成した画像ファイル」: 選んだ画像をobject URLで表示。サーバーへのアップロード・リポジトリへのコピーをせず、変更時と画面終了時にURLを解放します。
- 「頭文字」: 画像を使わない場合の確認。

ボタンの幅・高さも同じカタログで変更できます。

## ボタンの生成プロンプト

生成方法: 組み込み `image_gen.imagegen`、`transparent_background: true`。生成PNGを `src/assets/ui/buttons/ornate-button.png` に保存し、そのまま利用しています。

```text
Use case: stylized-concept
Asset type: production nine-slice resizable button PNG for a medieval fantasy strategy game, nordencult.
Primary request: one single square blank ornamental button surface, front-facing flat orthographic UI artwork, filling the canvas to its edges with genuinely transparent exterior cutouts. Antique finely engraved brass and bronze edging, modest curling leaf filigree concentrated in all four corners, and an ivory aged parchment center. Match a hand-painted classic fantasy game, restrained detail readable at small button sizes.
Composition: exact square 1024x1024 image, frame extends almost to the canvas edges (at most 8px margin); corner ornaments confined to outer 18% of width and height; thin straight continuous matching borders on all four sides; middle 64% is quiet warm parchment free of ornaments for a separately rendered text label. Even uniform thin border, no wide top or bottom plaque. Keep central horizontal and vertical strips plain so it can be nine-slice stretched into a short wide rectangle or square without distorting the corners.
Color palette: aged muted brass, warm sepia shadows and light cream parchment, consistent with ornate gold InfoWindow borders.
Constraints: NO text, letters, symbols, glyphs, gems, icons, watermark, scene, perspective, extra panels or buttons. Single isolated button tile. Parchment center must be opaque. Outside silhouette transparent. No drop shadow outside.
```
