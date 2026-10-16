import { describe, expect, it } from 'vitest'
import { CITY_LIST as MAP_CITY_LIST } from 'norden-strategy/data'
import { CITY_LIST } from './city'

describe('city data', () => {
  it('matches the map\'s copy (norden-strategy\'s CITY_LIST)', () => {
    const shared = ({ id, name, nameEn, type, tags, population, market, production, special, belongTo }: typeof CITY_LIST[number]) =>
      ({ id, name, nameEn, type, tags, population, market, production, special, belongTo })
    expect(MAP_CITY_LIST.map(shared)).toEqual(CITY_LIST.map(shared))
  })
})
