import { describe, expect, it, vi } from 'vitest'
import {
  addOrder, addResearchPoints, BALANCE, buildingLocked, buildingProblem, cancelConstruction, cityOutput, constructionBusyProblem, constructionProblem, constructionTurns, createInitialState, debugAddRelic,
  dismantleProblem, dismantleRelic, endFactionTurn, GameRuleError, mustChooseResearch, papalRepairCost, papalRepairProblem, papalRepairShortfall, pauseConstruction, producibleRelics,
  productionProblem, relicItemInfo, relicWorks, repairProblem, requestPapalRepair, resolveBattle, runEconomy, setResearch, startConstruction, startNextBattle,
  startRelicProduction, startRelicRepair, withRelics,
  type CityConstruction, type CityState, type FactionResearch, type GameState, type RelicItem,
} from '..'
import { RELIC_MAP } from '../../data/relics'
import { playing } from '../testing'
import { startingRelics } from './box'

// The tests' own technologies and relics, so that they do not follow the game's data
vi.mock('../../data/techData.json', () => ({
  default: [
    { id: 'root', name: '根', description: '', branch: 'physical', cost: 100, requires: [], effects: [] },
    { id: 'rifle', name: 'ライフル', description: '', branch: 'physical', cost: 200, requires: ['root'], effects: [] },
    { id: 'rifle_production', name: 'ライフルの生産', description: '', branch: 'physical', cost: 300, requires: ['rifle'], effects: [] },
  ],
}))
vi.mock('../../data/relicData.json', () => ({
  default: [
    {
      id: 'rifle', name: 'ライフル', brokenName: '壊れたライフル', description: '', rarity: 'C', use: 'equipment', dismantlePoints: 150,
      repair: { supplies: 400, gold: 150, tech: 'rifle' }, production: { supplies: 300, gold: 100, tech: 'rifle_production' },
    },
    { id: 'ballista', name: 'バリスタ', brokenName: '壊れたバリスタ', description: '', rarity: 'C', use: 'building', dismantlePoints: 60, repair: { supplies: 500, gold: 151 } },
    { id: 'grimoire', name: '魔導書', description: '', rarity: 'B', use: 'equipment', production: { supplies: 400, gold: 200, tech: 'root' } },
    { id: 'colossus', name: '巨像', brokenName: '壊れた巨像', description: '', rarity: 'A', use: 'building', repair: { supplies: 2400, gold: 900, tech: 'rifle' } },
  ],
}))

const FLUEN = 'P012' // カルタ書院
const SILVA = 'P026' // カルタ書院
const AMBARIA = 'P004' // レオニス帝国
const ELDRAN = 'P013' // レオニス帝国, next to アシュダール
const ASHDAR = 'P000' // 法王府
// カルタ書院 starts with these
const RIFLE = 'carta-0'
const BALLISTA = 'carta-1'

const withCity = (state: GameState, cityId: string, change: Partial<CityState>): GameState =>
  ({ ...state, cities: { ...state.cities, [cityId]: { ...state.cities[cityId], ...change } } })
const withResearch = (state: GameState, factionId: string, change: Partial<FactionResearch>): GameState =>
  ({ ...state, research: { ...state.research, [factionId]: { ...state.research[factionId], ...change } } })
const researched = (state: GameState, ...techs: string[]) => withResearch(state, 'carta', { researched: techs })
const withGold = (state: GameState, gold: number, factionId = 'carta'): GameState => ({ ...state, gold: { ...state.gold, [factionId]: gold } })
const itemsOf = (state: GameState, factionId = 'carta') => state.relics[factionId]
const item = (state: GameState, id: string, factionId = 'carta') => itemsOf(state, factionId).find((i) => i.id === id)

/** The strategy phase of every faction, then the march with no orders: the economy runs and the next turn starts */
function nextTurn(state: GameState): GameState {
  // Research points 宙に浮いた would hold the turn up
  state = withResearch(state, 'carta', { carry: 0 })
  while (state.phase === 'strategy') state = endFactionTurn(state)
  return startNextBattle(state)
}

const almostDone = (state: GameState, cityId: string, left = 1): GameState => {
  const construction = state.cities[cityId].construction!
  return withCity(state, cityId, { construction: { ...construction, investedSupplies: construction.requiredSupplies - left } })
}

