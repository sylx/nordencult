import { describe, expect, it } from 'vitest'
import { CHARACTER_MAP } from '../../data/character'
import { RELIC_MAP } from '../../data/relics'
import { SUMMON_NAMES } from '../../data/summons'
import {
  addMoveOrder, addOrder, addTransportOrder, assignmentProblem, autoSummonName, BALANCE, canCommand, characterOf, citySoldiers, debugAddRelic, debugImprison,
  debugSummon, defaultUnitType, defenderArmy, defenseKnights, endFactionTurn, equipProblem, formDefense, isSummon, leadingKnight, moveOrderProblem,
  orderProblem, ownSoldiers, recoverSummons, relicsOf, renameProblem, renameSummon, requestPapalRepair, resolveBattle, runEconomy, runMovements,
  soldiersLeft, startNextBattle, successorLord, summonProblem, summonRelic, summonStrength, transportKnightProblem, unitTypesOf, withSummonHp,
  type ArmyUnit, type GameState,
} from '..'
import { NO_SUMMONS, playing } from '../testing'

const FLUEN = 'P012' // カルタ書院
const SILVA = 'P026' // カルタ書院
const AMBARIA = 'P004' // レオニス帝国
const VERSTA = 'P005' // レオニス帝国, next to アンバリア
const FLUEN_KNIGHTS = ['015', '016', '027', '029']

/** Rolls the same number each time: 0 gives the least of a range, 0.999 the most */
const always = (value: number) => () => value

/** カルタ書院 with a ドラゴン's relic repaired in its box, and its id */
function withDragonRelic(state = playing('carta'), relicId = 'dragon'): { state: GameState; itemId: string } {
  const next = debugAddRelic(state, 'carta', relicId, true)
  return { state: next, itemId: relicsOf(next, 'carta').at(-1)!.id }
}

/** カルタ書院 with a ドラゴン summoned in フルーエン, and its id */
function summoned(state = playing('carta'), relicId = 'dragon', random = always(0.5)): { state: GameState; id: string } {
  const { state: withRelic, itemId } = withDragonRelic(state, relicId)
  return summonRelic(withRelic, FLUEN, itemId, random)
}

function endStrategyPhase(state: GameState): GameState {
  while (state.phase === 'strategy') state = endFactionTurn(state)
  return state
}

const knightUnit = (id: string, soldiers: number): ArmyUnit => ({ knightId: id, unitType: defaultUnitType(NO_SUMMONS, id), soldiers })
const summonUnit = (state: GameState, id: string): ArmyUnit => ({ knightId: id, unitType: defaultUnitType(state, id), soldiers: ownSoldiers(state, id)! })

/** 015 and the summoned unit marching on アンバリア from フルーエン: the battle is under way */
function invading(start = summoned()): { state: GameState; id: string } {
  const { state, id } = start
  const ordered = addOrder(state, {
    factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', id], units: [knightUnit('015', 200), summonUnit(state, id)],
  })
  return { state: startNextBattle(endStrategyPhase(ordered)), id }
}
const battleId = (state: GameState) => state.march!.current!.id

