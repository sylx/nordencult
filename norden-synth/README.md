# norden-synth

Web ゲームの BGM 用の、PCM (サンプル) ベースのシンセサイザ。
SoundFont 2 から必要な音色だけを取り出してゲーム向けの軽いデータに変換し、Web Audio API で鳴らす。
最終的にはこの上で楽曲のプロシージャル生成を試すことを目標にしている。

BGM 用途なので、低遅延より「時刻を指定して先読みで予約する」再生を前提にしている。

## 現状

- [x] SF2 → 楽器データ (JSON + Ogg Vorbis) の変換ツール
- [x] Web Audio によるサンプラー (エンベロープ・フィルタ・ループ・リバーブ)
- [x] 音色の試聴・鍵盤演奏ができるテストページ
- [ ] テンポ/小節単位で先読み再生するシーケンサ
- [ ] 楽曲のプロシージャル生成

## 使い方

```sh
npm install
npm run dev                # テストページ (http://localhost:5173)
npm run build:instruments  # soundfonts/*.sf2 から public/instruments/ を作り直す (ffmpeg が必要)
npm run typecheck
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
src/main.ts                 テストページ
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

## 既知の制限

- 動作確認は Chrome のみ。Firefox / Safari は未確認 (Safari の古い版は Ogg Vorbis をデコードできない)
- AudioBufferSourceNode はサンプルレート変換やピッチ変更を線形補間で行うため、高音域でエイリアスが出る可能性がある
- 各音色の読み込みでサンプルを Float32 に展開するので、全音色を読むとメモリを数十 MB 使う