describe('the box', () => {
  it('starts a faction with its relics, broken or repaired', () => {
    expect(startingRelics({
      id: 'carta', relics: [{ relicId: 'rifle', repaired: false }, { relicId: 'grimoire_flame_lance', repaired: true }],
    })).toEqual([
      { id: 'carta-0', relicId: 'rifle', repaired: false },
      { id: 'carta-1', relicId: 'grimoire_flame_lance', repaired: true },
    ])
    expect(startingRelics({ id: 'sede' })).toEqual([])
  })

  it('starts each faction with the relics of its data', () => {
    const state = createInitialState(['carta'])
    expect(itemsOf(state)).toEqual([
      { id: RIFLE, relicId: 'rifle', repaired: false },
      { id: BALLISTA, relicId: 'ballista', repaired: false },
      { id: 'carta-2', relicId: 'rifle', repaired: true },
    ])
    expect(itemsOf(state, 'sede')).toEqual([])
    expect(new Set(Object.values(state.relics).flat().map((i) => i.id)).size).toBe(Object.values(state.relics).flat().length)
  })

  it('adds a relic broken in debugging, a 魔導書 repaired', () => {
    const state = debugAddRelic(debugAddRelic(playing('carta'), 'carta', 'ballista'), 'carta', 'grimoire')
    expect(itemsOf(state).slice(-2).map(({ relicId, repaired }) => ({ relicId, repaired }))).toEqual([
      { relicId: 'ballista', repaired: false }, { relicId: 'grimoire', repaired: true },
    ])
    expect(new Set(itemsOf(state).map((i) => i.id)).size).toBe(itemsOf(state).length)
  })
})

describe('dismantling', () => {
  it('puts the points into the technology researched, the relic gone', () => {
    const state = setResearch(playing('carta'), 'carta', 'root')
    const next = dismantleRelic(state, 'carta', BALLISTA)
    expect(item(next, BALLISTA)).toBeUndefined()
    expect(next.research.carta).toMatchObject({ current: 'root', progress: { root: 60 }, carry: 0 })
    expect(next.events).toEqual([])
  })

  it('completes the technology at once, telling the player, the surplus 宙に浮いた', () => {
    const state = setResearch(playing('carta'), 'carta', 'root')
    const next = dismantleRelic(state, 'carta', RIFLE)
    expect(next.research.carta).toMatchObject({ current: null, researched: ['root'], progress: { root: 100 }, carry: 50 })
    expect(next.events).toEqual([expect.objectContaining({ kind: 'techCompleted', factionId: 'carta', techId: 'root', turn: 1 })])
    expect(mustChooseResearch(next, 'carta')).toBe(true)
  })

  it('leaves the points 宙に浮いた researching nothing, for the faction to choose where', () => {
    const next = dismantleRelic(playing('carta'), 'carta', BALLISTA)
    expect(next.research.carta).toMatchObject({ current: null, carry: 60 })
    expect(mustChooseResearch(next, 'carta')).toBe(true)
    expect(setResearch(next, 'carta', 'root').research.carta).toMatchObject({ current: 'root', progress: { root: 60 }, carry: 0 })
  })

  it('refuses with nothing left to research: the relic would be lost for nothing', () => {
    const done = researched(playing('carta'), 'root', 'rifle', 'rifle_production')
    expect(dismantleProblem(done, 'carta', RIFLE)).toBe('研究できる技術が残っていません')
    expect(() => dismantleRelic(done, 'carta', RIFLE)).toThrow(GameRuleError)
    // The last technology still takes them
    const last = setResearch(researched(playing('carta'), 'root', 'rifle'), 'carta', 'rifle_production')
    const next = dismantleRelic(last, 'carta', BALLISTA)
    expect(next.research.carta.progress.rifle_production).toBe(60)
  })

  it('takes broken relics only, of the faction, in its turn', () => {
    const state = playing('carta')
    expect(dismantleProblem(withRelics(state, 'carta', [{ id: 'r', relicId: 'rifle', repaired: true }]), 'carta', 'r')).toBe('修復済みの遺物です')
    expect(dismantleProblem(state, 'carta', 'nope')).toBe('遺物がありません')
    expect(dismantleProblem(state, 'carta', 'leonis-0')).toBe('遺物がありません')
    expect(dismantleProblem(state, 'leonis', 'leonis-0')).toBe('手番ではありません')
    expect(dismantleProblem({ ...state, phase: 'march', activeFaction: null }, 'carta', RIFLE)).toBe('手番ではありません')
  })
})

