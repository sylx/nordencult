// 和音。機能和声ではなく、スケール上の音を積んだ和音を選ぶ。
// 根音の動かし方 (酔歩・2 和音の往復・順次下行・5 度下行) はセクションごとに決める

import type { BgmParams } from './params.ts'
import type { Random } from './random.ts'
import { pitchName, type Key } from './scales.ts'

export interface Chord {
  // 根音の度数 (0..size-1)
  root: number
  // 根音からの度数の差。3 度堆積なら [0, 2, 4]
  offsets: number[]
}

// 和音の構成音の度数 (0..size-1)
export const chordDegrees = (key: Key, c: Chord) => c.offsets.map((o) => (c.root + o) % key.size)

export function chordPitchClasses(key: Key, c: Chord): number[] {
  return chordDegrees(key, c).map((d) => (key.tonic + key.scale.steps[d]) % 12)
}

// 根音からの半音数
function intervals(key: Key, c: Chord): number[] {
  return c.offsets.map((o) => key.keyAt(c.root + o) - key.keyAt(c.root))
}

export function chordName(key: Key, c: Chord): string {
  const root = pitchName(key.tonic + key.scale.steps[c.root])
  const iv = intervals(key, c).slice(1).join(',')
  const quality: Record<string, string> = {
    '4,7': '',
    '3,7': 'm',
    '3,6': 'dim',
    '4,8': 'aug',
    '5,7': 'sus4',
    '2,7': 'sus2',
    '7': '5',
    '3.5,7': 'n',
    '4,7,11': 'maj7',
    '3,7,10': 'm7',
    '4,7,10': '7',
    '3,6,10': 'm7♭5',
    '3,7,11': 'mM7',
    '4,7,14': 'add9',
    '3,7,14': 'madd9',
  }
  if (iv in quality) return root + quality[iv]
  // 名前のない組み合わせは音程を並べる (n は 4 分音による中立音程)
  return `${root}(${intervals(key, c).slice(1).map((i) => INTERVAL_NAMES[i] ?? String(i)).join(',')})`
}

const INTERVAL_NAMES: Record<number, string> = {
  1: '♭2', 1.5: 'n2', 2: '2', 2.5: 'n2+', 3: 'm3', 3.5: 'n3', 4: 'M3', 4.5: 'n4', 5: '4', 5.5: 'n5-', 6: '♭5',
  6.5: 'n5', 7: '5', 7.5: 'n5+', 8: '♯5', 8.5: 'n6', 9: '6', 9.5: 'n7-', 10: '♭7', 10.5: 'n7', 11: 'M7',
  13: '♭9', 13.5: 'n9', 14: '9', 15: '♯9',
}

// 半音数の差 a が 12 を法として b と等しいか
const pcDiff = (a: number, b: number) => Math.abs((((a - b) % 12) + 12) % 12) < 1e-6

// 根音から完全 5 度 (に最も近い) 上の度数の差
function fifthOffset(key: Key, root: number): number {
  let best = 2
  let dist = Infinity
  for (let o = 1; o < key.size; o++) {
    const d = Math.abs(key.keyAt(root + o) - key.keyAt(root) - 7)
    if (d < dist) [best, dist] = [o, d]
  }
  return best
}

// 和音の響き。3 度堆積が基本で、和音の彩りのパラメータで 7 の和音・add9・sus2・4 度堆積が増える
function makeChord(key: Key, root: number, p: BgmParams, rng: Random): Chord {
  const color = p.chordColor
  const heptatonic = key.size === 7
  const kinds: { offsets: number[]; weight: number }[] = [
    { offsets: [0, 2, 4], weight: 1.6 - color },
    { offsets: [0, fifthOffset(key, root)], weight: 0.45 * (1 - color * 0.5) },
  ]
  if (heptatonic) {
    kinds.push(
      { offsets: [0, 3, 4], weight: 0.3 },
      { offsets: [0, 1, 4], weight: 0.3 * color },
      { offsets: [0, 2, 4, 6], weight: 1.2 * color },
      { offsets: [0, 2, 4, 8], weight: 0.6 * color },
      { offsets: [0, 3, 6], weight: 0.35 * color },
    )
  }
  return { root, offsets: rng.weighted(kinds, (k) => k.weight).offsets }
}

