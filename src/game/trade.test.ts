import { describe, expect, it } from 'vitest'
import { GameRuleError } from './errors'
import { citiesOf } from './queries'
import { createInitialState } from './setup'
import { buySupplies, buySuppliesProblem } from './trade'

describe('buySupplies', () => {
  it('takes the gold of the faction holding the city and stores the supplies there', () => {
    const state = createInitialState()
    const city = citiesOf(state, 'carta')[0]
    const bought = buySupplies(state, city, 300, 200)
    expect(bought.gold.carta).toBe(state.gold.carta - 200)
    expect(bought.cities[city].storedSupplies).toBe(state.cities[city].storedSupplies + 300)
  })

  it('needs the gold, and a city of a faction', () => {
    const state = createInitialState()
    const city = citiesOf(state, 'carta')[0]
    expect(buySuppliesProblem(state, city, state.gold.carta + 1)).toBe('金が足りません')
    expect(() => buySupplies(state, city, 1, state.gold.carta + 1)).toThrow(GameRuleError)
    const neutral = Object.keys(state.cities).find((id) => !state.cityOwners[id])
    if (neutral) expect(buySuppliesProblem(state, neutral, 0)).toBe('勢力の都市ではありません')
  })
})