describe('repairing in a city', () => {
  it('needs the technology of the relic, not of one needing none', () => {
    const state = playing('carta')
    expect(repairProblem(state, FLUEN, RIFLE)).toBe('技術「ライフル」の研究が必要です')
    expect(repairProblem(researched(state, 'root', 'rifle'), FLUEN, RIFLE)).toBeNull()
    expect(repairProblem(state, FLUEN, BALLISTA)).toBeNull()
  })

  it('pays the gold at the start, the relic leaving the box for the city', () => {
    const state = playing('carta')
    const next = startRelicRepair(state, FLUEN, BALLISTA)
    expect(next.gold.carta).toBe(state.gold.carta - RELIC_MAP.ballista.repair!.gold)
    expect(item(next, BALLISTA)).toBeUndefined()
    expect(next.cities[FLUEN].construction).toEqual({ work: { kind: 'relicRepair', relicId: 'ballista' }, requiredSupplies: 500, investedSupplies: 0 })
    expect(relicWorks(next, 'carta')).toEqual([{ cityId: FLUEN, work: { kind: 'relicRepair', relicId: 'ballista' }, construction: next.cities[FLUEN].construction }])
    expect(constructionTurns(next, FLUEN)).toBe(Math.ceil(500 / cityOutput(next, FLUEN).production))
  })

  it('shares the place of a building: one at a time in a city', () => {
    const state = playing('carta')
    const building = startConstruction(state, FLUEN, 'market')
    expect(repairProblem(building, FLUEN, BALLISTA)).toBe('ほかの施設を建設中です')
    expect(productionProblem(building, FLUEN, 'grimoire')).toBe('技術「根」の研究が必要です')
    expect(productionProblem(researched(building, 'root'), FLUEN, 'grimoire')).toBe('ほかの施設を建設中です')
    expect(repairProblem(building, SILVA, BALLISTA)).toBeNull()
    const repairing = startRelicRepair(state, FLUEN, BALLISTA)
    expect(constructionBusyProblem(repairing, FLUEN)).toBe('ほかの遺物を修復中です')
    expect(constructionProblem(repairing, FLUEN, 'market')).toBe('ほかの遺物を修復中です')
    expect(constructionBusyProblem(startRelicProduction(researched(state, 'root'), FLUEN, 'grimoire'), FLUEN)).toBe('ほかの遺物を生産中です')
  })

  it('takes no building slot', () => {
    const state = withCity(playing('carta'), FLUEN, { buildings: Array.from({ length: 20 }, (_, i) => `b${i}`) })
    expect(constructionProblem(state, FLUEN, 'market')).toBe('施設の空きがありません')
    expect(repairProblem(state, FLUEN, BALLISTA)).toBeNull()
  })

  it('needs the gold, a city of the faction and a relic left to repair', () => {
    const state = playing('carta')
    expect(repairProblem(withGold(state, 150), FLUEN, BALLISTA)).toBe('金が足りません')
    expect(repairProblem(withGold(state, 151), FLUEN, BALLISTA)).toBeNull()
    expect(repairProblem(state, AMBARIA, BALLISTA)).toBe('自勢力の都市ではありません')
    expect(repairProblem(state, FLUEN, 'nope')).toBe('遺物がありません')
    expect(() => startRelicRepair(withGold(state, 0), FLUEN, BALLISTA)).toThrow(GameRuleError)
    const repaired = withRelics(state, 'carta', [{ id: 'r', relicId: 'ballista', repaired: true }])
    expect(repairProblem(repaired, FLUEN, 'r')).toBe('修復済みの遺物です')
  })

  it('takes the city\'s 生産 and comes into the box repaired, telling the player, the surplus stored', () => {
    let state = startRelicRepair(playing('carta'), FLUEN, BALLISTA)
    const { production } = cityOutput(state, FLUEN)
    const stored = state.cities[FLUEN].storedSupplies
    state = nextTurn(state)
    expect(state.cities[FLUEN].construction).toMatchObject({ investedSupplies: production })
    expect(state.cities[FLUEN].storedSupplies).toBe(stored)

    state = nextTurn(almostDone(state, FLUEN))
    expect(state.cities[FLUEN].construction).toBeNull()
    expect(state.cities[FLUEN].storedSupplies).toBe(stored + production - 1)
    expect(itemsOf(state).at(-1)).toMatchObject({ relicId: 'ballista', repaired: true })
    expect(state.events).toEqual([expect.objectContaining({ kind: 'relicCompleted', factionId: 'carta', relicId: 'ballista', cityId: FLUEN, turn: 3 })])
    expect(state.lastEconomy!.cities[FLUEN].events).toContainEqual({ kind: 'relicCompleted', relicId: 'ballista' })
  })

  it('pauses as a building does, the 生産 going to the store', () => {
    const state = pauseConstruction(startRelicRepair(playing('carta'), FLUEN, BALLISTA), FLUEN)
    const next = runEconomy(state, 2)
    expect(next.cities[FLUEN].construction).toMatchObject({ investedSupplies: 0, paused: true })
    expect(next.cities[FLUEN].storedSupplies).toBe(state.cities[FLUEN].storedSupplies + cityOutput(state, FLUEN).production)
  })

  it('cancels with half of the supplies back and the relic broken in the box, not the gold', () => {
    const start = playing('carta')
    let state = startRelicRepair(start, FLUEN, BALLISTA)
    state = withCity(state, FLUEN, { construction: { ...state.cities[FLUEN].construction!, investedSupplies: 101 } })
    const next = cancelConstruction(state, FLUEN)
    expect(next.cities[FLUEN].construction).toBeNull()
    expect(next.cities[FLUEN].storedSupplies).toBe(state.cities[FLUEN].storedSupplies + 50)
    expect(next.gold.carta).toBe(state.gold.carta)
    expect(itemsOf(next).at(-1)).toMatchObject({ relicId: 'ballista', repaired: false })
    expect(itemsOf(next)).toHaveLength(itemsOf(start).length)
  })

  it('is not told for a CPU faction, whose relic comes into the box all the same', () => {
    const leonis: CityConstruction = { work: { kind: 'relicRepair', relicId: 'rifle' }, requiredSupplies: 1, investedSupplies: 0 }
    const state = nextTurn(withCity(playing('carta'), AMBARIA, { construction: leonis }))
    expect(itemsOf(state, 'leonis').at(-1)).toMatchObject({ relicId: 'rifle', repaired: true })
    expect(state.events).toEqual([])
  })
})

