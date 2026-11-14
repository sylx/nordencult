/*
 * Layout: horizontal / vertical writing, auto shrink, placement on the screen
 */
import type { CutInTemplate } from '../template'
import { hash32, rnd } from './math'
import type { GlyphSprite } from './sprite'

export interface Box { x0: number; y0: number; x1: number; y1: number }

export interface Glyph {
  ch: string
  blank: boolean
  line: number
  col: number
  size: number
  vertical: boolean
  /** Rotated a quarter turn in vertical writing */
  rot: boolean
  /** Center of the glyph */
  cx: number
  cy: number
  /** Drawing origin relative to the center */
  ox: number
  oy: number
  adv: number
  /** Distance from the center of the line */
  lineOffset: number
  /** 0..1 position in the line */
  linePos: number
  penX: number
  baseline: number
  inkA: number
  inkD: number
  /** Distance from the center of the line to the farthest glyph */
  lineReach: number
  /** Visible glyphs in the line */
  lineCount: number
  /** 0: main text, 1: sub text */
  group: 0 | 1
  seq: number
  /** Index among the visible glyphs of the group (-1 for blanks) */
  vis: number
  parity: number
  seed: number
  r1: number
  r2: number
  r3: number
  index: number
  /** Distance from the drawing origin to the top left of the block */
  bx: number
  by: number
  sprite: GlyphSprite | null
}

export interface LineInfo {
  idx: number[]
  x0: number
  x1: number
  visible: boolean
}

interface Metrics { inkA: number; inkD: number }

interface Group {
  glyphs: Glyph[]
  lines: LineInfo[]
  box: Box
  metrics: Metrics
}

export interface LayoutEnv {
  ctx: CanvasRenderingContext2D
  mainFont: (size: number) => string
  subFont: (size: number) => string
}

export interface CutInLayout {
  W: number
  H: number
  vertical: boolean
  /** Auto shrink ratio */
  fit: number
  size: number
  subSize: number
  glyphs: Glyph[]
  /** Main and sub text together */
  box: Box
  mainBox: Box
  subBox: Box | null
  mainLines: LineInfo[]
  mainMetrics: Metrics
  subMetrics: Metrics | null
  visibleCount: number
}

/* ================= Characters ================= */

const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
  : null

export function graphemes(text: string): string[] {
  if (!text) return []
  if (segmenter) return Array.from(segmenter.segment(text), s => s.segment)
  return Array.from(text)
}

const setOf = (str: string) => new Set(Array.from(str))
const V_ROTATE = setOf('ー－―—‐‑–-～〜~…‥（）()「」『』【】〔〕［］[]｛｝{}〈〉《》<>＜＞＝=：:；;｜|→←')
const V_PUNCT = setOf('、。，．')
const V_SMALL = setOf('ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ')
const V_SIDEWAYS = /^[ -ɏͰ-ӿ‐-―‘-‟]$/

const isBlank = (ch: string) => ch === ' ' || ch === '　' || ch === '\t' || /^\s+$/.test(ch)

function measureInk(ctx: CanvasRenderingContext2D, str: string, size: number) {
  const m = ctx.measureText(str)
  const a = Number.isFinite(m.actualBoundingBoxAscent) ? m.actualBoundingBoxAscent : size * 0.8
  const d = Number.isFinite(m.actualBoundingBoxDescent) ? m.actualBoundingBoxDescent : size * 0.12
  return { width: m.width, a, d }
}

function newGlyph(fields: Pick<Glyph, 'ch' | 'line' | 'col' | 'size' | 'vertical' | 'rot' | 'cx' | 'cy' | 'ox' | 'oy' | 'adv' | 'lineOffset' | 'linePos' | 'penX' | 'baseline' | 'inkA' | 'inkD'>): Glyph {
  return {
    ...fields, blank: isBlank(fields.ch), lineReach: 0, lineCount: 0, group: 0, seq: 0, vis: -1, parity: 0, seed: 0,
    r1: 0, r2: 0, r3: 0, index: 0, bx: 0, by: 0, sprite: null,
  }
}

interface GroupSpec {
  font: string
  size: number
  /** Letter spacing (em) */
  ls: number
  /** Line height */
  lh: number
  align: CutInTemplate['align']
  vertical: boolean
}