describe('summoning', () => {
  it('needs the faction\'s turn, its own city and a summon relic repaired, not with 法王府', () => {
    const { state, itemId } = withDragonRelic()
    expect(summonProblem(state, FLUEN, itemId)).toBeNull()
    expect(summonProblem(state, AMBARIA, itemId)).toBe('自勢力の都市ではありません')
    expect(summonProblem({ ...state, phase: 'march', activeFaction: null }, FLUEN, itemId)).toBe('手番ではありません')
    // Another faction's turn: フルーエン is not its city
    expect(summonProblem(endFactionTurn(state), FLUEN, itemId)).toBe('自勢力の都市ではありません')
    expect(summonProblem(state, FLUEN, 'nope')).toBe('遺物がありません')
    const broken = debugAddRelic(playing('carta'), 'carta', 'golem', false)
    const brokenId = relicsOf(broken, 'carta').at(-1)!.id
    expect(summonProblem(broken, FLUEN, brokenId)).toBe('修復されていない遺物です')
    const rich = { ...broken, gold: { ...broken.gold, carta: 100000 } }
    expect(summonProblem(requestPapalRepair(rich, 'carta', brokenId), FLUEN, brokenId)).toBe('法王府に依頼中です')
    // カルタ書院's ライフル
    expect(summonProblem(state, FLUEN, 'carta-2')).toBe('召喚の遺物ではありません')
  })

  it('uses up the relic for a unit serving in the city, its abilities rolled and its HP the relic\'s', () => {
    const { state: before, itemId } = withDragonRelic()
    const { state, id } = summonRelic(before, FLUEN, itemId, always(0))
    expect(isSummon(id)).toBe(true)
    expect(relicsOf(state, 'carta').some((i) => i.id === itemId)).toBe(false)
    expect(state.characters[id]).toEqual({ cityId: FLUEN, factionId: 'carta' })
    const [least] = BALANCE.SUMMON_ABILITY_RANGE
    expect(state.summons[id]).toEqual({
      templateId: '991', relicId: 'dragon', name: SUMMON_NAMES['991'][0], unitType: 'dragon',
      leadership: least, strength: least, intelligence: least, hp: 600, maxHp: 600,
    })
    const most = summonRelic(before, FLUEN, itemId, always(0.999)).state
    const [, high] = BALANCE.SUMMON_ABILITY_RANGE
    expect(Object.values(most.summons)[0]).toMatchObject({ leadership: high, strength: high, intelligence: high })
  })

  it('summons each monster with its HP', () => {
    expect(Object.values(summoned(undefined, 'golem').state.summons)[0]).toMatchObject({ unitType: 'golem', hp: 800, maxHp: 800, templateId: '992' })
    expect(Object.values(summoned(undefined, 'behemoth').state.summons)[0]).toMatchObject({ unitType: 'behemoth', hp: 1000, maxHp: 1000, templateId: '993' })
    expect(RELIC_MAP.behemoth.summon!.hp).toBe(1000)
  })

  it('gives each a name of the list the faction\'s others do not have, any once all are taken', () => {
    let state = playing('carta')
    const names = SUMMON_NAMES['991']
    for (let i = 0; i < names.length; i++) state = debugSummon(state, FLUEN, 'dragon', always(0)).state
    expect(new Set(Object.values(state.summons).map((s) => s.name))).toEqual(new Set(names))
    expect(names).toContain(autoSummonName(state, 'carta', '991', always(0)))
  })

  it('is a character of type 召喚 with its template\'s pictures and 政治・魅力 fixed', () => {
    const { state, id } = summoned()
    const summon = state.summons[id]
    expect(characterOf(state, id)).toMatchObject({
      id, name: summon.name, type: 'summon', imageInfo: CHARACTER_MAP['991'].imageInfo,
      leadership: summon.leadership, strength: summon.strength, intelligence: summon.intelligence,
      politics: BALANCE.SUMMON_FIXED_ABILITY, charm: BALANCE.SUMMON_FIXED_ABILITY,
    })
    expect(characterOf(state, '015')).toBe(CHARACTER_MAP['015'])
  })

  it('renames it, 1 to 12 characters', () => {
    const { state, id } = summoned()
    expect(renameSummon(state, id, '  ファフ  ').summons[id].name).toBe('ファフ')
    expect(renameProblem(state, id, '  ')).toBe('名前を入れてください')
    expect(renameProblem(state, id, 'あ'.repeat(12))).toBeNull()
    expect(renameProblem(state, id, 'あ'.repeat(13))).toBe('名前は12文字までです')
    expect(renameProblem(state, '015', 'x')).toBe('召喚ユニットではありません')
  })
})

