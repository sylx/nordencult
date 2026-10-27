import { afterEach, describe, expect, it } from 'vitest'
import { CHARACTER_MAP } from '../data/character'
import {
  defaultUnitType, defenseKnights, formDefense,
  addMoveOrder, addOrder, addTransportOrder, assign, assignmentProblem, availableKnights, cancelMoveOrder, cancelTransportOrder, charactersIn, endFactionTurn,
  awayReason, GameRuleError, governorOf, moveFromProblem, moveMonths, moveOrderProblem, moveRoute, moveTargets, movementLegs, orderProblem, resolveBattle, runMovements, setOfficers, soldiersLeft,
  startNextBattle, suppliesLeft, transportFromProblem, transportKnightProblem, transportKnights, transportOrderProblem, unassign, type GameState, type MoveOrder, type TransportOrder,
} from '.'
import { playing } from './testing'

// レオニス帝国: アンバリア (P004) — ヴェルスタ (P005) — P010 — P011 along its own roads
const AMBARIA = 'P004'
const VERSTA = 'P005'
const P010 = 'P010'
const P011 = 'P011'
const FLUEN = 'P012' // カルタ書院, next to アンバリア

const move = (draft: Partial<Omit<MoveOrder, 'id'>> = {}): Omit<MoveOrder, 'id'> => ({
  factionId: 'leonis', from: AMBARIA, to: VERSTA, knights: ['013'], troops: 0, supplies: 0, solo: false, ...draft,
})

const transport = (draft: Partial<Omit<TransportOrder, 'id'>> = {}): Omit<TransportOrder, 'id'> => ({
  factionId: 'leonis', from: AMBARIA, to: VERSTA, knight: '013', troops: 300, supplies: 100, ...draft,
})

const start = () => playing('leonis')

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
  it('goes along the faction\'s own roads, two cities a month with soldiers and supplies', () => {
    const state = start()
    expect(moveRoute(state, 'leonis', AMBARIA, P011)).toEqual([AMBARIA, VERSTA, P010, P011])
    expect(moveTargets(state, AMBARIA)).toContain(P011)
    expect(moveTargets(state, AMBARIA)).not.toContain(AMBARIA)
    expect(moveTargets(state, AMBARIA)).not.toContain(FLUEN)
    expect([1, 2, 3, 5].map((hops) => moveMonths(hops, false))).toEqual([1, 1, 2, 3])
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
  it('moves the knights, soldiers and supplies to a neighbouring city in a month', () => {
    const before = start()
    // コンラート (046) is the lord of アンバリア: 013, the one left, follows them
    let state = addMoveOrder(before, move({ knights: ['046', '087'], troops: 300, supplies: 100 }))
    state = endStrategyPhase(state)
    expect(state.march?.moved).toBe(false)
    state = runMovements(state)
    expect(state.march?.moved).toBe(true)
    expect(charactersIn(state, VERSTA)).toEqual(['046', '058', '079', '087'])
    expect(charactersIn(state, AMBARIA)).toEqual(['013'])
    expect(governorOf(state, AMBARIA)).toBe('013')
    expect(state.cities[AMBARIA].troops).toBe(before.cities[AMBARIA].troops - 300)
    expect(state.cities[AMBARIA].storedSupplies).toBe(before.cities[AMBARIA].storedSupplies - 100)
    expect(state.cities[VERSTA].troops).toBe(before.cities[VERSTA].troops + 300)
    expect(state.cities[VERSTA].storedSupplies).toBe(before.cities[VERSTA].storedSupplies + 100)
    expect(state.moveOrders).toEqual([])
    expect(state.movements).toEqual([])
  })

  it('takes a month two cities, the knights serving where they set out from on the way, away from it', () => {
    let state = addMoveOrder(start(), move({ to: P011, troops: 200 }))
    state = nextTurn(state)
    expect(state.turn).toBe(2)
    expect(state.characters['013']).toEqual({ cityId: AMBARIA, factionId: 'leonis' })
    expect(charactersIn(state, AMBARIA)).toContain('013')
    expect(availableKnights(state, AMBARIA)).not.toContain('013')
    expect(awayReason(state, '013')).toBe('移動中')
    expect(moveOrderProblem(state, move())).toBe('013 は移動中です')
    expect(transportOrderProblem(state, transport())).toBe('013 は移動中です')
    expect(orderProblem(state, { factionId: 'leonis', from: AMBARIA, to: FLUEN, commander: '013', knights: ['013'] })).toBe('013 は移動中です')
    expect(state.movements).toMatchObject([{ from: AMBARIA, route: [P010, P011], monthsLeft: 1, troops: 200 }])
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
    // ヴェルスタ's 058 moves to アンバリア, which カルタ書院 invades from フルーエン the same month
    let state = addMoveOrder(start(), move({ from: VERSTA, to: AMBARIA, knights: ['058'] }))
    while (state.activeFaction !== 'carta') state = endFactionTurn(state)
    state = addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015'] })
    state = startNextBattle(endStrategyPhase(state))
    // レオニス帝国 (the player's) forms the defense from the knights there
    expect(defenseKnights(state, state.march!.current!)).toContain('058')
  })

  it('heads for the nearest city of the faction when the one it set out for is lost', () => {
    let state = nextTurn(addMoveOrder(start(), move({ to: P011 })))
    expect(state.movements[0].route[0]).toBe(P010)
    state = { ...state, cityOwners: { ...state.cityOwners, [P011]: 'aqua' } }
    state = runMovements(endStrategyPhase(state))
    // At P010, its own city
    expect(state.characters['013']).toEqual({ cityId: P010, factionId: 'leonis' })
    expect(state.movements).toEqual([])
  })
})

