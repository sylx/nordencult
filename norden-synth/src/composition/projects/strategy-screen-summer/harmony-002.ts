import type { Song } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { comp, FOUR_ON_FLOOR, octaves, offbeats, push, repeat } from './themes-001.ts'
import { octavePair } from './themes-002.ts'
import { fourthThemes } from './themes-004.ts'

// 「真昼の凱風 — 変ニへ沈む、二行の詩」の和声案 01。旋律は派生元のまま。
// 派生元の 9〜12小節目は Abmaj7 2小節→Dbmaj7 2小節。Abmaj7 から入るところは保ち、
// その先（11〜12小節目の受け方と Fmaj7 への戻り方）を変える。
// 1〜8小節目と 13〜16小節目は、刻みごと替える1案を除いて派生元のまま。

const parent = fourthThemes.find((study) => study.song.id === 'summer-noon-mid-db-parallel')!
const parentParts = parent.song.sections[0].parts

const HEAD_CHORDS = ['Fmaj7', 'G', 'Em7', 'Am7', 'Fmaj7', 'G', 'C(add9)', 'C']
const TAIL_CHORDS = ['Fmaj7', 'G', 'Ab Bb', 'C']

/** 9〜12小節目だけを差し替える。 */
const splice = (part: string[], middle: string[]) => [...part.slice(0, 8), ...middle, ...part.slice(12)]

interface HarmonyDraft {
  id: string
  title: string
  description: string
  harmonyGate?: number
  bassGate?: number
  chords: string[]
  harmony: string[]
  bass: string[]
  phrases: CompositionStudy['phrases']
  moments: CompositionStudy['moments']
}

function buildVariation(draft: HarmonyDraft): CompositionStudy {
  const song: Song = {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    tempo: parent.song.tempo,
    timeSignature: parent.song.timeSignature,
    intro: [],
    loop: ['theme'],
    parts: parent.song.parts.map((part) =>
      part.id === 'harmony' && draft.harmonyGate ? { ...part, gate: draft.harmonyGate }
        : part.id === 'bass' && draft.bassGate ? { ...part, gate: draft.bassGate } : { ...part }),
    sections: [
      {
        id: 'theme',
        label: draft.title,
        chords: draft.chords,
        parts: {
          melody: [...parentParts.melody],
          harmony: draft.harmony,
          bass: draft.bass,
          drums: repeat(FOUR_ON_FLOOR, 16),
        },
      },
    ],
  }
  return {
    song,
    melodyPart: 'melody',
    hypothesis: draft.description,
    phrases: draft.phrases,
    moments: draft.moments,
  }
}

const Ab = 'C4+Eb4+G4'
const Db = 'C4+F4+Ab4'
const BbmUpper = 'Ab3+Db4+F4'

const HEAD = { label: '前半（派生元のまま）', from: 1, to: 8, intention: 'Fmaj7→G→Em7→Am7 と刻みを保つ。' }
const TAIL = { label: '終盤（派生元のまま）', from: 13, to: 16, intention: 'Fmaj7→G→Ab→Bb→C。' }

