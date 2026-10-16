import buildingData from './buildingData.json'

/** A city's size: 1 小さな町, 2 街, 3 大都市. Decides its building slots and what it can build */
export type CityTier = 1 | 2 | 3

/** What a building does to its city (provisional numbers) */
export type BuildingEffect =
  /** 商業 +value% */
  | { kind: 'marketPct'; value: number }
  /** 生産 +value% */
  | { kind: 'productionPct'; value: number }
  /** Population growth +value% */
  | { kind: 'growthPct'; value: number }
  /** Morale gained by training +value% */
  | { kind: 'trainingPct'; value: number }
  /** Soldiers that can be recruited in a turn +value% */
  | { kind: 'recruitPct'; value: number }
  /** Morale of new soldiers +value */
  | { kind: 'recruitMorale'; value: number }
  /** Mercenaries turn up (no effect yet) */
  | { kind: 'mercenary' }

export type BuildingEffectKind = BuildingEffect['kind']

/** What each kind of effect does, for the editor and the screens */
export const BUILDING_EFFECT_LABELS: Readonly<Record<BuildingEffectKind, string>> = {
  marketPct: '商業',
  productionPct: '生産',
  growthPct: '人口の伸び',
  trainingPct: '訓練',
  recruitPct: '募兵数',
  recruitMorale: '新兵の練度',
  mercenary: '傭兵が現れる',
}

/** e.g. 商業 +15%, 新兵の練度 +10, 傭兵が現れる */
export function describeEffect(effect: BuildingEffect): string {
  const label = BUILDING_EFFECT_LABELS[effect.kind]
  if (effect.kind === 'mercenary') return label
  return `${label} ${effect.value >= 0 ? '+' : ''}${effect.value}${effect.kind === 'recruitMorale' ? '' : '%'}`
}

/** Master data of a building (written by norden-data's building editor) */
export interface Building {
  id: string
  name: string
  description: string
  /** Supplies (hammers) it takes to build */
  supplies: number
  /** Gold paid when building starts */
  gold: number
  /** The lowest tier of city that can build it */
  minTier: CityTier
  /** The city needs one of these tags (e.g. 港湾 for a harbour); omitted: anywhere */
  requiredTags?: string[]
  effects: BuildingEffect[]
  /** Image file in src/assets/buildings/ (e.g. market.webp) */
  image?: string
}

export const BUILDING_LIST: readonly Building[] = buildingData as Building[]

export const BUILDING_MAP: Readonly<Record<string, Building>> = Object.fromEntries(BUILDING_LIST.map((b) => [b.id, b]))
