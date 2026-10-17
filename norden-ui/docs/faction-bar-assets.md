# 勢力の球体バー

現在の素材（組み込み `image_gen` で生成）:

- `src/assets/ui/hud/faction-orb-compact.png`: 上部の彫刻を球の縁に沿わせた、コンパクトな球の装飾。正方形のまま描画する。
- `src/assets/ui/hud/faction-ribbon.png`: 球を含まない独立したバー。上下 34% / 30%、左右 10% の nine-slice で伸縮する。素材の上下の透明余白は外側の8pxにまとめ、内容領域の外へ出す。

`--faction-bar-height` はバー内容領域の最小高さ（既定 56px）、`--faction-orb-size` は球の装飾の縦横サイズ（既定 88px）。球とバーは別々に描画し、縦の中心を合わせる。内容には `padding-block: 10px` を設定する。球のエンブレムは `FactionBar.faction.emblem` を重ねる。

参照素材: `src/assets/ui/hud/faction-frame.png`（旧構成の球とバーを一体化した画像）。

## 球の生成プロンプト

```text
Edit reference game UI asset into ONE standalone compact orb mounting on a SQUARE transparent canvas. Reference is the existing approved blue crystal orb and gold acanthus style. Keep that same glossy dark sapphire spherical glass, blue highlights, intricate intertwined antique gold scrollwork, realistic painted metal and upper-left lighting. Remove the long horizontal bar completely. CRITICAL change: remove the tall upward-pointing gold leaf plume at the top. Reweave ONLY those upper leaves sideways snugly around the circle's upper rim. The uppermost ornament should extend only 2-3% of the canvas higher than the glass sphere's top. No tall stalk, spike, crown, or crest. Keep rich filigree at the sides and bottom. Entire mounting compact and close to circular. Center the TRUE ROUND glass face at (48%,48%) of the square, face diameter 64% of canvas. The whole mounting fits within 3% transparent margins; a little gold curling outward on the right may visually join a separate horizontal bar. The sphere's center stays empty and dark for a dynamic faction emblem. All outside space genuinely transparent. No text, no emblem, no symbols, no extra objects, no horizontal bar. Orthographic front view, no perspective.
```

## バーの生成プロンプト

```text
Create ONE standalone horizontal dark navy and antique gilded gold HUD ribbon for a medieval fantasy strategy game. Reference is material/style only: same dark midnight blue leather/enamel and realistic fine gilded metal bevels. Wide 3:1 rectangular composition, approximately1200x400, transparent outside. This is a scalable nine-slice UI asset: straight thin DOUBLE GOLD RAILS along the top and bottom, blank very dark navy middle occupying the whole rectangular area, a simple thin beveled left edge that will be hidden behind a separately composited orb, and a restrained small intertwined leaf curl end cap at the far right. The rectangle extends almost to all canvas edges, outer transparency margin no more than 2%. Top and bottom rails no thicker than 5% of the canvas height; large uninterrupted blank content field inside. The central 70% of width must have perfectly constant horizontal rail profiles, no ornaments crossing the content. Small right end cap fits inside rightmost 10% and does NOT extend above or below the rectangle. Fixed corners and rails must be suitable for CSS border-image nine-slice so the navy middle can stretch BOTH vertically and horizontally. NO orb, no sphere, no medallion, no big corner plumes, no text, no numbers, no icons, no buttons, no watermark, no rendered checkerboard. Orthographic front view. True transparent PNG background outside the ribbon.
```
