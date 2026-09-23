// テンポ/小節単位で先読みしながら再生するシーケンサ。
//
// 2 段階で先読みする:
//   1. 小節の生成: 小節の頭が先読み範囲に入ったら、conductor → 各トラックの順に
//      コールバックを呼び、その小節の音符を拍の位置で受け取る
//   2. 音符の予約: 先読み範囲に入った音符だけ、その時点のテンポマップで時刻に変換して
//      Channel.playNote で予約する
// 拍から時刻への変換を予約の直前まで遅らせるので、生成済みの小節の途中でも
// テンポの変更は先読み時間 (lookahead) の遅れで反映される。
//
// 位置はすべて四分音符を 1 拍とする。テンポも四分音符/分。

import type { Channel } from './synth.ts'
import { TempoMap, checkBpm } from './tempo.ts'
import type { Voice } from './voice.ts'

// [分子, 分母]。例: [3, 4], [6, 8]
export type TimeSignature = readonly [number, number]

export interface SequencerOptions {
  // 開始時のテンポ (四分音符/分)。既定 120
  tempo?: number
  // 既定 [4, 4]
  timeSignature?: TimeSignature
  // この秒数先までの音符を予約する。既定 0.3
  lookahead?: number
  // ページが非表示のときの先読み秒数。バックグラウンドのタブではタイマーが
  // 1 秒に 1 回程度まで間引かれることがあるので長めにとる。既定 1.5
  hiddenLookahead?: number
  // 予約処理を呼ぶ間隔 (ms)。既定 50
  interval?: number
}

export interface BarInfo {
  // 0 から数えた小節番号
  readonly index: number
  // 曲頭からの小節頭の位置 (拍)
  readonly startBeat: number
  readonly timeSignature: TimeSignature
  // 小節の長さ (拍)
  readonly beats: number
}

// conductor に渡す小節。拍子とテンポを決める
export interface ConductorBar extends BarInfo {
  // この小節からの拍子。以降の小節にも引き継ぐ (Sequencer.timeSignature も変わる)
  timeSignature: TimeSignature
  // 小節頭から beat 拍の位置でテンポを変える
  setTempo(bpm: number, beat?: number): void
  // 小節頭から beat 拍の位置から length 拍かけてテンポを bpm まで変える (次の小節にまたがってよい)
  rampTempo(bpm: number, beat: number, length: number): void
}

// トラックに渡す小節。音符を書き込む
export interface TrackBar extends BarInfo {
  // beat: 小節頭からの位置 (拍, 0 以上。小節の長さを超えてもよい)
  // duration: 長さ (拍)
  note(beat: number, key: number, velocity: number, duration: number): void
}

export type Conductor = (bar: ConductorBar) => void
export type TrackGenerator = (bar: TrackBar) => void

export class Track {
  readonly channel: Channel
  readonly generate: TrackGenerator
  // true の間は音符を予約しない (生成は続けるので、ジェネレータの状態は進む)
  muted = false

  constructor(channel: Channel, generate: TrackGenerator) {
    this.channel = channel
    this.generate = generate
  }
}

export interface Position {
  bar: number
  // 小節頭からの拍
  beat: number
  timeSignature: TimeSignature
  tempo: number
}

interface NoteEvent {
  // 曲頭からの拍
  beat: number
  key: number
  velocity: number
  duration: number
  track: Track
}

interface Scheduled {
  voices: Voice[]
  end: number
}

export class Sequencer {
  readonly ctx: BaseAudioContext
  // 曲頭 (小節 0) の時刻。start() するまで NaN
  startTime = NaN
  conductor?: Conductor
  lookahead: number
  hiddenLookahead: number
  // 先読みに間に合わず、鳴らせなかった音符の数
  droppedNotes = 0
  private readonly interval: number
  private readonly tracks = new Set<Track>()
  private initialTempo: number
  private nextTimeSignature: TimeSignature
  private timer?: ReturnType<typeof setInterval>
  private tempoMap?: TempoMap
  private nextBar = { index: 0, startBeat: 0 }
  // 予約済みの範囲 (拍)。これより前の音符はすべて予約してある
  private horizon = 0
  // 生成済みで、鳴り終わっていない小節
  private bars: BarInfo[] = []
  // 生成済みで、まだ予約していない音符 (拍の順)
  private pending: NoteEvent[] = []
  // 予約済みで、まだ鳴り終わっていない音符
  private scheduled: Scheduled[] = []

