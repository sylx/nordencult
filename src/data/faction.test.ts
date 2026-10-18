import { describe, expect, it } from 'vitest'
import { FACTION_LIST as MAP_FACTION_LIST } from 'norden-strategy/data'
import { CITY_LIST } from './city'
import { FACTION_LIST, FACTION_MAP } from './faction'

describe('faction data', () => {
  it('matches the map\'s copy (norden-strategy\'s FACTION_LIST)', () => {
    const shared = ({ id, name, emblem }: typeof MAP_FACTION_LIST[number]) => ({ id, name, emblem })
    expect(MAP_FACTION_LIST.map(shared)).toEqual(FACTION_LIST.map(shared))
  })

  it('has the factions the cities start in', () => {
    const unknown = CITY_LIST.filter((c) => c.belongTo && !FACTION_MAP[c.belongTo]).map((c) => `${c.id} ${c.belongTo}`)
    expect(unknown).toEqual([])
  })
})
