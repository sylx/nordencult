import type { Song, SongPart, SongSection } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { CHORDS, EVENING_BELL_SECTIONS, half, type Bar, type SectionDraft, type Texture, type Voicing } from './structure-001.ts'

// 「黄金の穂波 — 夕暮れの遠い鐘」(autumn-homeward-evening-bell) の編曲 01。
// 部分の並び（A 8 – B 8 – A′ 8 – C 8）・旋律・和声は構成案のまま。管弦楽に割り当て、
// 楽器・音の厚み・強弱で各部分を描き分ける。
// A: バイオリンの歌とハープの波。5小節目からフルートとホルンが加わる。
// B: ハープを止め、チェロが1オクターブ下で歌い、ピチカートが付点4分を刻む。13小節目からバイオリンとホルン。
//    16小節目のティンパニのクレッシェンドで山場へ。
// A′: フルートとバイオリンの斉奏、第2バイオリンの1オクターブ下の重ね、ホルン、ハープは1オクターブ上。
//     17小節目の G6 にシンバルと大太鼓。21小節目から引いていく。
// C: ホルンの独奏（1オクターブ下）からフルートへ受け渡し、トライアングルを遠い鐘として置く。

const [A, B, A2, C] = EVENING_BELL_SECTIONS
if ([A, B, A2, C].map((s) => s?.id).join() !== 'A,B,A2,C') throw new Error('unexpected sections of autumn-homeward-evening-bell')

const chordPair = (bar: Bar) =>
  (typeof bar.chord === 'string' ? [bar.chord, bar.chord] : [...bar.chord]).map((name) => CHORDS[name])
