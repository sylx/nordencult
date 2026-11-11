import type { CompositionStudy } from '../../study.ts'
import { buildTheme, comp, FOUR_ON_FLOOR, push, repeat } from './themes-001.ts'
import { secondThemes } from './themes-002.ts'

// 主題集 04。主題集 03 の「凪のあとの追い風」（Abmaj7 を保って C9sus4 から Fmaj7 へ）と
// 「変ニへ沈む」（Abmaj7 から Dbmaj7）の和声を土台に、9〜12小節目の旋律を作り直した6案。
// 1〜8小節目と 13〜16小節目、伴奏と低音の刻みは「真昼の凱風、ふたたび」のまま。
// どの案も 2小節+2小節（または 1+1+2）で同じ形を繰り返し、向かう先を1つに絞る。

const parent = secondThemes.find((study) => study.song.id === 'summer-noon-fair-wind-ascent')!.song
const parts = parent.sections[0].parts

const HEAD_CHORDS = ['Fmaj7', 'G', 'Em7', 'Am7', 'Fmaj7', 'G', 'C(add9)', 'C']
const TAIL_CHORDS = ['Fmaj7', 'G', 'Ab Bb', 'C']

/** 9〜12小節目だけを差し替える。 */
const splice = (part: string[], middle: string[]) => [...part.slice(0, 8), ...middle, ...part.slice(12)]

const HOOK = 'v94 G5:3 v86 Eb5:.5 v90 G5:.5'

const Ab = 'C4+Eb4+G4'
const Db = 'C4+F4+Ab4'
const Gm7 = 'Bb3+D4+F4'
const Csus = 'Bb3+D4+F4'

interface Middle {
  id: string
  title: string
  description: string
  chords: string[]
  melody: string[]
  harmony: string[]
  bass: string[]
  phrases: CompositionStudy['phrases']
  moments: CompositionStudy['moments']
}

const buildMiddle = (draft: Middle) => buildTheme({
  id: draft.id,
  title: draft.title,
  description: draft.description,
  tempo: parent.tempo,
  meter: [4, 4],
  harmonyGate: 0.75,
  bassGate: 0.8,
  chords: [...HEAD_CHORDS, ...draft.chords, ...TAIL_CHORDS],
  melody: splice(parts.melody, draft.melody),
  harmony: splice(parts.harmony, draft.harmony),
  bass: splice(parts.bass, draft.bass),
  drums: repeat(FOUR_ON_FLOOR, 16),
  phrases: [
    { label: '前半（元のまま）', from: 1, to: 8, intention: '「真昼の凱風、ふたたび」の前半と Eb5–F5 の弱起を保つ。' },
    ...draft.phrases,
    { label: '終盤（元のまま）', from: 13, to: 16, intention: 'Fmaj7→G→Ab→Bb→C。' },
  ],
  moments: draft.moments,
})

