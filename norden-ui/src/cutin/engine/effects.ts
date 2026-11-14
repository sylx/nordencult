/*
 * Effects: per glyph, on the whole block, and while the text is shown
 */
import type { CutInDir, CutInHoldFx, CutInInFx, CutInOutFx } from '../template'
import { clamp, EASE, lerp, noise1, rnd, TAU } from './math'
import type { EaseFn, EaseName } from './math'
import type { Glyph } from './layout'

/** State of one glyph */
export interface GlyphState { a: number; x: number; y: number; s: number; sx: number; sy: number; r: number; blur: number }

export interface WipeMask { dir: CutInDir; p: number; out: boolean }

/** State of the whole block */
export interface BlockState extends GlyphState {
  bright: number
  glitch: number
  mask: WipeMask | null
  glowMul: number
  /** Alpha of the text layer (decoration not included) */
  layerAlpha: number
}

export interface GlyphInfo { vertical: boolean; dir: CutInDir; size: number; ease: EaseFn | null }
export interface BlockInfo { size: number; t: number; dir: CutInDir; seed: number }

/** st: state, e: eased progress, p: raw progress, g: glyph, k: strength */
type GlyphFn = (st: GlyphState, e: number, p: number, g: Glyph, k: number, info: GlyphInfo) => void
type BlockFn = (bs: BlockState, e: number, p: number, k: number, info: BlockInfo) => void

export interface EffectDef {
  id: string
  level: 'glyph' | 'block'
  ease: EaseName
  dur: number
  stagger?: number
  dirs?: readonly CutInDir[]
  glyph?: GlyphFn
  block?: BlockFn
}

// "Spread from center": glyphs stack loosely around the middle of the line, then spread to their places.
// They are offset by SPREAD_LOOSE of the distance to their place, up to SPREAD_REACH glyph sizes from the center
const SPREAD_LOOSE = 0.2
const SPREAD_REACH = 0.9
// Hold "blink": the period (s) and the share of it the text is on
const BLINK_PERIOD = 0.5
const BLINK_ON = 0.6

const SLIDE_DIRS = ['left', 'right', 'up', 'down'] as const
const WIPE_DIRS = ['lr', 'rl', 'tb', 'bt', 'center'] as const
const SHUTTER_DIRS = ['v', 'h'] as const

function spreadLoose(reach: number, size: number) {
  return reach > 0 ? Math.min(SPREAD_LOOSE, SPREAD_REACH * size / reach) : SPREAD_LOOSE
}

// While stacked, lines with many glyphs are fainter so the stack shows through
function stackAlpha(g: Glyph) {
  return clamp(1.8 / Math.sqrt(Math.max(1, g.lineCount || 1)), 0.3, 1)
}

function flickerCurve(p: number, seed: number) {
  if (p >= 1) return 1
  if (p <= 0) return 0
  const step = Math.floor(p * 16)
  const on = rnd(step, seed, 13) < 0.25 + p * 0.85
  return on ? 0.35 + 0.65 * p : 0.05 * p
}

function slide(st: GlyphState, d: number, dir: CutInDir) {
  if (dir === 'left') st.x -= d
  else if (dir === 'right') st.x += d
  else if (dir === 'up') st.y -= d
  else st.y += d
}

