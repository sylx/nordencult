# 主題＋和声を選び、洗練する作曲工房

1曲ごとに**プロジェクト**を作り、ブリーフ（用途・イメージ）、主題・和声・編曲の組、各組への感想をまとめて残す。ユーザーは主題と和声を一緒に聴いて選ぶ。次の順序を守る。

0. ユーザーが作曲工房の「新しいプロジェクト」でブリーフを書き、依頼文をAIに送る。AIはプロジェクトを登録し、1の主題集を作る。
1. **名前付きの主題を一気に5案以上**作る。すべて最初から和声・低音・伴奏付き。見込みがある案がなければ、新しい主題を5案以上出し直す。
2. ユーザーが選んだ主題から、**名前付きの和声のバリエーションを5案**作る。主題＋和声としてプレビューする。気に入る組み合わせがなければ、さらに和声を5案出す。主題自体を見直したければ1へ戻る。
3. ユーザーが選んだ**主題＋和声をオーケストレーション**する。編曲版をプレビューする。組み合わせを見直すなら2へ、編曲の問題なら同じ組み合わせで改稿する。

「旋律のみ」を先に選ぶ工程や、2案のA/B比較を必須にしない。ユーザーが選ぶ前にAIが勝手に次の段階へ進めない。

## 画面の使い方

```sh
cd norden-synth  # 既にこのディレクトリなら不要
npm run dev
```

「作曲工房」タブ (`#composition`) を開く。通常の曲一覧には試案を混ぜない。

- 上の「プロジェクト」で作業する曲を選ぶ。「＋ 新しいプロジェクト」では、プロジェクト名・用途/場面・欲しいイメージ・避けたいこと・参考曲（曲一覧から選び、良いところを書く）を入力し、最初の主題5案以上を依頼する文を作る。下書きはこのブラウザに保存される。
- プロジェクトを開くと、ブリーフと「プロジェクトの履歴」（全ての組・派生元・記録済みの感想）が見られる。履歴の「開く」で、その組を派生関係ごと表示する。

- 各カードは名前付きの1候補。再生すると主題と和声を同時に聴ける。別の候補を再生すると前の再生を止め、曲頭から再生する。ループも可能。
- 「残したい点・変えたい点」は候補ごとのメモ。「この組への要望」は全案への感想や出し直しの理由。
- 見込みのある主題の「この主題から和声を5案依頼」で2へ進む。和声案の「この主題＋和声で編曲を依頼」で3へ進む。既に派生案がある場合は、その一覧を開く。
- 「見込みなし・新しい主題を5案以上依頼」「和声の別案をさらに5つ依頼」で同じ段階を繰り返す。
- 選択・メモを含む**依頼文をコピーして、このチャットのAIに送る**。作曲はこのコーディングエージェントが行う。画面のボタンだけでモデルを呼び出したり自動生成したりはしない。
- AIが候補を追加すると、該当段階の最新の組に表示される。開いている画面が更新されなければ再読み込みする。「候補の組」で以前の案へ戻れ、「最新の組を表示」で新しい組へ移れる。
- 選択した主題・和声、メモ、依頼履歴はこのブラウザの localStorage にプロジェクトごとに保存する。リポジトリへ自動保存はしない。AIはコピーされた依頼文に含まれる情報を読み、感想はプロジェクトの `feedback.ts` に記録する。
- タブ移動時は再生を停止する。読み込み待ちの再生も取り消す。

既存のプロジェクト「戦略画面のBGM」(`strategy-screen`) は、プロジェクト化以前の主題集 01–05 から「国境線の斥候」を採用し、曲一覧に登録したところまでの記録。

## プロジェクトの構成

```text
composition/preferences.json            全プロジェクト共通の好み（優先事項・参考曲）
src/composition/projects.ts             PROJECTS — プロジェクトの一覧
src/composition/projects/<id>/
  project.ts                            id・title・brief・adoptedSongId・batches・feedback
  feedback.ts                           各組への感想（ユーザーの発言のみ）
  themes-001.ts など                    候補集
```

`brief` は画面で入力された値をそのまま書く。AIの解釈を足さない。`adoptedSongId` は完成曲を `SONGS` に登録したときだけ付ける。

## 新しいプロジェクトを始めるとき

依頼文のブリーフ（JSON）をそのまま使い、`src/composition/projects/<id>/project.ts` を作って `PROJECTS` の末尾に登録する。id は英小文字・数字・ハイフンで既存と重ねない。`feedback.ts` は空配列で作る。そのうえで最初の主題集（stage: themes）を作る。

```ts
import type { CompositionProject } from '../../workflow.ts'
import { feedback } from './feedback.ts'
import { firstThemes } from './themes-001.ts'

export const councilRoom: CompositionProject = {
  id: 'council-room',
  title: '作戦会議のBGM',
  brief: { purpose: '…', image: '…', avoid: '', references: [{ songId: 'masked-passepied', notes: '…' }] },
  batches: [{ id: 'council-room-themes-001', title: '主題集 01 — …', stage: 'themes', candidates: firstThemes }],
  feedback,
}
```

## AIが次の組を追加するとき

最初に `composition/preferences.json`、依頼文のプロジェクトの `project.ts`（ブリーフ）と `feedback.ts`、指定された派生元を読む。ユーザーの発言と、AI自身の仮説を混同しない。指定された段階の候補だけを作る。

