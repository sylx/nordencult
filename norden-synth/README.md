# norden-synth

Web ゲームの BGM 用の、PCM (サンプル) ベースのシンセサイザ。
SoundFont 2 から必要な音色だけを取り出してゲーム向けの軽いデータに変換し、Web Audio API で鳴らす。
曲は LLM がテキストの形式 (`src/songs/`) で 1 曲ずつ書き、ゲーム本体 ([nordencult](https://github.com/sylx/nordencult)) は `BgmPlayer` で鳴らす。

BGM 用途なので、低遅延より「時刻を指定して先読みで予約する」再生を前提にしている。

## 現状

- [x] SF2 → 楽器データ (JSON + Ogg Vorbis) の変換ツール
- [x] Web Audio によるサンプラー (エンベロープ・フィルタ・ループ・リバーブ)
- [x] 音色の試聴・鍵盤演奏・LLM が書いた曲の試聴ができるテストページ
- [x] テンポ/小節単位で先読み再生するシーケンサ
- [x] LLM が書く曲の形式と、その再生 (`SongPlayer`)
- [x] ゲーム本体で BGM を鳴らす `BgmPlayer` (曲の切り替えのクロスフェード・自動再生制限の解除) と、楽器データを配信する Vite プラグイン

## 使い方

```sh
npm install
npm run dev                # テストページ (http://localhost:5173 。最初は LLM 作成曲、#instrument で音源チェック)
npm run build:instruments  # soundfonts/presets.json に並べた音色で public/instruments/ を作り直す (ffmpeg が必要)
npm run typecheck
npm test                   # テンポマップ・シーケンサ・曲データのテスト (Node)
npm run build
```

`public/instruments/` を作り直してファイルが増えた場合は、dev サーバーを再起動する
(Vite は public 配下のファイル一覧を起動時に読むため)。

## ディレクトリ構成

```
soundfonts/*.sf2            変換元 (ブラウザには配信せず、リポジトリにも含めない)
soundfonts/presets.json     変換する SF2 と音色 (プリセット名) の一覧
tools/sf2-extract/          SF2 → 楽器データの変換ツール (Node, TypeScript をそのまま実行)
  sf2.ts                      SF2 パーサ
  flatten.ts                  プリセット/インストゥルメントの 2 階層を平坦なリージョンに変換
  main.ts                     サンプルの連結・エンコード・検証・出力
tools/vite-plugin-instruments.ts  楽器データを別のプロジェクトのページの instruments/ として配信する Vite プラグイン
public/instruments/         生成された楽器データ (コミット対象)
src/synth/                  シンセ本体
  types.ts                    楽器データの型 (変換ツールと共有)
  instrument.ts               楽器データの読み込み・デコード
  voice.ts                    1 リージョン分の発音 (ノード構成)
  envelope.ts                 SF2 の DAHDSR エンベロープ
  loop.ts                     ループの継ぎ目のクロスフェード
  reverb.ts                   リバーブのインパルス応答の合成
  synth.ts                    Synth / Channel / Bus (公開 API) と、ゲームで鳴らすときのミックスの既定値
  tempo.ts                    テンポマップ (拍 ⇔ 時刻の変換、テンポのランプ)
  sequencer.ts                小節単位で先読み再生するシーケンサ
src/songs/                  LLM が書いた曲
  song.ts                     曲データの形式と、小節ごとの音符への展開
  player.ts                   1 曲を Sequencer で鳴らす SongPlayer
  index.ts                    曲の一覧 (SONGS)
  hokuten.ts                  『北天の灯』
  fairy-ring.ts               『妖精の環』
  imperial-triumph.ts         『大帝国の凱旋』
  wandering-bird.ts           『気ままな渡り鳥』
  northern-oath.ts            『北辺の誓い』 (北の軍事国家)
  tundra-march.ts             『凍土の鉄騎』 (北の軍事国家との戦闘)
  golden-sails.ts             『黄金の帆』
  star-reader.ts              『砂海の星詠み』
  white-sanctum.ts            『白亜の聖都』
  holding-breath.ts           『息を潜めて』 (索敵)
  battle-cry.ts               『鬨の声』 (会敵)
  mist-pilgrim.ts             『霧の巡礼』 (タイトル)
  winter-council.ts           『雪原の評議』 (冬の戦略画面)
  masked-passepied.ts         『仮面たちのパスピエ』 (ドビュッシー「パスピエ」による変奏。素材は source_midi/passepied.mid)
  condor-board.ts             『コンドルの盤上』 (アンデス風の戦略画面)
src/runtime/bgm.ts          ゲームの BGM (BgmPlayer)
src/index.ts                ゲーム本体から使う公開 API
src/main.ts                 テストページ
src/songs-page.ts           テストページの LLM 作成曲タブ
src/mixer-panel.ts          テストページ全体の音量・リバーブ (プリセット付き)
test/                       node --test で動かすテスト
```

## 音色

変換元は `soundfonts/` に置いた 3 つの SF2。

### FluidR3_GM

`soundfonts/FluidR3_GM.sf2` は FluidR3_GM の完全版 (189 音色、約 148MB)。
GitHub の 1 ファイル 100MB の制限を超えるのでリポジトリには含めていない。
変換し直すときは Debian/Ubuntu の `fluid-soundfont-gm` パッケージ (3.1) のものを置く。

```sh
sudo apt install fluid-soundfont-gm
cp /usr/share/sounds/sf2/FluidR3_GM.sf2 soundfonts/
# インストールせずに取り出す場合
apt-get download fluid-soundfont-gm && dpkg -x fluid-soundfont-gm_*.deb pkg && cp pkg/usr/share/sounds/sf2/FluidR3_GM.sf2 soundfonts/

sha256sum soundfonts/FluidR3_GM.sf2
# 74594e8f4250680adf590507a306655a299935343583256f3b722c48a1bc1cb0 (148,398,306 バイト)
```

### Choir Choral Aahhs

`soundfonts/choir choral aahhs 4959kb.sf2` は E-mu の音色を SF2 に変換した合唱の SoundFont (5 音色、約 5MB)。
Polyphone の SoundFont 一覧 (https://www.polyphone.io/en/soundfonts/vocals/224-choir-choral-aahhs) から入手できる。
作者は不明で、配布ページと INFO チャンクの著作権表記はどちらも Public Domain。44.1kHz ステレオで、A2〜G5 の 18 音を録音している。
配布時のファイル名は `choir choral aahhs (4,959kb).sf2` なので、名前を変えて置く。

```sh
mv "choir choral aahhs (4,959kb).sf2" "soundfonts/choir choral aahhs 4959kb.sf2"
sha256sum "soundfonts/choir choral aahhs 4959kb.sf2"
# e3a0a6b43c54986a1d21fa9bac2b42f7901fb347ffdd4bebc2cafa671a5cc22a (5,077,708 バイト)
```

### Papelmedia Final SF2 XXL - Irina Brochin

`soundfonts/Papelmedia_Irina_Brochin.sf2` は Irina Brochin の歌声を収めた SoundFont (1 音色、約 5MB)。
Polyphone の SoundFont 一覧 (https://www.polyphone.io/en/soundfonts/vocals/228-papelmedia-final-sf2-xxl-irina-brochin) から入手できる。
作者は Simon Tristan Papel (Papelmedia)。44.1kHz モノラルで、A3〜A5 を短 3 度おきに 9 音録音している。
1 音 5.5〜7 秒のワンショットでループはなく、それより長く伸ばすとサンプルの末尾で音が終わる。

```sh
sha256sum soundfonts/Papelmedia_Irina_Brochin.sf2
# d3a2aedf2ece6302bced54b03b14ad401e6e323c1b38bcb2089d6c37aa7edc78 (5,068,024 バイト)
```

ライセンスは Polyphone の "give credit" (https://www.polyphone.io/en/licenses#give-credit)。
商用利用・改変・再配布はできるが、作者名を示すクレジットが必要。
ゲームなどに組み込むときは、次のクレジットを画面やドキュメントに載せる。

> "Papelmedia Final SF2 XXL - Irina Brochin" by Simon Tristan Papel (Papelmedia), voice by Irina Brochin.
> https://www.polyphone.io/en/soundfonts/vocals/228-papelmedia-final-sf2-xxl-irina-brochin

同じ文面を presets.json の `credit` に書いてあり、変換すると `index.json` と `irina-brochin.json` の `credit` に入る。

### 変換する音色

`soundfonts/presets.json` の `soundfonts` に SF2 ごとに並べたプリセット名の音色だけを変換する (合計約 9.1MB)。
SF2 のパスは presets.json からの相対。SF2 にない名前や、名前から作る id が重なるとエラーで止まる。
SF2 に `credit` を書くと、その SF2 から変換した音色の `index.json` のエントリと `<id>.json` に `credit` として出力する (帰属表示が必要な音色用)。
`--presets` の代わりに SF2 を直接渡すと、その全プリセットを変換する。

| Bank | Program | 音色 | サイズ |
|---:|---:|---|---:|
| 0 | 0 | Yamaha Grand Piano | 0.97 MB |
| 0 | 21 | Accordian | 0.24 MB |
| 0 | 24 | Nylon String Guitar | 0.23 MB |
| 0 | 32 | Acoustic Bass | 0.16 MB |
| 0 | 40 | Violin | 0.36 MB |
| 0 | 41 | Viola | 0.48 MB |
| 0 | 42 | Cello | 0.62 MB |
| 0 | 43 | Contrabass | 0.20 MB |
| 0 | 45 | Pizzicato Section | 0.37 MB |
| 0 | 46 | Harp | 0.20 MB |
| 0 | 47 | Timpani | 0.16 MB |
| 0 | 52 | Ahh Choir | 0.68 MB |
| 0 | 56 | Trumpet | 0.08 MB |
| 0 | 57 | Trombone | 0.15 MB |
| 0 | 60 | French Horns | 0.40 MB |
| 0 | 65 | Alto Sax | 0.30 MB |
| 0 | 72 | Piccolo | 0.17 MB |
| 0 | 73 | Flute | 0.19 MB |
| 0 | 104 | Sitar | 0.14 MB |
| 0 | 114 | Steel Drums | 0.03 MB |
| 0 | 116 | Taiko Drum | 0.02 MB |
| 128 | 48 | Orchestra Kit | 1.79 MB |
| 0 | 0 | Choral Aahhs (Choir Choral Aahhs) | 0.49 MB |
| 0 | 0 | Irina Brochin (Papelmedia Final SF2 XXL) | 0.70 MB |

Orchestra Kit (bank 128) はキー 27〜88 に 1 キー 1 音でバスドラ・スネア・シンバルなどが割り当てられたドラムキット。
ハイハットやシンバルなどノイズ状の音は波形 SNR が上がりにくく、品質 q8 で書き出している。

Choral Aahhs は旧 Ohh Voices (FluidR3_GM) の置き換え。アタックが約 0.4 秒と遅く、持続部は Ohh Voices より約 5dB 大きい。

Irina Brochin はソロの歌声。最低音 A3 だけは末尾が約 -27dBFS で切れているので、6.4 秒を超えて伸ばすと最後にわずかにプツッと鳴ることがある。

FluidR3_GM は MIT License (Frank Wen, Toby Smithe)。

## 楽器データの形式

音色ごとに次のファイルを出力する (型は `src/synth/types.ts`)。

- `<id>.json` — サンプルの位置・ループ点と、リージョン (キー/ベロシティ範囲・音程・エンベロープ・フィルタなど) の一覧
- `<id>.ogg` — その音色の全サンプルを連結した 2ch Ogg Vorbis。サンプルレートが混在する音色 (Steel Drums など) はレートごとに `<id>-<rate>.ogg` に分かれる
- `index.json` — 音色の一覧

変換時の処理:

- プリセットとインストゥルメントのジェネレータを合成し、平坦なリージョンにする。内容が同じで連続するベロシティ層はまとめる
- 左右に振り切った L/R ゾーンのペアは 1 つのステレオサンプルにまとめる。片方の先頭にだけ数フレーム余分があり、ループ点と末尾も同じだけずれているペア (Choral Aahhs) は、先頭を切ってそろえる
- 非可逆圧縮でループの継ぎ目が崩れないよう、各サンプルの後ろにループの続きをフェードアウトしながら付け足してからエンコードする
- 既定の品質は `--quality 4`。デコードし直した波形 SNR がファイル内のどれかのサンプルで `--min-snr` (20dB) を下回ると、そのファイルだけ品質を上げる
- デコードし直して最後のサンプルの末尾まで取り出せることを毎回確認する (ffmpeg は音声が 1 ページに収まる短いファイルで全体の長さを数百フレーム間違えるが、ずれは末尾の無音パディングの中に収まる)

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

// 全体のリバーブ。残響時間は 15 秒程度の深いものまで
synth.setReverb({ duration: 10, preDelay: 0.07, damping: 0.3 })  // 残響時間(秒), プリディレイ(秒), 高域の減衰 0..1
synth.reverbReturn.gain.value = 1.8               // リバーブの戻りの量
synth.dry.gain.value = 0.75                       // 原音の量
synth.output.gain.value = 0.5                     // 最終的な音量 (コンプレッサの後)

// チャンネルをバスにまとめると、原音とリバーブ送りをまとめてフェードできる
const bus = synth.createBus()
const cello = synth.createChannel(await synth.loadInstrument('cello'), bus)
bus.fade(0, 2)                                    // 2 秒かけて 0 まで (鳴っている残響はそのまま減衰する)

// 鍵盤のようなリアルタイム演奏
violin.noteOn(60, 100)
violin.noteOff(60)
```

- ブラウザの自動再生制限のため、最初のユーザー操作の中で `synth.resume()` を呼ぶ
- キーは小数でもよい (61.5 で C# と D の間の 4 分音)。リージョンは最も近い半音で選ぶ。ベロシティは 1..127 に丸める
- `loadInstrument` は id (`"violin"`) または音色名を受け付け、同じ音色は一度だけ読み込む
- 同時発音数は `maxVoices` (既定 96) を超えるとリリース中→古い順に止める
- 出力は dry + リバーブ → マスター (`synth.master`) → リミッタ代わりのコンプレッサ → `synth.output`
- 音量とリバーブの初期値は `DEFAULT_MIX` (マスター 1.5・原音 0.25・リバーブ量 3.45・残響 3.1 秒・プリディレイ 0.008 秒・高域の減衰 0.7)。
  サンプルの音色は素のままだと薄いので、原音を絞って深めのリバーブで包む。`new Synth(ctx, { mix: { ... } })` で変えられる。
  テストページのミキサーの「ゲーム」プリセットがこの値 (ほかのプリセットと違い、音量も変える)
- `setReverb` はインパルス応答を作り直す (15 秒で約 0.2 秒かかり、その間メインスレッドが止まる)。コンボルバを 2 つ持って入力を切り替えるので、鳴っている残響は途切れずに減衰する

### 対応している SF2 の機能

- キー/ベロシティ範囲、ルートキー、coarse/fine tune、scaleTuning、サンプルの pitchCorrection
- ループ (sampleModes 0/1/3)
- 音量エンベロープ (delay/attack/hold/decay/sustain/release、keynum によるスケーリング)。
  FluidSynth と同様に attack は振幅に対して線形、decay/release は dB に対して線形。最小時間は -12000 timecents (約 1ms)
- モジュレーションエンベロープ → フィルタカットオフ/ピッチ
- モジュレーション LFO (三角波) → フィルタカットオフ/ピッチ
- ローパスフィルタ (initialFilterFc/Q)
- initialAttenuation (FluidSynth と同様に 0.4 倍)、pan、reverbEffectsSend
- exclusiveClass: 同じチャンネルで同じクラスの音が鳴ると、それまでの音を約 5ms で止める
  (Orchestra Kit のミュート/オープントライアングル、クイーカ、ギロ、太鼓など)。止めるのはその時刻までに始まっている音だけ
- 既定モジュレータ: ベロシティ → 音量 (凹カーブ)、ベロシティ → フィルタカットオフ (ゾーンのモジュレータによる打ち消しに対応)

未対応: LFO による音量の揺れ (modLfoToVolume。Flute・Sitar などで 1dB 未満)、ビブラート LFO、サンプルアドレスのオフセット、chorus、
その他のモジュレータ、ピッチベンドなどの MIDI コントローラ。未対応のジェネレータが使われていると変換時に警告が出る。

## シーケンサ

小節の頭が先読み範囲に入るたびにコールバックを呼んで、その小節の音符を作らせる。
曲のデータを前もって全部作る必要がなく、ループやテンポの変更も小節ごとに決められる。

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

## LLM 作成曲

LLM が 1 曲ずつ書いた曲を `src/songs/` に溜めていく。テストページの「LLM 作成曲」タブで聞ける。
曲はセクションの並びで、イントロを 1 回演奏したあと `loop` のセクションを繰り返す。各セクションはパートごとに 1 小節 1 文字列で書く。

```ts
{
  id: 'A',
  label: 'A 主題',
  chords: ['Dm', 'Bb', ...],                  // 小節ごとのコード名 (表示用)
  parts: {
    vn1: ['A4:1.5 D5:.5 E5 F5 A5:1', ...],    // 音名:長さ (拍)。長さを省くと直前と同じ
    choir: ['A3+D4+F4:4', ...],               // + で和音
    timp: ['v70 D3:1 r:3', ...],              // v でベロシティ、r で休符、- で直前の音を伸ばす
    perc: ['v90 bd+cym:1 v60 sd:.5 sd ...'],  // 打楽器の音色 (Orchestra Kit) では音名の代わりに打楽器の名前を書ける
  },
  ritardando: 0.9,                            // 最後の小節でテンポを落とす (任意)
  timeSignature: [6, 8],                      // セクションの拍子 (任意)。小節ごとの配列でもよい
}
```

各小節の長さの合計が拍子と合わない曲はテスト (`npm test`) で失敗する。書式の詳細は `src/songs/song.ts` の先頭にある。

Orchestra Kit を使うパートでは、キーの代わりに次の名前を書ける (一覧は `src/songs/song.ts` の `DRUM_KEYS`)。

| 名前 | 音 | 名前 | 音 |
|---|---|---|---|
| `bd` | コンサート・バスドラム | `sd` | コンサート・スネア |
| `cym` | 合わせシンバル (左右に広がり、鳴らし切る) | `cym2` | 合わせシンバル (中央。短く書くと早めに減衰) |
| `tamb` | タンブリン | `castanet` | カスタネット |
| `tri` / `trimute` | トライアングル (オープン / ミュート) | `conga` / `tumba` / `slap` | コンガ (高 / 低 / 押さえた音) |
| `bongo` / `bongorim` | ボンゴ / ボンゴの縁 | `shaker` / `maracas` / `cabasa` | 振り物 |
| `wb` / `wb2` | ウッドブロック (高 / 低) | `taiko` / `taiko2` | 和太鼓 (短 / 長) |

ほかに `rim`・`clap`・`splash`・`cowbell`・`vibraslap`・`timbale`・`agogo`・`guiro`・`clave`・`sleigh` などがある。
キー 27〜30 はハイハットと効果音が重なって鳴るので名前を付けていない。

## 曲の再生

`SongPlayer` は 1 曲を自分の `Sequencer` と `Bus` で鳴らす。リタルダンドとセクションごとの拍子は conductor が受け持つ。

```ts
import { SongPlayer } from './songs/player.ts'

const player = await SongPlayer.load(synth, song)   // 曲の音色を読み込む (Song でも compileSong の結果でもよい)
player.start(2)                    // 曲頭から。2 秒かけてフェードイン
player.tracks.get('vn1')!.muted = true
player.loop = false                // 1 回で音符がなくなる (止めるのは呼び出し側。position().bar が undefined になる)
player.position()                  // { position, bar } (今鳴っている位置と SongBar)
player.stop(1.5)                   // 1.5 秒かけてフェードアウトしてから止める
player.dispose()                   // すぐ止めて出力から外す
```

## ゲームでの再生 (BgmPlayer)

ゲーム本体は `src/index.ts` (`import { BgmPlayer } from 'norden-synth'`) を使う。
`BgmPlayer` は Synth を 1 つ持ち、曲 id を指定すると今の曲をフェードアウトしながら次の曲をフェードインする。

```ts
import { BgmPlayer } from 'norden-synth'

const bgm = new BgmPlayer({ indexUrl: `${import.meta.env.BASE_URL}instruments/index.json` })
await bgm.play('mist-pilgrim')     // 音色を読み込んでから切り替える。同じ曲が鳴っていれば何もしない
await bgm.play('battle-cry', 3)    // 3 秒でクロスフェード (既定は bgm.fade = 1.5 秒)
bgm.play(null)                     // フェードアウトして止める (bgm.stop() と同じ)
bgm.volume = 0.5                   // 最終的な音量 (ミックスとは別)。0 で AudioContext ごと止める
await bgm.preload(['battle-cry'])  // 先に音色を読み込んでおく
bgm.dispose()                      // AudioContext を閉じる
```

- 読み込み中に別の曲が指定されたら、後から指定した曲だけを鳴らす (読み込み終わった方は捨てる)
- ブラウザの自動再生制限で AudioContext が止まっていれば、最初のクリック・キー入力で再開する (それまでに始めた曲はその時点で曲頭から鳴る)
- タブが裏に回るか、ウィンドウのフォーカスが外れている間は AudioContext ごと一時停止する (`pauseWhenInactive: false` で無効)。
  曲の位置も止まるので、戻ると続きから鳴る。止めるときは 0.15 秒で絞り、戻るときは 0.4 秒で音量を戻す。`bgm.inactive` で非アクティブかがわかる
- `bgm.volume = 0` の間も同じように AudioContext ごと止めて、シンセの処理を軽くする。音量を戻すと続きから鳴る。`bgm.suspended` で止めているか (非アクティブか音量 0) がわかる
- 曲はループで鳴らす。ミックスは `DEFAULT_MIX`

楽器データ (`public/instruments/`) は `tools/vite-plugin-instruments.ts` の `instrumentsPlugin()` で、
ゲーム本体のページの `instruments/` として配信し、ビルドでは `dist/instruments/` に書き出す。

## 既知の制限

- 動作確認は Chrome のみ。Firefox / Safari は未確認 (Safari の古い版は Ogg Vorbis をデコードできない)
- AudioBufferSourceNode はサンプルレート変換やピッチ変更を線形補間で行うため、高音域でエイリアスが出る可能性がある
- 各音色の読み込みでサンプルを Float32 に展開するので、全音色を読むとメモリを数十 MB 使う
- 4 分音はサンプルのピッチを変えて出すだけで、スライド (ポルタメント) やピッチベンドはない