function layoutGroup(lines: string[][], spec: GroupSpec, ctx: CanvasRenderingContext2D): Group {
  const { font, size, ls, lh, align, vertical } = spec
  const lsPx = ls * size
  const alignF = align === 'start' ? 0 : align === 'end' ? 1 : 0.5
  ctx.font = font
  const glyphs: Glyph[] = []
  const lineInfos: LineInfo[] = []

  if (!vertical) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    const measure = (s: string) => ctx.measureText(s).width
    const pitch = lh * size
    let maxW = 0
    const rows = lines.map((chars, li) => {
      const widths = [0]
      let acc = ''
      chars.forEach(ch => { acc += ch; widths.push(measure(acc)) })
      const visible = chars.some(ch => !isBlank(ch))
      const ink = visible ? measureInk(ctx, acc, size) : { a: size * 0.72, d: size * 0.12 }
      const lineW = chars.length ? widths[chars.length]! + lsPx * (chars.length - 1) : 0
      maxW = Math.max(maxW, lineW)
      return { chars, widths, lineW, baseline: li * pitch, inkA: ink.a, inkD: ink.d, visible }
    })
    let y0 = Infinity, y1 = -Infinity
    rows.forEach(row => {
      if (!row.visible) return
      y0 = Math.min(y0, row.baseline - row.inkA)
      y1 = Math.max(y1, row.baseline + row.inkD)
    })
    if (!Number.isFinite(y0)) { y0 = -size * 0.8; y1 = size * 0.2 }
    rows.forEach((row, li) => {
      const x0 = (maxW - row.lineW) * alignF
      const lineCenter = x0 + row.lineW / 2
      const midOffset = (row.inkA - row.inkD) / 2
      const lineIdx: number[] = []
      row.chars.forEach((ch, i) => {
        const penX = x0 + row.widths[i]! + lsPx * i
        const adv = row.widths[i + 1]! - row.widths[i]!
        const cx = penX + adv / 2
        lineIdx.push(glyphs.length)
        glyphs.push(newGlyph({
          ch, line: li, col: i, size, vertical: false, rot: false,
          cx, cy: row.baseline - midOffset, ox: -adv / 2, oy: midOffset, adv,
          lineOffset: cx - lineCenter,
          linePos: row.lineW > 0 ? (penX - x0) / row.lineW : 0,
          penX, baseline: row.baseline, inkA: row.inkA, inkD: row.inkD,
        }))
      })
      setLineReach(glyphs, lineIdx)
      lineInfos.push({ idx: lineIdx, x0, x1: x0 + row.lineW, visible: row.visible })
    })
    let inkA = 0, inkD = 0
    rows.forEach(row => { if (row.visible) { inkA = Math.max(inkA, row.inkA); inkD = Math.max(inkD, row.inkD) } })
    return { glyphs, lines: lineInfos, box: { x0: 0, y0, x1: maxW, y1 }, metrics: { inkA: inkA || size * 0.8, inkD: inkD || size * 0.12 } }
  }

  // Vertical writing: columns from right to left, characters from top to bottom
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const pitch = lh * size
  // Half-width letters lie sideways (like CSS text-orientation: mixed) and advance by their width
  const advances = lines.map(chars => chars.map(ch => (V_SIDEWAYS.test(ch) ? ctx.measureText(ch).width : size)))
  const lens = advances.map(list => (list.length ? list.reduce((sum, a) => sum + a, 0) + ls * size * (list.length - 1) : 0))
  const maxLen = Math.max(0, ...lens)
  lines.forEach((chars, ci) => {
    const cxCol = -ci * pitch
    const len = lens[ci]!
    const top = (maxLen - len) * alignF
    const lineIdx: number[] = []
    const lineCenter = top + len / 2
    let pos = top
    chars.forEach((ch, j) => {
      const adv = advances[ci]![j]!
      const center = pos + adv / 2
      let cx = cxCol
      let cy = center
      let rot = false
      if (V_PUNCT.has(ch)) { cx += size * 0.5; cy -= size * 0.5 }
      else if (V_SMALL.has(ch)) { cx += size * 0.1; cy -= size * 0.1 }
      else if (V_ROTATE.has(ch) || V_SIDEWAYS.test(ch)) rot = true
      lineIdx.push(glyphs.length)
      glyphs.push(newGlyph({
        ch, line: ci, col: j, size, vertical: true, rot,
        cx, cy, ox: 0, oy: 0, adv,
        lineOffset: center - lineCenter,
        linePos: len > 0 ? (pos - top) / len : 0,
        penX: cxCol, baseline: pos, inkA: size / 2, inkD: size / 2,
      }))
      pos += adv + ls * size
    })
    setLineReach(glyphs, lineIdx)
    lineInfos.push({ idx: lineIdx, x0: cxCol - size / 2, x1: cxCol + size / 2, visible: chars.some(ch => !isBlank(ch)) })
  })
  const x0 = lines.length ? -(lines.length - 1) * pitch - size / 2 : -size / 2
  return { glyphs, lines: lineInfos, box: { x0, y0: 0, x1: size / 2, y1: Math.max(maxLen, size * 0.1) }, metrics: { inkA: size / 2, inkD: size / 2 } }
}

