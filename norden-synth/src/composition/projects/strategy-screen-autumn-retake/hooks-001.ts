import { buildSketch, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'

// 秋の戦略画面（リテイク）のフック集 01。
// ブリーフ: 実りの秋の攻勢への期待感と、来たるべき冬への不安感が同居する、明るいが緊張感のある冒頭。
// COMPOSING.md の「フックの書き方」に従い、どの案も先に旋律のリズム型（1〜2小節）と輪郭を決め、
// 同じリズム型を2回使って2回目は音高だけ変える。伸ばす音は拍の頭で、和音の音か長7度・9度。
// 案どうしでリズム型・輪郭・拍子・和声の発想（平行和音、ペダル、クリシェ、半音下降の低音など）を変える。
// 戦闘画面ほど張り詰めないよう、テンポは ♩=116〜152 の中庸〜やや速めにし、刻みは軽く保つ。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

// ---------- 伴奏の型（案ごとに変える） ----------

/** 4/4: 8分の和音の刻み。1拍目と3拍目に軽いアクセント。 */
const pulse44 = (v: Voicing) => {
  const c = ch(v)
  return `v62 ${c}:.5 v46 ${c}:.5 ${c}:.5 ${c}:.5 v58 ${c}:.5 v46 ${c}:.5 ${c}:.5 ${c}:.5`
}
/** 4/4: 2分音符で保つ和音。動きは低音に任せる。 */
const pad44 = (v: Voicing) => `v56 ${ch(v)}:2 v50 ${ch(v)}:2`
/** 4/4: シンコペーションを1つ含む軽い刻み。 */
const comp44 = (v: Voicing) => {
  const c = ch(v)
  return `v60 ${c}:1 r:.5 v50 ${c}:.5 r:.5 v54 ${c}:.5 v50 ${c}:1`
}
/** 4/4: 裏拍だけの和音。 */
const offbeat44 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v54 ${c}:.5 r:.5 v50 ${c}:.5 r:.5 v54 ${c}:.5 r:.5 v50 ${c}:.5`
}
/** 4/4: 3+3+2 の和音。旋律のリズムと揃える。 */
const tresillo44 = (v: Voicing) => `v62 ${ch(v)}:1.5 v56 ${ch(v)}:1.5 v58 ${ch(v)}:1`
/** 4/4: 8分の分散和音（4声を上下）。 */
const flow44 = (v: Voicing) => `v56 ${v[0]}:.5 v48 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5 ${v[2]}:.5 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5`
/** 4/4: 低・高・中・高のアルベルティ。時計の刻みのような落ち着かなさ。 */
const alberti44 = (v: Voicing) =>
  `v54 ${v[0]}:.5 v46 ${v[2]}:.5 ${v[1]}:.5 ${v[2]}:.5 v52 ${v[0]}:.5 v46 ${v[2]}:.5 ${v[1]}:.5 ${v[2]}:.5`
/** 3/4: 1拍目を低音に任せ、2・3拍目に和音を置くワルツ。 */
const waltz34 = (v: Voicing) => `r:1 v54 ${ch(v)}:1 v48 ${ch(v)}:1`
/** 3/4: 8分で上下する分散和音。 */
const arp34 = (v: Voicing) => `v54 ${v[0]}:.5 v46 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5 ${v[2]}:.5 ${v[1]}:.5`
/** 6/8: 拍頭を休み、8分2つで和音を揺らす。 */
const sway68 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v54 ${c}:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 v46 ${c}:.5`
}
/** 12/8: 拍頭を休み、8分2つで鳴らす鐘の刻み。 */
const bells128 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v54 ${c}:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 v46 ${c}:.5 r:.5 v54 ${c}:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 v46 ${c}:.5`
}
/** 12/8: 3声を8分で往復する波。 */
const wave128 = (v: Voicing) => {
  const unit = `${v[0]}:.5 ${v[1]}:.5 ${v[2]}:.5 ${v[1]}:.5`
  return `v54 ${unit} v48 ${unit} ${unit}`
}

// ---------- 低音の型 ----------

/** 4/4: 根音・2拍裏・5度・根音。 */
const drive = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`
/** 4/4: 8分のオクターブの往復。 */
const octaves = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`
/** 4/4: 頭・2拍裏・3拍裏・4拍でオクターブ上・4拍裏。 */
const push = (root: string, up: string) => `${root}:1.5 ${root}:1 ${root}:.5 ${up}:.5 ${root}:.5`

// ---------- 01 刈り入れの角笛 ----------
// リズム型: ♩. ♪ ♩ ♩ | 𝅗𝅥. 𝄽 。音階を4音上って5音目を伸ばす。2回目は1音上から始めて到達音を上げる。
export const harvestHornHook: Passage = {
  chords: ['Gmaj7', 'A/G', 'Em9', 'Bm9'],
  melody: [
    'v86 D5:1.5 v82 E5:.5 v88 F#5:1 v90 G5:1',
    'v94 A5:3 r:1',
    'v86 E5:1.5 v82 F#5:.5 v88 G5:1 v92 A5:1',
    'v96 B5:3 r:1',
  ],
  harmony: [
    pulse44(['B3', 'D4', 'F#4']),
    pulse44(['A3', 'C#4', 'E4']),
    pulse44(['G3', 'B3', 'D4', 'F#4']),
    pulse44(['A3', 'C#4', 'D4', 'F#4']),
  ],
  bass: [drive('G1', 'D2'), drive('G1', 'G2'), drive('E1', 'B1'), drive('B1', 'F#2')],
}

// ---------- 02 落葉のワルツ ----------
// リズム型: ♩ ♩ ♩ | 𝅗𝅥. 。6度跳ね上がってから順次に落ちる。2回目は跳躍を5度に縮め、1音ずつ下げる。
export const fallingLeavesWaltzHook: Passage = {
  chords: ['Fmaj9', 'Em7', 'Dm9', 'Ebmaj7(#11)'],
  melody: [
    'v84 C5:1 v92 A5:1 v86 G5:1',
    'v90 E5:3',
    'v84 C5:1 v90 G5:1 v86 F5:1',
    'v92 D5:3',
  ],
  harmony: [
    waltz34(['A3', 'C4', 'E4', 'G4']),
    waltz34(['G3', 'B3', 'D4']),
    waltz34(['F3', 'A3', 'C4', 'E4']),
    waltz34(['G3', 'Bb3', 'D4', 'A4']),
  ],
  bass: ['F1:1 r:2', 'E1:1 r:2', 'D2:1 r:2', 'Eb2:1 r:2'],
}

// ---------- 03 鐘楼の見張り ----------
// リズム型: ♩♪ ♩♪ ♩. (伸ばす) | 付点2分+付点4分。A–E–A と鐘のように4度を往復してから上へ伸ばす。
// 2回目は4音目と到達音を上げる。低音は属音 E のペダルのまま、上の和音が D→C#m→Bm→A と降りる。
export const belfryHook: Passage = {
  chords: ['Dmaj9/E', 'C#m7/E', 'Bm7/E', 'A/E'],
  melody: [
    'v88 A5:1 v80 E5:.5 v88 A5:1 v84 B5:.5 v94 C#6:3',
    'v90 B5:4.5 r:1.5',
    'v88 A5:1 v80 E5:.5 v88 A5:1 v86 C#6:.5 v96 D6:3',
    'v92 C#6:4.5 r:1.5',
  ],
  harmony: [
    bells128(['F#3', 'A3', 'C#4', 'E4']),
    bells128(['G#3', 'B3', 'C#4', 'E4']),
    bells128(['F#3', 'A3', 'B3', 'D4']),
    bells128(['A3', 'C#4', 'E4']),
  ],
  bass: Array(4).fill('E1:1.5 E2:1.5 E1:1.5 E2:1.5'),
}

// ---------- 04 澄んだ空、遠い雲 ----------
// リズム型: ♩ ♩ 𝅗𝅥 | 𝅝 。下ってから伸ばし、次の小節で跳ね上がる。2回目は伸ばす音を F5 に変え、到達音を C6 へ。
// 和声は Fmaj9 と、短3度上へ平行移動した Abmaj9 の2つだけ（同じ形の和音を平行に動かす）。
export const clearSkyHook: Passage = {
  chords: ['Fmaj9', 'Abmaj9', 'Fmaj9', 'Abmaj9'],
  melody: [
    'v90 A5:1 v84 G5:1 v88 E5:2',
    'v94 G5:4',
    'v90 A5:1 v84 G5:1 v88 F5:2',
    'v98 C6:4',
  ],
  harmony: [
    pad44(['A3', 'C4', 'E4', 'G4']),
    pad44(['C4', 'Eb4', 'G4', 'Bb4']),
    pad44(['A3', 'C4', 'E4', 'G4']),
    pad44(['C4', 'Eb4', 'G4', 'Bb4']),
  ],
  bass: [octaves('F1', 'F2', 'C2'), octaves('Ab1', 'Ab2', 'Eb2'), octaves('F1', 'F2', 'C2'), octaves('Ab1', 'Ab2', 'Eb2')],
}

// ---------- 05 麦打ちの輪 ----------
// リズム型: ♪♪♪ ♩. | 付点2分（6/8）。G–F#–G と回ってから3度・4度上へ跳ぶ。2回目は跳躍先を C6 に上げる。
// F/G（ミクソリディアの♭VII）で明るさに陰を差し、最後は Cmaj7 の長7度で止まる。
export const threshingHook: Passage = {
  chords: ['G(add9)', 'F/G', 'Am9', 'Cmaj7'],
  melody: [
    'v86 G5:.5 v80 F#5:.5 v84 G5:.5 v92 B5:1.5',
    'v90 A5:3',
    'v86 G5:.5 v80 F#5:.5 v84 G5:.5 v94 C6:1.5',
    'v92 B5:3',
  ],
  harmony: [
    sway68(['B3', 'D4', 'A4']),
    sway68(['A3', 'C4', 'F4']),
    sway68(['G3', 'C4', 'E4', 'B4']),
    sway68(['G3', 'B3', 'E4']),
  ],
  bass: ['G1:1.5 D2:1.5', 'G1:1.5 G2:1.5', 'A1:1.5 E2:1.5', 'C2:1.5 G2:1.5'],
}

// ---------- 06 遠征の地図 ----------
// リズム型: ♪♪♩ ♪♪♩ | 𝅝 。2音ずつ波打ちながら上り、全音符で止まる。2回目は1音上から始め、到達音を A5 に上げる。
// Fmaj7 から全音下の Eb へ平行に下り、Bbmaj7 のあと遠い D(add9) に明るく開く。
export const campaignMapHook: Passage = {
  chords: ['Fmaj7', 'Eb(add9)', 'Bbmaj7', 'D(add9)'],
  melody: [
    'v86 C5:.5 v82 D5:.5 v88 E5:1 v84 D5:.5 v84 E5:.5 v90 F5:1',
    'v94 G5:4',
    'v86 D5:.5 v82 E5:.5 v88 F5:1 v84 E5:.5 v86 F5:.5 v92 G5:1',
    'v98 A5:4',
  ],
  harmony: [
    comp44(['A3', 'C4', 'E4']),
    comp44(['G3', 'Bb3', 'Eb4', 'F4']),
    comp44(['A3', 'D4', 'F4']),
    comp44(['F#3', 'A3', 'D4', 'E4']),
  ],
  bass: [push('F1', 'F2'), push('Eb2', 'Eb3'), push('Bb1', 'Bb2'), push('D2', 'D3')],
}

// ---------- 07 風見鶏の旋回 ----------
// リズム型: 𝅗𝅥 ♪♪♪♪ | 𝅗𝅥. 𝄽 。高い音を伸ばしてから8分で音階を駆け下り、次の小節で跳ね返る。
// 2回目は1音上の C6 から下り、跳ね返る先を A5 に。Cmaj9 の長7度 B5、Bbmaj7 の長7度 A5 で止まる。
export const weathervaneHook: Passage = {
  chords: ['Gmaj7', 'Cmaj9', 'Am9', 'Bbmaj7'],
  melody: [
    'v92 B5:2 v84 A5:.5 v82 G5:.5 v82 F#5:.5 v80 E5:.5',
    'v94 B5:3 r:1',
    'v94 C6:2 v86 B5:.5 v84 A5:.5 v82 G5:.5 v80 F#5:.5',
    'v92 A5:3 r:1',
  ],
  harmony: [
    flow44(['G3', 'B3', 'D4', 'F#4']),
    flow44(['E3', 'G3', 'B3', 'D4']),
    flow44(['C4', 'E4', 'G4', 'B4']),
    flow44(['Bb3', 'D4', 'F4', 'A4']),
  ],
  bass: ['G1:2 D2:2', 'C2:2 G2:2', 'A1:2 E2:2', 'Bb1:2 F2:2'],
}

// ---------- 08 渡り鳥の隊列 ----------
// リズム型: ♩. ♩♪ 付点2分 | 付点2分+付点4分 𝄽（12/8）。4度跳んでから降りて伸ばす。2回目は5度跳んで G5 へ、最後は A♭5。
// 低音は B♭ のまま、内声が F→F#→G→A♭ と半音ずつ上がるクリシェ。期待と落ち着かなさを同時に出す。
export const migratingFlockHook: Passage = {
  chords: ['Bb', 'Bb+', 'Bb6', 'Bb7'],
  melody: [
    'v88 F5:1.5 v92 Bb5:1 v84 A5:.5 v88 F5:3',
    'v86 D5:4.5 r:1.5',
    'v88 F5:1.5 v94 C6:1 v86 Bb5:.5 v90 G5:3',
    'v92 Ab5:4.5 r:1.5',
  ],
  harmony: [
    wave128(['D4', 'F4', 'Bb4']),
    wave128(['D4', 'F#4', 'Bb4']),
    wave128(['D4', 'G4', 'Bb4']),
    wave128(['D4', 'Ab4', 'Bb4']),
  ],
  bass: Array(4).fill('Bb1:3 Bb2:3'),
}

// ---------- 09 夕暮れの石段 ----------
// リズム型: 𝄽 ♪♪ ♩ ♩ | 𝅗𝅥. 𝄽 。1拍休んでから8分2つで下り、付点2分で止まる。2回目は全体を1音下げ、到達音は半音下の E5。
// 低音が E♭–D–D♭–C と半音ずつ下がり、C7 で次へ引っ張る。伴奏は裏拍だけで軽く。
export const duskStairsHook: Passage = {
  chords: ['Eb(add9)', 'Bb/D', 'Db6', 'C7'],
  melody: [
    'r:1 v84 G5:.5 v82 F5:.5 v88 Eb5:1 v86 G5:1',
    'v92 F5:3 r:1',
    'r:1 v84 F5:.5 v82 Eb5:.5 v88 Db5:1 v86 F5:1',
    'v92 E5:3 r:1',
  ],
  harmony: [
    offbeat44(['G3', 'Bb3', 'F4']),
    offbeat44(['F3', 'Bb3', 'D4']),
    offbeat44(['F3', 'Bb3', 'Db4']),
    offbeat44(['E3', 'G3', 'Bb3']),
  ],
  bass: ['Eb2:2 Bb1:2', 'D2:2 F2:2', 'Db2:2 Ab1:2', 'C2:2 G1:2'],
}

// ---------- 10 峠の向こうの旗 ----------
// リズム型: ♩. ♩. ♩ | 𝅝（3+3+2）。D–E–A と上って伸ばす角笛の呼びかけ。2回目は2音目を F5 に、到達音を C#6 に上げる。
// 和声は同じ形の maj9 が D→C→B♭ と全音ずつ平行に下り、A(add9) に着く。伴奏と低音も旋律と同じ 3+3+2。
export const bannerBeyondPassHook: Passage = {
  chords: ['Dmaj9', 'Cmaj9', 'Bbmaj9', 'A(add9)'],
  melody: [
    'v88 D5:1.5 v90 E5:1.5 v92 A5:1',
    'v96 B5:4',
    'v88 D5:1.5 v90 F5:1.5 v92 A5:1',
    'v100 C#6:4',
  ],
  harmony: [
    tresillo44(['F#3', 'A3', 'C#4', 'E4']),
    tresillo44(['E3', 'G3', 'B3', 'D4']),
    tresillo44(['D3', 'F3', 'A3', 'C4']),
    tresillo44(['B3', 'C#4', 'E4', 'A4']),
  ],
  bass: ['D2:1.5 D2:1.5 D3:1', 'C2:1.5 C2:1.5 C3:1', 'Bb1:1.5 Bb1:1.5 Bb2:1', 'A1:1.5 A1:1.5 A2:1'],
}

// ---------- 11 初霜の予感 ----------
// リズム型: ♩. ♪ ♩ | 𝅗𝅥.（速めの 3/4）。付点で順次に下り、付点2分で止まる。2回目は3度上の C#6 から下り、
// 最後は G#ではなく G♮（Cmaj7 の5度）に着いて、ホ長調の明るさに冷たい影を落とす。
export const firstFrostHook: Passage = {
  chords: ['Emaj9', 'F#m9', 'Amaj9', 'Cmaj9'],
  melody: [
    'v90 B5:1.5 v84 A5:.5 v88 G#5:1',
    'v90 F#5:3',
    'v94 C#6:1.5 v86 B5:.5 v90 A5:1',
    'v92 G5:3',
  ],
  harmony: [
    arp34(['E3', 'G#3', 'D#4', 'F#4']),
    arp34(['A3', 'C#4', 'E4', 'G#4']),
    arp34(['A3', 'C#4', 'G#4', 'B4']),
    arp34(['E3', 'G3', 'B3', 'D4']),
  ],
  bass: ['E1:2 B1:1', 'F#1:2 C#2:1', 'A1:2 E2:1', 'C2:2 G2:1'],
}

// ---------- 12 北へ向かう雲 ----------
// リズム型: 𝅗𝅥. ♪♪ | 𝅝 。伸ばしてから下の隣の音で揺れ、1音上へ進んで止まる。2回目は1音下で揺れ、5度跳ね上がって E6 へ。
// イ短調の Am9 にドリアの D9（明るい IV）を続け、Fmaj9 から E7sus4 で解決せずに止める。伴奏はアルベルティの刻み。
export const northboundCloudsHook: Passage = {
  chords: ['Am9', 'D9', 'Fmaj9', 'E7sus4'],
  melody: [
    'v90 B5:3 v82 A5:.5 v86 B5:.5',
    'v94 C6:4',
    'v88 A5:3 v82 G5:.5 v86 A5:.5',
    'v98 E6:4',
  ],
  harmony: [
    alberti44(['C4', 'G4', 'B4']),
    alberti44(['C4', 'E4', 'F#4']),
    alberti44(['A3', 'E4', 'G4']),
    alberti44(['D4', 'A4', 'B4']),
  ],
  bass: ['A1:3 E2:1', 'D2:3 A1:1', 'F1:3 C2:1', 'E1:3 B1:1'],
}

const hook = (
  id: string, title: string, description: string, tempo: number, meter: readonly [number, number],
  intention: string, passage: Passage, moments: CompositionStudy['moments'],
  gates: { harmonyGate?: number; bassGate?: number } = {},
) => buildSketch({ id, title, description, tempo, meter, ...gates, passages: [{ label: 'フック', intention, passage }], moments })

export const firstHooks: CompositionStudy[] = [
  hook(
    'autumn-retake-hook-harvest-horn', '刈り入れの角笛',
    'ニ長調 · ♩=120 · 4/4。D–E–F#–G と音階を上って A5 を伸ばし、2回目は1音上の E から B5 へ。Gmaj7→A/G（リディアの浮遊）→Em9→Bm9 で、明るさの最後に短調の影を置く。伴奏は8分の和音の刻み',
    120, [4, 4], '付点のリズムで音階を上り、伸ばす。2回目は1音上から始めて到達音を上げる', harvestHornHook,
    [
      { bar: 2, beat: 0, pitches: ['G1', 'A3', 'C#4', 'A5'], intention: 'A/G の上で A5 を伸ばす（リディアの浮遊）' },
      { bar: 4, beat: 0, pitches: ['B1', 'D4', 'B5'], intention: 'Bm9 の根音 B5 で止まる' },
    ],
    { harmonyGate: 0.7, bassGate: 0.9 },
  ),
  hook(
    'autumn-retake-hook-falling-leaves-waltz', '落葉のワルツ',
    'ヘ長調 · ♩=144 · 3/4。C から A5 へ6度跳ね上がって順次に落ち、E5 で伸ばす。2回目は G5 へ5度跳び、D5 へ。Fmaj9→Em7→Dm9 と順に下り、最後だけ借用の Ebmaj7(#11) で D5 が長7度になる。伴奏はワルツ',
    144, [3, 4], '跳ね上がって順次に落ちる。2回目は1音ずつ下げ、借用和音の長7度で止まる', fallingLeavesWaltzHook,
    [
      { bar: 2, beat: 0, pitches: ['E1', 'E5'], intention: 'Em7 の根音 E5' },
      { bar: 4, beat: 0, pitches: ['Eb2', 'D5'], intention: '借用の Ebmaj7(#11) の長7度 D5' },
    ],
  ),
  hook(
    'autumn-retake-hook-belfry', '鐘楼の見張り',
    'イ長調 · ♩=132（付点4分=88）· 12/8。A–E–A と鐘のように4度を往復してから C#6 へ上がって伸ばす。2回目は D6 まで。低音は属音 E のペダルのまま、上の和音が Dmaj9→C#m7→Bm7→A と順に降りて、期待を溜めたまま主和音の第2転回で止まる',
    132, [12, 8], '4度の往復から上へ伸ばす。属音ペダルの上で和音が降りる', belfryHook,
    [
      { bar: 1, beat: 3, pitches: ['E1', 'C#6'], intention: 'Dmaj9/E の長7度 C#6 を伸ばす' },
      { bar: 3, beat: 3, pitches: ['E1', 'D6'], intention: 'Bm7/E の3度 D6（唯一の最高音）' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'autumn-retake-hook-clear-sky', '澄んだ空、遠い雲',
    'ヘ長調 · ♩=120 · 4/4。A–G と下りて E5（長7度）を伸ばし、次の小節で G5 に跳ね上がる。2回目は F5 で伸ばし C6 へ。和声は Fmaj9 と短3度上に平行移動した Abmaj9 の往復だけ。和音は2分音符で保ち、低音の8分のオクターブで前へ進める',
    120, [4, 4], '下ってから伸ばし、平行移動した和音の上へ跳ね上がる', clearSkyHook,
    [
      { bar: 1, beat: 2, pitches: ['A3', 'E5'], intention: 'Fmaj9 の長7度 E5' },
      { bar: 2, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G5'], intention: '短3度上の Abmaj9 で G5 が長7度になる' },
    ],
  ),
  hook(
    'autumn-retake-hook-threshing', '麦打ちの輪',
    'ト長調 · ♩=132（付点4分=88）· 6/8。G–F#–G と回ってから B5 へ跳び、F/G の上で A5 を伸ばす。2回目は C6 へ跳んで Cmaj7 の長7度 B5 へ。ミクソリディアの F/G が明るさに陰を差す。伴奏は拍頭を休む揺れ',
    132, [6, 8], '回り音から跳び、伸ばす。2回目は跳躍先を上げる', threshingHook,
    [
      { bar: 2, beat: 0, pitches: ['G1', 'A5'], intention: 'F/G の上の A5（F の3度）' },
      { bar: 4, beat: 0, pitches: ['C2', 'B5'], intention: 'Cmaj7 の長7度 B5' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'autumn-retake-hook-campaign-map', '遠征の地図',
    'ヘ長調 · ♩=132 · 4/4。C–D–E、D–E–F と2音ずつ波打って上り、G5 を全音符で伸ばす。2回目は1音上から A5 へ。Fmaj7 から全音下の Eb(add9) へ平行に下り、Bbmaj7 のあと遠い D(add9) に明るく開く。伴奏はシンコペーションを1つ含む刻み',
    132, [4, 4], '2音ずつ波打って上り、伸ばす。2回目は1音上から始める', campaignMapHook,
    [
      { bar: 2, beat: 0, pitches: ['Eb2', 'G3', 'G5'], intention: '全音下の Eb(add9) の3度 G5' },
      { bar: 4, beat: 0, pitches: ['D2', 'F#3', 'A5'], intention: '遠い D(add9) の5度 A5' },
    ],
    { harmonyGate: 0.8, bassGate: 0.85 },
  ),
  hook(
    'autumn-retake-hook-weathervane', '風見鶏の旋回',
    'ト長調 · ♩=116 · 4/4。B5 を2拍伸ばしてから8分で E5 まで駆け下り、Cmaj9 の長7度 B5 へ跳ね返る。2回目は C6 から下り、Bbmaj7（♭III）の長7度 A5 へ。伴奏は8分の分散和音',
    116, [4, 4], '高い音から音階で駆け下り、跳ね返って伸ばす', weathervaneHook,
    [
      { bar: 2, beat: 0, pitches: ['C2', 'E3', 'B5'], intention: 'Cmaj9 の長7度 B5 へ跳ね返る' },
      { bar: 4, beat: 0, pitches: ['Bb1', 'Bb3', 'A5'], intention: '借用の Bbmaj7 の長7度 A5' },
    ],
  ),
  hook(
    'autumn-retake-hook-migrating-flock', '渡り鳥の隊列',
    '変ロ長調 · ♩=126（付点4分=84）· 12/8。F5 から B♭5 へ4度跳んで降り、F5 を伸ばして D5 に収める。2回目は C6 へ5度跳んで G5、最後に A♭5。低音は B♭ のまま、内声が F→F#→G→A♭ と上がるクリシェ（Bb→Bb+→Bb6→Bb7）',
    126, [12, 8], '跳んでから降りて伸ばす。内声の半音の上昇で期待と不安を重ねる', migratingFlockHook,
    [
      { bar: 2, beat: 0.5, pitches: ['Bb1', 'F#4', 'D5'], intention: 'Bb+ の F# の上で D5 を伸ばす' },
      { bar: 4, beat: 0.5, pitches: ['Bb1', 'Ab4', 'Ab5'], intention: 'Bb7 の7度 A♭ で次へ引っ張る' },
    ],
    { harmonyGate: 1.05 },
  ),
  hook(
    'autumn-retake-hook-dusk-stairs', '夕暮れの石段',
    '変ホ長調 · ♩=126 · 4/4。1拍休んで G–F–E♭ と下り、Bb/D の上で F5 を伸ばす。2回目は全体を1音下げて D♭ を通り、C7 の3度 E5 で止まる。低音が E♭–D–D♭–C と半音ずつ下がる。伴奏は裏拍だけ',
    126, [4, 4], '休符の後に下って伸ばす。2回目は1音下げ、半音下降の低音の終わりで C7 に止まる', duskStairsHook,
    [
      { bar: 2, beat: 0, pitches: ['D2', 'F5'], intention: 'Bb/D の5度 F5' },
      { bar: 4, beat: 0, pitches: ['C2', 'E5'], intention: 'C7 の3度 E5（次へ引っ張る）' },
    ],
    { harmonyGate: 0.7 },
  ),
  hook(
    'autumn-retake-hook-banner-beyond-pass', '峠の向こうの旗',
    'イ長調 · ♩=132 · 4/4。3+3+2 のリズムで D–E–A と上り、Cmaj9 の長7度 B5 を伸ばす。2回目は F5 を通って A(add9) の3度 C#6 へ。同じ形の maj9 が D→C→B♭ と全音ずつ平行に下り、A に着く。伴奏・低音も 3+3+2',
    132, [4, 4], '3+3+2 で上って伸ばす角笛の呼びかけ。平行に下る和音の上で到達音を上げる', bannerBeyondPassHook,
    [
      { bar: 2, beat: 0, pitches: ['C2', 'E3', 'B5'], intention: '平行移動した Cmaj9 の長7度 B5' },
      { bar: 4, beat: 0, pitches: ['A1', 'C#4', 'C#6'], intention: 'A(add9) の3度 C#6 に着く' },
    ],
    { harmonyGate: 0.9, bassGate: 0.85 },
  ),
  hook(
    'autumn-retake-hook-first-frost', '初霜の予感',
    'ホ長調 · ♩=152 · 3/4。B–A–G# と付点で下り、F#m9 の根音 F#5 を伸ばす。2回目は C#6 から A5 へ下り、Cmaj9 の5度 G♮5 に着いて明るさに冷たい影を落とす。伴奏は8分の分散和音',
    152, [3, 4], '付点で順次に下り、伸ばす。2回目は3度上から下り、G♮ の影で止まる', firstFrostHook,
    [
      { bar: 2, beat: 0, pitches: ['F#1', 'F#5'], intention: 'F#m9 の根音 F#5' },
      { bar: 4, beat: 0, pitches: ['C2', 'E3', 'G5'], intention: '♭VI の Cmaj9 の5度 G♮5' },
    ],
  ),
  hook(
    'autumn-retake-hook-northbound-clouds', '北へ向かう雲',
    'イ短調 · ♩=120 · 4/4。B5 を伸ばして A–B と揺れ、D9 の7度 C6 へ進む。2回目は A5 で揺れて E6 へ5度跳ね上がる。Am9→D9（ドリアの明るい IV）→Fmaj9→E7sus4 と、解決しないまま止める。伴奏はアルベルティの刻み',
    120, [4, 4], '伸ばしてから下の隣の音で揺れ、上へ進む。2回目は1音下で揺れて跳ね上がる', northboundCloudsHook,
    [
      { bar: 2, beat: 0, pitches: ['D2', 'C4', 'C6'], intention: 'D9 の7度 C6' },
      { bar: 4, beat: 0, pitches: ['E1', 'D4', 'E6'], intention: 'E7sus4 の根音 E6（唯一の最高音）' },
    ],
  ),
]
