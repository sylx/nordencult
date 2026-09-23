// リードのメロディ。
//
// 音をひとつずつ確率で選ぶのではなく、小節ごとに音型を決めて、その小節の和音に当てはめる。
//   アルペジオ   和音の音を決まった形でなぞる
//   走句         音階を一方向に駆ける。アルペジオの跳躍のあとは逆向きに埋める
//   クリシェ     和音の上で 1 本の線が半音 (西洋の旋法) か音階で順に動く、長い音の旋律
//   分散クリシェ クリシェの線を強拍に置き、間を線の下の和音の音で埋める (無伴奏チェロ組曲のような 2 声)
// 句 (4 か 2 小節) は音型の並びと最後の終止の小節からなる。セクションは A (半終止) A' (全終止) B A' のように並べ、
// A と A' は同じ音型 (同じリズムと形) なので、和音が違っても問いと答えに聞こえる。
// 最初の A は主題として、拍子が同じならあとのセクションでも再現する。

import { chordAt, type BarContext, type ChordSpan, type NoteWriter } from './context.ts'
import { chordPitchClasses, type Chord } from './harmony.ts'
import type { Random } from './random.ts'
import { isMicrotonal, type Key } from './scales.ts'

interface Onset {
  beat: number
  length: number
  // アルペジオと走句では拍のまとまりの頭。クリシェでは線の音 (それ以外は埋める音)
  strong: boolean
  rest: boolean
  // クリシェの線の音を、進めずに弾き直す
  hold?: boolean
}

interface Note extends Onset {
  key: number
}

type Kind = 'arpeggio' | 'run' | 'cliche' | 'broken'

interface Figure {
  kind: Kind
  rhythm: Onset[]
  dir: 1 | -1
  // アルペジオ: 最初の音から和音の音をいくつ進むか。分散クリシェ: 線から下へ何番目の和音の音で埋めるか
  shape: number[]
}

interface Plan {
  // 終止の小節を除く各小節の音型
  figures: Figure[]
  // 句の頭を休んで弱起にする
  pickup: boolean
  // 作ったときの拍のまとまりと句の長さ (主題を再現できるか)
  meter: string
}

type Role = 'A' | 'A2' | 'B'

const KIND_LABELS: Record<Kind, string> = { arpeggio: 'アルペジオ', run: '走句', cliche: 'クリシェ', broken: '分散クリシェ' }
const ROLE_LABELS: Record<Role, string> = { A: 'A', A2: "A'", B: 'B' }

// 表示用の、ある小節のメロディの状態
export interface MelodyInfo {
  // 句の役割 (A / A' / B)
  role: string
  // 主題の句か
  theme: boolean
  // 句の各小節の音型 (最後は終止)
  figures: string[]
  // 句の中の何小節目か
  bar: number
  // 向きや終止の種類など
  detail: string
}

const PLANS_4: Kind[][] = [
  ['arpeggio', 'arpeggio', 'run'],
  ['arpeggio', 'run', 'arpeggio'],
  ['broken', 'broken', 'run'],
  ['broken', 'broken', 'arpeggio'],
  ['cliche', 'cliche', 'arpeggio'],
  ['cliche', 'cliche', 'run'],
  ['arpeggio', 'arpeggio', 'broken'],
]
const PLANS_2: Kind[][] = [['arpeggio'], ['run'], ['broken'], ['cliche']]

// どれも最後の音が最初の音の隣なので、音が多くて一周しても跳ばない
const ARPEGGIO_SHAPES = [
  [0, 1, 2, 3, 2, 3, 2, 1],
  [0, 1, 2, 3, 2, 1],
  [0, 2, 1, 3, 2, 4, 3, 1],
  [0, 1, 0, 2, 1, 3, 2, 1],
  [0, -1, 0, 1, 2, 1],
]
const BROKEN_SHAPES = [
  [1, 2],
  [2, 1],
  [1, 2, 3, 2],
  [2, 1, 3, 1],
]

// 2 つ / 3 つの 8 分音符のまとまりを埋める音価 (8 分音符単位)
const FILL: Record<number, number[][]> = {
  2: [[2], [1, 1], [1.5, 0.5], [0.5, 0.5, 1], [1, 0.5, 0.5]],
  3: [[3], [2, 1], [1, 2], [1, 1, 1], [1, 0.5, 0.5, 1]],
}

