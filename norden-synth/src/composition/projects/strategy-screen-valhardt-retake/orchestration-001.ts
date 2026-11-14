import type { Song, SongPart, SongSection } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { northernHomeModalStructures02 } from './structure-002.ts'

// 「ト長調〜ロ短調の陰影から、半音下の変ホ長調へ飛ぶ（A–B–C–A′）」(valhardt2-struct2-eb-mirage) の管弦楽編曲 01。
// 部分の並び（A 16 – B 6 – C 6 – A′ 4 = 32小節）・旋律・和声・低音は構成案のまま。
// 4/4（1小節 = 4拍、♩=128）。
// 2案で楽器の割り当てと山場・ループのつながりを描き分ける:
// - 銀鷲の行進: 木管（フルート）とピチカートで軽やかに始め、B はハープと弦で陰影を描き、C（変ホ長調）でホルンと全弦が花開く。
// - 北方軍団の遠望: バイオリン I とピチカートの刻みで勇ましく始め、B はチェロ独奏で歌い、C でホルンと木管が重なる。

const structure = northernHomeModalStructures02.find((s) => s.song.id === 'valhardt2-struct2-eb-mirage')!
const source = structure.song.sections[0]
const CHORDS = source.chords
const MELODY = source.parts.melody
const HARMONY = source.parts.harmony
const BASS = source.parts.bass
const BARS = CHORDS.length
if (BARS !== 32) throw new Error('valhardt2-struct2-eb-mirage must be 32 bars')

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

/** その拍で鳴っている和音（分散和音の場合はその拍から2拍以内の構成音をまとめる）。 */
const chordAt = (bar: string, beat: number) => {
  const list = hits(bar)
  const hit = [...list].reverse().find((h) => h.beat <= beat + 1e-6) ?? list[0]
  if (hit.notes.length > 1) return hit.notes
  const seen = new Set<string>()
  for (const h of list) {
    if (h.beat >= beat - 1e-6 && h.beat < beat + 2 - 1e-6) {
      for (const n of h.notes) seen.add(n)
    }
  }
  return seen.size > 1 ? [...seen] : hit.notes
}

type Pick = (notes: string[]) => string[]
const top: Pick = (n) => [n[n.length - 1]]
const inner: Pick = (n) => n.slice(1, 3)
const lowFifth: Pick = (n) => [n[0], n[Math.min(2, n.length - 1)]]

/** 4/4（4拍）: 構成案の伴奏の和音を、全音符（後半で変われば2分音符2つ）で保つ。 */
const hold = (i: number, pick: Pick, v: number, octaves = 0) => {
  const a = pick(chordAt(HARMONY[i], 0)).join('+')
  const b = pick(chordAt(HARMONY[i], 2)).join('+')
  return shift(a === b ? `v${v} ${a}:4` : `v${v} ${a}:2 v${v - 4} ${b}:2`, octaves)
}

/** 4/4（4拍）: 低音の根音（0拍目と2拍目）を保つ。 */
const rootHold = (i: number, v: number, octaves = 0) => {
  const a = chordAt(BASS[i], 0)[0]
  const b = chordAt(BASS[i], 2)[0]
  return shift(a === b ? `v${v} ${a}:4` : `v${v} ${a}:2 v${v - 4} ${b}:2`, octaves)
}

/** ティンパニのロール（16分音符連打）。 */
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

// 32小節目: Em(add9) をハープで下から転がし、ループ頭への橋渡しを作る（合計4拍）。
const ROLL_EM_ADD9 = 'v54 E3:.5 v46 B3:.5 E4:.5 F#4:.5 G4:.5 B4:.5 v50 E5:1'

// ---------- 部分 ----------

const SECTIONS = [
  { id: 'A', from: 1, to: 16 },
  { id: 'B', from: 17, to: 22 },
  { id: 'C', from: 23, to: 28 },
  { id: 'A_prime', from: 29, to: 32 },
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
  { id: 'cb', label: 'コントラバス', contrabass: true, instrument: 'contrabass', volume: 0.5, pan: 0.32, velocity: 68, gate: 0.97 } as SongPart,
]

// ==========================================
// 案1: 銀鷲の行進 — 木管とピチカートで始め、C（変ホ長調）でホルンと弦が花開く
// ==========================================

