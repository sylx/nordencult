# nordencult

ファンタジーSLG nordencult のゲーム本体。各機能はサブモジュールで開発し、このルートでシーンとして組み合わせます。

| サブモジュール | 内容 |
| --- | --- |
| `norden-strategy` | three.js の戦略マップ |
| `norden-ui` | React UI ライブラリ（基本部品・画面・画面スタック。カタログで各画面を作り込む） |
| `norden-battle` | 戦闘。`battle-runtime`（戦闘画面 `BattleScreen`。地形・戦闘記録・行動メニューは norden-ui の部品）・`map-runtime`（HEX マップの描画）・`assets/maps/`（戦闘マップ）を使う |
| `norden-data` | 拠点データ・勢力データ・騎士データ・施設データ・セリフのエディタ（`src/data/`・`src/assets/` などに書き出す。開発時だけ使う） |
| `norden-synth` | BGM。SoundFont から取り出した音色で鳴らすシンセと、LLM が書いた曲（`src/songs/`）。`BgmPlayer` で曲を切り替えて鳴らす |

```sh
git submodule update --init
npm install
npm run dev
```

`npm run build` で型チェックとビルド、`npm run lint` でルートの `src/` を検査します。

main への push で GitHub Pages に公開します（`.github/workflows/deploy.yml`）。CIでは `norden-strategy`・`norden-ui`・`norden-battle`・`norden-synth` のサブモジュールだけを取得してビルドします（`norden-battle` の Git LFS のファイルは取得しません）。

## サブモジュールの参照

`norden-strategy`・`norden-ui`・`norden-battle/battle-runtime`・`norden-battle/map-runtime`・`norden-synth` はビルドせず、ソースを直接読み込みます（`vite.config.ts` のエイリアスと `tsconfig.app.json` の `paths`）。サブモジュールの変更はそのまま開発サーバーに反映されます。

- `import { MapView, CITY_MAP } from 'norden-strategy'` → `norden-strategy/src/index.ts`
- `import { PLACE_POINTS, ROAD_LINKS } from 'norden-strategy/data'` → `norden-strategy/src/data.ts`（データだけ。three.js を読み込まないので `src/game/` はこちらを使う）
- `import { generateWorld, WorldSampler } from 'norden-strategy/world'` → `norden-strategy/src/world.ts`（マクロ地形の生成と読み取り。three.js を読み込まない。街道マップの生成に使う）
- `import { BattleScreen } from '@norden/battle-runtime'` → `norden-battle/battle-runtime/src/index.ts`（戦闘画面。battle-editor と同じもの。中で `norden-ui` と map-runtime を使う）
- `import { MapView } from '@norden/map-runtime/render/mapView'` → `norden-battle/map-runtime/src/render/mapView.ts`（パッケージの `exports` と同じ対応。依存の `simplex-noise` はルートに入れてある）
- `import { BgmPlayer, SONGS } from 'norden-synth'` → `norden-synth/src/index.ts`（BGM の再生と曲の一覧。ルートでは `src/audio/bgm.ts` が初めて鳴らす時に動的 import する）

戦闘マップ（`norden-battle/assets/maps/`）は、map-runtime の Vite プラグイン（`mapsPlugin`、読み取り専用）でページの `maps/` として配信し、ビルドでは `dist/maps/` にコピーします。
BGM の音色（`norden-synth/public/instruments/`、約 9MB）も同様に、norden-synth の Vite プラグイン（`instrumentsPlugin`）でページの `instruments/` として配信し、ビルドでは `dist/instruments/` にコピーします。

街道マップ（`road-<ID>-<ID>.json`）の下書きは、戦略マップの地理情報から生成できます（`scripts/road-maps/`）。戦略マップの地形（`norden-strategy/world`）を map-runtime の `generateGeoRoadMap` で HEX にし、両端の都市を規模と種類に応じたテンプレートの城・砦で置きます。戦闘の範囲・初期配置地点・防衛拠点は仮の値なので、map-editor で手直ししてください。

```sh
npm run road-maps -- P003-P005 P018-P024   # 指定した街道
npm run road-maps                          # まだマップの無い街道すべて
npm run road-maps -- --force P003-P005     # 既存のマップも上書き（手で直した内容は失われる）
```
- `import { CityCommandScreen, ScreenHost } from 'norden-ui'` → `norden-ui/src/index.ts`

公開APIは各 `src/index.ts` にまとめ、ルートから内部のファイルは直接参照しません。
React・React DOM・three はルートの `node_modules` に一本化します（Vite の `resolve.dedupe`。React の型も `tsconfig.app.json` の `paths` でルートのものにそろえます）。サブモジュールの依存とバージョンを揃えてください。
各サブモジュールは従来どおり単体で `npm run dev` できます。地図の描画設定の調整は `norden-strategy` 単体の画面で行います（ルートとはポートが違うため、ブラウザに保存した設定は共有されません）。