// 終止の前の回音 (目標からの度数の差)。近づく音の数ごと
const TURNS: Record<number, number[]> = {
  1: [1],
  2: [1, -1],
  3: [0, 1, -1],
  4: [0, 1, 0, -1],
}

const EPS = 1e-6
const pcOf = (k: number) => ((k % 12) + 12) % 12
const samePc = (a: number, b: number) => Math.abs(pcOf(a) - pcOf(b)) < EPS

// 密度に応じた音価で拍のまとまりを埋める
function groupRhythm(groups: { start: number; length: number }[], density: number, rng: Random): Onset[] {
  const onsets: Onset[] = []
  const wanted = 0.8 + density * 1.2
  groups.forEach((g, gi) => {
    const eighths = Math.round(g.length * 2)
    const options = FILL[eighths] ?? [[eighths]]
    const fill = rng.weighted(options, (o) => Math.exp(-((o.length - wanted) ** 2) / 2))
    let t = g.start
    fill.forEach((e, i) => {
      const length = e / 2
      const prev = onsets[onsets.length - 1]
      // 疎なときは前の音を伸ばしてまとまりをつなぐ
      if (gi > 0 && i === 0 && prev && rng.chance((1 - density) * 0.35)) prev.length += length
      else onsets.push({ beat: t, length, strong: i === 0, rest: onsets.length > 0 && rng.chance((1 - density) * 0.15) })
      t += length
    })
  })
  return onsets
}

// 線が 1 歩進む位置 (拍)。4 拍以上の小節は真ん中に最も近いまとまりの頭でも進む
function stepPoints(ctx: BarContext): number[] {
  const starts = ctx.groups.map((g) => g.start).filter((t) => t > 0)
  if (ctx.beats < 4 || starts.length === 0) return [0]
  const mid = ctx.beats / 2
  return [0, starts.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a))]
}

function figureRhythm(kind: Kind, ctx: BarContext, rng: Random): Onset[] {
  const density = ctx.params.melodyDensity
  const note = (beat: number, length: number, strong: boolean): Onset => ({ beat, length, strong, rest: false })
  switch (kind) {
    case 'arpeggio': {
      const onsets = groupRhythm(ctx.groups, density, rng)
      // ときどき最後のまとまりを 1 つの音にして、たどり着いた感じを出す
      const lastStart = ctx.groups[ctx.groups.length - 1].start
      const tail = onsets.findIndex((o) => o.beat >= lastStart - EPS)
      if (tail > 0 && rng.chance(0.7)) {
        onsets.splice(tail + 1)
        onsets[tail].length = ctx.beats - onsets[tail].beat
        onsets[tail].rest = false
      }
      return onsets
    }
    case 'run': {
      // 頭の音で溜めてから、後ろのまとまりを等しい音価で駆ける
      const unit = density > 0.65 ? 0.25 : 0.5
      const cap = unit < 0.5 ? 8 : 6
      let from = ctx.groups.length
      let count = 0
      while (from > 1) {
        const n = Math.round(ctx.groups[from - 1].length / unit)
        if (count + n > cap) break
        count += n
        from--
      }
      const runStart = ctx.groups[from]?.start ?? ctx.beats
      const onsets = [note(0, runStart, true)]
      for (const g of ctx.groups.slice(from)) {
        for (let t = g.start; t < g.start + g.length - EPS; t += unit) onsets.push(note(t, unit, t === g.start))
      }
      return onsets
    }
    case 'cliche': {
      const points = [...stepPoints(ctx), ctx.beats]
      return points.slice(0, -1).map((t, i) => note(t, points[i + 1] - t, true))
    }
    case 'broken': {
      // 拍のまとまりの頭では線の音を弾き直す (まとまりの中に埋める音があるときだけ)
      const unit = density < 0.3 ? 1 : 0.5
      const heads = ctx.groups.filter((g) => g.length > unit + EPS).map((g) => g.start)
      const points = [...stepPoints(ctx), ctx.beats]
      const onsets: Onset[] = []
      points.slice(0, -1).forEach((t0, i) => {
        const end = points[i + 1]
        for (let t = t0; t < end - EPS; t += unit) {
          const hold = t > t0 && heads.some((h) => Math.abs(h - t) < EPS)
          onsets.push({ ...note(t, Math.min(unit, end - t), t === t0 || hold), hold })
        }
      })
      return onsets
    }
  }
}

