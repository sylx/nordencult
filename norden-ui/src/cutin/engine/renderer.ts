/*
 * Drawing a cut-in at a given time. The same time always draws the same picture.
 */
import { CUTIN_BASE_HEIGHT, CUTIN_BASE_WIDTH } from '../template'
import type { CutInTemplate } from '../template'
import { dirFor, HOLD_EFFECTS } from './effects'
import type { BlockState, GlyphInfo, GlyphState, WipeMask } from './effects'
import { computeLayout } from './layout'
import type { Box, CutInLayout, Glyph } from './layout'
import { clamp, colorWithAlpha, EASE, easeFn, lerp, rnd } from './math'
import { buildGlyphSprite, context2d, fontString, groupStyle, makeCanvas } from './sprite'
import type { GlyphSprite } from './sprite'
import { buildTimeline } from './timeline'
import type { CutInTimeline } from './timeline'

export interface PreparedCutIn {
  scene: CutInTemplate
  layout: CutInLayout
  timeline: CutInTimeline
}

type Matrix = [number, number, number, number, number, number]
interface DrawItem { g: Glyph; a: number; x: number; y: number; s: number; sx: number; sy: number; r: number; blur: number }
interface Rect { x: number; y: number; w: number; h: number }

let filterSupported: boolean | null = null
function supportsFilter() {
  if (filterSupported === null) {
    try {
      const c = document.createElement('canvas').getContext('2d')
      if (c) c.filter = 'blur(2px)'
      filterSupported = c?.filter === 'blur(2px)'
    } catch {
      filterSupported = false
    }
  }
  return filterSupported
}

// Caution tape blink: dims briefly every 0.5 s (1 = darkest). phase shifts it within the period
function tapeBlinkWave(t: number, phase: number) {
  const p = (((t / 0.5) + phase) % 1 + 1) % 1
  const smooth = (a: number, b: number, x: number) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k) }
  return smooth(0.55, 0.62, p) * (1 - smooth(0.9, 0.97, p))
}

/**
 * Logical screen for a host of width×height CSS pixels. The template is designed at 1280×720:
 * `unit` CSS pixels per logical pixel keeps it fitting, and the longer side of W×H grows with the host
 */
export function cutInViewport(width: number, height: number) {
  const unit = Math.max(1e-3, Math.min(width / CUTIN_BASE_WIDTH, height / CUTIN_BASE_HEIGHT))
  return { unit, W: width / unit, H: height / unit }
}

export function fontsFor(scene: CutInTemplate) {
  const subFamily = scene.subFontFamily || scene.fontFamily
  return {
    mainFont: (size: number) => fontString(scene.fontFamily, scene.weight || 700, size, scene.italic),
    subFont: (size: number) => fontString(subFamily, scene.subWeight || scene.weight || 700, size, scene.subItalic),
  }
}

/**
 * Lays out a template for a screen size, then draws any time of it.
 * Glyph sprites are kept while only the motion changes.
 */
export class CutInRenderer {
  private layer = makeCanvas(8, 8)
  private lctx = context2d(this.layer)
  private tmpA = makeCanvas(8, 8)
  private tmpB = makeCanvas(8, 8)
  private blurTmp = makeCanvas(8, 8)
  private bandCanvas = makeCanvas(8, 8)
  private bandKey = ''
  private measure = context2d(makeCanvas(8, 8))
  private spriteKey = ''
  private sprites: (GlyphSprite | null)[] | null = null
  private fontEpoch = 0
  private st: GlyphState = { a: 1, x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, blur: 0 }
  prepared: PreparedCutIn | null = null

  /** Lay out the template on a W×H logical screen */
  prepare(scene: CutInTemplate, W: number, H: number): PreparedCutIn {
    const fonts = fontsFor(scene)
    const layout = computeLayout(scene, W, H, { ctx: this.measure, ...fonts })
    const timeline = buildTimeline(scene, layout)
    const d = scene.deco
    const spriteKey = JSON.stringify([
      scene.text, scene.subText, W, H, scene.fontFamily, scene.subFontFamily, scene.weight, scene.subWeight, scene.italic, scene.subItalic,
      scene.fontSize, scene.letterSpacing, scene.subLetterSpacing, scene.lineHeight, scene.subSize, scene.subGap, scene.subPosition,
      scene.writing, scene.align, scene.anchor, scene.marginX, scene.marginY, scene.offsetX, scene.offsetY, scene.autoFit,
      scene.fill, scene.fillOpacity, scene.stroke, scene.stroke2, scene.shadow, scene.glow, scene.subColorOn, scene.subColor,
      d.type, d.pad, d.extend, d.thickness, d.tapeSize, this.fontEpoch,
    ])
    if (spriteKey !== this.spriteKey || !this.sprites) {
      this.sprites = this.buildSprites(scene, layout, fonts)
      this.spriteKey = spriteKey
    } else {
      layout.glyphs.forEach((g, i) => { g.sprite = this.sprites![i] ?? null })
    }
    this.prepared = { scene, layout, timeline }
    return this.prepared
  }

