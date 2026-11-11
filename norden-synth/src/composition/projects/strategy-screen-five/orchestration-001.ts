import type { Song, SongPart, SongSection } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { crystalMapStructures } from './structure-001.ts'

// 「水晶の地図 — 嬰ヘ短調の谷を登り、余韻で帰る」(screen5-struct-crystal-valley) の管弦楽編曲 01。
// 部分の並び（A 16 – B 8 – A′ 8 = 32小節）・旋律・和声・低音は構成案のまま。
// 和声は構成案の伴奏の小節から和音を読み取り、弦・ホルン・ハープ・ピチカートに配り直す（音は足さない）。
// 他プロジェクトでのユーザーの発言「オーケストラ感を大事に」「スティールドラムは…軽薄」「ベースがディスコテック」に従い、
// ポップスの打楽器と動くベースは使わない。
// 2案は楽器の割り当てと山場の作り方を変える（どちらも山場は構成案と同じ23小節目の E6）。
// - 硝子: フルートとハープで透明に始め、B はチェロの独奏。23小節目は弦・フルート・ホルン・ティンパニ・シンバル。
// - 行進: ピチカートが構成案の刻みをそのまま弾くリズミカルな版。B はホルンの独奏。29〜30小節目にもホルンの山を置く。

const structure = crystalMapStructures.find((s) => s.song.id === 'screen5-struct-crystal-valley')!
const source = structure.song.sections[0]
const CHORDS = source.chords
const MELODY = source.parts.melody
const HARMONY = source.parts.harmony
const BASS = source.parts.bass
const BARS = CHORDS.length
if (BARS !== 32) throw new Error('screen5-struct-crystal-valley must be 32 bars')

// ---------- 小節の加工 ----------

