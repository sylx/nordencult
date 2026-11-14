import { buildSketch, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'

// 戦略画面のBGMその5 — フック集 01。
// 参考資料 src/songs/source_midi/srb/analysis の戦略画面4曲（srb-03〜06）とメニュー曲（srb-02）から、
// 旋律は写さず、調と和声の「コード感」だけを取り出した（以下は解析データからの AI の読み取り）。
// - 調: ニ短調/ヘ長調、イ長調、変イ長調、ト長調、変ロ長調。拍子は 3/4 が多く、4/4 も使う。
// - 和音: add9・sus2・sus4・空虚5度、低音を変えた分数和音（Abadd9/Bb、Dadd9/E）、主音の保続低音。
// - 不思議な色: 増三和音（Faug、Baug、C#aug/Eb）、bII の長7度を主音の低音に乗せる（EbM7/D）、
//   長調の bIII・bVI・iv の借用（イ長調の C・F・Dm）、I と bVI の往復（G ↔ Ebadd9）、
//   III → VI の長3度関係（変イ長調の C → F）、bVII7 を b6・b7 の低音に乗せる（G7/Eb、G7/F）。
// 参考曲のテンポは ♩=73〜98 なので、ブリーフの「ゆっくりすぎるテンポ」を避けて ♩=116〜150 に上げた。
//
// COMPOSING.md の「フックの書き方」に従い、先にリズム型と輪郭を決めてから和声を付ける。
// 同じリズム型を2回（または1小節の型を4回）使い、2回目は音高だけ変える。伸ばす音は拍頭で、和音の音か長7度・9度。
// 案どうしでリズム型・輪郭・拍子（3/4、4/4、6/8、12/8）・和声の発想を変える。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

// ---------- 伴奏の型 ----------

/** 3/4: 1拍目を低音に任せ、2拍目の8分2つと3拍目に和音。 */
const pluck34 = (v: Voicing) => {
  const c = ch(v)
  return `r:1 v54 ${c}:.5 v46 ${c}:.5 v50 ${c}:1`
}

/** 3/4: 4分音符ごとに短く切った和音。旋律の2拍子（ヘミオラ）と交差させる。 */
const tick34 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:.5 r:.5 v46 ${c}:.5 r:.5 v50 ${c}:.5 r:.5`
}

/** 3/4: 3声を8分で往復する分散和音。 */
const roll34 = (v: Voicing) => `v52 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 ${v[1]}:.5 v48 ${v[2]}:.5 v44 ${v[1]}:.5`

/** 4/4: 8分の和音の刻み。1拍目と3拍目に軽いアクセント。 */
const pulse44 = (v: Voicing) => {
  const c = ch(v)
  return `v60 ${c}:.5 v44 ${c}:.5 ${c}:.5 ${c}:.5 v56 ${c}:.5 v44 ${c}:.5 ${c}:.5 ${c}:.5`
}

/** 4/4: シンコペーションを含む刻み。 */
const comp44 = (v: Voicing) => {
  const c = ch(v)
  return `v60 ${c}:1 r:.5 v50 ${c}:.5 r:.5 v54 ${c}:.5 v48 ${c}:1`
}

/** 4/4: 3+3+2 の和音。 */
const tresillo44 = (v: Voicing) => `v62 ${ch(v)}:1.5 v54 ${ch(v)}:1.5 v58 ${ch(v)}:1`

/** 4/4: 3声を8分で順に回す。3音周期が4拍子とずれて、からくりのように回る。 */
const cycle44 = (v: Voicing) =>
  `v54 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v50 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v50 ${v[0]}:.5 v44 ${v[1]}:.5`

/** 4/4: 裏拍だけの和音。 */
const offbeat44 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v54 ${c}:.5 r:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 r:.5 v46 ${c}:.5`
}

/** 6/8: 拍頭を休み、8分2つで和音を揺らす。 */
const sway68 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v54 ${c}:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 v46 ${c}:.5`
}

/** 6/8: 8分6つの和音。各拍の頭にアクセント。 */
const jig68 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:.5 v42 ${c}:.5 ${c}:.5 v54 ${c}:.5 v42 ${c}:.5 ${c}:.5`
}

/** 12/8: 4声を8分で上下する分散和音を2回。 */
const roll128 = (v: Voicing) => {
  const once = `v52 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v48 ${v[3]}:.5 v44 ${v[2]}:.5 ${v[1]}:.5`
  return `${once} ${once}`
}

