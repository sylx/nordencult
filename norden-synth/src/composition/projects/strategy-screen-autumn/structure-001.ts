import type { Song, SongPart } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'

// 「黄金の穂波、帰り道」(autumn-golden-homeward) からのフル尺の構成案 01。
// 変ホ長調 · ♩=120 · 12/8、主題の段階と同じピアノ＋アコースティックベース。
// 主題の前半（1–8小節）はそのまま使い、後半の旋律は案ごとに、前半の動機
// （8分3つで上がって長音へ・長音から音階で降りる）を変形して作り直す。

export type Voicing = readonly [string, string, string, string]

// 和音ごとの伴奏の4音と、低音（前半・後半）
export const CHORDS: Record<string, { v: Voicing; bass: readonly [string, string] }> = {
  'Abmaj9': { v: ['G3', 'Bb3', 'C4', 'Eb4'], bass: ['Ab1', 'Eb2'] },
  'Abmaj9/Eb': { v: ['G3', 'Bb3', 'C4', 'Eb4'], bass: ['Eb2', 'Bb1'] },
  'Abmaj7': { v: ['G3', 'Ab3', 'C4', 'Eb4'], bass: ['Ab1', 'Eb2'] },
  'Abm6': { v: ['F3', 'Ab3', 'Cb4', 'Eb4'], bass: ['Ab1', 'Eb2'] },
  'Bb6/Ab': { v: ['F3', 'Bb3', 'D4', 'G4'], bass: ['Ab1', 'Ab2'] },
  'Bb9sus4': { v: ['F3', 'Ab3', 'C4', 'Eb4'], bass: ['Bb1', 'F2'] },
  'Bb7sus4': { v: ['Ab3', 'Bb3', 'Eb4', 'F4'], bass: ['Bb1', 'F2'] },
  'Bb7': { v: ['F3', 'Ab3', 'D4', 'F4'], bass: ['Bb1', 'F2'] },
  'Bbmaj9': { v: ['A3', 'C4', 'D4', 'F4'], bass: ['Bb1', 'F2'] },
  'Bbm9': { v: ['Ab3', 'C4', 'Db4', 'F4'], bass: ['Bb1', 'F2'] },
  'Cm7': { v: ['G3', 'Bb3', 'Eb4', 'G4'], bass: ['C2', 'G2'] },
  'Cm9': { v: ['Eb3', 'G3', 'Bb3', 'D4'], bass: ['C2', 'G2'] },
  'Cm(add9)': { v: ['Eb3', 'G3', 'C4', 'D4'], bass: ['C2', 'G2'] },
  'Dbmaj9': { v: ['C4', 'Eb4', 'F4', 'Ab4'], bass: ['Db2', 'Ab2'] },
  'D7sus4': { v: ['A3', 'C4', 'D4', 'G4'], bass: ['D2', 'A1'] },
  'D7': { v: ['A3', 'C4', 'D4', 'F#4'], bass: ['D2', 'A1'] },
  'Eb(add9)': { v: ['G3', 'Bb3', 'Eb4', 'F4'], bass: ['Eb2', 'Bb1'] },
  'Eb/G': { v: ['G3', 'Bb3', 'Eb4', 'F4'], bass: ['G1', 'Bb1'] },
  'Eb7sus4': { v: ['Ab3', 'Bb3', 'Db4', 'Eb4'], bass: ['Eb2', 'Bb1'] },
  'Eb7': { v: ['G3', 'Bb3', 'Db4', 'Eb4'], bass: ['Eb2', 'Bb1'] },
  'Fm7': { v: ['Ab3', 'C4', 'Eb4', 'F4'], bass: ['F1', 'C2'] },
  'Fm9': { v: ['Ab3', 'C4', 'Eb4', 'G4'], bass: ['F1', 'C2'] },
  'Gbmaj9': { v: ['F3', 'Bb3', 'Db4', 'Ab4'], bass: ['Gb1', 'Db2'] },
  'Gm7': { v: ['F3', 'Bb3', 'D4', 'F4'], bass: ['G1', 'D2'] },
  'Gm9': { v: ['F3', 'A3', 'Bb3', 'D4'], bass: ['G1', 'D2'] },
  'G7sus4': { v: ['F3', 'G3', 'C4', 'D4'], bass: ['G1', 'D2'] },
  'G7': { v: ['F3', 'G3', 'B3', 'D4'], bass: ['G1', 'D2'] },
}

