// 役割と奏者。役割は小節の文脈と、受け持つ奏者の席 (音域など) から、その小節の音符をその場で作る

import { chordAt, type BarContext, type NoteWriter, type PlayerId, type RoleId, type Seat } from './context.ts'
import { chordPitchClasses, type Chord } from './harmony.ts'
import { Lead, type MelodyInfo } from './melody.ts'
import type { Random } from './random.ts'
import type { Key } from './scales.ts'

export interface PlayerDef {
  id: PlayerId
  label: string
  instrument: string
  volume: number
  pan: number
  // 音が減衰する (持続する役割では弾き直す)
  decays: boolean
}

export const PLAYER_DEFS: PlayerDef[] = [
  { id: 'contrabass', label: 'コントラバス', instrument: 'contrabass', volume: 0.8, pan: 0.3, decays: false },
  { id: 'cello', label: 'チェロ', instrument: 'cello', volume: 0.75, pan: -0.1, decays: false },
  { id: 'viola', label: 'ビオラ', instrument: 'viola', volume: 0.55, pan: 0.2, decays: false },
  { id: 'violin', label: 'バイオリン', instrument: 'violin', volume: 0.55, pan: -0.4, decays: false },
  { id: 'choir', label: 'クワイア', instrument: 'ahh-choir', volume: 0.45, pan: 0, decays: false },
  { id: 'pizzicato', label: 'ピチカート', instrument: 'pizzicato-section', volume: 0.6, pan: 0.15, decays: true },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.65, pan: 0.35, decays: true },
  { id: 'timpani', label: 'ティンパニ', instrument: 'timpani', volume: 0.75, pan: 0, decays: true },
  { id: 'piano', label: 'ピアノ', instrument: 'yamaha-grand-piano', volume: 0.55, pan: -0.25, decays: true },
]

const decays = (player: PlayerId) => PLAYER_DEFS.find((d) => d.id === player)?.decays ?? false

export interface RoleDef {
  id: RoleId
  label: string
  // セクションの盛り上がりがこの範囲にあるときに加わる
  energy: [number, number]
}

// 並び順が生成順。対旋律はメロディの後に作る (メロディの音を参照するため)
export const ROLE_DEFS: RoleDef[] = [
  { id: 'bass', label: '低音', energy: [0, 1] },
  { id: 'melody', label: 'メロディ', energy: [0.2, 1] },
  { id: 'counter', label: '対旋律', energy: [0.55, 1] },
  { id: 'chords', label: '和音', energy: [0.25, 1] },
  { id: 'pad', label: '厚い和音', energy: [0.75, 1] },
  { id: 'ostinato', label: 'オスティナート', energy: [0.35, 1] },
  { id: 'arpeggio', label: 'アルペジオ', energy: [0.3, 1] },
  { id: 'percussion', label: '打楽器', energy: [0.5, 1] },
  { id: 'bells', label: '鐘', energy: [0, 0.5] },
]

