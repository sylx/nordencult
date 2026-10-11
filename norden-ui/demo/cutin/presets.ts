/*
 * Starting points of the cut-in editor
 * (the ones a strategy game would use). Not part of the library.
 */
import type { CutInTemplateInput } from '../../src'

/** Fonts the editor can pick. The editor loads them from Google Fonts; the game loads them itself */
export interface FontChoice {
  family: string
  /** CSS font-family list written to the template (Latin fonts fall back to a Japanese font) */
  stack: string
  weights: number[]
  group: '明朝' | 'ゴシック' | 'デザイン' | '欧文'
}

const font = (family: string, weights: number[], group: FontChoice['group'], fallback: string): FontChoice =>
  ({ family, weights, group, stack: `"${family}", ${fallback}` })

export const FONT_CHOICES: FontChoice[] = [
  font('Noto Serif JP', [400, 700, 900], '明朝', 'serif'),
  font('Shippori Mincho', [400, 700, 800], '明朝', 'serif'),
  font('Shippori Mincho B1', [400, 700, 800], '明朝', 'serif'),
  font('Zen Old Mincho', [400, 700, 900], '明朝', 'serif'),
  font('BIZ UDPMincho', [400, 700], '明朝', 'serif'),
  font('Noto Sans JP', [400, 700, 900], 'ゴシック', 'sans-serif'),
  font('Zen Kaku Gothic New', [400, 700, 900], 'ゴシック', 'sans-serif'),
  font('M PLUS Rounded 1c', [400, 700, 900], 'ゴシック', 'sans-serif'),
  font('Zen Antique', [400], 'デザイン', 'serif'),
  font('Kaisei Decol', [400, 700], 'デザイン', 'serif'),
  font('Dela Gothic One', [400], 'デザイン', 'sans-serif'),
  font('Yuji Syuku', [400], 'デザイン', 'serif'),
  font('DotGothic16', [400], 'デザイン', 'monospace'),
  font('Cinzel', [400, 700, 900], '欧文', '"Noto Serif JP", serif'),
  font('Cinzel Decorative', [400, 700, 900], '欧文', '"Noto Serif JP", serif'),
  font('Cormorant Garamond', [400, 700], '欧文', '"Shippori Mincho", serif'),
  font('IM Fell English', [400], '欧文', '"Zen Old Mincho", serif'),
  font('UnifrakturMaguntia', [400], '欧文', '"Zen Antique", serif'),
  font('Oswald', [400, 700], '欧文', '"Noto Sans JP", sans-serif'),
  font('Bebas Neue', [400], '欧文', '"Noto Sans JP", sans-serif'),
  font('Orbitron', [400, 700, 900], '欧文', '"Zen Kaku Gothic New", sans-serif'),
]

const stack = (family: string) => FONT_CHOICES.find(choice => choice.family === family)!.stack
const SMB1 = stack('Shippori Mincho B1')
const SM = stack('Shippori Mincho')
const ZOM = stack('Zen Old Mincho')
const NSJ = stack('Noto Sans JP')
const CINZEL = stack('Cinzel')
const OSWALD = stack('Oswald')

const OFF = { on: false }

// Battle start and end share the design
const BATTLE: CutInTemplateInput = {
  fontFamily: SMB1, weight: 800, fontSize: 124, letterSpacing: 0.12,
  subFontFamily: CINZEL, subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.62,
  fill: { type: 'solid', color: '#ffffff' },
  stroke: OFF, stroke2: OFF,
  shadow: { on: true, color: '#000000', opacity: 0.35, blur: 10, x: 0, y: 3 },
  glow: OFF,
  deco: { type: 'frame', color: '#000000', opacity: 0, color2: '#ffffff', thickness: 3, pad: 0.28, extend: 12, anim: 'grow', dur: 0.6 },
  inFx: 'drop', inDur: 0.55, inStagger: 0.1, inPower: 1.1, hold: 1.4, outFx: 'zoomThrough', outDur: 0.5, subFx: 'fade', subDelay: -0.1,
}