// ---------- 低音の型 ----------

/** 3/4: 根音を2拍、5度を1拍。 */
const waltz = (root: string, fifth: string) => `${root}:2 ${fifth}:1`

/** 3/4: 保続低音。1拍目を低く、2・3拍目をオクターブ上で。 */
const pedal34 = (low: string, high: string) => `${low}:1 ${high}:1 ${high}:1`

/** 4/4: 根音・2拍裏・5度・根音。 */
const drive = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`

/** 4/4: 同じ音の保続低音。4拍目だけオクターブ上。 */
const pedalDrive = (low: string, high: string) => `${low}:1.5 ${low}:.5 ${low}:1 ${high}:1`

/** 4/4: 8分のオクターブの往復。 */
const octaves = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`

/** 4/4: 頭・2拍裏・3拍裏・4拍でオクターブ上・4拍裏。 */
const push = (root: string, up: string) => `${root}:1.5 ${root}:1 ${root}:.5 ${up}:.5 ${root}:.5`

/** 4/4: 3+3+2 の低音。 */
const tresilloBass = (a: string, b: string, c: string) => `${a}:1.5 ${b}:1.5 ${c}:1`

/** 6/8: 根音・8分の根音・5度。 */
const six8 = (root: string, fifth: string) => `${root}:1 ${root}:.5 ${fifth}:1.5`

/** 12/8: 根音を2拍ぶん保ち、5度・根音。 */
const float128 = (root: string, fifth: string) => `${root}:3 ${fifth}:1.5 ${root}:1.5`

// ==========================================
// 12案の Passage 定義
// ==========================================

// ---------- 01 月時計の広場 ----------
// リズム型: ♩ ♪♪ ♩ | 𝅗𝅥. （3/4）。主音から上がって9度 E5 に降りて伸ばし、2回目は5度 A5 へ届く。
// 和声: 主音 D の保続の上で内声が D–C#–C–B と半音で下がる（Dm → Dm(maj7) → Dm7 → Dm6）。
// 参考曲の増三和音の色（Faug = Dm(maj7) の上3音）を、内声の下降線として使う。
export const moonDialHook: Passage = {
  chords: ['Dm', 'Dm(maj7)', 'Dm7', 'Dm6'],
  melody: [
    'v84 A4:1 v86 D5:.5 E5:.5 v88 F5:1',
    'v92 E5:3',
    'v84 A4:1 v86 D5:.5 F5:.5 v88 G5:1',
    'v94 A5:3',
  ],
  harmony: [
    pluck34(['F3', 'A3', 'D4']),
    pluck34(['F3', 'A3', 'C#4']),
    pluck34(['F3', 'A3', 'C4']),
    pluck34(['F3', 'A3', 'B3']),
  ],
  bass: [waltz('D2', 'A1'), waltz('D2', 'A1'), waltz('D2', 'A1'), waltz('D2', 'A1')],
}

// ---------- 02 水晶の地図 ----------
// リズム型: ♩. ♪ ♩ ♩ | 𝅗𝅥. 𝄽 （4/4）。高いところから音階で降り、跳んで伸ばす。
// 2回目は C#6 を C6 に半音下げて始め、借用の bVI（Fmaj7）の上を降りる。
// 和声: イ長調に bIII と bVI を借りる（A(add9) → Cmaj7 → Fmaj7 → E7sus4）。参考曲の夏の戦略画面の借用の色。
export const crystalMapHook: Passage = {
  chords: ['A(add9)', 'Cmaj7', 'Fmaj7', 'E7sus4'],
  melody: [
    'v86 C#6:1.5 v84 B5:.5 v86 A5:1 v84 E5:1',
    'v92 G5:3 r:1',
    'v86 C6:1.5 v84 A5:.5 v86 G5:1 v84 F5:1',
    'v90 E5:3 r:1',
  ],
  harmony: [
    pulse44(['E4', 'A4', 'B4', 'C#5']),
    pulse44(['E4', 'G4', 'B4', 'C5']),
    pulse44(['E4', 'F4', 'A4', 'C5']),
    pulse44(['D4', 'E4', 'A4', 'B4']),
  ],
  bass: [
    octaves('A1', 'A2', 'E2'),
    octaves('C2', 'C3', 'G2'),
    octaves('F1', 'F2', 'C2'),
    octaves('E1', 'E2', 'B1'),
  ],
}