export const IN_EFFECTS: Record<CutInInFx, EffectDef> = {
  fade: { id: 'fade', level: 'glyph', ease: 'outCubic', dur: 0.6, stagger: 0,
    glyph(st, e) { st.a *= e } },
  rise: { id: 'rise', level: 'glyph', ease: 'outCubic', dur: 0.8, stagger: 0.06,
    glyph(st, e, _p, g, k) { st.a *= e; st.y += (1 - e) * 0.55 * g.size * k } },
  drop: { id: 'drop', level: 'glyph', ease: 'outCubic', dur: 0.8, stagger: 0.06,
    glyph(st, e, _p, g, k) { st.a *= e; st.y -= (1 - e) * 0.55 * g.size * k } },
  converge: { id: 'converge', level: 'glyph', ease: 'outCubic', dur: 0.9, stagger: 0.1,
    glyph(st, e, _p, g, k, info) {
      const d = (1 - e) * 0.6 * g.size * k * (g.parity ? 1 : -1)
      if (info.vertical) st.x -= d; else st.y += d
      st.a *= e
    } },
  slide: { id: 'slide', level: 'glyph', ease: 'outCubic', dur: 0.7, stagger: 0.04, dirs: SLIDE_DIRS,
    glyph(st, e, _p, g, k, info) { slide(st, (1 - e) * 1.1 * g.size * k, info.dir); st.a *= e } },
  tracking: { id: 'tracking', level: 'glyph', ease: 'outCubic', dur: 1.4, stagger: 0,
    glyph(st, e, _p, g, k, info) {
      const d = g.lineOffset * (1 - e) * 1.6 * k
      if (info.vertical) st.y += d; else st.x += d
      st.a *= e
    } },
  // Glyphs of a line stack (loosely) at its center, stay a moment, then spread along the line
  spread: { id: 'spread', level: 'glyph', ease: 'outQuart', dur: 1.3, stagger: 0,
    glyph(st, _e, p, g, k, info) {
      const appear = clamp(p / 0.18)
      const q = clamp((p - 0.42) / 0.58)
      const m = info.ease ? info.ease(q) : EASE.outQuart(q)
      const d = -g.lineOffset * (1 - m) * (1 - spreadLoose(g.lineReach, g.size))
      if (info.vertical) st.y += d; else st.x += d
      st.a *= EASE.outQuad(appear) * lerp(stackAlpha(g), 1, m)
      st.s *= 1 + 0.25 * k * (1 - EASE.outCubic(appear))
    } },
  blurIn: { id: 'blurIn', level: 'glyph', ease: 'outCubic', dur: 0.8, stagger: 0.05,
    glyph(st, e, _p, g, k) { st.blur += (1 - e) * 0.28 * g.size * k; st.a *= e } },
  pop: { id: 'pop', level: 'glyph', ease: 'outBack', dur: 0.5, stagger: 0.07,
    glyph(st, e, p) { st.s *= Math.max(0.001, e); st.a *= clamp(p * 3) } },
  shrinkIn: { id: 'shrinkIn', level: 'glyph', ease: 'outCubic', dur: 0.55, stagger: 0.06,
    glyph(st, e, _p, _g, k) { st.s *= 1 + (1 - e) * 1.6 * k; st.a *= e } },
  spin: { id: 'spin', level: 'glyph', ease: 'outCubic', dur: 0.8, stagger: 0.06,
    glyph(st, e, _p, _g, k) { st.r += (1 - e) * -Math.PI * 0.8 * k; st.s *= 0.3 + 0.7 * e; st.a *= e } },
  flip: { id: 'flip', level: 'glyph', ease: 'outBack', dur: 0.6, stagger: 0.06,
    glyph(st, e, p, _g, _k, info) {
      if (info.vertical) st.sx *= Math.max(0.001, e); else st.sy *= Math.max(0.001, e)
      st.a *= clamp(p * 2.5)
    } },
  bounce: { id: 'bounce', level: 'glyph', ease: 'outBounce', dur: 0.9, stagger: 0.07,
    glyph(st, e, p, g, k) { st.y -= (1 - e) * 1.3 * g.size * k; st.a *= clamp(p * 6) } },
  scatter: { id: 'scatter', level: 'glyph', ease: 'outCubic', dur: 1.1, stagger: 0.02,
    glyph(st, e, _p, g, k) {
      const ang = g.r1 * TAU
      const dist = (1.4 + g.r2 * 1.8) * g.size * k * (1 - e)
      st.x += Math.cos(ang) * dist
      st.y += Math.sin(ang) * dist
      st.r += (g.r3 - 0.5) * 2.4 * (1 - e)
      st.a *= e
    } },
  typewriter: { id: 'typewriter', level: 'glyph', ease: 'linear', dur: 0, stagger: 0.08,
    glyph() {} },
  flicker: { id: 'flicker', level: 'glyph', ease: 'linear', dur: 0.9, stagger: 0.05,
    glyph(st, _e, p, g) { st.a *= flickerCurve(p, g.seed) } },
  slam: { id: 'slam', level: 'block', ease: 'linear', dur: 0.75,
    block(bs, _e, p, k, info) {
      const impact = 0.4
      if (p < impact) {
        const q = p / impact
        bs.s *= 1 + (1 - q * q) * 2.4 * k
        bs.a *= clamp(q * 2.2)
        bs.blur += (1 - q) * 0.04 * info.size
      } else {
        const q = (p - impact) / (1 - impact)
        const decay = Math.pow(1 - q, 2)
        bs.s *= 1 + Math.sin(q * Math.PI * 3) * 0.05 * decay * k
        const amp = 0.08 * info.size * decay * k
        bs.x += noise1(info.t * 42, 11) * amp
        bs.y += noise1(info.t * 42, 29) * amp
        bs.bright = Math.max(bs.bright, Math.pow(1 - q, 3) * 0.85)
      }
    } },
  zoomIn: { id: 'zoomIn', level: 'block', ease: 'outCubic', dur: 0.9,
    block(bs, e, _p, k, info) { bs.s *= 1 + (1 - e) * 0.9 * k; bs.a *= e; bs.blur += (1 - e) * 0.1 * info.size * k } },
  emerge: { id: 'emerge', level: 'block', ease: 'outCubic', dur: 0.9,
    block(bs, e, _p, k) { bs.s *= Math.max(0.05, 1 - (1 - e) * 0.6 * k); bs.a *= e } },
  wipe: { id: 'wipe', level: 'block', ease: 'inOutCubic', dur: 0.9, dirs: WIPE_DIRS,
    block(bs, e, _p, _k, info) { bs.mask = { dir: info.dir, p: e, out: false } } },
  shutter: { id: 'shutter', level: 'block', ease: 'outExpo', dur: 0.6, dirs: SHUTTER_DIRS,
    block(bs, e, _p, _k, info) {
      if (info.dir === 'h') bs.sx *= Math.max(0.001, e); else bs.sy *= Math.max(0.001, e)
      bs.a *= clamp(e * 1.6)
    } },
  glitch: { id: 'glitch', level: 'block', ease: 'linear', dur: 0.9,
    block(bs, _e, p, k, info) {
      const frame = Math.floor(info.t * 24)
      bs.glitch = Math.max(bs.glitch, (1 - p) * k)
      bs.a *= p > 0.8 ? 1 : (rnd(frame, 3, info.seed) < 0.3 + 0.6 * p ? 1 : 0.12)
      bs.x += (rnd(frame, 7, info.seed) - 0.5) * 0.18 * info.size * (1 - p) * k
    } },
  flash: { id: 'flash', level: 'block', ease: 'outCubic', dur: 0.8,
    block(bs, e, p) { bs.a *= clamp(p * 5); bs.bright = Math.max(bs.bright, 1 - e); bs.glowMul *= 1 + (1 - e) * 1.5 } },
}

