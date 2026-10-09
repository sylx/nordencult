# norden-ui

ファンタジーSLG **nordencult** のReact UIライブラリ。ターン制SLGのUIを次の3層で作ります。

| 層 | 内容 | 場所 |
| --- | --- | --- |
| 基本部品 | ウィンドウ（`InfoWindow` / `InfoWindowWithTabs`）、ツールバー（`CommandToolbar`）、ターン情報（`DateBar`）、UIパーツ（`Button`・`ChoiceGroup`・`QuantityInput`・`KnightCard` など） | `src/components/` |
| 画面 | 基本部品を組み合わせた1画面分のUI。都市コマンド画面・地図で選ぶステップ・侵攻画面 | `src/screens/` |
| 画面スタック | 画面の階層。都市コマンド → 侵攻先の選択 → 侵攻画面と積み、Escで1段戻る | `src/navigation/` |

画面は表示専用です。ゲームの状態や規則は持たず、表示用のデータ（`CityView` などのview型）とコールバックをpropsで受け取ります。
ゲーム（ルートの `src/scenes/`）が自分の状態をview型に変換して渡し、コールバックで状態を更新します。

## 開発・動作確認

Node.js 22.12以上（開発時は24）、npmを使用します。

```sh
npm ci
npm run dev
```

http://localhost:5173 でカタログを開きます。左の一覧から項目を選び、右の設定で表示を変えられます。項目は `#<id>` で直接開けます（例: `/#info-window`）。

| 区分 | 項目 |
| --- | --- |
| 画面フロー | 戦略画面（`#strategy-flow`、既定）: 都市コマンド → 軍事 → 侵攻 → 地図で侵攻先を選ぶ → 侵攻画面 → 予約。Escで1段ずつ戻る |
| 画面 | 都市コマンド（`#city-command`）、地図で選ぶ（`#map-pick`）、侵攻（`#invasion`） |
| 基本部品 | ウィンドウ（`#info-window`、従来の調整画面）、ツールバー（`#command-toolbar`）、ターン情報（`#date-bar`）、UIパーツ（`#parts`） |

画面の項目は仮の地図（`demo/mock/MockMap.tsx`）の上に重ねます。都市・騎士・兵科は `demo/mock/data.ts` の仮データです。

```sh
npm run test        # Vitest: 部品・画面スタック・画面の操作とARIA
npm run build       # 型チェック + ライブラリJS/CSS + TypeScript宣言
npm run build:demo  # カタログを dist-demo/ にビルド
npm run preview     # ビルド済みカタログの確認
npx playwright install chromium  # 初回のみ（Chromium未導入の場合）
npm run test:e2e    # Chromium: ウィンドウの実寸・ドラッグ・リサイズ、戦略画面のフロー
npm run check      # 上記のテスト・ビルドをまとめて実行
```

## ゲームからの利用

nordencult のルートは `norden-ui/src/index.ts` をエイリアスで直接読みます（ルートのREADMEを参照）。
単独のパッケージとして使う場合は `npm run build` し、`"norden-ui": "file:../norden-ui"` のように依存に加え、`import 'norden-ui/style.css'` を読み込みます。

React / React DOMはpeer dependencyとしてゲームと共有し、ライブラリのJSには含めません。装飾画像はライブラリに含みます。
配置先には `position: relative` を指定してください。ウィンドウの `x` / `y` と画面のレイヤーは配置先を基準にします。

### 画面スタック

```tsx
import { CityCommandScreen, InvasionScreen, MapPickScreen, ScreenHost, useScreenStack } from 'norden-ui'

type StrategyScreens = {
  cityCommand: { cityId: string }
  pickTarget: { from: string }
  invasion: { from: string; to: string }
}

function StrategyUi() {
  const nav = useScreenStack<StrategyScreens>({ screen: 'cityCommand', params: { cityId: 'P012' } })
  // 地図のクリック: nav.top.screen === 'pickTarget' なら nav.push('invasion', { from, to })
  return <ScreenHost nav={nav} screens={{
    cityCommand: ({ cityId }) => <CityCommandScreen city={toCityView(cityId)} turn={turn}
      onCommand={(id) => id === 'invade' && nav.push('pickTarget', { from: cityId })} onEndTurn={endTurn} />,
    pickTarget: ({ from }) => <MapPickScreen message="侵攻先を選んでください" onCancel={nav.pop} />,
    invasion: ({ from, to }) => <InvasionScreen /* … */ onCancel={nav.pop}
      onConfirm={(draft) => { order(from, to, draft); nav.popTo('cityCommand') }} />,
  }} />
}
```

