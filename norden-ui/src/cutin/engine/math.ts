import type { CutInEase } from '../template'

export const TAU = Math.PI * 2
export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/* ================= Easing ================= */

export type EaseFn = (t: number) => number
export type EaseName = 'linear' | 'inQuad' | 'outQuad' | 'inCubic' | 'outCubic' | 'inOutCubic' | 'outQuart' | 'outExpo' | 'inExpo' | 'outBack' | 'outElastic' | 'outBounce'

export const EASE: Record<EaseName, EaseFn> = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: t => {
    const c1 = 1.70158, c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  outElastic: t => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1
  },
  outBounce: t => {
    const n1 = 7.5625, d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75 }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375 }
    t -= 2.625 / d1
    return n1 * t * t + 0.984375
  },
}

/** Easing choices of the template → curves. auto uses the effect's own curve */
const EASING_CHOICES: Record<CutInEase, EaseName | null> = {
  auto: null,
  linear: 'linear',
  smooth: 'inOutCubic',
  out: 'outCubic',
  strong: 'outExpo',
  back: 'outBack',
  elastic: 'outElastic',
  bounce: 'outBounce',
  in: 'inCubic',
}

export function easeFn(choice: CutInEase, fallback: EaseName): EaseFn {
  return EASE[EASING_CHOICES[choice] ?? fallback] ?? EASE.outCubic
}

/* ================= Deterministic random ================= */
// The same time always draws the same picture: randomness comes from the time and the glyph index

export function hash32(a: number, b: number, c: number) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x632be5ab, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

export function rnd(a: number, b = 0, c = 0) {
  return hash32(a, b, c) / 4294967296
}

export function noise1(x: number, seed: number) {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return lerp(rnd(i, seed, 7), rnd(i + 1, seed, 7), u) * 2 - 1
}

export function colorWithAlpha(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return hex
  const v = parseInt(m[1]!, 16)
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${clamp(alpha)})`
}