function kindWeight(kind: Kind, density: number, energy: number): number {
  switch (kind) {
    case 'arpeggio':
      return 1
    case 'run':
      return 0.3 + density
    case 'broken':
      return 0.4 + density * 0.8
    case 'cliche':
      return Math.max(0.1, 1.4 - density - energy * 0.4)
  }
}

// n 個の句を A A' B A' … と並べる。最後は全終止の A' で閉じる
function formOf(n: number): Role[] {
  if (n === 1) return ['A2']
  if (n === 3) return ['A', 'B', 'A2']
  const cycle: Role[] = ['A', 'A2', 'B', 'A2']
  return [...Array(n).keys()].map((i) => cycle[i % 4])
}

export class Lead {
  // 最後に作った小節の音符 (対旋律がオクターブで重ねるのに使う)
  lastBar: { beat: number; key: number; velocity: number; duration: number }[] = []
  // 最後に作った小節のメロディの状態 (休みなら undefined)
  info?: MelodyInfo
  // 音域。伴奏セットで受け持つ楽器が変わると変わる
  private lo = 0
  private hi = 0
  // 音域内のスケール音
  private keys: number[] = []
  // 最後に鳴らした (休符なら鳴らすはずだった) 音
  private pos = 0
  private section = -1
  private phraseBars = 4
  private form: Role[] = []
  private planA?: Plan
  private planB?: Plan
  private theme?: Plan
  // 同じ音型が続いたときに反復進行にするための、前の小節の最初の音
  private prevStart?: { kind: Kind; key: number; dir: 1 | -1 }
  // クリシェの線
  private line?: { start: number; sign: 1 | -1; offset: number; dir: 1 | -1; max: number; chromatic: boolean }

  generate(ctx: BarContext, out: NoteWriter, rng: Random, lo: number, hi: number): void {
    const s = ctx.section
    if (lo !== this.lo || hi !== this.hi) this.setRange(ctx, lo, hi)
    if (s.index !== this.section) this.startSection(ctx, rng)
    const phrase = Math.floor(ctx.barInSection / this.phraseBars)
    const bar = ctx.barInSection % this.phraseBars
    this.lastBar = []
    this.info = undefined

    // 最初のセクションの最初の句と、静かなセクションの奇数番目の句は休む
    if ((s.index === 0 && phrase === 0) || (s.energy < 0.3 && phrase % 2 === 1)) {
      this.line = undefined
      this.prevStart = undefined
      return
    }

    const role = this.form[phrase] ?? 'A2'
    const plan = (role === 'B' ? this.planB : this.planA)!
    if (bar === 0) this.startPhrase()

    let notes: Note[]
    let detail: string
    if (bar === this.phraseBars - 1) {
      notes = this.cadence(ctx, plan, role === 'A2')
      detail = role === 'A2' ? '全終止 (主音へ)' : '半終止'
      this.line = undefined
      this.prevStart = undefined
    } else {
      const fig = plan.figures[bar]
      const seq = this.prevStart?.kind === fig.kind ? this.prevStart : undefined
      const anchor = seq?.key ?? this.pos
      if (fig.kind !== 'cliche' && fig.kind !== 'broken') this.line = undefined
      let dir = fig.dir
      if (fig.kind === 'arpeggio') ({ notes, dir } = this.arpeggio(ctx, fig, anchor, seq?.dir))
      else notes = fig.kind === 'run' ? this.run(ctx, fig, anchor) : this.cliche(ctx, fig, anchor)
      if (bar === 0 && plan.pickup) notes[0].rest = true
      this.prevStart = { kind: fig.kind, key: notes[0].key, dir }
      const arrow = (d: number) => (d > 0 ? '上行' : '下行')
      detail =
        fig.kind === 'arpeggio' ? `${arrow(dir)}${seq ? '・反復進行' : ''}`
        : fig.kind === 'run' ? arrow(notes[notes.length - 1].key - notes[0].key)
        : this.line ? `${this.line.chromatic ? '半音' : '音階'}で${arrow(this.line.sign)}` : ''
      if (bar === 0 && plan.pickup) detail += detail ? '・弱起' : '弱起'
    }
    this.info = {
      role: ROLE_LABELS[role],
      theme: plan === this.theme,
      figures: [...plan.figures.map((f) => KIND_LABELS[f.kind]), '終止'],
      bar,
      detail,
    }

    const velBase = 60 + s.energy * 32
    notes.forEach((n, i) => {
      if (n.rest) return
      const final = bar === this.phraseBars - 1 && i === notes.length - 1
      // 強拍と高い音を少し強く、句の終わりは抜く
      const vel = velBase + (n.strong ? 6 : -3) + (n.key - 64) * 0.4 - (final ? 5 : 0)
      const legato = final ? 0.9 : plan.figures[bar]?.kind === 'arpeggio' ? 0.92 : 0.97
      this.emit(ctx, out, rng, n, vel, legato)
    })
    this.pos = notes[notes.length - 1].key
    this.lastBar = out.notes.slice()
  }

