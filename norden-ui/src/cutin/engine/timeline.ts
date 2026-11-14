/*
 * Timeline: when each glyph, the block, the decoration and the background come in and go out
 */
import type { CutInOrder, CutInTemplate } from '../template'
import { IN_EFFECTS, OUT_EFFECTS } from './effects'
import type { EffectDef } from './effects'
import type { CutInLayout } from './layout'
import { rnd } from './math'

interface Span { start: number; dur: number }
export interface BlockSpan extends Span { fx: EffectDef }

export interface CutInTimeline {
  inStart: Float64Array
  inDur: Float64Array
  outStart: Float64Array
  outDur: Float64Array
  inFx: (EffectDef | null)[]
  outFx: (EffectDef | null)[]
  blockIn: BlockSpan | null
  blockOut: BlockSpan | null
  decoIn: Span | null
  decoOut: Span
  bgIn: Span
  bgOut: Span
  start: number
  /** The text has come in */
  inEnd: number
  /** The text starts to go out */
  holdEnd: number
  /** The text has gone out */
  outEnd: number
  /** Text, decoration and background have gone */
  end: number
  /** The whole cut-in including the blank time after it */
  duration: number
}

function orderRanks(count: number, order: CutInOrder, seed: number) {
  const ranks = new Array<number>(count)
  const c = (count - 1) / 2
  if (order === 'reverse') for (let i = 0; i < count; i++) ranks[i] = count - 1 - i
  else if (order === 'center') for (let i = 0; i < count; i++) ranks[i] = Math.floor(Math.abs(i - c) + 1e-9)
  else if (order === 'edges') {
    const maxLevel = Math.floor(c + 1e-9)
    for (let i = 0; i < count; i++) ranks[i] = maxLevel - Math.floor(Math.abs(i - c) + 1e-9)
  } else if (order === 'random') {
    const idx = Array.from({ length: count }, (_, i) => i)
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(rnd(seed, i, 77) * (i + 1))
      ;[idx[i], idx[j]] = [idx[j]!, idx[i]!]
    }
    idx.forEach((glyphIndex, rank) => { ranks[glyphIndex] = rank })
  } else for (let i = 0; i < count; i++) ranks[i] = i
  return ranks
}

