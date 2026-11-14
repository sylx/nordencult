/*
 * Glyph sprites: each glyph is drawn once into three layers
 * (glow / shadow + outer outline / outline + fill). Lower layers are cut out by the glyph shape
 * so they do not show through while the glyph fades.
 */
import type { CutInFill, CutInTemplate } from '../template'
import type { Glyph } from './layout'
import { clamp, colorWithAlpha } from './math'

export interface GlyphSprite {
  /** Drawing origin inside the sprite */
  ox: number
  oy: number
  w: number
  h: number
  glow: HTMLCanvasElement | null
  back: HTMLCanvasElement | null
  front: HTMLCanvasElement
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return c
}

export function context2d(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')
  return ctx
}

export function fontString(family: string, weight: number, size: number, italic: boolean) {
  return `${italic ? 'italic ' : ''}${weight || 400} ${Math.max(1, size).toFixed(2)}px ${family || 'sans-serif'}`
}

export interface GroupStyle {
  fill: Pick<CutInFill, 'type' | 'color'> & Partial<CutInFill>
  fillOpacity: number
  stroke1: { w: number; color: string } | null
  stroke2: { w: number; color: string } | null
  shadow: { color: string; blur: number; x: number; y: number } | null
  glow: { color: string; blur: number; strength: number } | null
}

/** Lengths of the template are for its font size: scale them to the laid out size */
export function groupStyle(scene: CutInTemplate, group: 0 | 1, size: number): GroupStyle {
  const k = size / Math.max(1, scene.fontSize || size)
  return {
    fill: group === 1 && scene.subColorOn ? { type: 'solid', color: scene.subColor || '#ffffff' } : scene.fill,
    fillOpacity: clamp(scene.fillOpacity ?? 1),
    stroke1: scene.stroke.on && scene.stroke.width > 0 ? { w: Math.max(0.5, scene.stroke.width * k), color: scene.stroke.color } : null,
    stroke2: scene.stroke2.on && scene.stroke2.width > 0 ? { w: Math.max(0.5, scene.stroke2.width * k), color: scene.stroke2.color } : null,
    shadow: scene.shadow.on ? {
      color: colorWithAlpha(scene.shadow.color, scene.shadow.opacity ?? 0.6),
      blur: Math.max(0, (scene.shadow.blur || 0) * k),
      x: (scene.shadow.x || 0) * k,
      y: (scene.shadow.y || 0) * k,
    } : null,
    glow: scene.glow.on ? {
      color: scene.glow.color,
      blur: Math.max(1, (scene.glow.size || 0) * k),
      strength: clamp(scene.glow.strength ?? 1, 0.1, 4),
    } : null,
  }
}

/** Size of the block and line metrics for gradients */
export interface GradientBox { w: number; h: number; inkA: number; inkD: number }

// Shadows are cast from far outside the canvas so only the shadow lands inside
const SHADOW_OFFSET = 20000

let measureCtx: CanvasRenderingContext2D | null = null