const silverMarch: Record<string, string[]> = {
  fl: part([1, 4, melody(-2)], [9, 16, melody(-4)], [23, 27, melody(-2)], [29, 32, melody(-4)]),
  vn1: part([5, 16, melody(-2)], [17, 22, melody(-4)], [23, 28, melody(0)], [29, 32, melody(-4)]),
  vn2: part([5, 16, (i) => hold(i, top, 44)], [17, 22, (i) => hold(i, top, 38)], [23, 27, (i) => hold(i, top, 50)], [29, 31, (i) => hold(i, top, 40)]),
  va: part([5, 16, (i) => hold(i, inner, 46)], [17, 22, (i) => hold(i, inner, 40)], [23, 28, (i) => hold(i, inner, 52)], [29, 31, (i) => hold(i, inner, 42)]),
  vc: part(
    [9, 16, bassLine(60, 1)],
    [17, 22, (i) => rootHold(i, 52, 1)],
    [23, 27, bassLine(64, 1)],
    [29, 32, (i) => rootHold(i, 54, 1)],
  ),
  cb: part(
    [1, 4, (i) => rootHold(i, 50)],
    [5, 16, (i) => rootHold(i, 60)],
    [17, 22, (i) => rootHold(i, 54)],
    [23, 28, (i) => rootHold(i, 64)],
    [29, 32, (i) => rootHold(i, 56)],
  ),
  pizz: part([1, 8, harmony(4)], [29, 31, harmony(0)]),
  harp: part([1, 4, bassLine(60, 1)], [17, 22, harmony(2)], at(32, ROLL_EM_ADD9)),
  hn: part(
    [5, 8, (i) => hold(i, lowFifth, 44)],
    [9, 16, (i) => hold(i, lowFifth, 52)],
    [23, 27, (i) => hold(i, lowFifth, 58)],
    [28, 28, (i) => hold(i, lowFifth, 44)],
  ),
  timp: part(
    at(1, 'v64 E2:2 r:2'),
    at(9, 'v72 A1:2 r:2'),
    at(22, `r:2 ${roll('Bb1', 2, 36, 78)}`),
    at(23, 'v92 Eb2:2 r:2'),
    at(28, `r:2 ${roll('B1', 2, 34, 72)}`),
    at(29, 'v74 E2:2 r:2'),
  ),
  perc: part(at(1, 'v34 tri:4'), at(23, 'v72 bd+cym:4'), at(32, 'r:1 v32 tri:3')),
}

const silverMarchParts: SongPart[] = [
  { id: 'fl', label: 'フルート', instrument: 'flute', volume: 0.5, pan: -0.12, velocity: 80, gate: 0.94 },
  ...STRINGS,
  { id: 'pizz', label: 'ピチカート', instrument: 'pizzicato-section', volume: 0.42, pan: -0.2, velocity: 62, gate: 0.65 },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.44, pan: 0.26, velocity: 58, gate: 1.3 },
  { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.44, pan: -0.24, velocity: 60, gate: 0.97 },
  { id: 'timp', label: 'ティンパニ', instrument: 'timpani', volume: 0.42, pan: 0, velocity: 70, gate: 0.95 },
  { id: 'perc', label: '打楽器', instrument: 'orchestra-kit', volume: 0.34, pan: 0, velocity: 60, gate: 1 },
]

// ==========================================
// 案2: 北方軍団の遠望 — 弦とピチカートで始め、B はチェロ独奏、C はホルンと木管が重なる
// ==========================================