## シーン

`src/scenes/` で画面をシーンとして切り替えます。シーンを離れるとアンマウントされ、地図の WebGL 資源なども破棄されます。各シーンは初めて表示する時に読み込みます。

| シーン | 内容 |
| --- | --- |
| `title` | タイトル画面（仮） |
| `strategy` | 戦略マップ＋norden-ui の画面スタック（都市コマンド → 侵攻先の選択 → 侵攻画面、都市コマンド → 移動先の選択 → 移動画面、都市コマンド → 輸送先の選択 → 輸送画面。Escで1段戻る。プレイヤーの勢力が侵攻されると防衛軍団の編成画面 `defense`）。都市をクリックでその都市の都市コマンド画面へ。進行フェーズでは、まず全勢力の移動と輸送が進み（移動パート）、続いて侵攻の軍団が1つずつ進んで（侵攻パート）、到着すると `battle` へ |
| `battle` | 戦闘（`{ battleId }`）。戦闘画面（battle-runtime の `BattleScreen`）、攻守の勢力と騎士、デバッグ用の勝敗ボタンと使ったマップの表示。決着のウィンドウの「戦闘の結果へ」で `battleResult` へ |
| `battleResult` | 戦闘結果（`{ battleId }`）。勝敗と決着の理由（入城・殲滅/退却）・拠点の所属の変化・騎士の移動。「戦略マップへ」で進行フェーズの続きへ |

起動時は `strategy` を表示します。`?scene=title` で開始シーンを指定できます（パラメーターの無いシーンだけ）。`?faction=leonis` のようにプレイヤーの勢力を指定できます（既定はカルタ書院 `carta`）。`?faction=leonis&faction=carta` のように複数指定すると、それぞれの勢力の手番をプレイヤーが操作します（勢力どうしの侵攻の確かめ用）。画面（都市コマンド・勢力の金・行動予約）は手番の勢力のもので、ほかのときは最初に指定した勢力のものです（`viewFaction`）。

シーンの追加:

1. `src/scenes/types.ts` の `SceneParams` に、シーン名と受け取るパラメーターの型を追加（例: `battle: { cityId: string }`）
2. `src/scenes/<name>/` にコンポーネントを作り、`src/scenes/registry.ts` に登録
3. 遷移は `const { goTo } = useScene()` で `goTo('battle', { cityId })`。パラメーターは `props.params` で受け取る

| ファイル | 役割 |
| --- | --- |
| `src/scenes/types.ts` | シーン名とパラメーターの型 |
| `src/scenes/registry.ts` | シーン名とコンポーネントの対応（遅延読み込み） |
| `src/scenes/SceneManager.tsx` | 現在のシーンの表示・切り替え |
| `src/scenes/sceneContext.ts` | `useScene()` |
| `src/scenes/strategy/StrategyScene.tsx` | 地図と画面スタック（`cityCommand` / `pickTarget` / `invasion` / `pickMoveTarget` / `move` / `pickTransportTarget` / `transport` / `domestic`）。地図の強調は表示中の画面（`nav.top`）から決める。進行フェーズの移動と輸送の演出（`movementLegs` を地図の `march()` で動かし、着いたら `runMovements`） |
| `src/scenes/strategy/views.ts` | ゲームの状態 → norden-ui のview型（`CityView`・`KnightView`・`TurnView`・`BuildingView`）。施設の画像は `src/assets/buildings.webp` 上の位置（`buildingSprite.json`）で渡す |
| `src/scenes/strategy/OrderList.tsx` | 行動予約（侵攻予約・移動予約・輸送予約・移動中と輸送中の騎士）と進行フェーズの一覧。norden-ui の `ActionOrders` に渡す（都市コマンド画面に重ねるHUD） |
| `src/scenes/battle/BattleScene.tsx` | 戦闘マップを読み込み、battle-runtime の `BattleScreen` に渡す（アンマウントで破棄）。ユニットはまだ置かない（置くときはマップの `units` と `statuses` で渡す）。退却先の拠点（`retreatCities`）を軍ごとに渡し、退却した・捕虜になった部隊（`RetreatReport`）を `BattleRetreat`（退却したときの兵数を含む）に、決着のときに戦場に残っていた部隊（`BattleOutcome.remaining`）を `BattleSurvivor` にして、決着（`onEnd`）またはデバッグの勝敗のボタンで `resolveBattle` に渡し、結果の画面へ進む |
| `src/scenes/battle/battleMap.ts` | 戦闘マップの選択。攻撃元と目標の街道マップ `road-<小さい ID>-<大きい ID>.json` から目標の範囲（`battleAreas[目標]`）を切り出す。無ければ `fluen.json` 全体（コンソールに警告） |

## BGM

