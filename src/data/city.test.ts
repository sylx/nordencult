import { describe, expect, it } from 'vitest'
import { PLACE_POINTS } from 'norden-strategy/data'
import { CITY_LIST } from './city'

describe('city data', () => {
  it('has a place on the map for every city (norden-strategy\'s PLACE_POSITIONS)', () => {
    expect(CITY_LIST.filter((city) => !PLACE_POINTS[city.id]).map((city) => city.id)).toEqual([])
  })

  it('fixes only the pictures of 聖地・要塞', () => {
    const fixed = ['temple', 'fortress1', 'fortress2']
    expect(CITY_LIST.filter((city) => city.image !== undefined && !fixed.includes(city.image)).map((city) => city.id)).toEqual([])
  })
})
