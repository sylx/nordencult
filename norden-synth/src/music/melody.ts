// リードのメロディ。
//
// セクションの頭で 1 小節の動機を 2 つ (A, B) 作り、句 (2 か 4 小節) ごとに交互に使う。
// 4 小節の句は「動機 → 変形 → 移高 → 終止」、2 小節の句は「動機 → 終止」。
// 音程はスケール上の度数で動かし、強拍は和音の音 (ときどき特性音) に寄せる。

import { chordAt, type BarContext, type NoteWriter } from './context.ts'
import { chordPitchClasses, type Chord } from './harmony.ts'
import type { Random } from './random.ts'
import type { Key } from './scales.ts'

interface Onset {
  beat: number
  length: number
  strong: boolean
  rest: boolean
}

interface Motif {
  rhythm: Onset[]
  // 前の音からの度数の差 (先頭は 0)
  contour: number[]
}

// 2 つ / 3 つの 8 分音符のまとまりを埋める音価 (8 分音符単位)
const FILL: Record<number, number[][]> = {
  2: [[2], [1, 1], [1.5, 0.5], [0.5, 0.5, 1], [1, 0.5, 0.5]],
  3: [[3], [2, 1], [1, 2], [1, 1, 1], [1, 0.5, 0.5, 1]],
}

export function makeRhythm(groups: { start: number; length: number }[], density: number, rng: Random): Onset[] {
  const onsets: Onset[] = []
  const wanted = 1 + density * 2.5
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
      else onsets.push({ beat: t, length, strong: i === 0, rest: onsets.length > 0 && rng.chance((1 - density) * 0.2) })
      t += length
    })
  })
  return onsets
}

function makeMotif(ctx: BarContext, rng: Random): Motif {
  const rhythm = makeRhythm(ctx.groups, ctx.params.melodyDensity, rng)
  const steps = [-3, -2, -1, 0, 1, 2, 3]
  const weights = [0.3, 1, 2.5, 0.6, 2.5, 1, 0.3]
  const contour = rhythm.map((_, i) => (i === 0 ? 0 : rng.weighted(steps, (_, j) => weights[j])))
  return { rhythm, contour }
}

const EPS = 1e-6
const pcOf = (k: number) => ((k % 12) + 12) % 12

export class Lead {
  // 前の小節の音符 (対旋律のこだまに使う)
  lastBar: { beat: number; key: number; velocity: number; duration: number }[] = []
  private readonly lo: number
  private readonly hi: number
  private keys: number[] = []
  private idx = 0
  private lastKey: number
  private section = -1
  private motifs: Motif[] = []
  private phraseBars = 4

  constructor(lo: number, hi: number) {
    this.lo = lo
    this.hi = hi
    this.lastKey = (lo + hi) / 2
  }

  generate(ctx: BarContext, out: NoteWriter, rng: Random): void {
    const s = ctx.section
    if (s.index !== this.section) this.startSection(ctx, rng)
    const phrase = Math.floor(ctx.barInSection / this.phraseBars)
    const pos = ctx.barInSection % this.phraseBars
    this.lastBar = []

    // 最初のセクションの最初の句と、静かなセクションの奇数番目の句は休む
    if ((s.index === 0 && phrase === 0) || (s.energy < 0.3 && phrase % 2 === 1)) return

    const motif = this.motifs[phrase % this.motifs.length]
    const role = this.phraseBars === 4 ? (['motif', 'vary', 'transpose', 'cadence'] as const)[pos] : pos === 0 ? 'motif' : 'cadence'
    const onsets = role === 'cadence' ? this.cadenceRhythm(ctx, motif) : motif.rhythm

    // 小節頭の音は前の音に近い和音の音から始める
    const firstChord = ctx.chords[0].chord
    let idx = this.snap(this.idx, (k) => this.isChordTone(s.key, firstChord, k), 3)
    if (role === 'transpose') idx = this.reflect(idx + rng.pick([-2, 2, 3]))

    const velBase = 60 + s.energy * 32
    onsets.forEach((o, i) => {
      let step = motif.contour[i] ?? rng.pick([-1, 1])
      if (role === 'vary' && rng.chance(0.35)) step += rng.pick([-1, 1])
      if (i > 0) idx = this.reflect(idx + step)
      const chord = chordAt(ctx, o.beat).chord
      const finalNote = role === 'cadence' && i === onsets.length - 1
      if (finalNote) {
        // 終止: 根音 (なければ和音の音) に落ち着く
        const rootPc = chordPitchClasses(s.key, chord)[0]
        idx = this.snap(idx, (k) => Math.abs(pcOf(k) - rootPc) < EPS, 4)
      } else if (o.strong) {
        const color = rng.chance(ctx.params.colorTones * 0.35)
        idx = this.snap(idx, (k) => (color ? this.isColorTone(s.key, k) : this.isChordTone(s.key, chord, k)), 2)
      }
      if (o.rest) return
      const vel = velBase + (o.strong ? 8 : 0) - (finalNote ? 4 : 0)
      this.emit(ctx, out, rng, o.beat, o.length, idx, vel)
    })
    this.idx = idx
    this.lastKey = this.keys[idx]
    this.lastBar = out.notes.slice()
  }

