import { describe, expect, it } from 'vitest'
import {
  addOrder, availableKnights, BALANCE, cancelOrder, charactersIn, commandRank, createInitialState, dateOf, defenderArmy,
  endFactionTurn, GameRuleError, governorOf,
  INITIAL_MORALE, invadeFromProblem, invasionTargets, MAX_SOLDIERS, neighbours, orderProblem, readPlayerFaction,
  resolveBattle, retreatCities, seasonOf, soldiersLeft, startNextBattle, turnOrder, unitAbilities, type ArmyUnit,
  type BattleRetreat, type BattleWipeout, type GameState,
} from '.'
import { CHARACTER_MAP } from '../data/character'
import { FACTION_LIST } from '../data/faction'

// The demo of M001: カルタ書院 invades アンバリア (P004, レオニス帝国) from フルーエン (P012)
const FLUEN = 'P012'
const AMBARIA = 'P004'
const VERSTA = 'P005' // レオニス帝国, next to アンバリア
/** The knights of アンバリア: 013 and its lord コンラート (046) */
const AMBARIA_KNIGHTS = ['013', '046', '087']

/** Ends the strategy phase of every faction */
function endStrategyPhase(state: GameState): GameState {
  while (state.phase === 'strategy') state = endFactionTurn(state)
  return state
}

/** マルクス (029) is the lord of フルーエン and the head of カルタ書院: they lead whenever they go */
function invadeAmbaria(knights = ['015', '016']): GameState {
  const commander = knights.includes('029') ? '029' : knights[0]
  return addOrder(createInitialState('carta'), { factionId: 'carta', from: FLUEN, to: AMBARIA, commander, knights })
}