export interface Role {
  generate(ctx: BarContext, out: NoteWriter, rng: Random, seat: Seat): void
  // 表示用に、直前に作った小節のメロディの状態を返す (メロディだけ)
  melody?(): MelodyInfo | undefined
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
function bass(): Role {
  let droning = true
  let section = -1
  return {
    generate(ctx, out, rng, seat) {
      const s = ctx.section
      if (s.index !== section) {
        section = s.index
        droning = rng.chance(ctx.params.drone)
      }
      const vel = 68 + s.energy * 22
      if (droning) {
        // 持続する楽器は 4 小節ごと、減衰する楽器は毎小節弾き直す
        const every = decays(seat.player) ? 1 : 4
        if (ctx.barInSection % every !== 0) return
        const bars = Math.min(every, s.bars - ctx.barInSection)
        const tonic = s.key.tonicIn(seat.lo)
        out.note(0, tonic, vel, bars * ctx.beats)
        if (s.energy > 0.6 && tonic + 12 <= seat.hi) out.note(0, tonic + 12, vel - 15, bars * ctx.beats)
        return
      }
      for (const span of ctx.chords) {
        if (!span.isNew) continue
        const rootPc = chordPitchClasses(s.key, span.chord)[0]
        out.note(span.start, lowestPc(s.key, rootPc, seat.lo, seat.lo + 12), vel, span.length)
      }
    },
  }
}

// 持続する和音。voices 声部を前の音に近いところで保つ。減衰する楽器は毎小節弾き直す
function sustained(voices: number, velBase: number): Role {
  let prev: number[] = []
  let player: PlayerId | undefined
  return {
    generate(ctx, out, _rng, seat) {
      if (seat.player !== player) {
        player = seat.player
        prev = []
      }
      const s = ctx.section
      const restrike = decays(seat.player)
      for (const span of ctx.chords) {
        if (!span.isNew && !(restrike && span.start === 0)) continue
        const candidates = chordKeys(s.key, span.chord, seat.lo, seat.hi)
        if (candidates.length === 0) continue
        const chosen: number[] = []
        for (let v = 0; v < voices; v++) {
          const target = prev[v] ?? seat.lo + ((seat.hi - seat.lo) * (v + 1)) / (voices + 1)
          // 同じ音名を重ねない
          const free = candidates.filter((k) => !chosen.some((c) => Math.abs(pcOf(c) - pcOf(k)) < EPS))
          if (free.length === 0) break
          chosen.push(nearest(free, target))
        }
        prev = chosen
        const vel = velBase + s.energy * 25 - (span.isNew ? 0 : 8)
        for (const k of chosen) out.note(span.start, k, vel, span.length)
      }
    },
  }
}

// 対旋律: 持続音。盛り上がっているときは同じ小節のメロディを別のオクターブで重ねる
function counter(lead: Lead): Role {
  let prev: number | undefined
  return {
    generate(ctx, out, rng, seat) {
      const s = ctx.section
      const inRange = (k: number) => k >= seat.lo && k <= seat.hi
      const echo = s.energy > 0.7 && Math.floor(ctx.barInSection / 2) % 2 === 1 && lead.lastBar.length > 0
      if (echo && rng.chance(0.7)) {
        const keys = lead.lastBar.map((n) => n.key)
        const centre = (Math.min(...keys) + Math.max(...keys)) / 2
        const shift = 12 * Math.round(((seat.lo + seat.hi) / 2 - centre) / 12)
        // 同じ高さなら、音域に多く収まるほうへ 1 オクターブずらす
        const shifts = shift !== 0 ? [shift] : [12, -12]
        const fit = (d: number) => keys.filter((k) => inRange(k + d)).length
        const d = shifts.reduce((a, b) => (fit(b) > fit(a) ? b : a))
        for (const n of lead.lastBar) if (inRange(n.key + d)) out.note(n.beat, n.key + d, n.velocity * 0.7, n.duration)
        return
      }
      const restrike = decays(seat.player)
      for (const span of ctx.chords) {
        if (!span.isNew && !(restrike && span.start === 0)) continue
        const candidates = chordKeys(s.key, span.chord, seat.lo, seat.hi)
        if (candidates.length === 0) continue
        prev = nearest(candidates, prev !== undefined && inRange(prev) ? prev : seat.lo + (seat.hi - seat.lo) * 0.6)
        out.note(span.start, prev, 55 + s.energy * 25, span.length)
      }
    },
  }
}

// 拍のまとまりに沿った音型。セクションの頭で決め、毎小節その時点の和音に当てはめる
function ostinato(): Role {
  type Slot = { role: number; accent: boolean } | undefined
  let pattern: Slot[] = []
  let section = -1
  return {
    generate(ctx, out, rng, seat) {
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
        const tones = chordKeys(s.key, chordAt(ctx, beat).chord, seat.lo, seat.hi)
        if (tones.length === 0) return
        const k = tones[Math.min(slot.role, tones.length - 1)]
        out.note(beat, k, (slot.accent ? 80 : 62) + s.energy * 15, 0.45)
      })
    },
  }
}

