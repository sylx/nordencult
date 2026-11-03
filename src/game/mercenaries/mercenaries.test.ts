import { afterEach, describe, expect, it } from 'vitest'
import { CHARACTER_MAP } from '../../data/character'
import {
  addMoveOrder, addOrder, addTransportOrder, assignmentProblem, availableKnights, BALANCE, charactersIn, citiesOf, contractPrice, createInitialState,
  decideRenewal, defaultUnitType, defenderArmy, defenseKnights, defenseProblem, dismissMercenary, dismissProblem, endFactionTurn,
  finishEntry, formDefense, hireMercenary, hireOfferProblem, hireProblem, hiredMercenaries, invadeFromProblem, isRecovering, leadingKnight, MAX_SOLDIERS, mercenaryFees, mercenaryMarket,
  mercenaryRank, mercenaryReach, moveOrderProblem, neighbours, orderProblem, prideProblem, rejoinCity, renewalPrice, renewalProblem, resolveBattle, runEconomy, runMovements, runRoaming,
  soldiersLeft, startNextBattle, successorLord, transportOrderProblem, treasuryForecast, unitTypesOf,
  type ArmyUnit, type BattleSurvivor, type GameState, type Movement,
} from '..'
import { playing } from '../testing'

const FLUEN = 'P012'
const AMBARIA = 'P004'
const VERSTA = 'P005'
const SILVA = 'P026'
/** ドゥンダリン盾隊 (knight, 2000 gold, 600 soldiers, pride 2) starts in フルーエン */
const BARREL = '042'
/** シルバーファング (hunter, 3000 gold, 1000 soldiers, pride 3) */
const IRON = '028'
/** ランツクネヒト (pride 5, 10000 gold) */
const LANDSKNECHT = '110'
const MAX = CHARACTER_MAP[BARREL].mercenaryInfo!.maxSoldiers

const at = (state: GameState, id: string, city: string): GameState =>
  ({ ...state, characters: { ...state.characters, [id]: { ...state.characters[id], roaming: city } } })
const withGold = (state: GameState, gold: number, factionId = 'carta'): GameState => ({ ...state, gold: { ...state.gold, [factionId]: gold } })
const withStanding = (state: GameState, standing: number, factionId = 'carta'): GameState =>
  ({ ...state, mercenaryStanding: { ...state.mercenaryStanding, [factionId]: standing } })
const withSoldiers = (state: GameState, id: string, soldiers: number): GameState =>
  ({ ...state, mercenaries: { ...state.mercenaries, [id]: { ...state.mercenaries[id], soldiers } } })
const withBuildings = (state: GameState, city: string, buildings: string[]): GameState =>
  ({ ...state, cities: { ...state.cities, [city]: { ...state.cities[city], buildings } } })

/** カルタ書院 with 樽盾団 hired in フルーエン and gold to spare */
const hired = (id = BARREL): GameState => hireMercenary(at(withGold(playing('carta'), 100000), id, FLUEN), FLUEN, id)

function endStrategyPhase(state: GameState): GameState {
  while (state.phase === 'strategy') state = endFactionTurn(state)
  return state
}

const unitOf = (state: GameState, id: string): ArmyUnit => ({ knightId: id, unitType: defaultUnitType(id), soldiers: state.mercenaries[id].soldiers })
const knightUnit = (id: string, soldiers: number): ArmyUnit => ({ knightId: id, unitType: defaultUnitType(id), soldiers })

/** 015 and the mercenary marching on アンバリア from フルーエン: the battle is under way */
function invading(state = hired(), id = BARREL): GameState {
  const ordered = addOrder(state, {
    factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', id], units: [knightUnit('015', 200), unitOf(state, id)],
  })
  return startNextBattle(endStrategyPhase(ordered))
}
const battleId = (state: GameState) => state.march!.current!.id

/** The city with no lord or soldiers: the next battle there is undefended */
const lordless = (state: GameState, city: string): GameState =>
  ({ ...state, cities: { ...state.cities, [city]: { ...state.cities[city], assignments: { officers: {} } } } })

/** レオニス帝国 (played too, it plays first) marches on フルーエン, where カルタ書院 hired 樽盾団 */
function leonisAttacks(start = playing('leonis', 'carta')): GameState {
  let state = addOrder(start, { factionId: 'leonis', from: AMBARIA, to: FLUEN, commander: '013', knights: ['013'] })
  while (state.activeFaction !== 'carta') state = endFactionTurn(state)
  state = hireMercenary(at(withGold(state, 100000), BARREL, FLUEN), FLUEN, BARREL)
  return startNextBattle(endStrategyPhase(state))
}

