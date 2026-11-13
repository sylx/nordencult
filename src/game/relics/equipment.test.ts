import { describe, expect, it } from 'vitest'
import {
  addOrder, battleSpells, debugAddRelic, debugEquipRelic, debugImprison, debugUnequipRelic, endFactionTurn, equipmentOf, equippableKnights, equippableRelics,
  equipProblem, equipRelic, GameRuleError, orderProblem, relicsOf, releaseEquipment, requestPapalRepair, resolveBattle, startNextBattle,
  unequipProblem, unequipRelic, unitTypesOf, type ArmyUnit, type GameState,
} from '..'
import { playing } from '../testing'

const FLUEN = 'P012' // カルタ書院
const AMBARIA = 'P004' // レオニス帝国, next to フルーエン
const ELDRAN = 'P013' // レオニス帝国, next to アシュダール
const ASHDAR = 'P000' // 法王府's only city
/** カルタ書院 starts with a broken ライフル (carta-0) and a repaired one (carta-2) */
const BROKEN_RIFLE = 'carta-0'
const RIFLE = 'carta-2'
/** エルヴィン (016, カルタ書院, knight, フルーエン): leads 歩兵・騎兵 */
const ELWIN = '016'
/** ルカ (027, カルタ書院, hunter, フルーエン) */
const LUCA = '027'
/** クラリス (015, カルタ書院, scholar, フルーエン) */
const CLARIS = '015'
/** バレル (042): a mercenary */
const BARREL = '042'
/** ローザリア's 魔術師: ドレイク (025, 知力 92) and ジネーヴラ (089, 知力 80) */
const DRAKE = '025'
const GINEVRA = '089'
/** 法王府's lord セラフィナ (001), 魔術師 of 知力 95 */
const SERAPHINA = '001'

/** The relics added to the faction's box repaired, and their ids in the order given */
function adding(state: GameState, factionId: string, ...relicIds: string[]): { added: GameState; ids: string[] } {
  const added = relicIds.reduce((next, relicId) => debugAddRelic(next, factionId, relicId, true), state)
  return { added, ids: relicsOf(added, factionId).slice(-relicIds.length).map((item) => item.id) }
}

const itemOf = (state: GameState, factionId: string, itemId: string) => relicsOf(state, factionId).find((item) => item.id === itemId)

/** Every relic worn is worn by a knight serving the faction of its box */
function expectWornByTheirOwn(state: GameState) {
  for (const [factionId, items] of Object.entries(state.relics)) {
    for (const item of items) {
      if (!item.equippedBy) continue
      const knight = state.characters[item.equippedBy.characterId]
      expect(knight, `${item.id}`).toMatchObject({ factionId })
      expect(knight.prisoner || knight.roaming, `${item.id}`).toBeFalsy()
    }
  }
}

function endStrategyPhase(state: GameState): GameState {
  while (state.phase === 'strategy') state = endFactionTurn(state)
  return state
}

const unit = (knightId: string, unitType: string, soldiers = 100): ArmyUnit => ({ knightId, unitType, soldiers })

describe('slots', () => {
  it('are two, empty at first', () => {
    expect(equipmentOf(playing('carta'), ELWIN)).toEqual([null, null])
  })

  it('take a repaired relic of the box, and give it back taking it off', () => {
    const state = equipRelic(playing('carta'), ELWIN, 1, RIFLE)
    expect(equipmentOf(state, ELWIN).map((item) => item?.id ?? null)).toEqual([null, RIFLE])
    expect(itemOf(state, 'carta', RIFLE)?.equippedBy).toEqual({ characterId: ELWIN, slot: 1 })
    const off = unequipRelic(state, ELWIN, 1)
    expect(equipmentOf(off, ELWIN)).toEqual([null, null])
    expect(itemOf(off, 'carta', RIFLE)).toEqual({ id: RIFLE, relicId: 'rifle', repaired: true })
    expect(unequipProblem(off, ELWIN, 1)).toBe('装備していません')
    expect(() => unequipRelic(off, ELWIN, 1)).toThrow(GameRuleError)
  })

  it('swap: the relic in the slot goes back into the box, and one another knight wears comes off them', () => {
    const { added, ids: [gun] } = adding(playing('carta'), 'carta', 'field_gun')
    let state = equipRelic(added, ELWIN, 0, RIFLE)
    state = equipRelic(state, ELWIN, 0, gun)
    expect(itemOf(state, 'carta', RIFLE)?.equippedBy).toBeUndefined()
    expect(equipmentOf(state, ELWIN)[0]?.id).toBe(gun)
    state = equipRelic(state, LUCA, 1, gun)
    expect(equipmentOf(state, ELWIN)).toEqual([null, null])
    expect(equipmentOf(state, LUCA)[1]?.id).toBe(gun)
    // To the other slot of the same knight
    state = equipRelic(state, LUCA, 0, gun)
    expect(equipmentOf(state, LUCA).map((item) => item?.id ?? null)).toEqual([gun, null])
    expect(equipProblem(state, LUCA, 0, gun)).toBe('装備しています')
  })
})