describe('its strength', () => {
  it('shows norden-battle\'s basic attack and defense at its HP, 統率・武力 and morale', () => {
    const { state, id } = summoned(undefined, 'dragon', always(0.5))
    // 統率・武力 75 (the middle of 60..90), morale 70: as worked out with the user (M009-30)
    expect(summonStrength(state, id)).toEqual({ hp: 600, maxHp: 600, attack: 172, defense: 185 })
    // A monster attacks with fixed soldiers, and the defense is that of a hit: neither goes down with its HP
    expect(summonStrength(withSummonHp(state, id, 300), id)).toEqual({ hp: 300, maxHp: 600, attack: 172, defense: 185 })
    expect(summonStrength(state, '015')).toBeUndefined()
  })
})

describe('what a summoned unit cannot do', () => {
  it('leads its monster only, and wears nothing', () => {
    const { state, id } = summoned()
    expect(unitTypesOf(state, id)).toEqual(['dragon'])
    expect(defaultUnitType(state, id)).toBe('dragon')
    expect(equipProblem(state, id, 0, 'carta-2')).toBe('召喚ユニットは装備できません')
  })

  it('never leads an army', () => {
    const { state, id } = summoned()
    expect(canCommand(id)).toBe(false)
    expect(leadingKnight(state, [id, '015'])).toBe('015')
    const alone = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: id, knights: [id] }
    expect(orderProblem(state, alone)).toBe('召喚ユニットは軍団長になれません')
    expect(orderProblem(state, { ...alone, knights: [id, '015'] })).toBe('召喚ユニットは軍団長になれません')
  })

  it('is no lord, officer nor transport\'s knight, and does not ride alone', () => {
    const { state, id } = summoned()
    expect(assignmentProblem(state, FLUEN, id, 'governor')).toBe('召喚ユニットは内政を担当できません')
    expect(assignmentProblem(state, FLUEN, id, 'commerce')).toBe('召喚ユニットは内政を担当できません')
    expect(successorLord(state, FLUEN, new Set(FLUEN_KNIGHTS), always(0))).toBeUndefined()
    expect(transportKnightProblem(state, id)).toBe('召喚ユニットは輸送を担当できません')
    expect(() => addTransportOrder(state, { factionId: 'carta', from: FLUEN, to: SILVA, knight: id, troops: 10, supplies: 0 })).toThrow('召喚ユニットは輸送を担当できません')
    const move = { factionId: 'carta', from: FLUEN, to: SILVA, knights: [id], troops: 0, supplies: 0, solo: true }
    expect(moveOrderProblem(state, move)).toBe('召喚ユニットは単騎移動できません')
    expect(moveOrderProblem(state, { ...move, solo: false })).toBeNull()
  })

  it('is gone rather than held prisoner', () => {
    const { state, id } = summoned()
    const held = debugImprison(state, id, AMBARIA)
    expect(held.summons[id]).toBeUndefined()
    expect(held.characters[id]).toBeUndefined()
  })
})

