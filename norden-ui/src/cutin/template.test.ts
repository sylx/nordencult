import { describe, expect, it } from 'vitest'
import { CUTIN_DEFAULTS, normalizeCutInTemplate } from './template'

describe('normalizeCutInTemplate', () => {
  it('fills missing keys with the defaults, also inside nested objects', () => {
    const template = normalizeCutInTemplate({ text: '戦闘開始', deco: { type: 'frame' } })
    expect(template.text).toBe('戦闘開始')
    expect(template.deco.type).toBe('frame')
    expect(template.deco.thickness).toBe(CUTIN_DEFAULTS.deco.thickness)
    expect(template.inFx).toBe(CUTIN_DEFAULTS.inFx)
  })

  it('reads a JSON string', () => {
    expect(normalizeCutInTemplate('{"hold": 3}').hold).toBe(3)
  })

  it('drops unknown keys and values of the wrong type', () => {
    const template = normalizeCutInTemplate({ hold: '3', extra: 1, stroke: { width: 'thick' } }) as unknown as Record<string, unknown>
    expect(template.hold).toBe(CUTIN_DEFAULTS.hold)
    expect(template.extra).toBeUndefined()
    expect((template.stroke as { width: number }).width).toBe(CUTIN_DEFAULTS.stroke.width)
  })

  it('drops values that are not in their list', () => {
    const template = normalizeCutInTemplate({ inFx: 'explode', deco: { type: 'frame', anim: 'spin' }, anchor: 'tc' })
    expect(template.inFx).toBe(CUTIN_DEFAULTS.inFx)
    expect(template.deco.type).toBe('frame')
    expect(template.deco.anim).toBe(CUTIN_DEFAULTS.deco.anim)
    expect(template.anchor).toBe('tc')
  })

  it('takes an object read from a JSON file, whose names are plain strings', () => {
    const json: { inFx: string; deco: { type: string } } = { inFx: 'slam', deco: { type: 'band' } }
    expect(normalizeCutInTemplate(json)).toMatchObject({ inFx: 'slam', deco: { type: 'band' } })
  })

  it('rejects what is not an object', () => {
    expect(() => normalizeCutInTemplate('[1, 2]')).toThrow()
    expect(() => normalizeCutInTemplate(null)).toThrow()
  })
})