シーンごとの曲は `src/audio/sceneBgm.ts` の `SCENE_BGM` で決めます（値は norden-synth の曲 id）。シーンが切り替わると `SceneManager` がその曲にクロスフェードします。`null` は無音にフェードアウト、`undefined` は鳴っている曲のままです。

| シーン | 曲 |
| --- | --- |
| `title` | 『霧の巡礼』`mist-pilgrim` |
| `strategy` | 『雪原の評議』`winter-council` |
| `battle` | 『鬨の声』`battle-cry` |
| `battleResult` | 戦闘の曲のまま |

再生は `src/audio/bgm.ts`（`playBgm(songId)`。プレイヤーは `getBgm()` で 1 つだけ作る）。ブラウザの自動再生制限があるので、最初のクリックかキー入力までは音が出ません。タブが裏に回るか、ウィンドウのフォーカスが外れている間は一時停止し、戻ると続きから鳴ります。音量とリバーブはシンセの既定値（`DEFAULT_MIX`）です。曲を書く・聴くのは norden-synth 単体のテストページ（`cd norden-synth && npm run dev`）で行います。

BGM と効果音の音量（0〜1）は `src/audio/volume.ts` が持ち、ブラウザに保存します（`localStorage` の `nordencult:volume`）。戦略画面の右上の設定（ターン情報の歯車）と、タイトルの「設定」で変えられます（`src/components/SoundSettings.tsx`。norden-ui の `VolumeSlider`・`SettingsDialog`）。スライダーの値は 2 乗して音量の倍率にします（`volumeGain`。中央で約 -12dB）。効果音は `getVolumes().se` の音量で鳴らします。

## 効果音

効果音のエンジンはルートの `src/audio/se.ts` の 1 つだけです。norden-ui と norden-battle は鳴らす効果音の名前を伝えるだけで、音を鳴らす処理は持ちません。

- 音のファイルは `src/assets/se/<名前>.ogg`（`.mp3`・`.wav` も可）に置きます。置くだけで読み込まれます（`import.meta.glob`）。名前と鳴る場面の一覧は `src/assets/se/README.md`
- `src/main.tsx` の `installSe()` が、norden-ui の `setSoundPlayer` に `playSe` を渡します。norden-ui・norden-battle の中から `playSound('名前')` を呼ぶと、ここで鳴ります。プレイヤーを渡していない所（norden-ui のカタログ、battle-editor）では鳴りません
- UI のクリック音は norden-ui の `installClickSound()` が鳴らします。ボタン・タブ・選択肢・チェックボックス（無効のものは除く）のクリックを document でまとめて拾い、`click` を鳴らします。各部品に音の処理は要りません。`data-sound="名前"` で別の音、`data-sound="none"` で無音にできます（ボタン以外の要素も `data-sound` を付けると鳴ります）
- AudioContext は BGM とは別です。最初のクリックかキー入力で作り、その時にすべての効果音を読み込みます。音量は設定の効果音（`getVolumes().se`）で、変えるとすぐに反映します

## ゲームの状態

`src/game/` にゲームの状態（ターン・フェーズ・都市の所属・都市の状態・勢力の金・キャラクターの所属・侵攻予約・移動予約・輸送予約と移動中の騎士・行軍・直近の戦闘と内政処理）と、それを変える純粋な関数（状態 → 新しい状態）をまとめます。React と地図からは独立しています。

| ファイル | 役割 |
| --- | --- |
| `src/game/types.ts` | `GameState` などの型 |
| `src/game/setup.ts` | 初期状態（都市・キャラクターの初期配置）、`?faction=` の読み取り（`readPlayerFactions`） |
| `src/game/queries.ts` | 状態の問い合わせ（国力と手番の順・プレイヤーの勢力・都市の騎士・侵攻先・予約の条件・残りの兵・戦闘からの退却先） |
| `src/game/army.ts` | 兵の仮の規則（1部隊の兵数の上限・既定の兵科・間接指揮部隊は軍団長の能力の半分・練度の加重平均） |
| `src/game/actions.ts` | 予約の追加・取消、手番の終了、侵攻パートの次の侵攻（`startNextBattle`。その前に移動パートを済ませる）・侵攻の継続の判断（`decideInvasion`）・自勢力の都市への入城（`finishEntry`）、`resolveBattle`（戦後処理）、次のターンの開始（内政処理を含む） |
| `src/game/movement.ts` | 移動と輸送: 経路（`moveRoute`）と月数（`moveMonths`）、行き先（`moveTargets`）、予約の追加・取消と条件、進行フェーズの移動と輸送（`runMovements`）とその演出用の1ヶ月分の道のり（`movementLegs`） |
| `src/game/economy/balance.ts` | 内政の定数（金・俸禄・Tier の閾値とスロット・領主の補正・担当官の予算と係数・人口の成長・募兵・出撃の費用）。すべて仮の値 |
| `src/game/economy/output.ts` | `cityOutput`: 都市の Tier・スロット・実効の商業と生産・領主と施設の補正・担当官の能力と次のターンの見込み・収入・成長・訓練・募兵の上限（内政処理と画面の見込みで共有） |
| `src/game/economy/runEconomy.ts` | `runEconomy`: 毎ターンの内政処理（金と俸禄 → 担当官の内政 → 物資と建設 → 練度と募兵 → 人口と Tier）と、演出用の結果 `lastEconomy` |
| `src/game/economy/domestic.ts` | 内政の操作（担当の割り当て・解除、担当官の予算、着工・中止、募兵）と、できない理由を返す `…Problem` |
| `src/game/store.ts`, `gameContext.ts` | `App` に置くストアと `useGame()`（シーンを切り替えても状態が残る） |
| `src/game/world.ts` | 都市・勢力・街道のつながり（`ROAD_LINKS` から） |

