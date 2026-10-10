# UIパーツの装飾と画像

CityNavigatorとBannerはInfoWindowの最も細いベゼル（`windowSkins.thin`）を共用します。HUDに合わせて角領域を22pxで描き、背景を内側に配置して外周の透過を保ちます。

## 細いベゼルの題名の札

`ThinFrameWithTitle` は `ThinFrame` の上辺の中央に題名の札を載せたHUDのパネルです（戦闘画面の地形・戦闘記録など）。
札は札の高さの半分だけ枠の外へはみ出し、パネルの上の余白は残りの半分の分だけ広くとります。

```tsx
<ThinFrameWithTitle title="戦闘記録" style={{ width: 320 }}>
  <ol>…</ol>
</ThinFrameWithTitle>
```

札はいまCSSの仮組（暗い茶の帯・上下の金の細線・両端の金の菱形）です。画像ができたら `parts.css` の
`.norden-thin-titled-title::before` を横方向の9分割（`border-image`、両端の幅 `--norden-thin-title-cap`）に置き換え、
菱形（`.norden-thin-titled-title-text::before` / `::after`）を消します。高さは `--norden-thin-title-height`（既定24px）。

画像の仕様（生成の依頼に使う）:

- 横長の透過PNG。縦横比はおよそ 8:1（例 1024×128）。画面では高さ24px前後に縮小して使う
- 左右の端飾り（キャップ）は全幅の各10%以内に収め、中央は文字を載せる無地の帯。中央は横に伸ばすので、模様を入れず均一にする
- 細いベゼル（`src/assets/ui/skins/thin-frame.png`）と同じ、くすんだ真鍮の細い縁と暗い地。文字は明るい色（#fff4d0）で載せる
- 札の外側は完全に透過。文字・影・余白の背景は描き込まない

## ボタンとスライダー

ボタン本体は、滑らかな象牙の表面、丸みのある面取り、光沢と下辺の陰影を持つ立体的な素材です。四隅に金／銀の象嵌装飾があるバリエーションと、装飾なしのバリエーションがあります。`src/assets/ui/buttons/ivory-button-gold.webp`、`ivory-button-silver.webp`、`ivory-button-plain.webp` は組み込み image_gen ツールで作成した透過PNGを、ImageMagickで256×256pxに縮小してロスレスWebPに変換した素材です。CSSのborder-imageで9分割し、角と面取りの大きさを保って象牙の中央を伸縮します。hover・押下・無効・キーボードフォーカスに対応し、暗いHUD上でも象牙の明るさを保ちます。ChoiceGroupには金／銀、都市の矢印とQuantityInputの±には装飾なしの素材を使います。

```tsx
<Button style={{ width: 240, height: 60 }}>出撃する</Button>
<Button metal="gold">金の装飾</Button>
<Button metal="silver">銀の装飾</Button>
<Button metal="none">装飾なし</Button>
<Button variant="primary">予約</Button>
<Button variant="quiet" size="small">やめる</Button>
```

内容と装飾が収まる寸法を指定してください（通常は高さ56px以上、小さいボタンは36px以上）。角の表示領域は通常24px、小さいボタン16pxです。角の装飾と文字が重ならない余白を取り、文字は17px（小さいボタン14px）の太めのゴシック体、象牙上では濃い色で描画します。幅は内容に応じて自動で決まるほか、`style` の数値・割合などで指定できます。

`metal` を省略すると、primaryは金、それ以外は銀になります。`metal="none"` は象牙の質感・光沢・面取りを保った装飾なしのボタンです。明示指定はvariantより優先します。カタログの「四隅の装飾」で金・銀・なしを切り替えられます。

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

## ボタン画像の縮小とWebP変換

`src/assets/ui/buttons/` の4枚（象牙3種と `ornate-button.webp`）は、元の1254×1254pxから256×256pxに縮小しています。26%の角領域は約67pxとなり、通常24px・小さいボタン16pxの角を高密度画面でも描画できます。CSSのスライス比率はそのまま使います。

元PNGからの変換コマンド（ImageMagickのWebP出力対応が必要）:

```sh
for source in src/assets/ui/buttons/*.png; do
  convert "$source" -filter Lanczos -resize 256x256 -strip \
    -define webp:lossless=true -define webp:method=6 "${source%.png}.webp"
done
```

Lanczosで縮小時の輪郭をなめらかにし、WebPはロスレスで保存して透過と縮小後の画質を保ちます。

## ボタンの生成プロンプト

### 装飾なしの象牙ボタン

組み込み `image_gen.imagegen` で金版を参照し、`transparent_background: true` で装飾を除去。
保存先: `src/assets/ui/buttons/ivory-button-plain.webp`。

```text
Use case: precise-object-edit
Edit target: the attached square ivory button surface.
Primary request: create its plain, undecorated ivory variant by completely removing the four gold filigree corner inlays. Replace those areas with seamlessly matching polished creamy ivory. There should be no gold, silver, metal ornaments, carved patterns, symbols or decorative corner pieces anywhere.
Preserve the entire solid ivory body, satin polish, subtle ivory grain, smooth raised bevel, rounded square silhouette, upper-edge light, lower-edge shadow, lighting direction, original dimensions and front-facing orthographic perspective. Keep a flat quiet opaque ivory center for a later text label. The sides and corner geometry must still suit nine-slice resizing into a button.
Background: transparent outside the smooth rounded ivory silhouette. Remove detached specks and colored/white halos outside the button; only the single ivory object should be opaque. No external cast shadow.
Constraints: change only the decorative inlays to plain ivory and clean the outer alpha. No text, letters, new objects, parchment, picture frame or continuous metal edging.
```

生成方法: 組み込み `image_gen.imagegen`、全て `transparent_background: true`。金版を新規生成したあと透過輪郭を仕上げ、同じ金版を参照して装飾の金属のみを変更した銀版を作成しています。保存先は `src/assets/ui/buttons/ivory-button-gold.webp` と `ivory-button-silver.webp` です。

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
