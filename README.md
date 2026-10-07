# nordencult

ファンタジーSLG nordencult のゲーム本体。各機能はサブモジュールで開発し、このルートでシーンとして組み合わせます。

| サブモジュール | 内容 |
| --- | --- |
| `norden-strategy` | three.js の戦略マップ |
| `norden-ui` | 情報ウィンドウなどの React UI ライブラリ |
| `norden-battle` | 戦闘（未統合） |
| `nordencult-old` | 分割前の旧実装（参照用） |

```sh
git submodule update --init
npm install
npm run dev
```

`npm run build` で型チェックとビルド、`npm run lint` でルートの `src/` を検査します。

main への push で GitHub Pages に公開します（`.github/workflows/deploy.yml`）。CIでは `norden-strategy` と `norden-ui` のサブモジュールだけを取得してビルドします。

## サブモジュールの参照

`norden-strategy` と `norden-ui` はビルドせず、ソースを直接読み込みます（`vite.config.ts` のエイリアスと `tsconfig.app.json` の `paths`）。サブモジュールの変更はそのまま開発サーバーに反映されます。

- `import { MapView, CITY_MAP } from 'norden-strategy'` → `norden-strategy/src/index.ts`
- `import { CITY_LIST, ROAD_LINKS } from 'norden-strategy/data'` → `norden-strategy/src/data.ts`（データだけ。three.js を読み込まないので `src/game/` はこちらを使う）
- `import { InfoWindowWithTabs } from 'norden-ui'` → `norden-ui/src/index.ts`

公開APIは各 `src/index.ts` にまとめ、ルートから内部のファイルは直接参照しません。
React・React DOM・three はルートの `node_modules` に一本化します（Vite の `resolve.dedupe`）。サブモジュールの依存とバージョンを揃えてください。
各サブモジュールは従来どおり単体で `npm run dev` できます。地図の描画設定の調整は `norden-strategy` 単体の画面で行います（ルートとはポートが違うため、ブラウザに保存した設定は共有されません）。

## シーン

`src/scenes/` で画面をシーンとして切り替えます。シーンを離れるとアンマウントされ、地図の WebGL 資源なども破棄されます。各シーンは初めて表示する時に読み込みます。

| シーン | 内容 |
| --- | --- |
| `title` | タイトル画面（仮） |
| `strategy` | 戦略マップ＋HUD（ターン・手番・侵攻予約）＋都市情報ウィンドウ。都市をクリックで選択、空き地のクリックで解除。行軍フェーズでは軍団が進み、到着すると `battle` へ |
| `battle` | 戦闘（`{ battleId }`）。攻守の勢力と騎士、デバッグ用の勝敗ボタン（戦闘マップは未実装） |
| `battleResult` | 戦闘結果（`{ battleId }`）。勝敗・拠点の所属の変化・騎士の移動。「戦略マップへ」で行軍フェーズの続きへ |

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
| `src/scenes/strategy/CityWindow.tsx` | norden-ui の情報ウィンドウによる都市情報・騎士・街道タブ |
| `src/scenes/strategy/Hud.tsx` | ターンのバー（「ターン終了」）・予約一覧・案内の帯 |
| `src/scenes/strategy/InvasionWindow.tsx` | 侵攻する騎士の選択 |

## ゲームの状態

`src/game/` にゲームの状態（ターン・フェーズ・都市の所属・キャラクターの所属・侵攻予約・行軍・直近の戦闘）と、それを変える純粋な関数（状態 → 新しい状態）をまとめます。React と地図からは独立しています。

| ファイル | 役割 |
| --- | --- |
| `src/game/types.ts` | `GameState` などの型 |
| `src/game/setup.ts` | 初期状態（都市・キャラクターの初期配置）、`?faction=` の読み取り |
| `src/game/queries.ts` | 状態の問い合わせ（手番の順・都市の騎士・侵攻先・予約の条件） |
| `src/game/actions.ts` | 予約の追加・取消、手番の終了、戦闘の開始、`resolveBattle`（戦後処理） |
| `src/game/store.ts`, `gameContext.ts` | `App` に置くストアと `useGame()`（シーンを切り替えても状態が残る） |
| `src/game/world.ts` | 都市・勢力・街道のつながり（`ROAD_LINKS` から） |

シーンからは `const { state, update } = useGame()` で読み、`update((s) => addOrder(s, draft))` のように変えます。規則に反する操作は `GameRuleError` を投げます。

キャラクターのマスターデータは `src/data/characterData.json`（旧実装から移植）、初期配置は `src/data/characterStart.json`、顔・全身の画像は `src/components/CharacterImage.tsx`（`src/assets/character.webp` のスプライト）です。

`npm test` で `src/` の単体テスト（Vitest）を実行します。

## マイルストーン

作業の目標とTODOは `docs/milestones/` にまとめます。

| ファイル | 内容 |
| --- | --- |
| [m001.md](docs/milestones/m001.md) | プレイヤーの侵攻（ターン・侵攻予約・行軍・戦闘シーン・結果の反映） |