シーンからは `const { state, update } = useGame()` で読み、`update((s) => addOrder(s, draft))` のように変えます。規則に反する操作は `GameRuleError` を投げます。

侵攻予約は騎士ごとの兵科と兵数（`InvasionOrder.units`）を持ちます。予約できる兵数は出発する都市の兵数（`CityState.troops`）のうち、このターンにまだ予約していない分です。1部隊の兵数は騎士・間接指揮部隊とも一律1000まで（`MAX_SOLDIERS`）、兵科の既定は種別から決めます（`src/data/unitTypes.ts`）。

### 手番と進行フェーズ

勢力は国力（都市の人口の合計。`factionPower`）の高い順に戦略フェーズを行います（同じ値なら勢力データの並び順。`turnOrder`）。全勢力の戦略フェーズが終わると進行フェーズに入り、次の順に解決します（`GameState.march`）。

1. 移動パート: 全勢力の移動と輸送を同時に1ヶ月分進めます（`runMovements`）。カットインなどの演出は入りません
2. 侵攻パート: 侵攻予約を、勢力順（国力の高い順。進行フェーズに入った時点）→ 予約順（先に予約したものが先）に1つずつ解決します（`MarchState.queue`）。同じ拠点に「同時に」別の軍団が攻め込むことはありません

侵攻パートの規則（`startNextBattle`）:

- 出発した都市が奪われている・騎士がいない侵攻は取りやめ、騎士はそのままです
- 拠点に侵攻の戦闘が始まると、その拠点から出る侵攻でまだ解決していないものは取り消されます。その軍団の騎士は拠点にいたことになり、防衛に加わります
- 侵攻パートで先に別の勢力が奪った拠点への侵攻は、プレイヤーの勢力なら続けるかどうかを選びます（`MarchState.decision`、確認のダイアログ → `decideInvasion`。外交関係を考えて中止できる）。中止すると騎士は出発した都市に残ります。プレイヤーの勢力でなければそのまま続けます
- 侵攻パートで先に自勢力の別の軍団が奪った拠点への侵攻は、戦闘をせず、移動と同じく軍団の騎士がその拠点に入ります（`MarchState.entry`、地図で行軍を見せたあと `finishEntry`）。拠点の領主は変わりません（出発した都市の領主が加わっていれば、出発したときに後任が決まるのは侵攻と同じ）
- 同じ勢力が同じ拠点に、別々の都市から侵攻を予約できます（同じ都市からは1つだけ）

### 勢力の滅亡とイベント通知

- すべての拠点を失った勢力は滅亡し、その勢力の騎士はすべて在野（`cityId`・`factionId` とも null）になります。移動・輸送中の騎士も同じで、その移動は消えます（`resolveBattle` の最後で `destroyFaction`）。捕らえられているその勢力の騎士は、所属なし（`factionId` が null）の捕虜のままで、もう脱走しません。その勢力が移動・輸送で連れていた捕虜は、その場で解放されます（脱走と同じく自勢力の最も近い拠点へ。勢力が無ければ在野）
- 滅亡はイベント（`GameState.events` の `FactionDestroyed`: 最後の拠点・攻め落とした勢力・在野になった騎士）として残り、戦略画面に戻ったところで、カットイン `faction_destruction`（文字は「〇〇滅亡」と日付）のあとに汎用のイベント通知（norden-ui の `EventScreen`。カット画像とその下のメッセージウィンドウ）を出します。閉じると `dismissEvent` で消え、進行フェーズはイベントが無くなるまで先へ進みません。通知の中身は `views.ts` の `eventView`

### 兵の出入りと防衛軍団

