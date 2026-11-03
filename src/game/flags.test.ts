import { describe, expect, it } from 'vitest'
import { GameRuleError } from './errors'
import { flagOf, setFlag } from './flags'
import { createInitialState } from './setup'

describe('flags', () => {
  it('start with none, and keep what is set', () => {
    const state = createInitialState()
    expect(state.flags).toEqual({})
    expect(flagOf(state, 'travelingMerchant:met')).toBeUndefined()
    const met = setFlag(setFlag(state, 'travelingMerchant:met', 2), 'hireMercenary:seen', true)
    expect(flagOf(met, 'travelingMerchant:met')).toBe(2)
    expect(flagOf(met, 'hireMercenary:seen')).toBe(true)
    expect(state.flags).toEqual({})
  })

  it('are named <scene id>:<name>', () => {
    const state = createInitialState()
    expect(() => setFlag(state, 'met', true)).toThrow(GameRuleError)
    expect(() => setFlag(state, 'a:b:c', true)).toThrow(GameRuleError)
  })
})
