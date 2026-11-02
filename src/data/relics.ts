import relicData from './relicData.json'
import { TECH_LIST, type Tech } from './techs'

/** What a relic repaired is for (shown only for now): becoming a building, equipped by a knight, or summoned as a unit */
export type RelicUse = 'building' | 'equipment' | 'summon'

export const RELIC_USE_LABELS: Readonly<Record<RelicUse, string>> = { building: '施設', equipment: '装備', summon: '召喚' }

/** The grade a relic is drawn at when exploring (shown only for now) */
export type RelicRarity = 'S' | 'A' | 'B' | 'C'

export const RELIC_RARITIES: readonly RelicRarity[] = ['S', 'A', 'B', 'C']

/** The rarity a relic shows: one grade below the data's while broken */
export type RelicShownRarity = RelicRarity | 'D'

const BROKEN_RARITY: Readonly<Record<RelicRarity, RelicShownRarity>> = { S: 'A', A: 'B', B: 'C', C: 'D' }

/** What repairing or producing a relic takes */
export interface RelicWorkCost {
  /** Supplies, the city's 生産 going into it turn by turn */
  supplies: number
  /** Gold paid from the treasury as it starts */
  gold: number
  /** The technology the faction must have researched; omitted: none */
  tech?: string
}

/** Master data of a relic (written by norden-data's relic editor) */
export interface Relic {
  id: string
  /** Its name repaired, e.g. ライフル, ドラゴン */
  name: string
  /** Its name broken, e.g. 壊れたライフル, ドラゴンの卵. Omitted: it is never broken (魔導書), neither dismantled nor repaired nor handed out at the start */
  brokenName?: string
  description: string
  rarity: RelicRarity
  use: RelicUse
  /** Research points dismantling it gives; those with a broken state have it */
  dismantlePoints?: number
  /** Those with a broken state have it */
  repair?: RelicWorkCost
  /** Omitted: it cannot be produced */
  production?: RelicWorkCost
  /** Top-left of its picture repaired in src/assets/relics.webp (pixels; the sizes in relicSprite.json), as a technology's sprite */
  sprite?: { x: number; y: number }
  /** Top-left of its picture broken; those with a broken state have it */
  brokenSprite?: { x: number; y: number }
}

export const RELIC_LIST: readonly Relic[] = relicData as Relic[]

export const RELIC_MAP: Readonly<Record<string, Relic>> = Object.fromEntries(RELIC_LIST.map((r) => [r.id, r]))

/** A relic's name as it is broken or repaired (the id when unknown) */
export function relicName(relicId: string, repaired: boolean): string {
  const relic = RELIC_MAP[relicId]
  if (!relic) return relicId
  return repaired ? relic.name : relic.brokenName ?? relic.name
}

/** A relic's rarity as it is broken or repaired */
export const relicRarity = (relic: Relic, repaired: boolean): RelicShownRarity => (repaired ? relic.rarity : BROKEN_RARITY[relic.rarity])

/** What is wrong with the relics' data: a technology that is not one, a broken state not whole, a relic that can be neither repaired nor produced; empty when nothing is */
export function relicDataProblems(relics: readonly Relic[] = RELIC_LIST, techs: readonly Pick<Tech, 'id'>[] = TECH_LIST): string[] {
  const ids = new Set(techs.map((t) => t.id))
  const problems: string[] = []
  for (const relic of relics) {
    for (const cost of [relic.repair, relic.production]) {
      if (cost?.tech && !ids.has(cost.tech)) problems.push(`${relic.id} の技術 ${cost.tech} は技術ではありません`)
    }
    const broken = [relic.brokenName, relic.dismantlePoints, relic.repair].filter((value) => value !== undefined)
    if (broken.length > 0 && broken.length < 3) problems.push(`${relic.id} の壊れた状態の名前・解体・修復がそろっていません`)
    if (broken.length === 0 && !relic.production) problems.push(`${relic.id} は壊れた状態も生産も持ちません`)
  }
  return problems
}
