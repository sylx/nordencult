# norden-synth

Web ゲームの BGM 用の、PCM (サンプル) ベースのシンセサイザ。
SoundFont 2 から必要な音色だけを取り出してゲーム向けの軽いデータに変換し、Web Audio API で鳴らす。
最終的にはこの上で楽曲のプロシージャル生成を試すことを目標にしている。

BGM 用途なので、低遅延より「時刻を指定して先読みで予約する」再生を前提にしている。

## 現状

- [x] SF2 → 楽器データ (JSON + Ogg Vorbis) の変換ツール
- [x] Web Audio によるサンプラー (エンベロープ・フィルタ・ループ・リバーブ)
- [x] 音色の試聴・鍵盤演奏・シーケンサのデモ・BGM 生成ができるテストページ
- [x] テンポ/小節単位で先読み再生するシーケンサ
- [x] 楽曲のプロシージャル生成 (エキゾチックなスケールと転調・変拍子)

## 使い方

```sh
npm install
npm run dev                # テストページ (http://localhost:5173 。タブは #sequencer / #bgm)
npm run build:instruments  # soundfonts/*.sf2 から public/instruments/ を作り直す (ffmpeg が必要)
npm run typecheck
npm test                   # テンポマップ・シーケンサ・BGM 生成のテスト (Node)
npm run build
```

`public/instruments/` を作り直してファイルが増えた場合は、dev サーバーを再起動する
(Vite は public 配下のファイル一覧を起動時に読むため)。

## ディレクトリ構成

```
soundfonts/FluidR3_GM.sf2   変換元 (ブラウザには配信しない)
tools/sf2-extract/          SF2 → 楽器データの変換ツール (Node, TypeScript をそのまま実行)
  sf2.ts                      SF2 パーサ
  flatten.ts                  プリセット/インストゥルメントの 2 階層を平坦なリージョンに変換
  main.ts                     サンプルの連結・エンコード・検証・出力
public/instruments/         生成された楽器データ (コミット対象)
src/synth/                  シンセ本体
  types.ts                    楽器データの型 (変換ツールと共有)
  instrument.ts               楽器データの読み込み・デコード
  voice.ts                    1 リージョン分の発音 (ノード構成)
  envelope.ts                 SF2 の DAHDSR エンベロープ
  loop.ts                     ループの継ぎ目のクロスフェード
  reverb.ts                   リバーブのインパルス応答の合成
  synth.ts                    Synth / Channel (公開 API)
  tempo.ts                    テンポマップ (拍 ⇔ 時刻の変換、テンポのランプ)
  sequencer.ts                小節単位で先読み再生するシーケンサ
src/music/                  プロシージャル BGM 生成
  scales.ts                   スケール (旋法) の一覧と調
  form.ts                     拍子・調・盛り上がりの選び方 (転調の計画)
  harmony.ts                  和音の選び方とピボット和音
  melody.ts                   リードのメロディ (動機の展開・装飾音)
  parts.ts                    その他のパートと編成
  params.ts                   調整用パラメータの定義
  composer.ts                 Sequencer につなぐ作曲者
src/main.ts                 テストページ
src/sequencer-demo.ts       テストページのシーケンサのデモ曲
src/bgm-page.ts             テストページの BGM 生成タブ
test/                       node --test で動かすテスト
```

## 音色

`soundfonts/FluidR3_GM.sf2` は FluidR3_GM から管弦楽器・ティンパニ・クワイアの 10 音色を抜き出したもの (約 32MB)。
変換後は合計約 4.2MB。

| Program | 音色 | サイズ |
|---:|---|---:|
| 0 | Yamaha Grand Piano | 0.96 MB |
| 40 | Violin | 0.36 MB |
| 41 | Viola | 0.47 MB |
| 42 | Cello | 0.61 MB |
| 43 | Contrabass | 0.20 MB |
| 45 | Pizzicato Section | 0.36 MB |
| 46 | Harp | 0.20 MB |
| 47 | Timpani | 0.16 MB |
| 52 | Ahh Choir | 0.67 MB |
| 53 | Ohh Voices | 0.18 MB |

FluidR3_GM は MIT License (Frank Wen, Toby Smithe)。

## 楽器データの形式

音色ごとに次のファイルを出力する (型は `src/synth/types.ts`)。

- `<id>.json` — サンプルの位置・ループ点と、リージョン (キー/ベロシティ範囲・音程・エンベロープ・フィルタなど) の一覧
- `<id>.ogg` — その音色の全サンプルを連結した 2ch Ogg Vorbis。サンプルレートが混在する音色 (Ohh Voices) はレートごとに `<id>-<rate>.ogg` に分かれる
- `index.json` — 音色の一覧

変換時の処理:

- プリセットとインストゥルメントのジェネレータを合成し、平坦なリージョンにする。内容が同じで連続するベロシティ層はまとめる
- 左右に振り切った L/R ゾーンのペアは 1 つのステレオサンプルにまとめる
- 非可逆圧縮でループの継ぎ目が崩れないよう、各サンプルの後ろにループの続きをフェードアウトしながら付け足してからエンコードする
- 既定の品質は `--quality 4`。デコードし直した波形 SNR がファイル内のどれかのサンプルで `--min-snr` (20dB) を下回ると、そのファイルだけ品質を上げる
- デコード後のフレーム数が元と一致すること (サンプルの位置がずれないこと) を毎回確認する

