# UIパーツの装飾と画像

CityNavigatorとBannerはInfoWindowの最も細いベゼル（`windowSkins.thin`）を共用します。HUDに合わせて角領域を22pxで描き、背景を内側に配置して外周の透過を保ちます。

## ボタンとスライダー

ボタン本体は、滑らかな象牙の表面、丸みのある面取り、光沢と下辺の陰影を持つ立体的な素材です。四隅には小さな金／銀の象嵌装飾を配置しています。`src/assets/ui/buttons/ivory-button-gold.png` と `ivory-button-silver.png` は組み込み image_gen ツールで作成した透過PNGです。CSSのborder-imageで9分割し、角と面取りの大きさを保って象牙の中央を伸縮します。hover・押下・無効・キーボードフォーカスに対応し、暗いHUD上でも象牙の明るさを保ちます。ChoiceGroup、都市の矢印、QuantityInputの±にも同じ素材を使います。

```tsx
<Button style={{ width: 240, height: 60 }}>出撃する</Button>
<Button metal="gold">金の装飾</Button>
<Button metal="silver">銀の装飾</Button>
<Button variant="primary">予約</Button>
<Button variant="quiet" size="small">やめる</Button>
```

内容と装飾が収まる寸法を指定してください（通常は高さ40px以上、小さいボタンは32px以上）。幅は内容に応じて自動で決まるほか、`style` の数値・割合などで指定できます。

`metal` を省略すると、primaryは金、それ以外は銀になります。明示指定はvariantより優先します。カタログの「四隅の装飾」で任意サイズのボタンを切り替えられます。

ChoiceGroupは暗い共通の台座に選択肢を配置します。選択中は明るい金装飾の象牙、未選択は銀装飾の素材を暗くして面取りの光を反転させたくぼみとして描画します。丸い選択マーカーとhoverの明るさでも状態を伝えます。キーボードフォーカス、無効状態は選択状態と別に表示します。

QuantityInputはネイティブのrangeを保ち、真鍮の溝・金装飾の象牙ボタン画像を使ったつまみ・値に連動する充填を描画します。つまみは24×28pxで、hoverの光沢と掴むカーソルを付けています。ChromiumとFirefoxの描画指定を含み、数値入力と範囲制限は従来のままです。

## 羊皮紙のCard

`Card` は共通の羊皮紙画像と `src/assets/ui/skins/ink-card-frame.svg` のインク装飾を重ねます。装飾SVGはコードで描き、角と線を9分割で伸縮します。

```tsx
<Card as="article" style={{ width: 360 }}>
  <h3>騎士団の記録</h3>
  <p>任意の内容を置けます。</p>
</Card>
```

KnightCardはこのCardを使用します。標準の顔画像は76px、compactは60px。能力は名前と数値で表示し、能力値は24px（compactは20px）です。

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

生成方法: 組み込み `image_gen.imagegen`、全て `transparent_background: true`。金版を新規生成したあと透過輪郭を仕上げ、同じ金版を参照して装飾の金属のみを変更した銀版を作成しています。保存先は `src/assets/ui/buttons/ivory-button-gold.png` と `ivory-button-silver.png` です。

### 金・象牙の素材生成

```text
Use case: stylized-concept
Asset type: single transparent PNG nine-slice button surface for a medieval fantasy strategy game.
Primary request: a tactile solid polished ivory button, gently raised and rounded, with four small delicate GOLD filigree inlays at the four corners. The button itself is sculpted from creamy ivory: its entire center, bevels and edge are ivory with restrained fine organic ivory striations and soft luminous satin reflections. The flat center remains calm and readable for a label added later. Corners have discreet antique gold curling leaf inlays inset into the ivory. Solid luminous ivory must occupy at least 90% of the surface. Metal appears only in the four tiny corner ornaments.
Composition: one nearly canvas-filling SQUARE 1024x1024 ivory keycap tile viewed straight from above, orthographic, no perspective. Designed to stretch with nine-slice into a 150x44 pixel rectangular UI button. All four decorated corner zones confined to the outer 20% square corners. Side strips are straight ivory bevels with constant thickness, suitable for stretching. Soft shallow domed top, a slim ivory bevel with light on its upper rim and warm occlusion on its lower rim makes it read as a physical pressable object. Center is ivory material, not paper or an empty framed hole.
Lighting: upper-left soft warm highlights, subtle tactile depth and contact shading embedded into the bottom edge.
Background: genuinely transparent around the silhouette. Button fills canvas with only a 4px exterior margin. Exterior silhouette gently rounded (small corner radius). Center opaque.
Avoid: parchment, paper, distressed paper, gold surrounding frame, continuous metal border, window frame, scroll, heavy ornaments, large leaves, gems, symbols, text, letters, watermark, multiple objects, scene, cast shadow outside silhouette.
```

### 金版の透過輪郭の仕上げ

```text
undefined
```

### 銀版の生成

```text
undefined
```
