import buildingData from './buildingData.json'

/** A city's size: 1 小さな町, 2 街, 3 大都市. Decides its building slots */
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
  /** Trade routes +value (1–6; trade routes are not in the game yet, so no effect) */
  | { kind: 'tradeRoutes'; value: number }
  /** An effect the game cannot do yet, written out and shown as it is */
  | { kind: 'etc'; value: string }

export type BuildingEffectKind = BuildingEffect['kind']

/** What each kind of effect does, for the editor and the screens */
export const BUILDING_EFFECT_LABELS: Readonly<Record<BuildingEffectKind, string>> = {
  marketPct: '商業',
  productionPct: '生産',
  growthPct: '人口の伸び',
  trainingPct: '訓練',
  recruitPct: '募兵数',
  recruitMorale: '新兵の練度',
  tradeRoutes: '交易路',
  etc: 'その他',
}

/** Effects counted as they are, not as percentages */
const COUNT_EFFECTS: ReadonlySet<BuildingEffectKind> = new Set(['recruitMorale', 'tradeRoutes'])

/** e.g. 商業 +15%, 新兵の練度 +10, 交易路 +2 (an etc effect is its text) */
export function describeEffect(effect: BuildingEffect): string {
  if (effect.kind === 'etc') return effect.value
  const label = BUILDING_EFFECT_LABELS[effect.kind]
  return `${label} ${effect.value >= 0 ? '+' : ''}${effect.value}${COUNT_EFFECTS.has(effect.kind) ? '' : '%'}`
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
  /** The city needs one of these tags (e.g. 港湾 for a harbour); omitted: anywhere */
  requiredTags?: string[]
  /** Built over this building, which it replaces in its slot (e.g. 大市場 over 市場); omitted: built in an empty slot */
  upgradeFrom?: string
  /** Name of the relic the city's faction must hold (relics are not managed yet, so it is never met) */
  requiredRelic?: string
  effects: BuildingEffect[]
  /** Top-left of its picture in src/assets/buildings.webp (pixels; the sizes in buildingSprite.json) */
  sprite?: { x: number; y: number }
}

export const BUILDING_LIST: readonly Building[] = buildingData as Building[]

export const BUILDING_MAP: Readonly<Record<string, Building>> = Object.fromEntries(BUILDING_LIST.map((b) => [b.id, b]))

/** The buildings upgraded from a building, directly or through others (大市場 and what it upgrades to, for 市場) */
export function upgradesOf(buildingId: string): string[] {
  const found: string[] = []
  const walk = (id: string) => {
    for (const b of BUILDING_LIST) {
      if (b.upgradeFrom === id && !found.includes(b.id)) {
        found.push(b.id)
        walk(b.id)
      }
    }
  }
  walk(buildingId)
  return found
}