// Distance from the center of the line to the farthest glyph (how loose the "spread" stack is)
function setLineReach(glyphs: Glyph[], idx: number[]) {
  const reach = Math.max(0, ...idx.map(i => (glyphs[i]!.blank ? 0 : Math.abs(glyphs[i]!.lineOffset))))
  idx.forEach(i => { glyphs[i]!.lineReach = reach })
}

function shiftGroup(group: Group, dx: number, dy: number) {
  group.glyphs.forEach(g => { g.cx += dx; g.cy += dy; g.penX += dx; g.baseline += dy })
  group.lines.forEach(l => { l.x0 += dx; l.x1 += dx })
  group.box = { x0: group.box.x0 + dx, y0: group.box.y0 + dy, x1: group.box.x1 + dx, y1: group.box.y1 + dy }
}

/** Width of the outlines (inner + outer) at the template's font size */
export function outlineWidth(scene: CutInTemplate) {
  return (scene.stroke.on ? scene.stroke.width || 0 : 0) + (scene.stroke2.on ? scene.stroke2.width || 0 : 0)
}

/** How far the decoration reaches outside the text */
function decoExtents(scene: CutInTemplate, size: number) {
  const d = scene.deco
  const pad = (d.pad || 0) * size
  // Lines with the text's outlines reach further
  const th = (d.thickness || 0) + (d.outline ? outlineWidth(scene) : 0)
  const ext = (d.extend || 0) * size
  const v = scene.writing === 'v'
  switch (d.type) {
    case 'box': return { l: pad + th, r: pad + th, t: pad + th, b: pad + th }
    case 'corners': return { l: pad + th, r: pad + th, t: pad + th, b: pad + th }
    case 'lines': return v ? { l: pad + th, r: pad + th, t: ext, b: ext } : { l: ext, r: ext, t: pad + th, b: pad + th }
    case 'underline': return v ? { l: pad + th, r: 0, t: ext, b: ext } : { l: ext, r: ext, t: 0, b: pad + th }
    case 'sides': return v ? { l: 0, r: 0, t: pad + ext, b: pad + ext } : { l: pad + ext, r: pad + ext, t: 0, b: 0 }
    case 'bar': return v ? { l: 0, r: pad + th, t: 0, b: 0 } : { l: pad + th, r: 0, t: 0, b: 0 }
    case 'band': return v ? { l: pad, r: pad, t: 0, b: 0 } : { l: 0, r: 0, t: pad, b: pad }
    // Caution tape: above and below the text (left and right in vertical writing), across the whole screen
    case 'tape': {
      const tw = d.tapeSize ?? 40
      return v ? { l: pad + tw, r: pad + tw, t: 0, b: 0 } : { l: 0, r: 0, t: pad + tw, b: pad + tw }
    }
    // Title frame: the sides stretch within the screen while drawing
    case 'frame': return { l: pad + th, r: pad + th, t: pad + th, b: pad + th }
    default: return { l: 0, r: 0, t: 0, b: 0 }
  }
}

