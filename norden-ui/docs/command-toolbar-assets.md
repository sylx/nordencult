# CommandToolbar の生成画像

2026-10-09、組み込みの imagegen ツールで各画像を個別に再生成しました。
すべて `transparent_background: true` で生成し、PNG のアルファを保持しています。

| 保存先（norden-ui からの相対パス） | 配信用サイズ | 参照画像 |
| --- | --- | --- |
| `src/assets/ui/hud/command-frame.png` | 384 × 240 | 変更前の command-frame.png |
| `src/assets/ui/icons/icon-territory.png` | 128 × 128 | icon-knowledge.png、icon-gold.png（画風のみ） |
| `src/assets/ui/icons/icon-sun.png` | 128 × 128 | 変更前の icon-sun.png |

フレームは生成画像（1448 × 1086）の外側の余白を `(x: 4, y: 64, width: 1440, height: 900)` で切り詰めて縮小しました。
アイコンは生成画像（1254 × 1254）を縮小しました。配信用の縮小には FFmpeg の Lanczos フィルターを使用しています。
CSS は `border-image-slice: 12% 34%`、描画時の上下幅は 10px、左右幅は 37px です。

## フレームの最終プロンプト

```text
Use case: precise-object-edit. Asset type: production transparent PNG nine-slice frame for a medieval strategy game's compact command toolbar. Input image is the old frame, a style and proportions reference. Completely regenerate a clean version: aged warm brass/gold thin rectangular frame with restrained bevelled highlights, angular clipped corners and a small diamond-shaped geometric brass ornament halfway along EACH left and right edge. Shape is exactly symmetric top-to-bottom and left-to-right. Maintain approximate 4:3 overall canvas ratio and generous central rectangular opening. Top and bottom straight borders must be identical thickness and ornament-free and suitable for horizontal stretching. Side ornaments fit inside outer bounding box, entirely separate from the interior content opening. Only the brass border is visible: the center AND exterior are genuinely fully transparent. No blue backdrop, no black fill, no residual scenery, no stray pixels, no shadow outside frame, no text. Single complete frame centered with tiny even transparent margins. Match the reference's detailed game-UI brass material, but remove every remnant of its background. Target clean frame geometry and small toolbar readability.
```

## 都市アイコンの最終プロンプト

```text
Use case: stylized-concept. Asset type: one transparent PNG icon for a medieval strategy game command toolbar, displayed at 40px. Generate a new city icon: a compact fortified medieval city with a central stone gatehouse/tower, two smaller towers and a few clustered peaked-roof houses, clearly reads as a CITY rather than territory or a map. Input images are style-only references for the parchment, gold and softly painted antique fantasy interface. Warm ivory limestone, muted bronze and warm gold roof details, clear chunky silhouette, elegant hand-painted game icon shading and subtle dark edge definition for readability on a dark brown toolbar. Square canvas, single centered city filling 85 percent of canvas, clean alpha edges. Transparent background everywhere outside the city silhouette. No purple or colored backdrop, no map, no platform or ground underline, no badge, no frame, no lettering, no watermark, no cast shadow disconnected from icon. Not photorealistic or flat emoji.
```

## 太陽アイコンの最終プロンプト

```text
Use case: precise-object-edit. Asset type: one transparent PNG sun icon for a medieval strategy game's end-turn command, displayed at 40px. Input image is old sun icon, style reference. Regenerate a polished golden SUN ONLY, with round convex embossed brass disk, warm gold bevelled rim and sixteen clean straight tapered rays alternating long and short, rotationally balanced. Match the reference's warm antique gold and softly painted metallic highlights. Centered square canvas, sun fills 88 percent of canvas. Genuinely transparent background outside sun and between every ray. Remove the horizontal gold underline entirely. No line beneath sun, no pedestal, no horizon, no badge, no rectangular background, no text or watermark, no glow spilling outside silhouette. Preserve clear readable silhouette at small size.
```