- 侵攻軍の兵は、出発したとき（その侵攻の戦闘が始まるとき）に出発した都市の兵から引かれます（その時点で都市に残る兵まで。部隊の順に割り当て、兵の付かなかった騎士は出撃しない）。先に自勢力が奪った拠点へ入城する軍団の兵は、入城した拠点の兵に加わります
- 拠点の領主がいない（領主が移動・輸送で出ている場合を含む。中立の拠点には領主がいない）か兵が0なら、戦闘は行われず侵攻側の勝利です（`Battle.undefended`。地図で行軍を見せたあと、そのまま結果の画面へ）。拠点の兵と物資は侵攻側のものになり、侵攻軍の兵が加わります。拠点にいた防衛側の騎士は全員捕縛され、その拠点の捕虜になります（結果の `BattleReport.captives`。捕虜を参照）
- 侵攻された拠点は防衛軍団を編成し、その兵が拠点の兵から引かれます。プレイヤーの勢力でなければ自動で編成します（`defenderArmy`: 格の高い騎士から6人まで、兵を均等に割る）。プレイヤーの勢力なら、侵攻軍が着いたところで防衛軍団の編成画面（norden-ui の `InvasionScreen` の `mode="defense"`。Esc・やめる・閉じるで戻れない）に入り、確定で戦闘へ進みます（`Battle.pendingDefense` → `formDefense`。条件は侵攻と同じで `defenseProblem`。選べる騎士は `defenseKnights`）。編成に入らなかった騎士は戦場に出ず、拠点を奪われると防衛軍団の騎士と同じく退却します
- 戦闘の後、退却した部隊の兵はその退却先の拠点に加わります（捕虜になった部隊の兵は失われる）。戦場に残った部隊（battle-runtime の `BattleOutcome.remaining` → `BattleSurvivor`）の兵は騎士と同じ所へ行きます: 勝った側は戦った拠点へ（侵攻側なら、防衛軍団に割かれなかった兵＋侵攻軍の残りの兵になる）、負けた侵攻側は出発した都市へ、負けた防衛側は退却先へ（無ければ失われる）。デバッグの勝敗のボタンで決めたときは、退却・殲滅していない部隊が編成したときの兵数のまま残ったものとします。加わる兵の練度は兵数で加重平均します。結果画面の「兵」に、拠点ごとに加わった兵（`BattleReport.soldiers`）を出します

### 移動

軍事 → 移動で、自勢力の都市から騎士（複数）を自勢力のほかの都市へ移します。地図で移動先（自勢力のすべての都市。隣接していなくてよい）を選び、移動画面（norden-ui の `MoveScreen`）で騎士と、持っていく兵数・物資を決めて予約します（`addMoveOrder`。予約は手番のうちなら取り消せる）。騎士は着いた都市の所属になります。

- 経路は街道の最短経路で、なるべく自勢力の都市だけを通ります（通れなければ他勢力の都市も通る。`moveRoute`）。兵と物資を連れた移動は街道1区間に半月（1ヶ月に2区間。`MOVE_HOPS_PER_MONTH`）かかり、移動画面に月数を出します
- 単騎移動（`MoveOrder.solo`）は兵と物資を運ばない代わりに、どれだけ遠くても2ヶ月以内に着きます（1ヶ月に2区間進み、最長2ヶ月）（`SOLO_HOPS_PER_MONTH`・`SOLO_MAX_MONTHS`）
- 進行フェーズ（旧称: 行軍フェーズ。状態の `phase` は `'march'` のまま）の初めに、全勢力の移動をまとめて1ヶ月分進めます（`runMovements`）。その月に予約した移動はここで出発し、騎士は担当（領主・内政担当官）を離れ、兵と物資が都市から引かれます。領主が移動するときは、予約した時点では領主のままで、出発したときに後任が決まります。後任は、その都市に残る騎士（移動中・移動で出発する騎士と侵攻予約中の騎士を除く。輸送中の騎士はよい）のうち政治がいちばん高い騎士で、同じ値ならランダムです。該当する騎士がいなければ領主は不在になります（`successorLord`）。侵攻も同じで、領主が侵攻に加わると、その軍団が出発したとき（進行フェーズでその侵攻の戦闘が始まるとき）に後任が決まります（軍団の騎士とこれから戦う侵攻の騎士を除く）。勝っても負けても元の領主には戻りません移動中の騎士は着くまで出発した都市の所属のままで（`CharacterState.cityId` は出発した都市。`GameState.movements` に経路の残りと残りの月数）、都市の騎士一覧には残りますが、「移動中」と出て侵攻・移動・輸送・内政の担当に選べず、その都市の防衛にも加わりません（`movementOf`・`awayReason`・`stationedIn`）。出発した都市が奪われると、その都市の所属から外れ（`cityId` が null）、そのまま行き先へ向かいます。着いた移動は、騎士がその都市に入り、兵（練度は兵数で加重平均）と物資がその都市に加わります
- 移動は侵攻の戦闘より先に済ませるので、その月に着く騎士は着いた都市の防衛戦闘に加わります
- 君主（勢力の当主。`isPatriarch`）が移動で着いた都市では、君主がその都市の領主に代わります（元の領主はただの騎士に。輸送・帰還・侵攻からの入城では変わりません）。退却したとき（戦場から退却した先の都市・奪われた拠点から落ち延びた先の都市）と、侵攻に負けて出撃元へ戻ったとき（退却したかどうかによらない）も同じで、結果画面の「領主の任命」に出ます。君主でない領主は、侵攻から戻っても領主に戻りません
- 行動予約のウィンドウ（右上。norden-ui の `ActionOrders`）に、侵攻予約（侵攻元 → 侵攻先、軍団長 以下N名、取消）と移動予約（移動元 → 移動先、担当の騎士、取消）を並べます。月をまたいで移動中のものは出発した拠点から書き、取消の代わりに残りの月数を出します
- 移動先の都市が奪われていたら、いまいる場所からいちばん近い自勢力の都市へ向かい直します。勢力の都市が無くなれば騎士は在野になり、兵と物資は失われます
- 地図では、進行フェーズに全勢力の移動の1ヶ月分の道のりを移動のマーカーで見せます（兵と物資を連れた移動は侵攻と同じ軍団のマーカー、単騎移動は使者のマーカー）。行動予約のウィンドウで予約を押すと、その予約の経路（侵攻は侵攻先への街道、移動は残りの経路）だけを街道の強調で出します（ほかの場所を押すと消える）。侵攻・移動・輸送とも、出発地と行き先の両方が入るようにカメラを寄せます（norden-strategy の `focusPlaces`）。左の都市情報ウィンドウと右の行動予約に隠れないよう、左360px・右200pxを除いた範囲に収めます（`FOCUS_INSET`。margin は既定の3）。街道の強調の色は勢力によらず、移動は青、侵攻は赤です（地図上を動くマーカーは勢力の色）

