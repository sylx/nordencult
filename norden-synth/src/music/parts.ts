// リード以外のパート。どれも小節の文脈から、その小節の音符をその場で作る

import { chordAt, type BarContext, type NoteWriter, type PartId } from './context.ts'
import { chordPitchClasses, type Chord } from './harmony.ts'
import { Lead } from './melody.ts'
import type { Random } from './random.ts'
import type { Key } from './scales.ts'

export interface PartDef {
  id: PartId
  label: string
  instrument: string
  volume: number
  pan: number
  // セクションの盛り上がりがこの範囲にあるときに加わる
  energy: [number, number]
}

// 並び順が生成順。対旋律はリードの後に作る (リードの音を参照するため)
export const PART_DEFS: PartDef[] = [
  { id: 'drone', label: 'ドローン / 低音 (コントラバス)', instrument: 'contrabass', volume: 0.8, pan: 0.3, energy: [0, 1] },
  { id: 'lead', label: 'メロディ (チェロ)', instrument: 'cello', volume: 0.75, pan: -0.1, energy: [0.2, 1] },
  { id: 'counter', label: '対旋律 (バイオリン)', instrument: 'violin', volume: 0.5, pan: -0.4, energy: [0.55, 1] },
  { id: 'pad', label: '和音 (ビオラ)', instrument: 'viola', volume: 0.5, pan: 0.2, energy: [0.25, 1] },
  { id: 'choir', label: 'クワイア', instrument: 'ahh-choir', volume: 0.45, pan: 0, energy: [0.75, 1] },
  { id: 'ostinato', label: 'オスティナート (ピチカート)', instrument: 'pizzicato-section', volume: 0.6, pan: 0.15, energy: [0.35, 1] },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.65, pan: 0.35, energy: [0.3, 1] },
  { id: 'percussion', label: '打楽器 (ティンパニ)', instrument: 'timpani', volume: 0.75, pan: 0, energy: [0.5, 1] },
  { id: 'shimmer', label: '鐘 (ピアノ)', instrument: 'yamaha-grand-piano', volume: 0.45, pan: -0.25, energy: [0, 0.5] },
]

export interface Part {
  generate(ctx: BarContext, out: NoteWriter, rng: Random): void
}

const EPS = 1e-6
const pcOf = (k: number) => ((k % 12) + 12) % 12

function chordKeys(key: Key, chord: Chord, lo: number, hi: number): number[] {
  const pcs = chordPitchClasses(key, chord)
  return key.keysInRange(lo, hi).filter((k) => pcs.some((pc) => Math.abs(pc - pcOf(k)) < EPS))
}

// prev に最も近い候補
function nearest(keys: number[], prev: number): number {
  return keys.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a), keys[0])
}

function lowestPc(key: Key, pc: number, lo: number, hi: number): number {
  return key.keysInRange(lo, hi).find((k) => Math.abs(pcOf(k) - pc) < EPS) ?? key.tonicIn(lo)
}

// 主音を持続するか、和音の根音を追う
function drone(): Part {
  let droning = true
  let section = -1
  return {
    generate(ctx, out, rng) {
      const s = ctx.section
      if (s.index !== section) {
        section = s.index
        droning = rng.chance(ctx.params.drone)
      }
      const vel = 68 + s.energy * 22
      if (droning) {
        // 4 小節ごとに弾き直す
        if (ctx.barInSection % 4 !== 0) return
        const bars = Math.min(4, s.bars - ctx.barInSection)
        const tonic = s.key.tonicIn(28)
        out.note(0, tonic, vel, bars * ctx.beats)
        if (s.energy > 0.6) out.note(0, tonic + 12, vel - 15, bars * ctx.beats)
        return
      }
      for (const span of ctx.chords) {
        if (!span.isNew) continue
        const rootPc = chordPitchClasses(s.key, span.chord)[0]
        out.note(span.start, lowestPc(s.key, rootPc, 28, 40), vel, span.length)
      }
    },
  }
}

// 持続する和音。voices 声部を前の音に近いところで保つ
function sustained(lo: number, hi: number, voices: number, velBase: number): Part {
  let prev: number[] = []
  return {
    generate(ctx, out) {
      const s = ctx.section
      for (const span of ctx.chords) {
        if (!span.isNew) continue
        const candidates = chordKeys(s.key, span.chord, lo, hi)
        if (candidates.length === 0) continue
        const chosen: number[] = []
        for (let v = 0; v < voices; v++) {
          const target = prev[v] ?? lo + ((hi - lo) * (v + 1)) / (voices + 1)
          // 同じ音名を重ねない
          const free = candidates.filter((k) => !chosen.some((c) => Math.abs(pcOf(c) - pcOf(k)) < EPS))
          if (free.length === 0) break
          chosen.push(nearest(free, target))
        }
        prev = chosen
        for (const k of chosen) out.note(span.start, k, velBase + s.energy * 25, span.length)
      }
    },
  }
}

