/*
 * Cut-in templates: the JSON the editor writes and the runtime plays.
 * Lengths are logical pixels of a 1280×720 screen (the runtime scales them to the host size).
 */

export const CUTIN_TEMPLATE_VERSION = 1

/** Logical size the template is designed at. The shorter fit of the host decides the scale */
export const CUTIN_BASE_WIDTH = 1280
export const CUTIN_BASE_HEIGHT = 720

export const CUTIN_IN_FX = [
  'fade', 'rise', 'drop', 'converge', 'slide', 'tracking', 'spread', 'blurIn', 'pop', 'shrinkIn', 'spin',
  'flip', 'bounce', 'scatter', 'typewriter', 'flicker', 'slam', 'zoomIn', 'emerge', 'wipe', 'shutter', 'glitch', 'flash',
] as const
export const CUTIN_OUT_FX = [
  'fade', 'rise', 'sink', 'diverge', 'slide', 'tracking', 'blurOut', 'growOut', 'shrink', 'scatter', 'erase',
  'flicker', 'zoomThrough', 'recede', 'wipe', 'shutter', 'glitch',
] as const
const HOLD_FX = ['none', 'float', 'wave', 'pulse', 'shake', 'glow', 'flicker', 'blink', 'glitch'] as const
const SUB_FX = ['same', 'fade', 'rise', 'blurIn', 'tracking', 'typewriter', 'slide'] as const
const DIRS = ['left', 'right', 'up', 'down', 'lr', 'rl', 'tb', 'bt', 'center', 'v', 'h'] as const
const ORDERS = ['forward', 'reverse', 'center', 'edges', 'random'] as const
const EASES = ['auto', 'linear', 'smooth', 'out', 'strong', 'back', 'elastic', 'bounce', 'in'] as const
const DECO_TYPES = ['none', 'band', 'tape', 'box', 'frame', 'lines', 'underline', 'sides', 'bar', 'corners'] as const
const BG_TYPES = ['none', 'solid', 'vignette', 'bottom', 'top'] as const
const ANCHORS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'] as const

export type CutInInFx = (typeof CUTIN_IN_FX)[number]
export type CutInOutFx = (typeof CUTIN_OUT_FX)[number]
export type CutInHoldFx = (typeof HOLD_FX)[number]
export type CutInSubFx = (typeof SUB_FX)[number]
/** Direction of slide (left/right/up/down), wipe (lr/rl/tb/bt/center) and shutter (v/h) */
export type CutInDir = (typeof DIRS)[number]
export type CutInOrder = (typeof ORDERS)[number]
export type CutInEase = (typeof EASES)[number]
export type CutInDecoType = (typeof DECO_TYPES)[number]
export type CutInBgType = (typeof BG_TYPES)[number]
/** Row (t/m/b) and column (l/c/r) */
export type CutInAnchor = (typeof ANCHORS)[number]

export interface CutInFill {
  type: 'solid' | 'gradient'
  color: string
  color2: string
  /** Optional third stop ('' = none) */
  color3: string
  /** v: per line, h: across the block, d: diagonal across the block */
  dir: 'v' | 'h' | 'd'
}

export interface CutInStroke { on: boolean; width: number; color: string }
export interface CutInShadow { on: boolean; color: string; opacity: number; blur: number; x: number; y: number }
export interface CutInGlow { on: boolean; color: string; size: number; strength: number }

export interface CutInDeco {
  type: CutInDecoType
  /** Fill of band / box / frame */
  color: string
  opacity: number
  /** Line color */
  color2: string
  /** Space from the text (em) */
  pad: number
  /** Line length (em) */
  extend: number
  thickness: number
  /** Give the lines the text's outlines */
  outline: boolean
  /** Band edge softness */
  soft: number
  /** Band end fade */
  sideFade: number
  /** Box corner radius (em) */
  radius: number
  anim: 'grow' | 'fade' | 'none'
  dur: number
  tapeColor: string
  tapeStripe: string
  tapeSize: number
  tapeSpeed: number
  tapeBlink: number
}

export interface CutInBackground {
  type: CutInBgType
  color: string
  opacity: number
  /** Fade with the text */
  sync: boolean
}

export interface CutInTemplate {
  version: number
  /** Name shown in the editor */
  name: string
  /** Sample text. play() can replace it */
  text: string
  subText: string
  subPosition: 'above' | 'below'
  writing: 'h' | 'v'
  align: 'start' | 'center' | 'end'
  /** Shrink when the text does not fit the screen */
  autoFit: boolean
  anchor: CutInAnchor
  marginX: number
  marginY: number
  offsetX: number
  offsetY: number

  /** CSS font-family list. The game loads the fonts */
  fontFamily: string
  weight: number
  italic: boolean
  fontSize: number
  /** em */
  letterSpacing: number
  lineHeight: number
  /** CSS font-family list of the sub text ('' = same as the main text) */
  subFontFamily: string
  subWeight: number
  subItalic: boolean
  /** Ratio to the main size */
  subSize: number
  subLetterSpacing: number
  /** Gap between main and sub (em of the main size) */
  subGap: number

  fill: CutInFill
  fillOpacity: number
  stroke: CutInStroke
  /** Outer outline */
  stroke2: CutInStroke
  shadow: CutInShadow
  glow: CutInGlow
  subColorOn: boolean
  subColor: string
  deco: CutInDeco
  bg: CutInBackground

