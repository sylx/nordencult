import { describe, expect, it, vi } from 'vitest'
import {
  affairsGain, assign, BALANCE, buildingLocked, buildingProblem, chooseResearchForCpu, cityOutput, endFactionTurn, endFactionTurnProblem, GameRuleError,
  mustChooseResearch, officerAbility, researchOutput, researchProblem, researchTurns, runEconomy, setAffairsBudget, setResearch, startNextBattle,
  techBonus, techStatus,
  type CityState, type FactionResearch, type GameState,
} from '..'
import { playing } from '../testing'

// The tests' own technologies and buildings, so that they do not follow the game's data
vi.mock('../../data/techData.json', () => ({
  default: [
    { id: 'phys', name: '物理', description: '', branch: 'physical', cost: 100, requires: [], effects: [{ kind: 'productionPct', value: 10 }] },
    { id: 'arc', name: '魔法', description: '', branch: 'arcane', cost: 100, requires: [], effects: [{ kind: 'marketPct', value: 10 }] },
    { id: 'p1', name: '兵法', description: '', branch: 'physical', cost: 200, requires: ['phys'], effects: [{ kind: 'recruitMorale', value: 5 }] },
    { id: 'p2', name: '籠城', description: '', cost: 300, requires: ['p1'], effects: [{ kind: 'etc', value: '迎撃 +5%' }] },
    { id: 'a1', name: '火', description: '', branch: 'arcane', cost: 50, requires: ['arc'], effects: [] },
    { id: 'both', name: '飛空艇', description: '', branch: 'physical', cost: 400, requires: ['p1', 'a1'], effects: [] },
  ],
}))
vi.mock('../../data/buildingData.json', () => ({
  default: [
    { id: 'library', name: '図書館', description: '', supplies: 300, gold: 100, effects: [{ kind: 'researchPoints', value: 5, branch: 'physical' }] },
    { id: 'tower', name: '魔術師の塔', description: '', supplies: 300, gold: 100, effects: [{ kind: 'researchPoints', value: 10, branch: 'arcane' }] },
    { id: 'archive', name: '大図書館', description: '', supplies: 300, gold: 100, requiredTech: 'p1', effects: [] },
  ],
}))

const FLUEN = 'P012' // カルタ書院
const SILVA = 'P026' // カルタ書院
const AMBARIA = 'P004' // レオニス帝国

function withCity(state: GameState, cityId: string, change: Partial<CityState>): GameState {
  return { ...state, cities: { ...state.cities, [cityId]: { ...state.cities[cityId], ...change } } }
}

function withResearch(state: GameState, factionId: string, change: Partial<FactionResearch>): GameState {
  return { ...state, research: { ...state.research, [factionId]: { ...state.research[factionId], ...change } } }
}

/** Every roll the lowest: the officers spend AFFAIRS_BUDGET_MIN, a fraction is always rounded up */
const low = () => 0

describe('the technology tree', () => {
  it('shows the roots as available, their children by name and the rest as ???', () => {
    let state = playing('carta')
    expect(techStatus(state, 'carta', 'phys')).toBe('available')
    expect(techStatus(state, 'carta', 'p1')).toBe('hidden')
    state = withResearch(state, 'carta', { researched: ['phys'] })
    expect(techStatus(state, 'carta', 'phys')).toBe('researched')
    expect(techStatus(state, 'carta', 'p1')).toBe('available')
    expect(techStatus(state, 'carta', 'p2')).toBe('hidden')
    // One of the two it needs researched: seen, not available
    state = withResearch(state, 'carta', { researched: ['phys', 'p1'] })
    expect(techStatus(state, 'carta', 'both')).toBe('visible')
    expect(researchProblem(state, 'carta', 'both')).toBe('前提の技術（火）が要ります')
    expect(researchProblem(state, 'carta', 'p1')).toBe('すでに研究し終えています')
    expect(researchProblem(state, 'carta', 'p2')).toBeNull()
  })

  it('researches only what it can, in its own turn', () => {
    const state = playing('carta')
    expect(() => setResearch(state, 'carta', 'p1')).toThrow(GameRuleError)
    expect(() => setResearch(state, 'leonis', 'phys')).toThrow('手番ではありません')
    expect(setResearch(state, 'carta', 'phys').research.carta.current).toBe('phys')
  })
})

