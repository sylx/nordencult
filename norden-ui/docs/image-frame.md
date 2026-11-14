# 画像枠

`ImageFrame` は通常の `img` や `BuildingImage` を囲む、真鍮調の装飾枠です。
専用の透過 SVG `src/assets/ui/skins/image-frame.svg` を9分割で描画し、四隅の葉飾り・鋲の大きさを保ったまま辺を伸縮します。画像の周囲には16pxの余白を確保します。

```tsx
<ImageFrame>
  <img src={image} alt="風景" />
</ImageFrame>
```

枠は内容の幅に追従し、親の幅を上限にします。直下の画像は元のサイズを上限として縦横比を保ち、切り抜かずに縮小します。
高さを制限する場合は CSS 変数 `--norden-image-max-height` を指定します（`EventScreen` では `52vh`）。
独自の画像コンポーネントは自身の幅・高さを指定してください。