describe('transport orders', () => {
  it('reserves the knight, soldiers and supplies until cancelled', () => {
    const state = addTransportOrder(start(), transport())
    expect(availableKnights(state, AMBARIA)).toEqual(['046', '087'])
    expect(soldiersLeft(state, AMBARIA)).toBe(start().cities[AMBARIA].troops - 300)
    expect(suppliesLeft(state, AMBARIA)).toBe(start().cities[AMBARIA].storedSupplies - 100)
    expect(moveOrderProblem(state, move())).toBe('013 は輸送予約中です')
    expect(orderProblem(state, { factionId: 'leonis', from: AMBARIA, to: FLUEN, commander: '013', knights: ['013'] })).toBe('013 は輸送予約中です')
    expect(assignmentProblem(state, AMBARIA, '013', 'commerce')).toBe('輸送予約中です')
    const cancelled = cancelTransportOrder(state, state.transportOrders[0].id)
    expect(cancelled.transportOrders).toEqual([])
    expect(availableKnights(cancelled, AMBARIA)).toEqual(['013', '046', '087'])
  })

  it('rejects transports breaking the rules', () => {
    const state = start()
    expect(transportOrderProblem(state, transport())).toBeNull()
    expect(transportOrderProblem(state, transport({ to: P011 }))).toBeNull()
    expect(transportOrderProblem(state, transport({ to: FLUEN }))).toBe('輸送先が自勢力の都市ではありません')
    expect(transportOrderProblem(state, transport({ to: AMBARIA }))).toBe('出発拠点と同じ都市です')
    expect(transportOrderProblem(state, transport({ knight: '' }))).toBe('担当の騎士を選んでください')
    expect(transportOrderProblem(state, transport({ knight: '058' }))).toBe('058 は出発拠点の騎士ではありません')
    expect(transportOrderProblem(state, transport({ troops: 0, supplies: 0 }))).toBe('輸送するものを選んでください')
    expect(transportOrderProblem(state, transport({ troops: state.cities[AMBARIA].troops + 10 }))).toBe('兵が足りません')
    expect(transportOrderProblem(state, transport({ supplies: state.cities[AMBARIA].storedSupplies + 10 }))).toBe('物資が足りません')
    expect(() => addTransportOrder(state, transport({ to: FLUEN }))).toThrow(GameRuleError)
    const moving = addMoveOrder(state, move())
    expect(transportOrderProblem(moving, transport())).toBe('013 は移動予約中です')
  })

  it('is not taken by an officer, who stays at their work (a lord may take one)', () => {
    const state = assign(start(), AMBARIA, '013', 'commerce')
    expect(transportKnightProblem(state, '013')).toBe('商業担当官')
    expect(transportOrderProblem(state, transport())).toBe('013 は商業担当官です')
    expect(() => addTransportOrder(state, transport())).toThrow(GameRuleError)
    expect(transportKnights(state, AMBARIA)).toEqual(['046', '087'])
    expect(transportOrderProblem(state, transport({ knight: '046' }))).toBeNull()
    // Off the role, they may
    expect(transportOrderProblem(unassign(state, AMBARIA, '013'), transport())).toBeNull()
    // Moves and invasions are open to officers (they leave their roles when they go)
    expect(moveOrderProblem(state, move())).toBeNull()
  })

  it('is open from a city with knights, soldiers or supplies and another city of the faction', () => {
    expect(transportFromProblem(start(), AMBARIA)).toBeNull()
    expect(transportFromProblem(start(), FLUEN)).toBe('自勢力の都市ではありません')
    const everyone = addMoveOrder(start(), move({ knights: ['013', '046', '087'] }))
    expect(transportFromProblem(everyone, AMBARIA)).toBe('輸送を担当できる騎士がいません')
    const officers = setOfficers(addMoveOrder(start(), move({ knights: ['046'] })), AMBARIA, 'commerce', ['013', '087'])
    expect(transportFromProblem(officers, AMBARIA)).toBe('輸送を担当できる騎士がいません')
  })
})