describe('a summoned unit in an army', () => {
  it('takes its HP as its soldiers and none of the city\'s, its unit fixed', () => {
    const { state, id } = summoned()
    const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', id] }
    const units = [knightUnit('015', 200), summonUnit(state, id)]
    expect(units[1]).toEqual({ knightId: id, unitType: 'dragon', soldiers: 600 })
    expect(orderProblem(state, { ...draft, units })).toBeNull()
    expect(citySoldiers(units)).toBe(200)
    expect(soldiersLeft(addOrder(state, { ...draft, units }), FLUEN)).toBe(state.cities[FLUEN].troops - 200)
    expect(orderProblem(state, { ...draft, units: [units[0], { ...units[1], soldiers: 300 }] })).toBe('召喚ユニットの部隊は変えられません')
    expect(orderProblem(state, { ...draft, units: [units[0], { ...units[1], unitType: 'cavalry' }] })).toBe(`${id} は騎兵を率いられません`)
  })

  it('marches with its HP, the city keeping its soldiers', () => {
    const start = summoned()
    const { state, id } = invading(start)
    expect(state.march!.current!.attacker.units[1]).toEqual({ knightId: id, unitType: 'dragon', soldiers: 600 })
    expect(state.cities[FLUEN].troops).toBe(start.state.cities[FLUEN].troops - 200)
  })

  it('marches with its HP as it is when no units were chosen', () => {
    const { state: start, id } = summoned()
    const hurt = withSummonHp(start, id, 250)
    const ordered = addOrder(hurt, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '015', knights: ['015', id] })
    const marching = startNextBattle(endStrategyPhase(ordered))
    expect(marching.march!.current!.attacker.units.find((u) => u.knightId === id)).toEqual({ knightId: id, unitType: 'dragon', soldiers: 250 })
  })

  it('defends with its HP in a CPU\'s army', () => {
    const { state: start, id } = summoned()
    // As if it served レオニス帝国 in アンバリア
    const state = { ...start, characters: { ...start.characters, [id]: { cityId: AMBARIA, factionId: 'leonis' } } }
    const army = defenderArmy(state, AMBARIA, 'leonis', ['013', id])
    expect(army.commander).toBe('013')
    expect(army.units[1]).toEqual({ knightId: id, unitType: 'dragon', soldiers: 600 })
  })

  it('defends a city of the player\'s with its HP, never as the commander', () => {
    let state = addOrder(playing('leonis', 'carta'), { factionId: 'leonis', from: AMBARIA, to: FLUEN, commander: '013', knights: ['013'] })
    while (state.activeFaction !== 'carta') state = endFactionTurn(state)
    const { state: withSummon, id } = summoned(state)
    const marching = startNextBattle(endStrategyPhase(withSummon))
    const battle = marching.march!.current!
    expect(defenseKnights(marching, battle)).toContain(id)
    const draft = { commander: '015', units: [knightUnit('015', 100), summonUnit(marching, id)] }
    expect(() => formDefense(marching, battle.id, { ...draft, commander: id })).toThrow('召喚ユニットは軍団長になれません')
    const defended = formDefense(marching, battle.id, draft)
    expect(defended.cities[FLUEN].troops).toBe(marching.cities[FLUEN].troops - 100)
  })
})