  // 楽器が変わったら音域を移す。最初は真ん中から、以降は句の頭でオクターブを直して続ける
  private setRange(ctx: BarContext, lo: number, hi: number): void {
    if (this.keys.length === 0) this.pos = (lo + hi) / 2
    this.lo = lo
    this.hi = hi
    this.keys = ctx.section.key.keysInRange(lo, hi)
    this.line = undefined
    this.prevStart = undefined
  }

  private startSection(ctx: BarContext, rng: Random): void {
    const s = ctx.section
    this.section = s.index
    this.keys = s.key.keysInRange(this.lo, this.hi)
    this.phraseBars = s.bars >= 8 ? 4 : 2
    this.form = formOf(Math.ceil(s.bars / this.phraseBars))
    this.line = undefined
    this.prevStart = undefined
    const meter = `${ctx.groups.map((g) => g.length).join('+')}/${this.phraseBars}`
    this.planA = this.theme?.meter === meter && rng.chance(0.5) ? this.theme : this.makePlan(ctx, meter, rng)
    this.planB = this.makePlan(ctx, meter, rng)
    this.theme ??= this.planA
  }

  private makePlan(ctx: BarContext, meter: string, rng: Random): Plan {
    const density = ctx.params.melodyDensity
    const plans = this.phraseBars === 4 ? PLANS_4 : PLANS_2
    const kinds = rng.weighted(plans, (p) => p.reduce((w, k) => w + kindWeight(k, density, ctx.section.energy), 0) / p.length)
    // 同じ音型は同じリズムと形を使い回す (反復・反復進行になる)
    const made = new Map<Kind, Figure>()
    const figures = kinds.map((kind, i) => {
      let fig = made.get(kind)
      if (!fig) {
        const dir = kind === 'arpeggio' ? (rng.chance(0.65) ? 1 : -1) : rng.chance(0.65) ? -1 : 1
        const shapes = kind === 'broken' ? BROKEN_SHAPES : ARPEGGIO_SHAPES
        fig = { kind, rhythm: figureRhythm(kind, ctx, rng), dir, shape: rng.pick(shapes) }
        made.set(kind, fig)
      }
      // アルペジオの跳躍のあとの走句は逆向きに埋める
      const arp = made.get('arpeggio')
      if (kind === 'run' && i > 0 && kinds[i - 1] === 'arpeggio' && arp) fig = { ...fig, dir: arp.dir === 1 ? -1 : 1 }
      return fig
    })
    // 弱起は線の音を隠さないよう、アルペジオと走句だけ
    const first = figures[0].rhythm
    const pickup = (kinds[0] === 'arpeggio' || kinds[0] === 'run') && first.length >= 3 && first[0].length <= 1 && rng.chance(0.3)
    return { figures, pickup, meter }
  }

  // 句の頭で、音域の端に寄っていたらオクターブ単位で戻す (楽器が変わって音域が大きくずれたときも)
  private startPhrase(): void {
    const mid = (this.lo + this.hi) / 2
    while (this.pos > mid + 8) this.pos -= 12
    while (this.pos < mid - 8) this.pos += 12
    this.line = undefined
    this.prevStart = undefined
  }

