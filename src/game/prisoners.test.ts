import { describe, expect, it } from 'vitest'
import {
  addMoveOrder, addOrder, addTransportOrder, availableKnights, availablePrisoners, charactersIn, endFactionTurn, escapeChance, GameRuleError,
  moveOrderProblem, prisonersIn, resolveBattle, runEscapes, startNextBattle, transportFromProblem, type GameState,
} from '.'
import { playing } from './testing'

// レオニス帝国: アンバリア (P004) — ヴェルスタ (P005) — P010 — P011 along its own roads; カルタ書院's フルーエン (P012) next to アンバリア
const AMBARIA = 'P004'
const VERSTA = 'P005'
const P010 = 'P010'
const P011 = 'P011'
const FLUEN = 'P012'
/** クラリス (015, カルタ書院): 武力 24・知力 89 */
const CLARIS = '015'
/** エルヴィン (016, カルタ書院): 武力 73・知力 67 */
const ELWIN = '016'

const never = () => 0.999
const always = () => 0

/** `ids` of カルタ書院 held prisoner in `cityId` */
const holding = (state: GameState, cityId: string, ...ids: string[]): GameState => ({
  ...state, characters: { ...state.characters, ...Object.fromEntries(ids.map((id) => [id, { cityId, factionId: 'carta', prisoner: true }])) },
})

/** Ends the strategy phase of every faction, the prisoners escaping by `random` */
function endStrategyPhase(state: GameState, random = never): GameState {
  while (state.phase === 'strategy') state = endFactionTurn(state, random)
  return state
}

/** Plays progress phases (with no battles) until the strategy phase of the next turn */
function nextTurn(state: GameState, random = never): GameState {
  state = endStrategyPhase(state, random)
  while (state.phase === 'march') state = startNextBattle(state, never)
  return state
}