export const OUT_EFFECTS: Record<CutInOutFx, EffectDef> = {
  fade: { id: 'fade', level: 'glyph', ease: 'inCubic', dur: 0.6, stagger: 0,
    glyph(st, e) { st.a *= 1 - e } },
  rise: { id: 'rise', level: 'glyph', ease: 'inCubic', dur: 0.8, stagger: 0.04,
    glyph(st, e, _p, g, k) { st.a *= 1 - e; st.y -= e * 0.55 * g.size * k } },
  sink: { id: 'sink', level: 'glyph', ease: 'inCubic', dur: 0.8, stagger: 0.04,
    glyph(st, e, _p, g, k) { st.a *= 1 - e; st.y += e * 0.55 * g.size * k } },
  diverge: { id: 'diverge', level: 'glyph', ease: 'inCubic', dur: 0.8, stagger: 0.06,
    glyph(st, e, _p, g, k, info) {
      const d = e * 0.6 * g.size * k * (g.parity ? 1 : -1)
      if (info.vertical) st.x -= d; else st.y += d
      st.a *= 1 - e
    } },
  slide: { id: 'slide', level: 'glyph', ease: 'inCubic', dur: 0.7, stagger: 0.03, dirs: SLIDE_DIRS,
    glyph(st, e, _p, g, k, info) { slide(st, e * 1.1 * g.size * k, info.dir); st.a *= 1 - e } },
  tracking: { id: 'tracking', level: 'glyph', ease: 'inCubic', dur: 1.2, stagger: 0,
    glyph(st, e, _p, g, k, info) {
      const d = g.lineOffset * e * 1.6 * k
      if (info.vertical) st.y += d; else st.x += d
      st.a *= 1 - e
    } },
  blurOut: { id: 'blurOut', level: 'glyph', ease: 'inCubic', dur: 0.8, stagger: 0.03,
    glyph(st, e, _p, g, k) { st.blur += e * 0.28 * g.size * k; st.a *= 1 - e } },
  growOut: { id: 'growOut', level: 'glyph', ease: 'inCubic', dur: 0.6, stagger: 0.04,
    glyph(st, e, _p, _g, k) { st.s *= 1 + e * 1.3 * k; st.a *= 1 - e } },
  shrink: { id: 'shrink', level: 'glyph', ease: 'inCubic', dur: 0.6, stagger: 0.04,
    glyph(st, e) { st.s *= Math.max(0.001, 1 - e * 0.95); st.a *= 1 - e * e } },
  scatter: { id: 'scatter', level: 'glyph', ease: 'inCubic', dur: 1.0, stagger: 0.02,
    glyph(st, e, _p, g, k) {
      const ang = g.r1 * TAU
      const dist = (1.4 + g.r2 * 1.8) * g.size * k * e
      st.x += Math.cos(ang) * dist
      st.y += Math.sin(ang) * dist
      st.r += (g.r3 - 0.5) * 2.4 * e
      st.a *= 1 - e
    } },
  erase: { id: 'erase', level: 'glyph', ease: 'linear', dur: 0, stagger: 0.06 },
  flicker: { id: 'flicker', level: 'glyph', ease: 'linear', dur: 0.8, stagger: 0.04,
    glyph(st, _e, p, g) { st.a *= flickerCurve(1 - p, g.seed + 101) } },
  zoomThrough: { id: 'zoomThrough', level: 'block', ease: 'inCubic', dur: 0.6,
    block(bs, e, _p, k, info) { bs.s *= 1 + e * 0.9 * k; bs.a *= 1 - e; bs.blur += e * 0.1 * info.size * k } },
  recede: { id: 'recede', level: 'block', ease: 'inCubic', dur: 0.7,
    block(bs, e, _p, k) { bs.s *= Math.max(0.05, 1 - e * 0.6 * k); bs.a *= 1 - e } },
  wipe: { id: 'wipe', level: 'block', ease: 'inOutCubic', dur: 0.8, dirs: WIPE_DIRS,
    block(bs, e, _p, _k, info) { bs.mask = { dir: info.dir, p: e, out: true } } },
  shutter: { id: 'shutter', level: 'block', ease: 'inExpo', dur: 0.5, dirs: SHUTTER_DIRS,
    block(bs, e, _p, _k, info) {
      if (info.dir === 'h') bs.sx *= Math.max(0.001, 1 - e); else bs.sy *= Math.max(0.001, 1 - e)
      bs.a *= clamp((1 - e) * 1.6)
    } },
  glitch: { id: 'glitch', level: 'block', ease: 'linear', dur: 0.8,
    block(bs, _e, p, k, info) {
      const frame = Math.floor(info.t * 24)
      bs.glitch = Math.max(bs.glitch, p * k)
      bs.a *= (1 - Math.pow(p, 3)) * (p < 0.15 ? 1 : (rnd(frame, 5, info.seed) < 0.85 - 0.6 * p ? 1 : 0.1))
      bs.x += (rnd(frame, 9, info.seed) - 0.5) * 0.18 * info.size * p * k
    } },
}

