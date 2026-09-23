import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TempoMap } from '../src/synth/tempo.ts'

const close = (actual: number, expected: number, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} !== ${expected}`)

test('一定のテンポ', () => {
  const map = new TempoMap(120, 10)
  close(map.timeAt(0), 10)
  close(map.timeAt(4), 12)
  close(map.beatAt(12), 4)
  close(map.timeAt(-1), 9.5)
})

test('テンポの切り替え', () => {
  const map = new TempoMap(120, 0)
  map.set(4, 60)
  close(map.timeAt(4), 2)
  close(map.timeAt(6), 4)
  close(map.beatAt(3), 5)
  assert.equal(map.tempoAt(3.9), 120)
  assert.equal(map.tempoAt(4), 60)
})

test('前の位置に変化点を足すと後ろの時刻を計算し直す', () => {
  const map = new TempoMap(120, 0)
  map.set(8, 60)
  map.set(4, 240)
  close(map.timeAt(8), 2 + 1)
  close(map.timeAt(9), 4)
})

test('同じ位置の変化点は置き換える (先頭も)', () => {
  const map = new TempoMap(120, 5)
  map.set(0, 60)
  close(map.timeAt(0), 5)
  close(map.timeAt(1), 6)
  assert.throws(() => map.set(-1, 100))
})

test('線形ランプは数値積分と一致し、beatAt が逆関数になる', () => {
  const map = new TempoMap(120, 0)
  map.ramp(4, 60, 4)
  // 数値積分
  const steps = 100000
  let t = 2
  for (let i = 0; i < steps; i++) {
    const x = (i + 0.5) * (4 / steps)
    t += (60 / (120 - 15 * x)) * (4 / steps)
  }
  close(map.timeAt(8), t, 1e-6)
  close(map.timeAt(10), t + 2, 1e-6)
  close(map.tempoAt(6), 90)
  close(map.tempoAt(9), 60)
  for (const b of [0, 3, 4, 5.5, 7.99, 8, 12]) close(map.beatAt(map.timeAt(b)), b)
})

test('ランプの途中で次の変化点が来たらそこで打ち切る', () => {
  const map = new TempoMap(120, 0)
  map.ramp(0, 60, 8)
  map.set(4, 200)
  close(map.tempoAt(3.999), 120 - 7.5 * 3.999)
  assert.equal(map.tempoAt(4), 200)
  const t4 = map.timeAt(4)
  close(map.timeAt(6), t4 + 0.6)
})

test('prune は位置を変えない', () => {
  const map = new TempoMap(100, 0)
  map.set(4, 50)
  map.set(8, 200)
  const t = map.timeAt(9)
  map.prune(5)
  close(map.timeAt(9), t)
  close(map.beatAt(t), 9)
})