  inFx: CutInInFx
  inDur: number
  inStagger: number
  inOrder: CutInOrder
  inEase: CutInEase
  inPower: number
  inDir: CutInDir
  holdFx: CutInHoldFx
  /** Seconds the text stays after it has come in */
  hold: number
  holdPower: number
  /** The two colors of the glitch */
  glitchColor: string
  glitchColor2: string
  outFx: CutInOutFx
  outDur: number
  outStagger: number
  outOrder: CutInOrder
  outEase: CutInEase
  outPower: number
  outDir: CutInDir
  subFx: CutInSubFx
  /** When the sub text comes in, relative to the end of the main text's entrance */
  subDelay: number
  startDelay: number
  endDelay: number
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }
/** A template as written in JSON. Missing keys take the defaults */
export type CutInTemplateInput = DeepPartial<CutInTemplate>
/** A template from a JSON file (`import x from './x.json'` widens the names of effects to string) */
export type CutInTemplateJson = CutInTemplateInput | Record<string, unknown>

export const CUTIN_DEFAULTS: CutInTemplate = {
  version: CUTIN_TEMPLATE_VERSION,
  name: '',
  text: 'メッセージ',
  subText: '',
  subPosition: 'below',
  writing: 'h',
  align: 'center',
  autoFit: true,
  anchor: 'mc',
  marginX: 64,
  marginY: 56,
  offsetX: 0,
  offsetY: 0,

  fontFamily: '"Noto Serif JP", serif',
  weight: 700,
  italic: false,
  fontSize: 130,
  letterSpacing: 0.08,
  lineHeight: 1.5,
  subFontFamily: '',
  subWeight: 400,
  subItalic: false,
  subSize: 0.3,
  subLetterSpacing: 0.25,
  subGap: 0.3,

  fill: { type: 'solid', color: '#ffffff', color2: '#ffd76a', color3: '', dir: 'v' },
  fillOpacity: 1,
  stroke: { on: true, width: 5, color: '#1b1b1f' },
  stroke2: { on: false, width: 6, color: '#ffffff' },
  shadow: { on: true, color: '#000000', opacity: 0.6, blur: 12, x: 0, y: 5 },
  glow: { on: false, color: '#7fb4ff', size: 28, strength: 1 },
  subColorOn: false,
  subColor: '#ffffff',
  deco: {
    type: 'none', color: '#000000', opacity: 0.55, color2: '#ffffff', pad: 0.4, extend: 0.8, thickness: 3, outline: false,
    soft: 0.5, sideFade: 0.3, radius: 0.2, anim: 'grow', dur: 0.45,
    tapeColor: '#f5c400', tapeStripe: '#151515', tapeSize: 40, tapeSpeed: 90, tapeBlink: 0.5,
  },
  bg: { type: 'none', color: '#000000', opacity: 0.45, sync: true },

  inFx: 'fade',
  inDur: 0.6,
  inStagger: 0,
  inOrder: 'forward',
  inEase: 'auto',
  inPower: 1,
  inDir: 'left',
  holdFx: 'none',
  hold: 1.5,
  holdPower: 1,
  glitchColor: '#ff285a',
  glitchColor2: '#28e6ff',
  outFx: 'fade',
  outDur: 0.6,
  outStagger: 0,
  outOrder: 'forward',
  outEase: 'auto',
  outPower: 1,
  outDir: 'left',
  subFx: 'same',
  subDelay: -0.2,
  startDelay: 0.1,
  endDelay: 0.3,
}

// Keys whose value is one of a list. Other values take the default
const CHOICES: Record<string, readonly string[]> = {
  subPosition: ['above', 'below'], writing: ['h', 'v'], align: ['start', 'center', 'end'], anchor: ANCHORS,
  inFx: CUTIN_IN_FX, outFx: CUTIN_OUT_FX, holdFx: HOLD_FX, subFx: SUB_FX, inDir: DIRS, outDir: DIRS,
  inOrder: ORDERS, outOrder: ORDERS, inEase: EASES, outEase: EASES,
  'fill.type': ['solid', 'gradient'], 'fill.dir': ['v', 'h', 'd'], 'deco.type': DECO_TYPES, 'deco.anim': ['grow', 'fade', 'none'], 'bg.type': BG_TYPES,
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Values of `patch` over `base`, key by key. Unknown keys, values of another type and values out of their list are dropped */
function mergeKnown<T>(base: T, patch: unknown, path = ''): T {
  if (!isPlainObject(patch) || !isPlainObject(base)) return base
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(base)) {
    const current = base[key]
    const value = patch[key]
    if (value === undefined) continue
    if (isPlainObject(current)) out[key] = mergeKnown(current, value, `${path}${key}.`)
    else if (typeof value === typeof current && (CHOICES[path + key]?.includes(value as string) ?? true)) out[key] = value
  }
  return out as T
}

/** A complete template from JSON (a parsed object or a string). Missing or broken keys take the defaults */
export function normalizeCutInTemplate(input: CutInTemplateJson | string | unknown): CutInTemplate {
  const value = typeof input === 'string' ? JSON.parse(input) as unknown : input
  if (!isPlainObject(value)) throw new Error('カットインのテンプレートはJSONのオブジェクトで指定してください')
  return { ...mergeKnown(CUTIN_DEFAULTS, value), version: CUTIN_TEMPLATE_VERSION }
}
