import { describe, expect, it } from 'vitest'
import { SUMMON_NAME_MAX } from '../game/economy/balance'
import { RELIC_LIST } from './relics'
import { SUMMON_NAMES } from './summons'

describe('the names of summoned units', () => {
  it('has names for the template of every summon relic, none too long or repeated', () => {
    for (const relic of RELIC_LIST.filter((r) => r.summon)) {
      const names = SUMMON_NAMES[relic.summon!.characterId] ?? []
      expect(names.length, relic.id).toBeGreaterThan(0)
      expect(new Set(names).size, relic.id).toBe(names.length)
      for (const name of names) expect(name.length, name).toBeLessThanOrEqual(SUMMON_NAME_MAX)
    }
  })
})
