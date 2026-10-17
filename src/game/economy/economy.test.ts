import { describe, expect, it, vi } from 'vitest'
import { BUILDING_MAP } from '../../data/buildings'
import { CHARACTER_MAP } from '../../data/character'
import { CITY_MAP } from '../../data/city'
import {
  addOrder, assign, assignmentOf, assignmentProblem, BALANCE, buildingBonus, buildingLocked, cancelConstruction, cityOutput, commandRank,
  connectedByOwnRoads, constructionProblem, constructionTurns, createInitialState, endFactionTurn, GameRuleError, governorBonus,
  governorOf, maxRecruit, MAX_MORALE, militaryBonus, recruit, recruitCost, recruitLeft, recruitProblem, runEconomy, slotsOf,
  soldiersLeft, startConstruction, startNextBattle, tierOf, transport, transportProblem, unassign,
  type CityState, type GameState,
} from '..'

// The tests' own buildings, so that they do not follow the game's data
vi.mock('../../data/buildingData.json', () => ({
  default: [
    { id: 'market', name: '市場', description: '', supplies: 300, gold: 100, effects: [{ kind: 'marketPct', value: 15 }] },
    { id: 'workshop', name: '工房', description: '', supplies: 400, gold: 120, effects: [{ kind: 'productionPct', value: 15 }] },
    { id: 'granary', name: '倉庫', description: '', supplies: 300, gold: 80, effects: [{ kind: 'growthPct', value: 20 }] },
    { id: 'barracks', name: '兵舎', description: '', supplies: 400, gold: 150, effects: [{ kind: 'recruitPct', value: 50 }] },
    { id: 'temple', name: '神殿', description: '', supplies: 500, gold: 180, effects: [{ kind: 'growthPct', value: 30 }] },
    { id: 'grand_market', name: '大市場', description: '', supplies: 600, gold: 200, upgradeFrom: 'market', effects: [{ kind: 'marketPct', value: 30 }] },
    { id: 'harbor', name: '港', description: '', supplies: 600, gold: 200, requiredTags: ['港', '港湾'], effects: [{ kind: 'marketPct', value: 20 }] },
    { id: 'reliquary', name: '聖遺物堂', description: '', supplies: 500, gold: 200, requiredRelic: '聖杯', effects: [] },
  ],
}))

const FLUEN = 'P012' // カルタ書院, 港湾
const SILVA = 'P026' // カルタ書院, joined to フルーエン by a road
const IGNIS = 'P014' // レオニス帝国, joined to シルヴァ
const AMBARIA = 'P004' // レオニス帝国

const scale = (value: number) => Math.max(0, (value - BALANCE.ABILITY_BASE) / (100 - BALANCE.ABILITY_BASE))

function withCity(state: GameState, cityId: string, change: Partial<CityState>): GameState {
  return { ...state, cities: { ...state.cities, [cityId]: { ...state.cities[cityId], ...change } } }
}

/** Runs the march phase with no orders, which runs the economy and starts the next turn */
function nextTurn(state: GameState): GameState {
  while (state.phase === 'strategy') state = endFactionTurn(state)
  return startNextBattle(state)
}