  // seqDir: 前の小節も同じアルペジオなら、その向き (反復進行にする)
  private arpeggio(ctx: BarContext, fig: Figure, anchor: number, seqDir?: 1 | -1): { notes: Note[]; dir: 1 | -1 } {
    const key = ctx.section.key
    const tones0 = this.chordTones(key, ctx.chords[0].chord)
    let start = seqDir ? nearestIndex(tones0, anchor) : this.startIndex(tones0, anchor, -fig.dir)
    const reach = Math.max(...fig.shape)
    const fits = (s: number, d: number) => s + d * reach >= 0 && s + d * reach < tones0.length
    // 形が音域の真ん中寄りに収まる向きにする
    const mid = (this.lo + this.hi) / 2
    const off = (d: number) => Math.abs((tones0[start] + tones0[reflect(start + d * reach, tones0.length)]) / 2 - mid)
    let dir = seqDir ?? (off(-fig.dir) + 2 < off(fig.dir) ? (fig.dir === 1 ? -1 : 1) : fig.dir)
    // 和音が変わっていなければ同じ小節の繰り返しにならないよう、和音の音 1 つぶんずらす (前の音に近い側へ)
    if (seqDir && !ctx.chords[0].isNew) {
      const shifted = [start + dir, start - dir].filter((i) => i >= 0 && i < tones0.length && fits(i, dir))
      if (shifted.length > 0) start = shifted.reduce((a, b) => (Math.abs(tones0[b] - this.pos) < Math.abs(tones0[a] - this.pos) ? b : a))
    }
    if (!fits(start, dir) && fits(start, -dir)) dir = dir === 1 ? -1 : 1
    const notes = fig.rhythm.map((o, i) => {
      // 小節の途中で和音が変わったら、最初の音に最も近い音から数える
      const tones = this.chordTones(key, chordAt(ctx, o.beat).chord)
      const base = nearestIndex(tones, tones0[start])
      return { ...o, key: tones[reflect(base + dir * fig.shape[i % fig.shape.length], tones.length)] }
    })
    return { notes, dir }
  }

  // 小節頭の音: anchor に最も近い和音の音。前の音と同じ音は避け、同じ近さなら side の側
  private startIndex(tones: number[], anchor: number, side: number): number {
    let best = -1
    tones.forEach((k, i) => {
      if (Math.abs(k - this.pos) < EPS && tones.length > 1) return
      const d = Math.abs(k - anchor) - (Math.sign(k - anchor) === side ? 0.1 : 0)
      if (best < 0 || d < Math.abs(tones[best] - anchor) - (Math.sign(tones[best] - anchor) === side ? 0.1 : 0)) best = i
    })
    return Math.max(0, best)
  }

  // 音域の真ん中から離れる向きなら、戻る向きに変える
  private steer(dir: 1 | -1, from: number): 1 | -1 {
    const mid = (this.lo + this.hi) / 2
    if (dir < 0 && from < mid - 5) return 1
    if (dir > 0 && from > mid + 5) return -1
    return dir
  }

  private run(ctx: BarContext, fig: Figure, anchor: number): Note[] {
    const tones = this.chordTones(ctx.section.key, ctx.chords[0].chord)
    const start = this.indexOf(tones[this.startIndex(tones, anchor, -fig.dir)])
    const reach = fig.rhythm.length - 1
    const end = start + fig.dir * reach
    const dir = end >= 0 && end < this.keys.length ? fig.dir : -fig.dir
    return fig.rhythm.map((o, i) => ({ ...o, key: this.keys[reflect(start + dir * i, this.keys.length)] }))
  }

