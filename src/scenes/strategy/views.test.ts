import { describe, expect, it, vi } from 'vitest'
import { addOrder, debugAddRelic, defaultUnitType, endFactionTurn, equipRelic, hireMercenary, orderProblem, relicsOf, requestPapalRepair, startConstruction, startRelicProduction, startRelicRepair, withRelics, type GameState } from '../../game'
import { playing } from '../../game/testing'
import { RELIC_MAP, relicRarity } from '../../data/relics'
import { UNIT_TYPE_MAP } from '../../data/unitTypes'
import { buildOptions, cityView, equipCandidatesView, equipOptionsView, eventView, knightView, mercenaryContracts, mercenaryOffers, relicOptions, relicProductionsView, relicsView, relicWorkLabel } from './views'

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

describe('equipment', () => {
  // カルタ書院 starts with a repaired ライフル (carta-2); エルヴィン (016), ルカ (027) and クラリス (015) serve in フルーエン
  const REPAIRED_RIFLE = 'carta-2'
  const worn = () => equipRelic(playing('carta'), '027', 1, REPAIRED_RIFLE)

  it('shows a knight\'s slots, which change only in their faction\'s turn', () => {
    expect(knightView(playing('carta'), '016').equipment).toEqual({ slots: [null, null], unavailableReason: undefined })
    const state = worn()
    expect(knightView(state, '027').equipment?.slots[1]).toMatchObject({ id: REPAIRED_RIFLE, name: 'ライフル', effects: ['ライフル兵を率いる'] })
    expect(knightView(endFactionTurn(state), '027').equipment?.unavailableReason).toBe('手番ではありません')
    expect(knightView(state, '013').equipment?.unavailableReason).toBe('他勢力の騎士です')
    expect(knightView(addOrder(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: '027', knights: ['027'] }), '027').equipment?.unavailableReason)
      .toBe('侵攻予約中は装備を変えられません')
  })

  it('shows the relic worn, by whom, what it gives, and putting it on or taking it off', () => {
    const rifle = relicsView(worn(), 'carta', FLUEN).find((relic) => relic.id === REPAIRED_RIFLE)
    expect(rifle).toMatchObject({
      status: 'equipped', wearerName: 'ルカ・シルヴァ', effects: ['ライフル兵を率いる', '魔術師以外が装備できる'],
      equip: { unavailableReason: undefined }, unequip: { unavailableReason: undefined },
    })
    const broken = relicsView(worn(), 'carta', FLUEN).find((relic) => relic.id === RIFLE)
    expect(broken?.equip).toBeUndefined()
    expect(relicsView(endFactionTurn(worn()), 'carta', FLUEN).find((relic) => relic.id === REPAIRED_RIFLE)?.equip?.unavailableReason).toBe('手番ではありません')
  })

  it('lists the relics for a slot, who wears each and why one cannot go in it', () => {
    const state = debugAddRelic(worn(), 'carta', 'grimoire_flame_lance', true)
    const grimoire = relicsOf(state, 'carta').at(-1)!.id
    expect(equipOptionsView(state, '016', 0).map(({ id, label, disabledReason }) => [id, label, disabledReason])).toEqual([
      [REPAIRED_RIFLE, 'ルカ・シルヴァが装備中', undefined],
      [grimoire, '魔法: フレイムランス・知力 70 以上の魔術師が装備できる', '魔術師だけが装備できます'],
    ])
  })

  it('lists the knights a relic can be put on, the one wearing it and those who cannot with why', () => {
    const candidates = equipCandidatesView(worn(), 'carta', REPAIRED_RIFLE)
    const of = (id: string) => candidates.find((c) => c.knight.id === id)!
    expect(of('016')).toMatchObject({ unavailableReason: undefined, slots: [{ relic: null }, { relic: null }] })
    expect(of('027')).toMatchObject({ unavailableReason: '装備しています', slots: [{ relic: null }, { relic: { id: REPAIRED_RIFLE } }] })
    expect(candidates.map((c) => c.knight.id)).not.toContain('013')
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

  describe('a building using a relic (施設の遺物)', () => {
    /** カルタ書院's バリスタ repaired, and the gold to build */
    const ready = (): GameState => {
      const state = playing('carta')
      const repaired = withRelics(state, 'carta', relicsOf(state, 'carta').map((i) => (i.id === BALLISTA ? { ...i, repaired: true } : i)))
      return { ...repaired, gold: { ...repaired.gold, carta: 10000 } }
    }
    const ballistaIn = (state: GameState, cityId: string) => buildOptions(state, cityId).find((b) => b.id === 'ballista')

    it('is offered with the relic it uses once the faction has it repaired', () => {
      expect(ballistaIn(playing('carta'), FLUEN)).toMatchObject({ locked: true, unavailableReason: '遺物「バリスタ」が必要です' })
      expect(ballistaIn(ready(), FLUEN)).toMatchObject({ locked: false, relicNote: '遺物：バリスタを 1 つ使用' })
      expect(ballistaIn(ready(), FLUEN)?.unavailableReason).toBeUndefined()
    })

    it('shows the relic in use in the construction, the box and the other cities', () => {
      const state = startConstruction(ready(), FLUEN, 'ballista')
      expect(cityView(state, FLUEN).buildings?.construction).toMatchObject({ kind: 'building', building: { id: 'ballista' }, relicNote: '遺物：バリスタを使用中' })
      expect(ballistaIn(state, SILVA)?.unavailableReason).toBe('遺物「バリスタ」はほかの都市の建設に使っています')
      expect(relicsView(state, 'carta', FLUEN).find((r) => r.id === BALLISTA)).toMatchObject({ status: 'building', cityName: 'フルーエン', buildingName: 'バリスタ' })
      expect(relicsView(ready(), 'carta', FLUEN).find((r) => r.id === BALLISTA)).toMatchObject({ status: 'repaired', buildingName: 'バリスタ' })
    })
  })
})

describe('the mercenaries', () => {
  const BARREL = '042' // ドゥンダリン盾隊 (2000 gold, 600 soldiers), in フルーエン
  /** カルタ書院 playing, フルーエン with a 酒場 to hire mercenaries at */
  const withTavern = (): GameState => {
    const state = playing('carta')
    return { ...state, cities: { ...state.cities, [FLUEN]: { ...state.cities[FLUEN], buildings: [...state.cities[FLUEN].buildings, 'tavern'] } } }
  }
  const rich = (): GameState => {
    const state = withTavern()
    return { ...state, gold: { ...state.gold, carta: 100000 } }
  }

  it('offers those within reach, with their rank and why one cannot be talked to', () => {
    const offers = mercenaryOffers(rich(), FLUEN)
    expect(offers.find((o) => o.knight.id === BARREL)).toMatchObject({
      company: 'ドゥンダリン盾隊', unitType: UNIT_TYPE_MAP[defaultUnitType(BARREL)].name, soldiers: 600, maxSoldiers: 600, rank: 'C', cityName: 'フルーエン',
    })
    expect(offers.find((o) => o.knight.id === BARREL)).not.toHaveProperty('fee')
    // Short of gold, the contract can still be talked over: the hiring scene tells it
    const poor = withTavern()
    const none = { ...poor, gold: { ...poor.gold, carta: 0 } }
    expect(mercenaryOffers(none, FLUEN).find((o) => o.knight.id === BARREL)?.unavailableReason).toBeUndefined()
    // Those who will not sign can still be talked to: they turn the faction away in the hiring scene
    const proud = { ...rich(), mercenaryStanding: { carta: -100 } }
    expect(mercenaryOffers(proud, FLUEN).find((o) => o.knight.id === BARREL)?.unavailableReason).toBeUndefined()
  })

  it('marks a mercenary in the city they serve in, and lists their contract', () => {
    const state = hireMercenary(rich(), FLUEN, BARREL)
    expect(cityView(state, FLUEN).knights?.find((k) => k.id === BARREL)?.mercenary).toMatchObject({ company: 'ドゥンダリン盾隊', soldiers: 600, maxSoldiers: 600, monthly: 334, months: 0 })
    expect(knightView(rich(), BARREL).mercenary?.monthly).toBeUndefined()
    expect(knightView(state, '015').mercenary).toBeUndefined()
    expect(mercenaryContracts(state, 'carta')).toMatchObject([{
      company: 'ドゥンダリン盾隊', unitType: UNIT_TYPE_MAP[defaultUnitType(BARREL)].name, unitImage: expect.any(String), cityName: 'フルーエン', rank: 'C', monthly: 334, months: 0,
    }])
    expect(orderProblem(state, { factionId: 'carta', from: FLUEN, to: AMBARIA, commander: BARREL, knights: [BARREL] })).toBe('傭兵は軍団長になれません')
  })
})

describe('the notices', () => {
  it('tells a renewal asked for and a contract ended for want of the fee', () => {
    const renewal = eventView({ id: 'e', kind: 'mercenaryRenewal', turn: 7, factionId: 'carta', characterId: '042', gold: 500 })
    expect(renewal).toMatchObject({ title: '傭兵の契約更新', details: [{ label: '更新料', value: '金 500' }], knights: ['042'] })
    expect(eventView({ id: 'e', kind: 'mercenaryUnpaid', turn: 7, factionId: 'carta', characterId: '042' }).message).toContain('ドゥンダリン盾隊')
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
    expect(relicWorkLabel({ kind: 'building', buildingId: 'gunship', relicItemId: 'relic-1' })).toBe('ガンシップの建設（遺物：ガンシップ）')
  })
})