describe('city output', () => {
  it('derives the tier and the slots from the population', () => {
    const [tier2, tier3] = BALANCE.TIER_POPULATION
    expect(tierOf(tier2 - 1)).toBe(1)
    expect(tierOf(tier2)).toBe(2)
    expect(tierOf(tier3 - 1)).toBe(2)
    expect(tierOf(tier3)).toBe(3)
    expect([1, 2, 3].map((t) => slotsOf(t as 1 | 2 | 3))).toEqual([BALANCE.TIER_SLOTS[1], BALANCE.TIER_SLOTS[2], BALANCE.TIER_SLOTS[3]])
  })

  it('gives a governor bonuses from their abilities, none at ABILITY_BASE or below', () => {
    const marcus = CHARACTER_MAP['029'] // 政治 96・知力 90・魅力 89
    expect(governorBonus('029')).toEqual({
      market: scale(marcus.politics) * BALANCE.GOVERNOR_MAX_BONUS,
      production: scale((marcus.politics + marcus.intelligence) / 2) * BALANCE.GOVERNOR_MAX_BONUS,
      growth: scale(marcus.charm) * BALANCE.GOVERNOR_MAX_BONUS,
    })
    expect(governorBonus(undefined)).toEqual({ market: 0, production: 0, growth: 0 })
    // ミレイ (013) has 政治 19: no 商業 bonus, nothing below zero
    expect(governorBonus('013').market).toBe(0)
  })

  it('counts the best military officer fully and halves each one after', () => {
    const training = (id: string) => scale(CHARACTER_MAP[id].leadership) * BALANCE.MILITARY_MAX_TRAINING
    // ルカ (027, 統率 89) leads over エルヴィン (016, 統率 78), in whatever order they were assigned
    const expected = training('027') + training('016') * BALANCE.MILITARY_FALLOFF
    expect(militaryBonus(['016', '027']).training).toBeCloseTo(expected)
    expect(militaryBonus(['027', '016']).training).toBeCloseTo(expected)
    expect(militaryBonus([])).toEqual({ training: 0, recruit: 0 })
  })

  it('applies the governor and the buildings to 商業 and 生産', () => {
    let state = createInitialState('carta')
    const city = CITY_MAP[FLUEN]
    const governor = governorBonus('029')
    const market = BUILDING_MAP.market.effects.find((e) => e.kind === 'marketPct')!
    expect(cityOutput(state, FLUEN)).toMatchObject({
      baseMarket: city.market,
      market: Math.round(city.market * (1 + governor.market)),
      production: Math.round(city.production * (1 + governor.production)),
      income: Math.floor(Math.round(city.market * (1 + governor.market)) * BALANCE.GOLD_PER_MARKET),
    })
    state = withCity(state, FLUEN, { buildings: ['market'] })
    expect(buildingBonus(['market']).marketPct).toBeCloseTo((market as { value: number }).value / 100)
    expect(cityOutput(state, FLUEN).market).toBe(Math.round(city.market * (1 + governor.market + buildingBonus(['market']).marketPct)))
  })
})

describe('economy run', () => {
  it('runs between the march phase and the next turn, reporting each city before and after', () => {
    const start = createInitialState('carta')
    const state = nextTurn(start)
    expect(state.turn).toBe(2)
    expect(state.lastEconomy?.turn).toBe(2)
    const fluen = state.lastEconomy!.cities[FLUEN]
    expect(fluen.before.population).toBe(start.cities[FLUEN].population)
    expect(fluen.after.population).toBe(state.cities[FLUEN].population)
    expect(fluen.after.population).toBeGreaterThan(fluen.before.population)
  })

  it('adds the cities\' gold and pays the knights', () => {
    const state = createInitialState('carta')
    const income = ['P012', 'P026'].reduce((sum, id) => sum + cityOutput(state, id).income, 0)
    const knights = Object.values(state.characters).filter((c) => c.factionId === 'carta').length
    const next = runEconomy(state, 2)
    expect(next.lastEconomy!.factions.carta).toEqual({
      income, salary: knights * BALANCE.SALARY, before: BALANCE.INITIAL_GOLD, after: BALANCE.INITIAL_GOLD + income - knights * BALANCE.SALARY,
    })
    expect(next.gold.carta).toBe(BALANCE.INITIAL_GOLD + income - knights * BALANCE.SALARY)
  })

  it('pays salaries down to 0, not below', () => {
    let state = createInitialState('carta')
    state = { ...state, gold: { ...state.gold, carta: 0 }, cityOwners: { ...state.cityOwners, [FLUEN]: 'leonis', [SILVA]: 'leonis' } }
    expect(runEconomy(state, 2).gold.carta).toBe(0)
  })

  it('stores the city\'s 生産 when nothing is being built', () => {
    const state = createInitialState('carta')
    const next = runEconomy(state, 2)
    expect(next.cities[FLUEN].storedSupplies).toBe(state.cities[FLUEN].storedSupplies + cityOutput(state, FLUEN).production)
  })

  it('puts the 生産 into the construction, completes it and stores the surplus', () => {
    let state = startConstruction(createInitialState('carta'), FLUEN, 'workshop')
    const { production } = cityOutput(state, FLUEN)
    const stored = state.cities[FLUEN].storedSupplies
    state = runEconomy(state, 2)
    expect(state.cities[FLUEN].construction).toMatchObject({ buildingId: 'workshop', investedSupplies: production })
    expect(state.cities[FLUEN].storedSupplies).toBe(stored)

    const required = BUILDING_MAP.workshop.supplies
    state = withCity(state, FLUEN, { construction: { buildingId: 'workshop', requiredSupplies: required, investedSupplies: required - 10 } })
    state = runEconomy(state, 3)
    expect(state.cities[FLUEN].construction).toBeNull()
    expect(state.cities[FLUEN].buildings).toEqual(['workshop'])
    expect(state.cities[FLUEN].storedSupplies).toBe(stored + production - 10)
    expect(state.lastEconomy!.cities[FLUEN].events).toContainEqual({ kind: 'buildingCompleted', buildingId: 'workshop' })
    // The workshop counts from the next run
    expect(cityOutput(state, FLUEN).production).toBeGreaterThan(production)
  })

  it('trains the soldiers by themselves and by the military officers, up to MAX_MORALE', () => {
    let state = createInitialState('carta')
    const morale = state.cities[FLUEN].troopMorale
    expect(runEconomy(state, 2).cities[FLUEN].troopMorale).toBe(morale + BALANCE.NATURAL_TRAINING)
    state = assign(state, FLUEN, '027', 'military')
    const training = Math.round(BALANCE.NATURAL_TRAINING + militaryBonus(['027']).training)
    expect(cityOutput(state, FLUEN).training).toBe(training)
    expect(runEconomy(state, 2).cities[FLUEN].troopMorale).toBe(morale + training)
    expect(runEconomy(withCity(state, FLUEN, { troopMorale: MAX_MORALE }), 2).cities[FLUEN].troopMorale).toBe(MAX_MORALE)
    // No soldiers, nothing to train
    expect(runEconomy(withCity(state, FLUEN, { troops: 0 }), 2).cities[FLUEN].troopMorale).toBe(morale)
  })

  it('grows the population, slower in a larger city, and the tier with it', () => {
    const state = createInitialState('carta')
    const small = cityOutput(withCity(state, FLUEN, { population: 6000 }), FLUEN).growth
    const large = cityOutput(withCity(state, FLUEN, { population: 30000 }), FLUEN).growth
    expect(small / 6000).toBeGreaterThan(large / 30000)

    const [, tier3] = BALANCE.TIER_POPULATION
    const next = runEconomy(withCity(state, FLUEN, { population: tier3 - 1 }), 2)
    expect(next.cities[FLUEN].population).toBe(tier3 - 1 + cityOutput(withCity(state, FLUEN, { population: tier3 - 1 }), FLUEN).growth)
    expect(next.lastEconomy!.cities[FLUEN].events).toContainEqual({ kind: 'tierUp', tier: 3 })
    expect(next.lastEconomy!.cities[FLUEN].after.tier).toBe(3)
    expect(cityOutput(next, FLUEN).slots).toBe(BALANCE.TIER_SLOTS[3])
  })

  it('lets every city grow, the CPU factions\' too', () => {
    const state = createInitialState('carta')
    const next = runEconomy(state, 2)
    expect(next.cities[AMBARIA].population).toBeGreaterThan(state.cities[AMBARIA].population)
    expect(next.gold.leonis).not.toBe(state.gold.leonis)
  })
})