const northernVista: Record<string, string[]> = {
  vn1: part([1, 16, melody(-2)], [21, 22, melody(-2)], [23, 28, melody(2)], [29, 32, melody(-6)]),
  fl: part([9, 16, melody(-4)], [23, 27, melody(-2)], [29, 32, melody(-4)]),
  vc: part(
    [1, 8, bassLine(60, 1)],
    [9, 16, bassLine(62, 1)],
    [17, 20, melody(-4, -1)],
    [21, 22, (i) => hold(i, lowFifth, 50)],
    [23, 27, bassLine(64, 1)],
    [29, 32, (i) => rootHold(i, 54, 1)],
  ),
  vn2: part([5, 16, (i) => hold(i, top, 46)], [21, 22, (i) => hold(i, top, 44)], [23, 27, (i) => hold(i, top, 52)], [29, 31, (i) => hold(i, top, 40)]),
  va: part([5, 16, (i) => hold(i, inner, 46)], [17, 22, (i) => hold(i, inner, 40)], [23, 28, (i) => hold(i, inner, 52)], [29, 31, (i) => hold(i, inner, 42)]),
  cb: part([1, 16, (i) => rootHold(i, 60)], [17, 22, bassLine(56)], [23, 28, (i) => rootHold(i, 64)], [29, 32, (i) => rootHold(i, 56)]),
  pizz: part([1, 8, harmony(4)], [29, 31, harmony(0)]),
  harp: part([17, 22, harmony(4)], at(32, ROLL_EM_ADD9)),
  hn: part(
    [5, 8, (i) => hold(i, lowFifth, 46)],
    [9, 16, (i) => hold(i, lowFifth, 54)],
    [23, 27, (i) => hold(i, lowFifth, 60)],
    [28, 28, (i) => hold(i, lowFifth, 46)],
  ),
  timp: part(
    at(1, 'v68 E2:2 r:2'),
    at(5, 'v64 E2:2 r:2'),
    at(22, `r:2 ${roll('Bb1', 2, 38, 82)}`),
    at(23, 'v94 Eb2:2 r:2'),
    at(28, `r:2 ${roll('B1', 2, 36, 74)}`),
    at(29, 'v74 E2:2 r:2'),
  ),
  perc: part(at(23, 'v74 bd+cym:4'), at(32, 'r:1 v34 tri:3')),
}

const northernVistaParts: SongPart[] = [
  { id: 'vn1', label: 'バイオリン I', instrument: 'violin', volume: 0.54, pan: -0.3, velocity: 80, gate: 0.95 },
  { id: 'fl', label: 'フルート', instrument: 'flute', volume: 0.5, pan: -0.12, velocity: 80, gate: 0.94 },
  { id: 'vc', label: 'チェロ', instrument: 'cello', volume: 0.52, pan: 0.22, velocity: 72, gate: 0.96 },
  { id: 'vn2', label: 'バイオリン II', instrument: 'violin', volume: 0.34, pan: -0.16, velocity: 56, gate: 0.98 },
  { id: 'va', label: 'ビオラ', instrument: 'viola', volume: 0.38, pan: 0.12, velocity: 56, gate: 0.98 },
  { id: 'cb', label: 'コントラバス', instrument: 'contrabass', volume: 0.5, pan: 0.32, velocity: 68, gate: 0.97 },
  { id: 'pizz', label: 'ピチカート', instrument: 'pizzicato-section', volume: 0.42, pan: -0.2, velocity: 62, gate: 0.65 },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.44, pan: 0.26, velocity: 58, gate: 1.3 },
  { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.46, pan: -0.22, velocity: 64, gate: 0.97 },
  { id: 'timp', label: 'ティンパニ', instrument: 'timpani', volume: 0.42, pan: 0, velocity: 70, gate: 0.95 },
  { id: 'perc', label: '打楽器', instrument: 'orchestra-kit', volume: 0.34, pan: 0, velocity: 60, gate: 1 },
]

// ---------- 編曲版の組み立て ----------

const orchestrate = (
  id: string,
  title: string,
  description: string,
  melodyPart: string,
  parts: SongPart[],
  bars: Record<string, string[]>,
  sectionLabels: Record<(typeof SECTIONS)[number]['id'], string>,
  moments: CompositionStudy['moments'],
): CompositionStudy => {
  const song: Song = {
    id,
    title,
    description,
    tempo: 128,
    timeSignature: [4, 4],
    intro: [],
    loop: ['A', 'B', 'C', 'A_prime'],
    parts,
    sections: split(bars, sectionLabels),
  }
  return {
    song,
    melodyPart,
    hypothesis: description,
    phrases: [
      { label: 'A 主題', from: 1, to: 16, intention: sectionLabels.A },
      { label: 'B 対比（ト長調〜ロ短調）', from: 17, to: 22, intention: sectionLabels.B },
      { label: 'C 転調（変ホ長調の遠望）', from: 23, to: 28, intention: sectionLabels.C },
      { label: 'A′ 帰着', from: 29, to: 32, intention: sectionLabels.A_prime },
    ],
    moments,
  }
}