// Chapter, prologue and epilogue share the design (only the glow and line colors differ)
const CHAPTER: CutInTemplateInput = {
  fontFamily: SMB1, weight: 800, fontSize: 128, letterSpacing: 0.22,
  subFontFamily: '', subWeight: 400, subSize: 0.3, subLetterSpacing: 0.15, subGap: 0.45,
  fill: { type: 'solid', color: '#ffffff' }, stroke: OFF, stroke2: OFF,
  shadow: { on: true, color: '#000000', opacity: 0.8, blur: 14, x: 0, y: 4 },
  deco: { type: 'underline', color2: '#ffffff', pad: 0.3, extend: 0.5, thickness: 2, anim: 'grow', dur: 0.9 },
  inFx: 'blurIn', inDur: 1.0, inStagger: 0.15, hold: 1.6, outFx: 'fade', outDur: 0.8, subFx: 'fade', subDelay: -0.2,
}

// Day 1 and the final day share the design
const DAY: CutInTemplateInput = {
  fontFamily: SMB1, weight: 800, fontSize: 150, letterSpacing: 0.3,
  subFontFamily: '', subWeight: 700, subSize: 0.2, subLetterSpacing: 0.5, subGap: 0.5,
  fill: { type: 'solid', color: '#fff6e3' }, stroke: OFF, stroke2: OFF,
  shadow: { on: true, color: '#000000', opacity: 0.75, blur: 14, x: 0, y: 4 },
  glow: { on: true, color: '#ffcf7a', size: 22, strength: 0.45 },
  subColorOn: true, subColor: '#e8c27a',
  deco: { type: 'underline', color2: '#e0b35a', pad: 0.3, extend: 0.9, thickness: 2, anim: 'grow', dur: 0.9 },
  inFx: 'rise', inDur: 1.1, inStagger: 0.12, hold: 1.6, outFx: 'fade', outDur: 0.8, subFx: 'fade', subDelay: -0.3,
}

export interface PresetGroup {
  label: string
  templates: { id: string; template: CutInTemplateInput }[]
}

const preset = (id: string, name: string, text: string, subText: string, patch: CutInTemplateInput) =>
  ({ id, template: { ...patch, name, text, subText } })

