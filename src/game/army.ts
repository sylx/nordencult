import { CHARACTER_MAP } from '../data/character'
import { DEFAULT_UNIT_TYPES, UNIT_TYPES_BY_CHARACTER_TYPE, type UnitTypeId } from '../data/unitTypes'
import { MERCENARY_MORALE, SUMMON_MORALE } from './economy/balance'
import { equipmentEffects } from './relics/box'
import { characterOf, isSummon } from './summons/character'
import type { CharacterId, GameState } from './types'

/** A mercenary (傭兵): a character with Character.mercenaryInfo, hired or not */
export const isMercenary = (characterId: CharacterId): boolean => Boolean(CHARACTER_MAP[characterId]?.mercenaryInfo)

/**
 * A unit of soldiers of its own, apart from any city's: a mercenary's company or a summoned unit (its HP).
 * Its unit type and soldiers are fixed (ownSoldiers), and it fights at its own morale (ownMorale)
 */
export const hasOwnSoldiers = (characterId: CharacterId): boolean => isMercenary(characterId) || isSummon(characterId)

/** The soldiers of its own a mercenary or a summoned unit has now (hasOwnSoldiers); undefined for anyone else */
export function ownSoldiers(state: GameState, characterId: CharacterId): number | undefined {
  if (isMercenary(characterId)) return state.mercenaries[characterId]?.soldiers ?? 0
  if (isSummon(characterId)) return state.summons[characterId]?.hp ?? 0
  return undefined
}

/** The morale a unit of its own fights at, whatever its city's (hasOwnSoldiers); undefined for anyone else */
export function ownMorale(characterId: CharacterId): number | undefined {
  if (isMercenary(characterId)) return MERCENARY_MORALE
  if (isSummon(characterId)) return SUMMON_MORALE
  return undefined
}

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

/** The unit type a character leads unless the player picks another; a mercenary's company and a summoned unit always have this one */
export const defaultUnitType = (state: Pick<GameState, 'summons'>, characterId: CharacterId): UnitTypeId => {
  const summon = state.summons[characterId]
  if (summon) return summon.unitType as UnitTypeId
  const character = CHARACTER_MAP[characterId]
  return character?.mercenaryInfo?.unitType ?? DEFAULT_UNIT_TYPES[character?.type ?? 'knight']
}

/** A commander leads the units without a knight of their own with this share of their 統率・武力・知力 */
export const INDIRECT_ABILITY_RATE = 0.5

/**
 * The 統率・武力・知力 a unit fights with: its knight's, or INDIRECT_ABILITY_RATE of the commander's
 * for a unit they lead indirectly (so its attack and defense come from half of theirs). undefined: nobody leads it
 */
export function unitAbilities(state: Pick<GameState, 'summons'>, knightId: CharacterId | null, commander: CharacterId | null) {
  const leader = characterOf(state, knightId ?? commander ?? '')
  if (!leader) return undefined
  const rate = knightId === null ? INDIRECT_ABILITY_RATE : 1
  return {
    leadership: Math.floor(leader.leadership * rate),
    strength: Math.floor(leader.strength * rate),
    intelligence: Math.floor(leader.intelligence * rate),
  }
}

/**
 * The unit types a character can lead: their type's, then those their equipment gives (ライフル → ライフル兵, 大砲 → 砲兵)
 * not among them. A summoned unit leads its monster only
 */
export function unitTypesOf(state: GameState, characterId: CharacterId): readonly UnitTypeId[] {
  const summon = state.summons[characterId]
  if (summon) return [summon.unitType as UnitTypeId]
  const own = UNIT_TYPES_BY_CHARACTER_TYPE[CHARACTER_MAP[characterId]?.type ?? 'knight']
  const added = equipmentEffects(state, characterId).unitTypes.filter((id) => !own.includes(id as UnitTypeId)) as UnitTypeId[]
  return added.length > 0 ? [...own, ...added] : own
}