  // ctx には Synth の AudioContext を渡す (new Sequencer(synth.ctx))
  constructor(ctx: BaseAudioContext, options: SequencerOptions = {}) {
    this.ctx = ctx
    this.initialTempo = checkBpm(options.tempo ?? 120)
    this.nextTimeSignature = checkTimeSignature(options.timeSignature ?? [4, 4])
    this.lookahead = options.lookahead ?? 0.3
    this.hiddenLookahead = options.hiddenLookahead ?? 1.5
    this.interval = options.interval ?? 50
  }

  get playing(): boolean {
    return this.timer !== undefined
  }

  // 予約済みの範囲の終わりでのテンポ。再生中に設定すると、まだ予約していない音符から反映される
  // (conductor が後の位置でテンポを決めていれば、そこからはそちらが優先される)。
  // 設定した値は次の start() の初期テンポにもなる
  get tempo(): number {
    return this.tempoMap ? this.tempoMap.tempoAt(this.horizon) : this.initialTempo
  }

  set tempo(bpm: number) {
    this.initialTempo = checkBpm(bpm)
    this.tempoMap?.set(this.horizon, bpm)
  }

  // 次に生成する小節の拍子
  get timeSignature(): TimeSignature {
    return this.nextTimeSignature
  }

  set timeSignature(ts: TimeSignature) {
    this.nextTimeSignature = checkTimeSignature(ts)
  }

  addTrack(channel: Channel, generate: TrackGenerator): Track {
    const track = new Track(channel, generate)
    this.tracks.add(track)
    return track
  }

  // 生成済みで未予約の音符も捨てる。鳴っている音はそのまま
  removeTrack(track: Track): void {
    this.tracks.delete(track)
    this.pending = this.pending.filter((e) => e.track !== track)
  }

  // time (AudioContext の時刻) を小節 0 の頭として再生を始める。再生中なら止めてからやり直す
  start(time = this.ctx.currentTime + 0.05): void {
    if (this.playing) this.stop()
    this.startTime = time
    this.tempoMap = new TempoMap(this.initialTempo, time)
    this.nextBar = { index: 0, startBeat: 0 }
    this.horizon = 0
    this.bars = []
    this.pending = []
    this.scheduled = []
    this.timer = setInterval(() => this.tick(), this.interval)
    this.tick()
  }

  // 予約処理を止め、time より後に始まる音は取り消し、鳴っている音はリリースする
  stop(time = this.ctx.currentTime): void {
    if (!this.playing) return
    clearInterval(this.timer)
    this.timer = undefined
    for (const s of this.scheduled) {
      if (s.end <= time) continue
      for (const v of s.voices) {
        if (v.startTime >= time) v.kill(time)
        else v.release(time)
      }
    }
    this.tempoMap = undefined
    this.bars = []
    this.pending = []
    this.scheduled = []
  }

  // time (既定は現在) に鳴っている位置。曲頭より前は小節 0 の負の拍になる。
  // 再生していないか、time が生成済みの範囲の外 (捨てた過去の小節や未生成の小節) なら undefined
  position(time = this.ctx.currentTime): Position | undefined {
    const map = this.tempoMap
    if (!map) return undefined
    const beat = map.beatAt(time)
    let bar = this.bars[0]
    if (!bar || (beat < bar.startBeat && bar.index > 0) || beat >= this.nextBar.startBeat) return undefined
    for (const b of this.bars) if (b.startBeat <= beat) bar = b
    return { bar: bar.index, beat: beat - bar.startBeat, timeSignature: bar.timeSignature, tempo: map.tempoAt(beat) }
  }

  // 曲頭からの拍を AudioContext の時刻にする。予約済みの範囲より先はテンポが変わりうる
  timeAt(beat: number): number {
    return this.tempoMap ? this.tempoMap.timeAt(beat) : NaN
  }

