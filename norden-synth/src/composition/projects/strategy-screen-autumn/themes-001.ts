import type { Song, SongPart } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'

// 秋の戦略画面の主題集 01。
// 主題と和声を同時に評価できるよう、簡潔な編成（ピアノ＋アコースティックベース＋必要に応じた軽い打楽器）で、
// 拍子・リズム・輪郭・トナルセンターの浮遊感・平行移動の使い方が異なる6案を揃える。

interface ThemeDraft {
  id: string
  title: string
  description: string
  tempo: number
  meter: readonly [number, number]
  harmonyGate: number
  bassGate: number
  bassInstrument?: 'acoustic-bass' | 'yamaha-grand-piano'
  chords: string[]
  melody: string[]
  harmony: string[]
  bass: string[]
  drums?: string[]
  phrases: CompositionStudy['phrases']
  moments: CompositionStudy['moments']
}

export function buildTheme(draft: ThemeDraft): CompositionStudy {
  const bassInstrument = draft.bassInstrument ?? 'acoustic-bass'
  const parts: SongPart[] = [
    { id: 'melody', label: '主題', instrument: 'yamaha-grand-piano', volume: 0.7, pan: 0.04, velocity: 86, gate: 0.95 },
    { id: 'harmony', label: '和声・伴奏', instrument: 'yamaha-grand-piano', volume: 0.38, pan: 0.14, velocity: 56, gate: draft.harmonyGate },
    {
      id: 'bass',
      label: '低音',
      instrument: bassInstrument,
      volume: bassInstrument === 'acoustic-bass' ? 0.52 : 0.48,
      pan: -0.06,
      velocity: bassInstrument === 'acoustic-bass' ? 76 : 68,
      gate: draft.bassGate,
    },
  ]
  const sectionParts: Record<string, string[]> = {
    melody: draft.melody,
    harmony: draft.harmony,
    bass: draft.bass,
  }
  if (draft.drums) {
    parts.push({ id: 'drums', label: '軽い打楽器', instrument: 'orchestra-kit', volume: 0.3, pan: 0, velocity: 52, gate: 1 })
    sectionParts.drums = draft.drums
  }
  const song: Song = {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    tempo: draft.tempo,
    timeSignature: draft.meter,
    intro: [],
    loop: ['theme'],
    parts,
    sections: [
      {
        id: 'theme',
        label: draft.title,
        chords: draft.chords,
        parts: sectionParts,
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

export const repeat = (bar: string, count: number) => Array.from({ length: count }, () => bar)
const up = (pitch: string) => pitch.replace(/-?\d$/, (octave) => String(Number(octave) + 1))

// 4/4 用: シンコペーションの comp / push と 3+3+2 の伴奏
export const comp = (a: string, b = a) => `${a}:1 r:.5 ${a}:.5 r:.5 ${b}:.5 ${b}:1`
export const push = (root: string) => `${root}:1.5 ${root}:1 ${root}:.5 ${up(root)}:.5 ${root}:.5`
export const tresillo = (a: string) => `${a}:1.5 ${a}:1.5 ${a}:1`
export const tresilloBass = (root: string, fifth: string) => `${root}:1.5 ${root}:1.5 ${fifth}:1`

// 6/8 用: 跳ねずに揺れる裏拍伴奏と流麗な分散和音
export const lilt68 = (a: string) => `r:.5 ${a}:1 r:.5 ${a}:1`
export const arp68 = (a: string, b: string, c: string, d: string) => `${a}:.5 ${b}:.5 ${c}:.5 ${d}:.5 ${c}:.5 ${b}:.5`

// 12/8 用: 6音×2拍の柔らかなアルペジオ
export const arp128 = (a: string, b: string, c: string, d: string) =>
  `r:.5 ${a}:.5 ${b}:.5 ${c}:.5 ${d}:.5 ${b}:.5 r:.5 ${a}:.5 ${b}:.5 ${c}:.5 ${d}:.5 ${b}:.5`

// 軽快だが行進曲にならない有機的なパーカッション
const HARVEST_68_KIT = 'v40 bd:.5 v26 shaker:.5 shaker:.5 v36 tamb:.5 v26 shaker:.5 shaker:.5'
export const AUTUMN_LEAF_KIT = 'v34 cabasa:.5 v26 shaker:.5 v40 tamb:.5 v26 shaker:.5 v34 cabasa:.5 v26 shaker:.5 v42 tamb:.5 v28 rim:.5'
const LANTERN_332_KIT = 'v42 bd:1 v26 shaker:.5 v38 bd:1 v26 shaker:.5 v34 tamb:1'

export const firstThemes: CompositionStudy[] = [
  // ---------- 01 黄金の風紋 ----------
  buildTheme({
    id: 'autumn-golden-ripples',
    title: '黄金の風紋',
    tempo: 108,
    meter: [4, 4],
    harmonyGate: 1.25,
    bassGate: 1.05,
    description:
      'ト長調 / ハのリディアの浮遊 · ♩=108 · 4/4。打楽器を入れず、流れるピアノの分散和音の上で歌う案。主和音 G を避けて Cmaj9→D6/C のペダルから入り、前半の終わりに Fmaj9(#11) で視界を開く。後半は Ebmaj9→Fmaj9→Gmaj9 と長9の和音を旋律ごと全音ずつ平行移動して期待感を高める',
    chords: [
      'Cmaj9', 'D6/C', 'Bm7', 'Em9',
      'Cmaj9', 'D(add9)/C', 'Fmaj9(#11)', 'D9sus4',
      'Ebmaj9', 'Fmaj9', 'Gmaj9', 'Em9',
      'Fmaj9(#11)', 'G(add9)/B', 'Cmaj9', 'D9sus4',
    ],
    melody: [
      'v86 E5:1.5 v90 G5:.5 v94 B5:1 v88 A5:1',
      'v90 F#5:1.5 v84 D5:.5 v88 E5:1.5 r:.5',
      'v86 D5:1.5 v90 F#5:.5 v94 A5:1 v88 G5:1',
      'v88 F#5:2 v84 D5:1 r:1',
      'v88 E5:1.5 v92 G5:.5 v96 D6:1 v90 B5:1',
      'v92 A5:1.5 v88 F#5:.5 v92 A5:1 v94 B5:1',
      'v96 C6:1.5 v92 B5:.5 v90 A5:1 v88 G5:1',
      'v90 A5:2 r:1 v86 G5:.5 v88 A5:.5',
      'v94 Bb5:1.5 v90 G5:.5 v92 F5:1 v88 D5:1',
      'v96 C6:1.5 v92 A5:.5 v94 G5:1 v90 E5:1',
      'v98 D6:2 v94 B5:1 v90 A5:1',
      'v92 G5:2.5 r:1.5',
      'v90 E5:1.5 v92 G5:.5 v94 B5:1 v92 A5:1',
      'v94 B5:1.5 v90 G5:.5 v96 D6:1 v92 B5:1',
      'v92 G5:1.5 v88 E5:.5 v86 D5:1 v88 G5:1',
      'v88 A5:2.5 r:1.5',
    ],
    harmony: [
      'E3:.5 G3 B3 D4 G4 D4 B3 G3',
      'F#3:.5 A3 B3 D4 F#4 D4 B3 A3',
      'D3:.5 F#3 A3 D4 F#4 D4 A3 F#3',
      'G3:.5 B3 D4 F#4 G4 F#4 D4 B3',
      'E3:.5 G3 B3 D4 G4 D4 B3 G3',
      'F#3:.5 A3 D4 E4 F#4 E4 D4 A3',
      'A3:.5 C4 E4 G4 B4 G4 E4 C4',
      'G3:.5 A3 C4 E4 G4 E4 C4 A3',
      'G3:.5 Bb3 D4 F4 Bb4 F4 D4 Bb3',
      'A3:.5 C4 E4 G4 C5 G4 E4 C4',
      'B3:.5 D4 F#4 A4 D5 A4 F#4 D4',
      'G3:.5 B3 D4 F#4 B4 F#4 D4 B3',
      'A3:.5 C4 E4 G4 B4 G4 E4 C4',
      'G3:.5 A3 D4 G4 A4 G4 D4 B3',
      'E3:.5 G3 B3 D4 G4 D4 B3 G3',
      'G3:.5 A3 C4 E4 G4 E4 C4 A3',
    ],
    bass: [
      'C2:2.5 G2:1.5', 'C2:2.5 G2:1.5', 'B1:2.5 F#2:1.5', 'E2:2.5 B2:1.5',
      'C2:2.5 G2:1.5', 'C2:2.5 G2:1.5', 'F2:2.5 C3:1.5', 'D2:2.5 A2:1.5',
      'Eb2:2.5 Bb2:1.5', 'F2:2.5 C3:1.5', 'G2:2.5 D3:1.5', 'E2:2.5 B2:1.5',
      'F2:2.5 C3:1.5', 'B1:2.5 D2:1.5', 'C2:2.5 G2:1.5', 'D2:2.5 A2:1.5',
    ],
    phrases: [
      { label: 'リディアの風', from: 1, to: 4, intention: 'Cmaj9→D6/C の保続低音から Bm7→Em9 へ抜け、主音を確定させずに歌い出す。' },
      { label: '視界が開ける', from: 5, to: 8, intention: 'D6 まで伸び上がったのち Fmaj9(#11) を降り、D9sus4 の弱起で転回を呼ぶ。' },
      { label: '全音の平行昇華', from: 9, to: 12, intention: 'Ebmaj9→Fmaj9→Gmaj9 と同じ和音・同じ動機で全音ずつ駆け上がり、Em9 へ落ち着く。' },
      { label: '黄金の余韻', from: 13, to: 16, intention: 'Fmaj9(#11) から上行低音 B–C–D に乗せて戻り、期待感を残して頭へ還る。' },
    ],
    moments: [
      { bar: 1, beat: 2, pitches: ['C2', 'G4', 'B5'], intention: 'Cmaj9 の長7度 B5 と保続低音 C' },
      { bar: 7, beat: 2, pitches: ['F2', 'B4', 'A5'], intention: 'Fmaj9(#11) の #11（B4）' },
      { bar: 9, beat: 0, pitches: ['Eb2', 'G3', 'Bb5'], intention: '平行移動1段目 Ebmaj9' },
      { bar: 10, beat: 0, pitches: ['F2', 'A3', 'C6'], intention: '全音上の平行移動 Fmaj9' },
    ],
  }),

  // ---------- 02 琥珀の収穫祭 ----------
  buildTheme({
    id: 'autumn-amber-harvest',
    title: '琥珀の収穫祭',
    tempo: 138,
    meter: [6, 8],
    harmonyGate: 0.9,
    bassGate: 0.85,
    description:
      '変ホ長調 / ヘのドリア · ♩=138（付点4分=92）· 6/8。行進曲を避けた軽やかな6/8の跳ねと揺れ。Abmaj7 から入り、裏拍で呼吸する歌に Dbmaj7(#11) の彩りを添える。後半は分散和音に切り替え、Dbmaj9→Ebmaj9→Fm9 の平行移動と Gbmaj7(#11) で収穫の喜びと期待感を広げる',
    chords: [
      'Abmaj7', 'Bb6', 'Gm7', 'Cm9',
      'Abmaj7', 'Bb(add9)', 'Dbmaj7(#11)', 'Bb9sus4',
      'Dbmaj9', 'Ebmaj9', 'Fm9', 'Eb/G',
      'Gbmaj7(#11)', 'Abmaj9', 'Fm9', 'Bb9sus4',
    ],
    melody: [
      'r:.5 v86 Eb5:.5 G5:.5 v92 Bb5:1 v86 G5:.5',
      'v90 F5:1 v84 D5:.5 v88 G5:1.5',
      'r:.5 v86 D5:.5 F5:.5 v92 Bb5:1 v86 A5:.5',
      'v90 G5:1.5 v84 D5:1 r:.5',
      'r:.5 v88 Eb5:.5 G5:.5 v94 C6:1 v88 Bb5:.5',
      'v92 D6:1 v88 C6:.5 v86 Bb5:1.5',
      'v92 C6:1 v88 Ab5:.5 v86 G5:1 v84 F5:.5',
      'v86 F5:2 r:1',
      'v94 Ab5:1.5 v90 F5:1 v88 Eb5:.5',
      'v96 Bb5:1.5 v92 G5:1 v90 F5:.5',
      'v98 C6:1.5 v94 Ab5:1 v92 G5:.5',
      'v96 Bb5:1.5 r:.5 v88 G5:.5 Bb5:.5',
      'v98 Db6:1 v94 C6:.5 v92 Bb5:1 v88 Ab5:.5',
      'v96 Bb5:1.5 v92 G5:1 v88 Eb5:.5',
      'v92 Ab5:1 v88 G5:.5 v86 F5:1 v84 Eb5:.5',
      'v86 F5:2 r:1',
    ],
    harmony: [
      lilt68('C4+Eb4+G4'), lilt68('D4+F4+G4'), lilt68('Bb3+D4+F4'), lilt68('Bb3+D4+G4'),
      lilt68('C4+Eb4+G4'), lilt68('C4+D4+F4'), lilt68('C4+F4+G4'), lilt68('C4+Eb4+F4'),
      arp68('Eb4', 'F4', 'Ab4', 'C5'), arp68('F4', 'G4', 'Bb4', 'D5'), arp68('G4', 'Ab4', 'C5', 'Eb5'), lilt68('Bb3+Eb4+G4'),
      lilt68('Bb3+C4+F4'), lilt68('Bb3+Eb4+G4'), lilt68('Eb4+G4+Ab4'), lilt68('C4+Eb4+F4'),
    ],
    bass: [
      'Ab1:1.5 Eb2:1.5', 'Bb1:1.5 F2:1.5', 'G2:1.5 D3:1.5', 'C2:1.5 G2:1.5',
      'Ab1:1.5 Eb2:1.5', 'Bb1:1.5 F2:1.5', 'Db2:1.5 Ab2:1.5', 'Bb1:1.5 F2:1.5',
      'Db2:1.5 Ab2:1.5', 'Eb2:1.5 Bb2:1.5', 'F2:1.5 C3:1.5', 'G2:1.5 Bb2:1.5',
      'Gb2:1.5 Db3:1.5', 'Ab1:1.5 Eb2:1.5', 'F2:1.5 C3:1.5', 'Bb1:1.5 F2:1.5',
    ],
    drums: repeat(HARVEST_68_KIT, 16),
    phrases: [
      { label: '秋の風を呼ぶ', from: 1, to: 4, intention: '8分休符から躍る6/8の動機を置き、Cm9 の9度 D5 で宙に浮く。' },
      { label: '陽だまりの跳躍', from: 5, to: 8, intention: 'D6 まで上がったあと Dbmaj7(#11) の陰影を通り、Bb9sus4 で一息つく。' },
      { label: '大らかな平行上昇', from: 9, to: 12, intention: '伴奏を分散和音へ切り替え、Dbmaj9→Ebmaj9→Fm9 と大きな波で昇りつめる。' },
      { label: '実りの余光', from: 13, to: 16, intention: 'Gbmaj7(#11) の温かな驚きを経て Abmaj9→Fm9→Bb9sus4 と軽やかに還る。' },
    ],
    moments: [
      { bar: 4, beat: 2, pitches: ['G2', 'Bb3', 'D4', 'D5'], intention: 'Cm9 の浮遊着地（9度 D5）' },
      { bar: 7, beat: 0.5, pitches: ['Db2', 'C4', 'F4', 'G4', 'C6'], intention: 'Dbmaj7(#11) の G4 と長7度 C6' },
      { bar: 10, beat: 0, pitches: ['Eb2', 'F4', 'Bb5'], intention: '平行移動2段目 Ebmaj9' },
      { bar: 13, beat: 0.5, pitches: ['Gb2', 'Bb3', 'C4', 'F4', 'Db6'], intention: 'Gbmaj7(#11) の C4（#11）' },
    ],
  }),

  // ---------- 03 麦穂を渡る風 ----------
  buildTheme({
    id: 'autumn-wheatfield-breeze',
    title: '麦穂を渡る風',
    tempo: 112,
    meter: [3, 4],
    harmonyGate: 1.35,
    bassGate: 1.2,
    bassInstrument: 'yamaha-grand-piano',
    description:
      'ニ長調 / トのリディア〜ロ短調の揺らぎ · ♩=112 · 3/4。ピアノ三重奏の澄んだ3拍子。Gmaj7→A6/G のペダルから始まり、5小節目で同じ動機を丸ごと全音下の Fmaj9→G6/F へ平行移動させる。後半は Bbmaj9→Cmaj9 の開放的な上行で、穏やかな秋に満ちる期待を描く',
    chords: [
      'Gmaj7', 'A6/G', 'F#m7', 'Bm9',
      'Fmaj9', 'G6/F', 'Em9', 'A9sus4',
      'Bbmaj9', 'Cmaj9', 'Am9', 'Dm9',
      'Bbmaj9', 'Cmaj9', 'Gmaj9', 'A9sus4',
    ],
    melody: [
      'v86 B4:.5 D5:.5 v92 F#5:1.5 v88 E5:.5',
      'v88 E5:1.5 v84 C#5:.5 v86 E5:1',
      'v90 A5:1.5 v86 F#5:.5 v84 C#5:1',
      'v88 D5:2 r:1',
      'v86 A4:.5 C5:.5 v92 E5:1.5 v88 D5:.5',
      'v88 D5:1.5 v84 B4:.5 v86 D5:1',
      'v90 G5:1 v88 F#5:1 v92 B5:1',
      'v88 E5:2 r:1',
      'v90 F5:1 v92 A5:1 v94 C6:1',
      'v96 D6:1.5 v92 C6:.5 v88 G5:1',
      'v92 B5:1.5 v88 A5:.5 v86 E5:1',
      'v88 F5:2 r:1',
      'v90 F5:1 v92 A5:1 v94 Bb5:1',
      'v94 G5:1 v96 B5:1 v98 C6:1',
      'v98 D6:1.5 v94 B5:.5 v90 A5:1',
      'v88 E5:2 r:1',
    ],
    harmony: [
      'r:.5 B3:.5 D4:.5 F#4:.5 D4:.5 B3:.5',
      'r:.5 C#4:.5 E4:.5 F#4:.5 E4:.5 C#4:.5',
      'r:.5 A3:.5 C#4:.5 E4:.5 C#4:.5 A3:.5',
      'r:.5 D4:.5 F#4:.5 A4:.5 C#4:.5 F#4:.5',
      'r:.5 A3:.5 C4:.5 E4:.5 G4:.5 C4:.5',
      'r:.5 B3:.5 D4:.5 E4:.5 D4:.5 B3:.5',
      'r:.5 G3:.5 B3:.5 D4:.5 F#4:.5 B3:.5',
      'r:.5 G3:.5 B3:.5 D4:.5 E4:.5 B3:.5',
      'r:.5 D4:.5 F4:.5 A4:.5 C5:.5 F4:.5',
      'r:.5 E4:.5 G4:.5 B4:.5 D5:.5 G4:.5',
      'r:.5 C4:.5 E4:.5 G4:.5 B4:.5 E4:.5',
      'r:.5 F3:.5 A3:.5 C4:.5 E4:.5 A3:.5',
      'r:.5 D4:.5 F4:.5 A4:.5 C5:.5 F4:.5',
      'r:.5 E4:.5 G4:.5 B4:.5 D5:.5 G4:.5',
      'r:.5 B3:.5 D4:.5 F#4:.5 A4:.5 D4:.5',
      'r:.5 G3:.5 B3:.5 D4:.5 E4:.5 B3:.5',
    ],
    bass: [
      'G2:3', 'G2:3', 'F#2:3', 'B1:2 F#2:1',
      'F2:3', 'F2:3', 'E2:3', 'A1:2 E2:1',
      'Bb1:3', 'C2:3', 'A1:3', 'D2:2 A2:1',
      'Bb1:3', 'C2:3', 'G2:3', 'A1:2 E2:1',
    ],
    phrases: [
      { label: '金色のうねり', from: 1, to: 4, intention: 'Gmaj7→A6/G の同じ低音上で伸びやかに歌い、Bm9 で一息つく。' },
      { label: '全音下の平行移調', from: 5, to: 8, intention: '冒頭の2小節を和音・旋律ごと全音下の Fmaj9→G6/F へ移し、B5 へ開いて A9sus4 に止める。' },
      { label: '広がる空', from: 9, to: 12, intention: '4分音符3つの素直な上行から Bbmaj9→Cmaj9 と平行昇華し、Dm9 へ降りる。' },
      { label: '期待の帰着', from: 13, to: 16, intention: 'Bbmaj9→Cmaj9 をさらに歩み進めて Gmaj9 の D6 へ咲き、A9sus4 で冒頭を呼ぶ。' },
    ],
    moments: [
      { bar: 2, beat: 1, pitches: ['G2', 'E4', 'E5'], intention: 'G ペダル上の A6/G の浮遊感' },
      { bar: 5, beat: 1, pitches: ['F2', 'C4', 'E5'], intention: 'Fmaj9 への全音平行移動' },
      { bar: 10, beat: 2, pitches: ['C2', 'D5', 'G5'], intention: 'Cmaj9 の 9度 D5 と着地 G5' },
      { bar: 15, beat: 1.5, pitches: ['G2', 'F#4', 'B5'], intention: 'Gmaj9 の長7度 F#4 と B5' },
    ],
  }),

  // ---------- 04 紅葉の街道、暮れゆく光 ----------
  buildTheme({
    id: 'autumn-crimson-road',
    title: '紅葉の街道、暮れゆく光',
    tempo: 116,
    meter: [4, 4],
    harmonyGate: 0.82,
    bassGate: 0.85,
    description:
      'ニのドリア / イ短調〜ハ長調の浮遊 · ♩=116 · 4/4。頭拍の8分休符から飛び込む歯切れの良い主題と、落ち葉が鳴るような軽いシェイカー＆タンバリンの刻み。Dm9→Em9→Fmaj9 と短9和音を全音上げてから Bbmaj9(#11) で茜色に染まり、後半も Bbmaj9→Cmaj9 の平行移動で前向きに駆け抜ける',
    chords: [
      'Dm9', 'Em9', 'Fmaj9', 'G9sus4',
      'Dm9', 'Em9', 'Bbmaj9(#11)', 'A7sus4',
      'Fmaj9', 'G(add9)', 'Ebmaj9', 'Fmaj9',
      'Bbmaj9', 'Cmaj9', 'Em9', 'A9sus4',
    ],
    melody: [
      'r:.5 v86 A4:.5 C5:.5 E5:.5 v92 D5:1 v86 A4:1',
      'r:.5 v88 B4:.5 D5:.5 F#5:.5 v94 E5:1 v88 B4:1',
      'r:.5 v90 C5:.5 E5:.5 G5:.5 v96 A5:1.5 v90 G5:.5',
      'v90 F5:1 v86 D5:1 v88 E5:1 r:1',
      'r:.5 v86 A4:.5 C5:.5 E5:.5 v94 F5:1 v90 E5:1',
      'r:.5 v88 B4:.5 D5:.5 F#5:.5 v96 G5:1 v92 F#5:1',
      'v96 A5:1.5 v92 G5:.5 v90 E5:1 v88 D5:1',
      'v88 E5:2.5 r:1.5',
      'v94 C6:1.5 v88 A5:.5 v90 G5:1 v88 F5:1',
      'v94 B5:1.5 v88 A5:.5 v90 G5:1 v86 D5:1',
      'v92 Bb5:1.5 v86 G5:.5 v88 F5:1 v86 D5:1',
      'v92 A5:2 r:1 v88 G5:.5 A5:.5',
      'v94 Bb5:1 v90 A5:.5 F5:.5 v92 D5:1 v94 F5:1',
      'v96 C6:1 v92 B5:.5 G5:.5 v94 E5:1 v96 G5:1',
      'v96 B5:1.5 v92 G5:.5 v90 F#5:1 v88 E5:1',
      'v88 D5:1 v86 E5:1.5 r:1.5',
    ],
    harmony: [
      comp('F3+C4+E4'), comp('G3+D4+F#4'), comp('A3+E4+G4'), comp('F3+A3+C4+D4'),
      comp('F3+C4+E4'), comp('G3+D4+F#4'), comp('A3+D4+E4'), comp('G3+D4+E4'),
      comp('A3+E4+G4'), comp('B3+D4+A4'), comp('G3+D4+F4'), comp('A3+E4+G4'),
      comp('A3+C4+D4'), comp('B3+D4+E4'), comp('G3+D4+F#4'), comp('G3+B3+D4+E4'),
    ],
    bass: [
      push('D2'), push('E2'), push('F2'), push('G2'),
      push('D2'), push('E2'), push('Bb1'), push('A1'),
      push('F2'), push('G2'), push('Eb2'), push('F2'),
      push('Bb1'), push('C2'), push('E2'), push('A1'),
    ],
    drums: repeat(AUTUMN_LEAF_KIT, 16),
    phrases: [
      { label: '平行する一歩', from: 1, to: 4, intention: 'Dm9 から同じ形のまま全音上の Em9 へ、さらに Fmaj9→G9sus4 と階段を昇るように始まる。' },
      { label: '茜色の転調', from: 5, to: 8, intention: '同じ上行から Bbmaj9(#11) へ鮮やかに色を替え、A7sus4 に着地する。' },
      { label: '夕凪の歌', from: 9, to: 12, intention: 'C6 から降りる伸びやかな歌を Fmaj9→G→Ebmaj9→Fmaj9 の明暗に乗せる。' },
      { label: '次の道へ', from: 13, to: 16, intention: 'Bbmaj9→Cmaj9 を平行に駆け上がり、Em9→A9sus4 で自然な推進力を残して戻る。' },
    ],
    moments: [
      { bar: 2, beat: 1.5, pitches: ['E2', 'G3', 'D4', 'F#4', 'E5'], intention: 'Dm9 から全音平行移動した Em9' },
      { bar: 7, beat: 2.5, pitches: ['Bb1', 'A3', 'D4', 'E4', 'E5'], intention: 'Bbmaj9(#11) の #11（E）' },
      { bar: 11, beat: 0, pitches: ['Eb2', 'G3', 'D4', 'F4', 'Bb5'], intention: 'Fmaj9→G から外れる Ebmaj9' },
      { bar: 14, beat: 1.5, pitches: ['C2', 'B3', 'D4', 'E4', 'G5'], intention: 'Bbmaj9 から平行上昇した Cmaj9' },
    ],
  }),

  // ---------- 05 果樹園の午後 ----------
  buildTheme({
    id: 'autumn-orchard-afternoon',
    title: '果樹園の午後',
    tempo: 150,
    meter: [12, 8],
    harmonyGate: 1.3,
    bassGate: 1.05,
    description:
      '変ニ長調 / 変トのリディアの浮遊 · ♩=150（付点4分=100）· 12/8。打楽器なしの豊かな12/8のうねり。Gbmaj7→Ab6/Gb から緩やかに始まり、後半は Ebm9→Fm9→Gbmaj9 の平行上昇でふくらんだあと、半音下の Bmaj7(#11) が秋の郷愁と新たな芽吹きを同時に照らす',
    chords: [
      'Gbmaj7', 'Ab6/Gb', 'Fm7', 'Bbm9',
      'Gbmaj7', 'Ab6/Gb', 'Ebm9', 'Ab9sus4',
      'Ebm9', 'Fm9', 'Gbmaj9', 'Ab9sus4',
      'Bmaj7(#11)', 'Dbmaj9', 'Ebm9', 'Ab9sus4',
    ],
    melody: [
      'r:.5 v86 Db5:.5 F5:.5 v92 Bb5:1.5 v88 Ab5:1 v84 F5:.5 v86 Eb5:1.5',
      'v88 F5:1.5 v84 C5:.5 Eb5:.5 F5:.5 v88 Ab5:2 r:1',
      'r:.5 v86 C5:.5 Eb5:.5 v92 Ab5:1.5 v88 G5:1 v84 Eb5:.5 v86 F5:1.5',
      'v88 C5:3 r:1.5 v84 Db5:.5 Eb5:.5 F5:.5',
      'v92 Bb5:1.5 v88 Ab5:1 v86 F5:.5 v94 Db6:1.5 v90 Bb5:1 v86 Ab5:.5',
      'v90 F5:1.5 v86 Eb5:1 v84 Db5:.5 v88 Eb5:2 r:1',
      'r:.5 v84 Bb4:.5 Db5:.5 v90 Gb5:1.5 v86 F5:1 v84 Eb5:.5 v86 F5:1.5',
      'v86 Eb5:3 r:3',
      'v90 Gb5:1.5 v86 F5:1 v84 Eb5:.5 v88 Bb5:1.5 v86 Ab5:1 v84 Gb5:.5',
      'v92 Ab5:1.5 v88 G5:1 v86 F5:.5 v92 C6:1.5 v88 Bb5:1 v86 Ab5:.5',
      'v94 Bb5:1.5 v90 Ab5:1 v88 F5:.5 v96 Db6:2 v90 Bb5:1',
      'v94 Db6:1.5 v90 Bb5:1 v88 Ab5:.5 v86 Gb5:2 r:1',
      'v94 F#5:1.5 v90 F5:1 v86 D#5:.5 v92 A#5:1.5 v88 F#5:1 v86 D#5:.5',
      'v94 Ab5:1.5 v90 F5:1 v86 Eb5:.5 v92 C6:1.5 v90 Ab5:1 v88 F5:.5',
      'v92 Gb5:1.5 v88 F5:1 v86 Db5:.5 v88 Bb4:1.5 v86 Eb5:1.5',
      'v86 Eb5:3 r:3',
    ],
    harmony: [
      arp128('Bb3', 'Db4', 'F4', 'Db4'),
      arp128('C4', 'Eb4', 'F4', 'Eb4'),
      arp128('Ab3', 'C4', 'Eb4', 'C4'),
      arp128('Db4', 'F4', 'Ab4', 'C5'),
      arp128('Bb3', 'Db4', 'F4', 'Db4'),
      arp128('C4', 'Eb4', 'F4', 'Eb4'),
      arp128('Gb3', 'Bb3', 'Db4', 'F4'),
      arp128('Gb3', 'Bb3', 'Db4', 'Eb4'),
      arp128('Gb3', 'Bb3', 'Db4', 'F4'),
      arp128('Ab3', 'C4', 'Eb4', 'G4'),
      arp128('Bb3', 'Db4', 'F4', 'Ab4'),
      arp128('Gb3', 'Bb3', 'Db4', 'Eb4'),
      arp128('D#4', 'F#4', 'A#4', 'F4'),
      arp128('F3', 'Ab3', 'C4', 'Eb4'),
      arp128('Gb3', 'Bb3', 'Db4', 'F4'),
      arp128('Gb3', 'Bb3', 'Db4', 'Eb4'),
    ],
    bass: [
      'Gb1:3 Db2:3', 'Gb1:3 Db2:3', 'F2:3 C3:3', 'Bb1:3 F2:3',
      'Gb1:3 Db2:3', 'Gb1:3 Db2:3', 'Eb2:3 Bb2:3', 'Ab1:3 Eb2:3',
      'Eb2:3 Bb2:3', 'F2:3 C3:3', 'Gb2:3 Db3:3', 'Ab1:3 Eb2:3',
      'B1:3 F#2:3', 'Db2:3 Ab2:3', 'Eb2:3 Bb2:3', 'Ab1:3 Eb2:3',
    ],
    phrases: [
      { label: '柔らかな午後', from: 1, to: 4, intention: 'Gb ペダル上の Gbmaj7→Ab6 で陽だまりの空気を作り、Fm7→Bbm9 の9度 C5 に留まる。' },
      { label: '実りの高さへ', from: 5, to: 8, intention: 'Db6 へ伸び上がったあと Ebm9→Ab9sus4 で一度大きく息を抜く。' },
      { label: '平行する期待', from: 9, to: 12, intention: 'Ebm9→Fm9→Gbmaj9 と一歩ずつ昇りながら、豊かに期待感を高めていく。' },
      { label: '遠景の光', from: 13, to: 16, intention: 'Bmaj7(#11) の F5（#11）で空気を変え、Dbmaj9 を経て Ab9sus4 から冒頭へ溶け戻る。' },
    ],
    moments: [
      { bar: 1, beat: 1.5, pitches: ['Gb1', 'F4', 'Bb5'], intention: 'Gbmaj7 の長7度 F4' },
      { bar: 10, beat: 1.5, pitches: ['F2', 'Eb4', 'G5'], intention: 'Ebm9 から全音平行上昇した Fm9（7度 Eb4 と 9度 G5）' },
      { bar: 11, beat: 1.5, pitches: ['Gb2', 'F4', 'Ab5'], intention: 'Gbmaj9 への上昇到達（長7度 F4 と 9度 Ab5）' },
      { bar: 13, beat: 1.5, pitches: ['B1', 'A#4', 'F5'], intention: 'Bmaj7(#11) の長7度 A# と #11（F5）' },
    ],
  }),

  // ---------- 06 収穫の灯火 ----------
  buildTheme({
    id: 'autumn-harvest-lanterns',
    title: '収穫の灯火',
    tempo: 112,
    meter: [4, 4],
    harmonyGate: 0.9,
    bassGate: 0.85,
    description:
      'ヘのリディア / トナルセンターの曖昧な往復 · ♩=112 · 4/4。平行移動そのものを曲の骨格にした案。Fmaj9 と Gmaj9 を同じ和音形のまま往復して浮遊感を作り、5度跳躍の覚えやすい主題を乗せる。後半は Abmaj9→Bbmaj9→Cmaj9→Dmaj9 と平行上昇を重ねて高揚し、Am9→Dm9 から戻る',
    chords: [
      'Fmaj9', 'Gmaj9', 'Fmaj9', 'Gmaj9',
      'Fmaj9', 'Gmaj9', 'Abmaj9', 'Bbmaj9',
      'Cmaj9', 'Dmaj9', 'Am9', 'Dm9',
      'Bbmaj9', 'Cmaj9', 'Dm9', 'C9sus4',
    ],
    melody: [
      'v88 A4:1 v92 E5:1.5 v86 D5:.5 v88 C5:1',
      'v90 B4:1 v94 F#5:1.5 v88 E5:.5 v90 D5:1',
      'v88 A4:1 v92 E5:1 v94 G5:1 v88 E5:1',
      'v92 F#5:2.5 r:1.5',
      'v88 A4:1 v92 E5:1.5 v86 D5:.5 v88 C5:1',
      'v90 B4:1 v94 F#5:1.5 v88 E5:.5 v90 D5:1',
      'v94 Eb5:1 v98 Bb5:1.5 v92 Ab5:.5 v90 G5:1',
      'v96 F5:1 v100 C6:1.5 v94 Bb5:.5 v92 A5:1',
      'v96 B5:1.5 v92 G5:.5 v90 E5:1 v88 G5:1',
      'v98 C#6:1.5 v94 A5:.5 v92 F#5:1 v90 A5:1',
      'v94 B5:1.5 v90 G5:.5 v88 E5:1 v86 C5:1',
      'v88 E5:2.5 r:1.5',
      'v90 D5:1 v94 A5:1.5 v88 G5:.5 v90 F5:1',
      'v92 E5:1 v96 B5:1.5 v90 A5:.5 v92 G5:1',
      'v94 A5:1.5 v90 F5:.5 v88 E5:1 v86 D5:1',
      'v86 D5:2.5 r:1.5',
    ],
    harmony: [
      tresillo('E3+G3+A3+C4'), tresillo('F#3+A3+B3+D4'), tresillo('E3+G3+A3+C4'), tresillo('F#3+A3+B3+D4'),
      tresillo('E3+G3+A3+C4'), tresillo('F#3+A3+B3+D4'), tresillo('G3+Bb3+C4+Eb4'), tresillo('A3+C4+D4+F4'),
      tresillo('B3+D4+E4+G4'), tresillo('C#4+E4+F#4+A4'), tresillo('G3+B3+C4+E4'), tresillo('F3+A3+C4+E4'),
      tresillo('A3+C4+D4+F4'), tresillo('B3+D4+E4+G4'), tresillo('F3+A3+C4+E4'), tresillo('G3+Bb3+D4+F4'),
    ],
    bass: [
      tresilloBass('F2', 'C3'), tresilloBass('G2', 'D3'), tresilloBass('F2', 'C3'), tresilloBass('G2', 'D3'),
      tresilloBass('F2', 'C3'), tresilloBass('G2', 'D3'), tresilloBass('Ab2', 'Eb3'), tresilloBass('Bb2', 'F3'),
      tresilloBass('C3', 'G2'), tresilloBass('D3', 'A2'), tresilloBass('A1', 'E2'), tresilloBass('D2', 'A2'),
      tresilloBass('Bb1', 'F2'), tresilloBass('C2', 'G2'), tresilloBass('D2', 'A2'), tresilloBass('C2', 'G2'),
    ],
    drums: repeat(LANTERN_332_KIT, 16),
    phrases: [
      { label: '灯りの往復', from: 1, to: 4, intention: 'Fmaj9↔Gmaj9 を同じ形のまま往復し、5度跳躍の歌を全音上で言い直して浮かぶ。' },
      { label: '灯火が連なる', from: 5, to: 8, intention: 'Gmaj9 からさらに半音上の Abmaj9、全音上の Bbmaj9 へと平行上昇して胸を高鳴らせる。' },
      { label: '高みと休息', from: 9, to: 12, intention: 'Cmaj9→Dmaj9 で頂点を迎えたあと、Am9→Dm9 の柔らかな陰りへ降りる。' },
      { label: '祭りの予感', from: 13, to: 16, intention: '5度跳躍の動機を Bbmaj9→Cmaj9 で再び上げ、Dm9→C9sus4 の余韻から頭へ戻る。' },
    ],
    moments: [
      { bar: 1, beat: 0, pitches: ['F2', 'E3', 'G3', 'A4'], intention: 'Fmaj9 の7–9–3–5ボイシング' },
      { bar: 2, beat: 0, pitches: ['G2', 'F#3', 'A3', 'B4'], intention: '全音平行移動した Gmaj9（F# と B）' },
      { bar: 7, beat: 0, pitches: ['Ab2', 'G3', 'Bb3', 'Eb5'], intention: 'Gmaj9 から平行移動で抜ける Abmaj9' },
      { bar: 10, beat: 0, pitches: ['D3', 'C#4', 'E4', 'F#4', 'C#6'], intention: '平行上昇の頂点 Dmaj9' },
    ],
  }),
]