describe('research points', () => {
  it('sums the research buildings of the faction\'s cities, those of the branch researched with the bonus', () => {
    let state = withCity(withCity(playing('carta'), FLUEN, { buildings: ['library'] }), SILVA, { buildings: ['tower'] })
    expect(researchOutput(state, 'carta')).toMatchObject({ branches: { physical: 5, arcane: 10 }, buildings: 15, officers: [0, 0], total: [15, 15] })
    state = setResearch(state, 'carta', 'phys')
    const physical = 5 * (1 + BALANCE.RESEARCH_BRANCH_BONUS) + 10
    expect(researchOutput(state, 'carta').buildings).toBeCloseTo(physical)
    expect(researchOutput(state, 'carta', 'arc').buildings).toBeCloseTo(5 + 10 * (1 + BALANCE.RESEARCH_BRANCH_BONUS))
    // A technology of no branch: no building's points are worth more
    expect(researchOutput(state, 'carta', 'p2').buildings).toBe(15)
    // The fraction rounded up by that chance
    expect(runEconomy(state, 2, () => 0.99).research.carta.progress.phys).toBe(Math.floor(physical))
    expect(runEconomy(state, 2, low).research.carta.progress.phys).toBe(Math.ceil(physical))
    expect(runEconomy(state, 2, low).lastEconomy!.research.carta).toEqual({
      buildings: Math.ceil(physical), officers: 0, total: Math.ceil(physical), techId: 'phys', completed: null,
    })
  })

  it('gets the 研究 officers\' points for gold of the city\'s budget, by their 知力', () => {
    let state = assign(playing('carta'), FLUEN, '015', 'research')
    expect(researchOutput(state, 'carta').total).toEqual([0, 0]) // no budget
    state = setAffairsBudget(state, FLUEN, 'research', 500)
    const power = officerAbility('015', 'research')
    expect(researchOutput(state, 'carta').officers).toEqual([
      affairsGain('research', power, BALANCE.AFFAIRS_BUDGET_MIN, 0, () => 1), affairsGain('research', power, BALANCE.AFFAIRS_BUDGET_MAX, 0, () => 0),
    ])
    const next = runEconomy(state, 2, low)
    const points = affairsGain('research', power, BALANCE.AFFAIRS_BUDGET_MIN, 0, low)
    expect(next.cities[FLUEN].affairsBudget.research).toBe(500 - BALANCE.AFFAIRS_BUDGET_MIN)
    expect(next.lastEconomy!.cities[FLUEN].affairs.research).toEqual({ spent: BALANCE.AFFAIRS_BUDGET_MIN, gain: points })
    expect(next.lastEconomy!.research.carta).toMatchObject({ officers: points, total: points, techId: null })
  })

  it('makes no points in a neutral city, nor in another faction\'s', () => {
    const state = withCity(playing('carta'), AMBARIA, { buildings: ['library'] })
    expect(researchOutput(state, 'carta').total).toEqual([0, 0])
    expect(researchOutput(state, 'leonis').total).toEqual([5, 5])
  })
})