| `useScreenStack` | 振る舞い |
| --- | --- |
| `top`, `stack`, `canPop` | 表示中の画面（`{ screen, params, key }`）、下からの全画面、戻れるか |
| `push(screen, params)` | 1段深くする |
| `replace(screen, params)` | 表示中の画面を差し替える（都市の切り替えなど） |
| `pop()` / `popTo(screen)` | 1段戻る（最下段は残す）／指定した画面まで戻る |
| `reset(screen, params)` | 1画面からやり直す |

`ScreenHost` は最上段の画面だけを配置先いっぱいのレイヤーに描きます。レイヤー自体はポインターを通すので、下の地図をクリックできます。
pushのたびに `key` が変わり、同じ画面でも新しくマウントされます（侵攻画面を開き直すと選択が初期化される）。
Escで `pop()` します。サブコマンドの展開などEscを自分で使う部品は `event.preventDefault()` し、`ScreenHost` はその場合に戻りません。`escapeToPop={false}` で無効にできます。
地図の強調など画面の外の処理は、ホストが `nav.top` を見て行います。

### 画面

| 画面 | 構成 | 主なprops |
| --- | --- | --- |
| `CityCommandScreen` | 都市の切り替え ◀ ▶（左上）、都市情報ウィンドウ（都市情報・騎士・街道タブ）、ターン情報（右上）、アクションツールバー（下） | `city: CityView`, `turn: TurnView`, `onPrevCity` / `onNextCity`, `cityPosition`, `commandState`, `onCommand(id)`, `onEndTurn`, `endTurnDisabled`, `onSelectNeighbour`, `turnMenu`, `children`（ホストの追加HUD） |
| `MapPickScreen` | 案内の帯と「やめる」 | `message`, `onCancel`, `cancelLabel` |
| `InvasionScreen` | 出撃する騎士の選択ウィンドウ、兵科と兵数のウィンドウ、合計兵数と「やめる / 予約」 | `from` / `to: CityView`, `defenders`, `knights: KnightView[]`, `unitTypes`, `soldierPool`, `soldierStep`, `validate(draft)`, `onConfirm(draft)`, `onCancel` |

アクションツールバーのコマンドは `CITY_COMMAND_GROUPS` に定義しています。内政（建設・割当）、軍事（移動・侵攻・募兵・輸送）、研究、商人（購入・売却）と、最後にターン終了です。
分類を押すと上にサブコマンドが開きます。`commandState={{ invade: { disabled: true, reason: '出撃できる騎士がいません' } }}` で無効にし、理由をツールチップに出します。

侵攻画面は騎士ごとに1つの兵科と兵数を決めます。騎士を選ぶと、`defaultUnitType`（無ければ先頭の兵科）と、騎士の上限（`maxSoldiers`）と残りの兵数の小さい方で部隊に加わります。
兵数の合計は `soldierPool` を超えません。0人、兵数0の部隊、`validate` が返した理由があると「予約」を押せません。`onConfirm` には選んだ順の `{ knightId, unitType, soldiers }[]` を渡します。
`unavailableReason` を持つ騎士は一覧に出ますが選べません。

騎士の顔は `KnightView.portrait`（ReactNode）で渡します。省略すると頭文字を表示します。紋章は `FactionView.emblem`（画像URL）です。

画面の追加方法は [画面の追加](docs/screens.md) を参照してください。

### 基本部品