export function buildGlyphSprite(g: Glyph, font: string, style: GroupStyle, gradient: GradientBox): GlyphSprite {
  const mctx = measureCtx ?? (measureCtx = context2d(makeCanvas(8, 8)))
  mctx.font = font
  mctx.textAlign = g.vertical ? 'center' : 'left'
  mctx.textBaseline = g.vertical ? 'middle' : 'alphabetic'
  const m = mctx.measureText(g.ch)
  const size = g.size
  let l = -(Number.isFinite(m.actualBoundingBoxLeft) ? m.actualBoundingBoxLeft : (g.vertical ? size / 2 : 0))
  let r = Number.isFinite(m.actualBoundingBoxRight) ? m.actualBoundingBoxRight : (g.vertical ? size / 2 : m.width)
  let t = -(Number.isFinite(m.actualBoundingBoxAscent) ? m.actualBoundingBoxAscent : (g.vertical ? size / 2 : size * 0.85))
  let b = Number.isFinite(m.actualBoundingBoxDescent) ? m.actualBoundingBoxDescent : (g.vertical ? size / 2 : size * 0.2)
  if (g.rot) { const nl = -b, nr = -t, nt = l, nb = r; l = nl; r = nr; t = nt; b = nb }
  const t1 = style.stroke1 ? style.stroke1.w : 0
  const t2 = style.stroke2 ? style.stroke2.w : 0
  const outline = t1 + t2
  let pad = outline + 3
  if (style.glow) pad = Math.max(pad, outline + style.glow.blur * 1.25 + 4)
  if (style.shadow) pad = Math.max(pad, outline + style.shadow.blur * 1.25 + Math.max(Math.abs(style.shadow.x), Math.abs(style.shadow.y)) + 4)
  pad = Math.ceil(pad)
  const w = Math.min(4096, Math.ceil(r - l + pad * 2))
  const h = Math.min(4096, Math.ceil(b - t + pad * 2))
  const ox = pad - l
  const oy = pad - t

  const place = (c: CanvasRenderingContext2D, shiftX = 0, shiftY = 0) => {
    c.setTransform(1, 0, 0, 1, ox + shiftX, oy + shiftY)
    if (g.rot) c.rotate(Math.PI / 2)
    c.font = font
    c.textAlign = g.vertical ? 'center' : 'left'
    c.textBaseline = g.vertical ? 'middle' : 'alphabetic'
    c.lineJoin = 'round'
    c.lineCap = 'round'
    c.miterLimit = 2
  }
  const silhouette = (c: CanvasRenderingContext2D, strokeW: number) => {
    c.fillText(g.ch, 0, 0)
    if (strokeW > 0) { c.lineWidth = strokeW * 2; c.strokeText(g.ch, 0, 0) }
  }
  const cutOut = (c: CanvasRenderingContext2D, strokeW: number) => {
    c.save()
    place(c)
    c.globalCompositeOperation = 'destination-out'
    c.fillStyle = '#000'
    c.strokeStyle = '#000'
    silhouette(c, strokeW)
    c.restore()
  }

  let glow: HTMLCanvasElement | null = null
  if (style.glow) {
    const c = context2d(makeCanvas(w, h))
    const passes = Math.ceil(style.glow.strength)
    for (let i = 0; i < passes; i++) {
      c.save()
      place(c, -SHADOW_OFFSET, 0)
      c.shadowColor = style.glow.color
      c.shadowBlur = style.glow.blur
      c.shadowOffsetX = SHADOW_OFFSET
      c.globalAlpha = i === passes - 1 ? (style.glow.strength - (passes - 1)) : 1
      c.fillStyle = '#000'
      c.strokeStyle = '#000'
      silhouette(c, outline)
      c.restore()
    }
    cutOut(c, outline)
    glow = c.canvas
  }

  let back: HTMLCanvasElement | null = null
  if (style.shadow || style.stroke2) {
    const c = context2d(makeCanvas(w, h))
    if (style.shadow) {
      c.save()
      place(c, -SHADOW_OFFSET, 0)
      c.shadowColor = style.shadow.color
      c.shadowBlur = style.shadow.blur
      c.shadowOffsetX = SHADOW_OFFSET + style.shadow.x
      c.shadowOffsetY = style.shadow.y
      c.fillStyle = '#000'
      c.strokeStyle = '#000'
      silhouette(c, outline)
      c.restore()
    }
    if (style.stroke2) {
      c.save()
      place(c)
      c.strokeStyle = style.stroke2.color
      c.lineWidth = outline * 2
      c.strokeText(g.ch, 0, 0)
      c.restore()
    }
    cutOut(c, t1)
    back = c.canvas
  }

  const c = context2d(makeCanvas(w, h))
  if (style.stroke1) {
    c.save()
    place(c)
    c.strokeStyle = style.stroke1.color
    c.lineWidth = t1 * 2
    c.strokeText(g.ch, 0, 0)
    if (style.fillOpacity < 1) {
      c.globalCompositeOperation = 'destination-out'
      c.fillStyle = '#000'
      c.fillText(g.ch, 0, 0)
    }
    c.restore()
  }
  c.save()
  place(c)
  c.globalAlpha = style.fillOpacity
  c.fillStyle = makeFillStyle(c, style.fill, g, gradient, ox, oy)
  c.fillText(g.ch, 0, 0)
  c.restore()
  return { ox, oy, w, h, glow, back, front: c.canvas }
}

// Gradients are given in sprite pixels, then turned back for rotated glyphs
function makeFillStyle(c: CanvasRenderingContext2D, fill: GroupStyle['fill'], g: Glyph, gradient: GradientBox, ox: number, oy: number) {
  if (fill.type !== 'gradient') return fill.color || '#ffffff'
  const colors = [fill.color, fill.color2, fill.color3].filter((color): color is string => Boolean(color))
  if (colors.length < 2) return colors[0] || '#ffffff'
  let x0: number, y0: number, x1: number, y1: number
  if (fill.dir === 'h' || fill.dir === 'd') {
    const left = ox - g.bx, top = oy - g.by
    if (fill.dir === 'h') { x0 = left; y0 = 0; x1 = left + gradient.w; y1 = 0 }
    else { x0 = left; y0 = top; x1 = left + gradient.w; y1 = top + gradient.h }
  } else if (g.vertical) {
    x0 = 0; x1 = 0; y0 = oy - g.size * 0.5; y1 = oy + g.size * 0.5
  } else {
    x0 = 0; x1 = 0; y0 = oy - gradient.inkA; y1 = oy + gradient.inkD
  }
  const toLocal = (X: number, Y: number) => {
    const dx = X - ox, dy = Y - oy
    return g.rot ? [dy, -dx] as const : [dx, dy] as const
  }
  const [a0, b0] = toLocal(x0, y0)
  const [a1, b1] = toLocal(x1, y1)
  const grad = c.createLinearGradient(a0, b0, a1 === a0 && b1 === b0 ? a1 + 0.01 : a1, b1)
  colors.forEach((color, i) => grad.addColorStop(i / (colors.length - 1), color))
  return grad
}