describe('assignments', () => {
  it('starts each city with its lord as the governor', () => {
    const state = createInitialState('carta')
    expect(state.cities[FLUEN].assignments).toEqual({ governor: '029', military: [] })
    expect(assignmentOf(state, '029')).toBe('governor')
    expect(assignmentOf(state, '015')).toBeNull()
  })

  it('assigns knights of the city, one assignment each', () => {
    let state = createInitialState('carta')
    state = assign(state, FLUEN, '016', 'military')
    state = assign(state, FLUEN, '027', 'military')
    expect(state.cities[FLUEN].assignments.military).toEqual(['016', '027'])
    // A new governor replaces the one before, and leaves the military
    state = assign(state, FLUEN, '016', 'governor')
    expect(state.cities[FLUEN].assignments).toEqual({ governor: '016', military: ['027'] })
    expect(assignmentOf(state, '029')).toBeNull()
    expect(commandRank(state, '016')).toBe(1)
    state = unassign(state, FLUEN, '016')
    expect(governorOf(state, FLUEN)).toBeUndefined()
    expect(unassign(state, FLUEN, '016')).toBe(state)
  })

  it('refuses assignments breaking the rules', () => {
    const state = createInitialState('carta')
    expect(assignmentProblem(state, FLUEN, '015', 'governor')).toBeNull()
    expect(assignmentProblem(state, FLUEN, '029', 'governor')).toBe('すでに代官です')
    expect(assignmentProblem(state, FLUEN, '013', 'military')).not.toBeNull() // アンバリア's knight
    expect(assignmentProblem(state, AMBARIA, '013', 'military')).toBe('自勢力の都市ではありません')
    expect(assignmentProblem(endFactionTurn(state), FLUEN, '015', 'military')).toBe('自勢力の都市ではありません')
    const ordered = addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015'] })
    expect(assignmentProblem(ordered, FLUEN, '015', 'military')).toBe('出撃予約中です')
    expect(() => assign(ordered, FLUEN, '015', 'military')).toThrow(GameRuleError)
  })
})