export function buildTimeline(scene: CutInTemplate, layout: CutInLayout): CutInTimeline {
  const glyphs = layout.glyphs
  const n = glyphs.length
  const T = {
    inStart: new Float64Array(n).fill(Infinity),
    inDur: new Float64Array(n),
    outStart: new Float64Array(n).fill(Infinity),
    outDur: new Float64Array(n),
    inFx: new Array<EffectDef | null>(n).fill(null),
    outFx: new Array<EffectDef | null>(n).fill(null),
  }
  const t0 = Math.max(0, scene.startDelay || 0)
  const deco = scene.deco
  const decoAnimated = deco.type !== 'none' && deco.anim !== 'none'
  const decoDur = decoAnimated ? Math.max(0.05, deco.dur || 0.4) : 0
  const inDef = IN_EFFECTS[scene.inFx] ?? IN_EFFECTS.fade
  const outDef = OUT_EFFECTS[scene.outFx] ?? OUT_EFFECTS.fade
  const inDur = Math.max(0, scene.inDur ?? inDef.dur)
  const outDur = Math.max(0, scene.outDur ?? outDef.dur)
  const hold = Math.max(0, scene.hold ?? 1)
  const bgDur = Math.max(0.3, decoDur || 0.4)

  // Band, tape, frame and box open before the text
  const opensFirst = ['band', 'tape', 'frame', 'box'].includes(deco.type)
  const lead = decoAnimated && opensFirst ? Math.min(0.3, decoDur * 0.6) : 0
  const textStart = t0 + lead
  const decoIn = decoAnimated ? { start: t0, dur: decoDur } : null
  const mainG = glyphs.filter(g => g.group === 0)
  const subG = glyphs.filter(g => g.group === 1)
  let inEnd = textStart
  let blockIn: BlockSpan | null = null

  if (inDef.level === 'block') {
    blockIn = { fx: inDef, start: textStart, dur: Math.max(0.05, inDur) }
    mainG.forEach(g => { T.inStart[g.index] = textStart; T.inDur[g.index] = 0 })
    inEnd = textStart + Math.max(0.05, inDur)
  } else {
    const vis = mainG.filter(g => !g.blank)
    const ranks = orderRanks(vis.length, scene.inOrder, 17)
    const typewriter = inDef.id === 'typewriter'
    const stagger = typewriter ? Math.max(0.01, scene.inStagger || 0.08) : Math.max(0, scene.inStagger || 0)
    const dur = typewriter ? 0 : inDur
    vis.forEach((g, i) => {
      T.inStart[g.index] = textStart + ranks[i]! * stagger
      T.inDur[g.index] = dur
      T.inFx[g.index] = inDef
      inEnd = Math.max(inEnd, T.inStart[g.index]! + dur)
    })
  }
  if (subG.length) {
    const subFxId = scene.subFx || 'same'
    const subVis = subG.filter(g => !g.blank)
    if (subFxId === 'same' && blockIn) {
      subG.forEach(g => { T.inStart[g.index] = textStart; T.inDur[g.index] = 0 })
    } else {
      const own = subFxId === 'same' ? null : IN_EFFECTS[subFxId]
      const fx = subFxId === 'same' ? inDef : (own?.level === 'glyph' ? own : IN_EFFECTS.fade)
      const subStart = Math.max(textStart, inEnd + (scene.subDelay ?? -0.2))
      const ranks = orderRanks(subVis.length, subFxId === 'same' ? scene.inOrder : 'forward', 31)
      const baseStagger = subFxId === 'same' ? Math.min(scene.inStagger || 0, 0.05) : 0.035
      const stagger = fx.id === 'typewriter' ? 0.05 : (subFxId === 'fade' ? 0 : baseStagger)
      const dur = fx.id === 'typewriter' ? 0 : (subFxId === 'same' ? inDur : fx.dur)
      let subEnd = subStart
      subVis.forEach((g, i) => {
        T.inStart[g.index] = subStart + ranks[i]! * stagger
        T.inDur[g.index] = dur
        T.inFx[g.index] = fx
        subEnd = Math.max(subEnd, T.inStart[g.index]! + dur)
      })
      inEnd = Math.max(inEnd, subEnd)
    }
  }
  // Blanks are not drawn: treat them as present from the start
  glyphs.forEach(g => {
    if (!Number.isFinite(T.inStart[g.index])) { T.inStart[g.index] = textStart; T.inDur[g.index] = 0 }
  })

  const holdEnd = inEnd + hold
  let outEnd = holdEnd
  let blockOut: BlockSpan | null = null
  if (outDef.level === 'block') {
    const dur = Math.max(0.05, outDur)
    blockOut = { fx: outDef, start: holdEnd, dur }
    outEnd = holdEnd + dur
    glyphs.forEach(g => { T.outStart[g.index] = outEnd; T.outDur[g.index] = 0 })
  } else {
    const erase = outDef.id === 'erase'
    const dur = erase ? 0 : outDur
    ;[mainG, subG].forEach((list, gi) => {
      const vis = list.filter(g => !g.blank)
      // Erasing goes from the end, like a backspace
      const order = erase && scene.outOrder === 'forward' ? 'reverse' : scene.outOrder
      const ranks = orderRanks(vis.length, order, 53 + gi)
      const stagger = erase ? Math.max(0.01, scene.outStagger || 0.06) : Math.max(0, scene.outStagger || 0)
      vis.forEach((g, i) => {
        T.outStart[g.index] = holdEnd + ranks[i]! * stagger
        T.outDur[g.index] = dur
        T.outFx[g.index] = outDef
        outEnd = Math.max(outEnd, T.outStart[g.index]! + dur)
      })
      list.filter(g => g.blank).forEach(g => { T.outStart[g.index] = holdEnd; T.outDur[g.index] = 0 })
    })
  }

  let end = outEnd
  let decoOut: Span
  if (decoAnimated) {
    decoOut = { start: holdEnd + Math.max(0, outEnd - holdEnd) * 0.35, dur: decoDur }
    end = Math.max(end, decoOut.start + decoDur)
  } else {
    decoOut = { start: outEnd, dur: 0 }
  }
  return {
    ...T, blockIn, blockOut, decoIn, decoOut,
    bgIn: { start: t0, dur: bgDur },
    bgOut: { start: Math.max(t0, end - bgDur), dur: bgDur },
    start: t0, inEnd, holdEnd, outEnd, end,
    duration: Math.max(0.2, end + Math.max(0, scene.endDelay || 0)),
  }
}
