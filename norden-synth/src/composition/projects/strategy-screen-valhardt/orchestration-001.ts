import type { Song, SongPart, SongSection } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { greyThroneStructures } from './structure-001.ts'

// 「ロ短調の霧を越えて、高音域の再現へ（A–B–A′）」(valhardt-struct-bminor-arch) の管弦楽編曲 01。
// 部分の並び（A 16 – B 8 – A′ 8 = 32小節）・旋律・和声・低音は構成案のまま。
// 12/8（1小節 = 6拍、♩=126）。
// 2案で楽器の割り当てと山場の描き方を変える:
// - 銀鷲の紋章: フルートとハープで透明に始め、B はチェロの独奏。27小節目の D6 で弦・フルート・ホルン・ティンパニ・シンバルの山場。
// - 北方軍団の哨戒: バイオリン I とピチカートの刻みで始め、B はホルンの独奏。27小節目と29小節目で重厚な余韻を作る。

const structure = greyThroneStructures.find((s) => s.song.id === 'valhardt-struct-bminor-arch')!
const source = structure.song.sections[0]
const CHORDS = source.chords
const MELODY = source.parts.melody
const HARMONY = source.parts.harmony
const BASS = source.parts.bass
const BARS = CHORDS.length
if (BARS !== 32) throw new Error('valhardt-struct-bminor-arch must be 32 bars')

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

/** 12/8（6拍）: 構成案の伴奏の和音を、付点全音符（後半で変われば付点2分音符2つ）で保つ。 */
const hold = (i: number, pick: Pick, v: number, octaves = 0) => {
  const a = pick(chordAt(HARMONY[i], 0)).join('+')
  const b = pick(chordAt(HARMONY[i], 3)).join('+')
  return shift(a === b ? `v${v} ${a}:6` : `v${v} ${a}:3 v${v - 4} ${b}:3`, octaves)
}

/** 12/8（6拍）: 低音の根音（0拍目と3拍目）を保つ。 */
const rootHold = (i: number, v: number, octaves = 0) => {
  const a = chordAt(BASS[i], 0)[0]
  const b = chordAt(BASS[i], 3)[0]
  return shift(a === b ? `v${v} ${a}:6` : `v${v} ${a}:3 v${v - 4} ${b}:3`, octaves)
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

// 32小節目: D(add9) をハープで下から転がし、D5 の余韻の下に置く（合計6拍）。
const ROLL_D_ADD9 = 'v56 D3:.5 v48 A3:.5 D4:.5 E4:.5 F#4:.5 A4:.5 v52 D5:3'

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
// 案1: 銀鷲の紋章 — フルートとハープで始め、B はチェロ独奏
// ==========================================

const silverBanner: Record<string, string[]> = {
  fl: part([1, 4, melody(-2)], [9, 16, melody(-6)], [25, 28, melody(-2)], [31, 32, melody(-6)]),
  vn1: part([5, 8, melody(-4)], [9, 16, melody(-2)], [21, 24, melody(0)], [25, 30, melody(2)], [31, 32, melody(-8)]),
  vn2: part([5, 16, (i) => hold(i, top, 44)], [17, 20, (i) => hold(i, top, 36)], [21, 24, (i) => hold(i, top, 52)], [25, 30, (i) => hold(i, top, 48)]),
  va: part([5, 16, (i) => hold(i, inner, 46)], [17, 20, (i) => hold(i, inner, 38)], [21, 24, (i) => hold(i, inner, 54)], [25, 30, (i) => hold(i, inner, 48)]),
  vc: part(
    [13, 16, bassLine(60, 1)],
    [17, 20, melody(-4, -1)],
    [21, 24, melody(-2, -1)],
    [25, 30, bassLine(62, 1)],
  ),
  cb: part(
    [1, 4, (i) => rootHold(i, 50)],
    [5, 16, (i) => rootHold(i, 60)],
    [17, 24, bassLine(64)],
    [25, 32, (i) => rootHold(i, 58)],
  ),
  pizz: part([1, 4, bassLine(64, 1)], [25, 26, bassLine(66, 1)]),
  harp: part([1, 4, harmony(4)], [13, 16, harmony(2)], [25, 28, harmony(4)], at(32, ROLL_D_ADD9)),
  hn: part(
    [9, 16, (i) => hold(i, lowFifth, 46)],
    [21, 24, (i) => hold(i, lowFifth, 54)],
    [25, 30, (i) => hold(i, lowFifth, 58)],
    [31, 31, (i) => hold(i, lowFifth, 42)],
  ),
  timp: part(at(26, `r:3 ${roll('A1', 3, 38, 86)}`), at(27, 'v96 G1:3 r:3')),
  perc: part(at(1, 'v38 tri:6'), at(27, 'v78 bd+cym:6'), at(32, 'r:1.5 v34 tri:4.5')),
}

const silverBannerParts: SongPart[] = [
  { id: 'fl', label: 'フルート', instrument: 'flute', volume: 0.5, pan: -0.12, velocity: 80, gate: 0.94 },
  ...STRINGS,
  { id: 'pizz', label: 'ピチカート', instrument: 'pizzicato-section', volume: 0.42, pan: -0.2, velocity: 62, gate: 0.65 },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.44, pan: 0.26, velocity: 58, gate: 1.3 },
  { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.44, pan: -0.24, velocity: 60, gate: 0.97 },
  { id: 'timp', label: 'ティンパニ', instrument: 'timpani', volume: 0.42, pan: 0, velocity: 70, gate: 0.95 },
  { id: 'perc', label: '打楽器', instrument: 'orchestra-kit', volume: 0.34, pan: 0, velocity: 60, gate: 1 },
]