describe('construction', () => {
  it('pays the gold and starts building', () => {
    const state = startConstruction(createInitialState('carta'), FLUEN, 'market')
    expect(state.gold.carta).toBe(BALANCE.INITIAL_GOLD - BUILDING_MAP.market.gold)
    expect(state.cities[FLUEN].construction).toEqual({ buildingId: 'market', requiredSupplies: BUILDING_MAP.market.supplies, investedSupplies: 0 })
    expect(constructionTurns(state, FLUEN)).toBe(Math.ceil(BUILDING_MAP.market.supplies / cityOutput(state, FLUEN).production))
  })

  it('refuses buildings breaking the rules', () => {
    const state = createInitialState('carta')
    expect(constructionProblem(state, FLUEN, 'nope')).not.toBeNull()
    expect(constructionProblem(startConstruction(state, FLUEN, 'market'), FLUEN, 'workshop')).toBe('ほかの施設を建設中です')
    expect(constructionProblem(withCity(state, FLUEN, { buildings: ['market'] }), FLUEN, 'market')).toBe('すでに建っています')
    expect(constructionProblem(withCity(state, FLUEN, { buildings: ['market', 'workshop', 'granary', 'barracks'] }), FLUEN, 'temple'))
      .toBe('施設の空きがありません')
    expect(constructionProblem(state, FLUEN, 'harbor')).toBeNull() // フルーエン is a port
    expect(constructionProblem(state, SILVA, 'harbor')).toBe('港・港湾の都市で建てられます')
    expect(constructionProblem(state, FLUEN, 'reliquary')).toBe('遺物「聖杯」が必要です')
    expect(constructionProblem({ ...state, gold: { ...state.gold, carta: 0 } }, FLUEN, 'market')).toBe('金が足りません')
    expect(constructionProblem(state, AMBARIA, 'market')).toBe('自勢力の都市ではありません')
  })

  it('builds an upgrade over the building it replaces', () => {
    let state = createInitialState('carta')
    expect(constructionProblem(state, FLUEN, 'grand_market')).toBe('市場がある都市で建てられます')
    // No free slot is needed: it takes the market's
    state = withCity(state, FLUEN, { buildings: ['workshop', 'market', 'granary', 'barracks'] })
    expect(constructionProblem(state, FLUEN, 'grand_market')).toBeNull()
    state = startConstruction(state, FLUEN, 'grand_market')
    const required = BUILDING_MAP.grand_market.supplies
    state = withCity(state, FLUEN, { construction: { buildingId: 'grand_market', requiredSupplies: required, investedSupplies: required - 1 } })
    state = runEconomy(state, 2)
    expect(state.cities[FLUEN].buildings).toEqual(['workshop', 'grand_market', 'granary', 'barracks'])
    // The market cannot be built again beside its upgrade
    expect(constructionProblem(withCity(state, FLUEN, { buildings: ['grand_market'] }), FLUEN, 'market')).toBe('大市場が建っています')
  })

  it('locks the buildings the city cannot build at all yet, not those waiting for gold or a slot', () => {
    const state = withCity(createInitialState('carta'), FLUEN, { buildings: ['workshop'] })
    expect(buildingLocked(state, FLUEN, 'market')).toBe(false)
    expect(buildingLocked({ ...state, gold: { ...state.gold, carta: 0 } }, FLUEN, 'market')).toBe(false)
    expect(buildingLocked(state, FLUEN, 'harbor')).toBe(false) // フルーエン is a port
    expect(buildingLocked(state, SILVA, 'harbor')).toBe(true)
    expect(buildingLocked(state, FLUEN, 'reliquary')).toBe(true)
    expect(buildingLocked(state, FLUEN, 'grand_market')).toBe(true)
    expect(buildingLocked(withCity(state, FLUEN, { buildings: ['market'] }), FLUEN, 'grand_market')).toBe(false)
    expect(buildingLocked(withCity(state, FLUEN, { buildings: ['grand_market'] }), FLUEN, 'market')).toBe(true)
  })

  it('cancels the construction without giving anything back', () => {
    const started = startConstruction(createInitialState('carta'), FLUEN, 'market')
    const state = cancelConstruction(started, FLUEN)
    expect(state.cities[FLUEN].construction).toBeNull()
    expect(state.gold.carta).toBe(started.gold.carta)
  })
})