  // クリシェと分散クリシェ。線は句の中で小節をまたいで続く
  private cliche(ctx: BarContext, fig: Figure, anchor: number): Note[] {
    const key = ctx.section.key
    let fill = 0
    return fig.rhythm.map((o) => {
      const span = chordAt(ctx, o.beat)
      if (o.hold) return { ...o, key: this.lineKey(this.line!) }
      if (o.strong) {
        fill = 0
        const newChord = span.isNew && Math.abs(o.beat - span.start) < EPS
        if (!this.line) this.line = this.startLine(ctx, span, this.steer(fig.dir, anchor), anchor, false)
        else if (newChord) {
          // 和音が変わったら、線の次の音に近い新しい和音の音から続ける
          const next = this.lineKey(this.advance({ ...this.line }))
          this.line = this.startLine(ctx, span, this.line.sign, next, true)
        } else this.line = this.advance(this.line)
        return { ...o, key: this.lineKey(this.line) }
      }
      // 線の下 (音域の下端で音が足りなければ上) 1 オクターブ以内を和音の音で埋める。
      // 半音で動く線とぶつからないよう、線から半音以内の音は使わない
      const lineKey = this.lineKey(this.line!)
      const tones = this.chordTones(key, span.chord)
      const around = (side: number) =>
        tones
          .filter((k) => (k - lineKey) * side > 1.5 && Math.abs(k - lineKey) <= 12 + EPS)
          .sort((a, b) => Math.abs(a - lineKey) - Math.abs(b - lineKey))
      const below = around(-1)
      const above = around(1)
      const pool = below.length >= 2 || below.length >= above.length ? below : above
      const nth = fig.shape[fill++ % fig.shape.length]
      return { ...o, key: pool.length > 0 ? pool[(nth - 1) % pool.length] : lineKey }
    })
  }

  // 線の起点。下りは根音、上りは 5 度 (和音の最後の音) から (anyTone なら音階で動く線は和音のどの音からでも)。
  // 和音が 2 小節以上続き、西洋の旋法なら半音で動く (8 → 7 → ♭7 → 6、5 → ♯5 → 6 → ♯5)
  private startLine(ctx: BarContext, span: ChordSpan, dir: 1 | -1, near: number, anyTone: boolean) {
    const key = ctx.section.key
    const pcs = chordPitchClasses(key, span.chord)
    const chromatic = !isMicrotonal(key.scale) && key.scale.exotic <= 0.45 && span.length >= 2 * ctx.beats - EPS
    const tones = this.chordTones(key, span.chord)
    const pick = (d: 1 | -1) => {
      const max = chromatic ? (d < 0 ? 3 : 2) : 3
      const fits = (k: number) =>
        chromatic ? k + d * max >= this.lo && k + d * max <= this.hi : this.inKeys(this.indexOf(k) + d * max)
      const target = d < 0 ? pcs[0] : pcs[pcs.length - 1]
      const candidates = tones.filter((k) => (anyTone && !chromatic ? true : samePc(k, target)) && fits(k))
      if (candidates.length === 0) return undefined
      const start = candidates[nearestIndex(candidates, near)]
      return { start, sign: d, offset: 0, dir: 1 as const, max, chromatic }
    }
    return pick(dir) ?? pick(dir === 1 ? -1 : 1) ?? { start: tones[nearestIndex(tones, near)], sign: dir, offset: 0, dir: 1 as const, max: 0, chromatic: false }
  }

  // 線を 1 歩進める。端まで来たら折り返す
  private advance(line: NonNullable<Lead['line']>): NonNullable<Lead['line']> {
    if (line.max === 0) return line
    let dir = line.dir
    if (line.offset + dir > line.max || line.offset + dir < 0) dir = dir === 1 ? -1 : 1
    return { ...line, dir, offset: line.offset + dir }
  }

  private lineKey(line: NonNullable<Lead['line']>): number {
    if (line.chromatic) return line.start + line.sign * line.offset
    return this.keys[reflect(this.indexOf(line.start) + line.sign * line.offset, this.keys.length)]
  }

  // 終止: 最初の音型の前半のリズムで目標の音へ近づき、伸ばす。
  // 近づき方は上からの順次下行・下からの順次上行・回音のうち、前の音から自然につながるもの。
  // 全終止は主音 (和音になければ根音)、半終止は根音以外の和音の音
  private cadence(ctx: BarContext, plan: Plan, closed: boolean): Note[] {
    const key = ctx.section.key
    const onsets = this.cadenceRhythm(ctx, plan.figures[0].rhythm)
    const chord = chordAt(ctx, onsets[onsets.length - 1].beat).chord
    const pcs = chordPitchClasses(key, chord)
    const goal = closed ? (pcs.some((pc) => samePc(pc, key.tonic)) ? key.tonic : pcs[0]) : undefined
    const tones = this.chordTones(key, chord)
    const ok = tones.filter((k) => (goal !== undefined ? samePc(k, goal) : !samePc(k, pcs[0])))
    const candidates = ok.length > 0 ? ok : tones
    const target = candidates[nearestIndex(candidates, this.pos)]
    const t = this.indexOf(target)
    const k = onsets.length - 1
    // 目標からの度数の差。末尾が目標の隣
    const desc = [...Array(k).keys()].map((i) => k - i)
    const paths = [
      { offsets: desc, bias: 0 },
      { offsets: desc.map((d) => -d), bias: 1.5 },
      { offsets: TURNS[k] ?? desc, bias: 1 },
    ].filter((p) => p.offsets.every((d) => this.inKeys(t + d)))
    const cost = (p: { offsets: number[]; bias: number }) => (k === 0 ? 0 : Math.abs(this.keys[t + p.offsets[0]] - this.pos)) + p.bias
    const best = paths.reduce<(typeof paths)[number] | undefined>((a, b) => (!a || cost(b) < cost(a) ? b : a), undefined)
    const offsets = best?.offsets ?? desc
    return onsets.map((o, i) => ({ ...o, key: i === k ? target : this.keys[reflect(t + offsets[i], this.keys.length)] }))
  }