describe('the market', () => {
  it('reaches the city and the cities next to it, none further', () => {
    const state = playing('carta')
    const next = neighbours(FLUEN)[0]
    const far = neighbours(next).find((id) => id !== FLUEN && !neighbours(FLUEN).includes(id))!
    expect(mercenaryMarket(at(state, IRON, next), FLUEN)).toContain(IRON)
    expect(mercenaryMarket(at(state, IRON, far), FLUEN)).not.toContain(IRON)
    expect(mercenaryMarket(state, FLUEN)).toContain(BARREL)
  })

  it('reaches further with a 酒場 of the city and everywhere with a 傭兵ギルド', () => {
    const next = neighbours(FLUEN)[0]
    const far = neighbours(next).find((id) => id !== FLUEN && !neighbours(FLUEN).includes(id))!
    const state = at(playing('carta'), IRON, far)
    const tavern = withBuildings(state, FLUEN, ['tavern'])
    expect(mercenaryReach(tavern, FLUEN)).toBe(2)
    expect(mercenaryMarket(tavern, FLUEN)).toContain(IRON)
    // Only the city's own buildings count
    expect(mercenaryMarket(withBuildings(state, SILVA, ['tavern']), FLUEN)).not.toContain(IRON)
    const guild = withBuildings(state, FLUEN, ['guild'])
    expect(mercenaryReach(guild, FLUEN)).toBe(Infinity)
    expect(mercenaryMarket(guild, FLUEN)).toHaveLength(14)
  })

  it('leaves out those hired and those recovering, and tells why', () => {
    const state = hired()
    expect(mercenaryMarket(state, FLUEN)).not.toContain(BARREL)
    const short = withSoldiers(at(playing('carta'), BARREL, FLUEN), BARREL, 400)
    expect(isRecovering(short, BARREL)).toBe(true)
    expect(mercenaryMarket(short, FLUEN)).not.toContain(BARREL)
    expect(hireProblem(short, FLUEN, BARREL)).toBe('回復中です')
  })
})

describe('hiring', () => {
  it('pays the fee at once, and the mercenary serves in the city from this turn', () => {
    const start = at(withGold(playing('carta'), 3000), BARREL, neighbours(FLUEN)[0])
    const state = hireMercenary(start, FLUEN, BARREL)
    expect(state.gold.carta).toBe(1000)
    expect(state.characters[BARREL]).toEqual({ cityId: FLUEN, factionId: 'carta' })
    expect(charactersIn(state, FLUEN)).toContain(BARREL)
    expect(availableKnights(state, FLUEN)).toContain(BARREL)
    expect(state.mercenaries[BARREL]).toEqual({ soldiers: MAX, contract: { monthly: 334, since: 1 } })
    expect(state.mercenaryStanding.carta).toBe(BALANCE.STANDING_HIRE)
  })

  it('hires those in the cities of enemies alike', () => {
    const state = at(withGold(playing('carta'), 3000), BARREL, AMBARIA)
    expect(state.cityOwners[AMBARIA]).toBe('leonis')
    expect(hireProblem(state, FLUEN, BARREL)).toBeNull()
  })

  it('needs the gold, and only the active faction in a city of its own', () => {
    const state = withGold(playing('carta'), 1999)
    expect(hireProblem(state, FLUEN, BARREL)).toBe('金が足りません')
    expect(() => hireMercenary(state, FLUEN, BARREL)).toThrow()
    expect(hireProblem(withGold(state, 2000), AMBARIA, BARREL)).toBe('自勢力の都市ではありません')
    expect(hireProblem(withGold(state, 2000), FLUEN, '015')).toBe('015 は傭兵ではありません')
  })

  it('does not get the proud to sign however much gold there is, nor tells the standing it takes', () => {
    const state = at(withGold(playing('carta'), 100000), LANDSKNECHT, FLUEN)
    expect(hireProblem(state, FLUEN, LANDSKNECHT)).toBe('ランツクネヒトは我々との契約に応じません')
    expect(hireProblem(withStanding(state, 59), FLUEN, LANDSKNECHT)).not.toBeNull()
    expect(hireProblem(withStanding(state, 60), FLUEN, LANDSKNECHT)).toBeNull()
    // プライド 3 does not sign at the standing a faction starts with, and signs from 20
    expect(hireProblem(at(state, IRON, FLUEN), FLUEN, IRON)).toBe('シルバーファングは我々との契約に応じません')
    expect(hireProblem(withStanding(at(state, IRON, FLUEN), 19), FLUEN, IRON)).not.toBeNull()
    expect(hireProblem(withStanding(at(state, IRON, FLUEN), 20), FLUEN, IRON)).toBeNull()
    // プライド 2 signs from 0
    expect(hireProblem(at(state, BARREL, FLUEN), FLUEN, BARREL)).toBeNull()
    expect(hireProblem(withStanding(at(state, BARREL, FLUEN), -1), FLUEN, BARREL)).not.toBeNull()
    // They can still be talked to: the hiring scene turns the faction away
    expect(hireOfferProblem(state, FLUEN, LANDSKNECHT)).toBeNull()
    expect(prideProblem(state, 'carta', LANDSKNECHT)).toBe('ランツクネヒトは我々との契約に応じません')
  })

  it('ranks them by the 契約金, whatever the standing', () => {
    expect(mercenaryRank(LANDSKNECHT)).toBe('S') // 10000
    expect(mercenaryRank('109')).toBe('A') // 5000
    expect(mercenaryRank(IRON)).toBe('B') // 3000
    expect(mercenaryRank('095')).toBe('D') // 1000
  })

  it('changes the price with the standing, by the pride', () => {
    const state = playing('carta')
    expect(contractPrice(withStanding(state, 40), 'carta', LANDSKNECHT)).toEqual({ fee: 8000, monthly: 1334 })
    expect(contractPrice(withStanding(state, -50), 'carta', LANDSKNECHT).fee).toBe(12500)
    expect(renewalPrice(withStanding(state, 40), 'carta', LANDSKNECHT)).toBe(4000)
    expect(contractPrice(state, 'carta', BARREL)).toEqual({ fee: 2000, monthly: 334 })
  })

  it('keeps the monthly fee of the contract whatever the standing does afterwards', () => {
    const state = withStanding(hired(), 100)
    expect(state.mercenaries[BARREL].contract!.monthly).toBe(334)
    expect(mercenaryFees(state, 'carta', 1000)).toEqual({ paid: 334, unpaid: [] })
  })
})