describe('prisoners', () => {
  it('are held in their city: listed apart from its knights and given no orders', () => {
    const state = holding(playing('leonis'), AMBARIA, CLARIS)
    expect(prisonersIn(state, AMBARIA)).toEqual([CLARIS])
    expect(charactersIn(state, AMBARIA)).not.toContain(CLARIS)
    expect(availableKnights(state, AMBARIA)).not.toContain(CLARIS)
    expect(charactersIn(state, FLUEN)).not.toContain(CLARIS)
  })

  it('escape at the higher of 武力・知力 × 0.25%, twice as often on the way; not once their faction has fallen', () => {
    const state = holding(playing('leonis'), AMBARIA, CLARIS)
    expect(escapeChance(state, CLARIS)).toBeCloseTo(0.89 * 0.25)
    expect(escapeChance(state, ELWIN)).toBe(0)
    const moving = { ...state, movements: [{
      id: 'move-1', factionId: 'leonis', from: AMBARIA, to: P010, knights: ['013'], troops: 0, supplies: 0, solo: false,
      prisoners: [CLARIS], troopMorale: 0, route: [VERSTA, P010], monthsLeft: 1,
    }] }
    expect(escapeChance(moving, CLARIS)).toBeCloseTo(0.89 * 0.25 * 2)
    const fallen = { ...state, cityOwners: Object.fromEntries(Object.entries(state.cityOwners).filter(([, f]) => f !== 'carta')) }
    expect(escapeChance(fallen, CLARIS)).toBe(0)
    expect(runEscapes(fallen, always)).toBe(fallen)
  })

  it('escaping, ride alone to the nearest city of their faction as the progress phase starts', () => {
    const state = holding(playing('leonis'), AMBARIA, CLARIS)
    expect(endStrategyPhase(state, never).characters[CLARIS]).toEqual(state.characters[CLARIS])
    const escaped = endStrategyPhase(state, always)
    expect(escaped.characters[CLARIS]).toEqual({ cityId: null, factionId: 'carta' })
    expect(escaped.movements).toContainEqual(expect.objectContaining({
      kind: 'escape', factionId: 'carta', from: AMBARIA, to: FLUEN, knights: [CLARIS], solo: true, route: [AMBARIA, FLUEN], monthsLeft: 1,
    }))
    const back = nextTurn(state, always)
    expect(back.characters[CLARIS]).toEqual({ cityId: FLUEN, factionId: 'carta' })
    expect(back.movements).toEqual([])
  })

  it('are taken along on a move, as soldiers and supplies are, not riding alone', () => {
    const state = holding(playing('leonis'), AMBARIA, CLARIS, ELWIN)
    const draft = { factionId: 'leonis', from: AMBARIA, to: P011, knights: ['013'], troops: 0, supplies: 0, solo: false, prisoners: [CLARIS] }
    expect(moveOrderProblem(state, { ...draft, solo: true })).toBe('単騎移動では捕虜を連れて行けません')
    expect(moveOrderProblem(state, { ...draft, prisoners: ['046'] })).toBe('046 は出発拠点の捕虜ではありません')
    const ordered = addMoveOrder(state, draft)
    expect(availablePrisoners(ordered, AMBARIA)).toEqual([ELWIN])
    expect(() => addMoveOrder(ordered, { ...draft, knights: ['087'] })).toThrow(GameRuleError)

    // Three roads: two months; held in アンバリア until they get there
    const away = nextTurn(ordered)
    expect(away.characters[CLARIS]).toEqual({ cityId: AMBARIA, factionId: 'carta', prisoner: true })
    expect(availablePrisoners(away, AMBARIA)).toEqual([ELWIN])
    const there = nextTurn(away)
    expect(there.characters[CLARIS]).toEqual({ cityId: P011, factionId: 'carta', prisoner: true })
    expect(prisonersIn(there, P011)).toEqual([CLARIS])
  })

  it('escape from a move where it is, leaving it', () => {
    const state = holding(playing('leonis'), AMBARIA, CLARIS)
    const away = nextTurn(addMoveOrder(state, {
      factionId: 'leonis', from: AMBARIA, to: P011, knights: ['013'], troops: 0, supplies: 0, solo: false, prisoners: [CLARIS],
    }))
    const escaped = endStrategyPhase(away, always)
    expect(escaped.movements.find((m) => m.knights.includes('013'))?.prisoners).toEqual([])
    expect(escaped.movements).toContainEqual(expect.objectContaining({ kind: 'escape', knights: [CLARIS], from: P010 }))
  })

  it('are carried on a transport and left where it unloads; the knight rides back without them', () => {
    const state = holding(playing('leonis'), AMBARIA, CLARIS)
    expect(transportFromProblem({ ...state, cities: { ...state.cities, [AMBARIA]: { ...state.cities[AMBARIA], troops: 0, storedSupplies: 0 } } }, AMBARIA))
      .toBeNull()
    const ordered = addTransportOrder(state, { factionId: 'leonis', from: AMBARIA, to: VERSTA, knight: '013', troops: 0, supplies: 0, prisoners: [CLARIS] })
    const unloaded = nextTurn(ordered)
    expect(unloaded.characters[CLARIS]).toEqual({ cityId: VERSTA, factionId: 'carta', prisoner: true })
    expect(unloaded.movements).toEqual([expect.objectContaining({ kind: 'return', knights: ['013'] })])
    expect(unloaded.movements[0].prisoners).toBeUndefined()
  })

  it('of the faction taking their city are set free and serve there; others are its prisoners now', () => {
    // カルタ書院's 015 and 法王府's 001 held in アンバリア, taken by カルタ書院
    let state = holding(playing('carta'), AMBARIA, CLARIS)
    state = { ...state, characters: { ...state.characters, '001': { cityId: AMBARIA, factionId: 'sede', prisoner: true } } }
    state = addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: ELWIN, knights: [ELWIN] })
    const marching = startNextBattle(endStrategyPhase(state))
    const taken = resolveBattle(marching, marching.march!.current!.id, 'attacker')
    expect(taken.characters[CLARIS]).toEqual({ cityId: AMBARIA, factionId: 'carta' })
    expect(taken.lastBattle?.freed).toEqual([CLARIS])
    expect(charactersIn(taken, AMBARIA)).toContain(CLARIS)
    expect(taken.characters['001']).toEqual({ cityId: AMBARIA, factionId: 'sede', prisoner: true })
  })
})