  private tick(): void {
    const map = this.tempoMap
    if (!map) return
    const now = this.ctx.currentTime
    const hidden = typeof document !== 'undefined' && document.hidden
    const end = now + (hidden ? Math.max(this.lookahead, this.hiddenLookahead) : this.lookahead)

    while (map.timeAt(this.nextBar.startBeat) < end) this.generateBar(map)

    const endBeat = map.beatAt(end)
    let n = 0
    while (n < this.pending.length && this.pending[n].beat < endBeat) this.schedule(map, this.pending[n++], now)
    this.pending.splice(0, n)
    this.horizon = Math.max(this.horizon, endBeat)

    // 鳴り終わったものを捨てる
    const nowBeat = map.beatAt(now)
    this.scheduled = this.scheduled.filter((s) => s.end > now)
    while (this.bars.length > 1 && this.bars[1].startBeat <= nowBeat) this.bars.shift()
    map.prune(Math.min(nowBeat, this.bars[0]?.startBeat ?? nowBeat))
  }

  private generateBar(map: TempoMap): void {
    const { index, startBeat } = this.nextBar
    const bar = new Bar(index, startBeat, this.nextTimeSignature, map)
    try {
      this.conductor?.(bar)
    } catch (err) {
      console.error(`sequencer: conductor failed at bar ${index}`, err)
    }
    bar.locked = true
    this.nextTimeSignature = bar.timeSignature
    const events: NoteEvent[] = []
    for (const track of this.tracks) {
      bar.target = { track, events }
      try {
        track.generate(bar)
      } catch (err) {
        console.error(`sequencer: track failed at bar ${index}`, err)
      }
    }
    bar.target = undefined

    this.bars.push({ index, startBeat, timeSignature: bar.timeSignature, beats: bar.beats })
    this.nextBar = { index: index + 1, startBeat: startBeat + bar.beats }
    if (events.length > 0) {
      this.pending.push(...events)
      this.pending.sort((a, b) => a.beat - b.beat)
    }
  }

  private schedule(map: TempoMap, e: NoteEvent, now: number): void {
    if (e.track.muted || !this.tracks.has(e.track)) return
    const end = map.timeAt(e.beat + e.duration)
    // タイマーが遅れて開始時刻を過ぎていたら、終わっていない音だけ今から鳴らす
    const start = Math.max(map.timeAt(e.beat), now)
    if (end <= start) {
      this.droppedNotes++
      return
    }
    const voices = e.track.channel.playNote(e.key, e.velocity, start, end - start)
    if (voices.length > 0) this.scheduled.push({ voices, end })
  }
}

class Bar implements ConductorBar, TrackBar {
  readonly index: number
  readonly startBeat: number
  // conductor の後は拍子とテンポを変えられない
  locked = false
  target?: { track: Track; events: NoteEvent[] }
  private ts: TimeSignature
  private readonly map: TempoMap

  constructor(index: number, startBeat: number, ts: TimeSignature, map: TempoMap) {
    this.index = index
    this.startBeat = startBeat
    this.ts = ts
    this.map = map
  }

  get timeSignature(): TimeSignature {
    return this.ts
  }

  set timeSignature(ts: TimeSignature) {
    this.checkUnlocked()
    this.ts = checkTimeSignature(ts)
  }

  get beats(): number {
    return (this.ts[0] * 4) / this.ts[1]
  }

  setTempo(bpm: number, beat = 0): void {
    this.checkUnlocked()
    this.map.set(this.startBeat + checkBeat(beat), bpm)
  }

  rampTempo(bpm: number, beat: number, length: number): void {
    this.checkUnlocked()
    this.map.ramp(this.startBeat + checkBeat(beat), bpm, length)
  }

  note(beat: number, key: number, velocity: number, duration: number): void {
    if (!this.target) throw new Error('note() can only be called from a track generator')
    if (!(duration > 0)) throw new RangeError(`invalid duration: ${duration}`)
    const { track, events } = this.target
    events.push({ beat: this.startBeat + checkBeat(beat), key, velocity, duration, track })
  }

  private checkUnlocked(): void {
    if (this.locked) throw new Error('time signature and tempo can only be changed from the conductor')
  }
}

function checkBeat(beat: number): number {
  if (!(beat >= 0 && Number.isFinite(beat))) throw new RangeError(`invalid beat: ${beat}`)
  return beat
}

function checkTimeSignature(ts: TimeSignature): TimeSignature {
  const [n, d] = ts
  if (!(n > 0 && d > 0 && Number.isFinite(n / d))) throw new RangeError(`invalid time signature: ${ts}`)
  return [n, d]
}