describe('the monthly fee', () => {
  it('is paid from the next economy run, shown in the forecast, on top of the salaries', () => {
    const state = hired()
    const forecast = treasuryForecast(state, 'carta')
    expect(forecast.mercenaryFees).toBe(334)
    expect(forecast.after).toBe(forecast.before + forecast.income - forecast.salary - 334)
    const next = runEconomy(state, 2)
    expect(next.gold.carta).toBe(forecast.after)
    expect(next.lastEconomy!.factions.carta.mercenaryFees).toBe(334)
  })

  it('pays those it can in id order, those after one it cannot too', () => {
    // プライド 3 signs at a standing of 20
    let state = hireMercenary(withStanding(at(hired(), IRON, FLUEN), 20), FLUEN, IRON)
    state = { ...state, mercenaries: { ...state.mercenaries, [IRON]: { ...state.mercenaries[IRON], contract: { monthly: 500, since: 1 } } } }
    // 028 comes first, then 042
    expect(hiredMercenaries(state, 'carta')).toEqual([IRON, BARREL])
    expect(mercenaryFees(state, 'carta', 400)).toEqual({ paid: 334, unpaid: [IRON] })
  })

  it('ends the contract of one not paid and tells the player, the market having them back', () => {
    const state = withGold(hired(), 0)
    const broke = { ...state, cityOwners: Object.fromEntries(Object.entries(state.cityOwners).filter(([, f]) => f !== 'carta')) }
    const next = runEconomy({ ...broke, activeFaction: null, phase: 'march' }, 2)
    expect(next.mercenaries[BARREL].contract).toBeNull()
    expect(next.characters[BARREL]).toEqual({ cityId: null, factionId: null, roaming: FLUEN })
    expect(next.events).toContainEqual(expect.objectContaining({ kind: 'mercenaryUnpaid', factionId: 'carta', characterId: BARREL }))
  })

  it('does not pay mercenaries a salary', () => {
    const before = treasuryForecast(playing('carta'), 'carta')
    expect(treasuryForecast(hired(), 'carta').salary).toBe(before.salary)
  })
})

describe('recovering', () => {
  it('gets back a tenth of the most soldiers each economy run, hired or not', () => {
    const state = withSoldiers(withSoldiers(hired(), BARREL, 100), IRON, 100)
    const next = runEconomy(state, 2)
    // A tenth of 600, and of 1000
    expect(next.mercenaries[BARREL].soldiers).toBe(160)
    expect(next.mercenaries[IRON].soldiers).toBe(200)
    const full = runEconomy(withSoldiers(state, BARREL, MAX - 1), 2)
    expect(full.mercenaries[BARREL].soldiers).toBe(MAX)
  })

  it('comes back to the market once recovered', () => {
    let state = withSoldiers(at(playing('carta'), BARREL, FLUEN), BARREL, MAX - 50)
    expect(mercenaryMarket(state, FLUEN)).not.toContain(BARREL)
    state = runEconomy(state, 2)
    expect(state.mercenaries[BARREL].soldiers).toBe(MAX)
    expect(mercenaryMarket(state, FLUEN)).toContain(BARREL)
  })
})

describe('the standing', () => {
  it('rises by the 酒場 and 傭兵ギルド of the faction in each economy run', () => {
    const state = withBuildings(withBuildings(playing('carta'), FLUEN, ['tavern']), SILVA, ['guild'])
    expect(runEconomy(state, 2).mercenaryStanding.carta).toBe(BALANCE.STANDING_TAVERN + BALANCE.STANDING_GUILD)
  })

  it('stays within its limits', () => {
    const state = withBuildings(withStanding(playing('carta'), 100), FLUEN, ['guild'])
    expect(runEconomy(state, 2).mercenaryStanding.carta).toBe(100)
  })
})

