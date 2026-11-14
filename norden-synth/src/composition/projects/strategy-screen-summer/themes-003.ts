import type { CompositionStudy } from '../../study.ts'
import { buildTheme, comp, FOUR_ON_FLOOR, octaves, offbeats, push, repeat } from './themes-001.ts'
import { octavePair, secondThemes } from './themes-002.ts'

// 主題集 03。「真昼の凱風、ふたたび」の 1〜8小節目と 13〜16小節目を保ち、
// 9〜12小節目の旋律と和声だけを作り直した5案。Abmaj7 からの平行移動をやめ、
// Abmaj7 の響きに留まる（または同じ調の中だけで動く）。
// 旋律を変えるため、和声案ではなく主題の組として登録する。

const parent = secondThemes.find((study) => study.song.id === 'summer-noon-fair-wind-ascent')!.song
const parts = parent.sections[0].parts

const HEAD_CHORDS = ['Fmaj7', 'G', 'Em7', 'Am7', 'Fmaj7', 'G', 'C(add9)', 'C']
const TAIL_CHORDS = ['Fmaj7', 'G', 'Ab Bb', 'C']

/** 9〜12小節目だけを差し替える。 */
const splice = (part: string[], middle: string[]) => [...part.slice(0, 8), ...middle, ...part.slice(12)]

const AB_HOOK = 'v94 G5:3 v86 Eb5:.5 v90 G5:.5'

const Ab = 'C4+Eb4+G4'
const AbHigh = 'Eb4+G4+Bb4'