  // リズムの前半 (4 音まで) だけ使い、残りを 1 つの長い音にする
  private cadenceRhythm(ctx: BarContext, rhythm: Onset[]): Onset[] {
    const half = ctx.beats / 2
    const head = rhythm.filter((o, i) => i === 0 || o.beat < half).slice(0, 4).map((o) => ({ ...o, rest: false }))
    const lastHead = head[head.length - 1]
    const tailGroup = ctx.groups.find((g) => g.start >= lastHead.beat + lastHead.length - EPS)
    if (tailGroup) {
      lastHead.length = tailGroup.start - lastHead.beat
      head.push({ beat: tailGroup.start, length: ctx.beats - tailGroup.start, strong: true, rest: false })
    } else {
      lastHead.length = ctx.beats - lastHead.beat
    }
    return head
  }

  // 装飾音を付けて書き込む。装飾は強拍の音だけ
  private emit(ctx: BarContext, out: NoteWriter, rng: Random, n: Note, vel: number, legato: number): void {
    const { beat, length, key } = n
    const above = this.keys.find((k) => k > key + EPS)
    const neighbor = above ?? this.keys[this.keys.length - 2] ?? key
    const o = n.strong ? ctx.params.ornaments : 0
    const r = rng.next()
    if (length >= 0.5 && r < o * 0.22) {
      // 前打音 (上の隣の音から)
      const g = 0.1
      out.note(beat, neighbor, vel - 12, g)
      out.note(beat + g, key, vel, length * legato - g)
    } else if (length >= 1 && r < o * 0.38) {
      // モルデント
      const g = 0.125
      out.note(beat, key, vel, g)
      out.note(beat + g, neighbor, vel - 10, g)
      out.note(beat + 2 * g, key, vel - 4, length * legato - 2 * g)
    } else if (length >= 2 && r < o * 0.5) {
      // トリル (前半だけ) のあと伸ばす
      const g = 0.125
      const count = Math.floor((length * 0.6) / g)
      for (let i = 0; i < count; i++) out.note(beat + i * g, i % 2 === 0 ? key : neighbor, vel - (i % 2) * 8, g)
      out.note(beat + count * g, key, vel - 4, length * legato - count * g)
    } else {
      out.note(beat, key, vel, length * legato)
    }
  }

  // 音域内の和音の音 (昇順)
  private chordTones(key: Key, chord: Chord): number[] {
    const pcs = chordPitchClasses(key, chord)
    return this.keys.filter((k) => pcs.some((pc) => samePc(pc, k)))
  }

  // スケール音の添字。スケール外の音 (クリシェの半音) なら最も近いもの
  private indexOf(k: number): number {
    return nearestIndex(this.keys, k)
  }

  private inKeys(i: number): boolean {
    return i >= 0 && i < this.keys.length
  }
}

// 昇順とは限らない list で、k に最も近い要素の添字
function nearestIndex(list: number[], k: number): number {
  let best = 0
  list.forEach((v, i) => {
    if (Math.abs(v - k) < Math.abs(list[best] - k)) best = i
  })
  return best
}

// 添字を 0..length-1 に折り返す
function reflect(i: number, length: number): number {
  const max = length - 1
  if (max <= 0) return 0
  if (i < 0) i = -i
  if (i > max) i = 2 * max - i
  return Math.max(0, Math.min(max, i))
}