describe('transports in the progress phase', () => {
  it('unloads the soldiers and supplies, then the knight rides back alone', () => {
    const before = start()
    let state = endStrategyPhase(addTransportOrder(before, transport()))
    expect(movementLegs(state)).toMatchObject([{ kind: 'transport', solo: false, route: [AMBARIA, VERSTA], arrives: true }])
    state = runMovements(state)
    expect(state.cities[AMBARIA].troops).toBe(before.cities[AMBARIA].troops - 300)
    expect(state.cities[AMBARIA].storedSupplies).toBe(before.cities[AMBARIA].storedSupplies - 100)
    expect(state.cities[VERSTA].troops).toBe(before.cities[VERSTA].troops + 300)
    expect(state.cities[VERSTA].storedSupplies).toBe(before.cities[VERSTA].storedSupplies + 100)
    expect(state.transportOrders).toEqual([])
    // Not serving in ヴェルスタ: still アンバリア's, on the way back
    expect(state.characters['013']).toEqual({ cityId: AMBARIA, factionId: 'leonis' })
    expect(charactersIn(state, VERSTA)).not.toContain('013')
    expect(awayReason(state, '013')).toBe('輸送中')
    expect(state.movements).toMatchObject([{ kind: 'return', from: VERSTA, to: AMBARIA, solo: true, troops: 0, supplies: 0, monthsLeft: 1 }])
    while (state.phase === 'march') state = startNextBattle(state)
    state = endStrategyPhase(state)
    expect(movementLegs(state)).toMatchObject([{ kind: 'return', solo: true, route: [VERSTA, AMBARIA], arrives: true }])
    state = runMovements(state)
    expect(state.characters['013']).toEqual({ cityId: AMBARIA, factionId: 'leonis' })
    expect(state.movements).toEqual([])
  })

  it('takes a month two cities there, and the way back as riding alone', () => {
    let state = nextTurn(addTransportOrder(start(), transport({ to: P011 })))
    expect(state.movements).toMatchObject([{ kind: 'transport', route: [P010, P011], monthsLeft: 1, troops: 300 }])
    state = nextTurn(state)
    expect(state.movements).toMatchObject([{ kind: 'return', route: [P011, P010, VERSTA, AMBARIA], monthsLeft: moveMonths(3, true) }])
    state = nextTurn(nextTurn(state))
    expect(state.characters['013']).toEqual({ cityId: AMBARIA, factionId: 'leonis' })
  })

  it('unloads in the nearest city of the faction when the one it set out for is lost', () => {
    let state = nextTurn(addTransportOrder(start(), transport({ to: P011 })))
    const p010 = state.cities[P010]
    state = { ...state, cityOwners: { ...state.cityOwners, [P011]: 'aqua' } }
    state = runMovements(endStrategyPhase(state))
    expect(state.cities[P010].troops).toBe(p010.troops + 300)
    expect(state.movements).toMatchObject([{ kind: 'return', from: P010, to: AMBARIA }])
  })
})