// ---------- 03 錬金術師の天秤 ----------
// リズム型: 𝄽 ♪♪ ♩ ♩ | 𝅝 （4/4）。1拍休んでから8分2つで踏み出し、全音符で伸ばす。2回目は上の Eb6 へ。
// 和声: 主音 G の保続の上で Gm9 と Abmaj7/G（bII の長7度）を往復する。参考曲の EbM7/D（ニ短調）の響きを移した。
export const alchemistScaleHook: Passage = {
  chords: ['Gm9', 'Abmaj7/G', 'Gm9', 'Abmaj7/G'],
  melody: [
    'r:1 v84 D5:.5 F5:.5 v88 G5:1 A5:1',
    'v92 G5:4',
    'r:1 v84 D5:.5 G5:.5 v88 Bb5:1 C6:1',
    'v94 Eb6:4',
  ],
  harmony: [
    comp44(['Bb3', 'D4', 'F4', 'A4']),
    comp44(['Ab3', 'C4', 'Eb4', 'G4']),
    comp44(['Bb3', 'D4', 'F4', 'A4']),
    comp44(['Ab3', 'C4', 'Eb4', 'G4']),
  ],
  bass: [push('G1', 'G2'), push('G1', 'G2'), push('G1', 'G2'), push('G1', 'G2')],
}

// ---------- 04 風車の暦 ----------
// リズム型: ♩. ♩. ♩ | 𝅗𝅥. 𝄽 （4/4、3+3+2）。4度跳んで1音戻り、降りて伸ばす。2回目は1音上から G5 へ。
// 和声: 変イ長調。Ab(add9) を Bb の低音に乗せて始める（参考曲の秋の戦略画面の Abadd9/Bb）。
// 1小節目と3小節目は同じ Bb の低音の上で、Ab(add9)/Bb と Bbm9 の色を変える。
export const windmillAlmanacHook: Passage = {
  chords: ['Ab(add9)/Bb', 'Dbmaj7', 'Bbm9', 'Eb(add9)'],
  melody: [
    'v84 Eb5:1.5 v88 Ab5:1.5 v86 G5:1',
    'v92 F5:3 r:1',
    'v84 F5:1.5 v88 Bb5:1.5 v86 Ab5:1',
    'v94 G5:3 r:1',
  ],
  harmony: [
    tresillo44(['Ab3', 'C4', 'Eb4']),
    tresillo44(['F3', 'Ab3', 'C4']),
    tresillo44(['Ab3', 'C4', 'Db4', 'F4']),
    tresillo44(['Bb3', 'Eb4', 'F4']),
  ],
  bass: [
    tresilloBass('Bb1', 'Bb1', 'F2'),
    tresilloBass('Db2', 'Db2', 'Ab1'),
    tresilloBass('Bb1', 'Bb1', 'F2'),
    tresilloBass('Eb2', 'Eb2', 'Bb1'),
  ],
}

// ---------- 05 霧の渡し場 ----------
// リズム型: ♩ ♪ ♩ ♪ | 𝅗𝅥. （6/8）。4度跳んで隣の音で揺れ、上へ伸ばす。2回目は B5 を経て D6 へ。
// 和声: ト長調の I と bVI を往復する（G(add9) ↔ Ebmaj7）。参考曲の冬の戦略画面の G ↔ Ebadd9。
// 1回目の Bb5 と2回目の B5 の半音のずれが、霧の中のような曖昧さを作る。
export const mistFerryHook: Passage = {
  chords: ['G(add9)', 'Ebmaj7', 'G(add9)', 'Ebmaj7'],
  melody: [
    'v84 D5:1 v86 G5:.5 v88 A5:1 v84 G5:.5',
    'v92 Bb5:3',
    'v84 D5:1 v86 G5:.5 v88 B5:1 v84 A5:.5',
    'v94 D6:3',
  ],
  harmony: [
    sway68(['B3', 'D4', 'A4']),
    sway68(['G3', 'Bb3', 'D4']),
    sway68(['B3', 'D4', 'A4']),
    sway68(['G3', 'Bb3', 'D4']),
  ],
  bass: [six8('G1', 'D2'), six8('Eb2', 'Bb1'), six8('G1', 'D2'), six8('Eb2', 'Bb1')],
}