describe('producing in a city', () => {
  it('needs the technology and no relic, and only what can be produced', () => {
    const state = playing('carta')
    expect(productionProblem(state, FLUEN, 'rifle')).toBe('技術「ライフルの生産」の研究が必要です')
    expect(productionProblem(state, FLUEN, 'ballista')).toBe('生産できない遺物です')
    expect(productionProblem(state, FLUEN, 'nope')).toBe('nope は遺物ではありません')
    const skilled = researched(state, 'root', 'rifle', 'rifle_production')
    expect(productionProblem(skilled, FLUEN, 'rifle')).toBeNull()
    expect(productionProblem(withGold(skilled, 99), FLUEN, 'rifle')).toBe('金が足りません')
    expect(producibleRelics(state, 'carta')).toEqual([])
    expect(producibleRelics(skilled, 'carta').map((r) => r.id)).toEqual(['rifle', 'grimoire'])
  })

  it('pays the gold and leaves the box as it is, the relic coming in repaired', () => {
    const start = researched(playing('carta'), 'root', 'rifle', 'rifle_production')
    let state = startRelicProduction(start, FLUEN, 'rifle')
    expect(state.gold.carta).toBe(start.gold.carta - 100)
    expect(itemsOf(state)).toEqual(itemsOf(start))
    state = nextTurn(almostDone(state, FLUEN))
    expect(itemsOf(state)).toHaveLength(itemsOf(start).length + 1)
    expect(itemsOf(state).at(-1)).toMatchObject({ relicId: 'rifle', repaired: true })
    expect(state.events).toEqual([expect.objectContaining({ kind: 'relicCompleted', relicId: 'rifle', cityId: FLUEN })])
  })

  it('cancels leaving nothing but half of the supplies', () => {
    const start = researched(playing('carta'), 'root')
    const state = startRelicProduction(start, FLUEN, 'grimoire')
    const next = cancelConstruction(state, FLUEN)
    expect(itemsOf(next)).toEqual(itemsOf(start))
    expect(next.cities[FLUEN].construction).toBeNull()
  })
})