// 分散和音。
//   roll: 和音が変わるところで掻き鳴らし、セクションの頭ではスケールを駆け上がる (ハープ)
//   flow: 根音から 4 つの和音の音を 8 分音符で上下し続ける。減衰する楽器は 1 拍ぶん響かせる
function arpeggio(): Role {
  let step = 0
  return {
    generate(ctx, out, rng, seat) {
      const s = ctx.section
      const vel = 58 + s.energy * 22
      if (seat.style === 'roll') {
        if (ctx.first && rng.chance(0.6)) {
          const run = s.key.keysInRange(seat.lo + 2, seat.hi)
          const start = rng.int(0, Math.max(0, run.length - 14))
          const notes = run.slice(start, start + rng.int(9, 14))
          notes.forEach((k, i) => out.note(i * 0.125, k, vel - 6 + i, ctx.beats - i * 0.125))
          return
        }
        for (const span of ctx.chords) {
          if (!span.isNew || !rng.chance(0.35 + s.energy * 0.4)) continue
          const tones = chordKeys(s.key, span.chord, seat.lo, seat.hi - 4)
          const from = rng.int(0, Math.max(0, tones.length - 8))
          const count = rng.int(4, 8)
          tones.slice(from, from + count).forEach((k, i) => {
            const t = span.start + i * 0.25
            if (t < span.end) out.note(t, k, vel - i * 2, span.length - i * 0.25)
          })
        }
        return
      }
      const ring = decays(seat.player) ? 1 : 0.5
      for (let t = 0; t < ctx.beats - EPS; t += 0.5) {
        const span = chordAt(ctx, t)
        if (span.isNew && Math.abs(t - span.start) < EPS) step = 0
        const tones = chordKeys(s.key, span.chord, seat.lo, seat.hi)
        const rootPc = chordPitchClasses(s.key, span.chord)[0]
        const root = Math.max(0, tones.findIndex((k) => Math.abs(pcOf(k) - rootPc) < EPS))
        const figure = tones.slice(root, root + 4)
        if (figure.length === 0) continue
        const cycle = Math.max(1, 2 * figure.length - 2)
        const i = step++ % cycle
        const head = ctx.groups.some((g) => Math.abs(g.start - t) < EPS)
        out.note(t, figure[i < figure.length ? i : cycle - i], vel + (head ? 6 : -4), Math.min(ring, ctx.beats - t) * 0.95)
      }
    },
  }
}

// 打楽器: まとまりの頭を叩く。セクションの最後はロールでつなぐ
function percussion(): Role {
  let hits: boolean[] = []
  let section = -1
  return {
    generate(ctx, out, rng, seat) {
      const s = ctx.section
      if (s.index !== section) {
        section = s.index
        hits = ctx.groups.map((_, i) => i === 0 || rng.chance(0.6))
      }
      const tonic = s.key.tonicIn(seat.lo)
      const fifth = s.key.contains(s.key.tonic + 7) && tonic + 7 <= seat.hi ? tonic + 7 : tonic
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
function bells(): Role {
  return {
    generate(ctx, out, rng, seat) {
      const s = ctx.section
      if (!rng.chance(0.5)) return
      const color = s.key.keysInRange(seat.lo, seat.hi, (d) => s.key.scale.color.includes(d) || d === 0)
      if (color.length === 0) return
      const count = rng.int(1, 2)
      for (let i = 0; i < count; i++) {
        const g = rng.pick(ctx.groups)
        out.note(g.start, rng.pick(color), 42 + rng.range(0, 14), rng.range(2, 4))
      }
    },
  }
}

export function createRoles(): Record<RoleId, Role> {
  const lead = new Lead()
  return {
    bass: bass(),
    melody: { generate: (ctx, out, rng, seat) => lead.generate(ctx, out, rng, seat.lo, seat.hi), melody: () => lead.info },
    counter: counter(lead),
    chords: sustained(2, 48),
    pad: sustained(3, 42),
    ostinato: ostinato(),
    arpeggio: arpeggio(),
    percussion: percussion(),
    bells: bells(),
  }
}