// ---------- 06 星図の卓 ----------
// リズム型: ♩ ♩ ♩ ♩ | 𝅝 （4/4）。4分で音階を上がり、全音符で伸ばす。2回目は1音上から A5 へ。
// 和声: 変ロ長調。Bb の保続の上に C 長三和音を乗せるリディアの響き（C/Bb、メニュー曲の II7 の色）。
// 2回目は同じ組を4度上（Ebmaj7 → F/Eb）で鳴らし、主和音へ戻りたがる V7 の転回形で止まる。
// 伴奏は3声を8分で回し、3音周期が4拍子とずれる。
export const starChartHook: Passage = {
  chords: ['Bbmaj7', 'C/Bb', 'Ebmaj7', 'F/Eb'],
  melody: [
    'v84 C5:1 v86 D5:1 v88 E5:1 v90 F5:1',
    'v94 G5:4',
    'v84 D5:1 v86 Eb5:1 v88 F5:1 v90 G5:1',
    'v96 A5:4',
  ],
  harmony: [
    cycle44(['D4', 'F4', 'A4']),
    cycle44(['C4', 'E4', 'G4']),
    cycle44(['G3', 'Bb3', 'D4']),
    cycle44(['F3', 'A3', 'C4']),
  ],
  bass: [pedalDrive('Bb1', 'Bb2'), pedalDrive('Bb1', 'Bb2'), pedalDrive('Eb1', 'Eb2'), pedalDrive('Eb1', 'Eb2')],
}

// ---------- 07 からくり時計の広間 ----------
// リズム型: ♩. ♩. | 𝅗𝅥. （3/4 の上の2拍子＝ヘミオラ）。2音で順次に降りて伸ばす。2回目は1音上から G5 へ。
// 和声: 主音 F の保続の上で長三和音が平行に動く（F → Db/F → Bb/F → Eb/F）。
// 上の F4 を共通音に残し、bVI と bVII の借用で長調のまま陰りを付ける。伴奏は3拍子で刻み、旋律の2拍子と交差する。
export const clockworkHallHook: Passage = {
  chords: ['F', 'Db/F', 'Bb/F', 'Eb/F'],
  melody: [
    'v86 A5:1.5 v84 G5:1.5',
    'v92 F5:3',
    'v86 Bb5:1.5 v84 A5:1.5',
    'v92 G5:3',
  ],
  harmony: [
    tick34(['A3', 'C4', 'F4']),
    tick34(['Ab3', 'Db4', 'F4']),
    tick34(['Bb3', 'D4', 'F4']),
    tick34(['Bb3', 'Eb4', 'G4']),
  ],
  bass: [pedal34('F1', 'F2'), pedal34('F1', 'F2'), pedal34('F1', 'F2'), pedal34('F1', 'F2')],
}

// ---------- 08 浮島の航路 ----------
// リズム型: ♪ ♩ ♪ ♩ ♩ | 𝅝 （4/4、シンコペーション1つ）。五音音階で山を描き、下りて伸ばす。
// 2回目は同じ動きを全音下で（D–E–G–A–G → C–D–F–G–F）、到達音は D5。
// 和声: add9 の和音が全音ずつ平行に下りて戻る（C(add9) → Bb(add9) → Ab(add9) → Bb(add9)）。
// 参考曲の春の戦略画面の Cadd9 ↔ Dadd9 の平行移動を、全音の階段にした。Ab(add9) の上の D5 はリディアの #4。
export const floatingIsleHook: Passage = {
  chords: ['C(add9)', 'Bb(add9)', 'Ab(add9)', 'Bb(add9)'],
  melody: [
    'v84 D5:.5 v88 E5:1 v84 G5:.5 v88 A5:1 v86 G5:1',
    'v92 F5:4',
    'v84 C5:.5 v88 D5:1 v84 F5:.5 v88 G5:1 v86 F5:1',
    'v90 D5:4',
  ],
  harmony: [
    offbeat44(['C4', 'D4', 'E4', 'G4']),
    offbeat44(['Bb3', 'C4', 'D4', 'F4']),
    offbeat44(['Ab3', 'Bb3', 'C4', 'Eb4']),
    offbeat44(['Bb3', 'C4', 'D4', 'F4']),
  ],
  bass: [
    octaves('C2', 'C3', 'G2'),
    octaves('Bb1', 'Bb2', 'F2'),
    octaves('Ab1', 'Ab2', 'Eb2'),
    octaves('Bb1', 'Bb2', 'F2'),
  ],
}

