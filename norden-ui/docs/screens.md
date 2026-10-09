# 画面の追加

画面は基本部品（`src/components/`）を組み合わせた、1画面分の表示専用のUIです。ゲームの状態を読まず、view型とコールバックだけを受け取ります。

1. `src/screens/<name>/<Name>Screen.tsx` を作る
   - 最上位を `<div className="norden-screen norden-<name>">` にし、`../screens.css` を読み込む。レイヤーは配置先いっぱいに広がり、ポインターを通す
   - HUDの部品は配置用の領域に置く: `norden-screen-top-left` / `-top-center` / `-top-right` / `-bottom-center` / `-bottom-right`（案内の帯は `-top-center norden-screen-banner`）。領域の子だけがポインターを受ける
   - ウィンドウは `InfoWindow` の `x` / `y` で置き、初期位置をpropsで変えられるようにする
   - ホストが追加のHUDを重ねられるよう `children` を受けて最後に描く
2. 表示用のデータが新しければ `src/screens/types.ts` にview型を足す。ゲームの用語（ID・名前・画像URL・表示用の数値）だけを持たせ、規則の判定はホストに任せる（例: 侵攻画面の `validate`、都市コマンドの `commandState`）
3. `src/index.ts` から画面とpropsの型を公開する
4. 単体テストを `src/screens/<name>/<Name>Screen.test.tsx` に書く（ARIAのロールと名前で操作する）
5. カタログに載せる
   - `demo/entries/<Name>Entry.tsx` を作り、`Workbench variant="screen"` の `stage` に `MockMap` と画面を置く。コールバックは `useLog()` でログに出す
   - `demo/catalog.tsx` の「画面」に登録する（`id` が `#<id>` になる）
   - 他の画面と行き来するなら、`demo/entries/StrategyFlowEntry.tsx` の `StrategyScreens` に画面とparamsを足し、`ScreenHost` の `screens` に描き方を足す

## 画面スタックへの組み込み

```tsx
type StrategyScreens = {
  cityCommand: { cityId: string }
  pickTarget: { from: string }
  invasion: { from: string; to: string }
  recruit: { cityId: string }   // 追加した画面
}

// 都市コマンドの「募兵」で開き、終わったら戻る
onCommand={(id) => id === 'recruit' && nav.push('recruit', { cityId })}
recruit: ({ cityId }) => <RecruitScreen /* … */ onDone={nav.pop} />
```

- 1段戻るのは `nav.pop()`（Escでも同じ）。何段か積んだ後に元の画面へ戻るのは `nav.popTo('cityCommand')`
- 地図で何かを選ぶ段は `MapPickScreen` を積み、候補の強調と選択はホストの地図が `nav.top` を見て行う
- 画面の中でEscを使う（メニューを閉じるなど）ときは `event.preventDefault()` して、`ScreenHost` が戻らないようにする