describe('the renewal fee', () => {
  const always = () => 0
  const never = () => 0.99

  it('is not asked for in the first months', () => {
    const state = runEconomy(hired(), 6, always)
    expect(state.events.filter((e) => e.kind === 'mercenaryRenewal')).toEqual([])
  })

  it('is asked for from then on, at a chance', () => {
    expect(runEconomy(hired(), 7, never).events.filter((e) => e.kind === 'mercenaryRenewal')).toEqual([])
    const asked = runEconomy(hired(), 7, always)
    expect(asked.events).toContainEqual(expect.objectContaining({ kind: 'mercenaryRenewal', factionId: 'carta', characterId: BARREL, gold: renewalPrice(asked, 'carta', BARREL) }))
  })

  it('renewing pays it and starts the months over', () => {
    const asked = runEconomy(hired(), 7, always)
    const event = asked.events.find((e) => e.kind === 'mercenaryRenewal')!
    const renewed = decideRenewal({ ...asked, turn: 7 }, event.id, true)
    expect(renewed.gold.carta).toBe(asked.gold.carta - renewalPrice(asked, 'carta', BARREL))
    expect(renewed.mercenaries[BARREL].contract!.since).toBe(7)
    expect(renewed.events).toEqual([])
    expect(runEconomy(renewed, 12, always).events.filter((e) => e.kind === 'mercenaryRenewal')).toEqual([])
  })

  it('refusing it ends the contract, at a cost when they are short of soldiers', () => {
    const asked = runEconomy(hired(), 7, always)
    const event = asked.events.find((e) => e.kind === 'mercenaryRenewal')!
    const refused = decideRenewal(asked, event.id, false)
    expect(refused.mercenaries[BARREL].contract).toBeNull()
    expect(refused.events).toEqual([])
    expect(refused.mercenaryStanding.carta).toBe(asked.mercenaryStanding.carta)
    const short = decideRenewal(withSoldiers(asked, BARREL, 100), event.id, false)
    expect(short.mercenaryStanding.carta).toBe(asked.mercenaryStanding.carta + BALANCE.STANDING_DISMISS_REDUCED)
  })

  it('cannot be paid without the gold, and refusing it stays possible', () => {
    const asked = withGold(runEconomy(hired(), 7, always), 0)
    const event = asked.events.find((e) => e.kind === 'mercenaryRenewal')!
    expect(renewalProblem(asked, event.id)).toBe('金が足りません')
    expect(() => decideRenewal(asked, event.id, true)).toThrow()
    expect(decideRenewal(asked, event.id, false).mercenaries[BARREL].contract).toBeNull()
  })

  it('is asked for once at a time', () => {
    const asked = runEconomy(hired(), 7, always)
    expect(runEconomy(asked, 8, always).events.filter((e) => e.kind === 'mercenaryRenewal')).toHaveLength(1)
  })
})

describe('dismissing', () => {
  it('lets a mercenary at full strength go at no cost, back to the market', () => {
    const state = dismissMercenary(hired(), BARREL)
    expect(state.mercenaries[BARREL]).toEqual({ soldiers: MAX, contract: null })
    expect(state.characters[BARREL]).toEqual({ cityId: null, factionId: null, roaming: FLUEN })
    expect(state.mercenaryStanding.carta).toBe(BALANCE.STANDING_HIRE)
    expect(mercenaryMarket(state, FLUEN)).toContain(BARREL)
    expect(state.gold.carta).toBe(hired().gold.carta)
  })

  it('costs standing with one short of soldiers, who goes recovering', () => {
    const state = dismissMercenary(withSoldiers(hired(), BARREL, 100), BARREL)
    expect(state.mercenaryStanding.carta).toBe(BALANCE.STANDING_HIRE + BALANCE.STANDING_DISMISS_REDUCED)
    expect(isRecovering(state, BARREL)).toBe(true)
    expect(mercenaryMarket(state, FLUEN)).not.toContain(BARREL)
  })

  it('is not possible while they are ordered somewhere', () => {
    const state = hired()
    const moved = addMoveOrder(state, { factionId: 'carta', from: FLUEN, to: SILVA, knights: [BARREL], troops: 0, supplies: 0, solo: false })
    expect(dismissProblem(moved, BARREL)).toBe('移動の予約中は打ち切れません')
    const transported = addTransportOrder(state, { factionId: 'carta', from: FLUEN, to: SILVA, knight: BARREL, troops: 10, supplies: 0 })
    expect(dismissProblem(transported, BARREL)).toBe('輸送の予約中は打ち切れません')
    const invaded = addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', BARREL] })
    expect(dismissProblem(invaded, BARREL)).toBe('侵攻の予約中は打ち切れません')
    expect(dismissProblem(state, '015')).toBe('自勢力の傭兵ではありません')
  })

  it('takes one on their way off the move, where they are; a move left with no knight ends with what it carried', () => {
    const movement: Movement = {
      id: 'move-9', factionId: 'carta', from: FLUEN, to: SILVA, knights: [BARREL], troops: 50, supplies: 10, solo: false,
      troopMorale: 70, route: [AMBARIA, VERSTA], monthsLeft: 1,
    }
    const state = dismissMercenary({ ...hired(), movements: [movement] }, BARREL)
    expect(state.movements).toEqual([])
    expect(state.characters[BARREL].roaming).toBe(AMBARIA)
    const shared = dismissMercenary({ ...hired(), movements: [{ ...movement, knights: [BARREL, '015'] }] }, BARREL)
    expect(shared.movements).toEqual([{ ...movement, knights: ['015'] }])
  })
})

