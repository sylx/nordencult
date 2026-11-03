import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import { playing } from '../game/testing'
import { DIALOGUE_PANELS } from './panels'

describe('the panels', () => {
  it('shows the mercenary with their abilities and what the lines say they ask', () => {
    const panel = DIALOGUE_PANELS.mercenary({ vars: { merc: '042', price: 2000, monthly: 334 }, state: playing('carta') })
    expect(isValidElement(panel)).toBe(true)
    expect((panel as { props: object }).props).toMatchObject({
      mercenary: { company: 'ドゥンダリン盾隊', rank: 'C' }, abilities: true, figure: false,
      prices: [{ label: '契約金', value: 2000 }, { label: '月額', value: 334 }],
    })
  })

  it('shows no prices without them, and the start of the game without a state', () => {
    const panel = DIALOGUE_PANELS.mercenary({ vars: { merc: '042' } })
    expect((panel as { props: object }).props).toMatchObject({ mercenary: { company: 'ドゥンダリン盾隊' }, prices: [] })
  })
})
