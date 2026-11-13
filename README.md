# nordencult

ファンタジーSLG nordencult のゲーム本体。各機能はサブモジュールで開発し、このルートでシーンとして組み合わせます。

| サブモジュール | 内容 |
| --- | --- |
| `norden-strategy` | three.js の戦略マップ |
| `norden-ui` | React UI ライブラリ（基本部品・画面・画面スタック。カタログで各画面を作り込む） |
| `norden-battle` | 戦闘。`battle-runtime`（戦闘画面 `BattleScreen`。地形・戦闘記録・行動メニューは norden-ui の部品）・`map-runtime`（HEX マップの描画）・`assets/maps/`（戦闘マップ）を使う |
| `norden-data` | 拠点データ・勢力データ・騎士データ・施設データ・技術データ・セリフのエディタ（`src/data/`・`src/assets/` などに書き出す。開発時だけ使う） |
| `norden-dialogue` | 会話システム。台本（JSON）と流れ（TypeScript）で書く会話シーンの再生の仕組み（`src/`）と、台本のエディタ（`npm run dev`。ルートの `src/dialogue/` を読み書きする。開発時だけ使う） |
| `norden-synth` | BGM。SoundFont から取り出した音色で鳴らすシンセと、LLM が書いた曲（`src/songs/`）。`BgmPlayer` で曲を切り替えて鳴らす |

```sh
git submodule update --init
npm install
npm run dev
```

`npm run build` で型チェックとビルド、`npm run lint` でルートの `src/` を検査します。

main への push で GitHub Pages に公開します（`.github/workflows/deploy.yml`）。CIでは `norden-strategy`・`norden-ui`・`norden-battle`・`norden-synth` のサブモジュールだけを取得してビルドします。

## サブモジュールの参照

`norden-strategy`・`norden-ui`・`norden-battle/battle-runtime`・`norden-battle/map-runtime`・`norden-synth`・`norden-dialogue` はビルドせず、ソースを直接読み込みます（`vite.config.ts` のエイリアスと `tsconfig.app.json` の `paths`）。サブモジュールの変更はそのまま開発サーバーに反映されます。

- `import { MapView, CITY_MAP } from 'norden-strategy'` → `norden-strategy/src/index.ts`
- `import { PLACE_POINTS, ROAD_LINKS } from 'norden-strategy/data'` → `norden-strategy/src/data.ts`（データだけ。three.js を読み込まないので `src/game/` はこちらを使う）
- `import { generateWorld, WorldSampler } from 'norden-strategy/world'` → `norden-strategy/src/world.ts`（マクロ地形の生成と読み取り。three.js を読み込まない。街道マップの生成に使う）
- `import { BattleScreen } from '@norden/battle-runtime'` → `norden-battle/battle-runtime/src/index.ts`（戦闘画面。battle-editor と同じもの。中で `norden-ui` と map-runtime を使う）
- `import { cpuPlayer } from '@norden/battle-runtime/cpu'`・`'@norden/battle-runtime/engine'`・`'@norden/battle-runtime/rules'` → `norden-battle/battle-runtime/src/cpu/index.ts`・`src/engine/index.ts`・`src/rules.ts`（CPU の思考・戦闘のルールの処理・ルールの値。three.js を読み込まない。描画なしで戦闘を決着させるのに使う）
- `import { MapView } from '@norden/map-runtime/render/mapView'` → `norden-battle/map-runtime/src/render/mapView.ts`（パッケージの `exports` と同じ対応。依存の `simplex-noise` はルートに入れてある）
- `import { DialogueView, runScene } from 'norden-dialogue'` → `norden-dialogue/src/index.ts`（会話シーンの再生。ゲームの状態は知らず、騎士・背景・音はルートが渡す）
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
| `battle` | 戦闘（`{ battleId }`）。戦闘画面（battle-runtime の `BattleScreen`）、攻守の勢力と騎士、デバッグ用の勝敗ボタンと使ったマップの表示。プレイヤーの勢力でない陣営は CPU が戦う。左上の「設定」で設定ウィンドウ。決着のウィンドウの「戦闘の結果へ」で `battleResult` へ。CPU の勢力どうしの戦闘は、設定で観戦しないなら戦闘画面を出さずに決着させて `battleResult` へ |
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
| `src/scenes/strategy/views.ts` | ゲームの状態 → norden-ui のview型（`CityView`・`KnightView`・`TurnView`・`BuildingView`・`TechTreeView`）。施設・技術の画像は `src/assets/buildings.webp`・`techs.webp` 上の位置（`buildingSprite.json`・`techSprite.json`）で渡す |
| `src/scenes/strategy/OrderList.tsx` | 行動予約（侵攻予約・移動予約・輸送予約・移動中と輸送中の騎士）と進行フェーズの一覧。norden-ui の `ActionOrders` に渡す（都市コマンド画面に重ねるHUD） |
| `src/scenes/battle/BattleScene.tsx` | 戦闘マップを読み込み、battle-runtime の `BattleScreen` に渡す（アンマウントで破棄）。ユニットはまだ置かない（置くときはマップの `units` と `statuses` で渡す）。退却先の拠点（`retreatCities`）を軍ごとに渡し、退却した・捕虜になった部隊（`RetreatReport`）を `BattleRetreat`（退却したときの兵数を含む）に、決着のときに戦場に残っていた部隊（`BattleOutcome.remaining`）を `BattleSurvivor` にして、決着（`onEnd`）またはデバッグの勝敗のボタンで `resolveBattle` に渡し、結果の画面へ進む。プレイヤーの勢力でない陣営に CPU の打ち手（`cpuPlayer`）を、設定の演出の速度を `speed` に渡す |
| `src/scenes/battle/autoBattle.ts` | 描画なしの戦闘（CPU の勢力どうしで観戦しないとき）。戦闘マップと部隊から engine の戦闘の状態を作って両軍を CPU の配備で置き（`setupAutoBattle`。初期配置地点が無ければ null で、戦闘画面で戦う）、番ごとにページに処理を返しながら決着まで戦わせ（`runAutoBattle`。上限 30 ターンで、決着しなければ防衛側の勝ち）、戦闘画面と同じ退却・殲滅・残った部隊を返す |
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

BGM と効果音の音量（0〜1）は `src/audio/volume.ts` が持ち、ブラウザに保存します（`localStorage` の `nordencult:volume`）。設定ウィンドウ（下記）で変えられます。スライダーの値は 2 乗して音量の倍率にします（`volumeGain`。中央で約 -12dB）。効果音は `getVolumes().se` の音量で鳴らします。

戦闘の設定（`src/settings/battleSettings.ts`。`localStorage` の `nordencult:battle`）: 戦闘難易度（CPU の軍の考え方。易しい・普通・難しい。CPU 側の数値は変えない）・戦闘の速度（演出の速さ ×1・×2・×3。プレイヤーの行動にも効き、戦闘の途中でも変わる）・CPU同士の戦闘（観戦する／結果だけ）。設定ウィンドウで変えられます。戦闘難易度はプレイヤーと戦う CPU の軍に効き、CPU の勢力どうしの戦闘は世界の進み方が設定で変わらないように「普通」（`CPU_BATTLE_DIFFICULTY`）で戦います。部隊を率いる騎士の性格（`personality` の猛進・慎重・勇敢・実利。間接の部隊は軍団長の）を部隊に渡し、CPU の手の好みが変わります（`battleTroops.ts`）。