// ---------- 09 迷い森の道標 ----------
// リズム型: ♪♪♪ ♩. | 𝅗𝅥. （6/8）。8分3つで音階を降りて9度で止まり、さらに1音降りて伸ばす。2回目は1音上から。
// 和声: ホ短調。2小節目にドリアの明るい IV（A/C#）を置き、低音を E → C# → C → D と動かす。
export const lostForestHook: Passage = {
  chords: ['Em(add9)', 'A/C#', 'Cmaj7', 'D'],
  melody: [
    'v86 B5:.5 v84 A5:.5 G5:.5 v88 F#5:1.5',
    'v92 E5:3',
    'v86 C6:.5 v84 B5:.5 A5:.5 v88 G5:1.5',
    'v92 F#5:3',
  ],
  harmony: [
    jig68(['G3', 'B3', 'F#4']),
    jig68(['A3', 'C#4', 'E4']),
    jig68(['G3', 'B3', 'E4']),
    jig68(['A3', 'D4', 'F#4']),
  ],
  bass: [six8('E2', 'B1'), six8('C#2', 'A1'), six8('C2', 'G1'), six8('D2', 'A1')],
}

// ---------- 10 硝子の王冠 ----------
// リズム型: ♩ ♪♪ 𝅗𝅥 （4/4、1小節の型を4回）。音階を4音降りて長7度で止まる。
// 2小節目は旋律と和声ごと長3度下へ（Abmaj7 → Emaj7、参考曲の秋の III → VI の長3度関係）。
// 3小節目は1小節目と同じ旋律を Fm9 で付け直し、4小節目は1音下から F5 に降りる。
export const glassCrownHook: Passage = {
  chords: ['Abmaj7', 'Emaj7', 'Fm9', 'Db/Eb'],
  melody: [
    'v88 C6:1 v84 Bb5:.5 Ab5:.5 v92 G5:2',
    'v86 G#5:1 v82 F#5:.5 E5:.5 v90 D#5:2',
    'v88 C6:1 v84 Bb5:.5 Ab5:.5 v92 G5:2',
    'v86 Bb5:1 v82 Ab5:.5 G5:.5 v90 F5:2',
  ],
  harmony: [
    pulse44(['C4', 'Eb4', 'G4']),
    pulse44(['B3', 'D#4', 'G#4']),
    pulse44(['Ab3', 'C4', 'Eb4', 'G4']),
    pulse44(['Ab3', 'Db4', 'F4']),
  ],
  bass: [drive('Ab1', 'Eb2'), drive('E1', 'B1'), drive('F1', 'C2'), drive('Eb1', 'Bb1')],
}

// ---------- 11 影絵の行商人 ----------
// リズム型: 𝅗𝅥 ♪♪ | 𝅗𝅥. （3/4）。2拍保ってから8分2つで上がり、伸ばす。2回目は1音上から G5 へ。
// 和声: 上の G 長三和音を保ったまま、低音が G → F → E → Eb と下がる（G → G/F → Em7 → G/Eb）。
// 参考曲の夏の戦略画面の G7/F、G7/Eb（増三和音を含む響き）を主和音の上で使った。
export const shadowPeddlerHook: Passage = {
  chords: ['G', 'G/F', 'Em7', 'G/Eb'],
  melody: [
    'v88 B4:2 v84 C5:.5 D5:.5',
    'v92 E5:3',
    'v88 D5:2 v84 E5:.5 F#5:.5',
    'v94 G5:3',
  ],
  harmony: [
    roll34(['D4', 'G4', 'B4']),
    roll34(['D4', 'G4', 'B4']),
    roll34(['D4', 'G4', 'B4']),
    roll34(['D4', 'G4', 'B4']),
  ],
  bass: [waltz('G1', 'G2'), waltz('F1', 'F2'), waltz('E1', 'E2'), waltz('Eb1', 'Eb2')],
}

