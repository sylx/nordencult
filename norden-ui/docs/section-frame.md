# セクション区切り枠（箔押し風）

素材: `src/assets/ui/skins/section-frame.png`

黒革テクスチャ（`src/assets/ui/hud/dark-texture.png`）の上に配置するセクション区切り用の枠です。ウィンドウ用の重い金属ベゼル（`thin-frame.png`）とは異なり、革の装丁に金箔を熱転写したような箔押し（ホットスタンプ）の意匠になっています。

## 9分割（border-image）設定

- **元画像サイズ**: 1024 × 1024 px（透過RGBA PNG）
- **角の装飾幅**: 四隅の各225px（約 22%）
- **コーナー意匠**: 中世・王国の古書装丁にみられるステップ型幾何学ブラケット＋フルール・ド・リス（百合紋章）の点描箔押し金型。外枠用の `thin-frame`（植物葉アカンサス＋球体リベット＋鋳造レリーフ）と明確に差別化された、平面革への型押し・箔押し（gold tooling）デザイン。
- **中央の直線レール**: 均一なトリプルフィレット金箔線（細線＋本線＋細線）と革への型押し溝（deboss burnish）
- **CSS設定**:
  - `border: var(--norden-section-frame-width, 22px) solid transparent;`
  - `border-image: url('../../assets/ui/skins/section-frame.png') 22% / var(--norden-section-frame-width, 22px) / 0 stretch;`

## コンポーネント

`SectionFrame`（`src/components/parts/SectionFrame.tsx`）および `.norden-section-frame` クラスを提供しています。
枠の内側にわずかな暗い半透明サーフェス（`surface?: boolean`、既定 true）を持ち、直下の `dark-texture.png` の質感を活かしながらセクションを品良く区切ります。

