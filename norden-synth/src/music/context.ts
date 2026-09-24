// パートの生成に渡す小節の文脈

import type { Meter } from './form.ts'
import type { Chord, Progression } from './harmony.ts'
import type { BgmParams } from './params.ts'
import type { Random } from './random.ts'
import type { Key } from './scales.ts'

// 役割。どの奏者が受け持つかは伴奏セットで決まる
export type RoleId = 'bass' | 'melody' | 'counter' | 'chords' | 'pad' | 'ostinato' | 'arpeggio' | 'percussion' | 'bells'

// 奏者 (音色ごとに 1 つのチャンネル)
export type PlayerId = 'contrabass' | 'cello' | 'viola' | 'violin' | 'choir' | 'pizzicato' | 'harp' | 'timpani' | 'piano'

// 伴奏セットの中で、ある役割を受け持つ奏者と音域
export interface Seat {
  role: RoleId
  player: PlayerId
  lo: number
  hi: number
  // ベロシティの倍率 (既定 1)
  gain?: number
  // 分散和音の弾き方。roll: 和音が変わるところで掻き鳴らす、flow: 8 分音符で流れ続ける (既定)
  style?: 'roll' | 'flow'
}

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
  // このセクションで鳴る役割
  roles: Set<RoleId>
  // ソングの主題を示す (statement) か再現する (return) セクション
  theme?: 'statement' | 'return'
  // 根音の動かし方
  progression: Progression
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
  // セクションの中で次に来る和音 (セクション最後の和音なら undefined)
  next?: Chord
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

export interface WrittenNote {
  beat: number
  key: number
  velocity: number
  duration: number
}

// 役割からの書き込み口。揺らぎと奏者ごとの強さを加え、範囲を丸める
export class NoteWriter {
  private readonly rng: Random
  private readonly humanize: number
  private readonly gain: number
  // 揺らぎでずらす前の位置 (ほかの役割が参照する)
  notes: WrittenNote[] = []
  // 実際に鳴らす音符
  events: WrittenNote[] = []

  constructor(rng: Random, humanize: number, gain = 1) {
    this.rng = rng
    this.humanize = humanize
    this.gain = gain
  }

  note(beat: number, key: number, velocity: number, duration: number): void {
    // 発音を遅らせる方向にだけずらす (前にずらすと小節頭より前になりうる)
    const delay = this.humanize * this.rng.next() * 0.03
    const v = (velocity + (this.rng.next() * 2 - 1) * this.humanize * 10) * this.gain
    const vel = Math.max(1, Math.min(127, Math.round(v)))
    const dur = Math.max(0.05, duration - delay)
    this.notes.push({ beat, key, velocity: vel, duration: dur })
    this.events.push({ beat: beat + delay, key, velocity: vel, duration: dur })
  }
}
