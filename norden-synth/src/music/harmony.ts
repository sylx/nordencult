// 和音。機能和声ではなく、スケール上の音を積んだ和音を主音寄りの酔歩で選ぶ

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
  }
  if (iv in quality) return root + quality[iv]
  // 名前のない組み合わせは音程を並べる (n は 4 分音による中立音程)
  return `${root}(${intervals(key, c).slice(1).map((i) => INTERVAL_NAMES[i] ?? String(i)).join(',')})`
}

const INTERVAL_NAMES: Record<number, string> = {
  1: '♭2', 1.5: 'n2', 2: '2', 2.5: 'n2+', 3: 'm3', 3.5: 'n3', 4: 'M3', 4.5: 'n4', 5: '4', 5.5: 'n5-', 6: '♭5',
  6.5: 'n5', 7: '5', 7.5: 'n5+', 8: '♯5', 8.5: 'n6', 9: '6', 9.5: 'n7-', 10: '♭7', 10.5: 'n7', 11: 'M7',
}

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

function makeChord(key: Key, root: number, rng: Random): Chord {
  const r = rng.next()
  // 3 度堆積が基本。ときどき sus4 (7 音音階のみ) や空虚 5 度にする
  if (key.size === 7 && r < 0.18) return { root, offsets: [0, 3, 4] }
  if (r < 0.3) return { root, offsets: [0, fifthOffset(key, root)] }
  return { root, offsets: [0, 2, 4] }
}

export interface ChordChoice {
  first?: boolean
  // セクションの最後の和音。next が今と違う調なら、その調にも含まれる和音 (ピボット) を選ぶ
  final?: boolean
  next?: Key
}

export function chooseChord(key: Key, prev: Chord | undefined, p: BgmParams, rng: Random, opts: ChordChoice = {}): Chord {
  const degrees = [...Array(key.size).keys()]
  if (opts.first && rng.chance(0.7)) return makeChord(key, 0, rng)

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
  if (opts.final && rng.chance(0.6)) return makeChord(key, 0, rng)

  const root = rng.weighted(degrees, (d) => {
    let w = d === 0 ? 2.5 : 1
    if (key.scale.color.includes(d)) w += p.colorTones * 3
    if (prev && d === prev.root) w *= 0.25
    return w
  })
  return makeChord(key, root, rng)
}