// 対旋律: 高音の持続音。盛り上がっているときはリードの前の小節をこだまする
function counter(lead: Lead): Part {
  let prev = 79
  return {
    generate(ctx, out, rng) {
      const s = ctx.section
      const echo = s.energy > 0.7 && Math.floor(ctx.barInSection / 2) % 2 === 1 && lead.lastBar.length > 0
      if (echo && rng.chance(0.7)) {
        for (const n of lead.lastBar) {
          const k = n.key + (n.key + 12 < 64 ? 24 : 12)
          if (k <= 91) out.note(n.beat, k, n.velocity * 0.7, n.duration)
        }
        return
      }
      for (const span of ctx.chords) {
        if (!span.isNew) continue
        const candidates = chordKeys(s.key, span.chord, 67, 88)
        if (candidates.length === 0) continue
        prev = nearest(candidates, prev)
        out.note(span.start, prev, 55 + s.energy * 25, span.length)
      }
    },
  }
}

// 拍のまとまりに沿った音型。セクションの頭で決め、毎小節その時点の和音に当てはめる
function ostinato(): Part {
  type Slot = { role: number; accent: boolean } | undefined
  let pattern: Slot[] = []
  let section = -1
  return {
    generate(ctx, out, rng) {
      const s = ctx.section
      if (s.index !== section) {
        section = s.index
        pattern = []
        const restProb = 0.55 - s.energy * 0.45
        for (const g of ctx.groups) {
          const eighths = Math.round(g.length * 2)
          for (let i = 0; i < eighths; i++) {
            if (i === 0) pattern.push({ role: 0, accent: true })
            else pattern.push(rng.chance(restProb) ? undefined : { role: rng.int(1, 3), accent: false })
          }
        }
      }
      pattern.forEach((slot, i) => {
        if (!slot) return
        const beat = i * 0.5
        const tones = chordKeys(s.key, chordAt(ctx, beat).chord, 48, 67)
        if (tones.length === 0) return
        const k = tones[Math.min(slot.role, tones.length - 1)]
        out.note(beat, k, (slot.accent ? 80 : 62) + s.energy * 15, 0.45)
      })
    },
  }
}

// ハープ: 和音が変わるところでアルペジオ。セクションの頭ではスケールを駆け上がる
function harp(): Part {
  return {
    generate(ctx, out, rng) {
      const s = ctx.section
      const vel = 58 + s.energy * 22
      if (ctx.first && rng.chance(0.6)) {
        const run = s.key.keysInRange(52, 90)
        const start = rng.int(0, Math.max(0, run.length - 14))
        const notes = run.slice(start, start + rng.int(9, 14))
        notes.forEach((k, i) => out.note(i * 0.125, k, vel - 6 + i, ctx.beats - i * 0.125))
        return
      }
      for (const span of ctx.chords) {
        if (!span.isNew || !rng.chance(0.35 + s.energy * 0.4)) continue
        const tones = chordKeys(s.key, span.chord, 50, 86)
        const from = rng.int(0, Math.max(0, tones.length - 8))
        const count = rng.int(4, 8)
        tones.slice(from, from + count).forEach((k, i) => {
          const t = span.start + i * 0.25
          if (t < span.end) out.note(t, k, vel - i * 2, span.length - i * 0.25)
        })
      }
    },
  }
}

// 打楽器: まとまりの頭を叩く。セクションの最後はロールでつなぐ
function percussion(): Part {
  let hits: boolean[] = []
  let section = -1
  return {
    generate(ctx, out, rng) {
      const s = ctx.section
      if (s.index !== section) {
        section = s.index
        hits = ctx.groups.map((_, i) => i === 0 || rng.chance(0.6))
      }
      const tonic = s.key.tonicIn(40)
      const fifth = s.key.contains(s.key.tonic + 7) ? tonic + 7 : tonic
      const rollFrom = ctx.last ? ctx.groups[ctx.groups.length - 1].start : Infinity
      ctx.groups.forEach((g, i) => {
        if (g.start >= rollFrom || !hits[i]) return
        out.note(g.start, i === 0 ? tonic : fifth, (i === 0 ? 92 : 72) + s.energy * 20, 1)
        if (s.energy > 0.8 && g.length >= 1) out.note(g.start + 0.5, tonic, 55, 0.5)
      })
      if (ctx.last) {
        const n = Math.round((ctx.beats - rollFrom) / 0.125)
        for (let i = 0; i < n; i++) out.note(rollFrom + i * 0.125, tonic, 50 + (50 * i) / n, 0.2)
      }
    },
  }
}

// 鐘のような高音。静かなセクションで特性音をぽつりと鳴らす
function shimmer(): Part {
  return {
    generate(ctx, out, rng) {
      const s = ctx.section
      if (!rng.chance(0.5)) return
      const color = s.key.keysInRange(72, 96, (d) => s.key.scale.color.includes(d) || d === 0)
      if (color.length === 0) return
      const count = rng.int(1, 2)
      for (let i = 0; i < count; i++) {
        const g = rng.pick(ctx.groups)
        out.note(g.start, rng.pick(color), 42 + rng.range(0, 14), rng.range(2, 4))
      }
    },
  }
}

export function createParts(): Record<PartId, Part> {
  const lead = new Lead(50, 77)
  return {
    drone: drone(),
    lead: { generate: (ctx, out, rng) => lead.generate(ctx, out, rng) },
    counter: counter(lead),
    pad: sustained(55, 71, 2, 48),
    choir: sustained(55, 74, 3, 42),
    ostinato: ostinato(),
    harp: harp(),
    percussion: percussion(),
    shimmer: shimmer(),
  }
}