// ---------- 12 古地図の羅針盤 ----------
// リズム型: 𝅗𝅥. ♩. ♪♪♪ （12/8、1小節の型を4回）。長く保ち、8分3つで次の小節の長い音へ渡る。
// 長い音は A5 → A5 → B5 → A5 とほとんど動かず、その下で和音が短3度上へずれる（Dmaj9 → Fmaj7、Gmaj7 → Bbmaj7）。
// 同じ音の意味が和音ごとに変わる（5度 → 3度、3度 → 長7度）。
export const oldMapCompassHook: Passage = {
  chords: ['Dmaj9', 'Fmaj7', 'Gmaj7', 'Bbmaj7'],
  melody: [
    'v90 A5:3 v84 F#5:1.5 v82 E5:.5 F#5:.5 G5:.5',
    'v92 A5:3 v84 E5:1.5 v82 F5:.5 G5:.5 A5:.5',
    'v94 B5:3 v86 F#5:1.5 v82 C6:.5 B5:.5 Bb5:.5',
    'v92 A5:3 v84 D5:1.5 v82 E5:.5 F#5:.5 G5:.5',
  ],
  harmony: [
    roll128(['F#3', 'A3', 'C#4', 'E4']),
    roll128(['F3', 'A3', 'C4', 'E4']),
    roll128(['G3', 'B3', 'D4', 'F#4']),
    roll128(['F3', 'A3', 'Bb3', 'D4']),
  ],
  bass: [float128('D2', 'A1'), float128('F1', 'C2'), float128('G1', 'D2'), float128('Bb1', 'F1')],
}

// ==========================================
// Sketch 組み立て
// ==========================================

const hook = (
  id: string,
  title: string,
  description: string,
  tempo: number,
  meter: readonly [number, number],
  intention: string,
  passage: Passage,
  moments: CompositionStudy['moments'],
  gates: { harmonyGate?: number; bassGate?: number } = {},
) =>
  buildSketch({
    id,
    title,
    description,
    tempo,
    meter,
    ...gates,
    passages: [{ label: 'フック', intention, passage }],
    moments,
  })