/** How far outlines, glow and shadow reach outside the glyphs (same estimate as the sprite padding) */
function effectExtents(scene: CutInTemplate) {
  const outline = outlineWidth(scene)
  const ext = { l: outline, r: outline, t: outline, b: outline }
  if (scene.glow.on) {
    const g = outline + (scene.glow.size || 0) * 1.25
    ext.l = Math.max(ext.l, g); ext.r = Math.max(ext.r, g); ext.t = Math.max(ext.t, g); ext.b = Math.max(ext.b, g)
  }
  if (scene.shadow.on) {
    const blur = (scene.shadow.blur || 0) * 1.25
    const sx = scene.shadow.x || 0, sy = scene.shadow.y || 0
    ext.l = Math.max(ext.l, outline + blur - sx)
    ext.r = Math.max(ext.r, outline + blur + sx)
    ext.t = Math.max(ext.t, outline + blur - sy)
    ext.b = Math.max(ext.b, outline + blur + sy)
  }
  return ext
}

const splitLines = (text: string) => String(text || '').replace(/\r\n?/g, '\n').split('\n').map(line => graphemes(line))

function layoutAt(scene: CutInTemplate, main: string[][], sub: string[][], env: LayoutEnv, size: number) {
  const vertical = scene.writing === 'v'
  const subSize = size * (scene.subSize || 0.35)
  const mainGroup = layoutGroup(main, {
    font: env.mainFont(size), size, ls: scene.letterSpacing || 0, lh: scene.lineHeight || 1.4, align: scene.align, vertical,
  }, env.ctx)
  const subGroup = sub.length ? layoutGroup(sub, {
    font: env.subFont(subSize), size: subSize, ls: scene.subLetterSpacing || 0, lh: scene.lineHeight || 1.4, align: scene.align, vertical,
  }, env.ctx) : null
  const gap = (scene.subGap || 0.3) * size
  const alignF = scene.align === 'start' ? 0 : scene.align === 'end' ? 1 : 0.5
  if (subGroup) {
    const mb = mainGroup.box, sb = subGroup.box
    if (!vertical) {
      const w = Math.max(mb.x1 - mb.x0, sb.x1 - sb.x0)
      shiftGroup(mainGroup, (w - (mb.x1 - mb.x0)) * alignF - mb.x0, 0)
      const subDx = (w - (sb.x1 - sb.x0)) * alignF - sb.x0
      if (scene.subPosition === 'above') shiftGroup(subGroup, subDx, mainGroup.box.y0 - gap - sb.y1)
      else shiftGroup(subGroup, subDx, mainGroup.box.y1 + gap - sb.y0)
    } else {
      const h = Math.max(mb.y1 - mb.y0, sb.y1 - sb.y0)
      shiftGroup(mainGroup, 0, (h - (mb.y1 - mb.y0)) * alignF - mb.y0)
      const subDy = (h - (sb.y1 - sb.y0)) * alignF - sb.y0
      if (scene.subPosition === 'above') shiftGroup(subGroup, mainGroup.box.x1 + gap - sb.x0, subDy)
      else shiftGroup(subGroup, mainGroup.box.x0 - gap - sb.x1, subDy)
    }
  }
  const a = mainGroup.box, b = subGroup?.box
  const box = b ? { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) } : { ...a }
  return { main: mainGroup, sub: subGroup, box, subSize }
}

type Placed = ReturnType<typeof layoutAt>

function place(page: Placed, scene: CutInTemplate, W: number, H: number, size: number, keep: ReturnType<typeof effectExtents> | null) {
  const ext = decoExtents(scene, size)
  const outer = { x0: page.box.x0 - ext.l, y0: page.box.y0 - ext.t, x1: page.box.x1 + ext.r, y1: page.box.y1 + ext.b }
  const row = scene.anchor[0], col = scene.anchor[1]
  const mx = scene.marginX || 0, my = scene.marginY || 0
  let dx: number, dy: number
  if (col === 'l') dx = mx - outer.x0
  else if (col === 'r') dx = W - mx - outer.x1
  else dx = W / 2 - (outer.x0 + outer.x1) / 2
  if (row === 't') dy = my - outer.y0
  else if (row === 'b') dy = H - my - outer.y1
  else dy = H / 2 - (outer.y0 + outer.y1) / 2
  dx += scene.offsetX || 0
  dy += scene.offsetY || 0
  if (keep) {
    // With auto shrink, keep the margins and pull decoration, outlines, glow and shadow inside the screen
    const k = size / Math.max(1, scene.fontSize || size)
    const x0 = page.box.x0 + dx - Math.max(ext.l, keep.l * k)
    const x1 = page.box.x1 + dx + Math.max(ext.r, keep.r * k)
    if (x1 - x0 <= W + 0.5) {
      if (x0 < 0) dx -= x0
      else if (x1 > W) dx -= x1 - W
    }
    const y0 = page.box.y0 + dy - Math.max(ext.t, keep.t * k)
    const y1 = page.box.y1 + dy + Math.max(ext.b, keep.b * k)
    if (y1 - y0 <= H + 0.5) {
      if (y0 < 0) dy -= y0
      else if (y1 > H) dy -= y1 - H
    }
  }
  shiftGroup(page.main, dx, dy)
  if (page.sub) shiftGroup(page.sub, dx, dy)
  page.box = { x0: page.box.x0 + dx, y0: page.box.y0 + dy, x1: page.box.x1 + dx, y1: page.box.y1 + dy }
}

