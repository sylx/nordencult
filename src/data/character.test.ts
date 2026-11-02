import { describe, expect, it } from 'vitest'
import { CHARACTER_LIST, CHARACTER_START } from './character'
import { CITY_LIST } from './city'
import { FACTION_MAP } from './faction'

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

  it('holds grudges against real factions only, and only among those starting 放浪', () => {
    for (const start of CHARACTER_START) {
      if (!start.grudge) continue
      expect(FACTION_MAP[start.grudge], `${start.id} の怨恨勢力`).toBeDefined()
      expect(start.factionId, `${start.id} は放浪で始まる`).toBeUndefined()
    }
  })

  it('starts everyone else serving a faction: none of the present knights starts 放浪', () => {
    const mercenary = new Set(mercenaries.map((c) => c.id))
    expect(CHARACTER_START.filter((s) => !s.factionId && !s.isPrisoner && !mercenary.has(s.id)).map((s) => s.id)).toEqual([])
  })
})