設定ウィンドウ（`src/components/GameSettingsWindow.tsx`。norden-ui の `SettingsWindow`）は、タイトルの「設定」・戦略画面の右上（ターン情報の歯車）・戦闘画面の左上の「設定」で、シーンの中央にマスクを敷いて開きます。項目は見出しごとに、サウンド（BGM・効果音）・戦闘（難易度・戦闘の速度・CPU同士の戦闘）。戦略画面ではさらにゲーム（プレイヤーの勢力）と画面（UIの配置の初期化）が付きます。戦闘画面の CPU同士の戦闘は次の戦闘から効きます。

BGM の音量を 0 にすると、シンセの処理を AudioContext ごと止めます（曲の位置も止まり、戻すと続きから鳴ります）。起動したときから 0 なら norden-synth と音色を読み込まず、音量を上げた時に読み込んで、その時のシーンの曲を鳴らします。

## 効果音

効果音のエンジンはルートの `src/audio/se.ts` の 1 つだけです。norden-ui と norden-battle は鳴らす効果音の名前を伝えるだけで、音を鳴らす処理は持ちません。

- 音のファイルは `src/assets/se/<名前>.ogg`（`.mp3`・`.wav` も可）に置きます。置くだけで読み込まれます（`import.meta.glob`）。名前と鳴る場面の一覧は `src/assets/se/README.md`
- `src/main.tsx` の `installSe()` が、norden-ui の `setSoundPlayer` に `playSe` を渡します。norden-ui・norden-battle の中から `playSound('名前')` を呼ぶと、ここで鳴ります。プレイヤーを渡していない所（norden-ui のカタログ、battle-editor）では鳴りません
- UI のクリック音は norden-ui の `installClickSound()` が鳴らします。ボタン・タブ・選択肢・チェックボックス（無効のものは除く）のクリックを document でまとめて拾い、`click` を鳴らします。各部品に音の処理は要りません。`data-sound="名前"` で別の音、`data-sound="none"` で無音にできます（ボタン以外の要素も `data-sound` を付けると鳴ります）
- AudioContext は BGM とは別です。最初のクリックかキー入力で作り、その時にすべての効果音を読み込みます。音量は設定の効果音（`getVolumes().se`）で、変えるとすぐに反映します

## ゲームの状態

`src/game/` にゲームの状態（ターン・フェーズ・都市の所属・都市の状態・勢力の金と研究・キャラクターの所属・侵攻予約・移動予約・輸送予約と移動中の騎士・行軍・直近の戦闘と内政処理）と、それを変える純粋な関数（状態 → 新しい状態）をまとめます。React と地図からは独立しています。

| ファイル | 役割 |
| --- | --- |
| `src/game/types.ts` | `GameState` などの型 |
| `src/game/setup.ts` | 初期状態（都市・キャラクターの初期配置）、`?faction=` の読み取り（`readPlayerFactions`） |
| `src/game/queries.ts` | 状態の問い合わせ（国力と手番の順・プレイヤーの勢力・都市の騎士・侵攻先・予約の条件・残りの兵・戦闘からの退却先） |
| `src/game/army.ts` | 兵の仮の規則（1部隊の兵数の上限・既定の兵科・間接指揮部隊は軍団長の能力の半分・練度の加重平均） |
| `src/game/actions.ts` | 予約の追加・取消、手番の終了、侵攻パートの次の侵攻（`startNextBattle`。その前に移動パートを済ませる）・侵攻の継続の判断（`decideInvasion`）・自勢力の都市への入城（`finishEntry`）、`resolveBattle`（戦後処理）、次のターンの開始（内政処理を含む） |
| `src/game/mercenaries/` | 傭兵: 契約できる範囲（`mercenaryMarket`）と値段（`contractPrice`）、契約・打ち切り・契約切れ（`hireMercenary`・`dismissMercenary`・`endContract`）、月額（`mercenaryFees`）、内政処理の中の未払い・回復・友好度・更新料（`runMercenaries`）、更新料の選択（`decideRenewal`） |
| `src/game/roaming.ts` | 放浪: 放浪の騎士の状態（`wanderer`）、退却先が無い騎士の帰る先（`rejoinCity`）、雇われていない傭兵と放浪の騎士の移動（`runRoaming`） |
| `src/game/movement.ts` | 移動と輸送: 経路（`moveRoute`）と月数（`moveMonths`）、行き先（`moveTargets`）、予約の追加・取消と条件、進行フェーズの移動と輸送（`runMovements`）とその演出用の1ヶ月分の道のり（`movementLegs`） |
| `src/game/economy/balance.ts` | 内政の定数（金・俸禄・Tier の閾値とスロット・領主の補正・担当官の予算と係数・人口の成長・募兵・出撃の費用・研究の係数と系統の割増）。すべて仮の値 |
| `src/game/economy/output.ts` | `cityOutput`: 都市の Tier・スロット・実効の商業と生産・領主と施設と技術の補正・担当官の能力と次のターンの見込み・収入・成長・訓練・募兵の上限（内政処理と画面の見込みで共有） |
| `src/game/economy/runEconomy.ts` | `runEconomy`: 毎ターンの内政処理（金と俸禄 → 担当官の内政 → 物資と建設 → 練度と募兵 → 人口と Tier → 研究）と、演出用の結果 `lastEconomy` |
| `src/game/research/` | 研究（技術ツリー）: 研究できるか・見え方（`techStatus`・`researchProblem`）、研究ポイントの見込み（`researchOutput`）と完了までのターン数、研究先の選択（`setResearch`）、内政処理の中の投入（`runResearch`）、CPU の研究先、技術の効果（`techBonus`） |
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

- すべての拠点を失った勢力は滅亡し、その勢力の騎士はすべて最後の拠点から放浪を始めます（放浪の騎士を参照）。移動・輸送中の騎士も同じで、その移動は消えます（`resolveBattle` の最後で `destroyFaction`）。雇っていた傭兵は契約が切れます。捕らえられているその勢力の騎士は、所属なし（`factionId` が null）の捕虜のままで、もう脱走しません。その勢力が移動・輸送で連れていた捕虜は、その場で解放されます（脱走と同じく自勢力の最も近い拠点へ。勢力が無ければ放浪）
- 滅亡はイベント（`GameState.events` の `FactionDestroyed`: 最後の拠点・攻め落とした勢力・放浪を始めた騎士）として残り、戦略画面に戻ったところで、カットイン `faction_destruction`（文字は「〇〇滅亡」と日付）のあとに汎用のイベント通知（norden-ui の `EventScreen`。カット画像とその下のメッセージウィンドウ）を出します。閉じると `dismissEvent` で消え、進行フェーズはイベントが無くなるまで先へ進みません。通知の中身は `views.ts` の `eventView`

### 兵の出入りと防衛軍団