// 伴奏の型（12/8 の半小節 = 6つの8分）
export type Texture = 'wave' | 'sway' | 'pulse' | 'hold'
export const half = (texture: Texture, [a, b, c, d]: Voicing) => {
  const stack = `${b}+${c}+${d}`
  switch (texture) {
    case 'wave': return `${a}:.5 ${b}:.5 ${c}:.5 ${d}:.5 ${c}:.5 ${b}:.5` // 主題と同じ8分の波
    case 'sway': return `r:.5 ${stack}:.5 ${stack}:.5 r:.5 ${stack}:.5 ${stack}:.5` // 拍頭を休んで揺らす
    case 'pulse': return `${a}+${stack}:1.5 ${stack}:1.5` // 付点4分の和音
    case 'hold': return `${a}+${stack}:3` // 保持
  }
}

// 1小節 = 和音1つ、または前半・後半の2つ
export type Bar = { chord: string | readonly [string, string]; melody: string }
export interface SectionDraft {
  id: string
  label: string
  texture: Texture
  bars: Bar[]
}

function section({ id, label, texture, bars }: SectionDraft) {
  const pair = (bar: Bar) => (typeof bar.chord === 'string' ? [bar.chord, bar.chord] : bar.chord).map((name) => {
    const chord = CHORDS[name]
    if (!chord) throw new Error(`unknown chord: ${name}`)
    return chord
  })
  return {
    id,
    label,
    chords: bars.map((bar) => (typeof bar.chord === 'string' ? bar.chord : bar.chord.join(' '))),
    parts: {
      melody: bars.map((bar) => bar.melody),
      harmony: bars.map((bar) => pair(bar).map((c) => half(texture, c.v)).join(' ')),
      bass: bars.map((bar) => {
        const [x, y] = pair(bar)
        return x === y ? `${x.bass[0]}:3 ${x.bass[1]}:3` : `${x.bass[0]}:3 ${y.bass[0]}:3`
      }),
    },
  }
}

interface StructureDraft {
  id: string
  title: string
  description: string
  sections: SectionDraft[]
  phrases: CompositionStudy['phrases']
  moments: CompositionStudy['moments']
}

function buildStructure(draft: StructureDraft): CompositionStudy {
  const parts: SongPart[] = [
    { id: 'melody', label: '主旋律', instrument: 'yamaha-grand-piano', volume: 0.7, pan: 0.04, velocity: 86, gate: 0.95 },
    { id: 'harmony', label: '和声・伴奏', instrument: 'yamaha-grand-piano', volume: 0.38, pan: 0.14, velocity: 56, gate: 1.25 },
    { id: 'bass', label: '低音', instrument: 'acoustic-bass', volume: 0.52, pan: -0.06, velocity: 76, gate: 1.05 },
  ]
  const song: Song = {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    tempo: 120,
    timeSignature: [12, 8],
    intro: [],
    loop: draft.sections.map((s) => s.id),
    parts,
    sections: draft.sections.map(section),
  }
  return { song, melodyPart: 'melody', hypothesis: draft.description, phrases: draft.phrases, moments: draft.moments }
}

// 主題「黄金の穂波、帰り道」の1–7小節（そのまま使う）
const THEME_FIRST_HALF: Bar[] = [
  { chord: 'Abmaj9', melody: 'v86 Bb4:.5 C5:.5 Eb5:.5 v94 G5:3 v88 F5:1 Eb5:.5' },
  { chord: 'Bb6/Ab', melody: 'v88 D5:3 r:1.5 v84 Bb4:.5 C5:.5 D5:.5' },
  { chord: 'Gm7', melody: 'v92 F5:3 v88 Eb5:1 D5:.5 v86 Bb4:1.5' },
  { chord: 'Cm9', melody: 'v86 C5:4.5 r:1.5' },
  { chord: 'Abmaj9', melody: 'v86 Bb4:.5 C5:.5 Eb5:.5 v94 G5:3 v88 F5:1 Eb5:.5' },
  { chord: 'Bb6/Ab', melody: 'v88 D5:3 r:1.5 v86 Eb5:.5 F5:.5 G5:.5' },
  { chord: 'Fm9', melody: 'v96 Ab5:3 v92 G5:1 F5:.5 v88 Eb5:1.5' },
]

