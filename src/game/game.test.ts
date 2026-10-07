import { describe, expect, it } from 'vitest'
import {
  addOrder, availableKnights, cancelOrder, charactersIn, createInitialState, endFactionTurn, GameRuleError,
  invasionTargets, orderProblem, readPlayerFaction, resolveBattle, startNextBattle, turnOrder, type GameState,
} from '.'

// The demo of M001: カルタ書院 invades アンバリア (P004, レオニス帝国) from フルーエン (P012)
const FLUEN = 'P012'
const AMBARIA = 'P004'
const VERSTA = 'P005' // レオニス帝国, next to アンバリア

/** Ends the strategy phase of every faction */
function endStrategyPhase(state: GameState): GameState {
  while (state.phase === 'strategy') state = endFactionTurn(state)
  return state
}

function invadeAmbaria(knights = ['015', '016']): GameState {
  return addOrder(createInitialState('carta'), { factionId: 'carta', from: FLUEN, to: AMBARIA, knights })
}

describe('setup', () => {
  it('starts the player on turn 1', () => {
    const state = createInitialState('carta')
    expect(state.turn).toBe(1)
    expect(state.phase).toBe('strategy')
    expect(state.activeFaction).toBe('carta')
    expect(state.cityOwners[AMBARIA]).toBe('leonis')
    expect(charactersIn(state, FLUEN)).toEqual(['015', '016', '027', '029'])
    expect(state.characters['029'].isLord).toBe(true)
  })

  it('gives characters without a faction the faction of their city', () => {
    expect(createInitialState().characters['028']).toMatchObject({ cityId: 'P001', factionId: 'taurus' })
  })

  it('reads the player faction from the URL', () => {
    expect(readPlayerFaction('?faction=leonis')).toBe('leonis')
    expect(readPlayerFaction('')).toBe('carta')
    expect(readPlayerFaction('?faction=nope')).toBe('carta')
  })

  it('plays the player first, then the others in FACTION_LIST order', () => {
    expect(turnOrder(createInitialState('leonis'))).toEqual(
      ['leonis', 'valhardt', 'dracken', 'carta', 'aqua', 'rosalia', 'taurus', 'sede'])
  })
})

describe('orders', () => {
  it('targets neighbouring cities of other factions', () => {
    expect(invasionTargets(createInitialState('carta'), FLUEN)).toEqual([AMBARIA])
  })

  it('adds and cancels an order', () => {
    const state = invadeAmbaria()
    expect(state.orders).toHaveLength(1)
    expect(availableKnights(state, FLUEN)).toEqual(['027', '029'])
    expect(cancelOrder(state, state.orders[0].id).orders).toHaveLength(0)
  })

  it('rejects orders breaking the rules', () => {
    const state = createInitialState('carta')
    const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, knights: ['015'] }
    expect(orderProblem(state, draft)).toBeNull()
    expect(orderProblem(state, { ...draft, knights: [] })).not.toBeNull()
    expect(orderProblem(state, { ...draft, to: 'P005' })).not.toBeNull() // not joined by a road
    expect(orderProblem(state, { ...draft, to: 'P026' })).not.toBeNull() // シルヴァ is carta's own
    expect(orderProblem(state, { ...draft, knights: ['013'] })).not.toBeNull() // アンバリア's knight
    expect(orderProblem(state, { ...draft, factionId: 'leonis', from: AMBARIA, to: FLUEN, knights: ['013'] }))
      .not.toBeNull() // not leonis's turn
    const ordered = addOrder(state, draft)
    expect(orderProblem(ordered, { ...draft, knights: ['016'] })).not.toBeNull() // same target
    expect(() => addOrder(ordered, draft)).toThrow(GameRuleError)
  })

  it('allows sending every knight of a city', () => {
    const state = invadeAmbaria(['015', '016', '027', '029'])
    expect(availableKnights(state, FLUEN)).toEqual([])
    expect(state.cityOwners[FLUEN]).toBe('carta')
  })
})

