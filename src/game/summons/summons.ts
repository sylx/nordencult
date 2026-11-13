import { RELIC_MAP } from '../../data/relics'
import { SUMMON_NAMES } from '../../data/summons'
import { SUMMON_ABILITY_RANGE, SUMMON_NAME_MAX, SUMMON_RECOVERY_RATE } from '../economy/balance'
import { withoutAssignee } from '../economy/domestic'
import { GameRuleError } from '../errors'
import { movementOf, ownerOf } from '../queries'
import { relicsOf, withoutRelicItem } from '../relics/box'
import type { CharacterId, CharacterState, CityId, FactionId, GameState, SummonState } from '../types'
import { SUMMON_ID_PREFIX } from './character'

/**
 * 召喚: a relic of a monster (Relic.summon) used up to summon it as a unit of the faction (召喚ユニット), in the city
 * the relic screen is opened on. Its 統率・武力・知力 are rolled then, and it is named (automatically, then by the
 * player: renameSummon). Each command has a `…Problem` function saying why it is not allowed (or null); the command
 * throws GameRuleError with that reason
 */

const check = (problem: string | null) => {
  if (problem) throw new GameRuleError(problem)
}

/** Why the active faction cannot summon with the relic of its box in the city now, or null */
export function summonProblem(state: GameState, cityId: CityId, itemId: string): string | null {
  const factionId = state.activeFaction
  if (state.phase !== 'strategy' || !factionId) return '手番ではありません'
  if (ownerOf(state, cityId) !== factionId) return '自勢力の都市ではありません'
  const item = relicsOf(state, factionId).find((i) => i.id === itemId)
  if (!item) return '遺物がありません'
  if (!RELIC_MAP[item.relicId]?.summon) return '召喚の遺物ではありません'
  if (item.papalRepair) return '法王府に依頼中です'
  if (!item.repaired) return '修復されていない遺物です'
  return null
}

/**
 * A name for a summoned unit of the template, at random among SUMMON_NAMES[templateId] that no summoned unit of the
 * faction has (any of them once all are taken); the template's own name when it has none
 */
export function autoSummonName(state: GameState, factionId: FactionId | null, templateId: CharacterId, random: () => number = Math.random): string {
  const names = SUMMON_NAMES[templateId] ?? []
  if (names.length === 0) return templateRelicName(templateId)
  const taken = new Set(Object.entries(state.summons).filter(([id]) => state.characters[id]?.factionId === factionId).map(([, s]) => s.name))
  const free = names.filter((name) => !taken.has(name))
  const pool = free.length > 0 ? free : names
  return pool[Math.floor(random() * pool.length)]
}

/** The name of the monster a template stands for (the relic summoning it), for a template without names */
function templateRelicName(templateId: CharacterId): string {
  return Object.values(RELIC_MAP).find((r) => r.summon?.characterId === templateId)?.name ?? templateId
}

/** A number of SUMMON_ABILITY_RANGE at random, both ends included */
function rollAbility(random: () => number): number {
  const [low, high] = SUMMON_ABILITY_RANGE
  return low + Math.floor(random() * (high - low + 1))
}

/** A new summoned unit of the relic (an id of RELIC_LIST) for the faction in the city, at full HP and named automatically */
function addSummon(state: GameState, factionId: FactionId, cityId: CityId, relicId: string, random: () => number): { state: GameState; id: CharacterId } {
  const template = RELIC_MAP[relicId].summon!
  const id = `${SUMMON_ID_PREFIX}${state.serial}`
  const summon: SummonState = {
    templateId: template.characterId,
    relicId,
    name: autoSummonName(state, factionId, template.characterId, random),
    unitType: template.unitType,
    leadership: rollAbility(random),
    strength: rollAbility(random),
    intelligence: rollAbility(random),
    hp: template.hp,
    maxHp: template.hp,
  }
  return {
    state: {
      ...state,
      summons: { ...state.summons, [id]: summon },
      characters: { ...state.characters, [id]: { cityId, factionId } },
      serial: state.serial + 1,
    },
    id,
  }
}