const shift = (bar: string, octaves: number) =>
  bar.replace(/([A-G][#b]?)(-?\d)/g, (_, p: string, o: string) => `${p}${Number(o) + octaves}`)
const dyn = (bar: string, delta: number) =>
  bar.replace(/v(\d+)/g, (_, v: string) => `v${Math.max(1, Math.min(127, Number(v) + delta))}`)
const blank = (count: number) => Array.from({ length: count }, () => '')
// 部分の中の from–to 小節（1始まり）だけを残す
const only = (bars: string[], from: number, to: number) => bars.map((bar, i) => (i + 1 >= from && i + 1 <= to ? bar : ''))

const melody = (s: SectionDraft) => s.bars.map((bar) => bar.melody)
const texture = (s: SectionDraft, kind: Texture, octaves = 0) =>
  s.bars.map((bar) => shift(chordPair(bar).map((c) => half(kind, c.v)).join(' '), octaves))
// 和音の中の1音（または2音）を半小節ずつ保持する
const pad = (s: SectionDraft, pick: (v: Voicing) => string, velocity: number) =>
  s.bars.map((bar) => {
    const [x, y] = chordPair(bar).map((c) => pick(c.v))
    return x === y ? `v${velocity} ${x}:6` : `v${velocity} ${x}:3 ${y}:3`
  })
// 構成案と同じ低音（前半＝根音、後半＝5度。2つの和音の小節はそれぞれの根音）
const bassLine = (s: SectionDraft, velocity: number, octaves = 0) =>
  s.bars.map((bar) => {
    const [x, y] = chordPair(bar)
    const notes = x === y ? `${x.bass[0]}:3 ${x.bass[1]}:3` : `${x.bass[0]}:3 ${y.bass[0]}:3`
    return `v${velocity} ${shift(notes, octaves)}`
  })
const rootHold = (s: SectionDraft, velocity: number, octaves = 0) =>
  s.bars.map((bar) => {
    const [x, y] = chordPair(bar).map((c) => shift(c.bass[0], octaves))
    return x === y ? `v${velocity} ${x}:6` : `v${velocity} ${x}:3 ${y}:3`
  })
// ハープ: 和音を下から1回ずつ転がして伸ばす（半小節ごと）
const rolled = (s: SectionDraft) =>
  s.bars.map((bar) => chordPair(bar).map(({ v: [a, b, c, d] }) => `${a}:.5 ${b}:.5 ${c}:.5 ${d}:1.5`).join(' '))
// ティンパニのロール（16分で強弱を変える）
const roll = (pitch: string, beats: number, from: number, to: number) => {
  const count = Math.round(beats / 0.25)
  return Array.from({ length: count }, (_, i) => `v${Math.round(from + ((to - from) * i) / (count - 1))} ${pitch}:.25`).join(' ')
}

const sectionA: SongSection = {
  id: 'A',
  label: 'A 主題（バイオリン、5小節目からフルートとホルン）',
  chords: A.bars.map((bar) => (typeof bar.chord === 'string' ? bar.chord : bar.chord.join(' '))),
  parts: {
    vn1: melody(A).map((bar) => dyn(bar, -4)),
    fl: [...blank(4), ...melody(A).slice(4).map((bar) => dyn(shift(bar, 1), -12))],
    hn: only(pad(A, (v) => `${v[0]}+${v[2]}`, 44), 5, 8),
    vn2: pad(A, (v) => v[3], 46),
    va: pad(A, (v) => v[1], 46),
    harp: texture(A, 'wave'),
    vc: bassLine(A, 58, 1),
    cb: bassLine(A, 64),
  },
}

const sectionB: SongSection = {
  id: 'B',
  label: 'B ト短調（チェロの歌とピチカート、13小節目からバイオリンとホルン）',
  chords: B.bars.map((bar) => (typeof bar.chord === 'string' ? bar.chord : bar.chord.join(' '))),
  parts: {
    vc: melody(B).map((bar) => shift(bar, -1)),
    vn1: only(melody(B).map((bar) => dyn(bar, -8)), 5, 8),
    pizz: texture(B, 'pulse'),
    hn: only(pad(B, (v) => `${v[1]}+${v[3]}`, 52), 5, 8),
    vn2: only(pad(B, (v) => v[3], 46), 5, 8),
    va: pad(B, (v) => v[1], 42),
    cb: bassLine(B, 66),
    timp: ['v56 G2:1.5 r:4.5', '', '', 'r:3 v62 D2:1.5 r:1.5', 'v58 G2:1.5 r:4.5', '', '', `r:3 ${roll('F2', 3, 36, 88)}`],
  },
}

const sectionA2: SongSection = {
  id: 'A2',
  label: 'A′ 山場（フルートとバイオリンの斉奏、ホルン、シンバル）',
  chords: A2.bars.map((bar) => (typeof bar.chord === 'string' ? bar.chord : bar.chord.join(' '))),
  parts: {
    fl: melody(A2).map((bar) => dyn(bar, 2)),
    vn1: melody(A2).map((bar) => dyn(bar, 2)),
    vn2: [...melody(A2).slice(0, 4).map((bar) => shift(bar, -1)), ...pad(A2, (v) => v[3], 50).slice(4)],
    va: pad(A2, (v) => v[1], 58),
    hn: [...pad(A2, (v) => `${v[0]}+${v[2]}`, 68).slice(0, 4), ...pad(A2, (v) => `${v[0]}+${v[2]}`, 54).slice(4)],
    harp: [...texture(A2, 'wave', 1).slice(0, 4), ...texture(A2, 'wave').slice(4)],
    vc: [...bassLine(A2, 72, 1).slice(0, 4), ...bassLine(A2, 60, 1).slice(4)],
    cb: [...bassLine(A2, 78).slice(0, 4), ...bassLine(A2, 66).slice(4)],
    timp: ['v94 Eb2:3 r:3', '', 'v74 G2:3 r:3', 'v68 C2:3 r:3', '', '', '', ''],
    perc: ['v76 bd+cym:6', '', 'v40 tri:6', '', '', '', '', ''],
  },
}

const sectionC: SongSection = {
  id: 'C',
  label: 'C 遠い鐘（ホルンの独奏からフルートへ、トライアングル）',
  chords: C.bars.map((bar) => (typeof bar.chord === 'string' ? bar.chord : bar.chord.join(' '))),
  parts: {
    hn: [...melody(C).slice(0, 4).map((bar) => dyn(shift(bar, -1), -6)), ...blank(4)],
    fl: [...blank(4), ...melody(C).slice(4).map((bar) => dyn(bar, -6))],
    vn1: [...blank(4), ...melody(C).slice(4).map((bar) => dyn(bar, -18))],
    vn2: pad(C, (v) => v[3], 40),
    va: pad(C, (v) => v[1], 40),
    harp: rolled(C),
    vc: rootHold(C, 48, 1),
    cb: rootHold(C, 52),
    perc: ['v34 tri:6', '', '', '', 'v30 tri:6', '', '', ''],
  },
}

const parts: SongPart[] = [
  { id: 'vn1', label: 'バイオリン I', instrument: 'violin', volume: 0.54, pan: -0.3, velocity: 82, gate: 0.95 },
  { id: 'fl', label: 'フルート', instrument: 'flute', volume: 0.5, pan: -0.12, velocity: 82, gate: 0.94 },
  { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.46, pan: -0.24, velocity: 62, gate: 0.97 },
  { id: 'vn2', label: 'バイオリン II', instrument: 'violin', volume: 0.36, pan: -0.16, velocity: 56, gate: 0.98 },
  { id: 'va', label: 'ビオラ', instrument: 'viola', volume: 0.4, pan: 0.12, velocity: 56, gate: 0.98 },
  { id: 'vc', label: 'チェロ', instrument: 'cello', volume: 0.52, pan: 0.22, velocity: 70, gate: 0.97 },
  { id: 'cb', label: 'コントラバス', instrument: 'contrabass', volume: 0.54, pan: 0.34, velocity: 70, gate: 0.95 },
  { id: 'pizz', label: 'ピチカート', instrument: 'pizzicato-section', volume: 0.44, pan: -0.2, velocity: 64, gate: 0.65 },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.46, pan: 0.26, velocity: 60, gate: 1.3 },
  { id: 'timp', label: 'ティンパニ', instrument: 'timpani', volume: 0.44, pan: 0, velocity: 70, gate: 0.95 },
  { id: 'perc', label: '打楽器', instrument: 'orchestra-kit', volume: 0.36, pan: 0, velocity: 60, gate: 1 },
]

const song: Song = {
  id: 'autumn-homeward-evening-bell-orchestral',
  title: '黄金の穂波 — 夕暮れの遠い鐘（管弦楽）',
  description:
    '変ホ長調 · ♩=120 · 12/8 · 32小節。構成案「夕暮れの遠い鐘」の並び・旋律・和声のまま管弦楽にした編曲。A はバイオリンの歌とハープの8分の波、5小節目からフルートとホルン。B はハープを止め、チェロが1オクターブ下でト短調の歌を受け持ち、ピチカートが付点4分を刻んで緊張を作る。16小節目のティンパニのクレッシェンドから、A′ はフルートとバイオリンの斉奏と1オクターブ上のハープで G6 の山場（シンバル）。C はホルンの独奏からフルートへ受け渡し、トライアングルを遠い鐘として静かに閉じる',
  tempo: 120,
  timeSignature: [12, 8],
  intro: [],
  loop: ['A', 'B', 'A2', 'C'],
  parts,
  sections: [sectionA, sectionB, sectionA2, sectionC],
}

export const eveningBellOrchestrations: CompositionStudy[] = [
  {
    song,
    melodyPart: 'vn1',
    hypothesis: song.description,
    phrases: [
      { label: 'A 主題', from: 1, to: 8, intention: 'バイオリンが主題を歌い、ハープが構成案の8分の波を受け持つ。5小節目から1オクターブ上のフルートとホルンの保持音で厚みを足す。' },
      { label: 'B ト短調の対比', from: 9, to: 16, intention: 'ハープを止め、チェロの歌とピチカートの付点4分に替えて色と緊張を変える。13小節目からバイオリンとホルンが加わり、16小節目のティンパニのロールで山場へ。' },
      { label: 'A′ 山場', from: 17, to: 24, intention: 'フルートとバイオリンの斉奏、第2バイオリンの1オクターブ下の重ね、ホルン、ハープ（1オクターブ上）で G6 を山場に。21小節目から楽器を保ったまま強弱を下げる。' },
      { label: 'C 遠い鐘', from: 25, to: 32, intention: 'ホルンの独奏（1オクターブ下）から29小節目でフルートへ受け渡す。弦は弱い保持音、ハープは和音を一度ずつ転がし、トライアングルを遠い鐘として置く。' },
    ],
    moments: [
      { bar: 9, beat: 0, pitches: ['G1', 'F3', 'Bb3'], intention: 'チェロが1オクターブ下で B を歌い出し、ピチカートが Gm9 を刻む' },
      { bar: 16, beat: 5.75, pitches: ['F2'], intention: 'ティンパニのロール（F2）が山場へ高まる' },
      { bar: 17, beat: 1.5, pitches: ['Ab1', 'Eb2', 'G6'], intention: '山場 G6（フルートとバイオリンの斉奏）とティンパニ' },
      { bar: 25, beat: 0, pitches: ['Ab1', 'C4'], intention: 'ホルンの独奏（1オクターブ下）' },
      { bar: 27, beat: 0, pitches: ['Ab1', 'Ab3', 'Cb4', 'Eb4'], intention: 'Abm6 の C♭ をホルンと弦で鳴らす' },
      { bar: 32, beat: 0, pitches: ['Eb2', 'Eb5'], intention: '主調の終止' },
    ],
  },
]