describe('turns', () => {
  it('passes every CPU faction, then marches', () => {
    let state = endFactionTurn(createInitialState('carta'))
    expect(state.activeFaction).toBe('valhardt')
    state = endStrategyPhase(state)
    expect(state.phase).toBe('march')
    expect(state.activeFaction).toBeNull()
    expect(state.march).toEqual({ queue: [], current: null })
  })

  it('starts the next turn when no order is left', () => {
    const state = startNextBattle(endStrategyPhase(createInitialState('carta')))
    expect(state).toMatchObject({ turn: 2, phase: 'strategy', activeFaction: 'carta', orders: [], march: null })
  })

  it('creates the battle of the next order once', () => {
    const marching = startNextBattle(endStrategyPhase(invadeAmbaria()))
    const battle = marching.march?.current
    expect(battle).toMatchObject({
      cityId: AMBARIA,
      attacker: { factionId: 'carta', from: FLUEN, knights: ['015', '016'] },
      defender: { factionId: 'leonis', knights: ['013'] },
    })
    expect(startNextBattle(marching)).toBe(marching)
  })

  it('skips orders no longer possible', () => {
    let state = endStrategyPhase(invadeAmbaria())
    state = { ...state, cityOwners: { ...state.cityOwners, [AMBARIA]: 'carta' } }
    expect(startNextBattle(state)).toMatchObject({ turn: 2, phase: 'strategy' })
  })
})

describe('battle results', () => {
  const fight = (winner: 'attacker' | 'defender', state = invadeAmbaria()) => {
    const marching = startNextBattle(endStrategyPhase(state))
    return resolveBattle(marching, marching.march!.current!.id, winner)
  }

  it('the attacker takes the city; the defenders retreat to a neighbour of their own', () => {
    const state = fight('attacker')
    expect(state.cityOwners[AMBARIA]).toBe('carta')
    expect(state.characters['015']).toMatchObject({ cityId: AMBARIA, factionId: 'carta' })
    expect(state.characters['013']).toMatchObject({ cityId: VERSTA, factionId: 'leonis' })
    expect(state.lastBattle).toMatchObject({ winner: 'attacker', cityCaptured: true })
    expect(state.lastBattle?.moves).toEqual([
      { characterId: '015', kind: 'enter', from: FLUEN, to: AMBARIA },
      { characterId: '016', kind: 'enter', from: FLUEN, to: AMBARIA },
      { characterId: '013', kind: 'retreat', from: AMBARIA, to: VERSTA },
    ])
    expect(state.march?.current).toBeNull()
    expect(startNextBattle(state)).toMatchObject({ turn: 2, phase: 'strategy', activeFaction: 'carta' })
  })

  it('the defender holds; the attackers go back', () => {
    const state = fight('defender')
    expect(state.cityOwners[AMBARIA]).toBe('leonis')
    expect(state.characters['015']).toMatchObject({ cityId: FLUEN, factionId: 'carta' })
    expect(state.characters['013']).toMatchObject({ cityId: AMBARIA, factionId: 'leonis' })
    expect(state.lastBattle?.moves.map((m) => m.kind)).toEqual(['return', 'return'])
  })

  it('defenders with nowhere to retreat become unaffiliated', () => {
    // Every neighbour of アンバリア but フルーエン is someone else's
    let state = invadeAmbaria()
    state = { ...state, cityOwners: { ...state.cityOwners, [VERSTA]: 'taurus' } }
    state = fight('attacker', state)
    expect(state.characters['013']).toEqual({ cityId: null, factionId: null, isLord: false })
    expect(state.lastBattle?.moves.at(-1)).toMatchObject({ characterId: '013', kind: 'wander', to: null })
  })

  it('a lord who leaves their city is no longer its lord', () => {
    const state = fight('attacker', invadeAmbaria(['029']))
    expect(state.characters['029']).toMatchObject({ cityId: AMBARIA, isLord: false })
    expect(fight('defender', invadeAmbaria(['029'])).characters['029'].isLord).toBe(true)
  })
})