## シンセ API

```ts
import { Synth } from './synth/index.ts'

const synth = new Synth()                         // AudioContext を内部で作る
const violin = synth.createChannel(await synth.loadInstrument('violin'))
violin.volume = 0.8                               // 0..1 程度
violin.pan = -0.3                                 // -1 (左) .. 1 (右)
violin.reverb = 1                                 // 音色ごとのリバーブ送り量に掛ける倍率

// 長さの決まった音を AudioContext の時刻で予約する (BGM はこれが基本)
const t = synth.currentTime + 0.1
violin.playNote(67, 100, t, 0.5)                  // キー, ベロシティ, 開始時刻, 長さ(秒)

// 鍵盤のようなリアルタイム演奏
violin.noteOn(60, 100)
violin.noteOff(60)
```

- ブラウザの自動再生制限のため、最初のユーザー操作の中で `synth.resume()` を呼ぶ
- キーは小数でもよい (61.5 で C# と D の間の 4 分音)。リージョンは最も近い半音で選ぶ。ベロシティは 1..127 に丸める
- `loadInstrument` は id (`"violin"`) または音色名を受け付け、同じ音色は一度だけ読み込む
- 同時発音数は `maxVoices` (既定 96) を超えるとリリース中→古い順に止める
- 出力は dry + リバーブ → マスター (`synth.master`) → リミッタ代わりのコンプレッサ

### 対応している SF2 の機能

- キー/ベロシティ範囲、ルートキー、coarse/fine tune、scaleTuning、サンプルの pitchCorrection
- ループ (sampleModes 0/1/3)
- 音量エンベロープ (delay/attack/hold/decay/sustain/release、keynum によるスケーリング)。
  FluidSynth と同様に attack は振幅に対して線形、decay/release は dB に対して線形。最小時間は -12000 timecents (約 1ms)
- モジュレーションエンベロープ → フィルタカットオフ/ピッチ
- ローパスフィルタ (initialFilterFc/Q)
- initialAttenuation (FluidSynth と同様に 0.4 倍)、pan、reverbEffectsSend
- 既定モジュレータ: ベロシティ → 音量 (凹カーブ)、ベロシティ → フィルタカットオフ (ゾーンのモジュレータによる打ち消しに対応)

未対応: LFO (この音源では深さがすべて 0)、サンプルアドレスのオフセット、chorus、exclusiveClass、
その他のモジュレータ、ピッチベンドなどの MIDI コントローラ。未対応のジェネレータが使われていると変換時に警告が出る。

## シーケンサ

小節の頭が先読み範囲に入るたびにコールバックを呼んで、その小節の音符を作らせる。
曲のデータを前もって全部作る必要がないので、プロシージャル生成をそのまま載せられる。

```ts
import { Sequencer } from './synth/index.ts'

const seq = new Sequencer(synth.ctx, { tempo: 96, timeSignature: [4, 4] })

// 小節ごとに最初に呼ばれる (任意)。拍子とテンポを決める
seq.conductor = (bar) => {
  if (bar.index === 8) bar.timeSignature = [3, 4]     // この小節から 3/4 (以降も引き継ぐ)
  if (bar.index === 15) bar.rampTempo(72, 0, 4)       // 小節頭から 4 拍かけて 72 まで
  if (bar.index === 16) bar.setTempo(96)              // 小節頭で 96 に戻す
}

// トラックごとに、その小節の音符を書き込む
const cello = seq.addTrack(celloChannel, (bar) => {
  bar.note(0, 36, 90, bar.beats)                      // 拍, キー, ベロシティ, 長さ(拍)
})

seq.start()                  // 省略時は currentTime + 0.05 を小節 0 の頭にする
seq.tempo = 120              // 再生中でも変えられる
seq.timeSignature = [6, 8]   // 次に生成する小節から
cello.muted = true           // 生成は続け、予約だけしない
seq.position()               // { bar, beat, timeSignature, tempo } (今鳴っている位置)
seq.stop()                   // 未来の音は取り消し、鳴っている音はリリースする
```

- 位置・長さの単位は四分音符 = 1 拍 (6/8 の小節は 3 拍)。テンポも四分音符/分。`bar.note` の拍は小節頭から数え、小節の長さを超えてもよい
- 小節の生成と音符の予約を分けている。小節は頭が先読み範囲に入った時点で conductor → 各トラックの順に作り、
  音符は先読み範囲 (`lookahead`, 既定 0.3 秒) に入った時点でその時点のテンポマップで時刻に変換して `playNote` で予約する。
  そのため `seq.tempo` の変更は、生成済みの小節の途中でも先読み分の遅れで反映される
- `seq.tempo` の変更は予約済みの範囲の終わりから効く。conductor がその後の位置でテンポを決めていれば、そこからはそちらが優先される
- ページが非表示のときは、バックグラウンドのタイマー間引きに備えて先読みを `hiddenLookahead` (既定 1.5 秒) に広げる
- タイマーが遅れて開始時刻を過ぎた音符は、まだ終わっていなければ今から鳴らし、終わっていれば捨てる (`seq.droppedNotes` に数える)
- conductor / トラックが例外を投げても、その小節のその部分が抜けるだけで再生は続く (コンソールにエラーを出す)
- `stop()` はリリースで止めるので、ハープやピチカートのようにリリースの長い音色は余韻が残る

テストページのデモ (`src/sequencer-demo.ts`) は、8 小節のコード進行 (Am–F–C–G–F–C–Dm–E) の上で
各パートが小節ごとに音符を作る。メロディ・ピチカートの音型は乱数で変わる。フレーズの最後の小節でリタルダンドする。

## プロシージャル BGM 生成

Jami Sieber のような、異国的なスケールと転調・変拍子の BGM を小節ごとにその場で作る。
編成はシーケンサのデモと同じ弦楽器中心で、チェロがメロディを取り、コントラバスがドローンを鳴らす。

```ts
import { Composer, PART_DEFS } from './music/index.ts'

const composer = new Composer({ seed: 7, exoticism: 0.8 })
const channels = Object.fromEntries(
  await Promise.all(PART_DEFS.map(async (d) => [d.id, synth.createChannel(await synth.loadInstrument(d.instrument))])),
)
composer.attach(seq, channels)   // seq.conductor を置き換え、パートごとのトラックを足す
composer.reset()                 // シードから最初からやり直す (start の前に)
seq.start()
composer.params.modulationRate = 1   // 再生中に変えてよい (次の小節 / 次のセクションから反映)
composer.snapshot(seq.position()!.bar)  // 今の小節の調・拍子・和音・編成 (表示用)
```

生成の流れ:

- **セクション** (既定 8 小節。5/8 のような短い小節では倍) ごとに調・拍子・盛り上がり・編成を決める
- **スケール**は 26 種 (西洋の旋法、ヒジャーズ・ダブルハーモニック・ハンガリー短音階などの中東/東欧系、
  ラーガ、日本やガムランの 5 音音階、4 分音を含むマカーム)。それぞれに「聴き慣れなさ」と特性音を持たせ、
  エキゾチック度に近いものほど選ばれやすい。4 分音は小数のキーでそのまま鳴らす
- **転調**: 今の調と候補の調の遠さ (構成音の違い + 主音の移動) を測り、転調の遠さのパラメータに近いものを選ぶ。
  セクション最後の和音は、次の調にも含まれる和音 (ピボット) を選んでつなぐ。転調の直前はリタルダンドする
- **和音**は機能和声ではなく、スケール上の 3 度堆積・sus4・空虚 5 度を主音寄りの酔歩で選ぶ。特性音 (ヒジャーズの ♭2 など) を根音にしやすくできる
- **拍子**は 4/4・3/4・6/8 と、5/8・7/8 (2+2+3)・9/8 (2+2+2+3)・11/8 などの変拍子。拍のまとまりがメロディ・オスティナート・打楽器のアクセントになる
- **メロディ**はセクションの頭で 1 小節の動機を 2 つ作り、句ごとに「動機 → 変形 → 移高 → 終止」と展開する。強拍は和音の音か特性音に寄せ、前打音・モルデント・トリルを付ける
- **編成**は盛り上がりで決まる (低いとドローン・メロディ・鐘だけ、高いと対旋律・打楽器・クワイアが加わる)

調整できるパラメータ (`src/music/params.ts`。テストページでは説明付きのスライダーになる):

| パラメータ | 内容 |
|---|---|
| エキゾチック度 / 微分音 | スケールの選ばれ方 |
| 転調の頻度 / 転調の遠さ | セクションが変わるときに転調する確率と、行き先の遠さ |
| 特性音の強調 | スケールらしい音を和音やメロディの強拍に使う割合 |
| テンポ / 変拍子 / セクションの長さ / 和音の長さ | リズムと構成 |
| 転調前のリタルダンド | 転調直前にテンポを落とす量 |
| ドローン | 低音が主音を持続する割合 (0 で和音の根音を追う) |
| メロディの密度 / 装飾音 | メロディの音数と装飾 |
| 盛り上がり / 起伏 | 平均的な盛り上がりと、セクションごとの変化の大きさ |
| 揺らぎ | 発音タイミングとベロシティのばらつき |

同じシードとパラメータなら同じ曲になる。テストページの「設定をコピー」でパラメータを JSON で取り出せる。

## 既知の制限

- 動作確認は Chrome のみ。Firefox / Safari は未確認 (Safari の古い版は Ogg Vorbis をデコードできない)
- AudioBufferSourceNode はサンプルレート変換やピッチ変更を線形補間で行うため、高音域でエイリアスが出る可能性がある
- 各音色の読み込みでサンプルを Float32 に展開するので、全音色を読むとメモリを数十 MB 使う
- 4 分音はサンプルのピッチを変えて出すだけで、スライド (ポルタメント) やピッチベンドはない