### 輸送

軍事 → 輸送で、自勢力の都市から兵と物資を自勢力のほかの都市へ運びます。地図で輸送先（自勢力のすべての都市。隣接していなくてよい）を選び、輸送画面（norden-ui の `TransportScreen`）で担当の騎士1人と、運ぶ兵数・物資を決めて予約します（`addTransportOrder`。予約は手番のうちなら取り消せる）。

- 経路と月数は兵と物資を連れた移動と同じです（街道1区間に半月。隣接か2区間先なら1ヶ月、3区間なら2ヶ月）。進行フェーズに移動と一緒に出発・前進し（`GameState.movements` の `kind: 'transport'`）、担当の騎士は担当（領主・内政担当官）を離れません（領主が輸送に出ても領主のまま）。騎士は戻るまで出発した都市の所属のままで、騎士一覧には「輸送中」と出て選べません（移動中の騎士と同じ）
- 着くと兵（練度は兵数で加重平均）と物資をその都市に下ろし、騎士はその都市に入らず、翌月から単騎移動と同じ月数で出発した都市へ戻ります（`kind: 'return'`）。輸送先や戻り先の都市が奪われていたら、移動と同じくいちばん近い自勢力の都市へ向かい直します
- 地図では、輸送中は輸送のマーカー、戻りは使者のマーカーで動きます。街道と都市の強調の色は金色です
- 行動予約のウィンドウに、輸送予約（輸送元 → 輸送先、担当の騎士、取消）を並べます。月をまたいだものは取消の代わりに残りの月数を出し、戻りは「輸送先 → 輸送元」と「帰還・あとNヶ月」を出します
- 繰り返し輸送（兵と物資が指定の量になるまで待って自動で輸送を続ける）は未実装で、輸送画面のチェックボックスは無効です

### 捕虜

騎士には捕虜のフラグ（`CharacterState.prisoner`）があり、立っていればその騎士は `cityId` の拠点に捕らえられている捕虜です。`factionId` は捕まる前に仕えていた勢力のままです（`src/game/prisoners.ts`）。

