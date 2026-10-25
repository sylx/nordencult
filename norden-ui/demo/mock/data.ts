import type { BuildOptionView, BuildingView, CityBuildingsView, CityHistoryView, CityStatView, CityView, FactionSummaryView, FactionView, KnightView, PopulationGrowthView, TurnView, UnitTypeView } from '../../src'
import { createElement } from 'react'
import { repositoryBuildings, type BuildingSpec } from '../repositoryBuildings'
import { repositoryCharacters, RepositoryCharacterArt, RepositoryPortrait } from '../repositoryCharacters'

/** Demo-only data. The game passes its own state converted into the same view types */

const emblem = (color: string, mark: string) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48"><path d="M3 3h34v21c0 11-8 18-17 21C11 42 3 35 3 24z" fill="${color}" stroke="#d8b25a" stroke-width="3"/><text x="20" y="31" font-size="18" text-anchor="middle" fill="#f6e7c0" font-family="serif">${mark}</text></svg>`,
)}`

export interface MockFaction extends FactionView { id: string; color: string }

export const FACTIONS: Record<string, MockFaction> = {
  carta: { id: 'carta', name: 'カルタ書院', color: '#5a3a7a', emblem: emblem('#5a3a7a', '書') },
  leonis: { id: 'leonis', name: 'レオニス帝国', color: '#a83a2a', emblem: emblem('#a83a2a', '獅') },
  esuhara: { id: 'esuhara', name: 'エスハラ法王府', color: '#2a6a8a', emblem: emblem('#2a6a8a', '灰') },
}

export const PLAYER = 'carta'

export interface MockKnight extends KnightView { cityId: string }

// Keep the scenario's names while using actual game character artwork for its cast.
const characterIds: Record<string, string> = { k1: '029', k2: '016', k3: '011', k4: '001', k5: '019', k6: '015', k7: '017', k8: '024', k9: '003' }
const characterFor = (id: string) => repositoryCharacters.find(character => character.id === characterIds[id])

// The game's rule: anyone can lead 歩兵, and each class one more unit type
const classUnitTypes: Record<string, string[]> = { 騎士: ['infantry', 'cavalry'], 狩人: ['infantry', 'archer'], 魔法使い: ['infantry', 'mage'] }

// 政治・魅力, which the domestic screen weighs its lord and officers by
const domesticAbilities: Record<string, [politics: number, charm: number]> = {
  k1: [96, 89], k2: [38, 72], k3: [55, 64], k4: [70, 81], k5: [48, 66], k6: [84, 58], k7: [30, 52], k8: [62, 70], k9: [74, 90],
}

// 略歴, which names others by their character ids, as the game's data does
const profiles: Record<string, Pick<KnightView, 'biography'>> = {
  k1: { biography: 'カルタ書院の院長。書庫の鍵を自ら持ち歩き、夜更けまで写本に目を通す。エルネスト（016）の剣とリディア（011）の弓を信頼し、法王府のセラフィナ（001）とは今も書簡を交わしている。' },
  k2: { biography: '傭兵崩れの騎士。食い詰めていたところをマルクス（029）に拾われた。幼なじみのミラ（015）には頭が上がらない。' },
  k3: { biography: '北の森で育った狩人。グレゴール（017）とは古い因縁があり、その名を聞くと黙り込む。' },
  k4: { biography: '灰座に仕える巫女魔法師。ルチア（003）に魔法の手ほどきをした。' },
  k5: { biography: '辺境の砦を預かる領主。ハインツ（024）とは同じ年に叙任された。' },
  k6: { biography: '書院の学者。エルネスト（016）のことを「放っておけない」と言う。' },
  k7: { biography: '鉄の騎士と恐れられる。逃げたリディア（011）を今も追っている。' },
  k8: { biography: 'オスカー（019）と並ぶ古参の騎士。' },
  k9: { biography: 'セラフィナ（001）に魔法を学んだ。師を超えることだけを考えている。' },
}

const knight = (id: string, name: string, cityId: string, subtitle: string, leadership: number, strength: number, intelligence: number,
  defaultUnitType?: string): MockKnight => {
  const character = characterFor(id)
  return {
    id, name, cityId, subtitle, defaultUnitType,
    unitTypes: classUnitTypes[subtitle.split(' / ')[0] ?? ''] ?? ['infantry'],
    commandRank: subtitle.includes('領主') ? 1 : undefined,
    portrait: character ? createElement(RepositoryPortrait, { character }) : undefined,
    image: character ? createElement(RepositoryCharacterArt, { character }) : undefined,
    ...profiles[id],
    stats: [{ label: '統率', value: leadership }, { label: '武力', value: strength }, { label: '知力', value: intelligence }],
    abilities: { leadership, strength, intelligence, politics: domesticAbilities[id]?.[0], charm: domesticAbilities[id]?.[1] },
  }
}

export const KNIGHTS: MockKnight[] = [
  knight('k1', 'マルクス・カルタ', 'P012', '政治家 / 領主', 62, 40, 88),
  knight('k2', 'エルネスト・ヴァイス', 'P012', '騎士', 84, 86, 52, 'cavalry'),
  knight('k3', 'リディア・ハーン', 'P012', '狩人', 70, 74, 60, 'archer'),
  knight('k4', 'セラフィナ・ルクス', 'P012', '魔法使い', 73, 9, 95, 'mage'),
  knight('k5', 'オスカー・ブラント', 'P010', '騎士 / 領主', 78, 80, 45),
  knight('k6', 'ミラ・ゼーフェルト', 'P010', '学者', 40, 22, 90),
  knight('k7', 'グレゴール・アイゼン', 'P004', '騎士 / 領主', 81, 88, 40),
  knight('k8', 'ハインツ・ヴォルフ', 'P006', '騎士 / 領主', 75, 79, 58),
  knight('k9', 'ルチア・ベルネ', 'P021', '魔法使い / 領主', 66, 15, 92),
]

/** Prisoners (捕虜) held in the player's cities: knights of other factions, with the faction they served */
const PRISONERS: (MockKnight & Pick<KnightView, 'faction'>)[] = [
  { ...knight('k10', 'ヴァルター・グラウ', 'P010', '騎士', 72, 81, 44), faction: FACTIONS.leonis },
  { ...knight('k11', 'イルザ・ノイマン', 'P010', '狩人', 58, 66, 71), faction: FACTIONS.leonis },
  { ...knight('k12', 'ベルトラム・ケスラー', 'P012', '学者', 35, 18, 87), faction: null },
]

export const prisonersIn = (id: string): KnightView[] => PRISONERS.filter(item => item.cityId === id)

/** A knight by their id, or by the character id a 略歴 names them by */
export function knightOf(id: string): KnightView | undefined {
  const found = KNIGHTS.find(item => item.id === id || characterIds[item.id] === id)
  const owner = found && CITY_MAP[found.cityId]?.owner
  return found && { ...found, faction: owner ? FACTIONS[owner] : null, location: CITY_MAP[found.cityId]?.name }
}

export interface MockCity extends Omit<CityView, 'knights' | 'neighbours' | 'faction'> {
  owner?: string
  /** Position on the mock map, in % */
  at: { x: number; y: number }
  /** Soldiers stationed (shared by the armies leaving the city) */
  soldiers: number
}

/** 商業・生産 (with the base before bonuses) */
const stats = (market: number, production: number, base?: { market: number; production: number }) => [
  { label: '商業', value: market, max: 1000, base: base?.market },
  { label: '生産', value: production, max: 1000, base: base?.production },
]

export type MockBuildingSpec = BuildingSpec

/** Used when the catalog runs outside the game's repository (the same ids as the game's data) */
const MOCK_BUILDING_SPECS: MockBuildingSpec[] = [
  { id: 'market', name: '市場', description: '週に一度、近在の農家が荷車を連ねてやって来る。', effects: ['商業 +5%'], supplies: 400, gold: 100 },
  { id: 'grand_market', name: '大市場', description: '屋根付きの通りに常設の店が並ぶ。', effects: ['商業 +10%'], supplies: 1000, gold: 250, upgradeFrom: 'market' },
  { id: 'workshop', name: '工房', description: '親方と徒弟が一つ屋根の下で鎚を振るう。', effects: ['生産 +5%'], supplies: 400, gold: 120 },
  { id: 'artisans_quarter', name: '職人街', description: '煙と槌音の絶えない一角。', effects: ['生産 +10%'], supplies: 1000, gold: 280, upgradeFrom: 'workshop' },
  { id: 'drill', name: '練兵場', description: '朝から号令と木剣の打ち合う音が響く。', effects: ['訓練 +10%', '新兵の練度 +5'], supplies: 600, gold: 150 },
  { id: 'warehouse', name: '倉庫', description: '麦袋と樽が天井まで積まれている。', effects: ['物資の保存上限が上がる'], supplies: 500, gold: 80 },
  { id: 'port', name: '港', description: '潮の香りと積み荷の掛け声。', effects: ['商業 +5%', '交易路 +2'], supplies: 700, gold: 200, requiredTags: ['港湾'] },
  { id: 'chapel_of_emissaries', name: '聖堂使節館', description: '灰都から遣わされた使者が逗留する館。', effects: ['人口の伸び +5%'], supplies: 800, gold: 250 },
  { id: 'cannon', name: '据付大砲', description: '城壁に据えた鋼の筒。', effects: ['射程5の砲撃'], supplies: 1200, gold: 400, requiredRelic: '大砲の設計図' },
]

/** The game's buildings (norden-data's export) inside its repository, otherwise the mock ones */
export const BUILDING_SPECS: MockBuildingSpec[] = repositoryBuildings ?? MOCK_BUILDING_SPECS

export const BUILDINGS: Record<string, MockBuildingSpec> = Object.fromEntries(BUILDING_SPECS.map(spec => [spec.id, spec]))

/** The buildings upgraded from a building, directly or through others */
function upgradesOf(id: string): string[] {
  const found: string[] = []
  const walk = (from: string) => {
    for (const spec of BUILDING_SPECS) {
      if (spec.upgradeFrom === from && !found.includes(spec.id)) {
        found.push(spec.id)
        walk(spec.id)
      }
    }
  }
  walk(id)
  return found
}

/**
 * Whether the city cannot build it at all yet (a tag or relic it needs is missing, the building it
 * upgrades is not standing, or it has been upgraded past): such buildings are kept out of the lists
 */
function isLocked(city: CityView, spec: MockBuildingSpec): boolean {
  const built = city.buildings?.built.map(item => item.id) ?? []
  const tags = city.tags ?? []
  return upgradesOf(spec.id).some(id => built.includes(id))
    || Boolean(spec.requiredTags && !spec.requiredTags.some(tag => tags.includes(tag)))
    || Boolean(spec.requiredRelic)
    || Boolean(spec.upgradeFrom && !built.includes(spec.upgradeFrom))
}

/** Why a building cannot be started, following the game's rules (src/game/economy/domestic.ts) */
function buildProblem(city: CityView, spec: MockBuildingSpec, gold: number): string | undefined {
  const built = city.buildings?.built.map(item => item.id) ?? []
  const upgraded = upgradesOf(spec.id).find(id => built.includes(id))
  if (upgraded) return `${BUILDINGS[upgraded]?.name ?? upgraded}が建っています`
  const tags = city.tags ?? []
  if (spec.requiredTags && !spec.requiredTags.some(tag => tags.includes(tag))) return `${spec.requiredTags.join('・')}の都市で建てられます`
  if (spec.requiredRelic) return `遺物「${spec.requiredRelic}」が必要です`
  if (spec.upgradeFrom) {
    if (!built.includes(spec.upgradeFrom)) return `${BUILDINGS[spec.upgradeFrom]?.name ?? spec.upgradeFrom}がある都市で建てられます`
  } else if (built.length >= (city.buildings?.slots ?? 0)) {
    return '施設の空きがありません'
  }
  if (city.buildings?.construction) return 'ほかの施設を建設中です'
  if (gold < spec.gold) return '金が足りません'
  return undefined
}

export function buildOptionsFor(city: CityView, gold = FACTION_SUMMARY.gold): BuildOptionView[] {
  const builtIds = new Set(city.buildings?.built.map(item => item.id) ?? [])
  const constructingId = city.buildings?.construction?.building.id
  const production = city.stats?.find(stat => stat.label === '生産')?.value ?? 0
  return BUILDING_SPECS
    .filter(spec => !builtIds.has(spec.id) && spec.id !== constructingId)
    .map(spec => ({
      ...spec,
      turns: production > 0 ? Math.ceil(spec.supplies / production) : null,
      unavailableReason: buildProblem(city, spec, gold),
      locked: isLocked(city, spec),
    }))
}

/** The buildings of a city after one is completed: an upgrade takes the place of the building it was built over */
export function withCompleted(built: readonly BuildingView[], building: BuildingView): BuildingView[] {
  const replaced = BUILDINGS[building.id]?.upgradeFrom
  return replaced && built.some(item => item.id === replaced)
    ? built.map(item => (item.id === replaced ? building : item))
    : [...built, building]
}

/** Morale of new recruits before buildings (the game's RECRUIT_MORALE) */
const RECRUIT_MORALE = 20

/** A building's effect on a stat read from its text (e.g. 商業 +5%) */
function effectOn(building: BuildingView, label: string): { value: number; percent: boolean; text: string } | undefined {
  for (const text of building.effects ?? []) {
    const match = /^(.+) ([+-]\d+)(%?)$/.exec(text)
    if (match?.[1] === label) return { value: Number(match[2]), percent: match[3] === '%', text }
  }
  return undefined
}

/**
 * The domestic screen's bars: 商業・生産 with the buildings' bonus worked out from their effects on
 * the base (what is left of the city's bonus going to the governor), the soldiers' 練度 and 新兵の練度
 */
export function domesticStatsFor(city: CityView): CityStatView[] {
  const built = city.buildings?.built ?? []
  const buildingBoost = (label: string, base: number) => {
    const parts = built.flatMap(building => {
      const effect = effectOn(building, label)
      return effect ? [{ name: building.name, ...effect, amount: effect.percent ? base * effect.value / 100 : effect.value }] : []
    })
    return {
      label: '施設',
      source: 'building' as const,
      value: Math.round(parts.reduce((sum, part) => sum + part.amount, 0)),
      details: parts.map(part => `${part.name}: ${part.text}`),
    }
  }
  const boosted = (stat: CityStatView): CityStatView => {
    const base = stat.base ?? stat.value
    const buildings = buildingBoost(stat.label, base)
    const governor = stat.base === undefined ? 0 : Math.max(0, stat.value - stat.base - buildings.value)
    return {
      ...stat,
      base,
      value: base + governor + buildings.value,
      boosts: [...(governor ? [{ label: '領主', value: governor, details: city.lord ? [city.lord.name] : [] }] : []), buildings],
    }
  }
  const morale = buildingBoost('新兵の練度', RECRUIT_MORALE)
  const training = buildingBoost('訓練', 0)
  return [
    ...(city.stats ?? []).map(boosted),
    { label: '練度', kind: 'morale', value: city.troopMorale ?? 0, max: 100, notes: training.details.length > 0 ? training.details : undefined },
    { label: '新兵の練度', kind: 'morale', value: RECRUIT_MORALE + morale.value, max: 100, base: RECRUIT_MORALE, boosts: [morale] },
  ]
}

/**
 * A rough population growth in the game's shape: (商業 × 0.5 + 生産 × 0.2 + 施設 × 50) × a lord's boost,
 * and the turns until the next tier (at 10000 and 30000) at that growth
 */
export function populationGrowthFor(city: CityView): PopulationGrowthView {
  const base = (label: string) => city.stats?.find(stat => stat.label === label)?.base ?? 0
  const built = city.buildings?.built.length ?? 0
  const economy = base('商業') * 0.5 + base('生産') * 0.2
  const boost = city.lord ? 1.15 : 1
  const perTurn = Math.floor((economy + built * 50) * boost)
  const population = city.population ?? 0
  const next = population < 10000 ? { tier: 2, at: 10000 } : population < 30000 ? { tier: 3, at: 30000 } : undefined
  return {
    perTurn,
    ...(next && { nextTier: { tier: next.tier, turns: perTurn > 0 ? Math.ceil((next.at - population) / perTurn) : null } }),
    details: [`経済 +${Math.round(economy)}`, `施設 +${built * 50}（${built}件×50）`, `領主 ×${boost.toFixed(2)}`],
  }
}

/** Ids missing from the buildings in use are left out */
const buildings = (slots: number, built: string[], construction?: { id: string; invested: number; turnsLeft: number | null }): CityBuildingsView => {
  const spec = construction && BUILDINGS[construction.id]
  return {
    slots,
    built: built.flatMap(id => BUILDINGS[id] ?? []),
    construction: spec && { building: spec, invested: construction.invested, required: spec.supplies, turnsLeft: construction.turnsLeft },
  }
}

export const CITIES: MockCity[] = [
  { id: 'P012', name: 'フルーエン', owner: 'carta', typeLabel: '港湾都市', scaleLabel: '大きな街', population: 11000, tier: 2,
    stats: stats(506, 253, { market: 440, production: 220 }), troopMorale: 72, supplies: 440,
    buildings: buildings(4, ['market'], { id: 'workshop', invested: 260, turnsLeft: 1 }), tags: ['港湾', '交易'], at: { x: 52, y: 52 }, soldiers: 1200 },
  { id: 'P010', name: 'ヴェステル', owner: 'carta', typeLabel: '農業都市', scaleLabel: '小さな町', population: 4200, tier: 1,
    stats: stats(120, 140), supplies: 280, buildings: buildings(2, []), tags: ['穀倉'], at: { x: 46, y: 22 }, soldiers: 600 },
  { id: 'P015', name: 'ミルデン', owner: 'carta', typeLabel: '辺境都市', scaleLabel: '小さな町', population: 2600, tier: 1,
    stats: stats(90, 80), troopMorale: 40, supplies: 120, buildings: buildings(2, ['warehouse']), tags: [], at: { x: 58, y: 78 }, soldiers: 200 },
  { id: 'P020', name: 'セイルの砦', typeLabel: '軍事都市', scaleLabel: '要塞', population: 900, tier: 1,
    stats: stats(30, 380), supplies: 760, buildings: buildings(2, []), tags: ['山岳', '鉱山'], at: { x: 66, y: 12 }, soldiers: 300 },
  { id: 'P004', name: 'アンバリア', owner: 'leonis', typeLabel: '交易都市', scaleLabel: '大きな街', population: 9800, tier: 2,
    stats: stats(520, 300), supplies: 600, buildings: buildings(4, ['grand_market', 'drill']), tags: ['城塞'], at: { x: 72, y: 46 }, soldiers: 900 },
  { id: 'P006', name: 'グラウブルク', owner: 'leonis', typeLabel: '軍事都市', scaleLabel: '大都市', population: 15400, tier: 3,
    stats: stats(360, 560), troopMorale: 85, supplies: 1200, buildings: buildings(6, ['drill', 'artisans_quarter', 'market', 'warehouse']), tags: ['帝都'], at: { x: 87, y: 22 }, soldiers: 2000 },
  { id: 'P021', name: 'オルデン', owner: 'esuhara', typeLabel: '聖都', scaleLabel: '聖地', population: 7000, tier: 2,
    stats: stats(300, 160), supplies: 320, buildings: buildings(4, ['chapel_of_emissaries'], { id: 'market', invested: 40, turnsLeft: 3 }), tags: ['聖地'], at: { x: 84, y: 74 }, soldiers: 500 },
]

export const ROADS: [string, string][] = [
  ['P012', 'P004'], ['P012', 'P010'], ['P012', 'P015'], ['P010', 'P020'], ['P020', 'P004'],
  ['P004', 'P006'], ['P015', 'P021'], ['P004', 'P021'], ['P020', 'P006'],
]

// The battle screen's unit sprites when the catalog runs inside the game's repository (norden-battle/assets/units/)
const unitImages = import.meta.glob<string>('../../../norden-battle/assets/units/*.webp', { eager: true, query: '?url', import: 'default' })
const unitImage = (id: string) => unitImages[`../../../norden-battle/assets/units/${id}.webp`]

export const UNIT_TYPES: UnitTypeView[] = [
  { id: 'infantry', name: '歩兵', description: '守りに強い', image: unitImage('infantry') },
  { id: 'archer', name: '弓兵', description: '遠くから攻撃する', image: unitImage('archer') },
  { id: 'cavalry', name: '騎兵', description: '移動が速い', image: unitImage('cavalry') },
  { id: 'mage', name: '魔術師', description: '魔法で攻撃する', image: unitImage('mage') },
]

/** Morale of a city's soldiers (the same everywhere in the demo) */
export const MORALE = 70

/** Unit types of the units a commander leads indirectly */
export const INDIRECT_UNIT_TYPES = ['infantry', 'archer']

export const CITY_MAP = Object.fromEntries(CITIES.map(city => [city.id, city]))

export const neighboursOf = (id: string) => ROADS.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []))
export const knightsIn = (id: string) => KNIGHTS.filter(item => item.cityId === id)
export const playerCities = CITIES.filter(city => city.owner === PLAYER).map(city => city.id)

/** Cities of other factions linked to `from` */
export const invasionTargets = (from: string) => neighboursOf(from).filter(id => CITY_MAP[id]?.owner !== PLAYER)

/** A knight as a city's lord: name and full character illustration */
export function lordView(knightId: string): CityView['lord'] {
  const lord = KNIGHTS.find(item => item.id === knightId)
  const character = characterFor(knightId)
  return lord && { id: lord.id, name: lord.name, image: character ? createElement(RepositoryCharacterArt, { character }) : undefined }
}

/** The view type the screens draw */
export function cityView(id: string, knights: readonly KnightView[] = knightsIn(id)): CityView {
  const { owner, at: _at, soldiers, ...city } = CITY_MAP[id]!
  const lord = knightsIn(id)[0]
  return {
    ...city,
    troops: soldiers,
    troopMorale: city.troopMorale ?? MORALE,
    lord: lord ? lordView(lord.id) : undefined,
    faction: owner ? FACTIONS[owner] : undefined,
    knights,
    prisoners: prisonersIn(id),
    history: historyOf(city),
  }
}

/** Three turns of a city's growth ending at its numbers now, with the economy run's formulas (as the game writes them) */
function historyOf(city: Pick<CityView, 'population' | 'stats'>): CityHistoryView[] {
  const value = (label: string) => city.stats?.find(stat => stat.label === label)?.value ?? 0
  const population = city.population ?? 0
  const [market, production] = [value('商業'), value('生産')]
  const grow = (turn: number, back: number): CityHistoryView => {
    const [pop, before, gain] = [population - back * 320, market - back * 3, 3]
    return {
      turn, population: pop, market: before, production,
      log: [
        { label: '商業（基礎）', before: before - gain, after: before, formula: `担当官: max(1, 金 115 × 能力 85.33 / 100 × 0.033) = 3.24 → ${gain}` },
        { label: '生産（基礎）', before: production, after: production, formula: '担当官なし' },
        { label: '人口', before: pop - 320, after: pop, formula: `floor((経済 (商業 ${before} × 0.5 + 生産 ${production} × 0.2 = ${before * 0.5 + production * 0.2}) + 施設 (1 × 50 = 50)) × 領主 (1 + (政治 70 + 魅力 60) / 800 = 1.1625) × (1 + 施設 0%)) = 320` },
      ],
    }
  }
  return [{ turn: 1, population: population - 640, market: market - 6, production }, grow(2, 1), grow(3, 0)]
}

export const TURN: TurnView = {
  turn: 1, phaseLabel: '戦略フェーズ', dateLabel: '灰歴312年1月 冬', activeFaction: FACTIONS[PLAYER],
}

/** The player's faction on the faction bar: 生産 and soldiers of its cities */
export const FACTION_SUMMARY: FactionSummaryView = {
  gold: 500, goldForecast: 110,
  production: CITIES.filter(city => city.owner === PLAYER).reduce((sum, city) => sum + (city.stats?.find(stat => stat.label === '生産')?.value ?? 0), 0),
  troops: CITIES.filter(city => city.owner === PLAYER).reduce((sum, city) => sum + city.soldiers, 0),
}