| 部品 | 主なprops | 振る舞い |
| --- | --- | --- |
| `CommandToolbar` | `commands: { id, label, icon?, onClick?, disabled?, title?, active?, tone?, children? }[]`, `movable` | 子を持つコマンドは押すと上にサブコマンドの列を開く（再クリック・Esc・外側クリックで閉じる）。`tone: 'accent'` で強調。`movable` で左右の端をドラッグ・矢印キーで移動 |
| `DateBar` | `text`, `icon?`, `children?` | 年月・ターンの帯。`children` を渡すと歯車の設定メニューを出す |
| `Button` | `variant: 'normal' \| 'primary' \| 'quiet'`, `size` | 羊皮紙の上（normal / primary）と暗いHUDの上（quiet）のボタン |
| `Banner` | `children`, `actions` | HUDの案内の帯（`role="status"`） |
| `CityNavigator` | `name`, `onPrev`, `onNext`, `position` | ◀ 都市名 ▶。ハンドラが無い方向は無効 |
| `ChoiceGroup` | `label`, `options`, `value`, `onChange` | 単一選択のボタン列。radiogroupとして矢印キーで移動し、無効な選択肢を飛ばす |
| `QuantityInput` | `label`, `value`, `onChange`, `min`, `max`, `step`, `unit` | スライダー・± ボタン・数値入力。範囲外は丸める |
| `KnightCard` | `knight: { name, portrait?, subtitle?, stats? }`, `selection`, `current`, `aside`, `compact` | 騎士の顔・名前・能力。`selection` でチェックボックスになる |
| `FactionMark` | `faction?`, `emblemOnly` | 紋章と勢力名。省略すると中立 |

旧実装（`nordencult-old/src/ui/components/`）から `CommandToolbar` と `DateBar` を移植しました。HUDのフレーム・背景画像は `src/assets/ui/hud/`、アイコンは `src/assets/ui/icons/` です。ResourceBar・PlayerEmblem・MinimapWindow は未移植です。

### ウィンドウ

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

### 装飾画像の差し替え

```tsx
import { InfoWindowWithTabs, windowSkins } from 'norden-ui'

<InfoWindowWithTabs tabs={tabs} skin={windowSkins.thin} />
<InfoWindowWithTabs tabs={tabs} skin={windowSkins.medium} />
<InfoWindowWithTabs tabs={tabs} skin={windowSkins.goddess} />
```

カタログの「ウィンドウ」の「装飾スキン」で細いベゼル・中程度の装飾（medium）・女神像を切り替えられます。
旧クラシック用の角・辺の画像と描画分岐は削除しました。
「透過確認の背景」で白・黒・市松模様を選択し、「羊皮紙を表示する」をオフにすると枠だけの透過を確認できます。
タイトルバーは左右の装飾を含む一枚の透過PNGで描画します。カタログの「タイトルバーを表示する」で表示を切り替えられます。

```tsx
<InfoWindowWithTabs tabs={tabs} showTitleBar={false} />
```

非表示時もスキンの内容余白とタブ配置は維持します。タイトルバーがない場合、タイトルでのドラッグはできません。
独自画像の指定方法、画像編集時の注意点、生成PNGへのリンクは [装飾スキンの説明](docs/skins.md) を参照してください。

## 構成・移植元

```text
src/components/window/   ウィンドウ（InfoWindow, InfoWindowWithTabs）
src/components/toolbar/  CommandToolbar
src/components/hud/      DateBar
src/components/parts/    小さな部品（Button, Banner, CityNavigator, ChoiceGroup, QuantityInput, KnightCard, FactionMark）
src/navigation/          画面スタック（useScreenStack, ScreenHost）
src/screens/             画面（types.ts にview型、cityCommand/ mapPick/ invasion/）
src/hooks/               内容のサイズ計測
src/assets/ui/           装飾画像・HUD画像・タブアイコン
src/skins.ts             ウィンドウの装飾スキン
src/index.ts             公開API
demo/                    カタログ（catalog.tsx に項目、entries/ に各項目、mock/ に仮データと仮の地図）
tests/                   実ブラウザでのテスト
```

- 参考画像: `norden-strategy/docs/image/exec-0f8f41c4-e9b3-423a-af0d-ce7b8c4f8165.png`
- 移植元: `nordencult-old/src/ui/components/{InfoWindow,InfoWindowWithTabs,CommandToolbar,DateBar}.{tsx,css}`、都市情報ウィンドウはルートの `src/scenes/strategy/CityWindow.tsx`
- 画像: 枠は `src/assets/ui/skins/` の生成PNG3点、タイトルは生成した `info_window_title_full.png` を使用。羊皮紙・タブ画像・アイコン・HUD画像は旧実装から移植。都市画像は `src/assets/map/place_city.webp` からデモ専用にコピー
- ゲームの都市・人物データ、地図処理は含めず、view型として呼び出し側から渡す
- 開発構成: [Viteのライブラリモード](https://vite.dev/guide/build.html#library-mode)
- タブの操作と関連付け: [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)、単一選択: [Radio Group Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)
