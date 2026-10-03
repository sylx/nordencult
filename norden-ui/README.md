# norden-ui

ファンタジーSLG **nordencult** のReact UIコンポーネントライブラリ。
まずは旧実装の `InfoWindow` / `InfoWindowWithTabs` を移植し、独立したデモとテストを整備しています。

## 開発・動作確認

Node.js 22.12以上（開発時は24）、npmを使用します。

```sh
npm ci
npm run dev
```

http://localhost:5173 でデモを開きます。タイトル、本文の長さ、タブ数、固定サイズ、手動リサイズを変更できます。
タイトルをドラッグすると移動します。タブにフォーカスして ↑ / ↓ / Home / End キーで選択できます。

```sh
npm run test        # Vitest: 選択・ARIA・キーボード・動的なタブ変更
npm run build       # 型チェック + ライブラリJS/CSS + TypeScript宣言
npm run build:demo  # デモを dist-demo/ にビルド
npm run preview     # ビルド済みデモの確認
npx playwright install chromium  # 初回のみ（Chromium未導入の場合）
npm run test:e2e    # Chromium: 実際のサイズ変化・ドラッグ・リサイズ・motion設定
npm run check      # 上記のテスト・ビルドをまとめて実行
```

## ゲームからの利用

`norden-ui` 内で `npm run build` を実行し、ゲーム側のpackage.jsonにローカル依存を追加します。
`norden-strategy` と本リポジトリが兄弟ディレクトリの場合は `"norden-ui": "file:../norden-ui"` です。

```tsx
import { InfoWindowWithTabs } from 'norden-ui'
import type { TabInfo } from 'norden-ui'
import 'norden-ui/style.css'

const tabs: TabInfo[] = [
  { id: 'city', name: '都市情報', icon: '/icons/city.webp', content: <CityInfo /> },
  { id: 'knights', name: '騎士', icon: '/icons/knights.webp', content: <Knights /> },
]

export function CityWindow() {
  return <InfoWindowWithTabs title="カルタ書院 フルーエン" tabs={tabs} x={72} y={56} />
}
```

React / React DOMはpeer dependencyとしてゲームと共有し、ライブラリのJSには含めません。
装飾画像はビルド済みライブラリに埋め込みます。旧リポジトリの参照や画像の別途配置は不要です。
配置先には `position: relative` を指定してください。`x` / `y` は配置先からのピクセル座標です。

## コンポーネントAPI

`InfoWindow` は枠・タイトル・サイズ調整・ドラッグを担当します。
`InfoWindowWithTabs` はそのpropsを受け取り、タブ選択とパネルを追加します。

| InfoWindowのprops | 初期値 | 振る舞い |
| --- | --- | --- |
| `title`, `children` | 必須 | タイトルと任意のReactコンテンツ |
| `showTitleBar` | `true` | `false` でタイトルバーを非表示。タイトルでのドラッグを無効にし、自動幅の計測から除外。ウィンドウのアクセシブルな名前は保持 |
| `titleBarOffset` | スキン設定（`x: 0`, `y: -18`） | `{ x?, y? }` をpxで指定。`x` はウィンドウ中央、`y` は枠の上端を基準。省略した軸はスキン設定を継承 |
| `width`, `height` | `'auto'` | 数値で固定、`'auto'` で内容に追従 |
| `minWidth`, `maxWidth` | `320`, `720` | 自動幅の範囲。最大幅は画面幅−32pxにも制限 |
| `minHeight` | `240` | 最低の高さ。枠の角領域2つ分の寸法も確保 |
| `x`, `y` | `0`, `0` | 初期座標。props変更時に移動先を更新 |
| `draggable` | `true` | タイトルでのポインタードラッグ |
| `resizable` | `false` | 右下のハンドルでサイズ変更。矢印キーにも対応 |
| `onPositionChange`, `onSizeChange` | — | ユーザー操作時の座標・サイズ通知 |
| `className`, `style` | — | 外観の調整（寸法・座標は専用propsを使用） |
| `skin` | `windowSkins.medium` | 全体PNGの9分割で描画。`thin` / `goddess` も同梱 |