  /** Redraw the glyphs on the next prepare (after fonts have loaded) */
  invalidateSprites() {
    this.spriteKey = ''
    this.fontEpoch++
  }

  private buildSprites(scene: CutInTemplate, layout: CutInLayout, fonts: ReturnType<typeof fontsFor>) {
    const cache = new Map<string, GlyphSprite>()
    const list = new Array<GlyphSprite | null>(layout.glyphs.length).fill(null)
    const posDependent = scene.fill.type === 'gradient' && (scene.fill.dir === 'h' || scene.fill.dir === 'd')
    const box = layout.box
    layout.glyphs.forEach((g, i) => {
      if (g.blank) return
      const size = g.size
      const font = g.group === 1 ? fonts.subFont(size) : fonts.mainFont(size)
      const metrics = g.group === 1 ? layout.subMetrics : layout.mainMetrics
      const gradient = { w: box.x1 - box.x0, h: box.y1 - box.y0, inkA: metrics ? metrics.inkA : size * 0.8, inkD: metrics ? metrics.inkD : size * 0.2 }
      const key = posDependent ? `i${i}` : `${g.group}|${g.ch}|${g.rot ? 1 : 0}`
      let sprite = cache.get(key)
      if (!sprite) {
        sprite = buildGlyphSprite(g, font, groupStyle(scene, g.group, size), gradient)
        cache.set(key, sprite)
      }
      list[i] = sprite
      g.sprite = sprite
    })
    return list
  }

  private ensureLayer(w: number, h: number) {
    for (const c of [this.layer, this.tmpA, this.tmpB]) {
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
    }
  }

  private glyphState(g: Glyph, t: number, scene: CutInTemplate, info: GlyphInfo, st: GlyphState) {
    const T = this.prepared!.timeline
    const i = g.index
    const inStart = T.inStart[i]!
    if (!(t >= inStart)) return false
    const outStart = T.outStart[i]!
    if (t >= outStart && (T.outDur[i] === 0 || t >= outStart + T.outDur[i]!)) return false
    st.a = 1; st.x = 0; st.y = 0; st.s = 1; st.sx = 1; st.sy = 1; st.r = 0; st.blur = 0
    const inFx = T.inFx[i]
    const inDur = T.inDur[i]!
    if (inFx?.glyph && inDur > 0 && t < inStart + inDur) {
      const p = clamp((t - inStart) / inDur)
      info.ease = easeFn(scene.inEase, inFx.ease)
      inFx.glyph(st, info.ease(p), p, g, scene.inPower ?? 1, info)
    }
    const outFx = T.outFx[i]
    if (outFx?.glyph && t >= outStart) {
      const od = T.outDur[i]!
      const p = od > 0 ? clamp((t - outStart) / od) : 1
      outFx.glyph(st, easeFn(scene.outEase, outFx.ease)(p), p, g, scene.outPower ?? 1, info)
    }
    HOLD_EFFECTS[scene.holdFx]?.glyph?.(st, t, g, scene.holdPower ?? 1)
    return st.a > 0.002
  }

  private blockState(t: number, scene: CutInTemplate, size: number): BlockState {
    const T = this.prepared!.timeline
    const bs: BlockState = { a: 1, x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, blur: 0, bright: 0, glitch: 0, mask: null, glowMul: 1, layerAlpha: 1 }
    const seed = 91
    const bi = T.blockIn
    if (bi) {
      if (t < bi.start) { bs.a = 0; return bs }
      if (t < bi.start + bi.dur) {
        const p = clamp((t - bi.start) / bi.dur)
        bi.fx.block?.(bs, easeFn(scene.inEase, bi.fx.ease)(p), p, scene.inPower ?? 1, { size, t, dir: dirFor(bi.fx, scene.inDir), seed })
      }
    }
    const bo = T.blockOut
    if (bo) {
      if (t >= bo.start + bo.dur) { bs.a = 0; return bs }
      if (t >= bo.start) {
        const p = clamp((t - bo.start) / bo.dur)
        bo.fx.block?.(bs, easeFn(scene.outEase, bo.fx.ease)(p), p, scene.outPower ?? 1, { size, t, dir: dirFor(bo.fx, scene.outDir), seed })
      }
    }
    HOLD_EFFECTS[scene.holdFx]?.block?.(bs, t, scene.holdPower ?? 1, { size, seed, since: t - T.inEnd })
    return bs
  }