export const thirdThemes: CompositionStudy[] = [
  buildTheme({
    id: 'summer-noon-calm-ab',
    title: '真昼の凱風 — 変イの凪',
    tempo: parent.tempo,
    meter: [4, 4],
    harmonyGate: 0.75,
    bassGate: 0.8,
    description:
      'ハ長調 · ♩=126 · 4/4。9〜12小節目を4小節とも Abmaj7 に留める案。和音は動かさず、冒頭の「3拍伸ばして2音で返す」動機が Abmaj7 の中を G5→Bb5→C6 と昇る。12小節目は Bb5–G5–Eb5 の 3+3+2 で降り、続く Fmaj7 の A5–G5–E5 と同じ形でつながる',
    chords: [...HEAD_CHORDS, 'Abmaj7', 'Abmaj7', 'Abmaj7', 'Abmaj7', ...TAIL_CHORDS],
    melody: splice(parts.melody, [
      AB_HOOK,
      'v96 Bb5:3 v88 G5:.5 v92 Bb5:.5',
      'v100 C6:2.5 v94 Bb5:.5 v90 G5:1',
      'v94 Bb5:1.5 v90 G5:1.5 v86 Eb5:1',
    ]),
    harmony: splice(parts.harmony, [comp(Ab), comp(AbHigh), comp(Ab), comp(AbHigh)]),
    bass: splice(parts.bass, repeat(push('Ab1'), 4)),
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '前半（元のまま）', from: 1, to: 8, intention: '「真昼の凱風、ふたたび」の前半と Eb5–F5 の弱起を保つ。' },
      { label: 'Abmaj7 の中を昇る', from: 9, to: 11, intention: '和音を動かさず、動機だけが G5→Bb5→C6 と和音の音を昇る。' },
      { label: '降りてつなぐ', from: 12, to: 12, intention: 'Bb5–G5–Eb5 の 3+3+2 で降り、次の小節と同じ形にする。' },
      { label: '終盤（元のまま）', from: 13, to: 16, intention: 'Fmaj7→G→Ab→Bb→C。' },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Ab1', 'Eb4', 'G4', 'Bb4', 'Bb5'], intention: '2小節目も Abmaj7（旋律は9度の Bb5）' },
      { bar: 11, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'C6'], intention: '3小節目も Abmaj7（旋律は3度の C6）' },
      { bar: 12, beat: 0, pitches: ['Ab1', 'Eb4', 'G4', 'Bb5'], intention: '4小節目も Abmaj7' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7 への戻り' },
    ],
  }),

  buildTheme({
    id: 'summer-noon-calm-db',
    title: '真昼の凱風 — 変ニへ沈む',
    tempo: parent.tempo,
    meter: [4, 4],
    harmonyGate: 0.65,
    bassGate: 0.78,
    description:
      'ハ長調 · ♩=126 · 4/4。全体をディスコ風のオクターブ低音と裏拍の伴奏にした案。Abmaj7 を2小節保ち、同じ調の中でもう一段深い Dbmaj7 へ2小節沈む。旋律は Abmaj7 で降り、Dbmaj7 で F5 から C6 へ昇る。C と F を共通の音にして Fmaj7 へ戻る',
    chords: [...HEAD_CHORDS, 'Abmaj7', 'Abmaj7', 'Dbmaj7', 'Dbmaj7', ...TAIL_CHORDS],
    melody: splice(parts.melody, [
      AB_HOOK,
      'v94 Bb5:1.5 v90 G5:1.5 v86 Eb5:1',
      'v92 F5:3 v90 Ab5:.5 v96 C6:.5',
      'v100 C6:2.5 v92 Ab5:.5 v88 F5:1',
    ]),
    harmony: [
      offbeats('A3+C4+E4'), offbeats('B3+D4+G4'), offbeats('G3+B3+D4'), offbeats('G3+C4+E4'),
      offbeats('A3+C4+E4'), offbeats('B3+D4+G4'), offbeats('G3+D4+E4'), offbeats('G3+C4+E4'),
      offbeats(Ab), offbeats(Ab), offbeats('C4+F4+Ab4'), offbeats('C4+F4+Ab4'),
      offbeats('A3+C4+E4'), offbeats('B3+D4+G4'), offbeats('C4+Eb4+Ab4', 'D4+F4+Bb4'), offbeats('E4+G4+C5'),
    ],
    bass: [
      octaves('F2'), octaves('G2'), octaves('E2'), octaves('A1'),
      octaves('F2'), octaves('G2'), octaves('C2'), octaves('C2'),
      octaves('Ab1'), octaves('Ab1'), octaves('Db2'), octaves('Db2'),
      octaves('F2'), octaves('G2'), octavePair('Ab1', 'Bb1'), octaves('C2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '前半（旋律は元のまま）', from: 1, to: 8, intention: '進行は元のまま、低音をオクターブ、伴奏を裏拍にする。' },
      { label: 'Abmaj7 に留まる', from: 9, to: 10, intention: '動機のあと Bb5–G5–Eb5 と降りる。' },
      { label: 'Dbmaj7 へ沈む', from: 11, to: 12, intention: 'F5 を伸ばして C6 へ昇り、C6–Ab5–F5 と降りる。' },
      { label: '終盤（旋律は元のまま）', from: 13, to: 16, intention: 'Dbmaj7 から Fmaj7 へ戻り、G→Ab→Bb→C。' },
    ],
    moments: [
      { bar: 10, beat: 0.5, pitches: ['Ab2', 'C4', 'Eb4', 'G4', 'Bb5'], intention: '2小節目も Abmaj7' },
      { bar: 11, beat: 0.5, pitches: ['Db3', 'C4', 'F4', 'Ab4', 'F5'], intention: 'Dbmaj7' },
      { bar: 12, beat: 0.5, pitches: ['Db3', 'C4', 'F4', 'Ab4', 'C6'], intention: 'Dbmaj7 の上の C6（長7度）' },
      { bar: 13, beat: 0.5, pitches: ['F3', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7 への戻り' },
    ],
  }),

  buildTheme({
    id: 'summer-noon-calm-fm',
    title: '真昼の凱風 — ヘ短調の影から',
    tempo: parent.tempo,
    meter: [4, 4],
    harmonyGate: 0.75,
    bassGate: 0.8,
    description:
      'ハ長調 · ♩=126 · 4/4。Abmaj7 を2小節保ち、上の音はほぼそのままで低音だけ3度下げて Fm7 に2小節留まる案。旋律は C6 まで昇ってから Ab5 を伸ばす。13小節目で Fm7 が同じ根音の Fmaj7 に変わり、旋律も Ab5 から A5 へ半音上がる',
    chords: [...HEAD_CHORDS, 'Abmaj7', 'Abmaj7', 'Fm7', 'Fm7', ...TAIL_CHORDS],
    melody: splice(parts.melody, [
      AB_HOOK,
      'v100 C6:2.5 v94 Bb5:.5 v90 G5:1',
      'v94 Ab5:3 v86 F5:.5 v90 Ab5:.5',
      'v90 G5:2 r:1 v88 G5:.5 v92 Ab5:.5',
    ]),
    harmony: splice(parts.harmony, [comp(Ab), comp(AbHigh), comp('Ab3+C4+Eb4'), comp('Ab3+C4+Eb4')]),
    bass: splice(parts.bass, [push('Ab1'), push('Ab1'), push('F2'), push('F2')]),
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '前半（元のまま）', from: 1, to: 8, intention: '「真昼の凱風、ふたたび」の前半と弱起を保つ。' },
      { label: 'Abmaj7 に留まる', from: 9, to: 10, intention: '動機のあと C6 まで上がって G5 へ降りる。' },
      { label: 'Fm7 の影', from: 11, to: 12, intention: '低音だけ F へ下げ、Ab5 を伸ばす。G5–Ab5 の弱起で次へ向かう。' },
      { label: '短調から長調へ', from: 13, to: 16, intention: 'Fm7→Fmaj7。旋律は Ab5→A5。以降は元のまま。' },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Ab1', 'Eb4', 'G4', 'Bb4', 'C6'], intention: '2小節目も Abmaj7' },
      { bar: 11, beat: 0, pitches: ['F2', 'Ab3', 'C4', 'Eb4', 'Ab5'], intention: 'Fm7 と Ab5' },
      { bar: 12, beat: 3.5, pitches: ['F2', 'Ab3', 'C4', 'Eb4', 'Ab5'], intention: '弱起の Ab5（まだ Fm7）' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7 と A5' },
    ],
  }),

  buildTheme({
    id: 'summer-noon-calm-tailwind',
    title: '真昼の凱風 — 凪のあとの追い風',
    tempo: parent.tempo,
    meter: [4, 4],
    harmonyGate: 0.75,
    bassGate: 0.8,
    description:
      'ハ長調 · ♩=126 · 4/4。Abmaj7 を3小節保ち、12小節目だけ C9sus4 にして Fmaj7 へ素直に解決させる案。旋律は伸ばす音をやめ、頭を休んで8分で動いてから2拍伸ばす形に替える。10小節目は降り、11小節目は昇り、C9sus4 の D6 が頂点',
    chords: [...HEAD_CHORDS, 'Abmaj7', 'Abmaj7', 'Abmaj7', 'C9sus4', ...TAIL_CHORDS],
    melody: splice(parts.melody, [
      AB_HOOK,
      'r:.5 v92 Bb5:.5 v88 G5:.5 v86 Eb5:.5 v84 C5:2',
      'r:.5 v88 Eb5:.5 v92 G5:.5 v96 Bb5:.5 v100 C6:2',
      'v102 D6:2.5 v96 C6:.5 v92 Bb5:1',
    ]),
    harmony: splice(parts.harmony, [comp(Ab), comp(Ab), comp(AbHigh, Ab), comp('Bb3+D4+F4')]),
    bass: splice(parts.bass, [push('Ab1'), push('Ab1'), push('Ab1'), push('C2')]),
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '前半（元のまま）', from: 1, to: 8, intention: '「真昼の凱風、ふたたび」の前半と弱起を保つ。' },
      { label: '降りて昇る', from: 9, to: 11, intention: 'Abmaj7 の中で、Bb5 から C5 へ降りる句と Eb5 から C6 へ昇る句を並べる。' },
      { label: '追い風', from: 12, to: 12, intention: 'C9sus4 の上で D6 を伸ばし、Bb5 から次の A5 へ降りる。' },
      { label: '終盤（元のまま）', from: 13, to: 16, intention: 'Fmaj7→G→Ab→Bb→C。' },
    ],
    moments: [
      { bar: 10, beat: 2, pitches: ['Ab1', 'C5'], intention: '2小節目も Abmaj7、旋律は C5 まで降りる' },
      { bar: 11, beat: 3, pitches: ['Ab2', 'C4', 'Eb4', 'G4', 'C6'], intention: '3小節目も Abmaj7、旋律は C6' },
      { bar: 12, beat: 0, pitches: ['C2', 'Bb3', 'D4', 'F4', 'D6'], intention: 'C9sus4 と頂点の D6' },
      { bar: 13, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: 'Fmaj7 への解決' },
    ],
  }),

  buildTheme({
    id: 'summer-noon-calm-long-tones',
    title: '真昼の凱風 — 宙に浮く長音',
    tempo: parent.tempo,
    meter: [4, 4],
    harmonyGate: 0.75,
    bassGate: 0.8,
    description:
      'ハ長調 · ♩=126 · 4/4。4小節とも Abmaj7 の低音を保ち、旋律の音数を最も減らした案。G5 を6拍、D6 を5拍半伸ばす。D6 は Abmaj7 の #11 で、伴奏の内声も Eb4 から D4 に替えて響きを浮かせる。リズムは伴奏と低音だけが刻み続ける',
    chords: [...HEAD_CHORDS, 'Abmaj7', 'Abmaj7', 'Abmaj7(#11)', 'Abmaj7(#11)', ...TAIL_CHORDS],
    melody: splice(parts.melody, [
      'v94 G5:4',
      '-:2 r:1 v90 Bb5:.5 v96 C6:.5',
      'v102 D6:4',
      '-:1.5 v96 C6:1.5 v92 Bb5:1',
    ]),
    harmony: splice(parts.harmony, [comp(Ab), comp(Ab), comp('C4+D4+G4'), comp('C4+D4+G4')]),
    bass: splice(parts.bass, repeat(push('Ab1'), 4)),
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '前半（元のまま）', from: 1, to: 8, intention: '「真昼の凱風、ふたたび」の前半と弱起を保つ。' },
      { label: '長い G5', from: 9, to: 10, intention: '7〜8小節目と同じく G5 を6拍伸ばし、Bb5–C6 の弱起で上へ向かう。' },
      { label: '長い D6', from: 11, to: 12, intention: 'Abmaj7 の #11 の D6 を伸ばし、C6–Bb5 と降りて次の A5 へ。' },
      { label: '終盤（元のまま）', from: 13, to: 16, intention: 'Fmaj7→G→Ab→Bb→C。' },
    ],
    moments: [
      { bar: 9, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'G5'], intention: 'Abmaj7 と G5' },
      { bar: 10, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'G5'], intention: '2小節目も G5 が続く' },
      { bar: 11, beat: 0, pitches: ['Ab1', 'C4', 'D4', 'G4', 'D6'], intention: 'Abmaj7(#11) と D6' },
      { bar: 12, beat: 0, pitches: ['Ab1', 'C4', 'D4', 'G4', 'D6'], intention: '4小節目の頭も D6 が続く' },
    ],
  }),
]