export const noonMidDbHarmonies: CompositionStudy[] = [
  buildVariation({
    id: 'summer-noon-mid-db-slide-gb',
    title: '真昼の凱風 — 二行の詩／変トへ滑る',
    description:
      '2行目を Dbmaj7 ではなく、Abmaj7 から全音下の Gbmaj9(#11) で受ける案。旋律の Ab5・F5・C6 は Gb の9度・長7度・#11 になり、どれも和音の外側の音になる。低音は Ab→Gb→F と1回ずつ下がって Fmaj7 に着く。「二段の駆け上がり」の Abmaj7→Gm7 と同じく、低音が1段だけ滑る形',
    chords: [...HEAD_CHORDS, 'Abmaj7', 'Abmaj7', 'Gbmaj9(#11)', 'Gbmaj9(#11)', ...TAIL_CHORDS],
    harmony: splice(parentParts.harmony, [comp(Ab), comp(Ab), comp('Bb3+Db4+F4'), comp('Bb3+Db4+F4')]),
    bass: splice(parentParts.bass, [push('Ab2'), push('Ab2'), push('Gb2'), push('Gb2')]),
    phrases: [
      HEAD,
      { label: '1行目', from: 9, to: 10, intention: 'Abmaj7 を2小節保つ（派生元と同じ）。' },
      { label: '2行目', from: 11, to: 12, intention: '全音下の Gbmaj9(#11)。旋律は9度の Ab5 を伸ばし、#11 の C6 から降りる。' },
      { ...TAIL, intention: '低音が Gb から半音下の F へ着く。以降は派生元のまま。' },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Ab2', 'C4', 'Eb4', 'G4', 'Bb5'], intention: '2小節目も Abmaj7' },
      { bar: 11, beat: 0, pitches: ['Gb2', 'Bb3', 'Db4', 'F4', 'Ab5'], intention: 'Gbmaj9（旋律の Ab5 が9度）' },
      { bar: 12, beat: 0, pitches: ['Gb2', 'Bb3', 'Db4', 'F4', 'C6'], intention: '#11 の C6' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: '半音下の Fmaj7' },
    ],
  }),

  buildVariation({
    id: 'summer-noon-mid-db-backdoor',
    title: '真昼の凱風 — 二行の詩／裏口から戻る',
    description:
      '2行目を Bbm9→Eb9sus4 にする案。上の3音（Ab・Db・F）は2小節とも同じで、低音だけ Bb→Eb と4度上がる。変イ長調の中での「Ab に戻りそうな」動きを作っておいて、Ab へは戻らず Eb から全音上の Fmaj7 へ抜ける',
    chords: [...HEAD_CHORDS, 'Abmaj7', 'Abmaj7', 'Bbm9', 'Eb9sus4', ...TAIL_CHORDS],
    harmony: splice(parentParts.harmony, [comp(Ab), comp(Ab), comp(BbmUpper), comp(BbmUpper)]),
    bass: splice(parentParts.bass, [push('Ab1'), push('Ab1'), push('Bb1'), push('Eb2')]),
    phrases: [
      HEAD,
      { label: '1行目', from: 9, to: 10, intention: 'Abmaj7 を2小節保つ（派生元と同じ）。' },
      { label: '2行目', from: 11, to: 12, intention: 'Bbm9 で Ab5 は7度。Eb9sus4 で C6 は13度。上の和音は動かさず低音だけ動く。' },
      { ...TAIL, intention: 'Eb から全音上の Fmaj7 へ。以降は派生元のまま。' },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'Bb5'], intention: '2小節目も Abmaj7' },
      { bar: 11, beat: 0, pitches: ['Bb1', 'Ab3', 'Db4', 'F4', 'Ab5'], intention: 'Bbm9' },
      { bar: 12, beat: 0, pitches: ['Eb2', 'Ab3', 'Db4', 'F4', 'C6'], intention: 'Eb9sus4（上は同じ、低音だけ Eb）' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7' },
    ],
  }),

  buildVariation({
    id: 'summer-noon-mid-db-disco',
    title: '真昼の凱風 — 二行の詩／ディスコの低音',
    harmonyGate: 0.65,
    bassGate: 0.78,
    description:
      '進行は派生元に近いまま、全16小節の低音を8分のオクターブ、伴奏を裏拍に替えた案。12小節目の最後の1拍だけ C7sus4 を挟み、旋律の F5 を掛留にして Fmaj7 へ V→I で戻る',
    chords: [...HEAD_CHORDS, 'Abmaj7', 'Abmaj7', 'Dbmaj7', 'Dbmaj7 C7sus4', ...TAIL_CHORDS],
    harmony: [
      offbeats('A3+C4+E4'), offbeats('B3+D4+G4'), offbeats('G3+B3+D4'), offbeats('G3+C4+E4'),
      offbeats('A3+C4+E4'), offbeats('B3+D4+G4'), offbeats('G3+D4+E4'), offbeats('G3+C4+E4'),
      offbeats(Ab), offbeats(Ab), offbeats(Db), `r:.5 ${Db}:.5 r:.5 ${Db}:.5 r:.5 ${Db}:.5 r:.5 Bb3+C4+F4:.5`,
      offbeats('A3+C4+E4'), offbeats('B3+D4+G4'), offbeats('C4+Eb4+Ab4', 'D4+F4+Bb4'), offbeats('E4+G4+C5'),
    ],
    bass: [
      octaves('F2'), octaves('G2'), octaves('E2'), octaves('A1'),
      octaves('F2'), octaves('G2'), octaves('C2'), octaves('C2'),
      octaves('Ab1'), octaves('Ab1'), octaves('Db2'), 'Db2:.5 Db3:.5 Db2:.5 Db3:.5 Db2:.5 Db3:.5 C2:.5 C3:.5',
      octaves('F2'), octaves('G2'), octavePair('Ab1', 'Bb1'), octaves('C2'),
    ],
    phrases: [
      { label: '前半', from: 1, to: 8, intention: '進行は派生元のまま、低音をオクターブ、伴奏を裏拍にする。' },
      { label: '1行目', from: 9, to: 10, intention: 'Abmaj7 を2小節。' },
      { label: '2行目', from: 11, to: 12, intention: 'Dbmaj7。最後の1拍だけ C7sus4。' },
      { label: '終盤', from: 13, to: 16, intention: 'C から Fmaj7 へ戻り、G→Ab→Bb→C。' },
    ],
    moments: [
      { bar: 9, beat: 0.5, pitches: ['Ab2', 'C4', 'Eb4', 'G4', 'G5'], intention: 'Abmaj7' },
      { bar: 11, beat: 0.5, pitches: ['Db3', 'C4', 'F4', 'Ab4', 'Ab5'], intention: 'Dbmaj7' },
      { bar: 12, beat: 3.5, pitches: ['C3', 'Bb3', 'C4', 'F4', 'F5'], intention: '最後の1拍の C7sus4' },
      { bar: 13, beat: 0.5, pitches: ['F3', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7' },
    ],
  }),

  buildVariation({
    id: 'summer-noon-mid-db-eb-pedal',
    title: '真昼の凱風 — 二行の詩／浮いた低音',
    description:
      '9〜12小節目の低音を、和音の根音ではなく Eb に4小節固定する案。上の和音は派生元と同じ Abmaj7→Dbmaj7 だが、低音が根音に降りないので着地しない響きになる（Abmaj7/Eb、Dbmaj7/Eb）。13小節目の Fmaj7 で初めて低音が根音に着く',
    chords: [...HEAD_CHORDS, 'Abmaj7/Eb', 'Abmaj7/Eb', 'Dbmaj7/Eb', 'Dbmaj7/Eb', ...TAIL_CHORDS],
    harmony: splice(parentParts.harmony, [comp(Ab), comp(Ab), comp(Db), comp(Db)]),
    bass: splice(parentParts.bass, repeat(push('Eb2'), 4)),
    phrases: [
      HEAD,
      { label: '1行目', from: 9, to: 10, intention: 'Abmaj7 の5度 Eb を低音に置く。' },
      { label: '2行目', from: 11, to: 12, intention: '低音は Eb のまま、上だけ Dbmaj7 に変わる。' },
      { ...TAIL, intention: 'Eb から全音上の F へ、低音が初めて根音に着く。以降は派生元のまま。' },
    ],
    moments: [
      { bar: 9, beat: 0, pitches: ['Eb2', 'C4', 'Eb4', 'G4', 'G5'], intention: 'Abmaj7/Eb' },
      { bar: 11, beat: 0, pitches: ['Eb2', 'C4', 'F4', 'Ab4', 'Ab5'], intention: 'Dbmaj7/Eb' },
      { bar: 12, beat: 0, pitches: ['Eb2', 'C4', 'F4', 'Ab4', 'C6'], intention: '低音は Eb のまま' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7（低音が根音に着く）' },
    ],
  }),

  buildVariation({
    id: 'summer-noon-mid-db-four-colors',
    title: '真昼の凱風 — 二行の詩／一小節ごとの色',
    description:
      '2小節ずつ保っていた和音を、1小節ごとに変える案。Abmaj7→Cm7→Dbmaj7→Bbm7。低音は Ab→C→Db と昇ってから Bb へ下がる。どれも変イ長調の中の和音で、旋律の降りる小節（10・12小節目）に短調の和音が当たる。Bbm7 から Fmaj7 へは、ヘ長調の短い IV から I への戻り方',
    chords: [...HEAD_CHORDS, 'Abmaj7', 'Cm7', 'Dbmaj7', 'Bbm7', ...TAIL_CHORDS],
    harmony: splice(parentParts.harmony, [comp(Ab), comp('Bb3+Eb4+G4'), comp(Db), comp(BbmUpper)]),
    bass: splice(parentParts.bass, [push('Ab1'), push('C2'), push('Db2'), push('Bb1')]),
    phrases: [
      HEAD,
      { label: '1行目', from: 9, to: 10, intention: 'Abmaj7 から Cm7 へ。旋律の Bb5–G5–Eb5 は Cm7 の7度・5度・3度。' },
      { label: '2行目', from: 11, to: 12, intention: 'Dbmaj7 から Bbm7 へ。旋律の C6–Ab5–F5 は Bbm7 の9度・7度・5度。' },
      { ...TAIL, intention: 'Bbm7 から Fmaj7 へ。以降は派生元のまま。' },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['C2', 'Bb3', 'Eb4', 'G4', 'Bb5'], intention: 'Cm7' },
      { bar: 11, beat: 0, pitches: ['Db2', 'C4', 'F4', 'Ab4', 'Ab5'], intention: 'Dbmaj7' },
      { bar: 12, beat: 0, pitches: ['Bb1', 'Ab3', 'Db4', 'F4', 'C6'], intention: 'Bbm7' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7' },
    ],
  }),
]