// ==========================================
// 案2: 北方軍団の哨戒 — 弦とピチカートで始め、B はホルンの独奏
// ==========================================

const northernWatch: Record<string, string[]> = {
  vn1: part([1, 8, melody(-2)], [13, 16, melody(-2)], [21, 24, melody(0)], [25, 30, melody(2)], [31, 32, melody(-8)]),
  fl: part([9, 16, melody(-4)], [25, 28, melody(-4)], [31, 32, melody(-4)]),
  hn: part(
    [17, 20, melody(-2, -1)],
    [21, 24, melody(-4, -1)],
    [25, 30, (i) => hold(i, lowFifth, 58)],
    [31, 31, (i) => hold(i, lowFifth, 44)],
  ),
  vn2: part([9, 16, (i) => hold(i, top, 46)], [21, 24, (i) => hold(i, top, 52)], [25, 30, (i) => hold(i, top, 48)]),
  va: part([9, 16, (i) => hold(i, inner, 46)], [21, 24, (i) => hold(i, inner, 54)], [25, 30, (i) => hold(i, inner, 48)]),
  vc: part([1, 8, bassLine(62, 1)], [13, 16, bassLine(60, 1)], [21, 24, (i) => hold(i, lowFifth, 50)], [25, 30, bassLine(62, 1)]),
  cb: part([1, 16, (i) => rootHold(i, 60)], [17, 24, bassLine(64)], [25, 32, (i) => rootHold(i, 60)]),
  pizz: part([1, 8, harmony(4)], [17, 20, harmony(8)], [25, 28, harmony(4)]),
  harp: part([9, 16, harmony(2)], at(32, ROLL_D_ADD9)),
  timp: part(at(1, 'v70 D2:3 r:3'), at(5, 'v66 D2:3 r:3'), at(26, `r:3 ${roll('A1', 3, 40, 88)}`), at(27, 'v96 G1:3 r:3')),
  perc: part(at(27, 'v76 bd+cym:6'), at(32, 'r:1.5 v34 tri:4.5')),
}

const northernWatchParts: SongPart[] = [
  { id: 'vn1', label: 'バイオリン I', instrument: 'violin', volume: 0.54, pan: -0.3, velocity: 80, gate: 0.95 },
  { id: 'fl', label: 'フルート', instrument: 'flute', volume: 0.5, pan: -0.12, velocity: 80, gate: 0.94 },
  { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.48, pan: -0.22, velocity: 68, gate: 0.97 },
  { id: 'vn2', label: 'バイオリン II', instrument: 'violin', volume: 0.34, pan: -0.16, velocity: 56, gate: 0.98 },
  { id: 'va', label: 'ビオラ', instrument: 'viola', volume: 0.38, pan: 0.12, velocity: 56, gate: 0.98 },
  { id: 'vc', label: 'チェロ', instrument: 'cello', volume: 0.5, pan: 0.22, velocity: 70, gate: 0.96 },
  { id: 'cb', label: 'コントラバス', instrument: 'contrabass', volume: 0.5, pan: 0.32, velocity: 68, gate: 0.97 },
  { id: 'pizz', label: 'ピチカート', instrument: 'pizzicato-section', volume: 0.42, pan: -0.2, velocity: 62, gate: 0.65 },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.44, pan: 0.26, velocity: 58, gate: 1.3 },
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
    tempo: 126,
    timeSignature: [12, 8],
    intro: [],
    loop: ['A', 'B', 'A_prime'],
    parts,
    sections: split(bars, sectionLabels),
  }
  return {
    song,
    melodyPart,
    hypothesis: description,
    phrases: [
      { label: 'A 主題', from: 1, to: 16, intention: sectionLabels.A },
      { label: 'B 対比（ロ短調の霧）', from: 17, to: 24, intention: sectionLabels.B },
      { label: 'A′ 再現と山場', from: 25, to: 32, intention: sectionLabels.A_prime },
    ],
    moments,
  }
}