/** Lay out the text of the template on a W×H screen */
export function computeLayout(scene: CutInTemplate, W: number, H: number, env: LayoutEnv): CutInLayout {
  const main = splitLines(scene.text)
  const sub = String(scene.subText || '').trim() ? splitLines(scene.subText) : []
  const baseSize = Math.max(4, scene.fontSize || 96)
  const vertical = scene.writing === 'v'
  const availW = Math.max(16, W - 2 * (scene.marginX || 0))
  const availH = Math.max(16, H - 2 * (scene.marginY || 0))
  const effects = effectExtents(scene)

  let fit = 1
  if (scene.autoFit) {
    const probe = layoutAt(scene, main, sub, env, baseSize)
    const ext = decoExtents(scene, baseSize)
    const inkW = probe.box.x1 - probe.box.x0
    const inkH = probe.box.y1 - probe.box.y0
    // Text + decoration fits inside the margins; text + decoration + outlines, glow and shadow fits inside the screen
    const w = inkW + ext.l + ext.r
    const h = inkH + ext.t + ext.b
    const wAll = inkW + Math.max(ext.l, effects.l) + Math.max(ext.r, effects.r)
    const hAll = inkH + Math.max(ext.t, effects.t) + Math.max(ext.b, effects.b)
    if (w > availW) fit = Math.min(fit, availW / w)
    if (wAll > W) fit = Math.min(fit, W / wAll)
    if (h > availH) fit = Math.min(fit, availH / h)
    if (hAll > H) fit = Math.min(fit, H / hAll)
    fit = Math.max(0.05, fit * (fit < 1 ? 0.985 : 1))
  }
  const size = baseSize * fit
  const page = layoutAt(scene, main, sub, env, size)
  place(page, scene, W, H, size, scene.autoFit ? effects : null)

  const glyphs: Glyph[] = []
  for (const grp of [page.main, page.sub]) {
    if (!grp) continue
    const groupId = grp === page.main ? 0 : 1
    const offset = glyphs.length
    let vis = 0
    grp.glyphs.forEach((g, seq) => {
      g.group = groupId
      g.seq = seq
      g.vis = g.blank ? -1 : vis++
      g.parity = g.vis >= 0 ? g.vis % 2 : 0
      g.seed = hash32(1, groupId + 1, seq + 1) % 100000
      g.r1 = rnd(g.seed, 1); g.r2 = rnd(g.seed, 2); g.r3 = rnd(g.seed, 3)
      g.index = glyphs.length
      glyphs.push(g)
    })
    grp.lines.forEach(line => {
      line.idx = line.idx.map(i => i + offset)
      const count = line.idx.filter(i => !glyphs[i]!.blank).length
      line.idx.forEach(i => { glyphs[i]!.lineCount = count })
    })
  }
  const b = page.box
  glyphs.forEach(g => {
    g.bx = g.cx + g.ox - b.x0
    g.by = g.cy + g.oy - b.y0
  })
  return {
    W, H, vertical, fit, size, subSize: page.subSize, glyphs,
    box: b,
    mainBox: page.main.box,
    subBox: page.sub ? page.sub.box : null,
    mainLines: page.main.lines,
    mainMetrics: page.main.metrics,
    subMetrics: page.sub ? page.sub.metrics : null,
    visibleCount: glyphs.filter(g => !g.blank).length,
  }
}