describe('a building using a relic (施設の遺物)', () => {
  /** カルタ書院's バリスタ repaired, and the gold to build */
  const ready = (state = playing('carta')): GameState =>
    withGold(withRelics(state, 'carta', itemsOf(state).map((i) => (i.id === BALLISTA ? { ...i, repaired: true } : i))), 10000)

  it('is hidden and refused until the faction has the relic repaired', () => {
    const state = withGold(playing('carta'), 10000)
    expect(buildingLocked(state, FLUEN, 'ballista')).toBe(true)
    expect(buildingProblem(state, FLUEN, 'ballista')).toBe('遺物「バリスタ」が必要です')
    expect(buildingLocked(ready(), FLUEN, 'ballista')).toBe(false)
    expect(buildingProblem(ready(), FLUEN, 'ballista')).toBeNull()
    expect(constructionProblem(ready(), FLUEN, 'ballista')).toBeNull()
    // Another faction's city: the relic is カルタ書院's
    expect(buildingLocked(ready(), AMBARIA, 'ballista')).toBe(true)
  })

  it('locks the relic while it is built, the box keeping it', () => {
    const state = startConstruction(ready(), FLUEN, 'ballista')
    expect(state.cities[FLUEN].construction!.work).toEqual({ kind: 'building', buildingId: 'ballista', relicItemId: BALLISTA })
    expect(item(state, BALLISTA)).toMatchObject({ repaired: true, buildingIn: FLUEN })
    // Another city sees it, but cannot build with the relic in use
    expect(buildingLocked(state, SILVA, 'ballista')).toBe(false)
    expect(buildingProblem(state, SILVA, 'ballista')).toBe('遺物「バリスタ」はほかの都市の建設に使っています')
  })

  it('uses the first relic of the kind no other building uses', () => {
    const second: RelicItem = { id: 'second', relicId: 'ballista', repaired: true }
    const broken: RelicItem = { id: 'broken', relicId: 'ballista', repaired: false }
    let state = ready()
    state = withRelics(state, 'carta', [broken, ...itemsOf(state), second])
    state = startConstruction(state, FLUEN, 'ballista')
    expect(item(state, BALLISTA)!.buildingIn).toBe(FLUEN)
    state = startConstruction(state, SILVA, 'ballista')
    expect(state.cities[SILVA].construction!.work).toMatchObject({ relicItemId: 'second' })
    expect(item(state, 'second')!.buildingIn).toBe(SILVA)
    expect(item(state, 'broken')!.buildingIn).toBeUndefined()
  })

  it('unlocks the relic when cancelled', () => {
    const state = cancelConstruction(startConstruction(ready(), FLUEN, 'ballista'), FLUEN)
    expect(item(state, BALLISTA)).toEqual({ id: BALLISTA, relicId: 'ballista', repaired: true })
    expect(buildingProblem(state, SILVA, 'ballista')).toBeNull()
  })

  it('uses the relic up when completed', () => {
    const state = nextTurn(almostDone(startConstruction(ready(), FLUEN, 'ballista'), FLUEN))
    expect(state.cities[FLUEN].buildings).toContain('ballista')
    expect(item(state, BALLISTA)).toBeUndefined()
    expect(itemsOf(state)).toHaveLength(itemsOf(ready()).length - 1)
    // No relic left: hidden again
    expect(buildingLocked(state, SILVA, 'ballista')).toBe(true)
  })

  it('keeps the relic while it is not completed', () => {
    const state = nextTurn(startConstruction(ready(), FLUEN, 'ballista'))
    expect(item(state, BALLISTA)!.buildingIn).toBe(FLUEN)
  })
})