export const firstHooks: CompositionStudy[] = [
  hook(
    'screen5-hook-moon-dial',
    '月時計の広場',
    'ニ短調 · ♩=132 · 3/4。主音から上がって9度 E5 に降りて伸ばし、2回目は5度 A5 へ。主音 D の保続の上で内声が D–C#–C–B と半音で下がる（Dm → Dm(maj7) → Dm7 → Dm6）。伴奏は2拍目の8分と3拍目の和音',
    132,
    [3, 4],
    '上がって伸ばす。下で内声が半音ずつ下がる。2回目は A5 へ',
    moonDialHook,
    [
      { bar: 2, beat: 1, pitches: ['D2', 'C#4', 'E5'], intention: 'Dm(maj7) の長7度 C#4 の上で9度 E5 を伸ばす' },
      { bar: 4, beat: 1, pitches: ['D2', 'B3', 'A5'], intention: 'Dm6 のドリアの6度 B3' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'screen5-hook-crystal-map',
    '水晶の地図',
    'イ長調 · ♩=116 · 4/4。C#6 から音階で降りて跳び、借用の Cmaj7 の上で G5 を伸ばす。2回目は半音下の C6 から借用の Fmaj7 の上を降り、E7sus4 の E5 へ。A(add9) → Cmaj7 → Fmaj7 → E7sus4。伴奏は8分刻み',
    116,
    [4, 4],
    '降りて跳び、借用和音の上で伸ばす。2回目は半音下げた C6 から',
    crystalMapHook,
    [
      { bar: 2, beat: 0, pitches: ['C2', 'B4', 'G5'], intention: 'bIII の Cmaj7 の5度 G5' },
      { bar: 3, beat: 0, pitches: ['F1', 'E4', 'C6'], intention: 'bVI の Fmaj7、C#6 が C6 に変わる' },
      { bar: 4, beat: 0, pitches: ['E1', 'D4', 'E5'], intention: 'E7sus4 の根音 E5' },
    ],
    { harmonyGate: 0.7 },
  ),
  hook(
    'screen5-hook-alchemist-scale',
    '錬金術師の天秤',
    'ト短調 · ♩=118 · 4/4。1拍休んで8分2つから上がり、bII の Abmaj7 の長7度 G5 を全音符で伸ばす。2回目は上の Eb6 へ。主音 G の保続の上で Gm9 と Abmaj7/G を往復する。伴奏はシンコペーションを含む刻み',
    118,
    [4, 4],
    '休んで踏み出し全音符で伸ばす。bII の長7度で止まる',
    alchemistScaleHook,
    [
      { bar: 2, beat: 0, pitches: ['G1', 'Ab3', 'G5'], intention: 'Abmaj7/G の長7度 G5（低音 G と bII の衝突）' },
      { bar: 4, beat: 0, pitches: ['G1', 'Ab3', 'Eb6'], intention: 'Abmaj7/G の5度 Eb6' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'screen5-hook-windmill-almanac',
    '風車の暦',
    '変イ長調 · ♩=120 · 4/4。3+3+2 のリズムで4度跳んで1音戻り、降りて伸ばす。2回目は1音上から G5 へ。Ab(add9)/Bb → Dbmaj7 → Bbm9 → Eb(add9)。1・3小節目は同じ Bb の低音で色を変える。伴奏と低音も 3+3+2',
    120,
    [4, 4],
    '3+3+2 で跳んで戻り、降りて伸ばす。2回目は G5 へ',
    windmillAlmanacHook,
    [
      { bar: 1, beat: 0, pitches: ['Bb1', 'Ab3', 'Eb5'], intention: 'Ab(add9) を Bb の低音に乗せる' },
      { bar: 2, beat: 0, pitches: ['Db2', 'C4', 'F5'], intention: 'Dbmaj7 の3度 F5' },
      { bar: 4, beat: 0, pitches: ['Eb2', 'F4', 'G5'], intention: 'Eb(add9) の3度 G5' },
    ],
    { harmonyGate: 0.85, bassGate: 0.85 },
  ),
  hook(
    'screen5-hook-mist-ferry',
    '霧の渡し場',
    'ト長調 · ♩=150（付点4分=100）· 6/8。4度跳んで隣の音で揺れ、bVI の Ebmaj7 の上で Bb5 を伸ばす。2回目は B5 を経て長7度 D6 へ。G(add9) と Ebmaj7 を往復する。伴奏は拍頭を休む揺れ',
    150,
    [6, 8],
    '跳んで揺れ、上へ伸ばす。2回目は長7度 D6 へ',
    mistFerryHook,
    [
      { bar: 2, beat: 0, pitches: ['Eb2', 'Bb5'], intention: 'bVI の Ebmaj7 の5度 Bb5' },
      { bar: 4, beat: 0, pitches: ['Eb2', 'D6'], intention: 'Ebmaj7 の長7度 D6' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'screen5-hook-star-chart',
    '星図の卓',
    '変ロ長調 · ♩=116 · 4/4。4分で音階を上がり（リディアの E を通る）、C/Bb の上で G5 を全音符で伸ばす。2回目は1音上から F/Eb の上の A5 へ。Bbmaj7 → C/Bb → Ebmaj7 → F/Eb。伴奏は3声を8分で回し、4拍子とずれる',
    116,
    [4, 4],
    '音階を上がって全音符で伸ばす。2回目は同じ和音の組を4度上で',
    starChartHook,
    [
      { bar: 2, beat: 0, pitches: ['Bb1', 'C4', 'G5'], intention: 'Bb の低音の上の C 長三和音（リディア）' },
      { bar: 4, beat: 0, pitches: ['Eb1', 'F3', 'A5'], intention: 'F/Eb の3度 A5' },
    ],
    { harmonyGate: 0.9, bassGate: 0.9 },
  ),
  hook(
    'screen5-hook-clockwork-hall',
    'からくり時計の広間',
    'ヘ長調 · ♩=138 · 3/4。付点4分2つ（ヘミオラ）で順次に降りて伸ばす。2回目は1音上から G5 へ。主音 F の保続の上で長三和音が平行に動く（F → Db/F → Bb/F → Eb/F）。伴奏は4分ごとに短く刻み、旋律の2拍子と交差する',
    138,
    [3, 4],
    'ヘミオラで降りて伸ばす。保続低音の上で和音が平行に動く',
    clockworkHallHook,
    [
      { bar: 2, beat: 0, pitches: ['F1', 'Db4', 'F5'], intention: 'bVI の Db を F の保続に乗せる' },
      { bar: 4, beat: 0, pitches: ['F1', 'Eb4', 'G5'], intention: 'bVII の Eb の3度 G5' },
    ],
    { bassGate: 0.85 },
  ),
  hook(
    'screen5-hook-floating-isle',
    '浮島の航路',
    'ハ長調 · ♩=124 · 4/4。シンコペーションを1つ含む五音音階の山から降りて F5 を伸ばす。2回目は同じ動きを全音下で鳴らし D5 へ。add9 の和音が全音ずつ平行に下りて戻る（C(add9) → Bb(add9) → Ab(add9) → Bb(add9)）。伴奏は裏拍',
    124,
    [4, 4],
    '山を描いて降り、伸ばす。2回目は全音下で',
    floatingIsleHook,
    [
      { bar: 2, beat: 0, pitches: ['Bb1', 'F5'], intention: 'Bb(add9) の5度 F5' },
      { bar: 3, beat: 0.5, pitches: ['Ab1', 'Bb3', 'D5'], intention: 'Ab(add9) の上の D5（リディアの #4）' },
      { bar: 4, beat: 0, pitches: ['Bb1', 'D5'], intention: 'Bb(add9) の3度 D5' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'screen5-hook-lost-forest',
    '迷い森の道標',
    'ホ短調 · ♩=144（付点4分=96）· 6/8。8分3つで音階を降りて9度 F#5 で止まり、E5 へ降りて伸ばす。2回目は1音上の C6 から F#5 へ。Em(add9) → A/C#（ドリアの IV）→ Cmaj7 → D。低音は E → C# → C → D。伴奏は8分の刻み',
    144,
    [6, 8],
    '音階を降りて止まり、さらに降りて伸ばす。2回目は1音上から',
    lostForestHook,
    [
      { bar: 2, beat: 0, pitches: ['C#2', 'E5'], intention: 'ドリアの IV（A/C#）の5度 E5' },
      { bar: 4, beat: 0, pitches: ['D2', 'F#5'], intention: 'D の3度 F#5' },
    ],
    { harmonyGate: 0.75 },
  ),
  hook(
    'screen5-hook-glass-crown',
    '硝子の王冠',
    '変イ長調 · ♩=120 · 4/4。4分と8分2つで音階を降り、長7度 G5 を2拍伸ばす。2小節目は旋律と和声ごと長3度下（Abmaj7 → Emaj7）。3小節目は同じ旋律を Fm9 で付け直し、4小節目は Db/Eb の F5 へ。伴奏は8分刻み',
    120,
    [4, 4],
    '降りて長7度で止まる型を長3度下へ移し、付け直して閉じる',
    glassCrownHook,
    [
      { bar: 1, beat: 2, pitches: ['Eb2', 'G5'], intention: 'Abmaj7 の長7度 G5' },
      { bar: 2, beat: 2, pitches: ['B1', 'D#5'], intention: '長3度下の Emaj7 の長7度 D#5' },
      { bar: 3, beat: 2, pitches: ['C2', 'G5'], intention: '同じ G5 が Fm9 の9度になる' },
    ],
    { harmonyGate: 0.7 },
  ),
  hook(
    'screen5-hook-shadow-peddler',
    '影絵の行商人',
    'ト長調 · ♩=126 · 3/4。2拍保ってから8分2つで上がり、伸ばす。2回目は1音上から G5 へ。上の G 長三和音を分散和音で保ったまま、低音が G → F → E → Eb と下がる（G → G/F → Em7 → G/Eb）',
    126,
    [3, 4],
    '保ってから上がり伸ばす。同じ和音の下で低音が下がる',
    shadowPeddlerHook,
    [
      { bar: 2, beat: 0, pitches: ['F1', 'D4', 'E5'], intention: 'G/F の上の E5（F に対する長7度）' },
      { bar: 4, beat: 0, pitches: ['Eb1', 'D4', 'G5'], intention: 'G/Eb（Eb–G–B の増三和音）の上の G5' },
    ],
  ),
  hook(
    'screen5-hook-old-map-compass',
    '古地図の羅針盤',
    'ニ長調 · ♩=144（付点4分=96）· 12/8。長く保ち、8分3つで次の長い音へ渡る。長い音は A5 → A5 → B5 → A5 とほとんど動かず、和音が短3度上へずれる（Dmaj9 → Fmaj7、Gmaj7 → Bbmaj7）。伴奏は8分の分散和音',
    144,
    [12, 8],
    '同じ音を保ち、下で和音が短3度ずれる',
    oldMapCompassHook,
    [
      { bar: 2, beat: 0, pitches: ['F1', 'A5'], intention: '同じ A5 が Fmaj7 の3度になる' },
      { bar: 4, beat: 0, pitches: ['Bb1', 'A5'], intention: 'Bbmaj7 の長7度 A5' },
    ],
    { harmonyGate: 0.9 },
  ),
]