describe('what can be worn', () => {
  it('only repaired relics for equipment, of the knight\'s faction, in a slot there is', () => {
    const { added: state, ids: [gunship] } = adding(playing('carta'), 'carta', 'gunship')
    expect(equipProblem(state, ELWIN, 0, BROKEN_RIFLE)).toBe('修復されていない遺物です')
    expect(equipProblem(state, ELWIN, 0, 'carta-1')).toBe('修復されていない遺物です')
    expect(equipProblem(state, ELWIN, 0, 'nope')).toBe('遺物がありません')
    expect(equipProblem(state, ELWIN, 2, RIFLE)).toBe('装備の枠は2つです')
    expect(equipProblem(state, ELWIN, 0, gunship)).toBe('装備できない遺物です')
    const { added: theirs, ids: [rifle] } = adding(state, 'leonis', 'rifle')
    expect(equipProblem(theirs, ELWIN, 0, rifle)).toBe('遺物がありません')
  })

  it('a ライフル or 大砲 by anyone but 魔術師, a 魔導書 by 魔術師 of the 知力 it asks', () => {
    const { added: state, ids: [rifle, prismatic, thunder] } = adding(playing('rosalia'), 'rosalia', 'rifle', 'grimoire_prismatic', 'grimoire_chain_lightning')
    expect(equipProblem(state, DRAKE, 0, rifle)).toBe('魔術師は装備できません')
    expect(equipProblem(state, DRAKE, 0, prismatic)).toBeNull()
    expect(equipProblem(state, GINEVRA, 0, prismatic)).toBe('知力 90 が必要です')
    expect(equipProblem(state, GINEVRA, 0, thunder)).toBeNull()

    const { added: carta, ids: [grimoire] } = adding(playing('carta'), 'carta', 'grimoire_flame_lance')
    expect(equipProblem(carta, CLARIS, 0, grimoire)).toBe('魔術師だけが装備できます')
  })

  it('not the same relic in both slots, but a ライフル and a 大砲', () => {
    const { added, ids: [rifle, gun] } = adding(playing('carta'), 'carta', 'rifle', 'field_gun')
    let state = equipRelic(added, ELWIN, 0, RIFLE)
    expect(equipProblem(state, ELWIN, 1, rifle)).toBe('同じ遺物をもう一方の枠に装備しています')
    // In place of the one there it can
    expect(equipProblem(state, ELWIN, 0, rifle)).toBeNull()
    state = equipRelic(state, ELWIN, 1, gun)
    expect(unitTypesOf(state, ELWIN)).toEqual(['infantry', 'cavalry', 'rifleman', 'artillery'])
  })

  it('by a knight serving the faction in its turn: not a mercenary, a prisoner, nor one sent on an invasion', () => {
    let state = playing('carta')
    expect(equipProblem(endFactionTurn(state), ELWIN, 0, RIFLE)).toBe('手番ではありません')
    // Hired (the rules of hiring aside)
    const hired: GameState = { ...state, characters: { ...state.characters, [BARREL]: { cityId: FLUEN, factionId: 'carta' } } }
    expect(equipProblem(hired, BARREL, 0, RIFLE)).toBe('傭兵は装備できません')
    expect(equipProblem(debugImprison(state, ELWIN, AMBARIA), ELWIN, 0, RIFLE)).toBe('勢力に仕える騎士ではありません')

    state = equipRelic(state, LUCA, 0, RIFLE)
    const ordered = addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: ELWIN, knights: [ELWIN] })
    expect(equipProblem(ordered, ELWIN, 0, RIFLE)).toBe('侵攻予約中は装備を変えられません')
    const luca = addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: LUCA, knights: [LUCA] })
    expect(equipProblem(luca, ELWIN, 0, RIFLE)).toBe('装備しているルカ・シルヴァが侵攻予約中です')
    expect(unequipProblem(luca, LUCA, 0)).toBe('侵攻予約中は装備を変えられません')
  })

  it('lists the relics a knight can wear and the knights who can wear a relic', () => {
    const { added, ids: [gun] } = adding(playing('carta'), 'carta', 'field_gun')
    expect(equippableRelics(added, ELWIN).map((item) => item.id)).toEqual([RIFLE, gun])
    const state = equipRelic(added, ELWIN, 0, RIFLE)
    // The other knights can take it from the one wearing it
    expect(equippableKnights(state, 'carta', RIFLE)).toEqual(['015', '027', '029', '061', '067', '111', '136'])
    expect(equippableKnights(state, 'carta', BROKEN_RIFLE)).toEqual([])
  })
})

