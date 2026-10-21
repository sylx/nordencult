import { describe, expect, it } from 'vitest'
import {
  addMoveOrder, addOrder, availableKnights, cancelMoveOrder, charactersIn, createInitialState, endFactionTurn, GameRuleError, governorOf,
  moveFromProblem, moveMonths, moveOrderProblem, moveRoute, moveTargets, movementLegs, runMovements, soldiersLeft, startNextBattle,
  suppliesLeft, type GameState, type MoveOrder,
} from '.'

// レオニス帝国: アンバリア (P004) — ヴェルスタ (P005) — P010 — P011 along its own roads
const AMBARIA = 'P004'
const VERSTA = 'P005'
const P010 = 'P010'
const P011 = 'P011'
const FLUEN = 'P012' // カルタ書院, next to アンバリア

const move = (draft: Partial<Omit<MoveOrder, 'id'>> = {}): Omit<MoveOrder, 'id'> => ({
  factionId: 'leonis', from: AMBARIA, to: VERSTA, knights: ['013'], troops: 0, supplies: 0, solo: false, ...draft,
})

const start = () => createInitialState('leonis')

/** Ends the strategy phase of every faction */
function endStrategyPhase(state: GameState): GameState {
  while (state.phase === 'strategy') state = endFactionTurn(state)
  return state
}

/** Plays progress phases (with no battles) until the strategy phase of the next turn */
function nextTurn(state: GameState): GameState {
  state = endStrategyPhase(state)
  while (state.phase === 'march') state = startNextBattle(state)
  return state
}

describe('routes', () => {
  it('goes along the faction\'s own roads, two months a road with soldiers and supplies', () => {
    const state = start()
    expect(moveRoute(state, 'leonis', AMBARIA, P011)).toEqual([AMBARIA, VERSTA, P010, P011])
    expect(moveTargets(state, AMBARIA)).toContain(P011)
    expect(moveTargets(state, AMBARIA)).not.toContain(AMBARIA)
    expect(moveTargets(state, AMBARIA)).not.toContain(FLUEN)
    expect([1, 2, 3, 5].map((hops) => moveMonths(hops, false))).toEqual([2, 4, 6, 10])
  })

  it('takes one or two months riding alone', () => {
    expect([1, 2, 3, 5].map((hops) => moveMonths(hops, true))).toEqual([1, 1, 2, 2])
  })
})

describe('move orders', () => {
  it('reserves the knights, soldiers and supplies until cancelled', () => {
    const state = addMoveOrder(start(), move({ knights: ['013', '087'], troops: 300, supplies: 100 }))
    expect(availableKnights(state, AMBARIA)).toEqual(['046'])
    expect(soldiersLeft(state, AMBARIA)).toBe(start().cities[AMBARIA].troops - 300)
    expect(suppliesLeft(state, AMBARIA)).toBe(start().cities[AMBARIA].storedSupplies - 100)
    const cancelled = cancelMoveOrder(state, state.moveOrders[0].id)
    expect(cancelled.moveOrders).toEqual([])
    expect(availableKnights(cancelled, AMBARIA)).toEqual(['013', '046', '087'])
  })

  it('rejects moves breaking the rules', () => {
    const state = start()
    expect(moveOrderProblem(state, move())).toBeNull()
    expect(moveOrderProblem(state, move({ to: FLUEN }))).not.toBeNull()
    expect(moveOrderProblem(state, move({ to: AMBARIA }))).not.toBeNull()
    expect(moveOrderProblem(state, move({ knights: [] }))).not.toBeNull()
    expect(moveOrderProblem(state, move({ knights: ['058'] }))).not.toBeNull() // ヴェルスタ's
    expect(moveOrderProblem(state, move({ solo: true, troops: 100 }))).not.toBeNull()
    expect(moveOrderProblem(state, move({ troops: state.cities[AMBARIA].troops + 10 }))).not.toBeNull()
    expect(moveOrderProblem(state, move({ supplies: state.cities[AMBARIA].storedSupplies + 10 }))).not.toBeNull()
    expect(() => addMoveOrder(state, move({ to: FLUEN }))).toThrow(GameRuleError)

    const invading = addOrder(state, { factionId: 'leonis', from: AMBARIA, to: FLUEN, commander: '013', knights: ['013'] })
    expect(moveOrderProblem(invading, move())).not.toBeNull()
    const moving = addMoveOrder(state, move())
    expect(moveOrderProblem(moving, move())).not.toBeNull()
    expect(moving.moveOrders).toHaveLength(1)
  })

  it('is open from a city with knights and another city of the faction', () => {
    expect(moveFromProblem(start(), AMBARIA)).toBeNull()
    expect(moveFromProblem(start(), FLUEN)).not.toBeNull()
    const everyone = addMoveOrder(start(), move({ knights: ['013', '046', '087'] }))
    expect(moveFromProblem(everyone, AMBARIA)).toBe('移動できる騎士がいません')
  })
})

