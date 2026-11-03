import { describe, expect, it } from 'vitest'
import { playing } from '../game/testing'
import { RANDOM_EVENTS, pickRandomEvent, type AnyRandomEvent } from './events'
import { SCENES } from './index'

const merchant = (id: string, weight: number, open = true): AnyRandomEvent => ({ id, scene: 'travelingMerchant', weight, when: () => (open ? { city: 'P012' } : null) })

describe('pickRandomEvent', () => {
  it('picks among the events that can happen, by their weights', () => {
    const state = playing('carta')
    const events = [merchant('a', 1), merchant('b', 3), merchant('closed', 100, false)]
    expect(pickRandomEvent(state, 'carta', () => 0, events)?.event.id).toBe('a')
    expect(pickRandomEvent(state, 'carta', () => 0.24, events)?.event.id).toBe('a')
    expect(pickRandomEvent(state, 'carta', () => 0.26, events)?.event.id).toBe('b')
    expect(pickRandomEvent(state, 'carta', () => 0.999, events)?.event.id).toBe('b')
    expect(pickRandomEvent(state, 'carta', () => 0.5, [merchant('closed', 1, false)])).toBeNull()
  })

  it('names scenes there are, with their input', () => {
    const state = playing('carta')
    for (const event of RANDOM_EVENTS) expect(SCENES[event.scene]).toBeDefined()
    expect(pickRandomEvent(state, 'carta', () => 0)).toMatchObject({ event: { id: 'travelingMerchant' }, input: { city: expect.any(String) } })
  })
})
