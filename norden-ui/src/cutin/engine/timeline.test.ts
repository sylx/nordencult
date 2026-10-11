import { describe, expect, it } from 'vitest'
import { normalizeCutInTemplate } from '../template'
import type { CutInTemplateInput } from '../template'
import { computeLayout } from './layout'
import { buildTimeline } from './timeline'

// jsdom has no canvas: every glyph is as wide as the font size
const measureCtx = {
  font: '10px serif',
  textAlign: 'left',
  textBaseline: 'alphabetic',
  measureText(this: { font: string }, text: string) {
    const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 10)
    return { width: Array.from(text).length * size, actualBoundingBoxAscent: size * 0.8, actualBoundingBoxDescent: size * 0.2 }
  },
} as unknown as CanvasRenderingContext2D

function prepare(input: CutInTemplateInput, W = 1280, H = 720) {
  const scene = normalizeCutInTemplate(input)
  const layout = computeLayout(scene, W, H, {
    ctx: measureCtx,
    mainFont: size => `${size}px serif`,
    subFont: size => `${size}px serif`,
  })
  return { scene, layout, timeline: buildTimeline(scene, layout) }
}

describe('computeLayout', () => {
  it('centers the text on the screen', () => {
    const { layout } = prepare({ text: 'ABCD', fontSize: 100, letterSpacing: 0, deco: { type: 'none' } })
    expect(layout.glyphs).toHaveLength(4)
    expect((layout.box.x0 + layout.box.x1) / 2).toBeCloseTo(640)
    expect((layout.box.y0 + layout.box.y1) / 2).toBeCloseTo(360)
  })

  it('shrinks text that does not fit inside the margins', () => {
    const { layout } = prepare({ text: 'あ'.repeat(30), fontSize: 100, letterSpacing: 0, marginX: 64 })
    expect(layout.fit).toBeLessThan(1)
    expect(layout.box.x1 - layout.box.x0).toBeLessThanOrEqual(1280 - 2 * 64)
  })

  it('places the sub text below the main text', () => {
    const { layout } = prepare({ text: '戦闘開始', subText: 'BATTLE START', subPosition: 'below' })
    expect(layout.subBox).not.toBeNull()
    expect(layout.subBox!.y0).toBeGreaterThan(layout.mainBox.y1)
    expect(layout.glyphs.filter(g => g.group === 1)).toHaveLength('BATTLE START'.length)
  })
})

describe('buildTimeline', () => {
  it('staggers glyph entrances, then holds, then goes out', () => {
    const { timeline } = prepare({ text: 'ABC', inFx: 'rise', inDur: 0.5, inStagger: 0.1, hold: 1, outFx: 'fade', outDur: 0.4, startDelay: 0, endDelay: 0, deco: { type: 'none' } })
    expect(Array.from(timeline.inStart)).toEqual([0, 0.1, 0.2])
    expect(timeline.inEnd).toBeCloseTo(0.7)
    expect(timeline.holdEnd).toBeCloseTo(1.7)
    expect(timeline.end).toBeCloseTo(2.1)
    expect(timeline.duration).toBeCloseTo(2.1)
  })

  it('runs block effects on the whole text', () => {
    const { timeline } = prepare({ text: 'ABC', inFx: 'slam', inDur: 0.8, outFx: 'zoomThrough', outDur: 0.5, hold: 1, startDelay: 0, deco: { type: 'none' } })
    expect(timeline.blockIn).toMatchObject({ start: 0, dur: 0.8 })
    expect(timeline.blockOut).toMatchObject({ start: 1.8, dur: 0.5 })
    expect(Array.from(timeline.inDur)).toEqual([0, 0, 0])
  })

  it('opens band decorations before the text', () => {
    const { timeline } = prepare({ text: 'ABC', startDelay: 0, deco: { type: 'band', anim: 'grow', dur: 0.4 } })
    expect(timeline.decoIn).toEqual({ start: 0, dur: 0.4 })
    expect(timeline.inStart[0]).toBeCloseTo(0.24)
  })

  it('brings the sub text in after the main text', () => {
    const { layout, timeline } = prepare({ text: 'AB', subText: 'CD', inFx: 'fade', inDur: 0.5, subFx: 'fade', subDelay: 0, startDelay: 0, deco: { type: 'none' } })
    const sub = layout.glyphs.filter(g => g.group === 1)
    expect(timeline.inStart[sub[0]!.index]).toBeCloseTo(0.5)
  })

  it('gives every template a finite length', () => {
    const { timeline } = prepare({ text: '', hold: 0 })
    expect(Number.isFinite(timeline.duration)).toBe(true)
    expect(timeline.duration).toBeGreaterThan(0)
  })
})