旧APIの `resizeable` は `resizable` の別名として使用可能です。

| InfoWindowWithTabsのprops | 初期値 | 振る舞い |
| --- | --- | --- |
| `tabs` | 必須 | `{ id?, name, icon, content }[]`。`icon` は画像URL |
| `title` | 選択タブの `name` | 指定すればタブを切り替えてもタイトルを維持 |
| `defaultActiveTab` | `0` | 非制御モードの初期インデックス |
| `activeTab`, `onActiveTabChange` | — | 親からの制御モード（数値インデックス） |
| `tabListLabel` | `'情報の種類'` | タブ一覧のアクセシブルな名前 |
| `emptyContent` | `null` | タブが0件のときの内容 |

自動サイズでは `ResizeObserver` でタイトルと内容を計測し、幅・高さを220msで変化させます。
長い内容は最大幅で折り返し、上限を超えるタイトルは省略表示します（全文はtitle属性・アクセシブルな名前に保持）。
固定サイズでは内容領域をスクロールできます。タブ数に応じて、タブ一覧が収まる最低高さを確保します。
手動リサイズ後はそのサイズを優先します。サイズ関連propsの変更または再マウントで自動サイズに戻ります。

タブ切替時は選択されたパネルだけをマウントし、180msの登場アニメーションを再生します。
各パネルの永続的なゲーム状態は親に保持してください。並び替えがある場合は一意の `id` を指定すると非制御モードで選択を維持できます。
インデックスの範囲外、タブの削除、空配列にも対応します。
`prefers-reduced-motion: reduce` のときはアニメーションとtransitionを無効にします。

## 装飾画像の差し替え

```tsx
import { InfoWindowWithTabs, windowSkins } from 'norden-ui'

<InfoWindowWithTabs tabs={tabs} skin={windowSkins.thin} />
<InfoWindowWithTabs tabs={tabs} skin={windowSkins.medium} />
<InfoWindowWithTabs tabs={tabs} skin={windowSkins.goddess} />
```

デモの「装飾スキン」で細いベゼル・中程度の装飾（medium）・女神像を切り替えられます。
旧クラシック用の角・辺の画像と描画分岐は削除しました。
「透過確認の背景」で白・黒・市松模様を選択し、「羊皮紙を表示する」をオフにすると枠だけの透過を確認できます。
タイトルバーは左右の装飾を含む一枚の透過PNGで描画します。デモの「タイトルバーを表示する」で表示を切り替えられます。

```tsx
<InfoWindowWithTabs tabs={tabs} showTitleBar={false} />
```

非表示時もスキンの内容余白とタブ配置は維持します。タイトルバーがない場合、タイトルでのドラッグはできません。
独自画像の指定方法、画像編集時の注意点、生成PNGへのリンクは [装飾スキンの説明](docs/skins.md) を参照してください。

## 構成・移植元

```text
src/components/  公開ReactコンポーネントとCSS、単体テスト
src/hooks/       内容のサイズ計測
src/assets/ui/   ライブラリの装飾画像・デモ用タブアイコン
src/index.ts     公開API
demo/           ゲームから独立した動作確認画面
tests/          実ブラウザでのテスト
```

- 参考画像: `norden-strategy/docs/image/exec-0f8f41c4-e9b3-423a-af0d-ce7b8c4f8165.png`
- 移植元: `nordencult-old/src/ui/components/InfoWindow{,WithTabs}.{tsx,css}`
- 画像: 枠は `src/assets/ui/skins/` の生成PNG3点、タイトルは生成した `info_window_title_full.png` を使用。羊皮紙・タブ画像とアイコンは旧実装から移植。都市画像は `src/assets/map/place_city.webp` からデモ専用にコピー
- ゲームの都市・人物データ、地図処理は含めず、Reactコンテンツとして呼び出し側から渡す
- 開発構成: [Viteのライブラリモード](https://vite.dev/guide/build.html#library-mode)
- タブの操作と関連付け: [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