describe('a company with a unit type of its own', () => {
  const info = CHARACTER_MAP[BARREL].mercenaryInfo!
  const data = info.unitType
  afterEach(() => { info.unitType = data })

  it('fights as that, not as the default of its leader\'s type', () => {
    info.unitType = undefined
    expect(defaultUnitType(BARREL)).toBe('cavalry')
    info.unitType = 'infantry'
    expect(defaultUnitType(BARREL)).toBe('infantry')
    const state = hired()
    const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', BARREL] }
    const unit = (unitType: string) => ({ knightId: BARREL, unitType, soldiers: MAX })
    expect(orderProblem(state, { ...draft, units: [knightUnit('015', 200), unit('infantry')] })).toBeNull()
    expect(orderProblem(state, { ...draft, units: [knightUnit('015', 200), unit('cavalry')] })).toBe('傭兵の部隊は変えられません')
    const marching = invading(state)
    expect(marching.march!.current!.attacker.units[1]).toMatchObject({ knightId: BARREL, unitType: 'infantry' })
  })
})

describe('forming armies', () => {
  it('takes no soldiers of the city for a mercenary, whose unit stays as it is', () => {
    const state = hired()
    const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', BARREL] }
    const units = [knightUnit('015', 200), unitOf(state, BARREL)]
    const ordered = addOrder(state, { ...draft, units })
    expect(soldiersLeft(ordered, FLUEN)).toBe(state.cities[FLUEN].troops - 200)
    expect(orderProblem(state, { ...draft, units: [units[0], { ...units[1], soldiers: 100 }] })).toBe('傭兵の部隊は変えられません')
    const another = unitTypesOf(BARREL).find((type) => type !== units[1].unitType)!
    expect(orderProblem(state, { ...draft, units: [units[0], { ...units[1], unitType: another }] })).toBe('傭兵の部隊は変えられません')
  })

  it('leaves the soldiers of the city as they are, mercenaries setting out and coming back', () => {
    const start = hired()
    const marching = invading(start)
    expect(marching.cities[FLUEN].troops).toBe(start.cities[FLUEN].troops - 200)
    const back = resolveBattle(marching, battleId(marching), 'defender', [], null, [], () => 0, [
      { side: 'attacker', knightId: '015', soldiers: 100 }, { side: 'attacker', knightId: BARREL, soldiers: 300 },
    ])
    expect(back.cities[FLUEN].troops).toBe(start.cities[FLUEN].troops - 100)
    expect(back.mercenaries[BARREL].soldiers).toBe(300)
    expect(back.characters[BARREL]).toEqual({ cityId: FLUEN, factionId: 'carta' })
  })

  it('does not make a mercenary a commander, nor send them alone', () => {
    const state = hired()
    expect(leadingKnight(state, [BARREL, '015'])).toBe('015')
    const alone = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: BARREL, knights: [BARREL] }
    expect(orderProblem(state, alone)).toBe('傭兵は軍団長になれません')
    expect(orderProblem(state, { ...alone, commander: BARREL, knights: [BARREL, '015'] })).toBe('傭兵は軍団長になれません')
    const onlyMercenary = { ...state, characters: Object.fromEntries(Object.entries(state.characters).filter(([id]) => !['015', '016', '027', '029'].includes(id))) }
    expect(invadeFromProblem(onlyMercenary, FLUEN)).toBe('軍団長になれる騎士がいません')
  })

  it('calls off an invasion left with no knight who can lead it', () => {
    const state = hired()
    const ordered = addOrder(state, {
      factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', BARREL], units: [knightUnit('015', 200), unitOf(state, BARREL)],
    })
    const left = endStrategyPhase(ordered)
    const gone = { ...left, characters: { ...left.characters, '015': { ...left.characters['015'], cityId: SILVA } } }
    const next = startNextBattle(gone)
    expect(next.march?.current ?? null).toBeNull()
    expect(next.characters[BARREL].cityId).toBe(FLUEN)
  })

  it('lets a mercenary into an entry, without their soldiers joining the city', () => {
    const state = hired()
    const ordered = addOrder(state, {
      factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', BARREL], units: [knightUnit('015', 200), unitOf(state, BARREL)],
    })
    const left = endStrategyPhase(ordered)
    const owned = { ...left, cityOwners: { ...left.cityOwners, [AMBARIA]: 'carta' } }
    const marching = startNextBattle(owned)
    const entry = marching.march!.entry!
    expect(entry.soldiers).toBe(200)
    const entered = finishEntry(marching, entry.id)
    expect(entered.characters[BARREL].cityId).toBe(AMBARIA)
    expect(entered.cities[AMBARIA].troops).toBe(left.cities[AMBARIA].troops + 200)
  })

  it('does not let a mercenary ride alone, though they may move and take a transport', () => {
    const state = hired()
    const draft = { factionId: 'carta', from: FLUEN, to: SILVA, knights: [BARREL, '015'], troops: 0, supplies: 0, solo: true }
    expect(moveOrderProblem(state, draft)).toBe('傭兵は単騎移動できません')
    expect(moveOrderProblem(state, { ...draft, solo: false })).toBeNull()
    expect(transportOrderProblem(state, { factionId: 'carta', from: FLUEN, to: SILVA, knight: BARREL, troops: 10, supplies: 0 })).toBeNull()
  })

  it('does not make a mercenary a lord or an officer', () => {
    const state = hired()
    expect(assignmentProblem(state, FLUEN, BARREL, 'governor')).toBe('傭兵は内政を担当できません')
    expect(assignmentProblem(state, FLUEN, BARREL, 'commerce')).toBe('傭兵は内政を担当できません')
    const excluded = new Set(['015', '016', '027', '029'])
    expect(successorLord(state, FLUEN, excluded, () => 0)).toBeUndefined()
  })

  it('leaves a city moved into without a lord as it was', () => {
    let state = lordless(hired(), SILVA)
    state = addMoveOrder(state, { factionId: 'carta', from: FLUEN, to: SILVA, knights: [BARREL], troops: 0, supplies: 0, solo: false })
    state = runMovements(state)
    while (state.movements.length > 0) state = runMovements(state)
    expect(state.characters[BARREL].cityId).toBe(SILVA)
    expect(state.cities[SILVA].assignments.governor).toBeUndefined()
  })

  it('lets a faction defend with its mercenary, the city\'s soldiers going to the others', () => {
    const marching = leonisAttacks()
    const battle = marching.march!.current!
    expect(battle.pendingDefense).toBe(true)
    expect(defenseKnights(marching, battle)).toContain(BARREL)
    const draft = { commander: '015', units: [knightUnit('015', 100), unitOf(marching, BARREL)] }
    expect(defenseProblem(marching, battle, { ...draft, commander: BARREL })).toBe('傭兵は軍団長になれません')
    const defended = formDefense(marching, battle.id, draft)
    expect(defended.cities[FLUEN].troops).toBe(marching.cities[FLUEN].troops - 100)
  })

  it('has a CPU defender share the city\'s soldiers among its knights only', () => {
    const start = hired()
    const state = { ...start, characters: { ...start.characters, [IRON]: { cityId: AMBARIA, factionId: 'leonis' } } }
    const army = defenderArmy(withSoldiers(state, IRON, 300), AMBARIA, 'leonis', ['013', IRON])
    expect(army.commander).toBe('013')
    expect(army.units).toEqual([
      expect.objectContaining({ knightId: '013', soldiers: Math.min(MAX_SOLDIERS, Math.floor(state.cities[AMBARIA].troops / 10) * 10) }),
      { knightId: IRON, unitType: defaultUnitType(IRON), soldiers: 300 },
    ])
  })
})

