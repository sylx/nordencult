# nordencult

ファンタジーSLG nordencult のゲーム本体。各機能はサブモジュールで開発し、このルートでシーンとして組み合わせます。

| サブモジュール | 内容 |
| --- | --- |
| `norden-strategy` | three.js の戦略マップ |
| `norden-ui` | React UI ライブラリ（基本部品・画面・画面スタック。カタログで各画面を作り込む） |
| `norden-battle` | 戦闘。`battle-runtime`（戦闘画面 `BattleScreen`。地形・戦闘記録・行動メニューは norden-ui の部品）・`map-runtime`（HEX マップの描画）・`assets/maps/`（戦闘マップ）を使う |
| `norden-data` | 拠点データ・勢力データ・騎士データ・施設データ・セリフのエディタ（`src/data/`・`src/assets/` などに書き出す。開発時だけ使う） |

```sh
git submodule update --init
npm install
npm run dev
```

`npm run build` で型チェックとビルド、`npm run lint` でルートの `src/` を検査します。

main への push で GitHub Pages に公開します（`.github/workflows/deploy.yml`）。CIでは `norden-strategy`・`norden-ui`・`norden-battle` のサブモジュールだけを取得してビルドします（`norden-battle` の Git LFS のファイルは取得しません）。

## サブモジュールの参照

`norden-strategy`・`norden-ui`・`norden-battle/battle-runtime`・`norden-battle/map-runtime` はビルドせず、ソースを直接読み込みます（`vite.config.ts` のエイリアスと `tsconfig.app.json` の `paths`）。サブモジュールの変更はそのまま開発サーバーに反映されます。

- `import { MapView, CITY_MAP } from 'norden-strategy'` → `norden-strategy/src/index.ts`
- `import { PLACE_POINTS, ROAD_LINKS } from 'norden-strategy/data'` → `norden-strategy/src/data.ts`（データだけ。three.js を読み込まないので `src/game/` はこちらを使う）
- `import { generateWorld, WorldSampler } from 'norden-strategy/world'` → `norden-strategy/src/world.ts`（マクロ地形の生成と読み取り。three.js を読み込まない。街道マップの生成に使う）
- `import { BattleScreen } from '@norden/battle-runtime'` → `norden-battle/battle-runtime/src/index.ts`（戦闘画面。battle-editor と同じもの。中で `norden-ui` と map-runtime を使う）
- `import { MapView } from '@norden/map-runtime/render/mapView'` → `norden-battle/map-runtime/src/render/mapView.ts`（パッケージの `exports` と同じ対応。依存の `simplex-noise` はルートに入れてある）

戦闘マップ（`norden-battle/assets/maps/`）は、map-runtime の Vite プラグイン（`mapsPlugin`、読み取り専用）でページの `maps/` として配信し、ビルドでは `dist/maps/` にコピーします。

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
| `strategy` | 戦略マップ＋norden-ui の画面スタック（都市コマンド → 侵攻先の選択 → 侵攻画面、都市コマンド → 移動先の選択 → 移動画面。Escで1段戻る）。都市をクリックでその都市の都市コマンド画面へ。進行フェーズでは、まず全勢力の移動が進み、続いて侵攻の軍団が進んで、到着すると `battle` へ |
| `battle` | 戦闘（`{ battleId }`）。戦闘画面（battle-runtime の `BattleScreen`）、攻守の勢力と騎士、デバッグ用の勝敗ボタンと使ったマップの表示。決着のウィンドウの「戦闘の結果へ」で `battleResult` へ |
| `battleResult` | 戦闘結果（`{ battleId }`）。勝敗と決着の理由（入城・殲滅/退却）・拠点の所属の変化・騎士の移動。「戦略マップへ」で進行フェーズの続きへ |

