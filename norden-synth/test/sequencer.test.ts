import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { Sequencer, type SequencerOptions } from '../src/synth/sequencer.ts'
import type { Channel } from '../src/synth/synth.ts'

interface Played {
  key: number
  time: number
  duration: number
  voice: FakeVoice
}

class FakeVoice {
  startTime: number
  releasedAt?: number
  killedAt?: number
  constructor(startTime: number) {
    this.startTime = startTime
  }
  release(time: number) {
    this.releasedAt = time
  }
  kill(time: number) {
    this.killedAt = time
  }
}

function setup(options: SequencerOptions = {}) {
  const ctx = { currentTime: 0 }
  const seq = new Sequencer(ctx as unknown as BaseAudioContext, { lookahead: 0.5, ...options })
  after(() => seq.stop())
  const played: Played[] = []
  const channel = {
    playNote(key: number, _velocity: number, time: number, duration: number) {
      const voice = new FakeVoice(time)
      played.push({ key, time, duration, voice })
      return [voice]
    },
  } as unknown as Channel
  // タイマーを使わずに時刻を進める
  const advance = (to: number) => {
    for (let t = ctx.currentTime; t < to; t += 0.05) {
      ctx.currentTime = Math.min(t + 0.05, to)
      ;(seq as unknown as { tick(): void }).tick()
    }
  }
  return { ctx, seq, played, channel, advance }
}

const close = (actual: number, expected: number, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} !== ${expected}`)

test('小節ごとに先読みで生成し、先読み範囲の音符だけ予約する', () => {
  const { seq, played, channel, advance } = setup({ tempo: 120 })
  const generated: number[] = []
  seq.addTrack(channel, (bar) => {
    generated.push(bar.index)
    for (let i = 0; i < bar.beats; i++) bar.note(i, 60 + i, 100, 0.5)
  })
  seq.start(0)
  // 小節 0 (0〜2 秒) の頭だけが先読み範囲に入っている
  assert.deepEqual(generated, [0])
  assert.deepEqual(played.map((p) => p.time), [0])
  advance(1.6)
  // 1.6 + 0.5 = 2.1 秒 → 小節 1 の頭まで
  assert.deepEqual(generated, [0, 1])
  assert.deepEqual(played.map((p) => p.time), [0, 0.5, 1, 1.5, 2])
  for (const p of played) close(p.duration, 0.25)
  seq.stop()
})

test('再生中のテンポ変更は未予約の音符から反映する', () => {
  const { seq, played, channel, advance } = setup({ tempo: 120 })
  seq.addTrack(channel, (bar) => {
    for (let i = 0; i < bar.beats; i++) bar.note(i, 60, 100, 1)
  })
  seq.start(0)
  advance(1)
  // 予約済み: 1.5 秒 (拍 3) まで。拍 3 から 60bpm
  seq.tempo = 60
  assert.equal(seq.tempo, 60)
  advance(5)
  const times = played.map((p) => p.time)
  assert.deepEqual(times.slice(0, 5), [0, 0.5, 1, 1.5, 2.5])
  close(played[3].duration, 0.5 + 0.5)
  seq.stop()
})

test('conductor で拍子とテンポを決める', () => {
  const { seq, played, channel, advance } = setup({ tempo: 60 })
  seq.conductor = (bar) => {
    if (bar.index === 1) bar.timeSignature = [3, 4]
    if (bar.index === 2) bar.setTempo(120)
    if (bar.index === 4) bar.timeSignature = [6, 8]
  }
  const bars: [number, number, number][] = []
  seq.addTrack(channel, (bar) => {
    bars.push([bar.index, bar.startBeat, bar.beats])
    bar.note(0, 60, 100, 1)
  })
  seq.start(0)
  advance(7.75)
  const pos = seq.position()!
  assert.equal(pos.bar, 2)
  close(pos.beat, 1.5)
  assert.equal(pos.tempo, 120)
  assert.deepEqual(pos.timeSignature, [3, 4])
  advance(12)
  assert.equal(seq.position(7.75), undefined)
  assert.deepEqual(bars.slice(0, 5), [
    [0, 0, 4],
    [1, 4, 3],
    [2, 7, 3],
    [3, 10, 3],
    [4, 13, 3],
  ])
  assert.deepEqual(seq.timeSignature, [6, 8])
  assert.deepEqual(played.slice(0, 4).map((p) => p.time), [0, 4, 7, 8.5])
  seq.stop()
})

test('ランプは次の小節にまたがる', () => {
  const { seq, played, channel, advance } = setup({ tempo: 120 })
  seq.conductor = (bar) => {
    if (bar.index === 1) bar.rampTempo(60, 2, 4)
  }
  seq.addTrack(channel, (bar) => bar.note(0, 60, 100, 1))
  seq.start(0)
  advance(10)
  // 拍 6 (3 秒) から 4 拍かけて 120 → 60。拍 x までの時間は 60/k * ln(bpm(x)/120), k = -15
  close(played[2].time, 3 - 4 * Math.log(90 / 120))
  close(played[3].time, 3 - 4 * Math.log(60 / 120) + 2)
  seq.stop()
})

test('ミュート中のトラックは予約しないが生成は続ける', () => {
  const { seq, played, channel, advance } = setup()
  let count = 0
  const track = seq.addTrack(channel, (bar) => {
    count++
    bar.note(0, 60, 100, 1)
  })
  track.muted = true
  seq.start(0)
  advance(4)
  assert.equal(played.length, 0)
  assert.ok(count >= 2)
  track.muted = false
  advance(8)
  assert.ok(played.length > 0)
  seq.stop()
})

test('停止すると未来の音は取り消し、鳴っている音はリリースする', () => {
  const { seq, played, channel, advance } = setup({ tempo: 120 })
  seq.addTrack(channel, (bar) => {
    for (let i = 0; i < bar.beats; i++) bar.note(i, 60, 100, 2)
  })
  seq.start(0)
  advance(1.2)
  seq.stop(1.2)
  const byTime = new Map(played.map((p) => [p.time, p.voice]))
  assert.equal(byTime.get(0)!.releasedAt, undefined) // 1 秒で鳴り終わっている
  assert.equal(byTime.get(0.5)!.releasedAt, 1.2)
  assert.equal(byTime.get(1)!.releasedAt, 1.2)
  assert.equal(byTime.get(1.5)!.killedAt, 1.2)
  assert.equal(seq.playing, false)
  assert.equal(seq.position(), undefined)
})

test('タイマーが遅れたら終わっていない音だけ今から鳴らす', () => {
  const { ctx, seq, played, channel } = setup({ tempo: 120 })
  seq.addTrack(channel, (bar) => {
    for (let i = 0; i < bar.beats; i++) bar.note(i, 60, 100, 1)
  })
  seq.start(0)
  ctx.currentTime = 1.2
  ;(seq as unknown as { tick(): void }).tick()
  // 拍 1 (0.5〜1.0 秒) は間に合わない。拍 2 (1.0〜1.5 秒) は 1.2 秒から
  assert.deepEqual(played.map((p) => p.time), [0, 1.2, 1.5])
  assert.equal(seq.droppedNotes, 1)
  seq.stop()
})

test('トラックの例外で止まらない', () => {
  const { seq, played, channel, advance } = setup()
  const error = console.error
  console.error = () => {}
  try {
    seq.addTrack(channel, () => {
      throw new Error('boom')
    })
    seq.addTrack(channel, (bar) => bar.note(0, 60, 100, 1))
    seq.start(0)
    advance(3)
    assert.ok(played.length >= 2)
  } finally {
    console.error = error
    seq.stop()
  }
})
