import type { Song } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { FOUR_ON_FLOOR, octaves } from './themes-001.ts'
import { octavePair } from './themes-002.ts'
import { noonMidDbHarmonies } from './harmony-002.ts'

// 「真昼の凱風 — 二行の詩／一小節ごとの色」の編曲 01。
// 旋律・和声・伴奏と低音の刻みは派生元のまま、16小節の主題を2回（軽い編成→総奏）鳴らす。
// 新しい旋律は足さない。イントロと間奏は冒頭4小節の和声と刻みだけで作る。

const parent = noonMidDbHarmonies.find((study) => study.song.id === 'summer-noon-mid-db-four-colors')!
const theme = parent.song.sections[0]
const themeChords = theme.chords
const themeMelody = theme.parts.melody
const themeComp = theme.parts.harmony
const themeBass = theme.parts.bass

const shift = (by: number) => (bar: string) =>
  bar.replace(/([A-G][#b]?)(-?\d)/g, (_, p: string, o: string) => `${p}${Number(o) + by}`)
const octaveUp = shift(1)
const octaveDown = shift(-1)
const silent = (count: number) => Array.from({ length: count }, () => '')
const louder = (bars: string[], velocity: number) => bars.map((bar, i) => (i === 0 ? `v${velocity} ${bar}` : bar))

// 弱起（C5–D5）は次に主題が続くところだけに置く
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
const CELLO = [
  'F2:4', 'G2:4', 'E2:4', 'A2:3 r:1',
  'F2:4', 'G2:4', 'C3:4', 'C3:2 r:2',
  'Ab2:4', 'C3:4', 'Db3:4', 'Bb2:4',
  'F2:4', 'G2:4', 'Ab2:2 Bb2:2', 'C3:3 r:1',
]

// 9〜12小節目（Abmaj7→Cm7→Dbmaj7→Bbm7）の分散和音
const MIDDLE_ARPEGGIO = [
  'Ab3:.5 C4 Eb4 C4 Ab3 C4 Eb4 C4',
  'G3:.5 Bb3 Eb4 Bb3 G3 Bb3 Eb4 Bb3',
  'Ab3:.5 C4 F4 C4 Ab3 C4 F4 C4',
  'Ab3:.5 Db4 F4 Db4 Ab3 Db4 F4 Db4',
]

// イントロ・間奏のスティールドラム（Fmaj7→G→Em7→Am7 の分散和音）
const STEEL_RIFF = [
  'v70 A4:.5 C5 E5 C5 A4 C5 E5 C5',
  'B4:.5 D5 G5 D5 B4 D5 G5 D5',
  'G4:.5 B4 D5 B4 G4 B4 E5 B4',
  'A4:.5 C5 E5 C5 A4 C5 r:1',
]

const LIGHT = 'v56 bd:.5 v30 shaker:.5 v50 clap:.5 v30 shaker:.5 v52 bd:.5 v30 shaker:.5 v50 clap:.5 v30 shaker:.5'
const NO_KICK = 'r:.5 v30 shaker:.5 v46 clap:.5 v30 shaker:.5 r:.5 v30 shaker:.5 v46 clap:.5 v30 shaker:.5'
const FULL = FOUR_ON_FLOOR
const FULL_TAMB = 'v64 bd:.5 v38 tamb:.5 v64 bd+clap:.5 v38 tamb:.5 v64 bd:.5 v38 tamb:.5 v64 bd+clap:.5 v38 tamb:.5'
const CRASH = 'v72 bd+cym2:.5 v38 tamb:.5 v64 bd+clap:.5 v38 tamb:.5 v64 bd:.5 v38 tamb:.5 v64 bd+clap:.5 v38 tamb:.5'
const FILL = 'v62 bd:.5 v34 shaker:.5 v62 bd+clap:.5 v34 shaker:.5 v62 bd:.5 v48 sd:.5 v54 sd:.5 v60 sd:.5'

const song: Song = {
  id: 'summer-noon-fair-wind-orchestrated',
  title: '真昼の凱風',
  description:
    'ハ長調 · ♩=126 · 4/4。「二行の詩／一小節ごとの色」の編曲版。ピアノの刻みとウッドベースの上で、フルートが主題を歌う。1周目は軽い編成、間奏を挟んだ2周目はバイオリンとトランペットが加わり、低音が8分のオクターブになる。中間の Abmaj7→Cm7→Dbmaj7→Bbm7 はハープ（2周目はスティールドラムも）の分散和音で色を変える',
  tempo: parent.song.tempo,
  timeSignature: [4, 4],
  parts: [
    { id: 'fl', label: 'フルート (主題)', instrument: 'flute', volume: 0.58, pan: -0.12, velocity: 88, gate: 0.94 },
    { id: 'vn1', label: 'バイオリン I', instrument: 'violin', volume: 0.46, pan: -0.3, velocity: 82, gate: 0.95 },
    { id: 'tp', label: 'トランペット', instrument: 'trumpet', volume: 0.36, pan: 0.18, velocity: 80, gate: 0.92 },
    { id: 'vn2', label: 'バイオリン II', instrument: 'violin', volume: 0.34, pan: -0.16, velocity: 56, gate: 0.97 },
    { id: 'va', label: 'ビオラ', instrument: 'viola', volume: 0.38, pan: 0.12, velocity: 56, gate: 0.97 },
    { id: 'vc', label: 'チェロ', instrument: 'cello', volume: 0.42, pan: 0.22, velocity: 60, gate: 0.96 },
    { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.4, pan: -0.24, velocity: 62, gate: 0.96 },
    { id: 'steel', label: 'スティールドラム', instrument: 'steel-drums', volume: 0.32, pan: 0.3, velocity: 62, gate: 0.9 },
    { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.42, pan: 0.26, velocity: 62, gate: 1.3 },
    { id: 'piano', label: 'ピアノ (刻み)', instrument: 'yamaha-grand-piano', volume: 0.36, pan: 0.08, velocity: 60, gate: 0.75 },
    { id: 'bass', label: 'ウッドベース', instrument: 'acoustic-bass', volume: 0.52, pan: -0.04, velocity: 80, gate: 0.8 },
    { id: 'timp', label: 'ティンパニ', instrument: 'timpani', volume: 0.44, pan: 0, velocity: 70, gate: 0.95 },
    { id: 'perc', label: '打楽器', instrument: 'orchestra-kit', volume: 0.38, pan: 0, velocity: 60, gate: 1 },
  ],
  sections: [
    {
      id: 'intro',
      label: 'イントロ (刻みとスティールドラム)',
      chords: themeChords.slice(0, 4),
      parts: {
        fl: ['', '', '', PICKUP],
        steel: STEEL_RIFF,
        piano: themeComp.slice(0, 4),
        bass: themeBass.slice(0, 4),
        perc: [NO_KICK, NO_KICK, LIGHT, FILL],
      },
    },
    {
      id: 'A',
      label: 'A 主題 (フルート・軽い編成)',
      chords: themeChords,
      parts: {
        fl: melodyWithoutPickup,
        vn1: [...silent(12), ...melodyWithoutPickup.slice(12)],
        vn2: [...silent(4), ...PAD_HIGH.slice(4)],
        va: [...silent(4), ...PAD_LOW.slice(4)],
        vc: [...silent(8), ...CELLO.slice(8)],
        hn: [...silent(8), ...HORNS.slice(8)],
        harp: [...silent(8), ...MIDDLE_ARPEGGIO, ...silent(4)],
        piano: [...themeComp],
        bass: [...themeBass],
        timp: [...silent(14), 'v62 Ab2:2 Bb2:2', 'v68 C3:1 r:3'],
        perc: [
          LIGHT, LIGHT, LIGHT, LIGHT,
          LIGHT, LIGHT, LIGHT, FILL,
          LIGHT, LIGHT, LIGHT, LIGHT,
          FULL, FULL, FULL, FILL,
        ],
      },
    },
    {
      id: 'bridge',
      label: '間奏 (刻みとスティールドラム)',
      chords: themeChords.slice(0, 4),
      parts: {
        fl: ['', '', '', PICKUP],
        steel: STEEL_RIFF,
        vn2: PAD_HIGH.slice(0, 4),
        va: PAD_LOW.slice(0, 4),
        vc: CELLO.slice(0, 4),
        piano: themeComp.slice(0, 4),
        bass: themeBass.slice(0, 4),
        perc: [FULL, FULL, FULL, FILL],
      },
    },
    {
      id: 'A2',
      label: "A' 主題 (総奏・オクターブの低音)",
      chords: themeChords,
      parts: {
        fl: [...themeMelody],
        vn1: [...themeMelody],
        tp: [
          ...themeMelody.slice(0, 7).map(octaveDown), '-:2 r:2',
          ...silent(4),
          ...themeMelody.slice(12, 15).map(octaveDown), 'v96 C5:2.5 r:1.5',
        ],
        vn2: louder(PAD_HIGH, 66),
        va: louder(PAD_LOW, 66),
        vc: louder(CELLO, 68),
        hn: louder(HORNS, 70),
        steel: [...silent(8), ...louder(MIDDLE_ARPEGGIO.map(octaveUp), 58), ...silent(4)],
        harp: [...silent(8), ...MIDDLE_ARPEGGIO, ...silent(4)],
        piano: [...themeComp],
        bass: [
          octaves('F2'), octaves('G2'), octaves('E2'), octaves('A1'),
          octaves('F2'), octaves('G2'), octaves('C2'), octaves('C2'),
          ...themeBass.slice(8, 12),
          octaves('F2'), octaves('G2'), octavePair('Ab1', 'Bb1'), octaves('C2'),
        ],
        timp: [
          'v70 F2:1 r:3', '', '', '',
          '', '', '', 'v64 C3:1 r:3',
          '', '', '', '',
          'v74 F2:1 r:3', '', 'v72 Ab2:2 Bb2:2', 'v78 C3:1 r:1.5 v62 C3:.5 C3:.5 C3:.5',
        ],
        perc: [
          CRASH, FULL_TAMB, FULL_TAMB, FULL_TAMB,
          FULL_TAMB, FULL_TAMB, FULL_TAMB, FILL,
          LIGHT, LIGHT, LIGHT, LIGHT,
          CRASH, FULL_TAMB, FULL_TAMB, FILL,
        ],
      },
    },
  ],
  intro: ['intro'],
  loop: ['A', 'bridge', 'A2'],
}

export const noonFairWindOrchestrated: CompositionStudy = {
  song,
  melodyPart: 'fl',
  hypothesis:
    '「真昼の凱風 — 二行の詩／一小節ごとの色」の編曲版。イントロ4小節＋ループ36小節（A 16・間奏 4・A\' 16）。旋律・和声・刻みは派生元のまま。A はフルートと軽い打楽器、A\' はバイオリンとトランペット（1オクターブ下）を重ね、低音を8分のオクターブにする。中間の4小節は両方とも打楽器を軽くし、分散和音で色を変える',
  phrases: [
    { label: 'イントロ', from: 1, to: 4, intention: 'ピアノの刻み・ベース・スティールドラムの分散和音で始め、フルートの弱起で主題へ入る。' },
    { label: 'A 前半', from: 5, to: 12, intention: 'フルートが主題を歌う。5小節目から弦の保持音が入る。' },
    { label: 'A 中間（二行の詩）', from: 13, to: 16, intention: 'Abmaj7→Cm7→Dbmaj7→Bbm7。ハープの分散和音とホルン・チェロが入る。' },
    { label: 'A 終盤', from: 17, to: 20, intention: 'バイオリンがフルートに重なり、バスドラムが4つ打ちになる。' },
    { label: '間奏', from: 21, to: 24, intention: 'イントロと同じ刻みに弦の保持音を足し、弱起で2周目へ。' },
    { label: "A' 前半", from: 25, to: 32, intention: 'フルート・バイオリン・トランペット（1オクターブ下）で主題。低音は8分のオクターブ。' },
    { label: "A' 中間", from: 33, to: 36, intention: 'トランペットが休み、打楽器を軽くして、スティールドラムとハープの分散和音。' },
    { label: "A' 終盤", from: 37, to: 40, intention: '総奏で Fmaj7→G→Ab→Bb→C。弱起で A へ戻る。' },
  ],
  moments: [
    { bar: 13, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'G5'], intention: 'A の Abmaj7' },
    { bar: 14, beat: 0, pitches: ['C2', 'Bb3', 'Eb4', 'G4', 'Bb5'], intention: 'A の Cm7' },
    { bar: 16, beat: 0, pitches: ['Bb1', 'Ab3', 'Db4', 'F4', 'C6'], intention: 'A の Bbm7' },
    { bar: 39, beat: 3, pitches: ['Bb1', 'D4', 'F4', 'Bb4', 'Bb5'], intention: "A' 終盤の Ab→Bb の Bb" },
  ],
}