describe('a city captured with work under way', () => {
  /** カルタ書院 takes アンバリア, where `construction` is under way (`prepare`: changing the state before) */
  function captured(construction: CityConstruction, prepare: (state: GameState) => GameState = (s) => s) {
    const start = prepare(playing('carta'))
    let state = withCity(addOrder(start, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015'] }), AMBARIA, { construction })
    while (state.phase === 'strategy') state = endFactionTurn(state)
    state = startNextBattle(state)
    return { before: state, after: resolveBattle(state, state.march!.current!.id, 'attacker') }
  }

  it('loses a repair or a production, nothing given back to anyone', () => {
    const work = { kind: 'relicRepair', relicId: 'rifle' } as const
    const { before, after } = captured({ work, requiredSupplies: 400, investedSupplies: 200 })
    expect(after.cities[AMBARIA].construction).toBeNull()
    expect(after.lastBattle!.lostRelicWork).toEqual(work)
    expect(after.cities[AMBARIA].storedSupplies).toBe(before.cities[AMBARIA].storedSupplies)
    expect(itemsOf(after, 'leonis')).toEqual(itemsOf(before, 'leonis'))
    expect(itemsOf(after)).toEqual(itemsOf(before))
    expect(after.gold.leonis).toBe(before.gold.leonis)
    const production = { kind: 'relicProduction', relicId: 'rifle' } as const
    expect(captured({ work: production, requiredSupplies: 300, investedSupplies: 0 }).after.lastBattle!.lostRelicWork).toEqual(production)
  })

  it('keeps a building going for the new owner', () => {
    const construction: CityConstruction = { work: { kind: 'building', buildingId: 'market' }, requiredSupplies: 300, investedSupplies: 50 }
    const { after } = captured(construction)
    expect(after.cities[AMBARIA].construction).toEqual(construction)
    expect(after.lastBattle!.lostRelicWork).toBeNull()
  })

  it('loses a building using a relic, and the relic with it', () => {
    const locked: RelicItem = { id: 'leonis-ballista', relicId: 'ballista', repaired: true, buildingIn: AMBARIA }
    const work = { kind: 'building', buildingId: 'ballista', relicItemId: locked.id } as const
    const { before, after } = captured({ work, requiredSupplies: 900, investedSupplies: 300 },
      (state) => withRelics(state, 'leonis', [...itemsOf(state, 'leonis'), locked]))
    expect(item(before, locked.id, 'leonis')).toEqual(locked)
    expect(after.cities[AMBARIA].construction).toBeNull()
    expect(after.lastBattle!.lostRelicWork).toEqual(work)
    expect(item(after, locked.id, 'leonis')).toBeUndefined()
    expect(itemsOf(after, 'leonis')).toHaveLength(itemsOf(before, 'leonis').length - 1)
    expect(itemsOf(after)).toEqual(itemsOf(before))
  })

  it('keeps the work when the city holds', () => {
    const construction: CityConstruction = { work: { kind: 'relicRepair', relicId: 'rifle' }, requiredSupplies: 400, investedSupplies: 200 }
    const { before } = captured(construction)
    const held = resolveBattle(before, before.march!.current!.id, 'defender')
    expect(held.cities[AMBARIA].construction).toEqual(construction)
    expect(held.lastBattle!.lostRelicWork).toBeNull()
  })
})

describe('法王府', () => {
  const cost = () => Math.ceil((151 + 500) * BALANCE.PAPAL_REPAIR_RATE)

  it('takes (gold + supplies) × the rate, rounded up, into its treasury at once', () => {
    expect(papalRepairCost(playing('carta'), 'carta', RELIC_MAP.ballista)).toBe(cost())
    const state = playing('carta')
    const next = requestPapalRepair(state, 'carta', BALLISTA)
    expect(next.gold.carta).toBe(state.gold.carta - cost())
    expect(next.gold.sede).toBe(state.gold.sede + cost())
    expect(item(next, BALLISTA)).toEqual({ id: BALLISTA, relicId: 'ballista', repaired: false, papalRepair: true })
  })

  it('asks more the farther the faction is from the repair\'s technology, by the research points it lacks', () => {
    const state = playing('carta')
    const rate = (shortfall: number) => BALANCE.PAPAL_REPAIR_RATE_KNOWN + (BALANCE.PAPAL_REPAIR_RATE_RISE * shortfall) / BALANCE.PAPAL_REPAIR_RISE_POINTS
    const rifle = (next: GameState) => papalRepairCost(next, 'carta', RELIC_MAP.rifle)
    // ライフル needs 根 before it: 100 + 200 research points
    expect(papalRepairShortfall(researched(state), 'carta', RELIC_MAP.rifle)).toBe(300)
    expect(rifle(researched(state))).toBe(Math.ceil(550 * rate(300)))
    expect(papalRepairShortfall(researched(state, 'root'), 'carta', RELIC_MAP.rifle)).toBe(200)
    expect(rifle(researched(state, 'root'))).toBe(Math.ceil(550 * rate(200)))
    // What it has put into one counts; researched, the rate is the least
    const halfway = withResearch(state, 'carta', { researched: ['root'], current: 'rifle', progress: { rifle: 150 } })
    expect(papalRepairShortfall(halfway, 'carta', RELIC_MAP.rifle)).toBe(50)
    expect(rifle(researched(state, 'root', 'rifle'))).toBe(Math.ceil(550 * BALANCE.PAPAL_REPAIR_RATE_KNOWN))
    // What follows from it does not count; a relic needing no technology keeps the plain rate
    expect(rifle(researched(state, 'root', 'rifle', 'rifle_production'))).toBe(rifle(researched(state, 'root', 'rifle')))
    expect(papalRepairShortfall(state, 'carta', RELIC_MAP.ballista)).toBeUndefined()
    expect(papalRepairCost(state, 'carta', RELIC_MAP.ballista)).toBe(Math.ceil(651 * BALANCE.PAPAL_REPAIR_RATE))
  })

  it('repairs it by the next turn, with no technology, city or 生産, telling the player', () => {
    const state = requestPapalRepair(playing('carta'), 'carta', RIFLE)
    const next = nextTurn(state)
    expect(item(next, RIFLE)).toEqual({ id: RIFLE, relicId: 'rifle', repaired: true })
    expect(next.events).toEqual([expect.objectContaining({ kind: 'relicCompleted', factionId: 'carta', relicId: 'rifle', cityId: null, turn: 2 })])
    expect(next.cities[FLUEN].storedSupplies).toBe(state.cities[FLUEN].storedSupplies + cityOutput(state, FLUEN).production)
  })

  it('leaves the relic asked for neither dismantled nor repaired', () => {
    const state = requestPapalRepair(playing('carta'), 'carta', BALLISTA)
    expect(dismantleProblem(state, 'carta', BALLISTA)).toBe('法王府に依頼中です')
    expect(repairProblem(state, FLUEN, BALLISTA)).toBe('法王府に依頼中です')
    expect(papalRepairProblem(state, 'carta', BALLISTA)).toBe('法王府に依頼中です')
  })

  it('takes one request of a faction at a time, the next once it is delivered', () => {
    const state = requestPapalRepair(withGold(playing('carta'), 10000), 'carta', RIFLE)
    expect(papalRepairProblem(state, 'carta', BALLISTA)).toBe('法王府への依頼は同時に1件までです')
    expect(() => requestPapalRepair(state, 'carta', BALLISTA)).toThrow(GameRuleError)
    expect(papalRepairProblem({ ...nextTurn(state), activeFaction: 'carta' }, 'carta', BALLISTA)).toBeNull()
  })

  it('counts the request of each faction apart', () => {
    const state = requestPapalRepair(playing('carta'), 'carta', RIFLE)
    const leonis = withRelics(withGold({ ...state, activeFaction: 'leonis' }, 10000, 'leonis'), 'leonis', [{ id: 'r', relicId: 'rifle', repaired: false }])
    expect(papalRepairProblem(leonis, 'leonis', 'r')).toBeNull()
  })

  it('delivers all that a faction holds asked for: a conquest can bring it more than one', () => {
    const state = withRelics(playing('carta'), 'carta', [
      { id: 'a', relicId: 'rifle', repaired: false, papalRepair: true },
      { id: 'b', relicId: 'ballista', repaired: false, papalRepair: true },
    ])
    const next = nextTurn(state)
    expect(itemsOf(next).map((i) => i.repaired)).toEqual([true, true])
    expect(next.events).toHaveLength(2)
  })

  it('refuses what is being repaired already, and without the gold', () => {
    const state = playing('carta')
    expect(papalRepairProblem(startRelicRepair(state, FLUEN, BALLISTA), 'carta', BALLISTA)).toBe('遺物がありません')
    expect(papalRepairProblem(withGold(state, cost() - 1), 'carta', BALLISTA)).toBe('金が足りません')
    expect(papalRepairProblem(withGold(state, cost()), 'carta', BALLISTA)).toBeNull()
    expect(papalRepairProblem(withRelics(state, 'carta', [{ id: 'g', relicId: 'grimoire', repaired: false }]), 'carta', 'g')).toBe('修復できない遺物です')
  })

  it('turns down a repair dearer than PAPAL_REPAIR_MAX_GOLD, however rich the faction', () => {
    // 巨像: 3300 × (1.5 + 2 × 300 / 700) ≈ 7,629 with nothing researched, 3300 × 1.5 = 4,950 with ライフル
    const state = withGold(debugAddRelic(playing('carta'), 'carta', 'colossus'), 100_000)
    const id = itemsOf(state).at(-1)!.id
    expect(papalRepairCost(state, 'carta', RELIC_MAP.colossus)).toBeGreaterThan(BALANCE.PAPAL_REPAIR_MAX_GOLD)
    expect(papalRepairProblem(state, 'carta', id)).toBe('金5,000を超える修復は法王府に断られます')
    expect(() => requestPapalRepair(state, 'carta', id)).toThrow(GameRuleError)
    const skilled = researched(state, 'root', 'rifle')
    expect(papalRepairCost(skilled, 'carta', RELIC_MAP.colossus)).toBe(4950)
    expect(papalRepairProblem(skilled, 'carta', id)).toBeNull()
  })

  it('does not repair for itself', () => {
    const state = withRelics(playing('sede'), 'sede', [{ id: 'r', relicId: 'rifle', repaired: false }])
    expect(papalRepairProblem(state, 'sede', 'r')).toBe('法王府は自らに依頼できません')
  })

  it('is gone once it has no city, but what it was asked is delivered', () => {
    const state = requestPapalRepair(playing('carta'), 'carta', RIFLE)
    const fallen = { ...state, cityOwners: { ...state.cityOwners, [ASHDAR]: 'leonis' } }
    expect(papalRepairProblem(fallen, 'carta', BALLISTA)).toBe('法王府は滅んでいます')
    expect(item(runEconomy(fallen, 2), RIFLE)).toEqual({ id: RIFLE, relicId: 'rifle', repaired: true })
  })

  it('is told nothing by a capture: the relic asked for stays in the box', () => {
    const state = requestPapalRepair(playing('carta'), 'carta', RIFLE)
    expect(item({ ...state, cityOwners: { ...state.cityOwners, [FLUEN]: 'leonis' } }, RIFLE)).toMatchObject({ papalRepair: true })
  })
})

describe('a faction destroyed', () => {
  function fallen(relics: readonly RelicItem[]) {
    const start = withRelics(playing('leonis'), 'sede', relics)
    let state = addOrder(start, { factionId: 'leonis', from: ELDRAN, to: ASHDAR, commander: '038', knights: ['038'] })
    while (state.phase === 'strategy') state = endFactionTurn(state)
    state = startNextBattle(state)
    return { before: start, after: resolveBattle(state, state.march!.current!.id, 'attacker') }
  }

  it('gives its box to the faction that took its last city', () => {
    const relics: RelicItem[] = [{ id: 'a', relicId: 'rifle', repaired: false }, { id: 'b', relicId: 'grimoire', repaired: true }]
    const { before, after } = fallen(relics)
    expect(itemsOf(after, 'sede')).toEqual([])
    expect(itemsOf(after, 'leonis')).toEqual([...itemsOf(before, 'leonis'), ...relics])
  })

  it('hands over a relic 法王府 is repairing as it is: repaired a month later', () => {
    const asked: RelicItem = { id: 'a', relicId: 'rifle', repaired: false, papalRepair: true }
    const { after } = fallen([asked])
    expect(item(after, 'a', 'leonis')).toEqual(asked)
    expect(item(runEconomy(after, 2), 'a', 'leonis')).toEqual({ id: 'a', relicId: 'rifle', repaired: true })
  })
})

describe('what the screens ask', () => {
  it('gathers a relic\'s costs and why each cannot be done', () => {
    const state = playing('carta')
    expect(relicItemInfo(state, 'carta', FLUEN, RIFLE)).toMatchObject({
      dismantlePoints: 150, dismantleProblem: null, repair: { supplies: 400, gold: 150 }, repairProblem: '技術「ライフル」の研究が必要です',
      papalGold: papalRepairCost(state, 'carta', RELIC_MAP.rifle), papalProblem: null,
    })
    expect(relicItemInfo(state, 'carta', AMBARIA, BALLISTA)).toMatchObject({ repairProblem: '自勢力の都市ではありません' })
    expect(relicItemInfo(state, 'carta', FLUEN, 'nope')).toBeUndefined()
  })
})

it('puts research points into the technology researched, or 宙に浮いた', () => {
  const state = playing('carta')
  expect(addResearchPoints(state, 'carta', 40).research.carta).toMatchObject({ current: null, carry: 40 })
  expect(addResearchPoints(setResearch(state, 'carta', 'root'), 'carta', 40).research.carta).toMatchObject({ current: 'root', progress: { root: 40 } })
})