describe('recruiting', () => {
  it('adds soldiers for gold and lowers the morale by the recruits\'', () => {
    const state = createInitialState('carta')
    const { troops, troopMorale } = state.cities[FLUEN]
    const next = recruit(state, FLUEN, 200)
    expect(next.cities[FLUEN].troops).toBe(troops + 200)
    expect(next.cities[FLUEN].troopMorale).toBe(Math.round((troops * troopMorale + 200 * BALANCE.RECRUIT_MORALE) / (troops + 200)))
    expect(next.gold.carta).toBe(state.gold.carta - recruitCost(200))
    expect(recruitLeft(next, FLUEN)).toBe(cityOutput(state, FLUEN).recruitCap - 200)
    // A new turn recruits afresh
    expect(recruitLeft(nextTurn(next), FLUEN)).toBe(cityOutput(nextTurn(next), FLUEN).recruitCap)
  })

  it('limits a turn\'s recruits and the gold', () => {
    const state = createInitialState('carta')
    const cap = cityOutput(state, FLUEN).recruitCap
    const rich = { ...state, gold: { ...state.gold, carta: 100000 } }
    expect(recruitProblem(rich, FLUEN, cap)).toBeNull()
    expect(recruitProblem(rich, FLUEN, cap + 1)).toBe('このターンに募兵できる数を超えています')
    expect(recruitProblem(state, FLUEN, 0)).toBe('兵数を選んでください')
    const poor = { ...state, gold: { ...state.gold, carta: 10 } }
    expect(maxRecruit(poor, FLUEN)).toBe(Math.floor(10 / BALANCE.RECRUIT_GOLD))
    expect(recruitCost(maxRecruit(poor, FLUEN))).toBeLessThanOrEqual(10)
    expect(recruitProblem(poor, FLUEN, maxRecruit(poor, FLUEN) + 10)).toBe('金が足りません')
  })
})

describe('transport', () => {
  it('moves soldiers and supplies to a city joined by the faction\'s own roads', () => {
    const state = createInitialState('carta')
    const from = state.cities[FLUEN]
    const to = state.cities[SILVA]
    const next = transport(state, FLUEN, SILVA, { troops: 300, supplies: 100 })
    expect(next.cities[FLUEN]).toMatchObject({ troops: from.troops - 300, storedSupplies: from.storedSupplies - 100 })
    expect(next.cities[SILVA]).toMatchObject({ troops: to.troops + 300, storedSupplies: to.storedSupplies + 100 })
  })

  it('mixes the morale of the soldiers', () => {
    let state = createInitialState('carta')
    state = withCity(withCity(state, FLUEN, { troopMorale: 90 }), SILVA, { troops: 100, troopMorale: 30 })
    expect(transport(state, FLUEN, SILVA, { troops: 300 }).cities[SILVA].troopMorale).toBe(Math.round((100 * 30 + 300 * 90) / 400))
  })

  it('refuses transports breaking the rules', () => {
    const state = createInitialState('carta')
    expect(transportProblem(state, FLUEN, AMBARIA, { troops: 10 })).toBe('輸送先が自勢力の都市ではありません')
    expect(transportProblem(state, FLUEN, FLUEN, { troops: 10 })).toBe('同じ都市です')
    expect(transportProblem(state, FLUEN, SILVA, {})).toBe('輸送するものを選んでください')
    expect(transportProblem(state, FLUEN, SILVA, { supplies: state.cities[FLUEN].storedSupplies + 1 })).toBe('物資が足りません')
    expect(transportProblem(state, FLUEN, SILVA, { troops: soldiersLeft(state, FLUEN) + 1 })).toBe('兵が足りません')
    // イグニス joins フルーエン through シルヴァ only while シルヴァ is カルタ書院's too
    const ignis = { ...state, cityOwners: { ...state.cityOwners, [IGNIS]: 'carta' } }
    expect(connectedByOwnRoads(ignis, 'carta', FLUEN, IGNIS)).toBe(true)
    const cut = { ...ignis, cityOwners: { ...ignis.cityOwners, [SILVA]: 'leonis' } }
    expect(connectedByOwnRoads(cut, 'carta', FLUEN, IGNIS)).toBe(false)
    expect(transportProblem(cut, FLUEN, IGNIS, { troops: 10 })).toBe('自勢力の街道でつながっていません')
  })
})