describe('setup', () => {
  it('starts the player on turn 1', () => {
    const state = createInitialState('carta')
    expect(state.turn).toBe(1)
    expect(state.phase).toBe('strategy')
    expect(state.activeFaction).toBe('carta')
    expect(state.cityOwners[AMBARIA]).toBe('leonis')
    expect(charactersIn(state, FLUEN)).toEqual(['015', '016', '027', '029'])
    expect(governorOf(state, FLUEN)).toBe('029')
  })

  it('starts each faction with the gold of its data', () => {
    const { gold } = createInitialState('carta')
    for (const f of FACTION_LIST) expect(gold[f.id]).toBe(f.gold ?? BALANCE.INITIAL_GOLD)
  })

  it('leaves mercenaries without a faction unhired', () => {
    expect(createInitialState().characters['028']).toEqual({ cityId: null, factionId: null })
  })

  it('reads the player faction from the URL', () => {
    expect(readPlayerFaction('?faction=leonis')).toBe('leonis')
    expect(readPlayerFaction('')).toBe('carta')
    expect(readPlayerFaction('?faction=nope')).toBe('carta')
  })

  it('plays the player first, then the others in FACTION_LIST order', () => {
    expect(turnOrder(createInitialState('leonis'))).toEqual(
      ['leonis', 'valhardt', 'nordis', 'carta', 'aqua', 'rosalia', 'taurus', 'sede'])
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
    const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015'] }
    expect(orderProblem(state, draft)).toBeNull()
    expect(orderProblem(state, { ...draft, knights: [] })).not.toBeNull()
    expect(orderProblem(state, { ...draft, to: 'P005' })).not.toBeNull() // not joined by a road
    expect(orderProblem(state, { ...draft, to: 'P026' })).not.toBeNull() // シルヴァ is carta's own
    expect(orderProblem(state, { ...draft, knights: ['013'] })).not.toBeNull() // アンバリア's knight
    expect(orderProblem(state, { ...draft, factionId: 'leonis', from: AMBARIA, to: FLUEN, knights: ['013'] }))
      .not.toBeNull() // not leonis's turn
    const ordered = addOrder(state, draft)
    expect(orderProblem(ordered, { ...draft, commander: '016', knights: ['016'] })).not.toBeNull() // same target
    expect(() => addOrder(ordered, draft)).toThrow(GameRuleError)
  })

  it('needs a commander among the knights; the lord or the head of the faction leads when they go', () => {
    const state = createInitialState('carta')
    const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '016', knights: ['015', '016'] }
    expect(orderProblem(state, draft)).toBeNull()
    expect(orderProblem(state, { ...draft, commander: '027' })).toBe('軍団長が出撃する騎士にいません')
    expect(commandRank(state, '029')).toBe(2) // head of カルタ書院 (and lord of フルーエン)
    expect(commandRank(state, '016')).toBe(0)
    expect(orderProblem(state, { ...draft, knights: ['015', '016', '029'] })).toBe('029 が出撃するときは軍団長になります')
    expect(orderProblem(state, { ...draft, commander: '029', knights: ['015', '016', '029'] })).toBeNull()
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
    expect(state.march).toEqual({ moved: false, queue: [], current: null })
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
      attacker: { factionId: 'carta', from: FLUEN, commander: '015', knights: ['015', '016'] },
      defender: { factionId: 'leonis', knights: AMBARIA_KNIGHTS },
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
  const units: ArmyUnit[] = [{ knightId: '015', unitType: 'infantry', soldiers: 300 }, { knightId: '016', unitType: 'cavalry', soldiers: 200 }]
  const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', '016'], units }
  const indirect = (unitType: string, soldiers = 50): ArmyUnit => ({ knightId: null, unitType, soldiers })

  /** Soldiers of フルーエン at the start: 生産 220 × 5 */
  const fluenTroops = 220 * BALANCE.INITIAL_TROOPS_PER_PRODUCTION
  /** Soldiers of アンバリア at the start: 生産 220 × 5 */
  const ambariaTroops = 220 * BALANCE.INITIAL_TROOPS_PER_PRODUCTION

  it('takes the soldiers of an order from its city', () => {
    const state = createInitialState('carta')
    expect(state.cities[FLUEN].troops).toBe(fluenTroops)
    expect(soldiersLeft(addOrder(state, draft), FLUEN)).toBe(fluenTroops - 500)
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
    expect(orderProblem(state, { ...draft, units: [{ ...units[0], soldiers: MAX_SOLDIERS + 10 }, units[1]] }))
      .toBe(`1部隊の兵数は${MAX_SOLDIERS}までです`)
    expect(orderProblem({ ...state, orders: [{ ...draft, id: 'x', to: 'P026', commander: '027', knights: ['027'], units: [
      { knightId: '027', unitType: 'infantry', soldiers: fluenTroops - 100 },
    ] }] }, draft)).toBe('出撃できる兵が足りません')
  })

  it('checks the units the commander leads indirectly', () => {
    const state = createInitialState('carta')
    expect(orderProblem(state, { ...draft, units: [units[0], indirect('archer', 180), units[1], indirect('infantry')] })).toBeNull()
    expect(orderProblem(state, { ...draft, units: [...units, indirect('cavalry')] })).toBe('間接指揮部隊は騎兵にできません')
    expect(orderProblem(state, { ...draft, units: [...units, indirect('archer', MAX_SOLDIERS + 10)] })).toBe(`1部隊の兵数は${MAX_SOLDIERS}までです`)
    expect(orderProblem(state, { ...draft, units: [...units, indirect('infantry', 0)] })).toBe('兵数が0の部隊があります')
  })

  it('leads the indirect units with half of the abilities of the commander', () => {
    const { leadership, strength, intelligence } = CHARACTER_MAP['015']
    expect(unitAbilities('015', '016')).toEqual({ leadership, strength, intelligence })
    expect(unitAbilities(null, '015')).toEqual({
      leadership: Math.floor(leadership / 2), strength: Math.floor(strength / 2), intelligence: Math.floor(intelligence / 2),
    })
    // the garrison nobody leads
    expect(unitAbilities(null, null)).toBeUndefined()
  })

  it('allows 6 units at most', () => {
    const state = createInitialState('carta')
    const sixth = [...units, ...Array.from({ length: 4 }, () => indirect('infantry'))]
    expect(orderProblem(state, { ...draft, units: sixth })).toBeNull()
    expect(orderProblem(state, { ...draft, units: [...sixth, indirect('infantry')] })).toBe('部隊は6つまでです')
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

  it('sends each knight with their default unit type when an order has no units', () => {
    const marching = startNextBattle(endStrategyPhase(invadeAmbaria(['015', '016'])))
    expect(marching.march?.current?.attacker.units).toEqual([
      { knightId: '015', unitType: 'infantry', soldiers: MAX_SOLDIERS },
      { knightId: '016', unitType: 'cavalry', soldiers: MAX_SOLDIERS },
    ])
  })

  it('defends with a provisional army: the knights of the city, or a garrison without them', () => {
    const state = createInitialState('carta')
    const army = defenderArmy(state, AMBARIA, 'leonis', ['013'])
    // 生産 × 5 soldiers shared out, MAX_SOLDIERS at most in each unit
    expect(army).toEqual({
      factionId: 'leonis', knights: ['013'], commander: '013', morale: INITIAL_MORALE,
      units: [{ knightId: '013', unitType: 'archer', soldiers: Math.min(MAX_SOLDIERS, Math.floor(ambariaTroops / 10) * 10) }],
    })
    // マルクス (029) is the head of カルタ書院: they lead the defence of フルーエン
    expect(defenderArmy(state, FLUEN, 'carta', ['015', '016', '029']).commander).toBe('029')
    const garrison = defenderArmy(state, AMBARIA, null, [])
    expect(garrison.commander).toBeNull()
    expect(garrison.units).toEqual([
      { knightId: null, unitType: 'infantry', soldiers: Math.floor(ambariaTroops / 2 / 10) * 10 },
      { knightId: null, unitType: 'infantry', soldiers: Math.floor(ambariaTroops / 2 / 10) * 10 },
    ])
  })

  it('gives the units the morale of the city they set out from', () => {
    const state = createInitialState('carta')
    expect(state.cities[FLUEN].troopMorale).toBe(INITIAL_MORALE)
    const trained = { ...state, cities: { ...state.cities, [FLUEN]: { ...state.cities[FLUEN], troopMorale: 85 } } }
    const marching = startNextBattle(endStrategyPhase(addOrder(trained, draft)))
    expect(marching.march?.current?.attacker.morale).toBe(85)
  })

  it('keeps the indirect units in the battle; the knight of the highest rank left takes over a commander who is gone', () => {
    const order = { ...draft, units: [...units, indirect('archer')] }
    const marching = startNextBattle(endStrategyPhase(addOrder(createInitialState('carta'), order)))
    expect(marching.march?.current?.attacker).toMatchObject({ commander: '015', units: [...units, indirect('archer')] })

    let state = endStrategyPhase(addOrder(createInitialState('carta'), order))
    state = { ...state, characters: { ...state.characters, '015': { ...state.characters['015'], cityId: 'P026' } } }
    expect(startNextBattle(state).march?.current?.attacker).toMatchObject({
      commander: '016', knights: ['016'], units: [units[1], indirect('archer')],
    })
  })
})

describe('battle results', () => {
  /** Fights the next battle of `state` (or `state` itself when already `marching`) to `winner` */
  const fight = (winner: 'attacker' | 'defender', state = invadeAmbaria(), marching = false) => {
    const battle = marching ? state : startNextBattle(endStrategyPhase(state))
    return resolveBattle(battle, battle.march!.current!.id, winner)
  }
  /** `state` with no lord in `cityId` */
  const withoutGovernor = (state: GameState, cityId: string): GameState => ({
    ...state,
    cities: { ...state.cities, [cityId]: { ...state.cities[cityId], assignments: { officers: state.cities[cityId].assignments.officers } } },
  })

  it('the attacker takes the city; the defenders retreat to a neighbour of their own', () => {
    const state = fight('attacker')
    expect(state.cityOwners[AMBARIA]).toBe('carta')
    expect(state.characters['015']).toMatchObject({ cityId: AMBARIA, factionId: 'carta' })
    expect(state.characters['013']).toMatchObject({ cityId: VERSTA, factionId: 'leonis' })
    // The lord who left the city is no longer its lord
    expect(state.characters['046']).toEqual({ cityId: VERSTA, factionId: 'leonis' })
    // The captured city loses its assignments and the attacking commander becomes its lord
    expect(state.cities[AMBARIA].assignments).toEqual({ governor: '015', officers: {} })
    expect(state.lastBattle).toMatchObject({ winner: 'attacker', cityCaptured: true })
    // ヴェルスタ has a lord of its own, so only アンバリア gets one
    expect(state.lastBattle?.governors).toEqual([{ cityId: AMBARIA, characterId: '015' }])
    expect(state.lastBattle?.moves).toEqual([
      { characterId: '015', kind: 'enter', from: FLUEN, to: AMBARIA },
      { characterId: '016', kind: 'enter', from: FLUEN, to: AMBARIA },
      { characterId: '013', kind: 'retreat', from: AMBARIA, to: VERSTA },
      { characterId: '046', kind: 'retreat', from: AMBARIA, to: VERSTA },
      { characterId: '087', kind: 'retreat', from: AMBARIA, to: VERSTA },
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
    for (const id of AMBARIA_KNIGHTS) expect(state.characters[id]).toEqual({ cityId: null, factionId: null })
    expect(state.lastBattle?.moves.slice(-AMBARIA_KNIGHTS.length)).toMatchObject(
      AMBARIA_KNIGHTS.map((characterId) => ({ characterId, kind: 'wander', to: null })))
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

  it('the commander becomes the lord of a city retreated to that has none', () => {
    const marching = startNextBattle(endStrategyPhase(withoutGovernor(invadeAmbaria(), VERSTA)))
    const { commander } = marching.march!.current!.defender
    const state = fight('attacker', marching, true)
    expect(commander).not.toBeNull()
    expect(state.characters[commander!]).toMatchObject({ cityId: VERSTA })
    expect(governorOf(state, VERSTA)).toBe(commander)
    expect(state.lastBattle?.governors).toContainEqual({ cityId: VERSTA, characterId: commander })
  })

  it('without the commander there, one of the knights in the city retreated to becomes its lord at random', () => {
    const marching = startNextBattle(endStrategyPhase(withoutGovernor(invadeAmbaria(), VERSTA)))
    const { commander } = marching.march!.current!.defender
    const knight = AMBARIA_KNIGHTS.find((id) => id !== commander)!
    const retreats = [{ side: 'defender' as const, knightId: knight, to: VERSTA, captured: false }]
    const knightsThere = (state: GameState) => Object.keys(state.characters)
      .filter((id) => state.characters[id].cityId === VERSTA && state.characters[id].factionId === 'leonis')
    const first = resolveBattle(marching, marching.march!.current!.id, 'defender', retreats, null, [], () => 0)
    expect(governorOf(first, VERSTA)).toBe(knightsThere(first)[0])
    const last = resolveBattle(marching, marching.march!.current!.id, 'defender', retreats, null, [], () => 0.999)
    expect(governorOf(last, VERSTA)).toBe(knightsThere(last).at(-1))
    expect(knightsThere(first)).toContain(knight)
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
    expect(state.characters['029']).toMatchObject({ cityId: AMBARIA })
    expect(governorOf(state, FLUEN)).toBeUndefined()
    // …and, as the commander, becomes the lord of the city taken
    expect(governorOf(state, AMBARIA)).toBe('029')
    expect(commandRank(state, '029')).toBe(2) // still the head of カルタ書院
    expect(governorOf(fight('defender', invadeAmbaria(['029'])), FLUEN)).toBe('029')
  })
})
