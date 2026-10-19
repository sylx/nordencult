import { CHARACTER_MAP } from '../data/character'
import { DEFAULT_UNIT_TYPES, UNIT_TYPES_BY_CHARACTER_TYPE, type UnitTypeId } from '../data/unitTypes'
import type { CharacterId } from './types'

/** Most units of an invasion, those the commander leads indirectly included */
export const MAX_UNITS = 6

/** Morale of soldiers: 0..MAX_MORALE (the battle screen's scale) */
export const MAX_MORALE = 100
/** Morale of two bodies of soldiers joining: their average weighted by soldiers (the first's when there are none) */
export function mixMorale(soldiers: number, morale: number, joining: number, joiningMorale: number): number {
  const total = soldiers + joining
  return total > 0 ? Math.round((soldiers * morale + joining * joiningMorale) / total) : morale
}

/** Most soldiers of a unit, the same for every knight and for the units the commander leads indirectly */
export const MAX_SOLDIERS = 1000

/** The unit type a character leads unless the player picks another */
export const defaultUnitType = (characterId: CharacterId): UnitTypeId =>
  DEFAULT_UNIT_TYPES[CHARACTER_MAP[characterId]?.type ?? 'knight']

/** A commander leads the units without a knight of their own with this share of their 統率・武力・知力 */
export const INDIRECT_ABILITY_RATE = 0.5

/**
 * The 統率・武力・知力 a unit fights with: its knight's, or INDIRECT_ABILITY_RATE of the commander's
 * for a unit they lead indirectly (so its attack and defense come from half of theirs). undefined: nobody leads it
 */
export function unitAbilities(knightId: CharacterId | null, commander: CharacterId | null) {
  const leader = CHARACTER_MAP[knightId ?? commander ?? '']
  if (!leader) return undefined
  const rate = knightId === null ? INDIRECT_ABILITY_RATE : 1
  return {
    leadership: Math.floor(leader.leadership * rate),
    strength: Math.floor(leader.strength * rate),
    intelligence: Math.floor(leader.intelligence * rate),
  }
}

/** The unit types a character can lead, by their type */
export const unitTypesOf = (characterId: CharacterId): readonly UnitTypeId[] =>
  UNIT_TYPES_BY_CHARACTER_TYPE[CHARACTER_MAP[characterId]?.type ?? 'knight']
