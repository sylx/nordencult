import { describe, expect, it, vi } from 'vitest'
import { defaultUnitType, hireMercenary, orderProblem, requestPapalRepair, startRelicProduction, startRelicRepair, type GameState } from '../../game'
import { playing } from '../../game/testing'
import { RELIC_MAP, relicRarity } from '../../data/relics'
import { UNIT_TYPE_MAP } from '../../data/unitTypes'
import { buildOptions, cityView, eventView, knightView, mercenaryContracts, mercenaryOffers, relicOptions, relicProductionsView, relicsView, relicWorkLabel } from './views'

// Neither is drawn here: the battle's runtime needs a window, and the picture of a knight its sheets
vi.mock('@norden/battle-runtime', () => ({}))
vi.mock('../../components/CharacterImage', () => ({ CharacterImage: () => null }))

const FLUEN = 'P012' // カルタ書院
const SILVA = 'P026' // カルタ書院
const AMBARIA = 'P004' // レオニス帝国
const RIFLE = 'carta-0'
const BALLISTA = 'carta-1'

const researched = (state: GameState, ...techs: string[]): GameState =>
  ({ ...state, research: { ...state.research, carta: { ...state.research.carta, researched: techs } } })

describe('the relic screen', () => {
  it('shows the box with what can be done with each relic and why not', () => {
    const [rifle, ballista] = relicsView(playing('carta'), 'carta', FLUEN)
    expect(rifle).toMatchObject({
      id: RIFLE, status: 'broken', name: '壊れたライフル', rarity: relicRarity(RELIC_MAP.rifle, false), useLabel: '装備', dismantle: { points: RELIC_MAP.rifle.dismantlePoints },
      repair: { supplies: RELIC_MAP.rifle.repair!.supplies, gold: RELIC_MAP.rifle.repair!.gold, unavailableReason: '技術「ライフル」の研究が必要です' },
      papalRepair: { unavailableReason: undefined },
    })
    expect(rifle.image).toMatchObject({ ...RELIC_MAP.rifle.brokenSprite, width: 256, height: 384 })
    expect(ballista.repair?.unavailableReason).toBeUndefined()
    expect(ballista.repair?.turns).toBeGreaterThan(0)
    expect(relicsView(playing('carta'), 'carta', AMBARIA)[1].repair?.unavailableReason).toBe('自勢力の都市ではありません')
  })

  it('shows those being repaired or produced in the cities, and 法王府\'s', () => {
    let state = researched(playing('carta'), 'physical_civ', 'gunpowder', 'rifle', 'rifle_production')
    state = startRelicRepair(state, FLUEN, BALLISTA)
    state = startRelicProduction(state, SILVA, 'rifle')
    state = requestPapalRepair(state, 'carta', RIFLE)
    const brokenRifle = relicRarity(RELIC_MAP.rifle, false)
    const brokenBallista = relicRarity(RELIC_MAP.ballista, false)
    expect(relicsView(state, 'carta', FLUEN).map(({ status, name, cityName, rarity }) => [status, name, cityName, rarity])).toEqual([
      ['papalRepair', '壊れたライフル', undefined, brokenRifle], ['repaired', 'ライフル', undefined, RELIC_MAP.rifle.rarity],
      ['repairing', '壊れたバリスタ', 'フルーエン', brokenBallista], ['producing', 'ライフル', cityView(state, SILVA).name, RELIC_MAP.rifle.rarity],
    ])
  })

  it('lists what the faction can produce, with why not in the city', () => {
    expect(relicProductionsView(playing('carta'), 'carta', FLUEN)).toEqual([])
    const state = startRelicRepair(researched(playing('carta'), 'fire_magic'), FLUEN, BALLISTA)
    expect(relicProductionsView(state, 'carta', FLUEN)).toEqual([expect.objectContaining({ id: 'grimoire_flame_lance', unavailableReason: 'ほかの遺物を修復中です' })])
    expect(relicProductionsView(state, 'carta', SILVA)[0].unavailableReason).toBeUndefined()
  })
})

