import { describe, expect, it } from 'vitest'
import { CUTIN_TEMPLATES } from './templates'

describe('CUTIN_TEMPLATES', () => {
  it('reads the JSON files of src/cutin/templates/ by file name', () => {
    expect(CUTIN_TEMPLATES['battle-start']).toMatchObject({ name: '戦闘開始', text: '戦闘開始', inFx: 'drop' })
  })

  it('fills every template to the full shape', () => {
    for (const template of Object.values(CUTIN_TEMPLATES)) {
      expect(template.version).toBe(1)
      expect(template.deco).toBeDefined()
    }
  })
})