// 「夕暮れの遠い鐘」の部分。編曲 (orchestration-001.ts) でも同じ旋律・和声を使う。
export const EVENING_BELL_SECTIONS: SectionDraft[] = [
  {
    id: 'A', label: 'A 主題（前半）', texture: 'wave',
    bars: [...THEME_FIRST_HALF, { chord: 'Bb9sus4', melody: 'v88 F5:3 r:1.5 v84 Eb5:.5 D5:.5 C5:.5' }],
  },
  {
    id: 'B', label: 'B ト短調の長音', texture: 'pulse',
    bars: [
      { chord: 'Gm9', melody: 'v84 Bb4:1.5 C5:1.5 v88 D5:3' },
      { chord: 'Cm7', melody: 'v88 Eb5:3 v84 D5:1.5 C5:1.5' },
      { chord: 'Abmaj7', melody: 'v84 C5:1.5 D5:1.5 v88 Eb5:3' },
      { chord: ['D7sus4', 'D7'], melody: 'v92 G5:3 v88 F#5:3' },
      { chord: 'Gm9', melody: 'v88 G5:1.5 A5:1.5 v92 Bb5:3' },
      { chord: 'Cm9', melody: 'v94 C6:3 v90 Bb5:1 A5:.5 v88 G5:1.5' },
      { chord: 'Abmaj7', melody: 'v90 Ab5:3 v88 G5:1.5 Eb5:1.5' },
      { chord: 'Bb9sus4', melody: 'v86 F5:4.5 r:1.5' },
    ],
  },
  {
    id: 'A2', label: 'A′ 高い再現と逆向きの後半', texture: 'wave',
    bars: [
      { chord: 'Abmaj9', melody: 'v92 Bb5:.5 C6:.5 Eb6:.5 v102 G6:3 v96 F6:1 Eb6:.5' },
      { chord: 'Bb6/Ab', melody: 'v94 D6:3 r:1.5 v90 Bb5:.5 C6:.5 D6:.5' },
      { chord: 'Gm7', melody: 'v98 F6:3 v94 Eb6:1 D6:.5 v92 Bb5:1.5' },
      { chord: 'Cm9', melody: 'v92 C6:4.5 r:1.5' },
      { chord: 'Abmaj9', melody: 'v92 Eb6:.5 D6:.5 C6:.5 v90 G5:3 v88 Ab5:1 Bb5:.5' },
      { chord: 'Gm7', melody: 'v90 Bb5:3 r:1.5 v90 D6:.5 C6:.5 Bb5:.5' },
      { chord: ['Fm9', 'Bb7'], melody: 'v92 Ab5:3 v88 F5:1.5 D5:1.5' },
      { chord: 'Eb(add9)', melody: 'v88 Eb5:4.5 r:1.5' },
    ],
  },
  {
    id: 'C', label: 'C 引き伸ばした動機', texture: 'hold',
    bars: [
      { chord: 'Abmaj9', melody: 'v82 C5:1.5 D5:1.5 v84 Eb5:1.5 v88 G5:1.5' },
      { chord: 'Fm9', melody: 'v86 F5:3 v84 Eb5:3' },
      { chord: 'Abm6', melody: 'v82 Cb5:1.5 Db5:1.5 v84 Eb5:1.5 v86 F5:1.5' },
      { chord: 'Eb/G', melody: 'v88 G5:3 v84 F5:1.5 Eb5:1.5' },
      { chord: 'Cm9', melody: 'v84 Eb5:1.5 F5:1.5 v86 G5:1.5 v90 Bb5:1.5' },
      { chord: 'Abmaj9', melody: 'v92 C6:3 v88 Bb5:1.5 G5:1.5' },
      { chord: ['Abm6', 'Bb7'], melody: 'v86 F5:3 v84 D5:3' },
      { chord: 'Eb(add9)', melody: 'v82 Eb5:4.5 r:1.5' },
    ],
  },
]