/**
 * Uses up a relic of the box to summon its monster in the city (summonProblem): its 統率・武力・知力 are rolled from
 * SUMMON_ABILITY_RANGE and it is named automatically (autoSummonName). Returns the state and the new unit's id
 */
export function summonRelic(state: GameState, cityId: CityId, itemId: string, random: () => number = Math.random): { state: GameState; id: CharacterId } {
  check(summonProblem(state, cityId, itemId))
  const factionId = state.activeFaction!
  const { relicId } = relicsOf(state, factionId).find((i) => i.id === itemId)!
  return addSummon(withoutRelicItem(state, factionId, itemId), factionId, cityId, relicId, random)
}

/** Why a summoned unit cannot be given the name, or null: 1..SUMMON_NAME_MAX characters (spaces around it dropped) */
export function renameProblem(state: GameState, id: CharacterId, name: string): string | null {
  if (!state.summons[id]) return '召喚ユニットではありません'
  const trimmed = name.trim()
  if (trimmed.length === 0) return '名前を入れてください'
  if ([...trimmed].length > SUMMON_NAME_MAX) return `名前は${SUMMON_NAME_MAX}文字までです`
  return null
}

/** Names a summoned unit (spaces around the name dropped) */
export function renameSummon(state: GameState, id: CharacterId, name: string): GameState {
  check(renameProblem(state, id, name))
  return { ...state, summons: { ...state.summons, [id]: { ...state.summons[id], name: name.trim() } } }
}

/** A summoned unit with its HP changed, kept within 0..its most */
export function withSummonHp(state: GameState, id: CharacterId, hp: number): GameState {
  const summon = state.summons[id]
  if (!summon) return state
  return { ...state, summons: { ...state.summons, [id]: { ...summon, hp: Math.max(0, Math.min(summon.maxHp, Math.round(hp))) } } }
}

/** The summoned units gone for good (wiped out, or serving nobody): out of the summons and the characters, and any assignment */
export function removeSummons(state: GameState, ids: readonly CharacterId[]): GameState {
  const gone = ids.filter((id) => state.summons[id])
  if (gone.length === 0) return state
  const summons = { ...state.summons }
  const characters: Record<CharacterId, CharacterState> = { ...state.characters }
  let cities = state.cities
  for (const id of gone) {
    const cityId = characters[id]?.cityId
    if (cityId && cities[cityId]) {
      const assignments = withoutAssignee(cities[cityId].assignments, id)
      if (assignments !== cities[cityId].assignments) cities = { ...cities, [cityId]: { ...cities[cityId], assignments } }
    }
    delete summons[id]
    delete characters[id]
  }
  return { ...state, summons, characters, cities }
}

/**
 * Summoned units no longer serving a faction (one destroyed, or one it would be captured or wander from) are gone:
 * they never wander nor are held prisoner. The places that make characters leave a faction call this, as releaseEquipment
 */
export function releaseSummons(state: GameState): GameState {
  return removeSummons(state, Object.keys(state.summons).filter((id) => {
    const c = state.characters[id]
    return !c || !c.factionId || c.prisoner || c.roaming !== undefined
  }))
}

/** The economy run: each summoned unit staying in a city (not away on a move or a transport) gets back SUMMON_RECOVERY_RATE of its most HP */
export function recoverSummons(state: GameState): GameState {
  let next = state
  for (const [id, summon] of Object.entries(state.summons)) {
    if (summon.hp >= summon.maxHp || !state.characters[id]?.cityId || movementOf(state, id)) continue
    next = withSummonHp(next, id, summon.hp + Math.round(summon.maxHp * SUMMON_RECOVERY_RATE))
  }
  return next
}

/** Debugging: the relic's monster summoned for the city's owner with no relic (as summonRelic, whoever's turn it is) */
export function debugSummon(state: GameState, cityId: CityId, relicId: string, random: () => number = Math.random): { state: GameState; id: CharacterId } {
  const factionId = ownerOf(state, cityId)
  if (!factionId) throw new GameRuleError('勢力の都市ではありません')
  if (!RELIC_MAP[relicId]?.summon) throw new GameRuleError(`${relicId} は召喚の遺物ではありません`)
  return addSummon(state, factionId, cityId, relicId, random)
}