describe('after a battle', () => {
  const survivors = (soldiers: number): BattleSurvivor[] => [{ side: 'attacker', knightId: BARREL, soldiers }, { side: 'attacker', knightId: '015', soldiers: 50 }]

  it('keeps a winning mercenary\'s soldiers theirs, out of the city taken', () => {
    const marching = invading()
    const troops = marching.cities[AMBARIA].troops
    const state = resolveBattle(marching, battleId(marching), 'attacker', [], null, [], () => 0, survivors(321))
    expect(state.mercenaries[BARREL].soldiers).toBe(321)
    expect(state.characters[BARREL]).toEqual({ cityId: AMBARIA, factionId: 'carta' })
    expect(state.cities[AMBARIA].troops).toBe(troops + 50)
    expect(state.lastBattle?.soldiers).toEqual([{ cityId: AMBARIA, soldiers: 50 }])
  })

  it('takes a mercenary retreating back, with their soldiers apart from the city\'s', () => {
    const marching = invading()
    const troops = marching.cities[FLUEN].troops
    const state = resolveBattle(marching, battleId(marching), 'defender', [
      { side: 'attacker', knightId: BARREL, to: FLUEN, captured: false, soldiers: 222 },
    ], null, [], () => 0, [{ side: 'attacker', knightId: '015', soldiers: 10 }])
    expect(state.mercenaries[BARREL].soldiers).toBe(222)
    expect(state.characters[BARREL].cityId).toBe(FLUEN)
    expect(state.cities[FLUEN].troops).toBe(troops + 10)
  })

  it('ends the contract of one wiped out wherever their side could retreat to, at a cost', () => {
    const marching = invading()
    const standing = marching.mercenaryStanding.carta
    const state = resolveBattle(marching, battleId(marching), 'defender', [], null, [{ side: 'attacker', knightId: BARREL, captured: false, to: FLUEN }], () => 0,
      [{ side: 'attacker', knightId: '015', soldiers: 10 }])
    expect(state.mercenaries[BARREL]).toEqual({ soldiers: 0, contract: null })
    expect(state.characters[BARREL]).toEqual({ cityId: null, factionId: null, roaming: AMBARIA })
    expect(isRecovering(state, BARREL)).toBe(true)
    expect(state.mercenaryStanding.carta).toBe(standing + BALANCE.STANDING_WIPED_OUT)
    expect(state.lastBattle?.moves).toContainEqual({ characterId: BARREL, kind: 'released', from: FLUEN, to: null })
  })

  /** レオニス帝国 hired 鉄弦団 in アンバリア; カルタ書院 attacks */
  const leonisHired = (): GameState => {
    const start = hired()
    return {
      ...start,
      characters: { ...start.characters, [IRON]: { cityId: AMBARIA, factionId: 'leonis' } },
      mercenaries: { ...start.mercenaries, [IRON]: { soldiers: 450, contract: { monthly: 100, since: 1 } } },
    }
  }

  it('does not capture a mercenary in a city taken without a battle: they withdraw next door, no lord there', () => {
    const start = lordless(lordless(leonisHired(), AMBARIA), VERSTA)
    const marching = invading(start)
    expect(marching.march!.current!.undefended).toBe(true)
    const state = resolveBattle(marching, battleId(marching), 'attacker')
    expect(state.characters[IRON]).toEqual({ cityId: VERSTA, factionId: 'leonis' })
    expect(state.lastBattle?.captives).not.toContain(IRON)
    expect(state.lastBattle?.prisoners.map((p) => p.characterId)).not.toContain(IRON)
    expect(state.cities[VERSTA].assignments.governor).not.toBe(IRON)
    expect(state.mercenaries[IRON].soldiers).toBe(450)
  })

  it('ends the contract of one with nowhere to withdraw to, without a cost', () => {
    let start = lordless(leonisHired(), AMBARIA)
    start = { ...start, cityOwners: { ...start.cityOwners, [VERSTA]: 'taurus' } }
    const marching = invading(start)
    const state = resolveBattle(marching, battleId(marching), 'attacker')
    expect(state.mercenaries[IRON]).toEqual({ soldiers: 450, contract: null })
    expect(state.characters[IRON]).toEqual({ cityId: null, factionId: null, roaming: AMBARIA })
    expect(state.mercenaryStanding.leonis).toBe(start.mercenaryStanding.leonis)
    expect(state.lastBattle?.moves).toContainEqual({ characterId: IRON, kind: 'released', from: AMBARIA, to: null })
  })

  it('does not make a mercenary who retreated the lord of a city without one', () => {
    let start = leonisHired()
    start = lordless(start, VERSTA)
    start = { ...start, characters: Object.fromEntries(Object.entries(start.characters).filter(([, c]) => c.cityId !== VERSTA)) }
    const marching = invading(start)
    const state = resolveBattle(marching, battleId(marching), 'attacker', [{ side: 'defender', knightId: IRON, to: VERSTA, captured: false, soldiers: 111 }])
    expect(state.characters[IRON].cityId).toBe(VERSTA)
    expect(state.cities[VERSTA].assignments.governor).not.toBe(IRON)
    expect(state.mercenaries[IRON].soldiers).toBe(111)
  })

  it('ends the contracts of a faction destroyed there, with no grudge, not as one of its knights', () => {
    const start = playing('leonis', 'carta')
    const others = citiesOf(start, 'carta').filter((id) => id !== FLUEN)
    const marching = leonisAttacks({ ...start, cityOwners: { ...start.cityOwners, ...Object.fromEntries(others.map((id) => [id, 'leonis'])) } })
    const battle = marching.march!.current!
    const defended = formDefense(marching, battle.id, { commander: '015', units: [knightUnit('015', 100)] })
    const fallen = resolveBattle(defended, battle.id, 'attacker')
    expect(fallen.mercenaries[BARREL].contract).toBeNull()
    expect(fallen.characters[BARREL]).toEqual({ cityId: null, factionId: null, roaming: FLUEN })
    const event = fallen.events.find((e) => e.kind === 'factionDestroyed')
    expect(event).toMatchObject({ factionId: 'carta' })
    expect(event && 'knights' in event ? event.knights : []).not.toContain(BARREL)
  })
})