export const homewardStructures: CompositionStudy[] = [
  // ---------- 01 丘を越える歌 (A–A′–B–A″, 32小節, 山場は終盤 29小節目) ----------
  buildStructure({
    id: 'autumn-homeward-over-the-hill',
    title: '黄金の穂波 — 丘を越える歌',
    description:
      'A 8 – A′ 8 – B 8 – A″ 8 の32小節。A′ は前半の「8分3つで上がって長音」を C6 から一段ずつ上げ、付点4分の音階で E♭6 へ上る新しい後半。B はハ短調に移り、4分＋8分の揺れる歌と G7 の導音で前半と対比する。A″ は前半を戻しつつ3小節目から上向きに変え、F6 を最後の山場にして変ホ長調で閉じる',
    sections: [
      {
        id: 'A', label: 'A 主題（前半）', texture: 'wave',
        bars: [...THEME_FIRST_HALF, { chord: 'Bb9sus4', melody: 'v88 F5:4.5 r:1.5' }],
      },
      {
        id: 'A2', label: 'A′ 新しい後半', texture: 'wave',
        bars: [
          { chord: 'Cm7', melody: 'v88 Eb5:.5 F5:.5 G5:.5 v96 C6:3 v92 Bb5:1 Ab5:.5' },
          { chord: 'Abmaj9', melody: 'v90 G5:3 r:1.5 v86 Ab5:.5 Bb5:.5 C6:.5' },
          { chord: 'Gm7', melody: 'v94 D6:3 v90 C6:1 Bb5:.5 v88 G5:1.5' },
          { chord: 'Cm9', melody: 'v92 C6:3 v88 Bb5:1.5 G5:1.5' },
          { chord: 'Abmaj9', melody: 'v88 Ab5:1.5 v90 Bb5:1.5 v92 C6:1.5 v94 D6:1.5' },
          { chord: ['Fm9', 'Bb7'], melody: 'v98 Eb6:3 v94 D6:1.5 v90 C6:1.5' },
          { chord: ['Abmaj7', 'Bb7sus4'], melody: 'v90 Bb5:3 v88 Ab5:1.5 F5:1.5' },
          { chord: 'Eb(add9)', melody: 'v88 G5:4.5 r:1.5' },
        ],
      },
      {
        id: 'B', label: 'B ハ短調の対比', texture: 'sway',
        bars: [
          { chord: 'Cm(add9)', melody: 'v84 G5:1 F5:.5 v86 Eb5:1 D5:.5 v88 Eb5:3' },
          { chord: 'Abmaj7', melody: 'v84 C5:1 D5:.5 v86 Eb5:1 F5:.5 v90 G5:3' },
          { chord: 'Fm7', melody: 'v90 Ab5:1 G5:.5 v88 F5:1 Eb5:.5 v86 C5:3' },
          { chord: ['G7sus4', 'G7'], melody: 'v86 D5:1.5 C5:1.5 v88 B4:3' },
          { chord: 'Cm(add9)', melody: 'v86 G5:1 F5:.5 v88 Eb5:1 D5:.5 v88 Eb5:1.5 v90 G5:1.5' },
          { chord: 'Abmaj7', melody: 'v96 C6:3 v92 Bb5:1 Ab5:.5 v90 G5:1.5' },
          { chord: 'Fm9', melody: 'v92 Ab5:3 v88 G5:1.5 F5:1.5' },
          { chord: ['Bb9sus4', 'Bb7'], melody: 'v88 Eb5:3 v86 D5:1.5 r:1.5' },
        ],
      },
      {
        id: 'A3', label: 'A″ 主題の再現と山場', texture: 'wave',
        bars: [
          THEME_FIRST_HALF[0],
          THEME_FIRST_HALF[1],
          { chord: 'Gm7', melody: 'v92 F5:3 v90 G5:1 Ab5:.5 v94 Bb5:1.5' },
          { chord: 'Cm9', melody: 'v94 C6:3 r:1.5 v92 C6:.5 D6:.5 Eb6:.5' },
          { chord: 'Fm9', melody: 'v102 F6:3 v96 Eb6:1 D6:.5 v94 C6:1.5' },
          { chord: ['Gm7', 'Cm7'], melody: 'v94 D6:3 v90 C6:1.5 Bb5:1.5' },
          { chord: ['Fm9', 'Bb7sus4'], melody: 'v94 Ab5:3 v90 G5:1 v88 F5:2' },
          { chord: 'Eb(add9)', melody: 'v88 Eb5:4.5 r:1.5' },
        ],
      },
    ],
    phrases: [
      { label: 'A 主題（前半）', from: 1, to: 8, intention: '主題の前半をそのまま。8小節目は駆け上がりを置かず F5 で区切る。' },
      { label: 'A′ 新しい後半', from: 9, to: 16, intention: '前半の動機を C6、D6 と一段ずつ上げ、付点4分の音階 A♭–B♭–C–D から E♭6 へ。Eb で一度閉じる。' },
      { label: 'B ハ短調の対比', from: 17, to: 24, intention: '4分＋8分の揺れるリズムで、中音域の G–F–E♭–D を歌う。G7 の B♮ で調を変え、Bb7 で主調へ戻す。' },
      { label: 'A″ 再現と山場', from: 25, to: 32, intention: '前半を戻し、3小節目から上向きに変えて F6 を最後の山場にし、変ホ長調で閉じる。' },
    ],
    moments: [
      { bar: 14, beat: 0, pitches: ['F1', 'Ab3', 'Eb6'], intention: 'A′ の頂点 E♭6' },
      { bar: 20, beat: 3.5, pitches: ['G1', 'B3', 'B4'], intention: 'B のハ短調を決める G7 の導音' },
      { bar: 29, beat: 0, pitches: ['F1', 'Ab3', 'F6'], intention: '曲全体の山場 F6' },
      { bar: 32, beat: 0, pitches: ['Eb2', 'G3', 'Eb5'], intention: '主調の終止' },
    ],
  }),

  // ---------- 02 変イの野へ (A–a′–B–橋–A′–結び, 36小節, 山場は橋の終わり 24小節目) ----------
  buildStructure({
    id: 'autumn-homeward-ab-meadow',
    title: '黄金の穂波 — 変イの野へ',
    description:
      'A 8 – a′ 4 – B 8 – 橋 4 – A′ 8 – 結び 4 の36小節。a′ は動機の長音と下降だけを使った短い答え。B は変イ長調に移り、動機の8分3つを音階の8分の流れに広げ、伴奏は保持の和音に変える。橋は動機を Gbmaj9→Abmaj9→Bbmaj9 と和音ごと平行移動して E♭6 の山場へ押し上げ、A′ で前半に戻ってから、動機を低く言い直す後半で静かに閉じる',
    sections: [
      {
        id: 'A', label: 'A 主題（前半）', texture: 'wave',
        bars: [...THEME_FIRST_HALF, { chord: 'Bb9sus4', melody: 'v88 F5:3 r:3' }],
      },
      {
        id: 'a2', label: 'a′ 短い答え', texture: 'wave',
        bars: [
          { chord: 'Cm7', melody: 'v90 G5:3 v86 F5:1 Eb5:.5 v84 C5:1.5' },
          { chord: 'Abmaj9', melody: 'v86 Eb5:3 r:1.5 v84 F5:.5 G5:.5 Ab5:.5' },
          { chord: 'Fm9', melody: 'v94 C6:3 v90 Bb5:1 Ab5:.5 v88 F5:1.5' },
          { chord: ['Bb7sus4', 'Bb7'], melody: 'v88 Eb5:3 v86 D5:1.5 r:1.5' },
        ],
      },
      {
        id: 'B', label: 'B 変イ長調の流れ', texture: 'hold',
        bars: [
          { chord: 'Abmaj7', melody: 'v84 C5:.5 Db5:.5 Eb5:.5 F5:.5 G5:.5 Ab5:.5 v90 G5:1.5 v86 Eb5:1.5' },
          { chord: 'Dbmaj9', melody: 'v86 F5:.5 G5:.5 Ab5:.5 Bb5:.5 Ab5:.5 F5:.5 v88 Eb5:3' },
          { chord: 'Bbm9', melody: 'v84 Db5:.5 Eb5:.5 F5:.5 v92 Ab5:3 v86 F5:1.5' },
          { chord: ['Eb7sus4', 'Eb7'], melody: 'v90 Ab5:3 v88 G5:1.5 r:1.5' },
          { chord: 'Abmaj7', melody: 'v86 Eb5:.5 F5:.5 G5:.5 Ab5:.5 Bb5:.5 C6:.5 v92 Bb5:1.5 v88 Ab5:1.5' },
          { chord: 'Fm9', melody: 'v88 G5:.5 Ab5:.5 Bb5:.5 v96 C6:3 v90 Ab5:1.5' },
          { chord: 'Dbmaj9', melody: 'v94 Db6:1.5 v92 C6:1.5 v90 Bb5:1.5 v88 Ab5:1.5' },
          { chord: ['Eb7sus4', 'Eb7'], melody: 'v90 Bb5:3 v86 G5:1.5 r:1.5' },
        ],
      },
      {
        id: 'bridge', label: '橋 平行移動の高まり', texture: 'wave',
        bars: [
          { chord: 'Gbmaj9', melody: 'v88 Db5:.5 Eb5:.5 Gb5:.5 v94 Bb5:3 v90 Ab5:1 Gb5:.5' },
          { chord: 'Abmaj9', melody: 'v90 Eb5:.5 F5:.5 Ab5:.5 v96 C6:3 v92 Bb5:1 Ab5:.5' },
          { chord: 'Bbmaj9', melody: 'v92 F5:.5 G5:.5 Bb5:.5 v98 D6:3 v94 C6:1 Bb5:.5' },
          { chord: ['Bb7sus4', 'Bb7'], melody: 'v102 Eb6:3 v96 D6:1.5 r:1.5' },
        ],
      },
      {
        id: 'A2', label: 'A′ 主題の再現', texture: 'wave',
        bars: [
          ...THEME_FIRST_HALF.slice(0, 4),
          { chord: 'Cm7', melody: 'v86 Eb5:.5 F5:.5 G5:.5 v92 Bb5:3 v88 Ab5:1 G5:.5' },
          { chord: 'Abmaj9', melody: 'v88 G5:3 r:1.5 v84 C5:.5 D5:.5 Eb5:.5' },
          { chord: ['Fm9', 'Bb7sus4'], melody: 'v94 Ab5:3 v90 G5:1 v88 F5:2' },
          { chord: 'Eb(add9)', melody: 'v88 Eb5:4.5 r:1.5' },
        ],
      },
      {
        id: 'coda', label: '結び', texture: 'hold',
        bars: [
          { chord: 'Abmaj9/Eb', melody: 'v80 Bb4:.5 C5:.5 Eb5:.5 v86 G5:3 v80 F5:1.5' },
          { chord: 'Eb(add9)', melody: 'v78 Eb5:4.5 r:1.5' },
          { chord: 'Abmaj9/Eb', melody: 'v78 Bb4:.5 C5:.5 Eb5:.5 v84 F5:3 v78 Eb5:1.5' },
          { chord: 'Eb(add9)', melody: 'v76 Eb5:3 r:3' },
        ],
      },
    ],
    phrases: [
      { label: 'A 主題（前半）', from: 1, to: 8, intention: '主題の前半をそのまま。8小節目は F5 で区切る。' },
      { label: 'a′ 短い答え', from: 9, to: 12, intention: '駆け上がりを使わず、動機の「長音から降りる」部分だけで答え、Bb7 で半終止。' },
      { label: 'B 変イ長調の流れ', from: 13, to: 20, intention: '動機の8分3つを音階の8分の流れに広げ、Dbmaj9 の #11 で明るく。伴奏は保持の和音。Eb7 の 4–3 で区切る。' },
      { label: '橋 平行移動', from: 21, to: 24, intention: '動機を Gb→Ab→Bb と和音ごと全音ずつ上げ、Bb7sus4 の E♭6 を山場にする。' },
      { label: 'A′ 主題の再現', from: 25, to: 32, intention: '前半4小節を戻し、後半は動機を Cm7 上で B♭5 へ低く言い直して変ホ長調で閉じる。' },
      { label: '結び', from: 33, to: 36, intention: '主音 E♭ の低音の上で動機を弱く2回鳴らし、頭へ戻る。' },
    ],
    moments: [
      { bar: 14, beat: .5, pitches: ['Db2', 'G5'], intention: 'B の Dbmaj9 の #11 G5' },
      { bar: 21, beat: 1.5, pitches: ['Gb1', 'Bb5'], intention: '平行移動の1段目 Gbmaj9' },
      { bar: 23, beat: 1.5, pitches: ['Bb1', 'D6'], intention: '平行移動の3段目 Bbmaj9' },
      { bar: 24, beat: 0, pitches: ['Bb1', 'Eb6'], intention: '曲全体の山場 E♭6（Bb7sus4）' },
      { bar: 32, beat: 0, pitches: ['Eb2', 'Eb5'], intention: '主調の終止' },
    ],
  }),

  // ---------- 03 夕暮れの遠い鐘 (A–B–A′–C, 32小節, 山場は中盤 17小節目) ----------
  buildStructure({
    id: 'autumn-homeward-evening-bell',
    title: '黄金の穂波 — 夕暮れの遠い鐘',
    description:
      'A 8 – B 8 – A′ 8 – C 8 の32小節。B は早めに置く対比で、ト短調の付点4分の音階と D7sus4→D7 の 4–3 による落ち着いた長音の歌。A′ は前半を1オクターブ上で鳴らして G6 を中盤の山場にし、後半は動機を逆向き（8分3つで降りる）に変える。C は動機の8分3つを付点4分に引き伸ばし、Abm6 の C♭ で陰らせながら静かに閉じる',
    sections: EVENING_BELL_SECTIONS,
    phrases: [
      { label: 'A 主題（前半）', from: 1, to: 8, intention: '主題の前半。8小節目は E♭–D–C と降りる8分で B へ渡す（動機の逆向きの予告）。' },
      { label: 'B ト短調の長音', from: 9, to: 16, intention: 'ト短調の付点4分の音階と D7sus4→D7 の G→F# で、前半の跳躍と対比する落ち着いた歌。伴奏は付点4分の和音。' },
      { label: 'A′ 高い再現と逆向きの後半', from: 17, to: 24, intention: '前半を1オクターブ上で鳴らして G6 を山場にし、後半は8分3つで降りる逆向きの動機から変ホ長調へ戻る。' },
      { label: 'C 引き伸ばした動機', from: 25, to: 32, intention: '動機の8分3つを付点4分に引き伸ばし、Abm6 の C♭ で陰らせてから静かに主調で閉じる。' },
    ],
    moments: [
      { bar: 12, beat: 3, pitches: ['D2', 'F#4', 'F#5'], intention: 'B のト短調を決める D7 の導音' },
      { bar: 17, beat: 1.5, pitches: ['Ab1', 'G6'], intention: '曲全体の山場 G6（前半の1オクターブ上）' },
      { bar: 21, beat: 0, pitches: ['Ab1', 'Eb6'], intention: '逆向きの動機 E♭–D–C の始まり' },
      { bar: 27, beat: 0, pitches: ['Ab1', 'Cb4', 'Cb5'], intention: 'Abm6 の C♭ で陰らせる' },
      { bar: 32, beat: 0, pitches: ['Eb2', 'G3', 'Eb5'], intention: '主調の終止' },
    ],
  }),
]
