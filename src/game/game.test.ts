import { describe, expect, it } from 'vitest'
import {
  addOrder, availableKnights, BALANCE, cancelOrder, charactersIn, commandRank, createInitialState, dateOf, defenderArmy,
  endFactionTurn, GameRuleError, governorOf,
  INITIAL_MORALE, invadeFromProblem, invasionTargets, MAX_SOLDIERS, neighbours, orderProblem, readPlayerFactions,
  resolveBattle, retreatCities, seasonOf, soldiersLeft, startNextBattle, turnOrder, unitAbilities, type ArmyUnit,
  decideInvasion, defaultUnitType, defenseKnights, defenseProblem, factionPower, finishEntry, formDefense, isPlayerTurn,
  addMoveOrder, dismissEvent, type InvasionOrder, type BattleSurvivor,
  type BattleRetreat, type BattleWipeout, type GameState,
} from '.'
import { playing } from './testing'
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
  return addOrder(playing('carta'), { factionId: 'carta', from: FLUEN, to: AMBARIA, commander, knights })
}

describe('setup', () => {
  it('starts the player on turn 1', () => {
    const state = playing('carta')
    expect(state.turn).toBe(1)
    expect(state.phase).toBe('strategy')
    expect(state.activeFaction).toBe('carta')
    expect(state.cityOwners[AMBARIA]).toBe('leonis')
    expect(charactersIn(state, FLUEN)).toEqual(['015', '016', '027', '029'])
    expect(governorOf(state, FLUEN)).toBe('029')
  })

  it('starts each faction with the gold of its data', () => {
    const { gold } = playing('carta')
    for (const f of FACTION_LIST) expect(gold[f.id]).toBe(f.gold ?? BALANCE.INITIAL_GOLD)
  })

  it('leaves mercenaries without a faction unhired', () => {
    expect(createInitialState().characters['028']).toEqual({ cityId: null, factionId: null })
  })

  it('reads the player factions from the URL', () => {
    expect(readPlayerFactions('?faction=leonis')).toEqual(['leonis'])
    expect(readPlayerFactions('?faction=leonis&faction=carta&faction=leonis')).toEqual(['leonis', 'carta'])
    expect(readPlayerFactions('')).toEqual(['carta'])
    expect(readPlayerFactions('?faction=nope')).toEqual(['carta'])
  })

  it('plays the factions by 国力 (the population of their cities), the highest first', () => {
    const state = createInitialState(['carta'])
    const order = turnOrder(state)
    expect(order).toEqual(['leonis', 'aqua', 'nordis', 'rosalia', 'taurus', 'valhardt', 'carta', 'sede'])
    expect(order.map((id) => factionPower(state, id))).toEqual(order.map((id) => factionPower(state, id)).sort((a, b) => b - a))
    expect(state.activeFaction).toBe('leonis')
    const grown = { ...state, cities: { ...state.cities, [FLUEN]: { ...state.cities[FLUEN], population: 200000 } } }
    expect(turnOrder(grown)[0]).toBe('carta')
  })

  it('lets the player play more than one faction', () => {
    let state = createInitialState(['carta', 'leonis'])
    expect(isPlayerTurn(state)).toBe(true) // レオニス帝国 plays first
    state = endFactionTurn(state)
    expect(isPlayerTurn(state)).toBe(false)
    while (state.activeFaction !== 'carta') state = endFactionTurn(state)
    expect(isPlayerTurn(state)).toBe(true)
  })
})

