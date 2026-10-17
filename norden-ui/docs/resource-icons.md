# 生産・商業のアイコン

組み込み `image_gen` で生成した透過PNG。`icon-gold.png` と `icon-military.png` を素材感の参考として使用。丸い背景や台座を付けず、26〜38pxで表示する。

- `src/assets/ui/icons/icon-production.png`: 金床とハンマー。FactionBar の総生産と都市情報の生産グラフに使用。
- `src/assets/ui/icons/icon-commerce.png`: 天秤と金貨。都市情報の商業グラフに使用。

## 生産の生成プロンプト

```text
Use case: stylized-concept. Asset type: production game HUD resource ICON, square transparent PNG. Style references: the attached existing gold coin icon and crossed swords icon. Match their realistic painterly dimensional medieval fantasy materials, warm upper-left highlights, dark clean edges, restrained metal texture. The result is a tiny interface icon displayed at 26-36px, so prioritize a strong bold immediately readable silhouette, large simple forms and clear light/dark separation. Center the object, occupy 85-90% of the square canvas, keep a small transparent safety margin. True alpha background everywhere outside the object and in gaps. Isolated object ONLY. No enclosing circle, no circular medallion, no badge, no disc, no plaque, no border, no background panel, no ground plane, no cast shadow background, no text, no letters, no watermark, no rendered checkerboard. Crisp alpha edges. It should read on both parchment and dark navy.
Subject: PRODUCTION / CRAFTSMANSHIP. One substantial forged-steel ANVIL seen in shallow three-quarter view, with a clearly recognizable horizontal horn pointing right, broad metal top, narrow waist and solid broad feet. One blacksmith's hammer rests diagonally across/behind the anvil: large bright steel hammer head at upper left and a warm dark wooden handle slanting down. Use steel silver/blue-gray as the main material with restrained warm bronze highlights. The anvil and hammer form one compact cohesive icon. No circle around it. No gear, no swords, no sparks, no extra objects or scenery.
```

## 商業の生成プロンプト

```text
Use case: stylized-concept. Asset type: production game HUD resource ICON, square transparent PNG. Style references: the attached existing gold coin icon and crossed swords icon. Match their realistic painterly dimensional medieval fantasy materials, warm upper-left highlights, dark clean edges, restrained metal texture. The result is a tiny interface icon displayed at 26-36px, so prioritize a strong bold immediately readable silhouette, large simple forms and clear light/dark separation. Center the object, occupy 85-90% of the square canvas, keep a small transparent safety margin. True alpha background everywhere outside the object and in gaps. Isolated object ONLY. No enclosing circle, no circular medallion, no badge, no disc, no plaque, no border, no background panel, no ground plane, no cast shadow background, no text, no letters, no watermark, no rendered checkerboard. Crisp alpha edges. It should read on both parchment and dark navy.
Subject: COMMERCE / TRADE. One compact antique gold/bronze merchant's BALANCE SCALE with a thick central stem, a bold horizontal beam and TWO broad shallow hanging pans. Clear simplified symmetrical silhouette, sculpted metal highlights, dark brass recesses. Two or three substantial gold coins sit at the foot, integrated into the silhouette, not a heap covering the scale. The scale is dominant and coins secondary, so it is clearly different from a plain gold treasury coin-stack icon. Only the scale and coins, no circle around it. No gems, no buildings, no characters, no lettering, no tiny engraving.
```