- 捕虜は拠点の騎士に数えません（`charactersIn`・`stationedIn` に入らない。拠点の捕虜は `prisonersIn`）。侵攻・移動・輸送・内政の担当に選べず、防衛にも加わらず、俸禄も払われません。都市情報の「騎士」タブの末尾に、区切りのあとに捕虜の一覧（仕えていた勢力つき）を出します（norden-ui の `CityView.prisoners`）
- 戦闘で捕縛された騎士（退却に失敗・殲滅されて捕縛・戦闘なしで奪われた拠点にいた）は、捕らえた陣営が勝てばその捕虜になり、戦った拠点に置かれます。結果画面の「捕虜」に、どこで捕虜になったかを出します（`BattleReport.prisoners`）。捕らえた陣営が負けると捕縛は無効になり、騎士は元いた拠点に帰ります（侵攻側の騎士は出撃元へ帰還し、結果画面の「帰還」に出る。防衛側の騎士はそのまま守った拠点に残る）
- 拠点を奪うと、そこに捕らえられていた自勢力の騎士は解放され、そのままその拠点に仕えます（結果画面の「捕虜の解放」。`BattleReport.freed`）。ほかの勢力の捕虜は、奪った勢力の捕虜になります
- 脱走: 進行フェーズに入るとき（`endFactionTurn` で最後の勢力の戦略フェーズが終わったとき。移動パートの演出より前）に、捕虜ごとに（武力・知力の高い方）× 0.01 × 25%（`ESCAPE_RATE`）の確率で脱走します（武力か知力が100なら25%）。移動・輸送で移送中の捕虜は2倍です（`ESCAPE_RATE_MOVING`）。仕えていた勢力が滅亡している（拠点が無い）捕虜は脱走しません（`escapeChance`・`runEscapes`）
- 脱走した捕虜は、いる場所（移送中ならその時点の位置）から、仕えていた勢力の最も近い拠点へ単騎移動と同じ速さで向かいます（`Movement` の `kind: 'escape'`。着くまでどこにも仕えない。地図では使者のマーカー、行動予約には「脱走中」）。君主が脱走して着いた拠点では、移動と同じく君主が領主になります
- 移送: 移動と輸送で、兵・物資と同じく拠点の捕虜を連れて行けます（`MoveOrder.prisoners`・`TransportOrder.prisoners`。移動画面・輸送画面で複数選ぶ。単騎移動では連れて行けない）。着くまでは出発した拠点の捕虜のままで、着いた拠点（輸送は荷を下ろす拠点）の捕虜になります。出発した拠点が奪われても移送はそのまま続きます
- 初期の捕虜は `characterStart.json` の `isPrisoner`（norden-data の騎士データの初期配置で「都市の捕虜」）。勢力（`factionId`）は捕まる前に仕えていた勢力で、省略すると所属なしです。都市の勢力の騎士・中立の都市の騎士は捕虜になりません

### 内政

都市の状態（`GameState.cities` の `CityState`: 人口・基礎の商業と生産・備蓄物資・兵数・練度・施設・建設中・担当・担当官の予算）と勢力の金（`GameState.gold`）を持ちます。都市のマスターデータ（`src/data/city.ts`）は初期値（基礎の商業・生産を含む）だけを持ちます。Tier と施設のスロット数は人口から求めます（`tierOf`・`slotsOf`）。規模の表示（Tier 1 は小さな町、Tier 2 は大きな街、Tier 3 は大都市）と地図の絵も Tier に合わせて変わります。聖地・要塞（拠点データの `image`）は規模と絵が変わらず、施設のスロットは Tier によらず `FIXED_SLOTS`（4）です。

- 担当: 領主（1人。`commandRank` の「領主」）と内政担当官（商業・生産・訓練・募兵にそれぞれ2人まで。能力は役職ごとの重みで平均し、2人なら合算する。領主は担当官になれない）。初期の領主は `characterStart.json` の `isLord` の騎士。騎士が都市を離れると担当から外れ、攻め落とされた都市の担当は空になります
- 毎ターンの内政処理（`runEconomy`）は、進行フェーズを解決しきって次のターンの戦略フェーズに入る直前に、全勢力の全都市をまとめて行います。領主の能力で商業・生産が伸びます（実効値への補正）。人口は、担当官が上げたあとの基礎の商業・生産、建っている施設の数、領主の政治と魅力から伸び（`populationGrowth`。係数は `balance.ts` の `POP_GROWTH_*`）、Tier と施設のスロットも人口に応じて上がります（10000 で Tier 2、30000 で Tier 3）。商業・生産・募兵の担当官は、都市が役職ごとに割り当てた予算（`CityState.affairsBudget`。1000まで。割り当てたときに国庫から移し、減らすと戻る。`setAffairsBudget`）から毎ターン 80〜150 の乱数の金を使い、商業・生産の基礎値を上げ（政治2・知力1）、兵を集めます（魅力3・武力1。新兵の練度で混ざる）。訓練担当官は金を使わずに練度を上げます（武力2・統率1）。式と係数は `balance.ts` の `AFFAIRS_*`・`GROWTH_COEF_*`。施設の効果でも各値が伸びます
- 施設のマスターデータは `src/data/buildingData.json`（`src/data/buildings.ts`）。1都市に同じ施設は1つ、建設中は1件だけで、建設中は都市の生産をすべて建設に回します