const shift = (bar: string, octaves: number) =>
  bar.replace(/([A-G][#b]?)(-?\d)/g, (_, p: string, o: string) => `${p}${Number(o) + octaves}`)

const dyn = (bar: string, delta: number) =>
  bar.replace(/v(\d+)/g, (_, v: string) => `v${Math.max(1, Math.min(127, Number(v) + delta))}`)

const duration = (text: string) => {
  const m = /^(\d+)\/(\d+)$/.exec(text)
  return m ? Number(m[1]) / Number(m[2]) : Number(text)
}

/** 伴奏の小節を打鍵の並びに読む。 */
const hits = (bar: string) => {
  let beat = 0
  let len = 1
  const out: { beat: number; notes: string[] }[] = []
  for (const token of bar.split(/\s+/).filter(Boolean)) {
    if (/^v\d+$/.test(token)) continue
    const [head, l] = token.split(':')
    if (l) len = duration(l)
    if (head !== 'r' && head !== '-') out.push({ beat, notes: head.split('+') })
    beat += len
  }
  return out
}

/** その拍で鳴っている（直前に打った）和音。拍頭が休みなら最初の和音。 */
const chordAt = (bar: string, beat: number) => {
  const list = hits(bar)
  return ([...list].reverse().find((h) => h.beat <= beat + 1e-6) ?? list[0]).notes
}

type Pick = (notes: string[]) => string[]
const top: Pick = (n) => [n[n.length - 1]]
const inner: Pick = (n) => n.slice(1, 3)
const lowFifth: Pick = (n) => [n[0], n[2]]
const all: Pick = (n) => n

/** 構成案の伴奏の和音を、全音符（2拍目で和音が変われば2分音符2つ）で保つ。 */
const hold = (i: number, pick: Pick, v: number, octaves = 0) => {
  const a = pick(chordAt(HARMONY[i], 0)).join('+')
  const b = pick(chordAt(HARMONY[i], 2)).join('+')
  return shift(a === b ? `v${v} ${a}:4` : `v${v} ${a}:2 v${v - 4} ${b}:2`, octaves)
}

/** 構成案の伴奏の和音を、8分で上下するハープの分散和音にする。 */
const arp = (i: number, v: number, octaves = 0) => {
  // 前半は下から上へ、後半は上の3音を往復する（4音の和音なら 0 1 2 3 | 2 1 2 3）。
  const up = (n: string[]) => [0, 1, 2, 3].map((k) => n[k % n.length])
  const a = up(chordAt(HARMONY[i], 0))
  const b = up(chordAt(HARMONY[i], 2))
  const seq = [...a, b[2], b[1], b[2], b[3]]
  return shift(seq.map((n, k) => `v${k % 4 === 0 ? v : v - 8} ${n}:.5`).join(' '), octaves)
}

/** 低音の根音（1拍目と3拍目）を保つ。 */
const rootHold = (i: number, v: number, octaves = 0) => {
  const a = chordAt(BASS[i], 0)[0]
  const b = chordAt(BASS[i], 2)[0]
  return shift(a === b ? `v${v} ${a}:4` : `v${v} ${a}:2 v${v - 4} ${b}:2`, octaves)
}

/** ティンパニのロール（16分）。 */
const roll = (pitch: string, beats: number, from: number, to: number) => {
  const count = Math.round(beats / 0.25)
  return Array.from({ length: count }, (_, k) => `v${Math.round(from + ((to - from) * k) / (count - 1))} ${pitch}:.25`).join(' ')
}

/** 32小節ぶんの声部を、[開始小節, 終了小節, 小節番号(0始まり) → 譜面] の範囲で書く。範囲外は休み。 */
type Span = [number, number, (i: number) => string]
const part = (...spans: Span[]) => {
  const bars = Array.from({ length: BARS }, () => '')
  for (const [from, to, write] of spans) for (let i = from - 1; i < to; i++) bars[i] = write(i)
  return bars
}
const at = (bar: number, text: string): Span => [bar, bar, () => text]

const melody = (delta = 0, octaves = 0) => (i: number) => shift(dyn(MELODY[i], delta), octaves)
const harmony = (delta = 0, octaves = 0) => (i: number) => shift(dyn(HARMONY[i], delta), octaves)
const bassLine = (v: number, octaves = 0) => (i: number) => shift(`v${v} ${BASS[i]}`, octaves)

// 32小節目: C6/G をハープで下から転がし、A5 の余韻の下に置く。
const ROLL_C6_G = 'v58 G2:.5 v50 E4:.5 G4:.5 A4:.5 v54 C5:2'

// ---------- 部分 ----------

const SECTIONS = [
  { id: 'A', from: 1, to: 16 },
  { id: 'B', from: 17, to: 24 },
  { id: 'A_prime', from: 25, to: 32 },
] as const

const split = (parts: Record<string, string[]>, labels: Record<(typeof SECTIONS)[number]['id'], string>): SongSection[] =>
  SECTIONS.map(({ id, from, to }) => ({
    id,
    label: labels[id],
    chords: CHORDS.slice(from - 1, to),
    parts: Object.fromEntries(Object.entries(parts).map(([k, bars]) => [k, bars.slice(from - 1, to)])),
  }))

const STRINGS: SongPart[] = [
  { id: 'vn1', label: 'バイオリン I', instrument: 'violin', volume: 0.54, pan: -0.3, velocity: 80, gate: 0.95 },
  { id: 'vn2', label: 'バイオリン II', instrument: 'violin', volume: 0.34, pan: -0.16, velocity: 56, gate: 0.98 },
  { id: 'va', label: 'ビオラ', instrument: 'viola', volume: 0.38, pan: 0.12, velocity: 56, gate: 0.98 },
  { id: 'vc', label: 'チェロ', instrument: 'cello', volume: 0.5, pan: 0.22, velocity: 70, gate: 0.96 },
  { id: 'cb', label: 'コントラバス', instrument: 'contrabass', volume: 0.5, pan: 0.32, velocity: 68, gate: 0.97 },
]

// ==========================================
// 案1: 硝子 — フルートとハープ、B はチェロの独奏
// ==========================================

// A 1〜4: フルートの独奏とハープの分散和音、ピチカートが低音のオクターブを弾く。1小節目にトライアングル。
// A 5〜12: 付点の応答はバイオリン I。ピチカートが構成案のシンコペーションの刻みを弾き、ビオラとコントラバスが保つ。
//          9小節目（短3度上）からフルートが同じ高さで重なり、ホルンとバイオリン II が加わる。
// A 13〜16: フルートとバイオリン I の斉奏、ハープが戻り、チェロが低音のオクターブを弓で弾く。
// B 17〜20: フルートとハープが抜け、チェロが1オクターブ下で嬰ヘ短調の歌を歌う。ピチカートが裏拍の和音、コントラバスが歩く。
// B 21〜24: バイオリン I が合流（チェロは1オクターブ下で重ねる）。ホルンが 3+3+2 の和音、22小節目後半からティンパニのロール。
//           23小節目の E6 にフルートが重なり、ティンパニとシンバル（全体の山場）。24小節目はハープが C#7 を駆け上がる。
// A′ 25〜30: バイオリン I とフルートの斉奏でフックが短調寄りの和声の上に戻る。ハープとピチカートの低音、ホルンが保つ。
// A′ 31〜32: フルートとバイオリン I が A5 を保ち、32小節目はハープが C6/G を転がし、トライアングルで余韻。
const glass: Record<string, string[]> = {
  fl: part(
    [1, 4, melody(-2)],
    [9, 16, melody(-6)],
    [23, 24, melody(-4)],
    [25, 28, melody(-6)],
    [31, 32, melody(-4)],
  ),
  vn1: part([5, 8, melody(-6)], [9, 16, melody(-2)], [21, 22, melody(-2)], [23, 24, melody(4)], [25, 30, melody(0)], [31, 32, melody(-14)]),
  vn2: part([9, 16, (i) => hold(i, top, 46)], [17, 20, (i) => hold(i, top, 36)], [21, 24, (i) => hold(i, top, 54)], [25, 32, (i) => hold(i, top, 44)]),
  va: part([5, 16, (i) => hold(i, inner, 46)], [21, 24, (i) => hold(i, inner, 56)], [25, 32, (i) => hold(i, inner, 46)]),
  vc: part(
    [13, 16, bassLine(58, 1)],
    [17, 20, melody(-6, -1)],
    [21, 24, melody(-4, -1)],
    [29, 30, bassLine(60, 1)],
  ),
  cb: part(
    [1, 4, (i) => rootHold(i, 50)],
    [5, 16, (i) => rootHold(i, 60)],
    [17, 24, bassLine(64)],
    [25, 32, (i) => rootHold(i, 60)],
  ),
  pizz: part(
    [1, 4, bassLine(66, 1)],
    [5, 12, harmony(4)],
    [17, 20, harmony(6)],
    [25, 28, bassLine(68, 1)],
  ),
  harp: part(
    [1, 4, (i) => arp(i, 62)],
    [13, 16, (i) => arp(i, 58)],
    at(24, arp(23, 66)),
    [25, 31, (i) => arp(i, 58)],
    at(32, ROLL_C6_G),
  ),
  hn: part(
    [9, 16, (i) => hold(i, lowFifth, 46)],
    [21, 24, harmony(-2)],
    [29, 30, (i) => hold(i, lowFifth, 62)],
    [31, 31, (i) => hold(i, lowFifth, 44)],
  ),
  timp: part(at(22, `r:2 ${roll('B1', 2, 40, 88)}`), at(23, 'v100 D2:2 r:2'), at(29, 'v70 B1:2 r:2')),
  perc: part(at(1, 'v38 tri:4'), at(23, 'v84 bd+cym:4'), at(32, 'r:1 v34 tri:3')),
}

const glassParts: SongPart[] = [
  { id: 'fl', label: 'フルート', instrument: 'flute', volume: 0.5, pan: -0.12, velocity: 80, gate: 0.94 },
  ...STRINGS,
  { id: 'pizz', label: 'ピチカート', instrument: 'pizzicato-section', volume: 0.42, pan: -0.2, velocity: 62, gate: 0.65 },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.44, pan: 0.26, velocity: 58, gate: 1.3 },
  { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.44, pan: -0.24, velocity: 60, gate: 0.97 },
  { id: 'timp', label: 'ティンパニ', instrument: 'timpani', volume: 0.42, pan: 0, velocity: 70, gate: 0.95 },
  { id: 'perc', label: '打楽器', instrument: 'orchestra-kit', volume: 0.34, pan: 0, velocity: 60, gate: 1 },
]

// ==========================================
// 案2: 行進 — ピチカートの刻み、B はホルンの独奏
// ==========================================

// A 1〜8: バイオリン I が主題、ピチカートが構成案の8分の刻み・シンコペーションをそのまま弾き、
//         チェロが低音のオクターブを弓で刻む。1小節目と5小節目の頭にティンパニ。
// A 9〜16: 短3度上の応答はフルートに渡し、バイオリン II とビオラが保つ。13小節目からバイオリン I が戻ってフルートと斉奏。
//          16小節目の主和音でハープが転がる。
// B 17〜20: ホルンの独奏（1オクターブ下）。ピチカートの裏拍とチェロ・コントラバスの歩く低音。
// B 21〜24: バイオリン I と II が斉奏で合流し、ホルンは1オクターブ下で重ねる。ビオラとチェロが 3+3+2 の和音を弓で刻む。
//           22小節目後半のロールから23小節目の E6 でティンパニとシンバル。24小節目はハープが C#7 を駆け上がる。
// A′ 25〜28: フックをバイオリン I とフルート、ピチカートが刻みを戻す。
// A′ 29〜30: ホルン全員が和音を強く保ち、ティンパニが打つ2つ目の山。
// A′ 31〜32: 刻みが止み、フルートの A5 とハープの C6/G、弦の保続で余韻。
const march: Record<string, string[]> = {
  vn1: part([1, 8, melody(-2)], [13, 16, melody(-2)], [21, 24, melody(2)], [25, 30, melody(0)], [31, 32, melody(-14)]),
  fl: part([9, 16, melody(-4)], [25, 28, melody(-8)], [31, 32, melody(-2)]),
  hn: part(
    [17, 20, melody(-4, -1)],
    [21, 24, melody(-6, -1)],
    [29, 30, (i) => hold(i, all, 66, -1)],
    [31, 32, (i) => hold(i, lowFifth, 42)],
  ),
  vn2: part([9, 16, (i) => hold(i, top, 46)], [21, 24, melody(-8)], [25, 32, (i) => hold(i, top, 44)]),
  va: part([9, 16, (i) => hold(i, inner, 46)], [21, 24, harmony(-4)], [25, 32, (i) => hold(i, inner, 46)]),
  vc: part(
    [1, 12, bassLine(56, 1)],
    [13, 16, bassLine(60, 1)],
    [17, 20, bassLine(56, 1)],
    [21, 24, (i) => hold(i, lowFifth, 58, -1)],
    [25, 30, bassLine(60, 1)],
  ),
  cb: part([1, 16, (i) => rootHold(i, 58)], [17, 24, bassLine(64)], [25, 32, (i) => rootHold(i, 60)]),
  pizz: part([1, 16, harmony(2)], [17, 20, harmony(8)], [25, 30, harmony(4)]),
  harp: part(at(16, 'v56 A2:.5 E4:.5 A4:.5 B4:.5 v52 C#5:2'), at(24, arp(23, 66)), at(32, ROLL_C6_G)),
  timp: part(
    at(1, 'v66 A1:1 r:3'),
    at(5, 'v60 B1:1 r:3'),
    at(13, 'v62 A1:1 r:3'),
    at(22, `r:2 ${roll('B1', 2, 40, 90)}`),
    at(23, 'v100 D2:2 r:2'),
    at(29, 'v84 B1:2 r:2'),
    at(30, 'v70 E2:1 r:1 v74 E2:1 r:1'),
  ),
  perc: part(at(1, 'v34 tri:4'), at(23, 'v84 bd+cym:4'), at(32, 'r:1 v32 tri:3')),
}

const marchParts: SongPart[] = [
  STRINGS[0],
  { id: 'fl', label: 'フルート', instrument: 'flute', volume: 0.48, pan: -0.12, velocity: 80, gate: 0.94 },
  { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.5, pan: -0.24, velocity: 70, gate: 0.97 },
  ...STRINGS.slice(1),
  { id: 'pizz', label: 'ピチカート', instrument: 'pizzicato-section', volume: 0.46, pan: -0.2, velocity: 64, gate: 0.6 },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.42, pan: 0.26, velocity: 58, gate: 1.3 },
  { id: 'timp', label: 'ティンパニ', instrument: 'timpani', volume: 0.42, pan: 0, velocity: 70, gate: 0.95 },
  { id: 'perc', label: '打楽器', instrument: 'orchestra-kit', volume: 0.34, pan: 0, velocity: 60, gate: 1 },
]

// ==========================================
// 組み立て
// ==========================================

const PHRASES = (a: string, b: string, c: string): CompositionStudy['phrases'] => [
  { label: 'A 主題', from: 1, to: 16, intention: a },
  { label: 'B 嬰ヘ短調の谷', from: 17, to: 24, intention: b },
  { label: 'A′ 谷からの再現', from: 25, to: 32, intention: c },
]

const songOf = (id: string, title: string, description: string, parts: SongPart[], bars: Record<string, string[]>,
  labels: Record<(typeof SECTIONS)[number]['id'], string>): Song => ({
  id, title, description, tempo: structure.song.tempo, timeSignature: [4, 4], intro: [],
  loop: SECTIONS.map((s) => s.id), parts, sections: split(bars, labels),
})

const glassSong = songOf(
  'screen5-orch-crystal-valley-glass',
  '水晶の地図 — 管弦楽／硝子',
  'イ長調 · ♩=116 · 4/4 · 32小節。構成案「嬰ヘ短調の谷を登り、余韻で帰る」の並び・旋律・和声のまま。A はフルートの独奏とハープの分散和音で始め、付点の応答はバイオリン、短3度上からフルートが重なる。B はチェロが1オクターブ下で嬰ヘ短調の歌を歌い、21小節目からバイオリンとホルン、23小節目の E6 でティンパニとシンバルの山場。A′ はバイオリンとフルートでフックを戻し、最後は A5 の下でハープが C6/G を転がしてトライアングルで余韻',
  glassParts,
  glass,
  {
    A: 'A 主題（フルートとハープ、5小節目からバイオリン、9小節目からフルートとホルンが重なる）',
    B: 'B 嬰ヘ短調の谷（チェロの独奏、21小節目からバイオリンとホルン、23小節目の山場）',
    A_prime: 'A′ 谷からの再現（バイオリンとフルートの斉奏、ハープの C6/G で余韻）',
  },
)

const marchSong = songOf(
  'screen5-orch-crystal-valley-march',
  '水晶の地図 — 管弦楽／行進',
  'イ長調 · ♩=116 · 4/4 · 32小節。構成案「嬰ヘ短調の谷を登り、余韻で帰る」の並び・旋律・和声のまま。A はバイオリンの主題の下でピチカートが構成案の刻みをそのまま弾き、チェロが低音のオクターブを刻む。短3度上の応答はフルート。B はホルンの独奏で嬰ヘ短調の歌、21小節目からバイオリンの斉奏とビオラ・チェロの 3+3+2、23小節目の E6 でティンパニとシンバル。A′ は刻みを戻し、29〜30小節目にホルンとティンパニの2つ目の山。最後は刻みを止め、フルートの A5 とハープの C6/G で余韻',
  marchParts,
  march,
  {
    A: 'A 主題（バイオリンとピチカートの刻み、9小節目からフルート）',
    B: 'B 嬰ヘ短調の谷（ホルンの独奏、21小節目からバイオリンの斉奏、23小節目の山場）',
    A_prime: 'A′ 谷からの再現（ピチカートの刻み、29小節目のホルン、ハープの C6/G で余韻）',
  },
)

export const crystalValleyOrchestrations: CompositionStudy[] = [
  {
    song: glassSong,
    melodyPart: 'vn1',
    hypothesis: glassSong.description,
    phrases: PHRASES(
      'フルートとハープの透明な響きでフックを出し、付点の応答をバイオリンへ。短3度上からフルートとホルンを重ねて厚くする',
      'チェロの独奏で低く始め、21小節目からバイオリンとホルンを足して23小節目の E6 に向けて厚くする',
      'フックを斉奏で戻し、29小節目のホルンで2つ目の小さな山。最後は A5 と C6/G の余韻',
    ),
    moments: [
      { bar: 1, beat: 0, pitches: ['A2', 'E4', 'C#6'], intention: 'フルートのフック、ハープの A(add9)、ピチカートの低音' },
      { bar: 17, beat: 0, pitches: ['F#1', 'C#4'], intention: 'チェロが1オクターブ下で B の歌を始める' },
      { bar: 23, beat: 2, pitches: ['D2', 'F#4', 'E6'], intention: '山場の E6（フルートとバイオリン、ティンパニの D2）' },
      { bar: 32, beat: 2, pitches: ['G2', 'C5', 'A5'], intention: 'A5 の余韻の下でハープの C6/G' },
    ],
  },
  {
    song: marchSong,
    melodyPart: 'vn1',
    hypothesis: marchSong.description,
    phrases: PHRASES(
      'ピチカートが構成案の刻みを弾き、リズミカルにフックを出す。短3度上の応答はフルートに渡す',
      'ホルンの独奏で低く始め、21小節目からバイオリンの斉奏と 3+3+2 の刻みで23小節目の E6 へ',
      '刻みを戻してフックを再現し、29〜30小節目のホルンとティンパニで2つ目の山。最後は刻みを止めて余韻',
    ),
    moments: [
      { bar: 1, beat: 0, pitches: ['A1', 'E4', 'C#6'], intention: 'バイオリンのフックとピチカートの A(add9)、ティンパニの A1' },
      { bar: 17, beat: 0, pitches: ['F#1', 'C#4'], intention: 'ホルンが1オクターブ下で B の歌を始める' },
      { bar: 23, beat: 2, pitches: ['D2', 'E6'], intention: '山場の E6（ティンパニの D2）' },
      { bar: 29, beat: 0, pitches: ['B1', 'D3', 'D6'], intention: 'ホルンの Bm7 と D6、2つ目の山' },
      { bar: 32, beat: 2, pitches: ['G2', 'C5', 'A5'], intention: 'A5 の余韻の下でハープの C6/G' },
    ],
  },
]