- 侵攻軍の兵は、出発したとき（その侵攻の戦闘が始まるとき）に出発した都市の兵から引かれます（その時点で都市に残る兵まで。部隊の順に割り当て、兵の付かなかった騎士は出撃しない）。先に自勢力が奪った拠点へ入城する軍団の兵は、入城した拠点の兵に加わります
- 拠点の領主がいない（領主が移動・輸送で出ている場合を含む。中立の拠点には領主がいない）か兵が0なら、戦闘は行われず侵攻側の勝利です（`Battle.undefended`。地図で行軍を見せたあと、そのまま結果の画面へ）。拠点の兵と物資は侵攻側のものになり、侵攻軍の兵が加わります。拠点にいた防衛側の騎士は全員捕縛され、その拠点の捕虜になります（結果の `BattleReport.captives`。捕虜を参照）
- 侵攻された拠点は防衛軍団を編成し、その兵が拠点の兵から引かれます。プレイヤーの勢力でなければ自動で編成します（`defenderArmy`: 格の高い騎士から6人まで、兵を均等に割る）。プレイヤーの勢力なら、侵攻軍が着いたところで防衛軍団の編成画面（norden-ui の `InvasionScreen` の `mode="defense"`。Esc・やめる・閉じるで戻れない）に入り、確定で戦闘へ進みます（`Battle.pendingDefense` → `formDefense`。条件は侵攻と同じで `defenseProblem`。選べる騎士は `defenseKnights`）。編成に入らなかった騎士は戦場に出ず、拠点を奪われると防衛軍団の騎士と同じく退却します
- 戦闘の後、退却した部隊の兵はその退却先の拠点に加わります（捕虜になった部隊の兵は失われる）。戦場に残った部隊（battle-runtime の `BattleOutcome.remaining` → `BattleSurvivor`）の兵は騎士と同じ所へ行きます: 勝った側は戦った拠点へ（侵攻側なら、防衛軍団に割かれなかった兵＋侵攻軍の残りの兵になる）、負けた侵攻側は出発した都市へ、負けた防衛側は退却先へ（無ければ失われる）。デバッグの勝敗のボタンで決めたときは、退却・殲滅していない部隊が編成したときの兵数のまま残ったものとします。加わる兵の練度は兵数で加重平均します。結果画面の「兵」に、拠点ごとに加わった兵（`BattleReport.soldiers`）を出します

### 移動

軍事 → 移動で、自勢力の都市から騎士（複数）を自勢力のほかの都市へ移します。地図で移動先（自勢力のすべての都市。隣接していなくてよい）を選び、移動画面（norden-ui の `MoveScreen`）で騎士と、持っていく兵数・物資を決めて予約します（`addMoveOrder`。予約は手番のうちなら取り消せる）。騎士は着いた都市の所属になります。

- 経路は街道の最短経路で、なるべく自勢力の都市だけを通ります（通れなければ他勢力の都市も通る。`moveRoute`）。兵と物資を連れた移動は街道1区間に半月（1ヶ月に2区間。`MOVE_HOPS_PER_MONTH`）かかり、移動画面に月数を出します
- 単騎移動（`MoveOrder.solo`）は兵と物資を運ばない代わりに、どれだけ遠くても2ヶ月以内に着きます（1ヶ月に2区間進み、最長2ヶ月）（`SOLO_HOPS_PER_MONTH`・`SOLO_MAX_MONTHS`）
- 進行フェーズ（旧称: 行軍フェーズ。状態の `phase` は `'march'` のまま）の初めに、全勢力の移動をまとめて1ヶ月分進めます（`runMovements`）。その月に予約した移動はここで出発し、騎士は担当（領主・内政担当官）を離れ、兵と物資が都市から引かれます。領主が移動するときは、予約した時点では領主のままで、出発したときに後任が決まります。後任は、その都市に残る騎士（移動中・移動で出発する騎士と侵攻予約中の騎士を除く。輸送中の騎士はよい）のうち政治がいちばん高い騎士で、同じ値ならランダムです。該当する騎士がいなければ領主は不在になります（`successorLord`）。侵攻も同じで、軍団が出発したとき（進行フェーズでその侵攻の戦闘が始まるとき）に軍団の騎士は担当（領主・内政担当官）を離れ、領主が加わっていれば後任が決まります（軍団の騎士とこれから戦う侵攻の騎士を除く。`setOutArmy`）。勝っても負けても元の担当には戻りません（負けて戻った内政担当官も担当なし）。移動中の騎士は着くまで出発した都市の所属のままで（`CharacterState.cityId` は出発した都市。`GameState.movements` に経路の残りと残りの月数）、都市の騎士一覧には残りますが、「移動中」と出て侵攻・移動・輸送・内政の担当に選べず、その都市の防衛にも加わりません（`movementOf`・`awayReason`・`stationedIn`）。出発した都市が奪われると、その都市の所属から外れ（`cityId` が null）、そのまま行き先へ向かいます。着いた移動は、騎士がその都市に入り、兵（練度は兵数で加重平均）と物資がその都市に加わります
- 移動は侵攻の戦闘より先に済ませるので、その月に着く騎士は着いた都市の防衛戦闘に加わります
- 君主（勢力の当主。`isPatriarch`）が移動で着いた都市では、君主がその都市の領主に代わります（元の領主はただの騎士に。輸送・帰還・侵攻からの入城では変わりません）。退却したとき（戦場から退却した先の都市・奪われた拠点から落ち延びた先の都市）と、侵攻に負けて出撃元へ戻ったとき（退却したかどうかによらない）も同じで、結果画面の「領主の任命」に出ます。君主でない領主は、侵攻から戻っても領主に戻りません
- 行動予約のウィンドウ（右上。norden-ui の `ActionOrders`）に、侵攻予約（侵攻元 → 侵攻先、軍団長 以下N名、取消）と移動予約（移動元 → 移動先、担当の騎士、取消）を並べます。月をまたいで移動中のものは出発した拠点から書き、取消の代わりに残りの月数を出します
- 移動先の都市が奪われていたら、いまいる場所からいちばん近い自勢力の都市へ向かい直します。勢力の都市が無くなれば騎士は今いる都市から放浪を始め、兵と物資は失われます
- 地図では、進行フェーズに全勢力の移動の1ヶ月分の道のりを移動のマーカーで見せます（兵と物資を連れた移動は侵攻と同じ軍団のマーカー、単騎移動は使者のマーカー）。行動予約のウィンドウで予約を押すと、その予約の経路（侵攻は侵攻先への街道、移動は残りの経路）だけを街道の強調で出します（ほかの場所を押すと消える）。侵攻・移動・輸送とも、出発地と行き先の両方が入るようにカメラを寄せます（norden-strategy の `focusPlaces`）。左の都市情報ウィンドウと右の行動予約に隠れないよう、左360px・右200pxを除いた範囲に収めます（`FOCUS_INSET`。margin は既定の3）。街道の強調の色は勢力によらず、移動は青、侵攻は赤です（地図上を動くマーカーは勢力の色）

### 輸送

軍事 → 輸送で、自勢力の都市から兵と物資を自勢力のほかの都市へ運びます。地図で輸送先（自勢力のすべての都市。隣接していなくてよい）を選び、輸送画面（norden-ui の `TransportScreen`）で担当の騎士1人と、運ぶ兵数・物資を決めて予約します（`addTransportOrder`。予約は手番のうちなら取り消せる）。

- 経路と月数は兵と物資を連れた移動と同じです（街道1区間に半月。隣接か2区間先なら1ヶ月、3区間なら2ヶ月）。進行フェーズに移動と一緒に出発・前進し（`GameState.movements` の `kind: 'transport'`）、領主は輸送を担当でき、輸送に出ても領主のままです。内政担当官は輸送を担当できません（輸送画面では「商業担当官」などと出て選べない。`transportKnightProblem`）。輸送を予約した騎士も内政の担当に選べません（騎士の予約と不在は `engagementOf` にまとめてあり、侵攻・移動・輸送・内政の担当の判定はすべてここを見る）。騎士は戻るまで出発した都市の所属のままで、騎士一覧には「輸送中」と出て選べません（移動中の騎士と同じ）
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