依頼文に要望・試聴メモがあれば、対象の組の `batchId` を付けて `feedback.ts` の末尾に記録する。`userWords` などにはユーザーの発言だけを書き、選ばれた候補があれば `preferred` にその id、なければ `neither`。

そのプロジェクトの `project.ts` の `batches` の末尾に追加する。既存の組・候補を上書きせず、全プロジェクトで一意のIDを付ける（新しいプロジェクトでは id にプロジェクト名を含めると重なりにくい）。曲は既存の `Song` 形式なので、音符・休符・タイ・拍子をそのまま使える。候補集は同じディレクトリの別ファイルに分けて import する。

```ts
import type { CompositionBatch } from '../../workflow.ts'

// 初回または主題の出し直し: 5案以上。parentId は付けない。
const themes: CompositionBatch = {
  id: 'themes-002', title: '主題集 02 — 長い歌の候補', stage: 'themes',
  candidates: [theme1, theme2, theme3, theme4, theme5],
}

// 選ばれた主題から和声を5案。派生元は必ず主題候補の song.id。
const harmonies: CompositionBatch = {
  id: 'snowlight-harmony-001', title: '雪明かりの帰路 — 和声案 01',
  stage: 'harmony', parentId: 'snowlight-return',
  candidates: [harmony1, harmony2, harmony3, harmony4, harmony5],
}

// 選ばれた和声案から編曲。派生元は必ず和声候補の song.id。
const arrangement: CompositionBatch = {
  id: 'snowlight-orchestration-001', title: '雪明かりの帰路 — 編曲 01',
  stage: 'orchestration', parentId: 'snowlight-harmony-03',
  candidates: [orchestratedSong],
}
```

`candidates` の各要素は `CompositionStudy`。

```ts
{
  song: mySong, // 名前・説明・主旋律・和声・低音を持つ実際に鳴る曲
  melodyPart: 'melody', // 和声改稿で主旋律を保つための明示的な声部
  hypothesis: 'この案の音楽的な特徴を短く説明する',
  phrases: [
    { label: '呼びかけ', from: 1, to: 4, intention: '最初の動機から長い歌を開く' },
    { label: '応答', from: 5, to: 8, intention: '低音を変え、違う響きで戻る' },
  ],
  moments: [
    { bar: 5, beat: 0, pitches: ['D3', 'F#3', 'A3'], intention: '長調の着地点を譜面で確認' },
  ],
}
```

- 主題案は単なる移調や伴奏の差し替えで数を埋めず、旋律の輪郭、句の長さ、リズム、和声の発想などを変える。8–16小節程度を目安に、短いながらも呼びかけ・応答・展開が聴ける形にする。
- 主題の各候補には、その旋律に合う和声を最初から書く。全候補を同じ伴奏に押し込まない。
- 和声案では、派生元の旋律の音程・発音位置・音価・テンポ・拍子を保つ。低音、内声、コード進行、伴奏の置き方を変える。コード名だけの変更は不可。テンションを増やす案ばかりでなく、響きを絞る案・着地を変える案などを考える。
- 和声案を出し直すときも `parentId` は元の主題ID。同じ親に複数の組を追加できる。以前の案への感想を反映し、似た案の再提出で埋めない。
- 編曲は、採用された主題＋和声の関係を保ちながら構成を広げてよい。編曲を出し直す場合は同じ和声候補を `parentId` として新しい組を追加する。
- 通常のプレビューは Song 全体をそのまま再生する。主題・和声の段階はピアノなどの簡潔な編成、編曲の段階は実際の楽器編成で聴けるようにする。
- 完成曲として採用されたときにだけ `src/songs/` と `SONGS` に追加する。作曲工房で試聴できることと、本編への採用は別。
- 実際に聴いていなければ未試聴と伝える。ブラウザでの動作確認はユーザーが行うため、AIは行わない。

## 検証と作曲依頼のCLI

```sh
npm run compose -- brief
npm run compose -- projects
npm run compose -- list strategy-screen
npm run compose -- request strategy-screen themes
npm run compose -- request strategy-screen harmony snowlight-return
npm run compose -- inspect masked-passepied fl 3 14
npm run compose -- review all
npm test
npm run build
```

`review` は候補集の構造、音符、句の範囲、指定した音を調べる。プロジェクトのIDと参考曲、5案以上あること、名前とIDが重ならないこと、和声案の主題が派生元から変わっていないことも確認する。好みや曲の良さは採点しない。

`inspect` は音域・音価・音程・移調を含む4発音の反復を調べる診断。反復件数の最大化は目標にしない。参照曲の構造を考える補助に使い、旋律単独の評価工程をユーザーに要求しない。

`moments` は任意の譜面チェック。小節番号は intro + loop 1周を通した1始まり、拍は四分音符単位の0始まり。指定音はオクターブ付きで書くが、比較はピッチクラス。gateを1としてタイを含む譜面上の持続を読むため、残響・音量・実際の最低音・転調の説得力までは検証しない。指定していない箇所も検査対象外。`chords` は表示文字列なので、そこにテンション名を書くことと実際に鳴ることは別。

`--json` を末尾に付けると `inspect` / `review` / `request` はJSONを出力する。必要なら `npm run --silent compose -- review all --json` で npm の見出しを消す。