describe('the progress phase', () => {
  it('moves the knights, soldiers and supplies to a neighbouring city in two months', () => {
    const before = start()
    // コンラート (046) is the lord of アンバリア: they leave it without one
    let state = addMoveOrder(before, move({ knights: ['046', '087'], troops: 300, supplies: 100 }))
    state = endStrategyPhase(state)
    expect(state.march?.moved).toBe(false)
    state = runMovements(state)
    expect(state.march?.moved).toBe(true)
    expect(state.movements).toMatchObject([{ from: AMBARIA, route: [AMBARIA, VERSTA], monthsLeft: 1 }])
    expect(state.characters['046']).toEqual({ cityId: null, factionId: 'leonis' })
    expect(charactersIn(state, AMBARIA)).toEqual(['013'])
    expect(governorOf(state, AMBARIA)).toBeUndefined()
    expect(state.cities[AMBARIA].troops).toBe(before.cities[AMBARIA].troops - 300)
    expect(state.cities[AMBARIA].storedSupplies).toBe(before.cities[AMBARIA].storedSupplies - 100)
    expect(state.moveOrders).toEqual([])
    const arriving = endStrategyPhase(nextTurn(state))
    state = runMovements(arriving)
    expect(charactersIn(state, VERSTA)).toEqual(['046', '058', '079', '087'])
    expect(state.cities[VERSTA].troops).toBe(arriving.cities[VERSTA].troops + 300)
    expect(state.cities[VERSTA].storedSupplies).toBe(arriving.cities[VERSTA].storedSupplies + 100)
    expect(state.movements).toEqual([])
  })

  it('reaches the next city in the last month of its road, the knights in no city on the way', () => {
    let state = addMoveOrder(start(), move({ to: P011, troops: 200 }))
    state = nextTurn(state)
    expect(state.turn).toBe(2)
    expect(state.characters['013']).toEqual({ cityId: null, factionId: 'leonis' })
    expect(state.movements).toMatchObject([{ from: AMBARIA, route: [AMBARIA, VERSTA, P010, P011], monthsLeft: 5, troops: 200 }])
    state = nextTurn(state)
    expect(state.movements).toMatchObject([{ from: AMBARIA, route: [VERSTA, P010, P011], monthsLeft: 4 }])
    state = nextTurn(nextTurn(state))
    expect(state.movements).toMatchObject([{ route: [P010, P011], monthsLeft: 2 }])
    state = nextTurn(state)
    expect(state.movements).toMatchObject([{ route: [P010, P011], monthsLeft: 1 }])
    state = nextTurn(state)
    expect(state.movements).toEqual([])
    expect(state.characters['013']).toEqual({ cityId: P011, factionId: 'leonis' })
  })

  it('shows each month\'s way before making it, two cities a month riding alone', () => {
    let state = addMoveOrder(start(), move({ to: P011, solo: true }))
    state = endStrategyPhase(state)
    expect(movementLegs(state)).toMatchObject([{ solo: true, route: [AMBARIA, VERSTA, P010], to: P011, arrives: false, knights: ['013'] }])
    state = nextTurn(state)
    state = endStrategyPhase(state)
    expect(movementLegs(state)).toMatchObject([{ route: [P010, P011], arrives: true }])
    state = runMovements(state)
    expect(state.characters['013'].cityId).toBe(P011)
  })

  it('moves before the battles: knights arriving defend their new city', () => {
    // ヴェルスタ's 058 rides alone to アンバリア, which カルタ書院 invades from フルーエン the same month
    let state = addMoveOrder(start(), move({ from: VERSTA, to: AMBARIA, knights: ['058'], solo: true }))
    while (state.activeFaction !== 'carta') state = endFactionTurn(state)
    state = addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015'] })
    state = startNextBattle(endStrategyPhase(state))
    expect(state.march?.current?.defender.knights).toContain('058')
  })

  it('heads for the nearest city of the faction when the one it set out for is lost', () => {
    let state = nextTurn(nextTurn(addMoveOrder(start(), move({ to: P011 }))))
    expect(state.movements[0].route[0]).toBe(VERSTA)
    state = { ...state, cityOwners: { ...state.cityOwners, [P011]: 'aqua' } }
    state = runMovements(endStrategyPhase(state))
    // At ヴェルスタ, its own city
    expect(state.characters['013']).toEqual({ cityId: VERSTA, factionId: 'leonis' })
    expect(state.movements).toEqual([])
  })
})