- 担当: 領主（1人。`commandRank` の「領主」）と内政担当官（商業・生産・訓練・募兵・研究にそれぞれ2人まで。能力は役職ごとの重みで平均し、2人なら合算する。領主は担当官になれない）。初期の領主は `characterStart.json` の `isLord` の騎士。騎士が都市を離れると担当から外れ、攻め落とされた都市の担当は空になります
- 毎ターンの内政処理（`runEconomy`）は、進行フェーズを解決しきって次のターンの戦略フェーズに入る直前に、全勢力の全都市をまとめて行います。領主の能力で商業・生産が伸びます（実効値への補正）。人口は、担当官が上げたあとの基礎の商業・生産、建っている施設の数、領主の政治と魅力から伸び（`populationGrowth`。係数は `balance.ts` の `POP_GROWTH_*`）、Tier と施設のスロットも人口に応じて上がります（10000 で Tier 2、30000 で Tier 3）。商業・生産・募兵の担当官は、都市が役職ごとに割り当てた予算（`CityState.affairsBudget`。1000まで。割り当てたときに国庫から移し、減らすと戻る。`setAffairsBudget`）から毎ターン 80〜150 の乱数の金を使い、商業・生産の基礎値を上げ（政治2・知力1）、兵を集めます（魅力3・武力1。新兵の練度で混ざる）。訓練担当官は金を使わずに練度を上げます（武力2・統率1）。式と係数は `balance.ts` の `AFFAIRS_*`・`GROWTH_COEF_*`。施設の効果でも各値が伸びます
- 施設のマスターデータは `src/data/buildingData.json`（`src/data/buildings.ts`）。1都市に同じ施設は1つ、建設中は1件だけで、建設中は都市の生産をすべて建設に回します。施設の建設・遺物の修復・遺物の生産は同じ枠（`CityState.construction` の `work`）を共有し、都市ごとに同時に1つです

### 研究

勢力ごとの研究（`GameState.research` の `FactionResearch`: 研究中の技術・技術ごとの投入済みのポイント・研究済み・宙に浮いたポイント `carry`）を持ちます。技術のマスターデータは `src/data/techData.json`（`src/data/techs.ts`）で、前提（`requires`。全部要る）を複数持てる技術ツリーです。前提の無い技術が根で（物理文明・兵法・魔法文明）、系統（`branch`）に関係なく技術画面の左端に並びます。系統は研究施設の割増だけに使い、系統の無い技術（兵法とその子孫）には割増が付きません。技術画面での行は前提から決まり、`alignWith` で左の列の技術と同じ行に揃えられます。画像は全技術を並べた `src/assets/techs.webp`（大きさは `src/data/techSprite.json`。施設と同じ 256×384 のセル）で、どれも norden-data の「ゲームに書き出す」で作ります（いまの画像は仮）。

