# 装飾スキン

`InfoWindow` と `InfoWindowWithTabs` の `skin` propで、ゲームロジックやパネル内容から独立して装飾画像を変更できます。

| スキン | 枠の描画 | 特徴 |
| --- | --- | --- |
| `windowSkins.classic` | 従来の角・辺の画像 | 既存の見た目を維持 |
| `windowSkins.thin` | 全体PNGの9分割 | 細い金属ベゼルと控えめな角飾り |
| `windowSkins.goddess` | 全体PNGの9分割 | 上部両角の女神像、金の唐草、青い宝石 |

## 生成した画像と透過

- [細いベゼル PNG](../src/assets/ui/skins/thin-frame.png)
- [女神像の枠 PNG](../src/assets/ui/skins/goddess-frame-v2.png)
- [生成プロンプト・修正指示](image-generation.json)

内蔵の `image_gen` で `transparent_background: true` を指定して生成しました。
いずれも **1254 × 1254 のRGBA PNG** です。生成時のalphaをそのまま保存しています。
市松模様を画像に描き込んだものではありません。中央と外側は透過で、輪郭には半透明のアンチエイリアスがあります。
中央には生成由来のalpha=1/255の微小なノイズが一部残っています。自動テストでは中央の最大alphaが1以下であることを確認します。
完全にalpha=0へそろえる必要がある場合は、画像編集ソフトで中央の余白を完全消去してください。輪郭の半透明まで一括で消すとギザギザになります。

表示側では枠に `border-image` を使い、`fill` を指定せず、中央を空のまま描画します。
羊皮紙は別レイヤーに置き、枠の実測した内側の境界に合わせた余白と丸みで、外側にはみ出すのを防ぎます。
女神像は四隅の固定領域に収め、ウィンドウサイズが変わっても像そのものを引き伸ばしません。
白・黒・市松模様の背景と、羊皮紙なしの表示で確認しました。

## 編集したPNGに差し替える

編集した画像をゲーム側のassetsへ配置し、URLとして渡します。既存スキンをコピーすると余白設定も再利用できます。

```tsx
import { InfoWindowWithTabs, windowSkins } from 'norden-ui'
import type { InfoWindowSkin } from 'norden-ui'
import editedFrame from './assets/my-goddess-frame.png'

const mySkin: InfoWindowSkin = {
  ...windowSkins.goddess,
  name: 'my-goddess',
  frame: { ...windowSkins.goddess.frame, image: editedFrame },
}

<InfoWindowWithTabs tabs={tabs} title="フルーエン" skin={mySkin} />
```

透明部分を保つため、PNGまたはalphaを持つWebPで保存してください。JPEGへの変換や白背景への統合は避けてください。
キャンバスの比率や装飾位置を変えなければ、上記の設定をそのまま使えます。

## 9分割の設定

`frame.image` が全体画像、`frame.slice` が元画像を分ける境界、`frame.width` が画面上の角領域の寸法です。
四隅は一定の大きさで描画し、上下・左右の辺だけを伸縮します。

| 設定 | 細いベゼル | 女神像 |
| --- | --- | --- |
| `frame.slice` | `'12.5%'` | `'36%'` |
| `frame.width` | `32` px | `112` px |
| `frame.repeat` | `'stretch'` | `'stretch'` |

女神像の36%は、生成された実画像の像・台座が角領域に完全に収まるよう調整した値です。
パーセントで指定しているので、同じ配置のまま画像解像度を変えても切り出し位置は保たれます。
切り出し境界をまたいで人物や宝石を置くと、それらが伸縮します。中央の辺には直線的な枠だけを置いてください。

独自レイアウトは `skin.layout` に指定できます。

```tsx
const skin: InfoWindowSkin = {
  name: 'custom',
  frame: { image: editedFrame, slice: '30%', width: 96 },
  layout: {
    paddingTop: 80, paddingRight: 96, paddingBottom: 64, paddingLeft: 96,
    paperInset: { top: 24, right: 16, bottom: 24, left: 16 },
    paperRadius: 16,
    tabTop: 108,
  },
}
```

`padding*` は内容の余白です。自動サイズ計測にも反映します。
`paperInset` は羊皮紙の余白で、全辺同じ数値または上下左右を指定できます。
`paperRadius` は羊皮紙の角の丸みです。装飾の外側や切り抜き部分へのはみ出しを見ながら調整してください。

## 旧形式の画像を1点ずつ差し替える

`images` の未指定項目はクラシックから継承します。`frame` を指定しなければ従来の角・辺の画像で描画します。

```tsx
const skin: InfoWindowSkin = {
  name: 'custom-parts',
  images: {
    corner: '/ui/corner.png',
    horizontalEdge: '/ui/horizontal.png',
    verticalEdge: '/ui/vertical.png',
    titleCorner: '/ui/title-cap.png',
    titleBar: '/ui/title-bar.png',
    tabActive: '/ui/tab-active.png',
    tabInactive: '/ui/tab-inactive.png',
    paper: '/ui/paper.webp',
  },
  layout: { cornerSize: 64, edgeSize: 8, titleCapWidth: 28, titleHeight: 48 },
}
```

画像URLに空文字を指定すると、その画像を非表示にします。例えば `images: { paper: '' }` で羊皮紙を消せます。
各スキンはウィンドウごとに指定でき、複数のウィンドウに異なるスキンを使っても干渉しません。