describe('orders', () => {
  it('targets neighbouring cities of other factions', () => {
    expect(invasionTargets(playing('carta'), FLUEN)).toEqual([AMBARIA])
  })

  it('adds and cancels an order', () => {
    const state = invadeAmbaria()
    expect(state.orders).toHaveLength(1)
    expect(availableKnights(state, FLUEN)).toEqual(['027', '029'])
    expect(cancelOrder(state, state.orders[0].id).orders).toHaveLength(0)
  })

  it('rejects orders breaking the rules', () => {
    const state = playing('carta')
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
    const state = playing('carta')
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
    let state = endFactionTurn(playing('carta'))
    expect(state.activeFaction).toBe('sede')
    state = endStrategyPhase(state)
    expect(state.phase).toBe('march')
    expect(state.activeFaction).toBeNull()
    expect(state.march).toEqual({
      moved: false, queue: [], owners: state.cityOwners, current: null, entry: null, decision: null, confirmed: [],
    })
  })

  it('starts the next turn when no order is left', () => {
    const state = startNextBattle(endStrategyPhase(playing('carta')))
    expect(state).toMatchObject({ turn: 2, phase: 'strategy', activeFaction: 'leonis', orders: [], march: null })
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
    state = { ...state, cityOwners: { ...state.cityOwners, [FLUEN]: 'leonis' } }
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
    const state = playing('carta')
    expect(state.cities[FLUEN].troops).toBe(fluenTroops)
    expect(soldiersLeft(addOrder(state, draft), FLUEN)).toBe(fluenTroops - 500)
  })

  it('checks the units of an order', () => {
    const state = playing('carta')
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
    const state = playing('carta')
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
    const state = playing('carta')
    const sixth = [...units, ...Array.from({ length: 4 }, () => indirect('infantry'))]
    expect(orderProblem(state, { ...draft, units: sixth })).toBeNull()
    expect(orderProblem(state, { ...draft, units: [...sixth, indirect('infantry')] })).toBe('部隊は6つまでです')
  })

  it('says why a city cannot start an invasion', () => {
    const state = playing('carta')
    expect(invadeFromProblem(state, FLUEN)).toBeNull()
    expect(invadeFromProblem(state, AMBARIA)).toBe('自勢力の都市ではありません')
    expect(invadeFromProblem(addOrder(state, draft), FLUEN)).toBe('侵攻できる隣接都市がありません')
    expect(invadeFromProblem(endFactionTurn(state), FLUEN)).toBe('自勢力の都市ではありません')
  })

  it('takes the units into the battle', () => {
    const marching = startNextBattle(endStrategyPhase(addOrder(playing('carta'), draft)))
    expect(marching.march?.current?.attacker.units).toEqual(units)
  })

  it('sends each knight with their default unit type when an order has no units, as many soldiers as the city has', () => {
    const marching = startNextBattle(endStrategyPhase(invadeAmbaria(['015', '016'])))
    expect(marching.march?.current?.attacker.units).toEqual([
      { knightId: '015', unitType: 'infantry', soldiers: MAX_SOLDIERS },
      { knightId: '016', unitType: 'cavalry', soldiers: fluenTroops - MAX_SOLDIERS },
    ])
  })

  it('defends with a provisional army: the knights of the city, or a garrison without them', () => {
    const state = playing('carta')
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
    const state = playing('carta')
    expect(state.cities[FLUEN].troopMorale).toBe(INITIAL_MORALE)
    const trained = { ...state, cities: { ...state.cities, [FLUEN]: { ...state.cities[FLUEN], troopMorale: 85 } } }
    const marching = startNextBattle(endStrategyPhase(addOrder(trained, draft)))
    expect(marching.march?.current?.attacker.morale).toBe(85)
  })

  it('keeps the indirect units in the battle; the knight of the highest rank left takes over a commander who is gone', () => {
    const order = { ...draft, units: [...units, indirect('archer')] }
    const marching = startNextBattle(endStrategyPhase(addOrder(playing('carta'), order)))
    expect(marching.march?.current?.attacker).toMatchObject({ commander: '015', units: [...units, indirect('archer')] })

    let state = endStrategyPhase(addOrder(playing('carta'), order))
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
    expect(startNextBattle(state)).toMatchObject({ turn: 2, phase: 'strategy' })
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

  it('a lord setting out on an invasion is followed by the knight of the highest 政治 left, win or lose', () => {
    const left = charactersIn(playing('carta'), FLUEN).filter((id) => id !== '029')
    const best = Math.max(...left.map((id) => CHARACTER_MAP[id].politics))
    const state = fight('attacker', invadeAmbaria(['029']))
    expect(state.characters['029']).toMatchObject({ cityId: AMBARIA })
    const successor = governorOf(state, FLUEN)
    expect(successor && CHARACTER_MAP[successor].politics).toBe(best)
    // …and, as the commander, becomes the lord of the city taken
    expect(governorOf(state, AMBARIA)).toBe('029')
    expect(commandRank(state, '029')).toBe(2) // still the head of カルタ書院
    // Coming back, they are lord no longer
    const lost = fight('defender', invadeAmbaria(['029']))
    expect(lost.characters['029']).toMatchObject({ cityId: FLUEN })
    expect(governorOf(lost, FLUEN)).not.toBe('029')
    expect(governorOf(lost, FLUEN) && CHARACTER_MAP[governorOf(lost, FLUEN)!].politics).toBe(best)
  })

  it('does not make a knight of the army setting out the lord', () => {
    const left = charactersIn(playing('carta'), FLUEN).filter((id) => id !== '029')
      .sort((a, b) => CHARACTER_MAP[b].politics - CHARACTER_MAP[a].politics)
    const state = startNextBattle(endStrategyPhase(invadeAmbaria(['029', left[0]])))
    expect(state.march?.current).not.toBeNull()
    expect(governorOf(state, FLUEN)).not.toBe(left[0])
    expect(CHARACTER_MAP[governorOf(state, FLUEN)!].politics).toBe(CHARACTER_MAP[left[1]].politics)
  })
})

describe('invasion part', () => {
  const HALVAN = 'P002' // タウルス自由都市連合, next to アンバリア
  const DARM = 'P003' // レオニス帝国, next to ティルナ
  const CORNELIA = 'P011' // レオニス帝国, next to ティルナ
  const TIRNA = 'P008' // ロザリア家

  /** `state` played on to `factionId`'s strategy phase this turn */
  const turnOf = (state: GameState, factionId: string) => {
    while (state.activeFaction !== factionId) state = endFactionTurn(state)
    return state
  }
  /** An order of the active faction with its knights `knights`, the first leading */
  const invade = (state: GameState, from: string, to: string, knights: string[]) =>
    addOrder(state, { factionId: state.activeFaction!, from, to, commander: knights[0], knights })
  const idOf = (state: GameState, from: string, to: string) => state.orders.find((o: InvasionOrder) => o.from === from && o.to === to)!.id

  it('lets a faction invade a city from more than one city, once from each', () => {
    let state = playing('carta')
    state = invade(state, FLUEN, AMBARIA, ['015'])
    expect(orderProblem(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '016', knights: ['016'] }))
      .toBe('この目標にはすでに侵攻を予約しています')
    state = turnOf(createInitialState(['leonis']), 'leonis')
    state = invade(state, DARM, TIRNA, ['036'])
    expect(orderProblem(state, { factionId: 'leonis', from: CORNELIA, to: TIRNA, commander: '075', knights: ['075'] })).toBeNull()
  })

  it('resolves the invasions by the factions\' 国力, each faction\'s in the order made', () => {
    let state = playing('leonis', 'carta')
    state = invade(state, CORNELIA, TIRNA, ['075'])
    state = invade(state, DARM, TIRNA, ['036'])
    state = turnOf(state, 'carta')
    state = invade(state, FLUEN, AMBARIA, ['015'])
    const { queue } = endStrategyPhase(state).march!
    expect(queue).toEqual([idOf(state, CORNELIA, TIRNA), idOf(state, DARM, TIRNA), idOf(state, FLUEN, AMBARIA)])
  })

  it('calls off the invasions still to come from a city attacked: their knights defend it', () => {
    let state = playing('leonis', 'carta')
    state = invade(state, AMBARIA, FLUEN, ['013'])
    state = turnOf(state, 'carta')
    state = invade(state, FLUEN, AMBARIA, ['015', '016'])
    const marching = startNextBattle(endStrategyPhase(state))
    const battle = marching.march!.current!
    expect(battle).toMatchObject({ cityId: FLUEN, attacker: { factionId: 'leonis' } })
    expect(defenseKnights(marching, battle)).toEqual(['015', '016', '027', '029'])
    expect(marching.march!.queue).toEqual([])
    // Held: the army called off stays in フルーエン, and the turn ends
    const defended = formDefense(marching, battle.id, { commander: '029', units: [{ knightId: '029', unitType: defaultUnitType('029'), soldiers: 100 }] })
    const held = resolveBattle(defended, battle.id, 'defender')
    expect(held.characters['015']).toMatchObject({ cityId: FLUEN })
    expect(startNextBattle(held)).toMatchObject({ turn: 2, phase: 'strategy' })
  })

  /** タウルス自由都市連合 takes アンバリア first; then カルタ書院's invasion of it comes */
  const takenByTaurus = (players: string[]) => {
    let state = turnOf(createInitialState(players), 'taurus')
    state = invade(state, HALVAN, AMBARIA, ['034'])
    state = turnOf(state, 'carta')
    state = invade(state, FLUEN, AMBARIA, ['015', '016'])
    const marching = startNextBattle(endStrategyPhase(state))
    expect(marching.march!.current!.attacker.factionId).toBe('taurus')
    return resolveBattle(marching, marching.march!.current!.id, 'attacker')
  }

  it('asks a faction the player plays whether to go on invading a city another faction took', () => {
    const taken = takenByTaurus(['carta'])
    const asking = startNextBattle(taken)
    const orderId = asking.march!.decision!
    expect(asking.orders.find((o) => o.id === orderId)).toMatchObject({ factionId: 'carta', to: AMBARIA })
    expect(asking.march!.current).toBeNull()
    expect(startNextBattle(asking)).toBe(asking)

    const goingOn = startNextBattle(decideInvasion(asking, orderId, true))
    expect(goingOn.march!.current).toMatchObject({ cityId: AMBARIA, attacker: { factionId: 'carta' }, defender: { factionId: 'taurus', knights: ['034'] } })

    const calledOff = startNextBattle(decideInvasion(asking, orderId, false))
    expect(calledOff).toMatchObject({ turn: 2, phase: 'strategy' })
    expect(calledOff.characters['015']).toMatchObject({ cityId: FLUEN })
  })

  it('goes on without asking for a faction the player does not play', () => {
    const state = startNextBattle(takenByTaurus(['taurus']))
    expect(state.march!.decision).toBeNull()
    expect(state.march!.current).toMatchObject({ cityId: AMBARIA, attacker: { factionId: 'carta' }, defender: { factionId: 'taurus' } })
  })

  it('marches the next army of a faction into the city it took, keeping its lord', () => {
    let state = playing('leonis')
    state = invade(state, DARM, TIRNA, ['036'])
    // コルネリアの領主 (078) leads the second army
    state = invade(state, CORNELIA, TIRNA, ['078', '075'])
    let marching = startNextBattle(endStrategyPhase(state))
    marching = resolveBattle(marching, marching.march!.current!.id, 'attacker')
    expect(governorOf(marching, TIRNA)).toBe('036')
    const entering = startNextBattle(marching)
    const entry = entering.march!.entry!
    expect(entry).toMatchObject({ factionId: 'leonis', from: CORNELIA, to: TIRNA, knights: ['078', '075'] })
    expect(entering.march!.current).toBeNull()
    // Setting out, the lord is followed by another in コルネリア
    expect(governorOf(entering, CORNELIA)).toBe('082')
    expect(startNextBattle(entering)).toBe(entering)

    // The army's soldiers go with it
    expect(entry.soldiers).toBeGreaterThan(0)
    expect(entering.cities[CORNELIA].troops).toBe(marching.cities[CORNELIA].troops - entry.soldiers)

    const entered = finishEntry(entering, entry.id)
    expect(entered.cities[TIRNA].troops).toBe(entering.cities[TIRNA].troops + entry.soldiers)
    expect(entered.characters['075']).toMatchObject({ cityId: TIRNA, factionId: 'leonis' })
    expect(entered.characters['078']).toMatchObject({ cityId: TIRNA, factionId: 'leonis' })
    expect(governorOf(entered, TIRNA)).toBe('036')
    expect(entered.march!.entry).toBeNull()
    expect(startNextBattle(entered)).toMatchObject({ turn: 2, phase: 'strategy' })
  })
})

describe('soldiers and defense', () => {
  const units: ArmyUnit[] = [{ knightId: '015', unitType: 'infantry', soldiers: 300 }, { knightId: '016', unitType: 'cavalry', soldiers: 200 }]
  const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', '016'], units }
  const troops = (state: GameState, cityId: string) => state.cities[cityId].troops
  /** カルタ書院 (the player's) invades アンバリア with `units`, `change` made to the state first */
  const marchOn = (change: (state: GameState) => GameState = (s) => s) =>
    startNextBattle(endStrategyPhase(addOrder(change(playing('carta')), draft)))
  const withCity = (state: GameState, cityId: string, patch: Partial<GameState['cities'][string]>): GameState =>
    ({ ...state, cities: { ...state.cities, [cityId]: { ...state.cities[cityId], ...patch } } })
  const sum = (list: readonly ArmyUnit[]) => list.reduce((total, u) => total + u.soldiers, 0)

  it('takes the soldiers of each army from its city as the battle starts', () => {
    const start = playing('carta')
    const marching = marchOn()
    const battle = marching.march!.current!
    expect(battle).toMatchObject({ undefended: false, pendingDefense: false })
    expect(troops(marching, FLUEN)).toBe(troops(start, FLUEN) - 500)
    expect(sum(battle.defender.units)).toBeGreaterThan(0)
    expect(troops(marching, AMBARIA)).toBe(troops(start, AMBARIA) - sum(battle.defender.units))
  })

  it('takes a city without its lord there, without soldiers or neutral at once, capturing its knights', () => {
    const lordless = (s: GameState) => withCity(s, AMBARIA, { assignments: { officers: {} } })
    const cases = [
      lordless,
      (s: GameState) => withCity(s, AMBARIA, { troops: 0 }),
      (s: GameState) => ({ ...s, cityOwners: Object.fromEntries(Object.entries(s.cityOwners).filter(([id]) => id !== AMBARIA)) }),
    ]
    for (const change of cases) expect(marchOn(change).march!.current).toMatchObject({ undefended: true, defender: { units: [] } })

    const marching = marchOn(lordless)
    const battle = marching.march!.current!
    expect(battle.defender.knights).toEqual(AMBARIA_KNIGHTS)
    expect(() => resolveBattle(marching, battle.id, 'defender')).toThrow(GameRuleError)
    const taken = resolveBattle(marching, battle.id, 'attacker')
    expect(taken.cityOwners[AMBARIA]).toBe('carta')
    expect(taken.lastBattle).toMatchObject({ reason: 'undefended', captives: AMBARIA_KNIGHTS, soldiers: [{ cityId: AMBARIA, soldiers: 500 }] })
    // The city's soldiers and supplies are the attacker's now, the army's soldiers joining them
    expect(troops(taken, AMBARIA)).toBe(troops(marching, AMBARIA) + 500)
    expect(taken.cities[AMBARIA].storedSupplies).toBe(marching.cities[AMBARIA].storedSupplies)
    // Prisoners stay as they are for now
    expect(taken.characters['013']).toEqual({ cityId: AMBARIA, factionId: 'leonis' })
    expect(taken.characters['015']).toMatchObject({ cityId: AMBARIA, factionId: 'carta' })
  })

  it('the attacker takes the city with the soldiers left: those the defender kept in it and its own', () => {
    const marching = marchOn()
    const battle = marching.march!.current!
    const survivors: BattleSurvivor[] = [
      { side: 'attacker', knightId: '015', soldiers: 250 }, { side: 'attacker', knightId: '016', soldiers: 0 },
      { side: 'defender', knightId: '046', soldiers: 40 },
    ]
    const state = resolveBattle(marching, battle.id, 'attacker', [], 'stronghold', [], Math.random, survivors)
    expect(troops(state, AMBARIA)).toBe(troops(marching, AMBARIA) + 250)
    // The defender's soldiers left go with its knights to ヴェルスタ
    expect(troops(state, VERSTA)).toBe(troops(marching, VERSTA) + 40)
    expect(state.lastBattle?.soldiers).toEqual([{ cityId: AMBARIA, soldiers: 250 }, { cityId: VERSTA, soldiers: 40 }])
  })

  it('units retreating take their soldiers to where they retreat; those captured lose them', () => {
    const marching = marchOn()
    const battle = marching.march!.current!
    const retreats: BattleRetreat[] = [
      { side: 'attacker', knightId: '016', to: FLUEN, captured: false, soldiers: 120 },
      { side: 'defender', knightId: '013', to: VERSTA, captured: true, soldiers: 90 },
    ]
    const survivors: BattleSurvivor[] = [{ side: 'attacker', knightId: '015', soldiers: 150 }, { side: 'defender', knightId: '046', soldiers: 300 }]
    const state = resolveBattle(marching, battle.id, 'defender', retreats, 'commanderRetreat', [], Math.random, survivors)
    // Back in フルーエン: 120 retreating and 150 going back
    expect(troops(state, FLUEN)).toBe(troops(marching, FLUEN) + 270)
    expect(troops(state, AMBARIA)).toBe(troops(marching, AMBARIA) + 300)
    expect(troops(state, VERSTA)).toBe(troops(marching, VERSTA))
  })

  it('without the battlefield\'s report every unit is left as it started', () => {
    const start = playing('carta')
    const marching = marchOn()
    const state = resolveBattle(marching, marching.march!.current!.id, 'defender')
    expect(troops(state, FLUEN)).toBe(troops(start, FLUEN))
    expect(troops(state, AMBARIA)).toBe(troops(start, AMBARIA))
  })

  it('a faction the player plays forms the army defending its city', () => {
    // カルタ書院 invades アンバリア of レオニス帝国, the player's
    let leonis = playing('leonis')
    while (leonis.activeFaction !== 'carta') leonis = endFactionTurn(leonis)
    const invaded = startNextBattle(endStrategyPhase(addOrder(leonis, draft)))
    const pending = invaded.march!.current!
    expect(pending).toMatchObject({ pendingDefense: true, undefended: false, defender: { factionId: 'leonis', knights: [], units: [] } })
    expect(startNextBattle(invaded)).toBe(invaded)
    expect(() => resolveBattle(invaded, pending.id, 'attacker')).toThrow(GameRuleError)
    expect(defenseKnights(invaded, pending)).toEqual(AMBARIA_KNIGHTS)

    const unit = (knightId: string, soldiers = 100): ArmyUnit => ({ knightId, unitType: defaultUnitType(knightId), soldiers })
    // コンラート (046) is the lord of アンバリア: they lead when they defend
    expect(defenseProblem(invaded, pending, { commander: '013', units: [unit('013'), unit('046')] })).toBe('046 が防衛するときは軍団長になります')
    expect(defenseProblem(invaded, pending, { commander: '015', units: [unit('015')] })).toBe('015 はこの拠点で防衛できる騎士ではありません')
    expect(defenseProblem(invaded, pending, { commander: '046', units: [unit('046', troops(invaded, AMBARIA) + 10)] })).not.toBeNull()

    const defended = formDefense(invaded, pending.id, { commander: '046', units: [unit('046', 300), unit('013', 200)] })
    expect(defended.march!.current).toMatchObject({ pendingDefense: false, defender: { knights: ['046', '013'], commander: '046' } })
    expect(troops(defended, AMBARIA)).toBe(troops(invaded, AMBARIA) - 500)
    expect(() => formDefense(defended, pending.id, { commander: '046', units: [unit('046')] })).toThrow(GameRuleError)
    // 087 stayed out of the army: losing the city, they retreat with the others
    const lost = resolveBattle(defended, pending.id, 'attacker')
    expect(lost.characters['087']).toMatchObject({ cityId: VERSTA, factionId: 'leonis' })
  })
})

describe('the head of a faction and its fall', () => {
  const SILVA = 'P026' // カルタ書院, next to フルーエン; 067 its lord
  const ASHDAR = 'P000' // 法王府's only city
  const ELDRAN = 'P013' // レオニス帝国, next to it

  /** Plays on to the next turn's strategy phase of the same faction, the moves and battles (attackers winning) made */
  const nextTurn = (state: GameState) => {
    state = endStrategyPhase(state)
    for (let next = startNextBattle(state); ; next = startNextBattle(state)) {
      state = next
      const battle = state.march?.current
      if (!battle) return state
      state = resolveBattle(state, battle.id, 'attacker')
    }
  }

  it('the head (君主) moving to a city becomes its lord; another knight does not', () => {
    expect(governorOf(playing('carta'), SILVA)).toBe('067')
    let state = addMoveOrder(playing('carta'), { factionId: 'carta', from: FLUEN, to: SILVA, knights: ['015'], troops: 0, supplies: 0, solo: true })
    expect(governorOf(nextTurn(state), SILVA)).toBe('067')

    state = addMoveOrder(playing('carta'), { factionId: 'carta', from: FLUEN, to: SILVA, knights: ['029'], troops: 0, supplies: 0, solo: true })
    state = nextTurn(state)
    expect(state.characters['029'].cityId).toBe(SILVA)
    expect(governorOf(state, SILVA)).toBe('029')
    expect(governorOf(state, FLUEN)).not.toBe('029')
  })

  it('the head retreating to a city becomes its lord: out of the city lost, or from the battlefield', () => {
    // レオニス帝国's head (039) defends アンバリア and flees to ヴェルスタ when it falls
    const withHead = (state: GameState) => ({ ...state, characters: { ...state.characters, '039': { cityId: AMBARIA, factionId: 'leonis' } } })
    let marching = startNextBattle(endStrategyPhase(withHead(invadeAmbaria())))
    expect(governorOf(marching, VERSTA)).not.toBe('039')
    const fled = resolveBattle(marching, marching.march!.current!.id, 'attacker')
    expect(fled.characters['039']).toEqual({ cityId: VERSTA, factionId: 'leonis' })
    expect(governorOf(fled, VERSTA)).toBe('039')
    expect(fled.lastBattle?.governors).toContainEqual({ cityId: VERSTA, characterId: '039' })

    // カルタ書院's head (029), lord of フルーエン, retreats back there: lord again
    marching = startNextBattle(endStrategyPhase(invadeAmbaria(['029'])))
    expect(governorOf(marching, FLUEN)).not.toBe('029')
    const id = marching.march!.current!.id
    const retreated = resolveBattle(marching, id, 'defender', [{ side: 'attacker', knightId: '029', to: FLUEN, captured: false }])
    expect(governorOf(retreated, FLUEN)).toBe('029')
    // Going back without retreating, they are not
    expect(governorOf(resolveBattle(marching, id, 'defender'), FLUEN)).not.toBe('029')
  })

  it('a faction losing its last city is destroyed: every knight of it becomes unaffiliated, and the event is told', () => {
    const start = playing('leonis')
    const knights = Object.keys(start.characters).filter((id) => start.characters[id].factionId === 'sede').sort()
    expect(knights.length).toBeGreaterThan(0)
    const marching = startNextBattle(endStrategyPhase(addOrder(start, { factionId: 'leonis', from: ELDRAN, to: ASHDAR, commander: '038', knights: ['038'] })))
    const battle = marching.march!.current!
    expect(battle.defender.factionId).toBe('sede')

    const held = resolveBattle(marching, battle.id, 'defender')
    expect(held.events).toEqual([])

    const fallen = resolveBattle(marching, battle.id, 'attacker')
    for (const id of knights) expect(fallen.characters[id]).toEqual({ cityId: null, factionId: null })
    expect(fallen.events).toEqual([{
      id: expect.any(String), kind: 'factionDestroyed', turn: 1, factionId: 'sede', cityId: ASHDAR, by: 'leonis', knights,
    }])
    expect(turnOrder(fallen)).not.toContain('sede')
    // The march waits until the event is told
    expect(startNextBattle(fallen)).toMatchObject({ turn: 2 })
    const told = dismissEvent(fallen, fallen.events[0].id)
    expect(told.events).toEqual([])
    expect(dismissEvent(told, 'nope')).toBe(told)
  })
})