describe('what wearing gives', () => {
  it('leads the unit type of a ライフル, until taken off', () => {
    const draft = { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: ELWIN, knights: [ELWIN], units: [unit(ELWIN, 'rifleman')] }
    let state = playing('carta')
    expect(unitTypesOf(state, ELWIN)).toEqual(['infantry', 'cavalry'])
    expect(orderProblem(state, draft)).toBe(`${ELWIN} はライフル兵を率いられません`)
    state = equipRelic(state, ELWIN, 0, RIFLE)
    expect(unitTypesOf(state, ELWIN)).toEqual(['infantry', 'cavalry', 'rifleman'])
    expect(orderProblem(state, draft)).toBeNull()
    expect(orderProblem(unequipRelic(state, ELWIN, 0), draft)).toBe(`${ELWIN} はライフル兵を率いられません`)
  })

  it('casts the spells of a 魔導書 in battle, those of every slot', () => {
    const { added, ids: [meteor, prismatic] } = adding(playing('sede'), 'sede', 'grimoire_meteor_fall', 'grimoire_prismatic')
    const state = debugEquipRelic(debugEquipRelic(added, SERAPHINA, meteor), SERAPHINA, prismatic)
    const marching = startNextBattle(endStrategyPhase(addOrder(playing('leonis'), {
      factionId: 'leonis', from: ELDRAN, to: ASHDAR, commander: '038', knights: ['038'],
    })))
    const battle = marching.march!.current!
    expect(battle.defender.knights).toContain(SERAPHINA)
    const worn: GameState = { ...marching, relics: state.relics }
    expect(battleSpells(worn, battle)).toEqual({ [SERAPHINA]: ['meteorFall', 'thorHammer', 'flameLance', 'frostNova', 'earthSpike'] })
    expect(battleSpells(marching, battle)).toEqual({})
  })
})

describe('knights leaving the faction', () => {
  it('give back what they wear when taken prisoner', () => {
    let state = equipRelic(playing('carta'), ELWIN, 0, RIFLE)
    state = debugImprison(state, ELWIN, AMBARIA)
    expect(itemOf(state, 'carta', RIFLE)?.equippedBy).toBeUndefined()
    expectWornByTheirOwn(state)
  })

  it('give it back captured in a battle, into the box of the faction they served', () => {
    let state = equipRelic(playing('carta'), ELWIN, 0, RIFLE)
    state = addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: CLARIS, knights: [CLARIS, ELWIN] })
    const marching = startNextBattle(endStrategyPhase(state))
    const lost = resolveBattle(marching, marching.march!.current!.id, 'defender', [{ side: 'attacker', knightId: ELWIN, to: FLUEN, captured: true }])
    expect(lost.characters[ELWIN]).toMatchObject({ prisoner: true })
    expect(itemOf(lost, 'carta', RIFLE)).toEqual({ id: RIFLE, relicId: 'rifle', repaired: true })
    expect(relicsOf(lost, 'leonis').some((item) => item.id === RIFLE)).toBe(false)
    expectWornByTheirOwn(lost)
    // Those who came back keep theirs
    const back = resolveBattle(marching, marching.march!.current!.id, 'defender')
    expect(itemOf(back, 'carta', RIFLE)?.equippedBy).toEqual({ characterId: ELWIN, slot: 0 })
  })

  it('wandering as their faction falls: its relics go to the faction that took its last city, nobody wearing them', () => {
    const { added, ids: [meteor] } = adding(playing('leonis'), 'sede', 'grimoire_meteor_fall')
    const state = debugEquipRelic(added, SERAPHINA, meteor)
    expect(itemOf(state, 'sede', meteor)?.equippedBy).toEqual({ characterId: SERAPHINA, slot: 0 })
    const marching = startNextBattle(endStrategyPhase(addOrder(state, { factionId: 'leonis', from: ELDRAN, to: ASHDAR, commander: '038', knights: ['038'] })))
    const fallen = resolveBattle(marching, marching.march!.current!.id, 'attacker')
    expect(fallen.characters[SERAPHINA]).toMatchObject({ roaming: ASHDAR })
    expect(itemOf(fallen, 'leonis', meteor)).toEqual({ id: meteor, relicId: 'grimoire_meteor_fall', repaired: true })
    expectWornByTheirOwn(fallen)
  })

  it('releaseEquipment changes nothing when every knight wearing a relic still serves', () => {
    const state = equipRelic(playing('carta'), ELWIN, 0, RIFLE)
    expect(releaseEquipment(state)).toBe(state)
  })
})

describe('debugging', () => {
  it('wears and takes off whatever the turn, in the first empty slot by default', () => {
    const { added, ids: [gun] } = adding(endFactionTurn(playing('carta')), 'carta', 'field_gun')
    let state = debugEquipRelic(debugEquipRelic(added, ELWIN, RIFLE), ELWIN, gun)
    expect(equipmentOf(state, ELWIN).map((item) => item?.id)).toEqual([RIFLE, gun])
    expect(state.activeFaction).not.toBe('carta')
    state = debugUnequipRelic(state, ELWIN, 0)
    expect(equipmentOf(state, ELWIN).map((item) => item?.id ?? null)).toEqual([null, gun])
    expect(() => debugEquipRelic(state, ELWIN, BROKEN_RIFLE)).toThrow(GameRuleError)
  })

  it('a 法王府 repair stays a broken relic', () => {
    const state = requestPapalRepair({ ...playing('carta'), gold: { carta: 100000 } }, 'carta', BROKEN_RIFLE)
    expect(equipProblem(state, ELWIN, 0, BROKEN_RIFLE)).toBe('修復されていない遺物です')
  })
})