起動時は `strategy` を表示します。`?scene=title` で開始シーンを指定できます（パラメーターの無いシーンだけ）。`?faction=leonis` のようにプレイヤーの勢力を指定できます（既定はカルタ書院 `carta`）。

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
| `src/scenes/strategy/StrategyScene.tsx` | 地図と画面スタック（`cityCommand` / `pickTarget` / `invasion` / `pickMoveTarget` / `move` / `domestic`）。地図の強調は表示中の画面（`nav.top`）から決める。進行フェーズの移動の演出（`movementLegs` を地図の `march()` で動かし、着いたら `runMovements`） |
| `src/scenes/strategy/views.ts` | ゲームの状態 → norden-ui のview型（`CityView`・`KnightView`・`TurnView`・`BuildingView`）。施設の画像は `src/assets/buildings.webp` 上の位置（`buildingSprite.json`）で渡す |
| `src/scenes/strategy/OrderList.tsx` | 行動予約（侵攻予約・移動予約・移動中の騎士）と進行フェーズの一覧。norden-ui の `ActionOrders` に渡す（都市コマンド画面に重ねるHUD） |
| `src/scenes/battle/BattleScene.tsx` | 戦闘マップを読み込み、battle-runtime の `BattleScreen` に渡す（アンマウントで破棄）。ユニットはまだ置かない（置くときはマップの `units` と `statuses` で渡す）。退却先の拠点（`retreatCities`）を軍ごとに渡し、退却した・捕虜になった部隊（`RetreatReport`）を `BattleRetreat` にして、決着（`onEnd`）またはデバッグの勝敗のボタンで `resolveBattle` に渡し、結果の画面へ進む |
| `src/scenes/battle/battleMap.ts` | 戦闘マップの選択。攻撃元と目標の街道マップ `road-<小さい ID>-<大きい ID>.json` から目標の範囲（`battleAreas[目標]`）を切り出す。無ければ `fluen.json` 全体（コンソールに警告） |

## ゲームの状態

`src/game/` にゲームの状態（ターン・フェーズ・都市の所属・都市の状態・勢力の金・キャラクターの所属・侵攻予約・移動予約と移動中の騎士・行軍・直近の戦闘と内政処理）と、それを変える純粋な関数（状態 → 新しい状態）をまとめます。React と地図からは独立しています。

| ファイル | 役割 |
| --- | --- |
| `src/game/types.ts` | `GameState` などの型 |
| `src/game/setup.ts` | 初期状態（都市・キャラクターの初期配置）、`?faction=` の読み取り |
| `src/game/queries.ts` | 状態の問い合わせ（手番の順・都市の騎士・侵攻先・予約の条件・残りの兵・戦闘からの退却先） |
| `src/game/army.ts` | 兵の仮の規則（1部隊の兵数の上限・既定の兵科・間接指揮部隊は軍団長の能力の半分・練度の加重平均） |
| `src/game/actions.ts` | 予約の追加・取消、手番の終了、戦闘の開始（その前に移動を済ませる）、`resolveBattle`（戦後処理）、次のターンの開始（内政処理を含む） |
| `src/game/movement.ts` | 移動: 経路（`moveRoute`）と月数（`moveMonths`）、移動先（`moveTargets`）、予約の追加・取消と条件、進行フェーズの移動（`runMovements`）とその演出用の1ヶ月分の道のり（`movementLegs`） |
| `src/game/economy/balance.ts` | 内政の定数（金・俸禄・Tier の閾値とスロット・領主の補正・担当官の予算と係数・人口の成長・募兵・出撃の費用）。すべて仮の値 |
| `src/game/economy/output.ts` | `cityOutput`: 都市の Tier・スロット・実効の商業と生産・領主と施設の補正・担当官の能力と次のターンの見込み・収入・成長・訓練・募兵の上限（内政処理と画面の見込みで共有） |
| `src/game/economy/runEconomy.ts` | `runEconomy`: 毎ターンの内政処理（金と俸禄 → 担当官の内政 → 物資と建設 → 練度と募兵 → 人口と Tier）と、演出用の結果 `lastEconomy` |
| `src/game/economy/domestic.ts` | 内政の操作（担当の割り当て・解除、担当官の予算、着工・中止、募兵、輸送）と、できない理由を返す `…Problem` |
| `src/game/store.ts`, `gameContext.ts` | `App` に置くストアと `useGame()`（シーンを切り替えても状態が残る） |
| `src/game/world.ts` | 都市・勢力・街道のつながり（`ROAD_LINKS` から） |

シーンからは `const { state, update } = useGame()` で読み、`update((s) => addOrder(s, draft))` のように変えます。規則に反する操作は `GameRuleError` を投げます。

侵攻予約は騎士ごとの兵科と兵数（`InvasionOrder.units`）を持ちます。予約できる兵数は出発する都市の兵数（`CityState.troops`）のうち、このターンにまだ予約していない分です。1部隊の兵数は騎士・間接指揮部隊とも一律1000まで（`MAX_SOLDIERS`）、兵科の既定は種別から決めます（`src/data/unitTypes.ts`）。

### 移動

