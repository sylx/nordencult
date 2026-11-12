import { SPELL_IDS, type SpellId } from '@norden/battle-runtime/rules'
import { BUILDING_LIST } from './buildings'
import { CHARACTER_LIST, isSpecialCharacterId } from './character'
import relicData from './relicData.json'
import { TECH_LIST, type Tech } from './techs'
import { MONSTER_UNIT_TYPES, UNIT_TYPE_MAP, type UnitTypeId } from './unitTypes'

export { SPELL_IDS, type SpellId }

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

/** Who can wear an equipment relic: 魔術師 only, or anyone but 魔術師 (never a mercenary nor a summoned unit) */
export type RelicWearer = 'magician' | 'nonMagician'

export const RELIC_WEARER_LABELS: Readonly<Record<RelicWearer, string>> = { magician: '魔術師', nonMagician: '魔術師以外' }

/** What wearing an equipment relic gives */
export interface RelicEquipment {
  wearer: RelicWearer
  /** 知力 the wearer needs. Omitted: none */
  minIntelligence?: number
  /** Unit types the wearer can lead besides their type's (ライフル → rifleman, 大砲 → artillery) */
  unitTypes?: UnitTypeId[]
  /** Spells the wearer casts in battle (norden-battle's SpellId; used when they lead 魔術師) */
  spells?: SpellId[]
}

/** The template of the unit a summon relic summons */
export interface RelicSummon {
  /** The special character (991..999) whose pictures and default values the unit takes */
  characterId: string
  /** A monster's unit type (MONSTER_UNIT_TYPES) */
  unitType: UnitTypeId
  /** HP: the unit's soldiers at full strength */
  hp: number
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
  /** Those used as equipment have it: who wears it and what it gives */
  equipment?: RelicEquipment
  /** Those used to summon have it: the unit summoned */
  summon?: RelicSummon
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

/** What relics' effects are checked against: the characters a summon can take after and the relics the buildings require */
export interface RelicEffectReferences {
  characterIds: readonly string[]
  /** Building.requiredRelic of every building */
  buildingRelics: readonly string[]
}

const GAME_EFFECT_REFERENCES: RelicEffectReferences = {
  characterIds: CHARACTER_LIST.map((c) => c.id),
  buildingRelics: BUILDING_LIST.flatMap((b) => (b.requiredRelic ? [b.requiredRelic] : [])),
}

/**
 * What is wrong with a relic's effects, without its id (norden-data's relic editor shows them too): its use and the effect it holds
 * disagreeing, an equipment giving nothing or what is not a unit type or spell, a summon after a character not special or not one,
 * of a unit type not a monster's, and a building relic no building requires
 */
export function relicEffectProblems(relic: Pick<Relic, 'id' | 'use' | 'equipment' | 'summon'>, refs: RelicEffectReferences = GAME_EFFECT_REFERENCES): string[] {
  const problems: string[] = []
  const { id: relicId, use, equipment, summon } = relic
  if (use === 'building' && !refs.buildingRelics.includes(relicId)) problems.push('施設の遺物なのに、この遺物の要る施設がありません')
  if (use === 'equipment' && !equipment) problems.push('装備なのに装備の効果がありません')
  if (use !== 'equipment' && equipment) problems.push('装備でないのに装備の効果があります')
  if (use === 'summon' && !summon) problems.push('召喚なのに召喚の型紙がありません')
  if (use !== 'summon' && summon) problems.push('召喚でないのに召喚の型紙があります')
  if (equipment) {
    if (!equipment.unitTypes?.length && !equipment.spells?.length) problems.push('装備しても兵種も魔法も増えません')
    for (const id of equipment.unitTypes ?? []) {
      if (!UNIT_TYPE_MAP[id] || MONSTER_UNIT_TYPES.includes(id)) problems.push(`装備の兵種 ${id} は騎士の率いる兵種ではありません`)
    }
    for (const id of equipment.spells ?? []) if (!(SPELL_IDS as readonly string[]).includes(id)) problems.push(`装備の魔法 ${id} は魔法ではありません`)
    if (equipment.wearer !== 'magician' && equipment.spells?.length) problems.push('魔法は魔術師の装備にだけ付けられます')
  }
  if (summon) {
    if (!isSpecialCharacterId(summon.characterId)) problems.push(`召喚の型紙のキャラクター ${summon.characterId} は特殊キャラクター（991〜999）ではありません`)
    else if (!refs.characterIds.includes(summon.characterId)) problems.push(`召喚の型紙のキャラクター ${summon.characterId} がいません`)
    if (!MONSTER_UNIT_TYPES.includes(summon.unitType)) problems.push(`召喚の兵種 ${summon.unitType} は魔物の兵種ではありません`)
    if (!(summon.hp > 0)) problems.push('召喚の HP は 1 以上にしてください')
  }
  return problems
}

/**
 * What is wrong with the relics' data: a technology that is not one, a broken state not whole, a relic that can be neither repaired nor produced,
 * and its effects (relicEffectProblems); empty when nothing is
 */
export function relicDataProblems(
  relics: readonly Relic[] = RELIC_LIST,
  techs: readonly Pick<Tech, 'id'>[] = TECH_LIST,
  refs: RelicEffectReferences = GAME_EFFECT_REFERENCES,
): string[] {
  const ids = new Set(techs.map((t) => t.id))
  const problems: string[] = []
  for (const relic of relics) {
    for (const cost of [relic.repair, relic.production]) {
      if (cost?.tech && !ids.has(cost.tech)) problems.push(`${relic.id} の技術 ${cost.tech} は技術ではありません`)
    }
    const broken = [relic.brokenName, relic.dismantlePoints, relic.repair].filter((value) => value !== undefined)
    if (broken.length > 0 && broken.length < 3) problems.push(`${relic.id} の壊れた状態の名前・解体・修復がそろっていません`)
    if (broken.length === 0 && !relic.production) problems.push(`${relic.id} は壊れた状態も生産も持ちません`)
    for (const problem of relicEffectProblems(relic, refs)) problems.push(`${relic.id}: ${problem}`)
  }
  return problems
}
