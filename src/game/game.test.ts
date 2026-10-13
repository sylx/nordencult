import { describe, expect, it } from 'vitest'
import {
  addOrder, availableKnights, cancelOrder, charactersIn, createInitialState, dateOf, endFactionTurn, GameRuleError,
  invadeFromProblem, invasionTargets, maxSoldiers, neighbours, orderProblem, readPlayerFaction, resolveBattle,
  retreatCities, soldierPool, seasonOf, soldiersLeft, startNextBattle, turnOrder, type BattleRetreat, type BattleWipeout,
  type GameState,
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

  it('leaves mercenaries without a faction unhired', () => {
    expect(createInitialState().characters['028']).toEqual({ cityId: null, factionId: null, isLord: false })
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
  it('counts a turn as a month from 灰歴312年4月', () => {
    expect(dateOf(1)).toEqual({ year: 312, month: 4 })
    expect(dateOf(9)).toEqual({ year: 312, month: 12 })
    expect(dateOf(10)).toEqual({ year: 313, month: 1 })
  })

  it('names the season of a month', () => {
    const seasons = Array.from({ length: 12 }, (_, i) => seasonOf(i + 1))
    expect(seasons).toEqual(['冬', '冬', '春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬'])
  })

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

describe('units', () => {
  const units = [{ knightId: '015', unitType: 'infantry', soldiers: 300 }, { knightId: '016', unitType: 'cavalry', soldiers: 200 }]
  const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, knights: ['015', '016'], units }

  it('takes the soldiers of an order from its city', () => {
    const state = createInitialState('carta')
    expect(soldierPool(FLUEN)).toBe(1100) // 生産 220 × 5
    expect(soldiersLeft(addOrder(state, draft), FLUEN)).toBe(600)
  })

  it('checks the units of an order', () => {
    const state = createInitialState('carta')
    expect(orderProblem(state, draft)).toBeNull()
    expect(orderProblem(state, { ...draft, units: units.slice(0, 1) })).not.toBeNull()
    expect(orderProblem(state, { ...draft, units: [units[0], { ...units[1], soldiers: 0 }] })).not.toBeNull()
    expect(orderProblem(state, { ...draft, units: [units[0], { ...units[1], unitType: 'dragon' }] })).not.toBeNull()
    // クラリス is a scholar (歩兵 only); エルヴィン is a knight (歩兵 or 騎兵)
    expect(orderProblem(state, { ...draft, units: [{ ...units[0], unitType: 'cavalry' }, units[1]] })).not.toBeNull()
    expect(orderProblem(state, { ...draft, units: [units[0], { ...units[1], unitType: 'archer' }] })).not.toBeNull()
    expect(orderProblem(state, { ...draft, units: [units[0], { ...units[1], unitType: 'infantry' }] })).toBeNull()
    expect(orderProblem(state, { ...draft, units: [{ ...units[0], soldiers: maxSoldiers('015') + 5 }, units[1]] }))
      .not.toBeNull()
    expect(orderProblem({ ...state, orders: [{ ...draft, id: 'x', to: 'P026', knights: ['027'], units: [
      { knightId: '027', unitType: 'infantry', soldiers: 1000 },
    ] }] }, draft)).toBe('出撃できる兵が足りません')
  })

  it('says why a city cannot start an invasion', () => {
    const state = createInitialState('carta')
    expect(invadeFromProblem(state, FLUEN)).toBeNull()
    expect(invadeFromProblem(state, AMBARIA)).toBe('自勢力の都市ではありません')
    expect(invadeFromProblem(addOrder(state, draft), FLUEN)).toBe('侵攻できる隣接都市がありません')
    expect(invadeFromProblem(endFactionTurn(state), FLUEN)).toBe('自勢力の都市ではありません')
  })

  it('takes the units into the battle', () => {
    const marching = startNextBattle(endStrategyPhase(addOrder(createInitialState('carta'), draft)))
    expect(marching.march?.current?.attacker.units).toEqual(units)
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

  it('lists the cities each side can retreat to', () => {
    const marching = startNextBattle(endStrategyPhase(invadeAmbaria()))
    const battle = marching.march!.current!
    expect(retreatCities(marching, battle, 'attacker')).toEqual([FLUEN])
    expect(retreatCities(marching, battle, 'defender')).toContain(VERSTA)
    expect(retreatCities(marching, battle, 'defender').every((id) => marching.cityOwners[id] === 'leonis')).toBe(true)
    expect(neighbours(AMBARIA)).toEqual(expect.arrayContaining([...retreatCities(marching, battle, 'defender'), FLUEN]))
  })

  it('knights who retreated go where they chose; captured ones stay and are reported', () => {
    const retreats: BattleRetreat[] = [
      { side: 'attacker', knightId: '016', to: FLUEN, captured: false },
      { side: 'attacker', knightId: '015', to: FLUEN, captured: true },
      { side: 'defender', knightId: null, to: VERSTA, captured: true },
    ]
    const marching = startNextBattle(endStrategyPhase(invadeAmbaria()))
    const state = resolveBattle(marching, marching.march!.current!.id, 'attacker', retreats)
    expect(state.cityOwners[AMBARIA]).toBe('carta')
    const moves = state.lastBattle!.moves
    expect(moves.filter((m) => m.characterId === '015' || m.characterId === '016')).toEqual([
      { characterId: '016', kind: 'return', from: FLUEN, to: FLUEN },
    ])
    expect(moves).toContainEqual({ characterId: '013', kind: 'retreat', from: AMBARIA, to: VERSTA })
    expect(state.characters['015']).toEqual(marching.characters['015'])
    expect(state.lastBattle?.retreats).toEqual(retreats)
  })

  it('reports how the battle was decided', () => {
    const marching = startNextBattle(endStrategyPhase(invadeAmbaria()))
    const id = marching.march!.current!.id
    expect(resolveBattle(marching, id, 'attacker', [], 'stronghold').lastBattle).toMatchObject({ reason: 'stronghold', cityCaptured: true })
    expect(resolveBattle(marching, id, 'defender', [], 'eliminated').lastBattle).toMatchObject({ reason: 'eliminated', cityCaptured: false })
    expect(resolveBattle(marching, id, 'defender').lastBattle?.reason).toBeNull()
  })

  it('knights captured when wiped out stay and are reported; those who got away go with their side', () => {
    const wipeouts: BattleWipeout[] = [
      { side: 'attacker', knightId: '015', captured: true },
      { side: 'attacker', knightId: '016', captured: false },
    ]
    const marching = startNextBattle(endStrategyPhase(invadeAmbaria()))
    const state = resolveBattle(marching, marching.march!.current!.id, 'defender', [], null, wipeouts)
    expect(state.characters['015']).toEqual(marching.characters['015'])
    expect(state.lastBattle!.moves.filter((m) => m.characterId === '015' || m.characterId === '016')).toEqual([
      { characterId: '016', kind: 'return', from: FLUEN, to: FLUEN },
    ])
    expect(state.lastBattle?.wipeouts).toEqual(wipeouts)
    expect(() => resolveBattle(marching, marching.march!.current!.id, 'defender', [], null, [
      { side: 'defender', knightId: '015', captured: true },
    ])).toThrow(GameRuleError)
  })

  it('a defender who retreated leaves even when the defence holds', () => {
    const marching = startNextBattle(endStrategyPhase(invadeAmbaria()))
    const state = resolveBattle(marching, marching.march!.current!.id, 'defender', [
      { side: 'defender', knightId: '013', to: VERSTA, captured: false },
    ])
    expect(state.cityOwners[AMBARIA]).toBe('leonis')
    expect(state.characters['013']).toMatchObject({ cityId: VERSTA, factionId: 'leonis' })
  })

  it('refuses retreats to cities not of their own or by knights not in the battle', () => {
    const marching = startNextBattle(endStrategyPhase(invadeAmbaria()))
    const id = marching.march!.current!.id
    expect(() => resolveBattle(marching, id, 'attacker', [{ side: 'attacker', knightId: '015', to: VERSTA, captured: false }]))
      .toThrow(GameRuleError)
    expect(() => resolveBattle(marching, id, 'attacker', [{ side: 'defender', knightId: '015', to: VERSTA, captured: false }]))
      .toThrow(GameRuleError)
  })

  it('a lord who leaves their city is no longer its lord', () => {
    const state = fight('attacker', invadeAmbaria(['029']))
    expect(state.characters['029']).toMatchObject({ cityId: AMBARIA, isLord: false })
    expect(fight('defender', invadeAmbaria(['029'])).characters['029'].isLord).toBe(true)
  })
})