export const fourthThemes: CompositionStudy[] = [
  buildMiddle({
    id: 'summer-noon-mid-restated',
    title: '真昼の凱風 — 主題の言い直し',
    description:
      'ハ長調 · ♩=126 · 4/4。冒頭4小節の旋律（E–D–G–E）を、形もリズムもそのまま Abmaj7 の上で言い直す案（G–F–Bb–G）。新しい動機を足さない。2小節目の F5・D5 は Abmaj7 の6度と #11 になる。和声は Abmaj7 を3小節保ち、C9sus4 から Fmaj7 へ',
    chords: ['Abmaj7', 'Abmaj7', 'Abmaj7', 'C9sus4'],
    melody: [
      HOOK,
      'v92 F5:3 v84 D5:.5 v88 F5:.5',
      'v98 Bb5:2.5 v90 G5:.5 v88 F5:1',
      'v92 G5:3 r:1',
    ],
    harmony: [comp(Ab), comp(Ab), comp(Ab), comp(Csus)],
    bass: [push('Ab1'), push('Ab1'), push('Ab1'), push('C2')],
    phrases: [
      { label: '冒頭2小節の言い直し', from: 9, to: 10, intention: 'E5–(C5 E5)、D5–(B4 D5) を G5–(Eb5 G5)、F5–(D5 F5) に移す。' },
      { label: '3〜4小節目の言い直し', from: 11, to: 12, intention: 'G5–E5–D5、E5 を Bb5–G5–F5、G5 に移す。G5 から次の A5 へ1音上がる。' },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'F5'], intention: '2小節目も Abmaj7（旋律は6度の F5）' },
      { bar: 10, beat: 3, pitches: ['Ab2', 'C4', 'Eb4', 'G4', 'D5'], intention: '#11 の D5' },
      { bar: 11, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'Bb5'], intention: '3小節目も Abmaj7（旋律は9度の Bb5）' },
      { bar: 12, beat: 0, pitches: ['C2', 'Bb3', 'D4', 'F4', 'G5'], intention: 'C9sus4' },
    ],
  }),

  buildMiddle({
    id: 'summer-noon-mid-ladder',
    title: '真昼の凱風 — 音階の梯子',
    description:
      'ハ長調 · ♩=126 · 4/4。8小節目の弱起（Eb5–F5→G5）をそのまま繰り返して昇る案。伸ばす音が G5→Bb5→D6 と3度ずつ上がり、間を2音の弱起でつなぐので、全体では Eb から D までの音階を1本昇る。頂点の D6 は Abmaj7 の #11。C9sus4 で C6–Bb5–G5 と降りて A5 へ',
    chords: ['Abmaj7', 'Abmaj7', 'Abmaj7', 'C9sus4'],
    melody: [
      'v94 G5:3 v88 G5:.5 v90 Ab5:.5',
      'v98 Bb5:3 v92 Bb5:.5 v96 C6:.5',
      'v102 D6:2.5 v96 C6:.5 v92 Bb5:1',
      'v96 C6:1.5 v92 Bb5:1.5 v88 G5:1',
    ],
    harmony: [comp(Ab), comp(Ab), comp(Ab), comp(Csus)],
    bass: [push('Ab1'), push('Ab1'), push('Ab1'), push('C2')],
    phrases: [
      { label: '梯子を昇る', from: 9, to: 11, intention: '(Eb F) G、(G Ab) Bb、(Bb C) D と、2音の弱起と伸ばす音を3回重ねる。' },
      { label: '降りて渡す', from: 12, to: 12, intention: 'C6–Bb5–G5 の 3+3+2 で降り、次の A5–G5–E5 と同じ形にする。' },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'Bb5'], intention: '9度の Bb5' },
      { bar: 11, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'D6'], intention: '頂点、#11 の D6' },
      { bar: 12, beat: 0, pitches: ['C2', 'Bb3', 'D4', 'F4', 'C6'], intention: 'C9sus4' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7 への解決' },
    ],
  }),

  buildMiddle({
    id: 'summer-noon-mid-via-db',
    title: '真昼の凱風 — 変ニを経て',
    description:
      'ハ長調 · ♩=126 · 4/4。「凪のあとの追い風」と「変ニへ沈む」の和声を合わせた案。Abmaj7 を2小節、Dbmaj7 を1小節、C9sus4 を1小節。低音は Ab→Db→C→F と進む。旋律は「3拍伸ばして2音で返す」動機を G5→Bb5→C6 と3回上げ、C9sus4 の D6 を頂点にして D6–C6–Bb5 と降りて A5 へ',
    chords: ['Abmaj7', 'Abmaj7', 'Dbmaj7', 'C9sus4'],
    melody: [
      HOOK,
      'v96 Bb5:3 v88 G5:.5 v92 Bb5:.5',
      'v100 C6:3 v92 Ab5:.5 v96 C6:.5',
      'v102 D6:2 v96 C6:1 v92 Bb5:1',
    ],
    harmony: [comp(Ab), comp(Ab), comp(Db), comp(Csus)],
    bass: [push('Ab1'), push('Ab1'), push('Db2'), push('C2')],
    phrases: [
      { label: 'Abmaj7 の2小節', from: 9, to: 10, intention: '動機を G5、Bb5 と上げる。' },
      { label: 'Dbmaj7 で色を変える', from: 11, to: 11, intention: '同じ動機を C6 で。和音が Dbmaj7 に変わり、C6 は長7度になる。' },
      { label: '頂点から降りる', from: 12, to: 12, intention: 'C9sus4 の D6 から C6–Bb5 と降り、次の A5 へ続く。' },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'Bb5'], intention: '2小節目も Abmaj7' },
      { bar: 11, beat: 0, pitches: ['Db2', 'C4', 'F4', 'Ab4', 'C6'], intention: 'Dbmaj7（旋律の C6 が長7度）' },
      { bar: 12, beat: 0, pitches: ['C2', 'Bb3', 'D4', 'F4', 'D6'], intention: 'C9sus4 と頂点の D6' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7 への解決' },
    ],
  }),

  buildMiddle({
    id: 'summer-noon-mid-two-questions',
    title: '真昼の凱風 — 二度の問いかけ',
    description:
      'ハ長調 · ♩=126 · 4/4。伸ばす音から離れ、「降りてから2音で上がって伸ばす」2小節の句を2回置く案。1回目は G5 から C5 へ降りて G5 に戻る。2回目は3度上の Bb5 から始め、同じ形で C9sus4 の D6 まで届く。和声は Abmaj7 を3小節保ち、C9sus4 から Fmaj7 へ',
    chords: ['Abmaj7', 'Abmaj7', 'Abmaj7', 'C9sus4'],
    melody: [
      'v94 G5:1.5 v88 F5:.5 v88 Eb5:1 v84 C5:1',
      'v86 Eb5:.5 v88 F5:.5 v94 G5:3',
      'v98 Bb5:1.5 v92 Ab5:.5 v92 G5:1 v88 Eb5:1',
      'v90 G5:.5 v94 Bb5:.5 v102 D6:2 v94 Bb5:1',
    ],
    harmony: [comp(Ab), comp(Ab), comp(Ab), comp(Csus)],
    bass: [push('Ab1'), push('Ab1'), push('Ab1'), push('C2')],
    phrases: [
      { label: '一度目の問い', from: 9, to: 10, intention: 'G5–F5–Eb5–C5 と降り、Eb5–F5 で G5 に戻って伸ばす（8小節目の弱起と同じ2音）。' },
      { label: '二度目の問い', from: 11, to: 12, intention: '3度上の Bb5 から同じ形で降り、G5–Bb5 で D6 へ上がる。Bb5 から次の A5 へ。' },
    ],
    moments: [
      { bar: 10, beat: 1.5, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'G5'], intention: '一度目の着地 G5' },
      { bar: 11, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'Bb5'], intention: '二度目は Bb5 から' },
      { bar: 12, beat: 1.5, pitches: ['C2', 'Bb3', 'D4', 'F4', 'D6'], intention: 'C9sus4 と頂点の D6' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7 への解決' },
    ],
  }),

  buildMiddle({
    id: 'summer-noon-mid-two-runs',
    title: '真昼の凱風 — 二段の駆け上がり',
    description:
      'ハ長調 · ♩=126 · 4/4。「凪のあとの追い風」の、頭を休んで8分で動く句を残し、向きを上向きにそろえた案。動機のあと Eb5 から C6、G5 から D6 と、1段高く2回駆け上がる。和声は Abmaj7 を2小節保ち、Gm7→C9sus4–C7 を経て Fmaj7 へ進む',
    chords: ['Abmaj7', 'Abmaj7', 'Gm7', 'C9sus4 C7'],
    melody: [
      HOOK,
      'r:.5 v88 Eb5:.5 v90 G5:.5 v94 Bb5:.5 v98 C6:2',
      'r:.5 v90 G5:.5 v94 Bb5:.5 v98 C6:.5 v102 D6:2',
      'v96 C6:1.5 v92 Bb5:1.5 v88 G5:1',
    ],
    harmony: [comp(Ab), comp(Ab), comp(Gm7), comp(Csus, 'Bb3+E4+G4')],
    bass: [push('Ab1'), push('Ab1'), push('G2'), push('C2')],
    phrases: [
      { label: '動機と一段目', from: 9, to: 10, intention: '動機のあと、頭を休んで Eb5–G5–Bb5 と駆け上がり C6 を伸ばす。' },
      { label: '二段目', from: 11, to: 11, intention: 'Gm7 の上で G5–Bb5–C6 と1段高く駆け上がり、D6 を伸ばす。' },
      { label: '降りて渡す', from: 12, to: 12, intention: 'C9sus4→C7 の上を C6–Bb5–G5 の 3+3+2 で降り、次の A5–G5–E5 と同じ形にする。' },
    ],
    moments: [
      { bar: 10, beat: 3, pitches: ['Ab2', 'C4', 'Eb4', 'G4', 'C6'], intention: '一段目の着地 C6（まだ Abmaj7）' },
      { bar: 11, beat: 3, pitches: ['G3', 'Bb3', 'D4', 'F4', 'D6'], intention: 'Gm7 と頂点の D6' },
      { bar: 12, beat: 0, pitches: ['C2', 'Bb3', 'D4', 'F4', 'C6'], intention: 'C9sus4' },
      { bar: 12, beat: 3, pitches: ['C3', 'Bb3', 'E4', 'G4', 'G5'], intention: 'C7（E4）' },
    ],
  }),

  buildMiddle({
    id: 'summer-noon-mid-db-parallel',
    title: '真昼の凱風 — 変ニへ沈む、二行の詩',
    description:
      'ハ長調 · ♩=126 · 4/4。「変ニへ沈む」と同じ Abmaj7 2小節→Dbmaj7 2小節の上で、旋律を2行そろえた案。1行目は G5 を伸ばして Bb5–G5–Eb5 と降りる。2行目は同じ形を1音上げ、Ab5 を伸ばして C6–Ab5–F5 と降りる。F5 から次の A5 へ3度上がって Fmaj7 に入る',
    chords: ['Abmaj7', 'Abmaj7', 'Dbmaj7', 'Dbmaj7'],
    melody: [
      HOOK,
      'v96 Bb5:1.5 v90 G5:1.5 v86 Eb5:1',
      'v96 Ab5:3 v88 F5:.5 v92 Ab5:.5',
      'v100 C6:1.5 v94 Ab5:1.5 v88 F5:1',
    ],
    harmony: [comp(Ab), comp(Ab), comp(Db), comp(Db)],
    bass: [push('Ab1'), push('Ab1'), push('Db2'), push('Db2')],
    phrases: [
      { label: '1行目（Abmaj7）', from: 9, to: 10, intention: 'G5 を伸ばして Eb5–G5 で返し、Bb5–G5–Eb5 の 3+3+2 で降りる。' },
      { label: '2行目（Dbmaj7）', from: 11, to: 12, intention: '同じ形を1音上げ、Ab5 を伸ばして C6–Ab5–F5 で降りる。' },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'Bb5'], intention: '2小節目も Abmaj7' },
      { bar: 11, beat: 0, pitches: ['Db2', 'C4', 'F4', 'Ab4', 'Ab5'], intention: 'Dbmaj7 と Ab5' },
      { bar: 12, beat: 0, pitches: ['Db2', 'C4', 'F4', 'Ab4', 'C6'], intention: 'Dbmaj7 の上の C6（長7度）' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7 への戻り' },
    ],
  }),
]