軍事 → 移動で、自勢力の都市から騎士（複数）を自勢力のほかの都市へ移します。地図で移動先（自勢力のすべての都市。隣接していなくてよい）を選び、移動画面（norden-ui の `MoveScreen`）で騎士と、持っていく兵数・物資を決めて予約します（`addMoveOrder`。予約は手番のうちなら取り消せる）。騎士は着いた都市の所属になります。

- 経路は街道の最短経路で、なるべく自勢力の都市だけを通ります（通れなければ他勢力の都市も通る。`moveRoute`）。兵と物資を連れた移動は街道1区間に半月（1ヶ月に2区間。`MOVE_HOPS_PER_MONTH`）かかり、移動画面に月数を出します
- 単騎移動（`MoveOrder.solo`）は兵と物資を運ばない代わりに、どれだけ遠くても2ヶ月以内に着きます（1ヶ月に2区間進み、最長2ヶ月）（`SOLO_HOPS_PER_MONTH`・`SOLO_MAX_MONTHS`）
- 進行フェーズ（旧称: 行軍フェーズ。状態の `phase` は `'march'` のまま）の初めに、全勢力の移動をまとめて1ヶ月分進めます（`runMovements`）。その月に予約した移動はここで出発し、騎士は出発した都市と担当（領主・内政担当官）を離れ、兵と物資が都市から引かれます。移動中の騎士はどの都市にもいません（`CharacterState.cityId` が null で勢力はそのまま。`GameState.movements` に経路の残りと残りの月数）。着いた移動は、騎士がその都市に入り、兵（練度は兵数で加重平均）と物資がその都市に加わります
- 移動は侵攻の戦闘より先に済ませるので、その月に着く騎士は着いた都市の防衛戦闘に加わります
- 行動予約のウィンドウ（右上。norden-ui の `ActionOrders`）に、侵攻予約（侵攻元 → 侵攻先、軍団長 以下N名、取消）と移動予約（移動元 → 移動先、担当の騎士、取消）を並べます。月をまたいで移動中のものは出発した拠点から書き、取消の代わりに残りの月数を出します
- 移動先の都市が奪われていたら、いまいる場所からいちばん近い自勢力の都市へ向かい直します。勢力の都市が無くなれば騎士は在野になり、兵と物資は失われます
- 地図では、進行フェーズに全勢力の移動の1ヶ月分の道のりを移動のマーカーで見せます（兵と物資を連れた移動は侵攻と同じ軍団のマーカー、単騎移動は使者のマーカー）。戦略フェーズには、プレイヤーの移動予約と全勢力の移動中の騎士の残りの経路を街道の強調で出します。街道の強調の色は勢力によらず、移動は青、侵攻は赤です（地図上を動くマーカーは勢力の色）

### 内政

都市の状態（`GameState.cities` の `CityState`: 人口・基礎の商業と生産・備蓄物資・兵数・練度・施設・建設中・担当・担当官の予算）と勢力の金（`GameState.gold`）を持ちます。都市のマスターデータ（`src/data/city.ts`）は初期値（基礎の商業・生産を含む）だけを持ちます。Tier と施設のスロット数は人口から求めます（`tierOf`・`slotsOf`）。規模の表示（Tier 1 は小さな町、Tier 2 は大きな街、Tier 3 は大都市）と地図の絵も Tier に合わせて変わります。聖地・要塞（拠点データの `image`）は規模と絵が変わらず、施設のスロットは Tier によらず `FIXED_SLOTS`（4）です。

- 担当: 領主（1人。`commandRank` の「領主」）と内政担当官（商業・生産・訓練・募兵にそれぞれ2人まで。能力は役職ごとの重みで平均し、2人なら合算する。領主は担当官になれない）。初期の領主は `characterStart.json` の `isLord` の騎士。騎士が都市を離れると担当から外れ、攻め落とされた都市の担当は空になります
- 毎ターンの内政処理（`runEconomy`）は、進行フェーズを解決しきって次のターンの戦略フェーズに入る直前に、全勢力の全都市をまとめて行います。領主の能力で商業・生産が伸びます（実効値への補正）。人口は、担当官が上げたあとの基礎の商業・生産、建っている施設の数、領主の政治と魅力から伸び（`populationGrowth`。係数は `balance.ts` の `POP_GROWTH_*`）、Tier と施設のスロットも人口に応じて上がります（10000 で Tier 2、30000 で Tier 3）。商業・生産・募兵の担当官は、都市が役職ごとに割り当てた予算（`CityState.affairsBudget`。1000まで。割り当てたときに国庫から移し、減らすと戻る。`setAffairsBudget`）から毎ターン 80〜150 の乱数の金を使い、商業・生産の基礎値を上げ（政治2・知力1）、兵を集めます（魅力3・武力1。新兵の練度で混ざる）。訓練担当官は金を使わずに練度を上げます（武力2・統率1）。式と係数は `balance.ts` の `AFFAIRS_*`・`GROWTH_COEF_*`。施設の効果でも各値が伸びます
- 施設のマスターデータは `src/data/buildingData.json`（`src/data/buildings.ts`）。1都市に同じ施設は1つ、建設中は1件だけで、建設中は都市の生産をすべて建設に回します