  private startSection(ctx: BarContext, rng: Random): void {
    const s = ctx.section
    this.section = s.index
    this.keys = s.key.keysInRange(this.lo, this.hi)
    // 転調しても前の音の近くから続ける
    let best = 0
    this.keys.forEach((k, i) => {
      if (Math.abs(k - this.lastKey) < Math.abs(this.keys[best] - this.lastKey)) best = i
    })
    this.idx = best
    this.phraseBars = s.bars >= 8 ? 4 : 2
    this.motifs = [makeMotif(ctx, rng), makeMotif(ctx, rng)]
  }

  // 動機の前半だけ使い、残りを 1 つの長い音にする
  private cadenceRhythm(ctx: BarContext, motif: Motif): Onset[] {
    const half = ctx.beats / 2
    const head = motif.rhythm.filter((o, i) => i === 0 || o.beat < half).map((o) => ({ ...o }))
    const tailGroup = ctx.groups.find((g) => g.start >= (head[head.length - 1].beat + head[head.length - 1].length) - EPS)
    const lastHead = head[head.length - 1]
    if (tailGroup) {
      lastHead.length = tailGroup.start - lastHead.beat
      head.push({ beat: tailGroup.start, length: ctx.beats - tailGroup.start, strong: true, rest: false })
    } else {
      lastHead.length = ctx.beats - lastHead.beat
    }
    return head
  }

  // 装飾音を付けて書き込む
  private emit(ctx: BarContext, out: NoteWriter, rng: Random, beat: number, length: number, idx: number, vel: number): void {
    const key = this.keys[idx]
    const upper = this.keys[Math.min(this.keys.length - 1, idx + 1)]
    const neighbor = upper !== key ? upper : this.keys[Math.max(0, idx - 1)]
    const o = ctx.params.ornaments
    const r = rng.next()
    if (length >= 0.5 && r < o * 0.22) {
      // 前打音 (上の隣の音から)
      const g = 0.1
      out.note(beat, neighbor, vel - 12, g)
      out.note(beat + g, key, vel, length * 0.97 - g)
    } else if (length >= 1 && r < o * 0.38) {
      // モルデント
      const g = 0.125
      out.note(beat, key, vel, g)
      out.note(beat + g, neighbor, vel - 10, g)
      out.note(beat + 2 * g, key, vel - 4, length * 0.97 - 2 * g)
    } else if (length >= 2 && r < o * 0.5) {
      // トリル (前半だけ) のあと伸ばす
      const g = 0.125
      const n = Math.floor((length * 0.6) / g)
      for (let i = 0; i < n; i++) out.note(beat + i * g, i % 2 === 0 ? key : neighbor, vel - (i % 2) * 8, g)
      out.note(beat + n * g, key, vel - 4, length * 0.97 - n * g)
    } else {
      out.note(beat, key, vel, length * 0.97)
    }
  }

  private isChordTone(key: Key, chord: Chord, k: number): boolean {
    return chordPitchClasses(key, chord).some((pc) => Math.abs(pc - pcOf(k)) < EPS)
  }

  private isColorTone(key: Key, k: number): boolean {
    const d = key.degreeOf(k)
    return d !== undefined && key.scale.color.includes(((d % key.size) + key.size) % key.size)
  }

  // idx から近い順に探し、条件に合う最初の添字 (なければ idx)
  private snap(idx: number, ok: (key: number) => boolean, maxDistance: number): number {
    for (let d = 0; d <= maxDistance; d++) {
      for (const i of d === 0 ? [idx] : [idx - d, idx + d]) {
        if (i >= 0 && i < this.keys.length && ok(this.keys[i])) return i
      }
    }
    return idx
  }

  // 音域の端で折り返す
  private reflect(idx: number): number {
    const max = this.keys.length - 1
    if (idx < 0) idx = -idx
    if (idx > max) idx = 2 * max - idx
    return Math.max(0, Math.min(max, idx))
  }
}