  /** Draw time t (seconds) to a canvas. scale = canvas pixels per logical pixel */
  render(ctx: CanvasRenderingContext2D, t: number, scale: number) {
    const P = this.prepared
    const cw = ctx.canvas.width, ch = ctx.canvas.height
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cw, ch)
    ctx.restore()
    if (!P) return
    const { scene, layout, timeline } = P
    this.ensureLayer(cw, ch)
    this.drawBackground(ctx, t, scale)
    if (t < timeline.start || t > timeline.end || !layout.visibleCount) return
    const bs = this.blockState(t, scene, layout.size)
    this.drawDeco(ctx, t, bs, scale, scene)
    if (bs.a <= 0.002) return
    this.drawTextLayer(t, bs, scale, scene)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = clamp(bs.layerAlpha)
    ctx.drawImage(this.layer, 0, 0)
    ctx.restore()
  }

  private drawBackground(ctx: CanvasRenderingContext2D, t: number, scale: number) {
    const { scene, layout, timeline } = this.prepared!
    const bg = scene.bg
    if (bg.type === 'none') return
    let alpha = clamp(bg.opacity ?? 0.5)
    if (bg.sync) {
      const pin = clamp((t - timeline.bgIn.start) / timeline.bgIn.dur)
      const pout = clamp((t - timeline.bgOut.start) / timeline.bgOut.dur)
      alpha *= EASE.outCubic(pin) * (1 - EASE.inCubic(pout))
    }
    if (alpha <= 0.002) return
    const W = layout.W * scale, H = layout.H * scale
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (bg.type === 'solid') {
      ctx.fillStyle = colorWithAlpha(bg.color, alpha)
    } else if (bg.type === 'vignette') {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.hypot(W, H) / 2)
      g.addColorStop(0, colorWithAlpha(bg.color, 0))
      g.addColorStop(1, colorWithAlpha(bg.color, alpha))
      ctx.fillStyle = g
    } else {
      const g = bg.type === 'bottom' ? ctx.createLinearGradient(0, H * 0.45, 0, H) : ctx.createLinearGradient(0, H * 0.55, 0, 0)
      g.addColorStop(0, colorWithAlpha(bg.color, 0))
      g.addColorStop(1, colorWithAlpha(bg.color, alpha))
      ctx.fillStyle = g
    }
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  private drawTextLayer(t: number, bs: BlockState, scale: number, scene: CutInTemplate) {
    const { layout, timeline } = this.prepared!
    const lctx = this.lctx
    const cw = this.layer.width, ch = this.layer.height
    lctx.setTransform(1, 0, 0, 1, 0, 0)
    lctx.globalCompositeOperation = 'source-over'
    lctx.globalAlpha = 1
    lctx.filter = 'none'
    lctx.clearRect(0, 0, cw, ch)
    const box = layout.box
    const bcx = (box.x0 + box.x1) / 2
    const bcy = (box.y0 + box.y1) / 2
    // Block matrix: scale * T(bc + off) * R * S * T(-bc)
    const cos = Math.cos(bs.r), sin = Math.sin(bs.r)
    const bsx = bs.s * bs.sx, bsy = bs.s * bs.sy
    const ba = scale * cos * bsx, bb = scale * sin * bsx, bc = -scale * sin * bsy, bd = scale * cos * bsy
    const be = scale * (bcx + bs.x) - (ba * bcx + bc * bcy)
    const bf = scale * (bcy + bs.y) - (bb * bcx + bd * bcy)
    const m: Matrix = [ba, bb, bc, bd, be, bf]
    const info: GlyphInfo = { vertical: layout.vertical, dir: scene.inDir, size: layout.size, ease: null }
    const st = this.st
    const list: DrawItem[] = []
    for (const g of layout.glyphs) {
      if (g.blank || !g.sprite) continue
      const i = g.index
      info.dir = t >= timeline.outStart[i]! ? dirFor(timeline.outFx[i], scene.outDir) : dirFor(timeline.inFx[i], scene.inDir)
      info.ease = null
      if (!this.glyphState(g, t, scene, info, st)) continue
      list.push({ g, a: st.a * bs.a, x: st.x, y: st.y, s: st.s, sx: st.sx, sy: st.sy, r: st.r, blur: st.blur })
    }
    const drawPass = (layerName: 'glow' | 'back' | 'front', alphaMul: number) => {
      for (const it of list) {
        const sprite = it.g.sprite!
        const img = sprite[layerName]
        if (!img) continue
        let total = it.a * alphaMul
        // Glow stronger than 1 is drawn by stacking the layer
        while (total > 0.002) {
          const alpha = Math.min(1, total)
          total -= alpha
          this.drawSprite(lctx, it, sprite, img, alpha, m, bs, scale)
        }
      }
    }
    drawPass('glow', bs.glowMul)
    drawPass('back', 1)
    drawPass('front', 1)
    lctx.setTransform(1, 0, 0, 1, 0, 0)
    lctx.globalAlpha = 1

    const rect = this.transformedBox(box, bs, scale, layout.size)
    if (bs.bright > 0.002) {
      lctx.globalCompositeOperation = 'source-atop'
      lctx.fillStyle = `rgba(255, 255, 255, ${clamp(bs.bright)})`
      lctx.fillRect(0, 0, cw, ch)
      lctx.globalCompositeOperation = 'source-over'
    }
    if (bs.mask) this.applyMask(bs.mask, rect, layout.size * 0.6 * scale)
    if (bs.glitch > 0.01) this.applyGlitch(bs.glitch, t, rect, layout.size * scale, scene)
  }

  private drawSprite(lctx: CanvasRenderingContext2D, it: DrawItem, sprite: GlyphSprite, img: HTMLCanvasElement, alpha: number, m: Matrix, bs: BlockState, scale: number) {
    const [ba, bb, bc, bd, be, bf] = m
    const gx = it.g.cx + it.x, gy = it.g.cy + it.y
    const gc = Math.cos(it.r), gs = Math.sin(it.r)
    const sx = it.s * it.sx, sy = it.s * it.sy
    const la = gc * sx, lb = gs * sx, lc = -gs * sy, ld = gc * sy
    lctx.setTransform(
      ba * la + bc * lb, bb * la + bd * lb,
      ba * lc + bc * ld, bb * lc + bd * ld,
      ba * gx + bc * gy + be, bb * gx + bd * gy + bf,
    )
    lctx.globalAlpha = alpha
    // Blur on a small canvas in sprite space (much cheaper than filtering the whole layer)
    const spriteBlur = it.blur + bs.blur
    const screenBlur = spriteBlur * scale * Math.max(Math.abs(it.s * bs.s), 0.2)
    const dx = it.g.ox - sprite.ox, dy = it.g.oy - sprite.oy
    if (screenBlur > 0.35) this.drawBlurred(lctx, img, dx, dy, spriteBlur)
    else lctx.drawImage(img, dx, dy)
  }

  private drawBlurred(lctx: CanvasRenderingContext2D, img: HTMLCanvasElement, dx: number, dy: number, blur: number) {
    const pad = Math.ceil(blur * 2.4) + 2
    const w = img.width + pad * 2
    const h = img.height + pad * 2
    const c = this.blurTmp
    if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h) }
    const bctx = context2d(c)
    bctx.setTransform(1, 0, 0, 1, 0, 0)
    bctx.globalAlpha = 1
    bctx.clearRect(0, 0, w, h)
    if (supportsFilter()) {
      bctx.filter = `blur(${blur.toFixed(2)}px)`
      bctx.drawImage(img, pad, pad)
      bctx.filter = 'none'
      lctx.drawImage(c, 0, 0, w, h, dx - pad, dy - pad, w, h)
      return
    }
    // Without ctx.filter: shrink and enlarge to approximate the blur
    const f = Math.max(0.06, 1 / (1 + blur / 2.2))
    const sw = Math.max(1, Math.round(w * f))
    const sh = Math.max(1, Math.round(h * f))
    bctx.imageSmoothingQuality = 'high'
    bctx.drawImage(img, pad * f, pad * f, img.width * f, img.height * f)
    lctx.imageSmoothingQuality = 'high'
    lctx.drawImage(c, 0, 0, sw, sh, dx - pad, dy - pad, w, h)
  }

  private transformedBox(box: Box, bs: BlockState, scale: number, size: number): Rect {
    const pad = size * 0.25
    const cx = (box.x0 + box.x1) / 2 + bs.x
    const cy = (box.y0 + box.y1) / 2 + bs.y
    const hw = (box.x1 - box.x0) / 2 * Math.abs(bs.s * bs.sx) + pad
    const hh = (box.y1 - box.y0) / 2 * Math.abs(bs.s * bs.sy) + pad
    return { x: (cx - hw) * scale, y: (cy - hh) * scale, w: hw * 2 * scale, h: hh * 2 * scale }
  }

  private applyMask(mask: WipeMask, rect: Rect, soft: number) {
    const lctx = this.lctx
    const cw = this.layer.width, ch = this.layer.height
    const s = Math.max(1, soft)
    const p = clamp(mask.p)
    lctx.save()
    lctx.setTransform(1, 0, 0, 1, 0, 0)
    lctx.globalCompositeOperation = 'destination-in'
    let grad: CanvasGradient
    const horizontal = mask.dir === 'lr' || mask.dir === 'rl' || mask.dir === 'center'
    if (mask.dir === 'center') {
      const c = rect.x + rect.w / 2
      const half = rect.w / 2
      const span = half + s * 2
      grad = lctx.createLinearGradient(c - span, 0, c + span, 0)
      const at = (x: number) => clamp((x + span) / (2 * span))
      if (!mask.out) {
        const w = lerp(0, half + s, p)
        const peak = clamp(w / s)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(at(-w), 'rgba(0,0,0,0)')
        grad.addColorStop(at(Math.min(0, -w + s)), `rgba(0,0,0,${peak})`)
        grad.addColorStop(at(Math.max(0, w - s)), `rgba(0,0,0,${peak})`)
        grad.addColorStop(at(w), 'rgba(0,0,0,0)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
      } else {
        const w = lerp(-s, half, p)
        grad.addColorStop(0, 'rgba(0,0,0,1)')
        if (w > 0) {
          grad.addColorStop(at(-w - s), 'rgba(0,0,0,1)')
          grad.addColorStop(at(-w), 'rgba(0,0,0,0)')
          grad.addColorStop(at(w), 'rgba(0,0,0,0)')
          grad.addColorStop(at(w + s), 'rgba(0,0,0,1)')
        } else {
          const floor = clamp(-w / s)
          grad.addColorStop(at(-w - s), 'rgba(0,0,0,1)')
          grad.addColorStop(0.5, `rgba(0,0,0,${floor})`)
          grad.addColorStop(at(w + s), 'rgba(0,0,0,1)')
        }
        grad.addColorStop(1, 'rgba(0,0,0,1)')
      }
    } else {
      const neg = mask.dir === 'rl' || mask.dir === 'bt'
      const lo = horizontal ? rect.x : rect.y
      const hi = horizontal ? rect.x + rect.w : rect.y + rect.h
      const U0 = neg ? -hi : lo
      const U1 = neg ? -lo : hi
      let a: number, b: number
      const fromOpaque = !mask.out
      if (!mask.out) {
        const E = lerp(U0, U1 + s, p)
        a = E - s; b = E
      } else {
        const E = lerp(U0 - s, U1, p)
        a = E; b = E + s
      }
      if (neg) { a = -a; b = -b }
      grad = horizontal ? lctx.createLinearGradient(a, 0, b, 0) : lctx.createLinearGradient(0, a, 0, b)
      grad.addColorStop(0, fromOpaque ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0)')
      grad.addColorStop(1, fromOpaque ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)')
    }
    lctx.fillStyle = grad
    lctx.fillRect(0, 0, cw, ch)
    lctx.restore()
  }

  // Glitch: two tinted copies shifted sideways and horizontal slices shifted
  private applyGlitch(amount: number, t: number, rect: Rect, sizePx: number, scene: CutInTemplate) {
    const cw = this.layer.width, ch = this.layer.height
    const lctx = this.lctx
    const a = context2d(this.tmpA)
    const b = context2d(this.tmpB)
    const frame = Math.floor(t * 20)
    const seed = 400
    const k = clamp(amount, 0, 2)
    a.setTransform(1, 0, 0, 1, 0, 0)
    a.globalCompositeOperation = 'source-over'
    a.clearRect(0, 0, cw, ch)
    a.drawImage(this.layer, 0, 0)
    // Color shift
    const shift = Math.max(1, sizePx * 0.045 * k * (0.6 + rnd(frame, 1, seed) * 0.8))
    lctx.setTransform(1, 0, 0, 1, 0, 0)
    lctx.clearRect(0, 0, cw, ch)
    const tint = (color: string, dx: number) => {
      b.setTransform(1, 0, 0, 1, 0, 0)
      b.globalCompositeOperation = 'source-over'
      b.clearRect(0, 0, cw, ch)
      b.drawImage(this.tmpA, 0, 0)
      b.globalCompositeOperation = 'source-in'
      b.fillStyle = color
      b.fillRect(0, 0, cw, ch)
      b.globalCompositeOperation = 'source-over'
      lctx.globalAlpha = 0.8
      lctx.drawImage(this.tmpB, dx, 0)
    }
    tint(scene.glitchColor || '#ff285a', -shift)
    tint(scene.glitchColor2 || '#28e6ff', shift)
    lctx.globalAlpha = 1
    lctx.drawImage(this.tmpA, 0, 0)
    // Horizontal slices
    a.clearRect(0, 0, cw, ch)
    a.drawImage(this.layer, 0, 0)
    const slices = 2 + Math.floor(rnd(frame, 2, seed) * 5 * Math.min(1, k + 0.3))
    for (let i = 0; i < slices; i++) {
      const y = rect.y + rnd(frame, 10 + i, seed) * rect.h
      const h = Math.max(1, sizePx * (0.03 + rnd(frame, 30 + i, seed) * 0.14))
      const dx = (rnd(frame, 50 + i, seed) - 0.5) * sizePx * 0.5 * k
      lctx.clearRect(0, y, cw, h)
      lctx.drawImage(this.tmpA, 0, y, cw, h, dx, y, cw, h)
    }
  }

  private decoProgress(t: number) {
    const T = this.prepared!.timeline
    let pin = 1
    if (T.decoIn) pin = T.decoIn.dur > 0 ? clamp((t - T.decoIn.start) / T.decoIn.dur) : (t >= T.decoIn.start ? 1 : 0)
    else if (t < T.start) pin = 0
    const pout = T.decoOut.dur > 0 ? clamp((t - T.decoOut.start) / T.decoOut.dur) : (t >= T.decoOut.start ? 1 : 0)
    return { pin, pout }
  }

  private drawDeco(ctx: CanvasRenderingContext2D, t: number, bs: BlockState, scale: number, scene: CutInTemplate) {
    const d = scene.deco
    if (d.type === 'none') return
    const { pin, pout } = this.decoProgress(t)
    const animated = d.anim !== 'none'
    const ein = animated ? EASE.outCubic(pin) : (pin > 0 ? 1 : 0)
    const eout = animated ? EASE.inCubic(pout) : (pout >= 1 ? 1 : 0)
    if (ein <= 0.001 || eout >= 0.999) return
    const grow = d.anim === 'grow'
    const g = grow ? ein * (1 - eout) : 1
    const alpha = grow ? clamp(g * 4) : ein * (1 - eout)
    if (alpha <= 0.002) return
    const { layout } = this.prepared!
    const size = layout.size
    const vertical = layout.vertical
    const W = layout.W, H = layout.H
    const pad = (d.pad || 0) * size
    const ext = (d.extend || 0) * size
    const th = Math.max(0.5, (d.thickness || 2) * layout.fit)
    const box = layout.box
    const mb = layout.mainBox
    const lineColor = d.color2 || '#ffffff'
    const fillColor = colorWithAlpha(d.color || '#000000', clamp(d.opacity ?? 0.5))
    ctx.save()
    ctx.setTransform(scale, 0, 0, scale, bs.x * scale, bs.y * scale)
    ctx.globalAlpha = alpha
    // Lines with the text's outlines: outer outline, outline, then the line, thickest first
    const edges: { w: number; color: string }[] = []
    if (d.outline) {
      const e1 = scene.stroke.on ? Math.max(0, scene.stroke.width || 0) * layout.fit : 0
      const e2 = scene.stroke2.on ? Math.max(0, scene.stroke2.width || 0) * layout.fit : 0
      if (e2 > 0) edges.push({ w: th + 2 * (e1 + e2), color: scene.stroke2.color })
      if (e1 > 0) edges.push({ w: th + 2 * e1, color: scene.stroke.color })
    }
    // path builds the line shape (outlines square off the line ends)
    const strokePath = (path: () => void, cap: CanvasLineCap) => {
      edges.forEach(edge => {
        ctx.strokeStyle = edge.color
        ctx.lineWidth = edge.w
        ctx.lineCap = 'square'
        ctx.beginPath()
        path()
        ctx.stroke()
      })
      ctx.strokeStyle = lineColor
      ctx.lineWidth = th
      ctx.lineCap = cap
      ctx.beginPath()
      path()
      ctx.stroke()
    }
    const line = (x0: number, y0: number, x1: number, y1: number) => strokePath(() => { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1) }, 'butt')
    switch (d.type) {
      case 'band': {
        const soft = clamp(d.soft ?? 0.4, 0, 1) * 0.5
        const side = clamp(d.sideFade ?? 0, 0, 1) * 0.5
        if (!vertical) {
          const cy = (box.y0 + box.y1) / 2
          const hh = ((box.y1 - box.y0) / 2 + pad) * (grow ? g : 1)
          this.drawBand(ctx, -bs.x, cy - hh, W, hh * 2, false, soft, side, fillColor, scale)
        } else {
          const cx = (box.x0 + box.x1) / 2
          const hw = ((box.x1 - box.x0) / 2 + pad) * (grow ? g : 1)
          this.drawBand(ctx, cx - hw, -bs.y, hw * 2, H, true, soft, side, fillColor, scale)
        }
        break
      }
      case 'tape': {
        // Striped tape above and below the text (right and left in vertical writing), across the screen.
        // The first runs left (up), the second right (down), both blinking.
        // With "grow" each slides in from off screen in its direction and leaves the same way
        const tw = Math.max(2, (d.tapeSize ?? 40) * layout.fit)
        const speed = Math.max(0, d.tapeSpeed ?? 90) * layout.fit
        const blink = clamp(d.tapeBlink ?? 0.5)
        const len = vertical ? H : W
        const origin = vertical ? -bs.y : -bs.x
        const inShift = grow ? len * ein : 0
        const outShift = grow ? len * eout : 0
        const baseA = grow ? 1 : ein * (1 - eout)
        const drift = speed * t
        const across = vertical ? [box.x1 + pad, box.x0 - pad - tw] : [box.y0 - pad - tw, box.y1 + pad]
        const tapes = [
          { v0: across[0]!, a: origin + len - inShift, b: origin + len - outShift, offset: origin - drift - inShift - outShift, phase: 0 },
          { v0: across[1]!, a: origin + outShift, b: origin + inShift, offset: origin + drift + inShift + outShift, phase: 0.5 },
        ]
        tapes.forEach(tp => {
          const a = Math.max(origin, tp.a), b = Math.min(origin + len, tp.b)
          if (b - a < 0.5) return
          ctx.globalAlpha = baseA * (1 - blink * tapeBlinkWave(t, tp.phase))
          if (ctx.globalAlpha <= 0.002) return
          this.drawTape(ctx, vertical, a, b, tp.v0, tw, tp.offset, d.tapeColor || '#f5c400', d.tapeStripe || '#151515')
        })
        break
      }
      case 'box': {
        const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2
        const hw = (box.x1 - box.x0) / 2 + pad, hh = (box.y1 - box.y0) / 2 + pad
        ctx.translate(cx, cy)
        ctx.scale(bs.s * bs.sx * (grow && !vertical ? g : 1), bs.s * bs.sy * (grow && vertical ? g : 1))
        const radius = Math.min(hw, hh, (d.radius ?? 0.2) * size)
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(-hw, -hh, hw * 2, hh * 2, radius)
        else ctx.rect(-hw, -hh, hw * 2, hh * 2)
        ctx.fillStyle = fillColor
        ctx.fill()
        if ((d.thickness || 0) > 0) { ctx.strokeStyle = lineColor; ctx.lineWidth = th; ctx.stroke() }
        break
      }
      case 'lines': {
        if (!vertical) {
          const cx = (box.x0 + box.x1) / 2
          const half = ((box.x1 - box.x0) / 2 + ext) * g
          line(cx - half, box.y0 - pad, cx + half, box.y0 - pad)
          line(cx - half, box.y1 + pad, cx + half, box.y1 + pad)
        } else {
          const cy = (box.y0 + box.y1) / 2
          const half = ((box.y1 - box.y0) / 2 + ext) * g
          line(box.x0 - pad, cy - half, box.x0 - pad, cy + half)
          line(box.x1 + pad, cy - half, box.x1 + pad, cy + half)
        }
        break
      }
      case 'underline': {
        const sub = layout.subBox
        if (!vertical) {
          let y = mb.y1 + pad
          if (sub && sub.y0 >= mb.y1) y = (mb.y1 + sub.y0) / 2
          const x0 = box.x0 - ext, x1 = box.x1 + ext
          const a = grow ? lerp(x0, x1, eout) : x0
          const b = grow ? lerp(x0, x1, ein) : x1
          if (b > a) line(a, y, b, y)
        } else {
          let x = mb.x0 - pad
          if (sub && sub.x1 <= mb.x0) x = (mb.x0 + sub.x1) / 2
          const y0 = box.y0 - ext, y1 = box.y1 + ext
          const a = grow ? lerp(y0, y1, eout) : y0
          const b = grow ? lerp(y0, y1, ein) : y1
          if (b > a) line(x, a, x, b)
        }
        break
      }
      case 'sides': {
        const len = Math.max(size * 0.2, ext) * g
        if (!vertical) {
          const cy = (mb.y0 + mb.y1) / 2
          line(mb.x0 - pad - len, cy, mb.x0 - pad, cy)
          line(mb.x1 + pad, cy, mb.x1 + pad + len, cy)
        } else {
          const cx = (mb.x0 + mb.x1) / 2
          line(cx, mb.y0 - pad - len, cx, mb.y0 - pad)
          line(cx, mb.y1 + pad, cx, mb.y1 + pad + len)
        }
        break
      }
      case 'bar': {
        if (!vertical) {
          const x = box.x0 - pad - th / 2
          line(x, box.y0, x, lerp(box.y0, box.y1, g))
        } else {
          const y = box.y0 - pad - th / 2
          line(box.x1, y, lerp(box.x1, box.x0, g), y)
        }
        break
      }
      case 'corners': {
        const x0 = box.x0 - pad, y0 = box.y0 - pad, x1 = box.x1 + pad, y1 = box.y1 + pad
        const arm = Math.min(x1 - x0, y1 - y0) * 0.28 * g
        const inset = (1 - g) * size * 0.4
        const corner = (x: number, y: number, sx: number, sy: number) => {
          const cx = x + sx * -inset, cy = y + sy * -inset
          ctx.moveTo(cx + sx * arm, cy)
          ctx.lineTo(cx, cy)
          ctx.lineTo(cx, cy + sy * arm)
        }
        strokePath(() => {
          corner(x0, y0, 1, 1)
          corner(x1, y0, -1, 1)
          corner(x0, y1, 1, -1)
          corner(x1, y1, -1, -1)
        }, 'square')
        break
      }
      case 'frame': {
        // Title frame around the main text only; the sub text stays outside (padding up to half the gap).
        // The sides (top and bottom in vertical writing) stretch by extend and stop inside the screen
        const inset = Math.max(th, (scene.marginX ?? 64) * 0.5)
        const sb = layout.subBox
        let x0: number, y0: number, x1: number, y1: number
        if (!vertical) {
          let padT = pad, padB = pad
          if (sb && sb.y0 >= mb.y1) padB = Math.min(pad, (sb.y0 - mb.y1) / 2)
          else if (sb && sb.y1 <= mb.y0) padT = Math.min(pad, (mb.y0 - sb.y1) / 2)
          y0 = mb.y0 - padT
          y1 = mb.y1 + padB
          x0 = Math.max(-bs.x + inset, mb.x0 - pad - ext)
          x1 = Math.min(W - bs.x - inset, mb.x1 + pad + ext)
        } else {
          let padL = pad, padR = pad
          if (sb && sb.x1 <= mb.x0) padL = Math.min(pad, (mb.x0 - sb.x1) / 2)
          else if (sb && sb.x0 >= mb.x1) padR = Math.min(pad, (sb.x0 - mb.x1) / 2)
          x0 = mb.x0 - padL
          x1 = mb.x1 + padR
          y0 = Math.max(-bs.y + inset, mb.y0 - pad - ext)
          y1 = Math.min(H - bs.y - inset, mb.y1 + pad + ext)
        }
        if (x1 - x0 < 1 || y1 - y0 < 1) break
        const fillA = clamp(d.opacity ?? 0) * (grow ? clamp(g * 1.5) : 1)
        if (fillA > 0.002) {
          ctx.save()
          ctx.globalAlpha = alpha * fillA
          ctx.fillStyle = d.color || '#000000'
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
          ctx.restore()
        }
        if ((d.thickness || 0) > 0) {
          // With "grow" the line draws itself in one stroke from the top edge (right edge in vertical writing)
          const perimeter = 2 * (x1 - x0 + y1 - y0)
          ctx.lineJoin = 'miter'
          if (grow && g < 0.999) ctx.setLineDash([perimeter * g, perimeter])
          strokePath(() => {
            if (!vertical) {
              ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1)
            } else {
              ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y0)
            }
            ctx.closePath()
          }, 'butt')
          ctx.setLineDash([])
        }
        break
      }
    }
    ctx.restore()
  }

  // One striped tape. u runs along the tape, v0 and tw across it.
  // The stripes depend only on offset, so they stay put while the visible range [u0, u1] changes
  private drawTape(ctx: CanvasRenderingContext2D, vertical: boolean, u0: number, u1: number, v0: number, tw: number, offset: number, colorA: string, colorB: string) {
    const pt = (u: number, v: number) => (vertical ? [v, u] as const : [u, v] as const)
    ctx.save()
    ctx.beginPath()
    if (vertical) ctx.rect(v0, u0, tw, u1 - u0)
    else ctx.rect(u0, v0, u1 - u0, tw)
    ctx.clip()
    ctx.fillStyle = colorA
    ctx.fill()
    const period = tw * 1.3
    const stripe = period * 0.5
    const slant = tw
    const first = Math.floor((u0 - slant - stripe - offset) / period) - 1
    ctx.beginPath()
    for (let k = first; ; k++) {
      const u = k * period + offset
      if (u > u1 + period) break
      const p1 = pt(u, v0 + tw), p2 = pt(u + stripe, v0 + tw), p3 = pt(u + stripe + slant, v0), p4 = pt(u + slant, v0)
      ctx.moveTo(p1[0], p1[1])
      ctx.lineTo(p2[0], p2[1])
      ctx.lineTo(p3[0], p3[1])
      ctx.lineTo(p4[0], p4[1])
      ctx.closePath()
    }
    ctx.fillStyle = colorB
    ctx.fill()
    ctx.restore()
  }

  private drawBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, vertical: boolean, soft: number, side: number, color: string, scale: number) {
    if (w <= 0.5 || h <= 0.5) return
    const pw = Math.max(1, Math.ceil(w * scale))
    const ph = Math.max(1, Math.ceil(h * scale))
    const c = this.bandCanvas
    const key = `${pw}|${ph}|${vertical}|${soft}|${side}|${color}`
    if (this.bandKey !== key) {
      this.bandKey = key
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph }
      const b = context2d(c)
      b.setTransform(1, 0, 0, 1, 0, 0)
      b.globalCompositeOperation = 'source-over'
      b.clearRect(0, 0, pw, ph)
      b.fillStyle = color
      b.fillRect(0, 0, pw, ph)
      b.globalCompositeOperation = 'destination-in'
      const across = vertical ? b.createLinearGradient(0, 0, pw, 0) : b.createLinearGradient(0, 0, 0, ph)
      across.addColorStop(0, soft > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)')
      across.addColorStop(Math.max(0.0001, soft), 'rgba(0,0,0,1)')
      across.addColorStop(Math.min(0.9999, 1 - soft), 'rgba(0,0,0,1)')
      across.addColorStop(1, soft > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)')
      b.fillStyle = across
      b.fillRect(0, 0, pw, ph)
      if (side > 0) {
        const along = vertical ? b.createLinearGradient(0, 0, 0, ph) : b.createLinearGradient(0, 0, pw, 0)
        along.addColorStop(0, 'rgba(0,0,0,0)')
        along.addColorStop(side, 'rgba(0,0,0,1)')
        along.addColorStop(1 - side, 'rgba(0,0,0,1)')
        along.addColorStop(1, 'rgba(0,0,0,0)')
        b.fillStyle = along
        b.fillRect(0, 0, pw, ph)
      }
    }
    ctx.save()
    const m = ctx.getTransform()
    ctx.setTransform(1, 0, 0, 1, m.e, m.f)
    ctx.drawImage(c, x * scale, y * scale)
    ctx.restore()
  }
}