// 根音の動かし方。セクションの最初の和音を選ぶときに決める
//   walk     主音寄りの酔歩
//   vamp     主音の和音ともう 1 つの和音を行き来する
//   descent  根音が音階を 1 つずつ下る (ラメント)
//   fifths   根音が 5 度ずつ下る (4 度ずつ上る) 連鎖
export type Motion = 'walk' | 'vamp' | 'descent' | 'fifths'

const MOTION_LABELS: Record<Motion, string> = { walk: '酔歩', vamp: '2 和音の往復', descent: '順次下行', fifths: '5 度下行' }

export interface Progression {
  motion: Motion
  // この数の和音の枠ごとに同じ和音を繰り返す (最後の枠は除く)
  period?: number
  // vamp で主音と行き来する和音の根音
  partner: number
}

export function progressionLabel(p: Progression): string {
  return MOTION_LABELS[p.motion] + (p.period && p.motion !== 'vamp' ? ` · ${p.period} 和音ごとに繰り返し` : '')
}

// total はセクションの和音の枠の数
export function chooseProgression(key: Key, total: number, p: BgmParams, rng: Random): Progression {
  const motions: Motion[] = total >= 3 ? ['walk', 'vamp', 'descent', 'fifths'] : ['walk', 'vamp']
  const motion = rng.weighted(motions, (m) => ({ walk: 1.4, vamp: 0.7, descent: 0.6, fifths: 0.6 })[m])
  const partner = rng.weighted([...Array(key.size).keys()], (d) => {
    if (d === 0) return 0
    let w = d === 1 || d === key.size - 1 ? 1.5 : 1
    if (key.scale.color.includes(d)) w += p.colorTones * 2
    return w
  })
  let period: number | undefined
  if (motion === 'vamp') period = 2
  else if (total >= 4 && total % 2 === 0 && rng.chance(0.4)) period = total / 2
  return { motion, period, partner }
}

export interface ChordChoice {
  first?: boolean
  // セクションの最後の和音。next が今と違う調なら、その調にも含まれる和音 (ピボット) を選ぶ
  final?: boolean
  next?: Key
  progression?: Progression
}

export function chooseChord(key: Key, prev: Chord | undefined, p: BgmParams, rng: Random, opts: ChordChoice = {}): Chord {
  const degrees = [...Array(key.size).keys()]
  const motion = opts.progression?.motion ?? 'walk'
  // 酔歩以外は主音から始める
  if (opts.first && (motion !== 'walk' || rng.chance(0.7))) return makeChord(key, 0, p, rng)

  if (opts.final && opts.next && !opts.next.equals(key)) {
    const next = opts.next
    const pivots: Chord[] = []
    for (const root of degrees) {
      for (const offsets of [[0, 2, 4], [0, 3, 4], [0, fifthOffset(key, root)]]) {
        const c = { root, offsets }
        if (chordPitchClasses(key, c).every((pc) => next.contains(pc))) pivots.push(c)
      }
    }
    if (pivots.length > 0) {
      // 次の調の主音を含むピボットを優先する
      return rng.weighted(pivots, (c) => (chordPitchClasses(key, c).includes(next.tonic) ? 3 : 1))
    }
  }
  if (opts.final && rng.chance(0.6)) return makeChord(key, 0, p, rng)

  if (prev && motion === 'vamp') return makeChord(key, prev.root === 0 ? opts.progression!.partner : 0, p, rng)
  // 下行と 5 度の連鎖は、前の和音の根音から進める。完全 5 度下の音がスケールになければ 1 つ下る
  if (prev && (motion === 'descent' || motion === 'fifths')) {
    const step = (prev.root + key.size - 1) % key.size
    if (motion === 'descent') return makeChord(key, step, p, rng)
    const fifth = degrees.find((d) => d !== prev.root && pcDiff(key.keyAt(prev.root) - key.keyAt(d), 7))
    return makeChord(key, fifth ?? step, p, rng)
  }

  const root = rng.weighted(degrees, (d) => {
    let w = d === 0 ? 2.5 : 1
    if (key.scale.color.includes(d)) w += p.colorTones * 3
    if (prev && d === prev.root) w *= 0.25
    return w
  })
  return makeChord(key, root, p, rng)
}
