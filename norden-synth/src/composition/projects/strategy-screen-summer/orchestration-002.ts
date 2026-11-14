import type { Song } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { push } from './themes-001.ts'
import { noonMidDbHarmonies } from './harmony-002.ts'

// 「真昼の凱風 — 二行の詩／一小節ごとの色」の編曲 02。
// 編曲 01 への感想を受け、ピアノ・ウッドベース・スティールドラム・手拍子入りの4つ打ちをやめ、
// 刻みを弦のピチカートとハープ、低音をチェロとコントラバス、打楽器を大太鼓・タンバリン・
// トライアングル・シンバルにした。後半は主題の繰り返しではなく変奏にし、その型を2通り出す。
// 旋律と和声は派生元のまま。

const parent = noonMidDbHarmonies.find((study) => study.song.id === 'summer-noon-mid-db-four-colors')!
const theme = parent.song.sections[0]
const themeChords = theme.chords
const themeMelody = theme.parts.melody
const themeComp = theme.parts.harmony

const octaveDown = (bar: string) =>
  bar.replace(/([A-G][#b]?)(-?\d)/g, (_, p: string, o: string) => `${p}${Number(o) - 1}`)
const silent = (count: number) => Array.from({ length: count }, () => '')
const louder = (bars: string[], velocity: number) => bars.map((bar, i) => (i === 0 && bar ? `v${velocity} ${bar}` : bar))

const PICKUP = 'r:3 v84 C5:.5 v86 D5:.5'
const LAST_BAR_NO_PICKUP = 'v100 C6:2.5 r:1.5'
const melodyWithoutPickup = [...themeMelody.slice(0, 15), LAST_BAR_NO_PICKUP]

// 弦の保持音（ビオラ＝下、第2バイオリン＝上）。8小節目は旋律の Eb5 を避けて前半で切る。
const PAD_LOW = [
  'A3:4', 'B3:4', 'G3:4', 'C4:3 r:1',
  'A3:4', 'B3:4', 'G3:4', 'G3:2 r:2',
  'C4:4', 'Bb3:4', 'Ab3:4', 'Ab3:4',
  'A3:4', 'B3:4', 'C4:2 D4:2', 'E4:3 r:1',
]
const PAD_HIGH = [
  'E4:4', 'D4:4', 'D4:4', 'E4:3 r:1',
  'E4:4', 'D4:4', 'D4:4', 'E4:2 r:2',
  'Eb4:4', 'Eb4:4', 'F4:4', 'Db4:4',
  'E4:4', 'D4:4', 'Eb4:2 F4:2', 'G4:3 r:1',
]
const HORNS = [
  'A3+C4:4', 'G3+B3:4', 'G3+B3:4', 'A3+C4:3 r:1',
  'A3+C4:4', 'G3+B3:4', 'G3+D4:4', 'G3+C4:2 r:2',
  'G3+C4:4', 'G3+Bb3:4', 'F3+Ab3:4', 'F3+Ab3:4',
  'A3+C4:4', 'G3+B3:4', 'Ab3+C4:2 Bb3+D4:2', 'G3+C4:3 r:1',
]

// 低音。チェロは派生元と同じ刻み（チェロの音域に収まる高さ）、コントラバスは頭と2拍裏だけ。
const CELLO_PUSH = [
  push('F2'), push('G2'), push('E2'), push('A2'),
  push('F2'), push('G2'), push('C2'), push('C2'),
  push('Ab2'), push('C3'), push('Db3'), push('Bb2'),
  push('F2'), push('G2'), 'Ab2:1.5 Ab2:.5 Bb2:1.5 Bb2:.5', push('C3'),
]
const CELLO_LONG = [
  'F2:4', 'G2:4', 'E2:4', 'A2:3 r:1',
  'F2:4', 'G2:4', 'C3:4', 'C3:2 r:2',
]
const pulse = (root: string) => `${root}:1.5 ${root}:2.5`
const BASS_PULSE = [
  pulse('F1'), pulse('G1'), pulse('E1'), pulse('A1'),
  pulse('F1'), pulse('G1'), pulse('C2'), pulse('C2'),
  pulse('Ab1'), pulse('C2'), pulse('Db2'), pulse('Bb1'),
  pulse('F1'), pulse('G1'), 'Ab1:2 Bb1:2', pulse('C2'),
]
const BASS_LONG = ['F1:4', 'G1:4', 'E1:4', 'A1:3 r:1', 'F1:4', 'G1:4', 'C2:4', 'C2:2 r:2']

// 9〜12小節目（Abmaj7→Cm7→Dbmaj7→Bbm7）のハープの分散和音
const MIDDLE_ARPEGGIO = [
  'Ab3:.5 C4 Eb4 C4 Ab3 C4 Eb4 C4',
  'G3:.5 Bb3 Eb4 Bb3 G3 Bb3 Eb4 Bb3',
  'Ab3:.5 C4 F4 C4 Ab3 C4 F4 C4',
  'Ab3:.5 Db4 F4 Db4 Ab3 Db4 F4 Db4',
]
// イントロのハープ（Fmaj7→G→Em7→Am7）
const INTRO_HARP = [
  'A4:.5 C5 E5 C5 A4 C5 E5 C5',
  'B4:.5 D5 G5 D5 B4 D5 G5 D5',
  'G4:.5 B4 D5 B4 G4 B4 E5 B4',
  'A4:.5 C5 E5 C5 A4 C5 r:1',
]
// 「凪の変奏」前半の、流れるハープ（Fmaj7→G→Em7→Am7→Fmaj7→G→C(add9)→C）
const CALM_HARP = [
  'F3:.5 A3 C4 E4 A4 E4 C4 A3',
  'G3:.5 B3 D4 G4 B4 G4 D4 B3',
  'E3:.5 G3 B3 D4 G4 D4 B3 G3',
  'A3:.5 C4 E4 G4 C5 G4 E4 C4',
  'F3:.5 A3 C4 E4 A4 E4 C4 A3',
  'G3:.5 B3 D4 G4 B4 G4 D4 B3',
  'C3:.5 G3 D4 E4 G4 E4 D4 G3',
  'C3:.5 G3:.5 C4:.5 E4:.5 G4:2',
]
// 「対旋律の変奏」前半で、主題の上を走る8分音符。主題が伸ばす間に動き、主題が動くところで止まる。
const OBBLIGATO = [
  'v78 A5:.5 G5:.5 E5:.5 C5:.5 E5:.5 G5:.5 v82 A5:1',
  'v78 B5:.5 A5:.5 G5:.5 D5:.5 G5:.5 A5:.5 v82 B5:1',
  'v80 B5:.5 G5:.5 E5:.5 D5:.5 E5:.5 G5:.5 v84 B5:1',
  'v84 C6:.5 A5:.5 G5:.5 E5:.5 v80 G5:1 r:1',
  'v78 C5:.5 E5:.5 G5:.5 A5:.5 v84 C6:.5 A5:.5 v80 G5:1',
  'v80 D5:.5 G5:.5 A5:.5 B5:.5 v86 D6:.5 B5:.5 v82 A5:1',
  'v82 E5:.5 G5:.5 C6:.5 D6:.5 v90 E6:1 v84 D6:.5 C6:.5',
  'v82 G5:2 r:1 v86 Eb5:.5 v90 F5:.5',
]

// 打楽器。手拍子と4つ打ちは使わず、大太鼓は頭（と3拍裏）、タンバリンは伴奏の刻みに合わせる。
const LIGHT = 'v54 bd:1 r:.5 v36 tamb:.5 r:.5 v36 tamb:.5 v40 tamb:1'
const FULL = 'v62 bd:1 r:.5 v42 tamb:.5 v52 bd:.5 v42 tamb:.5 v46 tamb:1'
const CRASH = 'v70 bd+cym2:1 r:.5 v42 tamb:.5 v52 bd:.5 v42 tamb:.5 v46 tamb:1'
const END = 'v62 bd:1 r:.5 v42 tamb:.5 v52 bd:.5 v46 tamb:.5 v50 tamb:.5 v56 tamb:.5'
const MID = 'r:1.5 v32 tamb:.5 r:.5 v32 tamb:.5 v34 tamb:1'
const TRIANGLE = 'v40 tri:4'

const PARTS: Song['parts'] = [
  { id: 'vn1', label: 'バイオリン I', instrument: 'violin', volume: 0.54, pan: -0.3, velocity: 84, gate: 0.95 },
  { id: 'fl', label: 'フルート', instrument: 'flute', volume: 0.5, pan: -0.12, velocity: 84, gate: 0.94 },
  { id: 'tp', label: 'トランペット', instrument: 'trumpet', volume: 0.36, pan: 0.18, velocity: 80, gate: 0.92 },
  { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.46, pan: -0.24, velocity: 62, gate: 0.96 },
  { id: 'vn2', label: 'バイオリン II', instrument: 'violin', volume: 0.36, pan: -0.16, velocity: 58, gate: 0.97 },
  { id: 'va', label: 'ビオラ', instrument: 'viola', volume: 0.4, pan: 0.12, velocity: 58, gate: 0.97 },
  { id: 'vc', label: 'チェロ', instrument: 'cello', volume: 0.52, pan: 0.22, velocity: 76, gate: 0.85 },
  { id: 'cb', label: 'コントラバス', instrument: 'contrabass', volume: 0.56, pan: 0.34, velocity: 74, gate: 0.9 },
  { id: 'pizz', label: 'ピチカート (刻み)', instrument: 'pizzicato-section', volume: 0.46, pan: -0.2, velocity: 70, gate: 0.65 },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.46, pan: 0.26, velocity: 62, gate: 1.3 },
  { id: 'timp', label: 'ティンパニ', instrument: 'timpani', volume: 0.46, pan: 0, velocity: 70, gate: 0.95 },
  { id: 'perc', label: '打楽器', instrument: 'orchestra-kit', volume: 0.38, pan: 0, velocity: 60, gate: 1 },
]

type Variation = 'counter' | 'calm'

// 13〜16小節目の総奏は両案で共通
const finaleLow = [...themeMelody.slice(12, 15).map(octaveDown), 'v96 C5:2.5 r:1.5']
const FINALE_TIMP = ['v74 F2:1 r:3', '', 'v72 Ab2:2 Bb2:2', 'v78 C3:1 r:1.5 v62 C3:.5 C3:.5 C3:.5']

function buildSong(kind: Variation, id: string, title: string, description: string): Song {
  // A の最後の弱起は、次に主題を歌う楽器（対旋律の変奏ではホルン、凪の変奏ではフルート）に渡す
  const aFlute = [...silent(4), ...melodyWithoutPickup.slice(4, 15), kind === 'calm' ? themeMelody[15] : LAST_BAR_NO_PICKUP]
  const aHorns = [...silent(4), ...HORNS.slice(4, 15), kind === 'counter' ? 'G3+C4:3 v80 C4:.5 v84 D4:.5' : HORNS[15]]

  const variation: Song['sections'][number] = kind === 'counter'
    ? {
        id: 'var',
        label: '変奏 (主題はホルンとチェロ、上に8分の対旋律)',
        chords: themeChords,
        parts: {
          vn1: [...OBBLIGATO, ...themeMelody.slice(8)],
          fl: [...OBBLIGATO, ...themeMelody.slice(8)],
          hn: [...themeMelody.slice(0, 7).map(octaveDown), '-:2 r:2', ...louder(HORNS.slice(8, 12), 66), ...finaleLow],
          vc: [...themeMelody.slice(0, 7).map(octaveDown), '-:2 r:2', ...CELLO_PUSH.slice(8)],
          tp: [...silent(12), ...finaleLow],
          vn2: louder(PAD_HIGH, 64),
          va: louder(PAD_LOW, 64),
          cb: [...CELLO_PUSH.slice(0, 8), ...BASS_PULSE.slice(8)],
          pizz: [...themeComp],
          harp: [...themeComp.slice(0, 8), ...MIDDLE_ARPEGGIO, ...themeComp.slice(12)],
          timp: ['v68 F2:1 r:3', ...silent(6), 'v64 C3:1 r:3', ...silent(4), ...FINALE_TIMP],
          perc: [CRASH, FULL, FULL, FULL, FULL, FULL, FULL, END, MID, MID, MID, MID, CRASH, FULL, FULL, END],
        },
      }
    : {
        id: 'var',
        label: '変奏 (凪: 刻みを止めて歌い、終盤で戻る)',
        chords: themeChords,
        parts: {
          fl: [...themeMelody],
          vn1: [...silent(4), ...themeMelody.slice(4)],
          hn: [...silent(8), ...louder(HORNS.slice(8, 12), 62), ...finaleLow],
          tp: [...silent(12), ...finaleLow],
          vn2: PAD_HIGH,
          va: PAD_LOW,
          vc: [...louder(CELLO_LONG, 58), ...CELLO_PUSH.slice(8)],
          cb: [...louder(BASS_LONG, 56), ...BASS_PULSE.slice(8)],
          pizz: [...silent(8), ...louder(themeComp.slice(8, 12), 58), ...themeComp.slice(12)],
          harp: [...CALM_HARP, ...MIDDLE_ARPEGGIO, ...themeComp.slice(12)],
          timp: [...silent(12), ...FINALE_TIMP],
          perc: [TRIANGLE, '', '', '', TRIANGLE, '', '', '', MID, MID, MID, MID, CRASH, FULL, FULL, END],
        },
      }

  return {
    id,
    title,
    description,
    tempo: parent.song.tempo,
    timeSignature: [4, 4],
    parts: PARTS.map((part) => ({ ...part })),
    sections: [
      {
        id: 'intro',
        label: 'イントロ (ピチカートの刻みとハープ)',
        chords: themeChords.slice(0, 4),
        parts: {
          vn1: ['', '', '', PICKUP],
          vn2: PAD_HIGH.slice(0, 4),
          va: PAD_LOW.slice(0, 4),
          harp: INTRO_HARP,
          pizz: themeComp.slice(0, 4),
          vc: CELLO_PUSH.slice(0, 4),
          cb: BASS_PULSE.slice(0, 4),
          perc: [MID, MID, LIGHT, END],
        },
      },
      {
        id: 'A',
        label: 'A 主題 (バイオリン、5小節目からフルート)',
        chords: themeChords,
        parts: {
          vn1: melodyWithoutPickup,
          fl: aFlute,
          tp: [...silent(12), ...finaleLow],
          hn: aHorns,
          vn2: PAD_HIGH,
          va: PAD_LOW,
          vc: CELLO_PUSH,
          cb: BASS_PULSE,
          pizz: [...themeComp],
          harp: [...themeComp.slice(0, 8), ...MIDDLE_ARPEGGIO, ...themeComp.slice(12)],
          timp: [...silent(12), 'v66 F2:1 r:3', '', 'v64 Ab2:2 Bb2:2', 'v70 C3:1 r:3'],
          perc: [LIGHT, LIGHT, LIGHT, LIGHT, LIGHT, LIGHT, LIGHT, END, MID, MID, MID, MID, CRASH, FULL, FULL, END],
        },
      },
      variation,
    ],
    intro: ['intro'],
    loop: ['A', 'var'],
  }
}

const COMMON_PHRASES: CompositionStudy['phrases'] = [
  { label: 'イントロ', from: 1, to: 4, intention: 'ピチカートの刻み、チェロとコントラバス、ハープの分散和音。バイオリンの弱起で主題へ。' },
  { label: 'A 前半', from: 5, to: 12, intention: 'バイオリンが主題。5小節目からフルートとホルンが加わる。' },
  { label: 'A 中間（二行の詩）', from: 13, to: 16, intention: 'Abmaj7→Cm7→Dbmaj7→Bbm7。打楽器を薄くし、ハープの分散和音。' },
  { label: 'A 終盤', from: 17, to: 20, intention: 'トランペットが1オクターブ下で重なり、ティンパニとシンバルが入る。' },
]

export const noonFairWindOrchestrations: CompositionStudy[] = [
  {
    song: buildSong(
      'counter',
      'summer-noon-fair-wind-orchestral-counter',
      '真昼の凱風 — 管弦楽／対旋律の変奏',
      'ハ長調 · ♩=126 · 4/4。刻みはピチカートとハープ、低音はチェロとコントラバス。1周目はバイオリンとフルートが主題を歌う。2周目の前半は主題を1オクターブ下げてホルンとチェロに渡し、その上でバイオリンとフルートが8分音符の対旋律を走らせる。中間から主題が高音に戻り、終盤は総奏',
    ),
    melodyPart: 'vn1',
    hypothesis:
      '編曲 02 の変奏その1。イントロ4小節＋ループ32小節（A 16・変奏 16）。変奏の前半8小節は、主題をホルンとチェロ（1オクターブ下）に移し、バイオリンとフルートが和音の音だけでできた8分音符の対旋律を乗せる。対旋律は主題が伸ばす間に動き、主題が動く拍では止まる。旋律と和声は派生元のまま',
    phrases: [
      ...COMMON_PHRASES,
      { label: '変奏 前半', from: 21, to: 28, intention: '主題はホルンとチェロ。バイオリンとフルートは8分音符の対旋律。低音の刻みはコントラバスが受け持つ。' },
      { label: '変奏 中間', from: 29, to: 32, intention: '主題がバイオリンとフルートに戻る。チェロは刻みに戻り、ホルンは保持音。' },
      { label: '変奏 終盤', from: 33, to: 36, intention: '総奏で Fmaj7→G→Ab→Bb→C。弱起で A へ戻る。' },
    ],
    moments: [
      { bar: 13, beat: 0, pitches: ['Ab2', 'C4', 'Eb4', 'G4', 'G5'], intention: 'A の Abmaj7' },
      { bar: 16, beat: 0, pitches: ['Bb2', 'Ab3', 'Db4', 'F4', 'C6'], intention: 'A の Bbm7' },
      { bar: 21, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'A5'], intention: '変奏の頭: 主題の E4（ホルン・チェロ）と対旋律の A5' },
      { bar: 35, beat: 3, pitches: ['Bb2', 'D4', 'F4', 'Bb4', 'Bb5'], intention: '終盤の Ab→Bb の Bb' },
    ],
  },
  {
    song: buildSong(
      'calm',
      'summer-noon-fair-wind-orchestral-calm',
      '真昼の凱風 — 管弦楽／凪の変奏',
      'ハ長調 · ♩=126 · 4/4。刻みはピチカートとハープ、低音はチェロとコントラバス。1周目はバイオリンとフルートが主題を歌う。2周目の前半は刻みと打楽器を止め、フルートの独奏を流れるハープと弦の保持音で支える。中間でピチカートが静かに戻り、終盤は総奏',
    ),
    melodyPart: 'vn1',
    hypothesis:
      '編曲 02 の変奏その2。イントロ4小節＋ループ32小節（A 16・変奏 16）。変奏の前半8小節は、テンポはそのままで刻みをやめ、フルート独奏（5小節目からバイオリンが重なる）をハープの分散和音・弦とコントラバスの保持音・トライアングルだけで支える。中間で刻みが戻り、終盤は A と同じ総奏。旋律と和声は派生元のまま',
    phrases: [
      ...COMMON_PHRASES,
      { label: '変奏 前半（凪）', from: 21, to: 28, intention: '刻みと打楽器を止め、フルートが主題。ハープの分散和音と弦の保持音。25小節目からバイオリンが重なる。' },
      { label: '変奏 中間', from: 29, to: 32, intention: 'ピチカートとチェロの刻みが静かに戻り、ホルンの保持音が入る。' },
      { label: '変奏 終盤', from: 33, to: 36, intention: '総奏で Fmaj7→G→Ab→Bb→C。弱起で A へ戻る。' },
    ],
    moments: [
      { bar: 13, beat: 0, pitches: ['Ab2', 'C4', 'Eb4', 'G4', 'G5'], intention: 'A の Abmaj7' },
      { bar: 16, beat: 0, pitches: ['Bb2', 'Ab3', 'Db4', 'F4', 'C6'], intention: 'A の Bbm7' },
      { bar: 21, beat: 0, pitches: ['F2', 'A3', 'E4', 'E5'], intention: '凪の頭: 保持音の Fmaj7 とフルートの E5' },
      { bar: 35, beat: 3, pitches: ['Bb2', 'D4', 'F4', 'Bb4', 'Bb5'], intention: '終盤の Ab→Bb の Bb' },
    ],
  },
]
