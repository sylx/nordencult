import { describe, expect, it } from 'vitest'
import { CHARACTER_LIST, CHARACTER_START, isSpecialCharacterId, nextCharacterId } from './character'
import { CITY_LIST } from './city'
import { FACTION_MAP } from './faction'
import { UNIT_TYPES_BY_CHARACTER_TYPE } from './unitTypes'

describe('character data', () => {
  const mercenaries = CHARACTER_LIST.filter((c) => c.mercenaryInfo)

  it('starts every mercenary in a city, serving nobody', () => {
    const starts = new Map(CHARACTER_START.map((s) => [s.id, s]))
    const cities = new Set(CITY_LIST.map((c) => c.id))
    for (const { id } of mercenaries) {
      const start = starts.get(id)
      expect(start?.cityId && cities.has(start.cityId), `${id} の開始位置`).toBe(true)
      expect(start?.factionId, `${id} の開始の勢力`).toBeUndefined()
      expect(start?.isLord, `${id} は領主で始まらない`).toBeFalsy()
    }
  })

  it('gives mercenaries soldiers and a pride within their limits', () => {
    for (const { id, mercenaryInfo } of mercenaries) {
      const { maxSoldiers, pride, fee } = mercenaryInfo!
      expect(maxSoldiers, `${id} の最大兵力`).toBeGreaterThan(0)
      expect(maxSoldiers, `${id} の最大兵力`).toBeLessThanOrEqual(1000)
      expect(pride, `${id} のプライド`).toBeGreaterThanOrEqual(1)
      expect(pride, `${id} のプライド`).toBeLessThanOrEqual(5)
      expect(fee, `${id} の契約金`).toBeGreaterThan(0)
    }
  })

  it('gives a company a unit type its leader can lead', () => {
    for (const { id, type, mercenaryInfo } of mercenaries) {
      if (mercenaryInfo!.unitType) expect(UNIT_TYPES_BY_CHARACTER_TYPE[type], `${id} の兵科`).toContain(mercenaryInfo!.unitType)
    }
  })

  it('holds grudges against real factions only, and only among those starting 放浪', () => {
    for (const start of CHARACTER_START) {
      if (!start.grudge) continue
      expect(FACTION_MAP[start.grudge], `${start.id} の怨恨勢力`).toBeDefined()
      expect(start.factionId, `${start.id} は放浪で始まる`).toBeUndefined()
    }
  })

  it('places no special character (991..999), and makes them 召喚 templates', () => {
    const specials = CHARACTER_LIST.filter((c) => isSpecialCharacterId(c.id))
    expect(specials.map((c) => [c.id, c.type])).toEqual([['991', 'summon'], ['992', 'summon'], ['993', 'summon']])
    for (const { id } of specials) expect(CHARACTER_START.some((s) => s.id === id), `${id} は配置しない`).toBe(false)
  })
})

describe('the ids of special characters', () => {
  it('are 991..999', () => {
    expect(['990', '991', '999', '1000', '001', 'x'].map(isSpecialCharacterId)).toEqual([false, true, true, false, false, false])
  })

  it('are skipped when numbering a new character, which is refused once 990 is taken', () => {
    expect(nextCharacterId([])).toBe('001')
    expect(nextCharacterId(['001', '130'])).toBe('131')
    expect(nextCharacterId(['001', '130', '991', '993'])).toBe('131')
    expect(nextCharacterId(['989', '991'])).toBe('990')
    expect(nextCharacterId(['990', '991'])).toBeNull()
  })
})
