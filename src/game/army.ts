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

/** The unit types a character can lead, by their type */
export const unitTypesOf = (characterId: CharacterId): readonly UnitTypeId[] =>
  UNIT_TYPES_BY_CHARACTER_TYPE[CHARACTER_MAP[characterId]?.type ?? 'knight']