export const greyThroneOrchestrations: CompositionStudy[] = [
  orchestrate(
    'valhardt-orch-silver-banner',
    '灰座への敬礼 — 銀鷲の紋章（弦とハープ、チェロ独奏）',
    'ニ長調 · ♩=126 · 12/8 · 32小節。構成案「ロ短調の霧を越えて、高音域の再現へ」をそのまま管弦楽化。A はフルートとハープ・ピチカートで透明に始め、5小節目から弦、9小節目（ヘ長調）からホルンを重ねる。B はチェロの独奏がロ短調の霧を歌い、21小節目からバイオリン I が合流。A′ の27小節目（D6）でティンパニとシンバルの山場を迎え、最後はハープの D(add9) とトライアングルで静かに閉じる',
    'vn1',
    silverBannerParts,
    silverBanner,
    {
      A: 'フルートとハープの透明な響きでフックを出し、5小節目から弦、9小節目のヘ長調からホルンを重ねて厚くする',
      B: 'チェロの独奏で1オクターブ下からロ短調の歌を始め、21小節目からバイオリン I とホルンを足して A′ へ渡す',
      A_prime: 'フルートとバイオリン I の斉奏で戻り、27小節目の D6 でティンパニとシンバルの山場。最後はハープとトライアングルで余韻',
    },
    [
      { bar: 1, beat: 0, pitches: ['D2', 'D4', 'F#4', 'A5'], intention: 'フルートのフック、ハープの D(add9)、ピチカートの低音' },
      { bar: 17, beat: 0, pitches: ['B1', 'D4', 'F#3'], intention: 'チェロが1オクターブ下でロ短調の B を歌い始める' },
      { bar: 27, beat: 0, pitches: ['G1', 'F#3', 'D6'], intention: '27小節目の山場 D6（フルート・バイオリン I・ティンパニ・シンバル）' },
      { bar: 32, beat: 3, pitches: ['D2', 'D5'], intention: 'ハープの余韻と D5 の終止' },
    ],
  ),
  orchestrate(
    'valhardt-orch-northern-watch',
    '灰座への敬礼 — 北方軍団の哨戒（ピチカートとホルン独奏）',
    'ニ長調 · ♩=126 · 12/8 · 32小節。構成案の並び・旋律・和声のまま、A はバイオリン I の主題の下でピチカートが12/8の分散和音を刻み、9小節目（ヘ長調）はフルートへ渡す。B はホルン独奏がロ短調を厳かに歌い、21小節目から弦が合流。A′ は27小節目の D6 で全奏の山場を作り、ハープの D(add9) で余韻を残す',
    'vn1',
    northernWatchParts,
    northernWatch,
    {
      A: 'バイオリン I とピチカートの刻みでリズミカルに始め、9小節目のヘ長調はフルートとハープへ渡す',
      B: 'ホルンの独奏とピチカートの裏打ちでロ短調を厳かに歌い、21小節目からバイオリンとビオラが合流する',
      A_prime: 'ピチカートとフルート・バイオリン I が戻り、27小節目の D6 でティンパニとシンバルの山場。最後はハープの余韻',
    },
    [
      { bar: 1, beat: 0, pitches: ['D2', 'F#3', 'A5'], intention: 'バイオリン I のフックとピチカートの刻み、ティンパニの D2' },
      { bar: 17, beat: 0, pitches: ['B1', 'F#3', 'D4'], intention: 'ホルン独奏がロ短調の B を歌い始める' },
      { bar: 27, beat: 0, pitches: ['G1', 'F#3', 'D6'], intention: '27小節目の山場 D6（ティンパニとシンバル）' },
      { bar: 32, beat: 3, pitches: ['D2', 'D5'], intention: 'ハープの余韻と D5 の終止' },
    ],
  ),
]
