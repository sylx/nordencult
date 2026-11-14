import { buildSketch, transposePassage, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { northernLegionHook } from './hooks-001.ts'

// 戦略画面BGMその7「ヴァルハルト家（再」 — 主題の展開 01。
// 派生元: valhardt2-hook-northern-legion（「北方軍団の行進」、ホ短調・♩=128・4/4）。
// COMPOSING.md「展開の型」に従い、冒頭4小節は northernLegionHook をそのまま置き、
// 同じリズム型（♩ ♪♪ ♩ ♩ | 𝅗𝅥 ♩ ♩）を保ったまま、
// 言い直し・平行移動（transposePassage）・移動先への滞在・主調への帰着を4通りで比較する。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

const stride44 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:1 v46 ${c}:1 v54 ${c}:1 v46 ${c}:1`
}

const driveBass = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`
const pedalBounce = (low: string, high: string) => `${low}:1.5 ${low}:.5 ${low}:1 ${high}:1`
const octaveDrive = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`
const halfBass = (a: string, b: string) => `${a}:2 ${b}:2`

// ==========================================
// 案1: 5小節目から全音上（嬰ヘ短調）へ平行移動し、8小節留まってから戻る
// ==========================================

const wholeStepStay: Passage = {
  chords: ['F#m(add9)', 'Eadd9/F#', 'Bm7', 'C#sus4'],
  melody: [
    'v90 C#5:1 v84 F#5:.5 G#5:.5 v92 A5:1 v86 C#6:1',
    'v94 B5:2 v88 A5:1 G#5:1',
    'v90 A5:1 v84 G#5:.5 A5:.5 v92 B5:1 v86 C#6:1',
    'v96 D6:2 v90 C#6:2',
  ],
  harmony: [
    stride44(['A3', 'C#4', 'G#4']),
    stride44(['B3', 'E4', 'F#4']),
    stride44(['A3', 'D4', 'F#4']),
    stride44(['G#3', 'C#4', 'F#4']),
  ],
  bass: [
    octaveDrive('F#2', 'F#3', 'C#3'),
    pedalBounce('F#2', 'F#3'),
    driveBass('B1', 'F#2'),
    halfBass('C#2', 'G#2'),
  ],
}

const wholeStepReturn: Passage = {
  chords: ['Em(add9)', 'Cmaj7', 'Am7', 'Bsus4'],
  melody: [
    'v90 B5:1 v84 A5:.5 G5:.5 v92 F#5:1 v86 E5:1',
    'v90 G5:2 v86 E5:1 D5:1',
    'v88 E5:1 v84 D5:.5 E5:.5 v90 G5:1 v86 E5:1',
    'v92 F#5:2 v86 B4:2',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['G3', 'C4', 'E4']),
    stride44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    driveBass('E2', 'B2'),
    driveBass('C2', 'G2'),
    driveBass('A1', 'E2'),
    halfBass('B1', 'F#2'),
  ],
}

// ==========================================
// 案2: 主調で言い直してから、9小節目で短3度上（ト短調）へ平行移動する
// ==========================================

const restateToGMinor: Passage = {
  chords: ['Em(add9)', 'Dadd9/E', 'Cmaj7', 'Dadd9'],
  melody: [
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 E5:1',
    'v90 F#5:2 v86 D5:1 E5:1',
    'v90 G5:1 v84 A5:.5 B5:.5 v94 C6:1 v88 G5:1',
    'v92 A5:2 v88 F#5:1 D5:1',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['A3', 'D4', 'F#4']),
  ],
  bass: [
    octaveDrive('E2', 'E3', 'B2'),
    pedalBounce('E2', 'E3'),
    driveBass('C2', 'G2'),
    halfBass('D2', 'A2'),
  ],
}

const minorThirdReturn: Passage = {
  chords: ['Cmaj7', 'Dadd9', 'Am(add9)', 'Em(add9)'],
  melody: [
    'v92 G5:1 v86 E5:.5 F#5:.5 v94 G5:1 v88 E5:1',
    'v92 F#5:2 v86 D5:1 E5:1',
    'v90 E5:1 v84 C5:.5 D5:.5 v92 E5:1 v86 G5:1',
    'v94 E5:2 v86 B4:2',
  ],
  harmony: [
    stride44(['G3', 'B3', 'E4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    driveBass('C2', 'G2'),
    driveBass('D2', 'A2'),
    driveBass('A1', 'E2'),
    halfBass('E2', 'B2'),
  ],
}

// ==========================================
// 案3: 5小節目から短3度下（嬰ハ短調）へ沈み、13小節目で主調へ戻る
// ==========================================

const minorThirdDownStay: Passage = {
  chords: ['Amaj7', 'Badd9', 'F#m7', 'G#sus4'],
  melody: [
    'v90 E5:1 v84 C#5:.5 D#5:.5 v92 E5:1 v86 G#5:1',
    'v94 F#5:2 v88 D#5:1 E5:1',
    'v90 A5:1 v84 G#5:.5 A5:.5 v92 B5:1 v86 A5:1',
    'v94 G#5:2 v88 F#5:2',
  ],
  harmony: [
    stride44(['G#3', 'C#4', 'E4']),
    stride44(['F#3', 'B3', 'C#4']),
    stride44(['A3', 'C#4', 'E4']),
    stride44(['G#3', 'C#4', 'D#4']),
  ],
  bass: [
    driveBass('A1', 'E2'),
    driveBass('B1', 'F#2'),
    driveBass('F#2', 'C#3'),
    halfBass('G#1', 'D#2'),
  ],
}

const minorThirdDownReturn: Passage = {
  chords: ['Em(add9)', 'Cmaj7', 'Am7', 'Em(add9)'],
  melody: [
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 B5:1',
    'v94 C6:2 v88 G5:1 E5:1',
    'v90 G5:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 E5:1',
    'v92 E5:3 r:1',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['G3', 'C4', 'E4']),
    stride44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    octaveDrive('E2', 'E3', 'B2'),
    driveBass('C2', 'G2'),
    driveBass('A1', 'E2'),
    pedalBounce('E2', 'B2'),
  ],
}

// ==========================================
// 案4: 平行移動せず、主調のまま bII（Fmaj7）など借用和音で深める
// ==========================================

const homeRestatePhrygian: Passage = {
  chords: ['Em(add9)', 'Dadd9/E', 'Fmaj7', 'Gadd9'],
  melody: [
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 E5:1',
    'v90 F#5:2 v86 D5:1 E5:1',
    'v90 A5:1 v84 G5:.5 F5:.5 v92 E5:1 v86 C5:1',
    'v92 D5:2 v88 B4:2',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['A3', 'C4', 'E4']),
    stride44(['A3', 'B3', 'D4']),
  ],
  bass: [
    octaveDrive('E2', 'E3', 'B2'),
    pedalBounce('E2', 'E3'),
    driveBass('F2', 'C3'),
    halfBass('G2', 'D3'),
  ],
}

const homeModalClimb: Passage = {
  chords: ['Am(add9)', 'Dadd9', 'Gmaj7', 'Cmaj7'],
  melody: [
    'v90 E5:1 v84 A5:.5 B5:.5 v94 C6:1 v88 A5:1',
    'v92 B5:2 v88 G5:1 A5:1',
    'v90 B5:1 v84 A5:.5 G5:.5 v92 F#5:1 v86 D5:1',
    'v92 E5:2 v86 G5:2',
  ],
  harmony: [
    stride44(['G3', 'B3', 'C4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['G3', 'B3', 'F#4']),
    stride44(['G3', 'B3', 'E4']),
  ],
  bass: [
    driveBass('A1', 'E2'),
    driveBass('D2', 'A2'),
    driveBass('G1', 'D2'),
    halfBass('C2', 'G2'),
  ],
}

const homeModalClose: Passage = {
  chords: ['Am7', 'Dadd9', 'Cmaj7', 'Em(add9)'],
  melody: [
    'v90 A5:1 v84 G5:.5 F#5:.5 v92 E5:1 v86 C5:1',
    'v90 F#5:2 v86 D5:1 E5:1',
    'v90 G5:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 A5:1',
    'v94 F#5:2 v88 E5:2',
  ],
  harmony: [
    stride44(['G3', 'C4', 'E4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    driveBass('A1', 'E2'),
    driveBass('D2', 'A2'),
    driveBass('C2', 'G2'),
    halfBass('E2', 'B2'),
  ],
}

// ==========================================
// 4案の試聴用 Study 組み立て
// ==========================================

export const northernLegionDevelopments: CompositionStudy[] = [
  buildSketch({
    id: 'valhardt2-theme-northern-whole-step',
    title: '北方軍団の行進 — 全音上（嬰ヘ短調）で留まり、高みから帰る',
    description:
      'ホ短調 · ♩=128 · 4/4 · 16小節。5小節目から全音上の嬰ヘ短調へ平行移動し、8小節留まって12小節目の D6 で山場を作ったあと、主調ホ短調の半終止（Bsus4）へ戻る',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま', passage: northernLegionHook },
      { label: '平行移動（嬰ヘ短調）', intention: '全音上へ旋律と和声ごと移す', passage: transposePassage(northernLegionHook, 2) },
      { label: '移動先に留まる', intention: '嬰ヘ短調に留まり、12小節目の D6 へ登る', passage: wholeStepStay },
      { label: '帰着', intention: 'ホ短調へ戻り、B4 を残して頭へつなぐ', passage: wholeStepReturn },
    ],
  }),
  buildSketch({
    id: 'valhardt2-theme-northern-minor-third',
    title: '北方軍団の行進 — 言い直しから短3度上（ト短調）へ開く',
    description:
      'ホ短調 · ♩=128 · 4/4 · 16小節。前半8小節は主調のまま言い直して C6 へ開き、9小節目から短3度上のト短調へ平行移動して、13小節目から主調へ帰着する',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま', passage: northernLegionHook },
      { label: '言い直し', intention: '主調のまま C6 へ上り、Dadd9 でト短調を準備する', passage: restateToGMinor },
      { label: '平行移動（ト短調）', intention: '9小節目から短3度上へ旋律と和声ごと移す', passage: transposePassage(northernLegionHook, 3) },
      { label: '帰着', intention: 'ト短調から Cmaj7–Dadd9 を経てホ短調へ戻る', passage: minorThirdReturn },
    ],
  }),
  buildSketch({
    id: 'valhardt2-theme-northern-minor-third-down',
    title: '北方軍団の行進 — 短3度下（嬰ハ短調）へ沈み、再び登る',
    description:
      'ホ短調 · ♩=128 · 4/4 · 16小節。5小節目から短3度下の嬰ハ短調へ移り、8小節間その調の陰りに留まったあと、13小節目でホ短調に復帰して C6 の山場を作る',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま', passage: northernLegionHook },
      { label: '平行移動（嬰ハ短調）', intention: '5小節目から短3度下へ移し、落ち着いた陰りを作る', passage: transposePassage(northernLegionHook, -3) },
      { label: '移動先に留まる', intention: '嬰ハ短調のまま B5 まで登り、G#sus4 で半終止する', passage: minorThirdDownStay },
      { label: '帰着', intention: 'ホ短調へ戻り、14小節目の C6 を経て主音 E5 に着地する', passage: minorThirdDownReturn },
    ],
  }),
  buildSketch({
    id: 'valhardt2-theme-northern-home-modal',
    title: '北方軍団の行進 — 主調のまま bII（Fmaj7）の陰りで深める',
    description:
      'ホ短調 · ♩=128 · 4/4 · 16小節。平行移動はせず、5〜8小節でナポリの Fmaj7→Gadd9 へ言い直し、9〜12小節で C6 の山場を作ったあと、13〜16小節で静かに戻る',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま', passage: northernLegionHook },
      { label: '言い直し（bII借用）', intention: '同じ動機を Fmaj7→Gadd9 の不思議な陰りで受け直す', passage: homeRestatePhrygian },
      { label: '展開（山場）', intention: 'Am(add9) から C6 へ駆け上がり、Gmaj7–Cmaj7 で開く', passage: homeModalClimb },
      { label: '帰着', intention: '同じリズム型で落ち着き、F#5→E5 で閉じる', passage: homeModalClose },
    ],
  }),
]