describe('putting the points in', () => {
  const withLibrary = () => withCity(playing('carta'), FLUEN, { buildings: ['library'] })

  it('keeps the points of a turn researching nothing until something is chosen, and asks for it', () => {
    let state = runEconomy(withLibrary(), 2, low)
    expect(state.research.carta).toMatchObject({ current: null, carry: 5 })
    expect(mustChooseResearch(state, 'carta')).toBe(true)
    expect(endFactionTurnProblem(state)).toBe('研究先を選んでください')
    expect(() => endFactionTurn(state)).toThrow(GameRuleError)
    state = setResearch(state, 'carta', 'arc')
    expect(state.research.carta).toMatchObject({ current: 'arc', carry: 0, progress: { arc: 5 } })
    expect(mustChooseResearch(state, 'carta')).toBe(false)
    expect(endFactionTurnProblem(state)).toBeNull()
  })

  it('does not ask on turn 1, with no points yet', () => {
    const state = playing('carta')
    expect(mustChooseResearch(state, 'carta')).toBe(false)
    expect(endFactionTurnProblem(state)).toBeNull()
  })

  it('completes a technology reaching its cost, the surplus 宙に浮いた for the next', () => {
    let state = withResearch(withLibrary(), 'carta', { current: 'phys', progress: { phys: 95 } })
    const points = Math.ceil(5 * (1 + BALANCE.RESEARCH_BRANCH_BONUS))
    expect(researchTurns(state, 'carta')).toBe(1)
    state = runEconomy(state, 2, low)
    expect(state.research.carta).toEqual({ current: null, progress: { phys: 100 }, researched: ['phys'], carry: 95 + points - 100 })
    expect(state.lastEconomy!.research.carta.completed).toBe('phys')
    expect(state.events).toContainEqual(expect.objectContaining({ kind: 'techCompleted', factionId: 'carta', techId: 'phys', turn: 2 }))
    expect(mustChooseResearch(state, 'carta')).toBe(true)
    state = setResearch(state, 'carta', 'p1')
    expect(state.research.carta.progress.p1).toBe(95 + points - 100)
  })

  it('completes the technology chosen as soon as the points 宙に浮いた reach its cost, the rest for the next', () => {
    let state = withResearch(playing('carta'), 'carta', { carry: 130 })
    expect(researchTurns(state, 'carta', 'phys')).toBe(0)
    state = setResearch(state, 'carta', 'phys')
    expect(state.research.carta).toEqual({ current: null, progress: { phys: 100 }, researched: ['phys'], carry: 30 })
    expect(state.events).toContainEqual(expect.objectContaining({ kind: 'techCompleted', factionId: 'carta', techId: 'phys', turn: state.turn }))
    expect(mustChooseResearch(state, 'carta')).toBe(true)
    state = setResearch(state, 'carta', 'p1')
    expect(state.research.carta).toMatchObject({ current: 'p1', progress: { p1: 30 }, carry: 0 })
    expect(mustChooseResearch(state, 'carta')).toBe(false)
  })

  it('loses what is left over completing the last technology, asking for nothing more', () => {
    let state = withResearch(playing('carta'), 'carta', { carry: 500, researched: ['phys', 'arc', 'p1', 'p2', 'a1'] })
    state = setResearch(state, 'carta', 'both')
    expect(state.research.carta).toMatchObject({ current: null, carry: 0 })
    expect(state.research.carta.researched).toHaveLength(6)
    expect(mustChooseResearch(state, 'carta')).toBe(false)
    expect(endFactionTurnProblem(state)).toBeNull()
  })

  it('keeps each technology\'s progress when the research changes', () => {
    let state = setResearch(withLibrary(), 'carta', 'phys')
    state = runEconomy(state, 2, low)
    const phys = state.research.carta.progress.phys
    state = setResearch(state, 'carta', 'arc')
    state = runEconomy(state, 3, low)
    expect(state.research.carta.progress).toEqual({ phys, arc: 5 })
    state = setResearch(state, 'carta', 'phys')
    expect(state.research.carta.progress.phys).toBe(phys)
  })

  it('loses the points with nothing left to research', () => {
    let state = withResearch(withLibrary(), 'carta', { current: 'both', progress: { both: 399 }, researched: ['phys', 'arc', 'p1', 'p2', 'a1'] })
    state = runEconomy(state, 2, low)
    expect(state.research.carta).toMatchObject({ current: null, carry: 0 })
    expect(state.research.carta.researched).toHaveLength(6)
    state = runEconomy(state, 3, low)
    expect(state.research.carta.carry).toBe(0)
    expect(mustChooseResearch(state, 'carta')).toBe(false)
  })

  it('counts the turns to complete at the points a turn, none without points', () => {
    expect(researchTurns(playing('carta'), 'carta', 'phys')).toBeNull()
    const state = withLibrary()
    expect(researchTurns(state, 'carta', 'phys')).toBe(Math.ceil(100 / (5 * (1 + BALANCE.RESEARCH_BRANCH_BONUS))))
    expect(researchTurns(state, 'carta', 'arc')).toBe(100 / 5)
    expect(researchTurns(withResearch(state, 'carta', { researched: ['phys'] }), 'carta', 'phys')).toBe(0)
  })
})