describe('knights away', () => {
  /** 013 rides back from P011 to アンバリア (a transport there) when カルタ書院 invades アンバリア from フルーエン */
  function invadedWhileAway() {
    let state = nextTurn(addTransportOrder(start(), transport({ to: P011 })))
    while (state.activeFaction !== 'carta') state = endFactionTurn(state)
    state = addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015'] })
    return startNextBattle(endStrategyPhase(state))
  }

  it('do not defend the city they serve in', () => {
    const state = invadedWhileAway()
    expect(state.movements).toMatchObject([{ kind: 'return', knights: ['013'] }])
    expect(state.characters['013'].cityId).toBe(AMBARIA)
    expect(defenseKnights(state, state.march!.current!)).not.toContain('013')
    expect(defenseKnights(state, state.march!.current!)).toContain('046')
  })

  it('no longer serve in their city when it is lost, and go on to the nearest city of their faction', () => {
    let state = invadedWhileAway()
    const { id } = state.march!.current!
    state = formDefense(state, id, { commander: '046', units: [{ knightId: '046', unitType: defaultUnitType('046'), soldiers: 100 }] })
    state = resolveBattle(state, id, 'attacker')
    expect(state.characters['013']).toEqual({ cityId: null, factionId: 'leonis' })
    expect(charactersIn(state, AMBARIA)).not.toContain('013')
    state = nextTurn(nextTurn(state))
    expect(state.movements).toEqual([])
    expect(state.characters['013'].cityId).not.toBeNull()
    expect(state.cityOwners[state.characters['013'].cityId!]).toBe('leonis')
  })
})

describe('a lord moving away', () => {
  // アンバリア: 046 its lord, 013 and 087
  const politics = (id: string) => CHARACTER_MAP[id].politics
  const [higher, lower] = ['013', '087'].sort((a, b) => politics(b) - politics(a))
  const invading = (state: GameState, id: string) =>
    addOrder(state, { factionId: 'leonis', from: AMBARIA, to: FLUEN, commander: id, knights: [id] })
  /** The lord 046 moves to ヴェルスタ and the moves set out */
  const lordMoves = (state: GameState, random = () => 0) =>
    runMovements(endStrategyPhase(addMoveOrder(state, move({ knights: ['046'] }))), random)

  const saved = { ...CHARACTER_MAP['013'] }
  afterEach(() => { CHARACTER_MAP['013'].politics = saved.politics })

  it('stays the lord until the move sets out', () => {
    expect(politics(higher)).toBeGreaterThan(politics(lower))
    const state = addMoveOrder(start(), move({ knights: ['046'] }))
    expect(governorOf(state, AMBARIA)).toBe('046')
  })

  it('is followed by the knight of the highest 政治 left', () => {
    expect(governorOf(lordMoves(start()), AMBARIA)).toBe(higher)
  })

  it('is not followed by a knight on an invasion, nor one moving away', () => {
    expect(governorOf(lordMoves(invading(start(), higher)), AMBARIA)).toBe(lower)
    expect(governorOf(lordMoves(addMoveOrder(start(), move({ knights: [higher] }))), AMBARIA)).toBe(lower)
    const both = addOrder(start(), { factionId: 'leonis', from: AMBARIA, to: FLUEN, commander: higher, knights: [higher, lower] })
    expect(governorOf(lordMoves(both), AMBARIA)).toBeUndefined()
  })

  it('may be followed by a knight on a transport', () => {
    const state = lordMoves(addTransportOrder(start(), transport({ knight: higher, to: P011 })))
    expect(awayReason(state, higher)).toBe('輸送中')
    expect(governorOf(state, AMBARIA)).toBe(higher)
  })

  it('is followed by one of the equals at random', () => {
    CHARACTER_MAP['013'].politics = politics('087')
    expect(governorOf(lordMoves(start(), () => 0), AMBARIA)).toBe('013')
    expect(governorOf(lordMoves(start(), () => 0.99), AMBARIA)).toBe('087')
  })

  it('stays the lord on a transport', () => {
    const state = runMovements(endStrategyPhase(addTransportOrder(start(), transport({ knight: '046' }))))
    expect(governorOf(state, AMBARIA)).toBe('046')
  })
})