- 研究ポイントは研究施設（施設の効果 `researchPoints`。図書館系は物理文明、魔術学院系は魔法文明の系統）と研究担当官（内政担当官の役職 `research`。知力、予算制）だけから出ます。研究中の技術と同じ系統の施設の分は × (1 + `RESEARCH_BRANCH_BONUS`)。担当官の分は予算から使った金 × 知力の合計 / 100 × `GROWTH_COEF_RESEARCH`。端数はどちらも確率で切り上げます
- 研究ポイントはためられません。内政処理の最後（`runResearch`）に勢力の合計を研究中の技術へ入れ、必要なポイントに届くと研究済みにして、余りは `carry`（宙に浮いたポイント）に入ります。研究中の技術が無いターンのポイントも `carry` に入り、研究先を選んだ（`setResearch`）ときにその技術へ入ります。研究できる技術が残っていなければ消えます。研究中の技術は途中で変えてよく、進捗は技術ごとに残ります
- プレイヤーの勢力は、ポイントが宙に浮いているあいだ（`mustChooseResearch`）ターンを終えられず（`endFactionTurnProblem`）、戦略画面はターンの初めに技術画面を閉じられない状態で開きます。研究を終えたターンは先に完成の通知（`GameState.events` の `TechCompleted`）を出します。CPU の勢力は研究先が無ければ、研究できる技術のうち必要なポイントが一番少ないものを自動で選びます（`chooseResearchForCpu`）
- 研究し終えた技術の効果（商業・生産・人口の伸び・訓練・募兵数・新兵の練度。施設の効果と同じ種類）は、勢力の全都市の見込み（`cityOutput` の `tech`）にすぐ乗り、次の内政処理から効きます。施設の `requiredTech` の技術を研究し終えていない勢力の都市では、その施設を建てられません（建てられる施設にも出ない）。それ以外の効果（一斉攻撃・魔法・遺物の修復など）は文言（`etc`）だけです。遺物の修復・生産の判定は、遺物の `repair.tech`・`production.tech` が持ちます
- 技術画面は都市コマンドの「研究」＞「技術」か、`FactionBar` の研究の表示で開きます。研究ポイントを足す・研究中の技術を完了にする・各勢力の研究を見るのは[デバッグコンソール](#デバッグコンソール)の `research` です

### 遺物

勢力ごとのアイテムボックス（`GameState.relics`。1点ずつの `RelicItem`。壊れた状態・修復済み・法王府に依頼中・装備中・施設の建設中）を持ちます。遺物のマスターデータは `src/data/relicData.json`（`src/data/relics.ts`）で、レアリティ・使い道・解体の研究ポイント・修復と生産の費用を持ちます。修復していない遺物のレアリティは、画面では1段階落として出します（C なら D）。壊れた状態を持たない遺物（魔導書）は、解体も修復もできず、生産するか修復済みで初期配布します。画像は壊れた状態と修復済みで別のセルを持つ `src/assets/relics.webp`（大きさは `src/data/relicSprite.json`。技術と同じ 256×384 のセル）で、どれも norden-data の「ゲームに書き出す」で作ります（いまの画像は仮）。入手は初期配布（`factionData.json` の `relics`。遺物の id と修復済みかどうかを1点ずつ持つ）だけです。使い道は装備と施設があり（下の「装備」「施設の遺物」）、召喚はまだありません（M009 で作っています）。

遺物のマスターデータは使い道ごとの効果も持ちます（M009。いまゲームの決まりが使うのは装備の効果と施設の遺物）。装備の遺物は `equipment`（付けられる騎士 `wearer`: 魔術師か魔術師以外、知力の制限 `minIntelligence`、率いられるようになる兵種 `unitTypes`、戦闘で使える魔法 `spells`。魔法の ID は battle-runtime の `SPELL_IDS` を `@norden/battle-runtime/rules` から読みます）、召喚の遺物は `summon`（型紙の特殊キャラクター `characterId`、魔物の兵種 `unitType`、HP `hp`）を持ちます。施設の遺物は遺物の側に何も持たず、施設の `requiredRelic` が遺物の id を指します。食い違い（`relicEffectProblems`）は `src/data/relics.test.ts` が検査します。

- 解体（`dismantleRelic`）: 壊れた遺物を失い、研究ポイントを研究中の技術に入れます（`addResearchPoints`。系統の割増なし。届けばその場で完了）。研究先が無ければ `carry` に入り、遺物画面の上に技術画面が閉じられない状態で開きます。研究できる技術が残っていなければ解体できません
- 修復（`startRelicRepair`）: 遺物の `repair.tech` を研究し終えていれば（省略ならいらない）、都市の建設の枠で修復します。金は開始時に国庫から払い、遺物はボックスから抜け、都市の生産が物資として入ります。施設のスロットは使いません。一時停止・中止は建設と同じで、中止すると投入した物資の半分が戻り、遺物は壊れたままボックスに戻ります
- 生産（`startRelicProduction`）: 遺物の `production.tech` を研究し終えていれば、遺物なしで同じ枠で生産します。都市の条件はありません。完成品は修復済みでボックスに入ります
- 法王府の修復（`requestPapalRepair`）: `(repair.gold + repair.supplies) × 倍率`（切り上げ）の金を法王府（`sede`）の国庫へ払い、次の内政処理で修復済みになります。技術も都市の生産もいりません。依頼は勢力につき同時に1件までです。法王府自身と、法王府が滅んだあとは頼めません（頼んだあとで滅んでも届きます）。倍率は修復に技術のいらない遺物なら `PAPAL_REPAIR_RATE`（2.5）。技術のいる遺物は、その技術とその前提の技術すべての研究ポイントのうち研究済みの割合（`papalRepairKnowledge`）で `PAPAL_REPAIR_RATE_UNKNOWN`（3.5、何も研究していない）から `PAPAL_REPAIR_RATE_KNOWN`（1.5、すべて研究済み）へ下がります（`papalRepairRate`）。遺物の画面は基準からの増減を添えて出します
- 都市が奪われると、その都市の修復・生産と遺物を使う施設の建設は消滅し、投入した物資も金も修復中の遺物も建設に使っていた遺物も戻りません（`BattleReport.lostRelicWork`。結果の画面に出ます）。遺物を使わない施設の建設は都市に付いたまま続きます。勢力が滅びると、アイテムボックスは依頼中のものも含めて滅ぼした勢力へ移ります
- 装備（`src/game/relics/equipment.ts`）: 勢力に仕える騎士は枠を `EQUIPMENT_SLOTS`（2）つ持ち、箱の修復済みの装備の遺物を付けられます（`equipRelic`・`unequipRelic`。可否と理由は `equipProblem`・`unequipProblem`）。遺物は箱に残ったまま、付けている騎士と枠を `RelicItem.equippedBy` に持ちます。付けられるのは自勢力の戦略フェーズの手番だけで、傭兵・召喚ユニット・捕虜は付けられず、その手番に侵攻を予約した騎士は付け外しできません。魔導書は魔術師だけ、ライフル・大砲は魔術師以外で、`minIntelligence` に知力が届かないと付けられません。同じ遺物（`relicId`）を2つの枠には付けられません。埋まった枠に付けると前の遺物は箱に戻り、ほかの騎士が付けている遺物はその騎士から外して付けます（付け替え）
  - 付けた遺物の `unitTypes` は、種別の兵種に足して率いられる兵種になります（`unitTypesOf(state, id)`。出撃・防衛の編成と `orderProblem` の検査が使う）。`spells` は戦闘で使える魔法になり、`battleSpells` が騎士ごとにまとめて `battleTroops` が騎士の部隊の `TroopInit.spells` に渡します（battle-runtime が使うのは魔術師の部隊だけ。間接指揮の部隊には渡さない）
  - 画面: 遺物画面で修復済みの装備の遺物を選ぶと、効果と「装備させる」（勢力の騎士の一覧から選ぶ。付けられない騎士は理由付きで選べない。枠が埋まっていれば入れ替える遺物を選ぶ）・「外す」が出ます。騎士の詳細ウィンドウ（都市情報ウィンドウの騎士タブの「詳細」）には装備の枠が2つ出て、枠を押すと付けられる遺物の一覧から付け替え、「外す」で外せます。表示は `views.ts` の `relicsView`・`knightView` の `equipment`・`equipOptionsView`・`equipCandidatesView` が作ります
  - 騎士が勢力を離れると（捕縛・放浪・傭兵の契約の終わり・勢力の滅亡）、付けていた遺物は外れて元の勢力の箱に残ります（`releaseEquipment`。`resolveBattle`・`endContract`・`runMovements`・`debugImprison` が呼ぶ）。滅んだ勢力の箱は、誰も付けていない状態で滅ぼした勢力へ移ります
- 施設の遺物（要塞砲・バリスタ・魔導台・ガンシップ。施設の `requiredRelic`）: 勢力の箱にその遺物が修復済みであれば、その施設を建てられます（無ければ建てられる施設の一覧に出ません。`buildingLocked`・`buildingProblem`）。建て始めると（`startConstruction`）箱の中の使える遺物（ロックされていない最初のもの。`constructionRelic`）がロックされ（`RelicItem.buildingIn` に都市、建設の作業 `BuildingWork.relicItemId` に遺物）、箱に残ったままほかの建設には使えません。中止すると（`cancelConstruction`）ロックが外れ、建て終わると（内政処理の `buildingCompleted` を `runRelics` が見る）遺物は箱から消えます。取り壊しても戻りません
  - 画面: 内政画面の建てられる施設に「遺物：ガンシップを 1 つ使用」、建設中の枠に「遺物：ガンシップを使用中」と出ます（`BuildOptionView.relicNote`・`ConstructionView.relicNote`）。遺物画面では修復済みの施設の遺物に「内政画面で{施設名}を建てるのに使えます」、建設に使っている遺物に「建設中（都市名）」と出ます（`RelicView.status` の `building`・`buildingName`）
- 内政処理（`runRelics`）が修復・生産の完成と法王府の修復を仕上げ、プレイヤーの勢力には通知（`GameState.events` の `RelicCompleted`）を出します。CPU の勢力は遺物を操作しません
- 遺物画面は都市コマンドの「研究」＞「遺物」で開き、修復と生産は開いている都市で行います。内政画面の施設の横にある「遺物の修復」の枠からも始められます（施設の一覧には混ざりません）。「法王府に献上」は押せないボタンだけで、処理はまだありません。遺物を足す・各勢力のアイテムボックスを見るのは[デバッグコンソール](#デバッグコンソール)の `relic` です

戦闘からの退却: 戦闘画面では、部隊は戦場の拠点に街道でつながる自勢力の拠点（`retreatCities`。攻撃側には出撃元も入る）へ退却でき、隣接する敵の数に応じて失敗すると捕虜になります。戦闘画面は結果を部隊ごとに知らせ（battle-runtime の `RetreatReport`）、戦闘シーンが `BattleRetreat`（陣営・騎士・退却先・捕虜になったか）にして `resolveBattle` に渡します。退却した騎士は勝敗に関わらず選んだ拠点へ移り、捕虜になった騎士は相手の陣営の捕虜になります（捕虜を参照。戦闘の結果は `BattleReport.retreats`）。いまの戦闘の部隊は騎士と結び付いていない仮の部隊なので、騎士は null になります（部隊の ID を騎士の ID で作れば結び付きます）。

殲滅されたときの捕縛: 兵数が 0 になった部隊の指揮官は、隣接する敵の数に応じて捕縛され捕虜になります（0: 10%・1: 30%・2: 50%・3 以上: 75%）。戦闘画面は結果を部隊ごとに知らせ（battle-runtime の `WipeoutReport`）、戦闘シーンが `BattleWipeout`（陣営・騎士・捕虜になったか）にして `resolveBattle` の最後の引数に渡します。捕縛された騎士は退却に失敗した騎士と同じく相手の陣営の捕虜になります（戦闘の結果は `BattleReport.wipeouts`）。捕縛されなかった騎士は落ち延びて、陣営のほかの騎士と同じに扱います。

戦闘の決着: 戦闘画面（battle-runtime の `victory.ts`）は、どちらかの陣営の部隊がすべて殲滅・退却（捕虜を含む）するか、攻撃側のユニットが防衛拠点（街道マップの `strongholds[防衛する都市]`。map-editor の「防衛拠点」で置く。城の中心部の HEX）で行動を終える（もう行動できなくなる・拠点にいるまま番を終える。入城）と決着し、カットインと決着のウィンドウを出します。カットインはプレイヤーの勢力が勝てば勝利（norden-ui の `battle-win`）、負ければ敗北（`battle-lose`）で、プレイヤーの勢力がいない戦闘では勝利です（`playerSide`。文字はテンプレートのまま）。そのボタン「戦闘の結果へ」で、戦闘シーンが勝った陣営・退却の結果・決着の理由（`BattleEndReason`）を `resolveBattle` に渡して結果の画面へ進みます（理由は `BattleReport.reason`。デバッグのボタンで決めたときは null）。防衛拠点の無い戦場は入城では決着しません。

拠点の初期データ（人口・商業・生産・初期の所属・固定の絵。省略可能な初期の備蓄・兵数・練度・施設）は `src/data/cityData.json`（`src/data/city.ts`）です。地図はゲームから渡された都市（名前・絵・所属。`views.ts` の `mapCities` を `MapView` の `cities` に渡す）を、`norden-strategy` の `PLACE_POSITIONS` の位置に描きます。地図に都市の写しはありません。拠点を増やしたら、`PLACE_POSITIONS` に位置を足してください（無いと `src/data/city.test.ts` が落ちます）。

勢力のマスターデータ（名前・紋章・当主の呼び名・色・初期の金・初期配布の遺物）は `src/data/factionData.json`（`src/data/faction.ts`）です。一覧の順が国力の同じ勢力の手番の順で、初期の金を省略した勢力は `INITIAL_GOLD`（`src/game/economy/balance.ts`）で始まります。地図の紋章は `norden-strategy` の `FACTION_LIST`（ID・名前・紋章だけの写し）を使います。食い違うと `src/data/faction.test.ts` が落ちるので、勢力の ID・名前・紋章・並び順を変えたら写しも直してください。紋章の画像は `norden-strategy/data` の `emblemImage`（番号で引く）です。

施設のマスターデータは `src/data/buildingData.json`（`src/data/buildings.ts`）、画像は全施設を並べた `src/assets/buildings.webp`（大きさは `src/data/buildingSprite.json`）です。どれも norden-data の「ゲームに書き出す」で作ります。技術のマスターデータ（`src/data/techData.json`・`techSprite.json`・`src/assets/techs.webp`）と遺物のマスターデータ（`src/data/relicData.json`・`relicSprite.json`・`src/assets/relics.webp`）も同じです。

キャラクターのマスターデータは `src/data/characterData.json`、初期配置は `src/data/characterStart.json`、顔・全身の画像は `src/components/CharacterImage.tsx`（`src/assets/character.webp` のスプライト。大きさは `src/data/characterSprite.json`）です。ID 991〜999 は特殊キャラクター（`SPECIAL_CHARACTER_IDS`）で、991 ドラゴン・992 ゴーレム・993 ベヒーモスは召喚ユニットの型紙（種別 `summon`「召喚」。画像と既定の値だけを持ち、初期配置しない。いまの画像は仮）です。兵種（`src/data/unitTypes.ts`）には魔物のドラゴン・ゴーレム・ベヒーモス（`MONSTER_UNIT_TYPES`）があり、騎士は率いません。

これらのデータは `norden-data` のエディタで編集します（`cd norden-data && npm install && npm run dev`）。拠点データはエディタが直接読み書きし、施設データ・技術データ・遺物データは `norden-data/buildings/buildings.json`・`norden-data/techs/techs.json`・`norden-data/relics/relics.json` から書き出し（画像は元画像から切り抜く）、キャラクターのデータは `norden-data/characters/characters.json` から書き出します。

`npm test` で `src/` の単体テスト（Vitest）を実行します。

### 傭兵

金で契約する騎士です（`Character.mercenaryInfo`。`isMercenary`）。兵を自分で持ち（`GameState.mercenaries` の `soldiers`）、都市の兵とは混ざりません。設計は [docs/milestones/m005.md](docs/milestones/m005.md)。

- 軍事 → 傭兵で傭兵画面（norden-ui の `MercenaryScreen`）を開きます。契約できるのは、開いた都市から街道で1つ先まで（その都市に酒場があれば2つ先、傭兵ギルドがあれば全拠点）にいる、回復中でない傭兵です（`mercenaryMarket`）。拠点の支配者は関係ありません
- 契約するとその場で契約金を払い、開いた都市の騎士になって、そのターンから命令できます。月額（契約金の1/6）は次の内政処理から、給金と同じく勢力の収入のあとに払います。払えない傭兵は id の順に契約が切れ、通知が出ます（`MercenaryUnpaid`）
- 傭兵業界の友好度（`GameState.mercenaryStanding`。-100〜100、どの画面にも出さない）は、契約で上がり、勢力の酒場と傭兵ギルドで内政処理ごとに上がり、兵が減った傭兵との契約が切れると下がり、傭兵が全滅するとさらに下がります。値段はプライドに応じて変わり（`contractPrice`）、プライドの高い傭兵は友好度が足りないと契約に応じません（`prideProblem`。(プライド − 2) × 20 以上が要り、プライド 3 以上は始めの友好度 0 では応じない）。定数は `balance.ts`
- 雇われた傭兵の `cityId`・`factionId` は雇い主のもので、都市の騎士一覧・移動・編成の処理にそのまま乗ります。騎士の一覧には印と兵数が出ます。内政の担当官・領主・軍団長にはなれず、傭兵だけでは出撃できません（`canCommand`）。移動と輸送はできますが、単騎移動はできません（輸送の帰りは輸送の決まり）
- 編成では兵数と兵科が固定で（今の兵数と `defaultUnitType`。兵科は騎士データの `mercenaryInfo.unitType`、省略すると種別の既定）、都市の兵は減りません（`citySoldiers`）。練度は固定の `MERCENARY_MORALE`。戦闘では捕縛されず（battle-runtime の `uncapturable`）、退却は必ず成功します。退却先が無い軍では退却を選べません
- 戦闘で減った兵は傭兵のもののままで、内政処理ごとに最大兵力の10%回復します（契約の有無によらない）。全滅すると、退却先の有無にかかわらず契約が切れ、友好度が下がります。領主のいない都市が奪われたときと敗戦で都市に残ったときは、隣の自勢力の都市へ撤退し、無ければ契約が切れます（友好度は下がらず、兵も失わない）。結果画面の「契約解除」に出ます
- 契約または更新から6ヶ月たつと、内政処理ごとに 1/3 の確率で更新料（契約金の半分）を求められます（`MercenaryRenewal`）。通知で「更新する」か「契約を打ち切る」を選び、閉じるだけでは済みません（`decideRenewal`）
- 傭兵画面の「契約中」から打ち切れます。金は戻りません。移動・輸送・侵攻の予約中は打ち切れません。兵が減った傭兵を打ち切ると友好度が下がります
- 契約が切れた傭兵は、そのとき居た都市が居所になり（移動中なら今いる都市、戦闘なら戦場の拠点）、移動から抜けます（ほかの騎士が残らなければ移動は消え、運んでいたものは失われる）。兵が減っていれば回復中（`isRecovering`）で市場から消え、回復し終えると戻ります
- 傭兵画面は契約金・月額・能力値を一覧にも詳細にも出さず、基本の契約金から決まるランク（S〜D、`mercenaryRank`。境目は `balance.ts` の `MERCENARY_RANKS`。ランクごとに色を変える）を出します。「交渉」で傭兵の雇用の会話シーン（`src/dialogue/hireMercenary`）が始まり、傭兵が名乗って契約金と月額を示し（そのあいだ左に能力値つきのプロフィール。台本の `panel`、ゲームの資料は `src/dialogue/panels.ts`）、「契約する」で契約します（「やめておく」なら何も変わらない）。金が足りないときは傭兵画面では押せて、シーンの「契約する」が押せず理由が出ます。友好度が足りず契約に応じない傭兵（`prideProblem`）も「交渉」は押せて、シーンで名乗ったあと、値段を言う前に門前払いされます（一覧の理由はプライドと金以外の `hireOfferProblem`）。セリフは傭兵の口調で変わり、ランツクネヒトのカスパル（110）には専用のセリフがあります（台本の `characters`）
- 雇うのはプレイヤーの勢力だけです（CPU の手番はまだターンを渡すだけ）

### 召喚ユニット

召喚の遺物（ドラゴン・ゴーレム・ベヒーモス。`Relic.summon`）を使うと、その魔物が勢力の部隊（召喚ユニット。種別「召喚」）として都市に加わります（M009。設計は [docs/milestones/m009.md](docs/milestones/m009.md)）。

- 召喚（`src/game/summons/`）: `summonRelic` が自勢力の手番に、自勢力の都市で、箱の修復済みの召喚の遺物（法王府に依頼中でないもの）を使い切って、その都市に召喚ユニットを置きます（可否と理由は `summonProblem`）。ID は `summon-<serial>`（`isSummon`）で、`GameState.characters` に騎士と同じく入り、能力などは `GameState.summons`（`SummonState`）に持ちます。統率・武力・知力は召喚したときに `SUMMON_ABILITY_RANGE`（60〜90）の乱数で決まり、政治・魅力は `SUMMON_FIXED_ABILITY`（10）。HP（自前の兵数）は遺物の `summon.hp`（ドラゴン 600・ゴーレム 800・ベヒーモス 1000）です。名前は `src/data/summonNames.json` から勢力の召喚ユニットと重ならないものを自動で付け（`autoSummonName`）、`renameSummon` で付け直せます（1〜12文字）
- 召喚ユニットはデータのキャラクターではないので、通る所は `characterOf(state, id)` で引きます（型紙の特殊キャラクター 991〜993 の画像に、名前・能力・種別 `summon` を重ねる）
- 傭兵と同じく自前の兵を持つ部隊です（`hasOwnSoldiers`・`ownSoldiers`・`ownMorale`）。編成では兵種（魔物）と兵数（いまの HP）が固定で、都市の兵を使いません。士気は固定の `SUMMON_MORALE`（70）。戦闘では捕縛されません。軍団長・領主・内政の担当官・輸送の担当にはなれず、単騎移動もできません。装備の枠は無く、俸禄も払いません
- 戦闘の後は、残った兵数が HP になります（退却も）。壊滅すると失われ（遺物にも戻らない。`BattleReport.lostSummons`、結果の画面の「召喚ユニットの消滅」）、退却先も勢力の都市も無いときも失われます。勢力が滅ぶと消え、捕虜にも放浪にもなりません（勢力を離れた召喚ユニットは `releaseSummons` が消す）
- 内政処理で、都市にいる（移動中でない）召喚ユニットは HP が最大の `SUMMON_RECOVERY_RATE`（10%）戻ります（`recoverSummons`）
- 攻撃力・防御力（`summonStrength`）は、battle-runtime の基本攻撃力・基本防御力（`basicAttack`・`basicDefense`。標準の部隊が相手で、標準の部隊の防御力が 100）を、いまの HP・統率・武力・`SUMMON_MORALE` で出したものです。魔物は攻撃に使う兵数が固定で、防御力は 1 撃あたりなので、どちらも HP では下がりません
- 画面: 遺物画面で修復済みの召喚の遺物を選ぶと「{都市}で召喚」があり、押すと召喚して名付けの窓（norden-ui の `SummonDialog`。立ち絵・HP・攻撃力・防御力・名前・「自動」・「決定」）が出ます。名付けの窓を閉じても能力は変わらず、やめる手段はありません。都市の騎士の一覧では騎士・傭兵と分けて「召喚」の区切りに並び、札と騎士の詳細ウィンドウには統率・武力・知力の代わりに HP・攻撃力・防御力が出ます（詳細は略歴の代わりに召喚した遺物の説明）。出撃・防衛の画面では兵種と兵数（HP）が固定で、軍団長に選べません。表示は `views.ts` の `summonView`・`knightView` の `summon`、`relicsView` の `summon`
- 召喚ユニットを出す・見る・HP を変えるのは[デバッグコンソール](#デバッグコンソール)の `relic summon`・`summon` です

### 放浪の騎士

どの勢力にも仕えていない騎士は、`cityId`・`factionId` が null で、居所を `CharacterState.roaming` に持ちます（雇われていない傭兵も同じ）。放浪の処理は `src/game/roaming.ts`。

- 放浪になるのは、勢力が滅んだとき（居所は最後の拠点）、勢力の都市が無くなった移動（今いる都市）、勢力の無い脱走（逃げた都市）です。騎士データで開始の勢力が無く、傭兵でもない騎士は放浪で始まります（`characterStart.json` の `factionId` の省略）
- 勢力の滅亡で放浪になった騎士は、滅ぼした勢力を怨恨勢力（`CharacterState.grudge`）として覚えます。滅亡の戦闘で先に勢力を離れた騎士も同じです。登用は探索といっしょに実装します
- 進行フェーズの初めに（脱走のあと）、雇われていない傭兵（回復中も）と放浪の騎士は 1/2 の確率で隣の拠点のどれかへ移ります（`runRoaming`）
- 放浪の騎士の一覧は画面に無く、デバッグコンソールの `wanderer list` で見ます

勢力が健在なのに退却先が無くなった騎士（全滅して落ち延びる先が無いとき、都市が奪われて隣接の自勢力の都市が無いとき）は放浪にならず、部隊の兵を失って君主のいる拠点へその場で帰ります。君主が捕虜のときや、君主の拠点が勢力のものでないとき、帰るのが君主自身のときは、戦場からいちばん近い自勢力の都市へ帰ります（`rejoinCity`。結果画面の「君主のもとへ帰還」）。

## 会話シーン

騎士の立ち絵・顔付きのセリフ・背景・BGM・効果音で見せる簡易なノベル風の場面です。仕組み（再生・画面・検査）とエディタは norden-dialogue、シーンそのものはゲームのデータとしてルートの `src/dialogue/` に置きます。設計は [docs/milestones/m006.md](docs/milestones/m006.md)、書き方は [norden-dialogue/README.md](norden-dialogue/README.md)。

| 場所 | 内容 |
| --- | --- |
| `src/dialogue/<id>.json` | 台本（セリフ・話し手・立ち絵・背景・音・選択肢の文言。分岐なし）。先頭の `$schema` で VSCode の補完が効く |
| `src/dialogue/<id>.ts` | 流れ（`gameScene(script, 入力, run, sample)`）。分岐・条件・状態の更新（`ctx.update(s => hireMercenary(s, …))`）・フラグを書く。ブロック名・選択肢は台本から型が付く |
| `src/dialogue/index.ts` | `SCENES`（id → シーン）、`DIALOGUE_PROVIDERS`、`runDialogue` |
| `src/dialogue/cast.ts`・`audio.ts` | 騎士（名前・口調・立ち絵・顔）・都市・背景（`src/assets/bg/<名前>.webp`。無ければ仮のグラデーション）と、BGM・効果音（`src/audio/`） |
| `src/dialogue/events.ts` | ランダムイベント（`RANDOM_EVENTS`・`pickRandomEvent`）。ゲームからはまだ呼ばない（探索の実装のとき） |
| `src/dialogue/catalog.ts` | 台本が名指せるもの（騎士 ID・背景・曲・効果音・口調）。テストとエディタだけが使う |
| `src/scenes/DialogueLayer.tsx`・`playDialogue.ts` | 画面に重ねる層。`playDialogue(id, 入力)` で再生し、終わるとシーンの状態を一度にゲームへ反映する。規則の違反（`GameRuleError`）なら何も反映せず通知を出す。会話中は画面を覆ってクリックとキーを受け、終わると前の曲に戻る |
| `src/game/flags.ts` | `GameState.flags`（`<シーン id>:<名前>` → 数か真偽）の `flagOf`・`setFlag`・`clearFlag` |

- `src/dialogue/scripts.test.ts` が全台本を検査します（命令の形・宣言していない変数・存在しない騎士 ID・曲・効果音・口調・決まった書式。背景の画像が無いのは警告だけ）。流れの分岐もここで確かめます（norden-dialogue の `ScriptedPlayer`）
- 台本を直して保存すると、開いているゲームにもそのまま反映されます（HMR）

## デバッグコンソール

どのシーンでも `Ctrl+Alt+D` で半透明のコンソールを開閉します（`Esc`・`exit` でも閉じる）。`help` で一覧、`help <コマンド>` で使い方を出します。

| コマンド | できること |
| --- | --- |
| `status` | ターン・フェーズ・手番・シーン |
| `faction list` / `show [faction]` | 勢力の一覧と詳細 |
| `gold add <amount> [faction]` / `set <amount> [faction]` | 金を変える |
| `research list` | 勢力ごとの研究 |
| `research add <points> [faction]` / `fill [faction]` / `complete <tech> [faction]` | 研究ポイントを足す・研究中の技術を完了にする・技術を前提ごと研究済みにする |
| `relic list [faction]` / `add <relic> [faction] [broken\|repaired]` | アイテムボックスを見る（勢力を付けると遺物ごとの ID・状態・装備している騎士・建設に使っている都市）・遺物を足す |
| `relic summon <city> <relic>` | 遺物なしで召喚ユニットを都市に出す（都市の勢力のもの。手番の条件なし） |
| `summon list [faction]` / `show <summon>` / `hp <summon> <hp>` / `name <summon> <name>` | 召喚ユニットの一覧（HP・能力）・詳細（攻撃力・防御力も）、HP を決める、名前を変える |
| `relic equip <knight> <item> [slot]` / `unequip <knight> [slot]` | 騎士に箱の遺物（`<item>` は `RelicItem.id`。例: `carta-2`）を付ける・外す。手番と侵攻の予約の条件を飛ばす（CPU の勢力の騎士にも付けられる）。枠の既定は付けるときは空いた枠、外すときは 0 |
| `city list [faction]` / `show <city>` / `set <city> <field> <value>` / `fill <city>` | 都市を見る・数値を決める・建設（修復・生産も）に必要な物資を全部入れる（中断も解く。次のターンの初めに完成） |
| `knight list [faction]` / `show <knight>` / `imprison <knight> <city>` | 勢力に仕える騎士の一覧（率いる兵種・装備。召喚ユニットは HP）、騎士の詳細（放浪・傭兵の居所と怨恨勢力、率いる兵種・装備も）、騎士を都市の捕虜にする |
| `mercenary list` / `soldiers <mercenary> <soldiers>` / `standing [value] [faction]` | 全傭兵の状態・居所または雇い主・兵数を見る、兵数を決める、傭兵業界の友好度を見る・決める |
| `wanderer list` | 放浪の騎士の居所と怨恨勢力 |
| `turn end` | 手番の勢力の戦略フェーズを終える |
| `battle win <attacker\|defender>` | 戦闘を決めて結果へ（戦場での退却・殲滅は無かったものとする） |
| `dialogue list` / `play <scene> [入力=値…]` | 会話シーンの一覧と入力、再生（省いた入力はその状態での既定の値。例: `dialogue play hireMercenary merc=101 city=P012`）。コンソールを閉じて再生し、終わると状態に反映する |
| `flag list` / `set <key> <true\|false\|数>` / `clear <key>` | 会話シーンのフラグを見る・決める・消す |
| `scene <title\|strategy>` | シーンを移る |
| `state [path]` | ゲームの状態を JSON で見る（例: `state cities.P012.assignments`） |
| `clear` / `exit` | 画面を消す・閉じる |

- `[faction]` を省くと画面の勢力（`viewFaction`）です。ID の代わりに名前も書けます（`gold set 500 レオニス帝国`）
- `Tab` で補完します。コマンド・ID のほか、`state` のパスも補完し、候補が複数あれば名前つきで並べます。日本語の名前を途中まで書いて `Tab` を押しても ID に補完します
- `↑` `↓` で履歴（再読み込みしても残る）。`Ctrl+A` `Ctrl+E` `Ctrl+U` `Ctrl+K` `Ctrl+L` `Ctrl+C` も使えます

コマンドを足すのは [src/debug/commands.ts](src/debug/commands.ts) の `DEBUG_COMMANDS` です。引数に `candidates` を書けば補完と値の確認がつきます。状態を変える処理は `debugAddRelic` のように `src/game/` に置きます。ターミナル（xterm.js）は初めて開いたときに読み込むので、通常の起動には載りません。

## マイルストーン

作業の目標とTODOは `docs/milestones/` にまとめます。

| ファイル | 内容 |
| --- | --- |
| [m001.md](docs/milestones/m001.md) | プレイヤーの侵攻（ターン・侵攻予約・行軍・戦闘シーン・結果の反映） |
| [m002.md](docs/milestones/m002.md) | 内政（都市の状態・担当・施設・毎ターンの内政処理・成長の演出） |
| [m003.md](docs/milestones/m003.md) | 研究（技術ツリー・研究ポイント・研究担当官・技術の効果） |
| [m005.md](docs/milestones/m005.md) | 傭兵（契約・独立採算）と放浪の騎士 |
| [m006.md](docs/milestones/m006.md) | 会話システム（norden-dialogue。台本と流れ・プレイヤー・エディタ・傭兵の雇用シーン） |
| [m007.md](docs/milestones/m007.md) | 戦闘の拡充（norden-battle。攻撃の汎用化・新兵種・魔法・状態異常・拠点兵器・効果音・CPU・バランス調整。段階ごとに指示を仰ぐ） |
| [m008.md](docs/milestones/m008.md) | CPU の思考（norden-battle。処理の抜き出し・1 手読み・作戦・性格と難易度・対戦シミュレータ）と、ルートへのつなぎ込み |
