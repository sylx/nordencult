// 曲の構成: 拍子・調の選び方と、セクションの計画

import type { TimeSignature } from '../synth/index.ts'
import type { BgmParams } from './params.ts'
import type { Random } from './random.ts'
import { Key, SCALES, isMicrotonal, type ScaleDef } from './scales.ts'

export interface Meter {
  timeSignature: TimeSignature
  // 拍のまとまり (8 分音符いくつ分か)。7/8 の 2+2+3 など
  groups: number[]
  odd: boolean
}

export const METERS: Meter[] = [
  { timeSignature: [4, 4], groups: [2, 2, 2, 2], odd: false },
  { timeSignature: [3, 4], groups: [2, 2, 2], odd: false },
  { timeSignature: [6, 8], groups: [3, 3], odd: false },
  { timeSignature: [5, 8], groups: [2, 3], odd: true },
  { timeSignature: [5, 8], groups: [3, 2], odd: true },
  { timeSignature: [7, 8], groups: [2, 2, 3], odd: true },
  { timeSignature: [7, 8], groups: [3, 2, 2], odd: true },
  { timeSignature: [9, 8], groups: [2, 2, 2, 3], odd: true },
  { timeSignature: [5, 4], groups: [3, 3, 2, 2], odd: true },
  { timeSignature: [11, 8], groups: [2, 2, 3, 2, 2], odd: true },
]

export function meterLabel(m: Meter): string {
  const [n, d] = m.timeSignature
  return m.odd || d === 8 ? `${n}/${d} (${m.groups.join('+')})` : `${n}/${d}`
}

// まとまりの頭の位置と長さ (拍 = 四分音符)
export function meterGroups(m: Meter): { start: number; length: number }[] {
  let t = 0
  return m.groups.map((g) => {
    const group = { start: t, length: g / 2 }
    t += g / 2
    return group
  })
}

export const meterBeats = (m: Meter) => m.groups.reduce((a, b) => a + b, 0) / 2

function gauss(x: number, width: number): number {
  return Math.exp(-(x * x) / (2 * width * width))
}

// エキゾチック度・微分音のパラメータに対するスケールの選ばれやすさ
export function scaleWeight(scale: ScaleDef, p: BgmParams): number {
  const w = gauss(scale.exotic - p.exoticism, 0.2)
  return isMicrotonal(scale) ? w * p.microtones * 1.5 : w
}

// 最初の調。主音は弦楽器の開放弦に近い音 (C D E G A) を少し優先する
export function firstKey(p: BgmParams, rng: Random): Key {
  const scale = rng.weighted(SCALES, (s) => scaleWeight(s, p))
  const tonic = rng.weighted([...Array(12).keys()], (t) => ([0, 2, 4, 7, 9].includes(t) ? 2 : 1))
  return new Key(scale, tonic)
}

// 次のセクションの調。転調するかどうかと、どのくらい遠くへ行くかをパラメータで決める
export function nextKey(prev: Key, p: BgmParams, rng: Random): Key {
  if (!rng.chance(p.modulationRate)) return prev
  const target = 0.08 + 0.72 * p.modulationDistance
  const candidates: { key: Key; weight: number }[] = []
  for (const scale of SCALES) {
    const sw = scaleWeight(scale, p)
    if (sw <= 0) continue
    for (let tonic = 0; tonic < 12; tonic++) {
      const key = new Key(scale, tonic)
      if (key.equals(prev)) continue
      candidates.push({ key, weight: sw * gauss(prev.distance(key) - target, 0.12) })
    }
  }
  if (candidates.length === 0) return prev
  return rng.weighted(candidates, (c) => c.weight).key
}

// 主題を再現するときの調。スケールはそのままで、転調の頻度に応じてときどき主音を移す
export function transposedKey(home: Key, p: BgmParams, rng: Random): Key {
  if (!rng.chance(p.modulationRate * 0.6)) return home
  const target = 0.08 + 0.72 * p.modulationDistance
  const keys = [...Array(12).keys()].filter((t) => t !== home.tonic).map((t) => new Key(home.scale, t))
  return rng.weighted(keys, (k) => gauss(home.distance(k) - target, 0.12) + 1e-3)
}

export function chooseMeter(prev: Meter | undefined, p: BgmParams, rng: Random): Meter {
  return rng.weighted(METERS, (m) => (m.odd ? p.oddMeter : 1 - p.oddMeter) * (m === prev ? 2.5 : 1) + 1e-3)
}

// セクションの盛り上がり 0..1
export function chooseEnergy(prev: number | undefined, p: BgmParams, rng: Random): number {
  const clamp = (v: number) => Math.min(1, Math.max(0.05, v))
  // 最初は控えめに始める
  if (prev === undefined) return clamp(p.energy - 0.25)
  // 起伏が大きいと、ときどきドローン中心の静かなセクションを挟む
  if (rng.chance(p.dynamics * 0.2)) return clamp(0.12 + rng.range(0, 0.1))
  const target = p.energy + rng.range(-1, 1) * p.dynamics * 0.5
  return clamp(prev + (target - prev) * 0.7)
}
