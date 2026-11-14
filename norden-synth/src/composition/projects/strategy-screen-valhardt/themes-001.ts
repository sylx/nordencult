import { buildSketch, transposePassage, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { greyThroneHook } from './hooks-001.ts'

// 「灰座への敬礼」の主題の展開 01。
// フック（D(add9) → C(add9) → D(add9) → Cm7/D、♩=126、12/8）を冒頭にそのまま置き、続きをフックの動機から作る。
// 動機のリズム型: 𝅗𝅥. ♩. ♪♪♪ | 𝅗𝅥. 𝅗𝅥. 。
// 大きく保った音から4度ほど降り、8分3つで次の小節の長い音へ渡る。
//
// 案ごとに、平行移動の位置（5小節目／9小節目／なし）、幅（全音上・短3度上・長3度下）、戻り方、山場の位置を変える。

type Voicing = readonly string[]

/** 12/8: 4声を8分で上下する分散和音を2回（フックと同じ伴奏）。 */
const roll128 = (v: Voicing) => {
  const once = `v52 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v48 ${v[3]}:.5 v44 ${v[2]}:.5 ${v[1]}:.5`
  return `${once} ${once}`
}

/** 12/8: 根音を2拍ぶん保ち、5度・根音（フックと同じ低音）。 */
const float128 = (root: string, fifth: string) => `${root}:3 ${fifth}:1.5 ${root}:1.5`

/** フックから指定小節を切り出す（言い直し用）。 */
const hookBars = (from: number, to: number): Passage => ({
  chords: greyThroneHook.chords.slice(from, to),
  melody: greyThroneHook.melody.slice(from, to),
  harmony: greyThroneHook.harmony.slice(from, to),
  bass: greyThroneHook.bass.slice(from, to),
})

// ==========================================
// 案1: 5小節目から全音上（ホ長調）へ移り、ホ長調に留まって山場を作ったあとニ長調へ戻る
// ==========================================

const stayInE: Passage = {
  chords: ['C#m9', 'Amaj7', 'F#m9', 'B7sus4'],
  melody: [
    'v90 B5:3 v84 G#5:1.5 v82 E5:.5 F#5:.5 G#5:.5',
    'v92 A5:6',
    'v96 E6:3 v88 B5:1.5 v84 G#5:.5 A5:.5 B5:.5',
    'v92 F#5:6',
  ],
  harmony: [
    roll128(['E3', 'G#3', 'B3', 'D#4']),
    roll128(['E3', 'G#3', 'A3', 'C#4']),
    roll128(['F#3', 'A3', 'C#4', 'G#4']),
    roll128(['E3', 'F#3', 'A3', 'B3']),
  ],
  bass: [float128('C#2', 'G#1'), float128('A1', 'E2'), float128('F#1', 'C#2'), float128('B1', 'F#1')],
}

const returnFromE: Passage = {
  chords: ['Gmaj7', 'Em9', 'A7sus4', 'D(add9)'],
  melody: [
    'v90 B5:3 v84 G5:1.5 v82 D5:.5 E5:.5 F#5:.5',
    'v92 G5:6',
    'v88 E5:3 v84 F#5:1.5 v82 G5:.5 F#5:.5 E5:.5',
    'v90 A5:6',
  ],
  harmony: [
    roll128(['F#3', 'G3', 'B3', 'D4']),
    roll128(['F#3', 'G3', 'B3', 'D4']),
    roll128(['E3', 'G3', 'A3', 'D4']),
    roll128(['F#3', 'A3', 'D4', 'E4']),
  ],
  bass: [float128('G1', 'D2'), float128('E1', 'B1'), float128('A1', 'E2'), float128('D2', 'A1')],
}

// ==========================================
// 案2: 言い直しから短3度上（ヘ長調）へ移り、D6 の山場を経て主調へ戻る
// ==========================================

export const restateOpenInD: Passage = {
  chords: [...hookBars(0, 2).chords, 'G(add9)', 'A7sus4'],
  melody: [
    ...hookBars(0, 2).melody,
    'v92 B5:3 v86 G5:1.5 v84 F#5:.5 G5:.5 A5:.5',
    'v90 E5:6',
  ],
  harmony: [
    ...hookBars(0, 2).harmony,
    roll128(['G3', 'A3', 'B3', 'D4']),
    roll128(['E3', 'G3', 'A3', 'D4']),
  ],
  bass: [...hookBars(0, 2).bass, float128('G1', 'D2'), float128('A1', 'E2')],
}

export const stayInFAndReturn: Passage = {
  chords: ['Bbmaj7', 'Gm9', 'A7sus4', 'D(add9)'],
  melody: [
    'v96 D6:3 v88 C6:1.5 v84 Bb5:.5 A5:.5 G5:.5',
    'v92 A5:6',
    'v88 G5:3 v84 E5:1.5 v82 D5:.5 E5:.5 F#5:.5',
    'v90 D5:6',
  ],
  harmony: [
    roll128(['F3', 'A3', 'Bb3', 'D4']),
    roll128(['F3', 'A3', 'Bb3', 'D4']),
    roll128(['E3', 'G3', 'A3', 'D4']),
    roll128(['F#3', 'A3', 'D4', 'E4']),
  ],
  bass: [float128('Bb1', 'F1'), float128('G1', 'D2'), float128('A1', 'E2'), float128('D2', 'A1')],
}

// ==========================================
// 案3: 5小節目から長3度下（変ロ長調）へ沈み、bVI の響きから主調へ戻る
// ==========================================

const stayInBb: Passage = {
  chords: ['Gm9', 'Ebmaj7', 'Cm9', 'F7sus4'],
  melody: [
    'v88 D5:3 v84 Bb4:1.5 v82 G4:.5 A4:.5 Bb4:.5',
    'v90 C5:6',
    'v90 Eb5:3 v86 C5:1.5 v84 A4:.5 Bb4:.5 C5:.5',
    'v92 D5:6',
  ],
  harmony: [
    roll128(['F3', 'A3', 'Bb3', 'D4']),
    roll128(['G3', 'Bb3', 'D4', 'Eb4']),
    roll128(['G3', 'Bb3', 'D4', 'Eb4']),
    roll128(['F3', 'A3', 'Bb3', 'C4']),
  ],
  bass: [float128('G1', 'D2'), float128('Eb1', 'Bb1'), float128('C2', 'G1'), float128('F1', 'C2')],
}

const returnFromBb: Passage = {
  chords: ['Bbmaj7', 'Em7/A', 'A7sus4', 'D(add9)'],
  melody: [
    'v90 F5:3 v86 D5:1.5 v84 Bb4:.5 C5:.5 D5:.5',
    'v92 E5:6',
    'v90 G5:3 v86 E5:1.5 v84 D5:.5 E5:.5 F#5:.5',
    'v94 A5:6',
  ],
  harmony: [
    roll128(['F3', 'A3', 'Bb3', 'D4']),
    roll128(['E3', 'G3', 'B3', 'D4']),
    roll128(['E3', 'G3', 'A3', 'D4']),
    roll128(['F#3', 'A3', 'D4', 'E4']),
  ],
  bass: [float128('Bb1', 'F1'), float128('A1', 'E2'), float128('A1', 'E2'), float128('D2', 'A1')],
}

// ==========================================
// 案4: 平行移動せず、主調の言い直しと同主短調の借用和音で深めて戻る
// ==========================================

const restateHighInD: Passage = {
  chords: [...hookBars(0, 2).chords, 'G(add9)', 'A7sus4'],
  melody: [
    ...hookBars(0, 2).melody,
    'v92 B5:3 v86 G5:1.5 v84 D5:.5 E5:.5 G5:.5',
    'v90 E5:6',
  ],
  harmony: [
    ...hookBars(0, 2).harmony,
    roll128(['G3', 'A3', 'B3', 'D4']),
    roll128(['E3', 'G3', 'A3', 'D4']),
  ],
  bass: [...hookBars(0, 2).bass, float128('G1', 'D2'), float128('A1', 'E2')],
}

const modalShadowInD: Passage = {
  chords: ['Bbmaj7', 'C(add9)', 'Dm9', 'Em7b5'],
  melody: [
    'v88 F5:3 v84 D5:1.5 v82 Bb4:.5 C5:.5 D5:.5',
    'v90 E5:6',
    'v92 A5:3 v86 F5:1.5 v84 D5:.5 E5:.5 F5:.5',
    'v92 G5:6',
  ],
  harmony: [
    roll128(['F3', 'A3', 'Bb3', 'D4']),
    roll128(['E3', 'G3', 'C4', 'D4']),
    roll128(['F3', 'A3', 'C4', 'E4']),
    roll128(['E3', 'G3', 'Bb3', 'D4']),
  ],
  bass: [float128('Bb1', 'F1'), float128('C2', 'G1'), float128('D2', 'A1'), float128('E1', 'Bb1')],
}

const climaxReturnInD: Passage = {
  chords: ['Gmaj7', 'A/G', 'Bm9', 'D(add9)'],
  melody: [
    'v96 D6:3 v88 B5:1.5 v84 G5:.5 A5:.5 B5:.5',
    'v92 A5:6',
    'v88 F#5:3 v84 D5:1.5 v82 B4:.5 C#5:.5 E5:.5',
    'v90 D5:6',
  ],
  harmony: [
    roll128(['F#3', 'G3', 'B3', 'D4']),
    roll128(['E3', 'A3', 'C#4', 'E4']),
    roll128(['F#3', 'A3', 'C#4', 'D4']),
    roll128(['F#3', 'A3', 'D4', 'E4']),
  ],
  bass: [float128('G1', 'D2'), float128('G1', 'E2'), float128('B1', 'F#1'), float128('D2', 'A1')],
}

// ==========================================
// 4つの展開案を組み立てる
// ==========================================

const theme = (
  id: string,
  title: string,
  description: string,
  passages: { label: string; intention: string; passage: Passage }[],
  moments: CompositionStudy['moments'],
) =>
  buildSketch({
    id,
    title,
    description,
    tempo: 126,
    meter: [12, 8],
    harmonyGate: 0.9,
    passages,
    moments,
  })

export const greyThroneDevelopments: CompositionStudy[] = [
  theme(
    'valhardt-theme-grey-whole-step-up',
    '灰座への敬礼 — 全音上（ホ長調）の遠望',
    'ニ長調 · ♩=126 · 12/8 · 16小節。5小節目からフックごと全音上のホ長調へ移り、9〜12小節目もホ長調に留まって11小節目の E6 で山場を作る。終盤は Gmaj7 → Em9 → A7sus4 でニ長調へ帰着',
    [
      { label: 'フック', intention: '選ばれたフックのまま', passage: greyThroneHook },
      { label: '平行移動', intention: '全音上（ホ長調）へ旋律と和声ごと移す', passage: transposePassage(greyThroneHook, 2) },
      { label: '留まる', intention: 'ホ長調に留まり、11小節目の E6 で山場を作る', passage: stayInE },
      { label: '帰着', intention: 'Gmaj7 → A7sus4 を経てニ長調へ戻る', passage: returnFromE },
    ],
    [
      { bar: 5, beat: 0, pitches: ['E2', 'G#3', 'B5'], intention: '全音上のホ長調 E(add9) へ移調した冒頭' },
      { bar: 11, beat: 0, pitches: ['F#1', 'F#3', 'E6'], intention: 'F#m9 の上の最高音 E6' },
      { bar: 16, beat: 1.5, pitches: ['D2', 'E4', 'A5'], intention: 'ニ長調 D(add9) への帰着' },
    ],
  ),
  theme(
    'valhardt-theme-grey-restate-minor-third-up',
    '灰座への敬礼 — 言い直しから短3度上（ヘ長調）へ',
    'ニ長調 · ♩=126 · 12/8 · 16小節。5〜8小節目は主調のまま言い直して A7sus4 で半終止し、9小節目から短3度上のヘ長調へ移調。13小節目の Bbmaj7 上の D6 を頂点にニ長調の根音 D5 へ閉じる',
    [
      { label: 'フック', intention: '選ばれたフックのまま', passage: greyThroneHook },
      { label: '言い直し', intention: '主調のまま前半を言い直し、G(add9) → A7sus4 で開く', passage: restateOpenInD },
      { label: '平行移動', intention: '短3度上（ヘ長調）へ旋律と和声ごと移す', passage: transposePassage(greyThroneHook, 3) },
      { label: '帰着', intention: 'ヘ長調の Bbmaj7（D6）から A7sus4 を経てニ長調へ閉じる', passage: stayInFAndReturn },
    ],
    [
      { bar: 8, beat: 0, pitches: ['A1', 'E3', 'E5'], intention: 'A7sus4 の半終止' },
      { bar: 9, beat: 0, pitches: ['F2', 'A3', 'C6'], intention: '短3度上のヘ長調 F(add9) への移調' },
      { bar: 13, beat: 0, pitches: ['Bb1', 'F3', 'D6'], intention: 'Bbmaj7 の上の最高音 D6' },
      { bar: 16, beat: 1.5, pitches: ['D2', 'E4', 'D5'], intention: '主調 D(add9) の根音 D5 へ終止' },
    ],
  ),
  theme(
    'valhardt-theme-grey-flat-six',
    '灰座への敬礼 — ♭VI（変ロ長調）の陰りへ沈む',
    'ニ長調 · ♩=126 · 12/8 · 16小節。5小節目から長3度下の変ロ長調（♭VI の領域）へ沈み、9〜12小節目で Gm9 → Ebmaj7 → Cm9 → F7sus4 と静かに上り直す。13小節目の Bbmaj7 を架け橋に A7sus4 へ渡して戻る',
    [
      { label: 'フック', intention: '選ばれたフックのまま', passage: greyThroneHook },
      { label: '平行移動', intention: '長3度下（変ロ長調）へ旋律と和声ごと沈める', passage: transposePassage(greyThroneHook, -4) },
      { label: '留まる', intention: '変ロ長調に留まり、低い音域から段階的に上り直す', passage: stayInBb },
      { label: '帰着', intention: 'Bbmaj7（ニ長調の ♭VI）から Em7/A → A7sus4 で戻る', passage: returnFromBb },
    ],
    [
      { bar: 5, beat: 0, pitches: ['Bb1', 'D3', 'F5'], intention: '変ロ長調 Bb(add9) への下降移調' },
      { bar: 12, beat: 0, pitches: ['F1', 'F3', 'D5'], intention: 'F7sus4 の13度 D5' },
      { bar: 16, beat: 1.5, pitches: ['D2', 'E4', 'A5'], intention: 'ニ長調 D(add9) の5度 A5 へ戻る' },
    ],
  ),
  theme(
    'valhardt-theme-grey-home-modal',
    '灰座への敬礼 — 平行移動せず、主調の借用和音で深める',
    'ニ長調 · ♩=126 · 12/8 · 16小節。転調による平行移動を使わず、5〜8小節目の言い直しから 9〜12小節目は同主短調の Bbmaj7・C(add9)・Dm9・Em7b5 を踏み、13小節目の Gmaj7 上の D6 で山場を迎えて閉じる',
    [
      { label: 'フック', intention: '選ばれたフックのまま', passage: greyThroneHook },
      { label: '言い直し', intention: '主調のまま高めの頂点 B5 を経て A7sus4 で開く', passage: restateHighInD },
      { label: '借用の陰り', intention: '同主短調の Bbmaj7 → C(add9) → Dm9 → Em7b5 で陰らせる', passage: modalShadowInD },
      { label: '山場と帰着', intention: 'Gmaj7 上の最高音 D6 から Bm9 を経て D(add9) へ閉じる', passage: climaxReturnInD },
    ],
    [
      { bar: 9, beat: 0, pitches: ['Bb1', 'F3', 'F5'], intention: '同主短調からの借用 Bbmaj7' },
      { bar: 11, beat: 0, pitches: ['D2', 'F3', 'A5'], intention: 'Dm9 の5度 A5' },
      { bar: 13, beat: 0, pitches: ['G1', 'F#3', 'D6'], intention: 'Gmaj7 の上の最高音 D6' },
      { bar: 16, beat: 1.5, pitches: ['D2', 'E4', 'D5'], intention: 'D(add9) の根音 D5 で終止' },
    ],
  ),
]