describe('knights with nowhere to retreat to', () => {
  /** 013 of アンバリア, whose neighbours are not leonis' any more */
  const stranded = (state = playing('carta')): GameState => {
    const cut = { ...state, cityOwners: { ...state.cityOwners, [VERSTA]: 'taurus' } }
    return startNextBattle(endStrategyPhase(addOrder(cut, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015'] })))
  }
  const headOf = (state: GameState, factionId: string) =>
    Object.keys(state.characters).find((id) => CHARACTER_MAP[id].isPatriarch && state.characters[id].factionId === factionId)!

  it('go to the nearest city of their faction when the head of it is held prisoner', () => {
    const marching = stranded()
    const head = headOf(marching, 'leonis')
    const held = { ...marching, characters: { ...marching.characters, [head]: { ...marching.characters[head], prisoner: true } } }
    const state = resolveBattle(held, battleId(held), 'attacker')
    const to = state.characters['013'].cityId!
    expect(state.cityOwners[to]).toBe('leonis')
    expect(rejoinCity(state, 'leonis', AMBARIA)).toBe(to)
    expect(to).not.toBe(held.characters[head].cityId)
  })

  it('the head going to the nearest city, its lord', () => {
    const marching = stranded()
    const head = headOf(marching, 'leonis')
    const here = { ...marching, characters: { ...marching.characters, [head]: { ...marching.characters[head], cityId: AMBARIA } } }
    const state = resolveBattle(here, battleId(here), 'attacker')
    const to = state.characters[head].cityId!
    expect(state.cityOwners[to]).toBe('leonis')
    expect(state.cities[to].assignments.governor).toBe(head)
    expect(state.lastBattle?.moves).toContainEqual({ characterId: head, kind: 'rejoin', from: AMBARIA, to })
  })

  it('have no city to go to once the faction has none left', () => {
    const state = createInitialState(['carta'])
    expect(rejoinCity({ ...state, cityOwners: { [FLUEN]: 'carta' } }, 'leonis', AMBARIA)).toBeNull()
  })
})

describe('放浪', () => {
  it('takes in those of a faction with no city left on a move, where they are', () => {
    const state = playing('carta')
    const movement: Movement = {
      id: 'move-9', factionId: 'sede', from: 'P000', to: 'P000', knights: ['001'], troops: 0, supplies: 0, solo: false, troopMorale: 70, route: [AMBARIA, 'P000'], monthsLeft: 1,
    }
    const cut = { ...state, movements: [movement], cityOwners: Object.fromEntries(Object.entries(state.cityOwners).filter(([, f]) => f !== 'sede')) }
    expect(runMovements(cut).characters['001']).toEqual({ cityId: null, factionId: null, roaming: AMBARIA })
  })

  it('goes on to a neighbouring city or stays, hired mercenaries not', () => {
    const state = hired()
    const rolls = [0, 0]
    const moved = runRoaming(state, () => rolls.shift() ?? 0.99)
    expect(neighbours(state.characters[IRON].roaming!)).toContain(moved.characters[IRON].roaming)
    expect(moved.characters[BARREL]).toEqual(state.characters[BARREL])
    const stayed = runRoaming(state, () => 0.99)
    expect(stayed.characters[IRON].roaming).toBe(state.characters[IRON].roaming)
  })

  it('moves as the progress phase starts, those recovering too', () => {
    const state = withSoldiers(hired(), IRON, 100)
    let next = state
    while (next.phase === 'strategy') next = endFactionTurn(next, () => 0)
    expect(next.characters[IRON].roaming).not.toBe(state.characters[IRON].roaming)
  })

  it('remembers the faction that destroyed theirs, those who wandered off in the battle too, but not as prisoners', () => {
    let state = playing('leonis')
    const knights = Object.keys(state.characters).filter((id) => state.characters[id].factionId === 'sede').sort()
    state = addOrder(state, { factionId: 'leonis', from: 'P013', to: 'P000', commander: '038', knights: ['038'] })
    const marching = startNextBattle(endStrategyPhase(state))
    const battle = marching.march!.current!
    const [first, second] = knights
    const fallen = resolveBattle(marching, battle.id, 'attacker', [], null, [
      { side: 'defender', knightId: first, captured: false, to: null }, { side: 'defender', knightId: second, captured: true, to: null },
    ])
    expect(fallen.characters[first]).toEqual({ cityId: null, factionId: null, roaming: 'P000', grudge: 'leonis' })
    expect(fallen.characters[second]).toEqual({ cityId: 'P000', factionId: null, prisoner: true })
    expect(fallen.lastBattle?.moves).toContainEqual(expect.objectContaining({ characterId: first, kind: 'wander' }))
  })

  it('leaves them out of the knights of the city they are in', () => {
    const state = createInitialState(['carta'])
    expect(state.characters[IRON].roaming).toBe('P001')
    expect(charactersIn(state, 'P001')).not.toContain(IRON)
  })
})