describe('the domestic screen', () => {
  it('offers the relics the faction has the technology for', () => {
    const state = playing('carta')
    expect(relicOptions(state, FLUEN).map(({ id, kind, name }) => [id, kind, name])).toEqual([[BALLISTA, 'relicRepair', '壊れたバリスタ']])
    const skilled = researched(state, 'rifle', 'rifle_production')
    expect(relicOptions(skilled, FLUEN).map(({ id, kind }) => [id, kind])).toEqual([[RIFLE, 'relicRepair'], [BALLISTA, 'relicRepair'], ['rifle', 'relicProduction']])
  })

  it('shows a relic being repaired as the city\'s construction, keeping the buildings on offer', () => {
    const state = startRelicRepair(playing('carta'), FLUEN, BALLISTA)
    expect(cityView(state, FLUEN).buildings?.construction).toMatchObject({
      kind: 'relicRepair', building: { id: 'ballista', name: '壊れたバリスタ' }, invested: 0, required: RELIC_MAP.ballista.repair!.supplies,
    })
    const option = buildOptions(state, FLUEN).find((b) => !b.locked)
    expect(option?.unavailableReason).toBe('ほかの遺物を修復中です')
  })
})

describe('the mercenaries', () => {
  const BARREL = '042' // 樽盾団, in フルーエン
  const rich = (): GameState => {
    const state = playing('carta')
    return { ...state, gold: { ...state.gold, carta: 100000 } }
  }

  it('offers those within reach, with what they cost and why one cannot be hired', () => {
    const offers = mercenaryOffers(rich(), FLUEN)
    expect(offers.find((o) => o.knight.id === BARREL)).toMatchObject({
      company: '樽盾団', unitType: UNIT_TYPE_MAP[defaultUnitType(BARREL)].name, soldiers: 500, maxSoldiers: 500, fee: 1000, monthly: 167, cityName: 'フルーエン',
    })
    const poor = playing('carta')
    const none = { ...poor, gold: { ...poor.gold, carta: 0 } }
    expect(mercenaryOffers(none, FLUEN).find((o) => o.knight.id === BARREL)?.unavailableReason).toBe('金が足りません')
  })

  it('marks a mercenary in the city they serve in, and lists their contract', () => {
    const state = hireMercenary(rich(), FLUEN, BARREL)
    expect(cityView(state, FLUEN).knights?.find((k) => k.id === BARREL)?.mercenary).toMatchObject({ company: '樽盾団', soldiers: 500, maxSoldiers: 500, monthly: 167 })
    expect(knightView(rich(), BARREL).mercenary?.monthly).toBeUndefined()
    expect(knightView(state, '015').mercenary).toBeUndefined()
    expect(mercenaryContracts(state, 'carta')).toMatchObject([{
      company: '樽盾団', unitType: UNIT_TYPE_MAP[defaultUnitType(BARREL)].name, unitImage: expect.any(String), cityName: 'フルーエン', monthly: 167, months: 0,
    }])
    expect(orderProblem(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: BARREL, knights: [BARREL] })).toBe('傭兵は軍団長になれません')
  })
})

describe('the notices', () => {
  it('tells a renewal asked for and a contract ended for want of the fee', () => {
    const renewal = eventView({ id: 'e', kind: 'mercenaryRenewal', turn: 7, factionId: 'carta', characterId: '042', gold: 500 })
    expect(renewal).toMatchObject({ title: '傭兵の契約更新', details: [{ label: '更新料', value: '金 500' }], knights: ['042'] })
    expect(eventView({ id: 'e', kind: 'mercenaryUnpaid', turn: 7, factionId: 'carta', characterId: '042' }).message).toContain('樽盾団')
  })

  it('tells a relic completed with its picture repaired', () => {
    const inCity = eventView({ id: 'e', kind: 'relicCompleted', turn: 2, factionId: 'carta', relicId: 'rifle', cityId: FLUEN })
    expect(inCity).toMatchObject({ sound: 'complete', title: '遺物の完成', message: 'ライフルが完成しました。', details: [{ label: '場所', value: 'フルーエン' }, { label: '使い道', value: '装備' }] })
    expect(inCity.picture?.image).toMatchObject(RELIC_MAP.rifle.sprite!)
    const papal = eventView({ id: 'e', kind: 'relicCompleted', turn: 2, factionId: 'carta', relicId: 'rifle', cityId: null })
    expect(papal.details[0]).toEqual({ label: '場所', value: '法王府' })
  })

  it('names what was lost with a city', () => {
    expect(relicWorkLabel({ kind: 'relicRepair', relicId: 'rifle' })).toBe('壊れたライフルの修復')
    expect(relicWorkLabel({ kind: 'relicProduction', relicId: 'rifle' })).toBe('ライフルの生産')
  })
})