戦闘からの退却: 戦闘画面では、部隊は戦場の拠点に街道でつながる自勢力の拠点（`retreatCities`。攻撃側には出撃元も入る）へ退却でき、隣接する敵の数に応じて失敗すると捕虜になります。戦闘画面は結果を部隊ごとに知らせ（battle-runtime の `RetreatReport`）、戦闘シーンが `BattleRetreat`（陣営・騎士・退却先・捕虜になったか）にして `resolveBattle` に渡します。退却した騎士は勝敗に関わらず選んだ拠点へ移り、捕虜になった騎士は相手の陣営の捕虜になります（捕虜を参照。戦闘の結果は `BattleReport.retreats`）。いまの戦闘の部隊は騎士と結び付いていない仮の部隊なので、騎士は null になります（部隊の ID を騎士の ID で作れば結び付きます）。

殲滅されたときの捕縛: 兵数が 0 になった部隊の指揮官は、隣接する敵の数に応じて捕縛され捕虜になります（0: 10%・1: 30%・2: 50%・3 以上: 75%）。戦闘画面は結果を部隊ごとに知らせ（battle-runtime の `WipeoutReport`）、戦闘シーンが `BattleWipeout`（陣営・騎士・捕虜になったか）にして `resolveBattle` の最後の引数に渡します。捕縛された騎士は退却に失敗した騎士と同じく相手の陣営の捕虜になります（戦闘の結果は `BattleReport.wipeouts`）。捕縛されなかった騎士は落ち延びて、陣営のほかの騎士と同じに扱います。

戦闘の決着: 戦闘画面（battle-runtime の `victory.ts`）は、どちらかの陣営の部隊がすべて殲滅・退却（捕虜を含む）するか、攻撃側のユニットが防衛拠点（街道マップの `strongholds[防衛する都市]`。map-editor の「防衛拠点」で置く。城の中心部の HEX）で行動を終える（もう行動できなくなる・拠点にいるまま番を終える。入城）と決着し、カットインと決着のウィンドウを出します。カットインはプレイヤーの勢力が勝てば勝利（norden-ui の `battle-win`）、負ければ敗北（`battle-lose`）で、プレイヤーの勢力がいない戦闘では勝利です（`playerSide`。文字はテンプレートのまま）。そのボタン「戦闘の結果へ」で、戦闘シーンが勝った陣営・退却の結果・決着の理由（`BattleEndReason`）を `resolveBattle` に渡して結果の画面へ進みます（理由は `BattleReport.reason`。デバッグのボタンで決めたときは null）。防衛拠点の無い戦場は入城では決着しません。

拠点の初期データ（人口・商業・生産・初期の所属・固定の絵。省略可能な初期の備蓄・兵数・練度・施設）は `src/data/cityData.json`（`src/data/city.ts`）です。地図はゲームから渡された都市（名前・絵・所属。`views.ts` の `mapCities` を `MapView` の `cities` に渡す）を、`norden-strategy` の `PLACE_POSITIONS` の位置に描きます。地図に都市の写しはありません。拠点を増やしたら、`PLACE_POSITIONS` に位置を足してください（無いと `src/data/city.test.ts` が落ちます）。

勢力のマスターデータ（名前・紋章・当主の呼び名・色・初期の金）は `src/data/factionData.json`（`src/data/faction.ts`）です。一覧の順が国力の同じ勢力の手番の順で、初期の金を省略した勢力は `INITIAL_GOLD`（`src/game/economy/balance.ts`）で始まります。地図の紋章は `norden-strategy` の `FACTION_LIST`（ID・名前・紋章だけの写し）を使います。食い違うと `src/data/faction.test.ts` が落ちるので、勢力の ID・名前・紋章・並び順を変えたら写しも直してください。紋章の画像は `norden-strategy/data` の `emblemImage`（番号で引く）です。

施設のマスターデータは `src/data/buildingData.json`（`src/data/buildings.ts`）、画像は全施設を並べた `src/assets/buildings.webp`（大きさは `src/data/buildingSprite.json`）です。どれも norden-data の「ゲームに書き出す」で作ります。

キャラクターのマスターデータは `src/data/characterData.json`、初期配置は `src/data/characterStart.json`、顔・全身の画像は `src/components/CharacterImage.tsx`（`src/assets/character.webp` のスプライト。大きさは `src/data/characterSprite.json`）です。

これらのデータは `norden-data` のエディタで編集します（`cd norden-data && npm install && npm run dev`）。拠点データ・施設データはエディタが直接読み書きし（施設の画像は元画像から切り抜いて書き出す）、キャラクターのデータは `norden-data/characters/characters.json` から書き出します。

`npm test` で `src/` の単体テスト（Vitest）を実行します。

## マイルストーン

作業の目標とTODOは `docs/milestones/` にまとめます。

| ファイル | 内容 |
| --- | --- |
| [m001.md](docs/milestones/m001.md) | プレイヤーの侵攻（ターン・侵攻予約・行軍・戦闘シーン・結果の反映） |
| [m002.md](docs/milestones/m002.md) | 内政（都市の状態・担当・施設・毎ターンの内政処理・成長の演出） |
