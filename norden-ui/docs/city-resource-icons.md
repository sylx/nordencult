# 都市リソースのアイコン

組み込み `image_gen` で生成した透過 PNG。`CityInfoWindow` の兵数・練度・物資に 36px で表示する。ラベルも併記し、画像は装飾として扱う。

保存先: `norden-ui/src/assets/ui/icons/`。

## 共通プロンプト

```text
Use case: stylized-concept. Asset type: square transparent PNG medieval fantasy strategy game HUD resource icon, readable at 38px. Match Norden UI: dimensional painterly realistic materials, bold simple silhouette, steel blue-gray and warm bronze, warm upper-left highlights, dark clean edges. Center subject occupying 85% of square, small safety margin, true transparent alpha outside objects and in gaps. Isolated object only; no enclosing circle, badge, disc, plaque, border, ground, background, text, watermark or checkerboard.
```

共通プロンプトに以下の各 Subject を続けて、画像ごとに生成した。

## 兵数 (`icon-troops.png`)

```text
Subject: TROOP COUNT. A single substantial medieval infantry helmet with nose guard in three-quarter view, with two smaller helmets behind its left and right shoulders, forming a compact cohesive group of three helmets. Recognizable army manpower silhouette; no faces, no bodies, no feathers, no elaborate ornament. Steel silver dominates, restrained bronze rim.
```

## 練度 (`icon-training.png`)

```text
Subject: TROOP TRAINING / PROFICIENCY. Two broad steel practice swords crossing upward, their warm bronze hilts at lower left and right. A small tight bronze laurel sprig follows each lower outside edge, symbolizing earned military proficiency. Bold simple strong X silhouette, broad readable blades, no shield, no helmet, no characters, no ornate engraving.
```

## 物資 (`icon-supplies.png`)

```text
Subject: MILITARY SUPPLIES. A compact sturdy wooden provisioning crate with bronze metal corner straps, a tied tan canvas grain sack nestled next to it and a single short bundle of wheat heads peeking from the sack. Large simple wooden crate dominates, sack secondary. Warm natural oak and tan linen distinguish this from steel military icons. No coins, no weapons, no extra objects or scenery.
```