戦闘からの退却: 戦闘画面では、部隊は戦場の拠点に街道でつながる自勢力の拠点（`retreatCities`。攻撃側には出撃元も入る）へ退却でき、隣接する敵の数に応じて失敗すると捕虜になります。戦闘画面は結果を部隊ごとに知らせ（battle-runtime の `RetreatReport`）、戦闘シーンが `BattleRetreat`（陣営・騎士・退却先・捕虜になったか）にして `resolveBattle` に渡します。退却した騎士は勝敗に関わらず選んだ拠点へ移り、捕虜になった騎士はまだ扱いが決まっていないので、そのままにして戦闘の結果（`BattleReport.retreats`）と結果画面の「捕虜」に出すだけです。いまの戦闘の部隊は騎士と結び付いていない仮の部隊なので、騎士は null になります（部隊の ID を騎士の ID で作れば結び付きます）。

殲滅されたときの捕縛: 兵数が 0 になった部隊の指揮官は、隣接する敵の数に応じて捕縛され捕虜になります（0: 10%・1: 30%・2: 50%・3 以上: 75%）。戦闘画面は結果を部隊ごとに知らせ（battle-runtime の `WipeoutReport`）、戦闘シーンが `BattleWipeout`（陣営・騎士・捕虜になったか）にして `resolveBattle` の最後の引数に渡します。捕縛された騎士は退却に失敗した騎士と同じくそのままにして、戦闘の結果（`BattleReport.wipeouts`）と結果画面の「捕虜」に出すだけです。捕縛されなかった騎士は落ち延びて、陣営のほかの騎士と同じに扱います。

戦闘の決着: 戦闘画面（battle-runtime の `victory.ts`）は、どちらかの陣営の部隊がすべて殲滅・退却（捕虜を含む）するか、攻撃側のユニットが防衛拠点（街道マップの `strongholds[防衛する都市]`。map-editor の「防衛拠点」で置く。城の中心部の HEX）で行動を終える（もう行動できなくなる・拠点にいるまま番を終える。入城）と決着し、カットインと決着のウィンドウを出します。カットインはプレイヤーの勢力が勝てば勝利（norden-ui の `battle-win`）、負ければ敗北（`battle-lose`）で、プレイヤーの勢力がいない戦闘では勝利です（`playerSide`。文字はテンプレートのまま）。そのボタン「戦闘の結果へ」で、戦闘シーンが勝った陣営・退却の結果・決着の理由（`BattleEndReason`）を `resolveBattle` に渡して結果の画面へ進みます（理由は `BattleReport.reason`。デバッグのボタンで決めたときは null）。防衛拠点の無い戦場は入城では決着しません。

拠点の初期データ（人口・商業・生産・初期の所属・固定の絵。省略可能な初期の備蓄・兵数・練度・施設）は `src/data/cityData.json`（`src/data/city.ts`）です。地図はゲームから渡された都市（名前・絵・所属。`views.ts` の `mapCities` を `MapView` の `cities` に渡す）を、`norden-strategy` の `PLACE_POSITIONS` の位置に描きます。地図に都市の写しはありません。拠点を増やしたら、`PLACE_POSITIONS` に位置を足してください（無いと `src/data/city.test.ts` が落ちます）。

勢力のマスターデータ（名前・紋章・当主の呼び名・色・初期の金）は `src/data/factionData.json`（`src/data/faction.ts`）です。一覧の順が手番の順（プレイヤーの勢力が先）で、初期の金を省略した勢力は `INITIAL_GOLD`（`src/game/economy/balance.ts`）で始まります。地図の紋章は `norden-strategy` の `FACTION_LIST`（ID・名前・紋章だけの写し）を使います。食い違うと `src/data/faction.test.ts` が落ちるので、勢力の ID・名前・紋章・並び順を変えたら写しも直してください。紋章の画像は `norden-strategy/data` の `emblemImage`（番号で引く）です。

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