interface HoldInfo { size: number; seed: number; since: number }
export interface HoldDef {
  glyph?: (st: GlyphState, t: number, g: Glyph, k: number) => void
  block?: (bs: BlockState, t: number, k: number, info: HoldInfo) => void
}

export const HOLD_EFFECTS: Record<CutInHoldFx, HoldDef> = {
  none: {},
  float: { block(bs, t, k, info) { bs.y += Math.sin(TAU * t / 2.6) * 0.05 * info.size * k } },
  wave: { glyph(st, t, g, k) { st.y += Math.sin(TAU * t / 1.6 - g.vis * 0.6) * 0.07 * g.size * k } },
  pulse: { block(bs, t, k) {
    const c = (t % 1.1) / 1.1
    const beat = Math.exp(-Math.pow((c - 0.1) / 0.06, 2)) + 0.6 * Math.exp(-Math.pow((c - 0.3) / 0.06, 2))
    bs.s *= 1 + beat * 0.035 * k
  } },
  shake: { block(bs, t, k, info) {
    const f = Math.floor(t * 20)
    bs.x += (rnd(f, 1, info.seed) - 0.5) * 0.05 * info.size * k
    bs.y += (rnd(f, 2, info.seed) - 0.5) * 0.05 * info.size * k
  } },
  glow: { block(bs, t, k) { bs.glowMul *= clamp(1 - 0.45 * k * (0.5 + 0.5 * Math.cos(TAU * t / 1.8)), 0, 2) } },
  flicker: { block(bs, t, k, info) {
    const f = Math.floor(t * 12)
    if (rnd(f, 5, info.seed) < 0.09 * k) bs.layerAlpha *= 0.2 + rnd(f, 6, info.seed) * 0.35
  } },
  // Blink at a fixed period once the text is in (the decoration stays). The strength sets how faint it goes
  blink: { block(bs, _t, k, info) {
    if (info.since < 0) return
    const c = (info.since % BLINK_PERIOD) / BLINK_PERIOD
    if (c >= BLINK_ON) bs.layerAlpha *= clamp(1 - 0.85 * k)
  } },
  glitch: { block(bs, t, k) {
    const c = t % 1.7
    if (c < 0.14) bs.glitch = Math.max(bs.glitch, 0.55 * k)
  } },
}

/** The direction if the effect has it, otherwise the effect's first direction */
export function dirFor(fx: EffectDef | null | undefined, dir: CutInDir): CutInDir {
  if (!fx?.dirs) return dir
  return fx.dirs.includes(dir) ? dir : fx.dirs[0]!
}