export const ebMirageOrchestrations: CompositionStudy[] = [
  orchestrate(
    'valhardt2-orch-silver-march',
    '銀鷲の行進（木管とピチカートから変ホ長調の全奏へ）',
    'ホ短調 · ♩=128 · 4/4 · 32小節。構成案「ト長調〜ロ短調の陰影から、半音下の変ホ長調へ飛ぶ」の管弦楽編曲。A はフルートとピチカート・ハープで軽やかに始め、5小節目（Fmaj7 の陰り）から弦とホルンを重ねる。B は弦とハープで陰影を描き、22小節目のティンパニ・ロールから C（変ホ長調）でホルン・全弦・シンバルが花開く。A′ の32小節目はハープの Em(add9) アルペジオでループ頭へ自然につなぐ',
    'vn1',
    silverMarchParts,
    silverMarch,
    {
      A: 'フルートとピチカートで軽やかに始め、5小節目の Fmaj7 から弦とホルンを重ねて厚くする',
      B: 'ハープの分散和音に乗せてバイオリン I が陰影を歌い、22小節目の Bbadd9 で転調を仕掛ける',
      C: '変ホ長調でホルン・全弦・フルート・シンバルの山場を作り、28小節目の Bsus4 で静めて引き戻す',
      A_prime: 'フルートとバイオリン I の斉奏で落ち着き、32小節目のハープとトライアングルでループ頭へつなぐ',
    },
    [
      { bar: 1, beat: 0, pitches: ['E2', 'G3', 'B4'], intention: 'フルートのフック、ピチカートとコントラバスの軽やかな開始' },
      { bar: 17, beat: 0, pitches: ['G1', 'G3', 'A5'], intention: 'B 部のト長調へ移り、ハープと弦で陰影を描く' },
      { bar: 23, beat: 0, pitches: ['Eb2', 'G3', 'G5'], intention: '変ホ長調 C 部の開始（ホルン・全弦・ティンパニ・シンバル）' },
      { bar: 32, beat: 0, pitches: ['E2', 'E5'], intention: 'ハープの Em(add9) とトライアングルでループ頭へつなぐ' },
    ],
  ),
  orchestrate(
    'valhardt2-orch-northern-vista',
    '北方軍団の遠望（弦とチェロ独奏から変ホ長調の合奏へ）',
    'ホ短調 · ♩=128 · 4/4 · 32小節。構成案のまま、A はバイオリン I とピチカートの刻みで勇ましく始め、5小節目からホルンを重ねる。B（17〜20小節）はチェロ独奏が1オクターブ下で歌い、21小節目からバイオリン I が合流して変ホ長調の C へ渡す。C はホルンと木管・全弦の合奏で山場を作り、A′ はハープの余韻でループを閉じる',
    'vn1',
    northernVistaParts,
    northernVista,
    {
      A: 'バイオリン I とピチカートの刻みで勇ましく始め、5小節目からホルン、9小節目からフルートを重ねる',
      B: 'チェロ独奏とハープでト長調〜ロ短調の陰りを歌い、21小節目からバイオリン I が合流する',
      C: '22小節目のロールから変ホ長調へ飛び、ホルン・フルート・全弦で切なく美しい頂点を作る',
      A_prime: 'フルートとバイオリン I の静かな斉奏とハープの Em(add9) でループを閉じる',
    },
    [
      { bar: 1, beat: 0, pitches: ['E2', 'G3', 'B4'], intention: 'バイオリン I とピチカートの刻み、ティンパニの E2' },
      { bar: 17, beat: 0, pitches: ['G1', 'B3', 'A4'], intention: 'チェロ独奏が1オクターブ下で B 部を歌い始める' },
      { bar: 23, beat: 0, pitches: ['Eb2', 'G3', 'G5'], intention: '変ホ長調 C 部の全奏（ティンパニとシンバル）' },
      { bar: 32, beat: 0, pitches: ['E2', 'E5'], intention: 'ハープの Em(add9) でループ頭へ戻る' },
    ],
  ),
]