describe('what the technologies do', () => {
  it('adds the effects of the technologies researched to every city of the faction', () => {
    const state = playing('carta')
    const researched = withResearch(state, 'carta', { researched: ['phys', 'p1'] })
    expect(techBonus(researched, 'carta')).toMatchObject({ productionPct: 0.1, recruitMorale: 5 })
    for (const id of [FLUEN, SILVA]) {
      const before = cityOutput(state, id)
      const after = cityOutput(researched, id)
      expect(after.production).toBe(Math.round(before.baseProduction * (1 + before.governor.production + 0.1)))
      expect(after.recruitMorale).toBe(before.recruitMorale + 5)
    }
    // Not another faction's
    expect(cityOutput(researched, AMBARIA)).toEqual(cityOutput(state, AMBARIA))
  })

  it('counts from the next economy run once completed', () => {
    const state = withResearch(withCity(playing('carta'), FLUEN, { buildings: ['library'] }), 'carta', { current: 'phys', progress: { phys: 99 } })
    const next = runEconomy(state, 2, low)
    // The run that completed it went at the 生産 before; the new turn's numbers have it
    expect(next.lastEconomy!.cities[FLUEN].before.production).toBe(cityOutput(state, FLUEN).production)
    expect(next.lastEconomy!.cities[FLUEN].after.production).toBe(cityOutput(next, FLUEN).production)
    expect(cityOutput(next, FLUEN).tech.productionPct).toBeCloseTo(0.1)
  })

  it('lets a building needing a technology be built once it is researched', () => {
    const state = playing('carta')
    expect(buildingProblem(state, FLUEN, 'archive')).toBe('技術「兵法」の研究が必要です')
    expect(buildingLocked(state, FLUEN, 'archive')).toBe(true)
    const researched = withResearch(state, 'carta', { researched: ['phys', 'p1'] })
    expect(buildingProblem(researched, FLUEN, 'archive')).toBeNull()
    expect(buildingLocked(researched, FLUEN, 'archive')).toBe(false)
  })
})

describe('the CPU factions', () => {
  it('choose the technology taking the fewest points, the first in data order of the same', () => {
    let state = playing('carta')
    expect(chooseResearchForCpu(state, 'leonis')).toBe('phys')
    state = withResearch(state, 'leonis', { researched: ['arc'] })
    expect(chooseResearchForCpu(state, 'leonis')).toBe('a1')
  })

  it('research on their own, choosing the next once one is completed', () => {
    let state = withCity(playing('carta'), AMBARIA, { buildings: ['library'] })
    state = runEconomy(state, 2, low)
    // The first run chose it after the points went into carry: they went in with it
    expect(state.research.leonis).toMatchObject({ current: 'phys', carry: 0, progress: { phys: 5 } })
    state = withResearch(state, 'leonis', { progress: { phys: 99 } })
    state = runEconomy(state, 3, low)
    expect(state.research.leonis.researched).toEqual(['phys'])
    expect(state.research.leonis.current).toBe('arc')
    expect(state.research.leonis.progress.arc).toBe(99 + Math.ceil(5 * (1 + BALANCE.RESEARCH_BRANCH_BONUS)) - 100)
    // Not told to the player
    expect(state.events).toEqual([])
  })

  it('go on choosing while the points 宙に浮いた complete what they choose', () => {
    let state = withResearch(playing('carta'), 'leonis', { carry: 260 })
    state = runEconomy(state, 2, low)
    // 物理 (100), 魔法 (100) and 火 (50) completed by them, 兵法 chosen with the 10 left
    expect(state.research.leonis).toMatchObject({ current: 'p1', researched: ['phys', 'arc', 'a1'], carry: 0, progress: { p1: 10 } })
  })

  it('end their turns with points 宙に浮いた (only the player chooses)', () => {
    let state = withCity(playing('carta'), FLUEN, { buildings: ['library'] })
    state = withResearch(state, 'leonis', { carry: 10 })
    state = setResearch(state, 'carta', 'phys')
    while (state.phase === 'strategy') state = endFactionTurn(state)
    expect(startNextBattle(state).turn).toBe(2)
  })
})
