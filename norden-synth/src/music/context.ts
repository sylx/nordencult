// パートの生成に渡す小節の文脈

import type { TrackBar } from '../synth/index.ts'
import type { Meter } from './form.ts'
import type { Chord } from './harmony.ts'
import type { BgmParams } from './params.ts'
import type { Random } from './random.ts'
import type { Key } from './scales.ts'

export type PartId = 'drone' | 'lead' | 'counter' | 'pad' | 'choir' | 'ostinato' | 'harp' | 'percussion' | 'shimmer'

export interface Section {
  index: number
  startBar: number
  bars: number
  key: Key
  // 前のセクションから調が変わったか
  modulated: boolean
  meter: Meter
  energy: number
  // 和音 1 つの長さ (小節)
  chordBars: number
  parts: Set<PartId>
  // 生成済みの和音 (和音の枠ごと)
  chords: Chord[]
}

export interface ChordSpan {
  // 小節内での開始と終了 (拍)
  start: number
  end: number
  // この和音の全体の長さ (start から、次の和音まで。小節をまたぐ)
  length: number
  // この小節で鳴り始める和音か (前の小節から続いているなら false)
  isNew: boolean
  chord: Chord
}

export interface BarContext {
  index: number
  section: Section
  barInSection: number
  beats: number
  // 拍のまとまりの頭と長さ (拍)
  groups: { start: number; length: number }[]
  chords: ChordSpan[]
  first: boolean
  last: boolean
  // 次のセクションの調 (セクション最後の和音の枠で決まる)
  nextKey?: Key
  params: BgmParams
}

export function chordAt(ctx: BarContext, beat: number): ChordSpan {
  return ctx.chords.find((c) => beat >= c.start && beat < c.end) ?? ctx.chords[ctx.chords.length - 1]
}

// パートからの書き込み口。揺らぎを加え、範囲を丸める
export class NoteWriter {
  private readonly bar: TrackBar
  private readonly rng: Random
  private readonly humanize: number
  notes: { beat: number; key: number; velocity: number; duration: number }[] = []

  constructor(bar: TrackBar, rng: Random, humanize: number) {
    this.bar = bar
    this.rng = rng
    this.humanize = humanize
  }

  note(beat: number, key: number, velocity: number, duration: number): void {
    // 発音を遅らせる方向にだけずらす (前にずらすと小節頭より前になりうる)
    const delay = this.humanize * this.rng.next() * 0.03
    const v = velocity + (this.rng.next() * 2 - 1) * this.humanize * 10
    const vel = Math.max(1, Math.min(127, Math.round(v)))
    const dur = Math.max(0.05, duration - delay)
    this.notes.push({ beat, key, velocity: vel, duration: dur })
    this.bar.note(beat + delay, key, vel, dur)
  }
}
