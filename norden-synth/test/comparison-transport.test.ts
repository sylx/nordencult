import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ComparisonTransport } from '../src/composition/transport.ts'
import { STUDIES } from '../src/composition/projects.ts'

class FakePlayer {
  loop = false
  starts = 0
  stops = 0
  start() { this.starts++ }
  stop() { this.stops++ }
}

const left = STUDIES[0].song
const right = STUDIES[1].song

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

test('読み込み順が逆転しても最後に選んだ候補だけを再生する', async () => {
  const transport = new ComparisonTransport<FakePlayer>()
  const old = deferred<FakePlayer>()
  const latest = deferred<FakePlayer>()
  const a = new FakePlayer()
  const b = new FakePlayer()
  const first = transport.play(left, () => old.promise, () => false)
  const second = transport.play(right, () => latest.promise, () => true)
  latest.resolve(b)
  assert.equal(await second, b)
  old.resolve(a)
  assert.equal(await first, undefined)
  assert.equal(a.starts, 0)
  assert.equal(b.starts, 1)
  assert.equal(b.loop, true)
  assert.equal(transport.current, b)
})

test('タブ移動や停止で、読み込み待ちの再生も取り消す', async () => {
  const transport = new ComparisonTransport<FakePlayer>()
  const loading = deferred<FakePlayer>()
  const player = new FakePlayer()
  const pending = transport.play(left, () => loading.promise, () => false)
  transport.stop()
  loading.resolve(player)
  assert.equal(await pending, undefined)
  assert.equal(player.starts, 0)
  assert.equal(transport.current, undefined)
})

test('連打で読み込みを重複させず、左右の切り替えで前の再生を止める', async () => {
  const transport = new ComparisonTransport<FakePlayer>()
  const loading = deferred<FakePlayer>()
  const a = new FakePlayer()
  const b = new FakePlayer()
  let loads = 0
  const load = () => { loads++; return loading.promise }
  const first = transport.play(left, load, () => false)
  const second = transport.play(left, load, () => false)
  loading.resolve(a)
  await Promise.all([first, second])
  assert.equal(loads, 1)
  assert.equal(a.starts, 1)
  await transport.play(right, async () => b, () => false)
  assert.equal(a.stops, 1)
  assert.equal(b.starts, 1)
  await transport.play(left, load, () => true)
  assert.equal(loads, 1)
  assert.equal(b.stops, 1)
  assert.equal(a.starts, 2)
  assert.equal(a.loop, true)
})

test('読み込み失敗後に再試行でき、取り消した要求の失敗は表示しない', async () => {
  const transport = new ComparisonTransport<FakePlayer>()
  await assert.rejects(transport.play(left, async () => { throw new Error('load failed') }, () => false), /load failed/)
  const player = new FakePlayer()
  assert.equal(await transport.play(left, async () => player, () => false), player)
  const loading = deferred<FakePlayer>()
  const pending = transport.play(right, () => loading.promise, () => false)
  transport.stop()
  loading.reject(new Error('stale failure'))
  assert.equal(await pending, undefined)
})

