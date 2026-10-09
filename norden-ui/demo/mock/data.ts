import type { CityView, FactionView, KnightView, TurnView, UnitTypeView } from '../../src'
import cityArt from '../assets/place_city.webp'

/** Demo-only data. The game passes its own state converted into the same view types */

const emblem = (color: string, mark: string) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48"><path d="M3 3h34v21c0 11-8 18-17 21C11 42 3 35 3 24z" fill="${color}" stroke="#d8b25a" stroke-width="3"/><text x="20" y="31" font-size="18" text-anchor="middle" fill="#f6e7c0" font-family="serif">${mark}</text></svg>`,
)}`

export interface MockFaction extends FactionView { id: string; color: string }

export const FACTIONS: Record<string, MockFaction> = {
  carta: { id: 'carta', name: 'カルタ書院', color: '#5a3a7a', emblem: emblem('#5a3a7a', '書') },
  leonis: { id: 'leonis', name: 'レオニス帝国', color: '#a83a2a', emblem: emblem('#a83a2a', '獅') },
  esuhara: { id: 'esuhara', name: 'エスハラ法王庁', color: '#2a6a8a', emblem: emblem('#2a6a8a', '灰') },
}

export const PLAYER = 'carta'

export interface MockKnight extends KnightView { cityId: string }

const knight = (id: string, name: string, cityId: string, subtitle: string, leadership: number, strength: number, intelligence: number,
  defaultUnitType?: string): MockKnight => ({
  id, name, cityId, subtitle, defaultUnitType, maxSoldiers: leadership * 5,
  stats: [{ label: '統率', value: leadership }, { label: '武力', value: strength }, { label: '知力', value: intelligence }],
})

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

export interface MockCity extends Omit<CityView, 'knights' | 'neighbours' | 'faction'> {
  owner?: string
  /** Position on the mock map, in % */
  at: { x: number; y: number }
  /** Soldiers stationed (shared by the armies leaving the city) */
  soldiers: number
}

const stats = (agriculture: number, market: number, military: number) => [
  { label: '農業', value: agriculture, max: 720 }, { label: '商業', value: market, max: 720 }, { label: '軍事', value: military, max: 640 },
]

export const CITIES: MockCity[] = [
  { id: 'P012', name: 'フルーエン', owner: 'carta', typeLabel: '港湾都市', scaleLabel: '大きな街', population: 11000, art: cityArt,
    stats: stats(220, 440, 220), tags: ['港', '交易'], at: { x: 52, y: 52 }, soldiers: 1200 },
  { id: 'P010', name: 'ヴェステル', owner: 'carta', typeLabel: '農業都市', scaleLabel: '小さな町', population: 4200, art: cityArt,
    stats: stats(480, 120, 140), tags: ['穀倉'], at: { x: 46, y: 22 }, soldiers: 600 },
  { id: 'P015', name: 'ミルデン', owner: 'carta', typeLabel: '辺境都市', scaleLabel: '小さな町', population: 2600, art: cityArt,
    stats: stats(180, 90, 80), tags: [], at: { x: 58, y: 78 }, soldiers: 200 },
  { id: 'P020', name: 'セイルの砦', typeLabel: '軍事都市', scaleLabel: '要塞', population: 900, art: cityArt,
    stats: stats(40, 30, 380), tags: ['山岳'], at: { x: 66, y: 12 }, soldiers: 300 },
  { id: 'P004', name: 'アンバリア', owner: 'leonis', typeLabel: '交易都市', scaleLabel: '大きな街', population: 9800, art: cityArt,
    stats: stats(260, 520, 300), tags: ['城塞'], at: { x: 72, y: 46 }, soldiers: 900 },
  { id: 'P006', name: 'グラウブルク', owner: 'leonis', typeLabel: '軍事都市', scaleLabel: '大都市', population: 15400, art: cityArt,
    stats: stats(300, 360, 560), tags: ['帝都'], at: { x: 87, y: 22 }, soldiers: 2000 },
  { id: 'P021', name: 'オルデン', owner: 'esuhara', typeLabel: '聖都', scaleLabel: '聖地', population: 7000, art: cityArt,
    stats: stats(200, 300, 160), tags: ['聖地'], at: { x: 84, y: 74 }, soldiers: 500 },
]

export const ROADS: [string, string][] = [
  ['P012', 'P004'], ['P012', 'P010'], ['P012', 'P015'], ['P010', 'P020'], ['P020', 'P004'],
  ['P004', 'P006'], ['P015', 'P021'], ['P004', 'P021'], ['P020', 'P006'],
]

export const UNIT_TYPES: UnitTypeView[] = [
  { id: 'infantry', name: '歩兵', description: '守りに強い' },
  { id: 'archer', name: '弓兵', description: '遠くから攻撃する' },
  { id: 'cavalry', name: '騎兵', description: '移動が速い' },
  { id: 'mage', name: '魔術師', description: '魔法で攻撃する' },
]

export const CITY_MAP = Object.fromEntries(CITIES.map(city => [city.id, city]))

export const neighboursOf = (id: string) => ROADS.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []))
export const knightsIn = (id: string) => KNIGHTS.filter(item => item.cityId === id)
export const playerCities = CITIES.filter(city => city.owner === PLAYER).map(city => city.id)

/** Cities of other factions linked to `from` */
export const invasionTargets = (from: string) => neighboursOf(from).filter(id => CITY_MAP[id]?.owner !== PLAYER)

/** The view type the screens draw */
export function cityView(id: string, knights: readonly KnightView[] = knightsIn(id)): CityView {
  const { owner, at: _at, soldiers: _soldiers, ...city } = CITY_MAP[id]!
  return {
    ...city,
    faction: owner ? FACTIONS[owner] : undefined,
    knights,
    neighbours: neighboursOf(id).map(other => ({ id: other, name: CITY_MAP[other]!.name, faction: CITY_MAP[other]!.owner ? FACTIONS[CITY_MAP[other]!.owner!] : undefined })),
  }
}

export const TURN: TurnView = { turn: 1, phaseLabel: '戦略フェーズ', dateLabel: '王暦312年 春', activeFaction: FACTIONS[PLAYER] }