describe('after a battle', () => {
  it('keeps what is left of its HP, out of the city taken', () => {
    const { state: marching, id } = invading()
    const troops = marching.cities[AMBARIA].troops
    const state = resolveBattle(marching, battleId(marching), 'attacker', [], null, [], always(0), [
      { side: 'attacker', knightId: id, soldiers: 321 }, { side: 'attacker', knightId: '015', soldiers: 50 },
    ])
    expect(state.summons[id].hp).toBe(321)
    expect(state.characters[id]).toEqual({ cityId: AMBARIA, factionId: 'carta' })
    expect(state.cities[AMBARIA].troops).toBe(troops + 50)
    expect(state.cities[AMBARIA].assignments.governor).toBe('015')
  })

  it('retreats with what is left of its HP', () => {
    const { state: marching, id } = invading()
    const troops = marching.cities[FLUEN].troops
    const state = resolveBattle(marching, battleId(marching), 'defender', [
      { side: 'attacker', knightId: id, to: FLUEN, captured: false, soldiers: 222 },
    ], null, [], always(0), [{ side: 'attacker', knightId: '015', soldiers: 10 }])
    expect(state.summons[id].hp).toBe(222)
    expect(state.characters[id].cityId).toBe(FLUEN)
    expect(state.cities[FLUEN].troops).toBe(troops + 10)
  })

  it('is never captured retreating', () => {
    const { state: marching, id } = invading()
    const state = resolveBattle(marching, battleId(marching), 'defender', [
      { side: 'attacker', knightId: id, to: FLUEN, captured: true, soldiers: 100 },
    ], null, [], always(0), [{ side: 'attacker', knightId: '015', soldiers: 10 }])
    expect(state.lastBattle!.prisoners.map((p) => p.characterId)).not.toContain(id)
    expect(state.characters[id]).toEqual({ cityId: FLUEN, factionId: 'carta' })
  })

  it('is lost for good when wiped out, the relic not given back', () => {
    const { state: marching, id } = invading()
    const box = relicsOf(marching, 'carta')
    const state = resolveBattle(marching, battleId(marching), 'defender', [], null, [{ side: 'attacker', knightId: id, captured: false, to: FLUEN }], always(0),
      [{ side: 'attacker', knightId: '015', soldiers: 10 }])
    expect(state.summons[id]).toBeUndefined()
    expect(state.characters[id]).toBeUndefined()
    expect(relicsOf(state, 'carta')).toEqual(box)
    expect(state.lastBattle!.lostSummons).toEqual([id])
    expect(state.lastBattle!.summons[id]).toEqual(marching.summons[id])
    expect(state.lastBattle!.moves.map((m) => m.characterId)).not.toContain(id)
  })

  /** A ドラゴン of レオニス帝国 in アンバリア, which カルタ書院 attacks */
  function leonisSummon(): { state: GameState; id: string } {
    const { state, id } = debugSummon(playing('carta'), AMBARIA, 'dragon', always(0))
    return { state, id }
  }

  it('is not captured in a city taken without a battle: it withdraws next door, no lord there', () => {
    const { state: start, id } = leonisSummon()
    const lordless = (s: GameState, city: string): GameState => ({ ...s, cities: { ...s.cities, [city]: { ...s.cities[city], assignments: { officers: {} } } } })
    const { state: marching } = invading(summoned(lordless(lordless(start, AMBARIA), VERSTA)))
    expect(marching.march!.current!.undefended).toBe(true)
    const state = resolveBattle(marching, battleId(marching), 'attacker')
    expect(state.characters[id]).toEqual({ cityId: VERSTA, factionId: 'leonis' })
    expect(state.lastBattle!.captives).not.toContain(id)
    expect(state.cities[VERSTA].assignments.governor).not.toBe(id)
  })

  it('is gone with its faction destroyed', () => {
    const { state: start, id } = leonisSummon()
    // レオニス帝国 holds アンバリア only
    const owners = Object.fromEntries(Object.entries(start.cityOwners).filter(([city, owner]) => owner !== 'leonis' || city === AMBARIA))
    const { state: marching } = invading(summoned({ ...start, cityOwners: owners }))
    const state = resolveBattle(marching, battleId(marching), 'attacker', [], null, [], always(0), [
      { side: 'attacker', knightId: '015', soldiers: 50 },
    ])
    expect(state.summons[id]).toBeUndefined()
    expect(state.characters[id]).toBeUndefined()
    const destroyed = state.events.find((e) => e.kind === 'factionDestroyed')
    expect(destroyed && 'knights' in destroyed ? destroyed.knights : []).not.toContain(id)
  })
})

describe('recovering', () => {
  it('gets back a tenth of its most HP each economy run in a city, up to the most', () => {
    const { state: start, id } = summoned()
    const hurt = withSummonHp(start, id, 100)
    expect(recoverSummons(hurt).summons[id].hp).toBe(160)
    expect(recoverSummons(withSummonHp(start, id, 590)).summons[id].hp).toBe(600)
    expect(runEconomy(hurt, 2).summons[id].hp).toBe(160)
  })

  it('does not recover away on a move', () => {
    const { state: start, id } = summoned()
    const hurt = withSummonHp(start, id, 100)
    const moving = runMovements(endStrategyPhase(addMoveOrder(hurt, { factionId: 'carta', from: FLUEN, to: SILVA, knights: [id], troops: 0, supplies: 0, solo: false })))
    if (moving.movements.some((m) => m.knights.includes(id))) expect(recoverSummons(moving).summons[id].hp).toBe(100)
    else expect(moving.characters[id].cityId).toBe(SILVA)
  })

  it('is paid no salary', () => {
    const { state, id } = summoned()
    expect(state.characters[id].factionId).toBe('carta')
    expect(runEconomy(state, 2).lastEconomy!.factions.carta.salary).toBe(runEconomy(playing('carta'), 2).lastEconomy!.factions.carta.salary)
  })
})