export const PRESET_GROUPS: PresetGroup[] = [
  {
    label: '戦闘',
    templates: [
      preset('battle', '戦闘開始', '戦闘開始', 'BATTLE START', BATTLE),
      preset('battleEnd', '戦闘終了', '戦闘終了', 'BATTLE END', BATTLE),
      preset('round', 'ラウンド', 'ROUND 1', '', {
        fontFamily: SMB1, weight: 800, fontSize: 124, letterSpacing: 0.16,
        fill: { type: 'solid', color: '#ffffff' }, stroke: OFF, stroke2: OFF,
        shadow: { on: true, color: '#000000', opacity: 0.35, blur: 10, x: 0, y: 3 }, glow: OFF,
        deco: { type: 'sides', color2: '#ffffff', pad: 0.5, extend: 1.6, thickness: 3, anim: 'grow', dur: 0.6 },
        inFx: 'drop', inDur: 0.55, inStagger: 0.1, inPower: 1.1, hold: 1.3, outFx: 'fade', outDur: 0.5,
      }),
      preset('finalRound', 'ファイナルラウンド', 'FINAL ROUND', '', {
        fontFamily: SMB1, weight: 800, fontSize: 124, letterSpacing: 0.1,
        fill: { type: 'gradient', color: '#fff4e0', color2: '#ffc27a', color3: '#ff3b1f', dir: 'v' },
        stroke: { on: true, width: 2, color: '#3a0600' }, stroke2: OFF,
        shadow: { on: true, color: '#1a0000', opacity: 0.7, blur: 12, x: 0, y: 4 },
        glow: { on: true, color: '#ff2a10', size: 34, strength: 1 },
        deco: { type: 'sides', color2: '#ff4a2a', pad: 0.45, extend: 1.0, thickness: 4, anim: 'grow', dur: 0.6 },
        inFx: 'slam', inDur: 0.7, holdFx: 'glitch', holdPower: 1, hold: 1.6, outFx: 'zoomThrough', outDur: 0.5,
      }),
      // Red and black: red text on a black band, the glitch also in red and black
      preset('defeat', '敗北', '敗北', 'DEFEAT', {
        fontFamily: SMB1, weight: 800, fontSize: 150, letterSpacing: 0.3,
        subFontFamily: CINZEL, subWeight: 700, subSize: 0.2, subLetterSpacing: 0.9, subGap: 0.45,
        fill: { type: 'gradient', color: '#ff7070', color2: '#e41414', color3: '#780000', dir: 'v' },
        stroke: { on: true, width: 2, color: '#000000' }, stroke2: OFF,
        shadow: { on: true, color: '#000000', opacity: 0.9, blur: 14, x: 0, y: 5 },
        glow: { on: true, color: '#c80000', size: 30, strength: 1 },
        subColorOn: true, subColor: '#e03a3a',
        deco: { type: 'band', color: '#000000', opacity: 0.88, pad: 0.42, soft: 0.25, sideFade: 0.35, anim: 'grow', dur: 0.35 },
        glitchColor: '#ff2020', glitchColor2: '#000000',
        inFx: 'glitch', inDur: 0.9, holdFx: 'glitch', holdPower: 1, hold: 1.8, outFx: 'glitch', outDur: 0.8, subFx: 'fade', subDelay: -0.2,
      }),
      preset('emergency', '緊急事態', '緊急事態', 'EMERGENCY', {
        fontFamily: NSJ, weight: 900, fontSize: 118, letterSpacing: 0.32,
        subFontFamily: OSWALD, subWeight: 700, subSize: 0.26, subLetterSpacing: 0.7, subGap: 0.32,
        fill: { type: 'solid', color: '#ffffff' }, stroke: { on: true, width: 4, color: '#8a0000' }, stroke2: OFF,
        shadow: { on: true, color: '#000000', opacity: 0.65, blur: 8, x: 0, y: 3 }, glow: OFF,
        subColorOn: true, subColor: '#f5c400',
        deco: { type: 'tape', pad: 0.3, anim: 'grow', dur: 0.55, tapeSize: 54, tapeSpeed: 110, tapeBlink: 0.55 },
        inFx: 'shutter', inDir: 'v', inDur: 0.45, hold: 1.8, outFx: 'fade', outDur: 0.5, subFx: 'fade', subDelay: -0.1,
      }),
      // Italic text slides in on a black band from the left and wipes out to the right
      preset('missionClear', 'ミッションクリア', 'MISSION CLEAR', 'ミッションクリア', {
        fontFamily: OSWALD, weight: 700, fontSize: 130, letterSpacing: 0.12, italic: true,
        subFontFamily: NSJ, subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.28, subItalic: true,
        fill: { type: 'solid', color: '#ffffff' }, stroke: OFF, stroke2: OFF, shadow: OFF, glow: OFF,
        subColorOn: true, subColor: '#bdbdbd',
        deco: { type: 'band', color: '#000000', opacity: 0.9, pad: 0.3, soft: 0, sideFade: 0, anim: 'grow', dur: 0.25 },
        inFx: 'slide', inDir: 'left', inDur: 0.35, inStagger: 0.03, inPower: 2, hold: 1.6,
        outFx: 'wipe', outDir: 'lr', outDur: 0.35, subFx: 'fade', subDelay: -0.1,
      }),
    ],
  },
  {
    label: 'シーン・時間',
    templates: [
      preset('chapter', '章タイトル', '第一章', '「目覚めの夜」', CHAPTER),
      preset('prologue', 'プロローグ', 'プロローグ', '「すべての始まり」', {
        ...CHAPTER, glow: { on: true, color: '#9fbaff', size: 22, strength: 0.5 }, deco: { ...CHAPTER.deco, color2: '#c9d8ff' },
      }),
      preset('epilogue', 'エピローグ', 'エピローグ', '「そして、夜が明ける」', {
        ...CHAPTER, glow: { on: true, color: '#ffd59a', size: 22, strength: 0.5 }, deco: { ...CHAPTER.deco, color2: '#f0d6a4' },
      }),
      // Thin gold lines above and below and a Latin sub text
      preset('intermission', '幕間', '幕間', 'INTERMISSION', {
        fontFamily: SMB1, weight: 800, fontSize: 130, letterSpacing: 0.6,
        subFontFamily: CINZEL, subWeight: 700, subSize: 0.2, subLetterSpacing: 0.7, subGap: 0.5,
        fill: { type: 'solid', color: '#f7f1e3' }, stroke: OFF, stroke2: OFF,
        shadow: { on: true, color: '#000000', opacity: 0.75, blur: 14, x: 0, y: 4 }, glow: OFF,
        subColorOn: true, subColor: '#d8c28a',
        deco: { type: 'lines', color2: '#d8c28a', pad: 0.35, extend: 0.9, thickness: 1.5, anim: 'grow', dur: 0.9 },
        inFx: 'fade', inDur: 1.0, inStagger: 0.2, hold: 1.8, outFx: 'fade', outDur: 0.9, subFx: 'fade', subDelay: -0.3,
      }),
      // Sepia text bleeds out of a blur and blurs away
      preset('flashback', '回想', '回想', 'FLASHBACK', {
        fontFamily: ZOM, weight: 700, fontSize: 140, letterSpacing: 0.5,
        subFontFamily: CINZEL, subWeight: 400, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.45,
        fill: { type: 'gradient', color: '#f6e7c8', color2: '#dcb983', color3: '#9a7446', dir: 'v' },
        stroke: OFF, stroke2: OFF,
        shadow: { on: true, color: '#1e1206', opacity: 0.7, blur: 14, x: 0, y: 4 },
        glow: { on: true, color: '#c89b5a', size: 24, strength: 0.5 },
        subColorOn: true, subColor: '#d9bd8e',
        inFx: 'blurIn', inDur: 1.4, inStagger: 0.2, hold: 1.6, outFx: 'blurOut', outDur: 1.1, subFx: 'fade', subDelay: -0.4,
      }),
      preset('day', '一日目', '一日目', 'DAY 1', DAY),
      // Like a film's "ONE DAY LATER": the letters close in
      preset('dayLater', '一日後', '一日後', 'ONE DAY LATER', {
        fontFamily: SM, weight: 800, fontSize: 110, letterSpacing: 0.45,
        subFontFamily: CINZEL, subWeight: 400, subSize: 0.22, subLetterSpacing: 0.6, subGap: 0.45,
        fill: { type: 'solid', color: '#f2f2f2' }, stroke: OFF, stroke2: OFF,
        shadow: { on: true, color: '#000000', opacity: 0.8, blur: 14, x: 0, y: 4 },
        glow: { on: true, color: '#ffffff', size: 18, strength: 0.3 },
        inFx: 'tracking', inDur: 1.6, hold: 1.4, outFx: 'tracking', outDur: 1.2, subFx: 'fade', subDelay: -0.6,
      }),
      preset('finalDay', '最終日', '最終日', 'FINAL DAY', DAY),
      // Sunrise: white to pale gold with a warm glow, rising slowly
      preset('nextMorning', '翌朝', '翌朝', 'THE NEXT MORNING', {
        fontFamily: SMB1, weight: 800, fontSize: 150, letterSpacing: 0.4,
        subFontFamily: CINZEL, subWeight: 700, subSize: 0.2, subLetterSpacing: 0.6, subGap: 0.45,
        fill: { type: 'gradient', color: '#ffffff', color2: '#fff0c8', color3: '#ffcf73', dir: 'v' },
        stroke: OFF, stroke2: OFF,
        shadow: { on: true, color: '#3a2400', opacity: 0.5, blur: 12, x: 0, y: 4 },
        glow: { on: true, color: '#ffc15a', size: 34, strength: 0.8 },
        subColorOn: true, subColor: '#ffd98a',
        inFx: 'rise', inDur: 1.4, inStagger: 0.15, inPower: 0.8, holdFx: 'glow', holdPower: 0.5, hold: 1.6,
        outFx: 'fade', outDur: 1.0, subFx: 'fade', subDelay: -0.3,
      }),
      // Moonlight: pale blue text out of a blur, the glow wavers while shown
      preset('midnight', '真夜中', '午前零時', 'MIDNIGHT', {
        fontFamily: SM, weight: 700, fontSize: 110, letterSpacing: 0.4,
        subFontFamily: CINZEL, subWeight: 400, subSize: 0.22, subLetterSpacing: 0.6, subGap: 0.45,
        fill: { type: 'gradient', color: '#f2f7ff', color2: '#c9dbff', color3: '#8fb0f0', dir: 'v' },
        stroke: OFF, stroke2: OFF,
        shadow: { on: true, color: '#000814', opacity: 0.8, blur: 14, x: 0, y: 4 },
        glow: { on: true, color: '#6f9bff', size: 28, strength: 0.8 },
        subColorOn: true, subColor: '#aac4ff',
        inFx: 'blurIn', inDur: 1.2, inStagger: 0.1, holdFx: 'glow', holdPower: 0.7, hold: 1.8,
        outFx: 'blurOut', outDur: 1.0, subFx: 'fade', subDelay: -0.3,
      }),
      preset('timeSkip', '時間経過', '一時間経過', 'ONE HOUR LATER', {
        fontFamily: SM, weight: 700, fontSize: 76, letterSpacing: 0.35,
        subFontFamily: CINZEL, subWeight: 400, subSize: 0.26, subLetterSpacing: 0.5, subGap: 0.5,
        fill: { type: 'solid', color: '#f2f2f2' }, stroke: OFF, stroke2: OFF,
        shadow: { on: true, color: '#000000', opacity: 0.8, blur: 12, x: 0, y: 3 }, glow: OFF,
        deco: { type: 'sides', color2: '#f2f2f2', pad: 0.55, extend: 2.6, thickness: 1.5, anim: 'grow', dur: 1.0 },
        inFx: 'fade', inDur: 1.0, inStagger: 0.06, hold: 1.5, outFx: 'fade', outDur: 0.9, subFx: 'fade', subDelay: -0.2,
      }),
    ],
  },
  {
    label: 'その他',
    templates: [
      preset('explore', '探索開始', '探索開始', 'EXPLORATION', {
        fontFamily: SM, weight: 800, fontSize: 116, letterSpacing: 0.28,
        subFontFamily: CINZEL, subWeight: 700, subSize: 0.22, subLetterSpacing: 0.5, subGap: 0.4,
        fill: { type: 'solid', color: '#f6f1e7' }, stroke: OFF, stroke2: OFF,
        shadow: { on: true, color: '#000000', opacity: 0.8, blur: 16, x: 0, y: 4 },
        glow: { on: true, color: '#9fc3ff', size: 26, strength: 0.7 },
        deco: { type: 'lines', color2: '#e8dcc0', pad: 0.35, extend: 1.2, thickness: 2, anim: 'grow', dur: 0.8 },
        inFx: 'tracking', inDur: 1.4, hold: 1.4, outFx: 'tracking', outDur: 1.0, subFx: 'fade', subDelay: -0.5,
      }),
      preset('simple', 'シンプルテキスト', 'メッセージ', '', {
        fontFamily: NSJ, weight: 700, fontSize: 110, letterSpacing: 0.08,
        fill: { type: 'solid', color: '#ffffff' }, stroke: { on: true, width: 4, color: '#1b1b1f' }, stroke2: OFF,
        shadow: { on: true, color: '#000000', opacity: 0.5, blur: 10, x: 0, y: 4 }, glow: OFF,
        inFx: 'fade', inDur: 0.6, hold: 1.6, outFx: 'fade', outDur: 0.6,
      }),
    ],
  },
]

export const ALL_PRESETS = PRESET_GROUPS.flatMap(group => group.templates)
