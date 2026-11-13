import { CHARACTER_MAP, type Character } from '../../data/character'
import { SUMMON_FIXED_ABILITY } from '../economy/balance'
import type { CharacterId, GameState, SummonState } from '../types'

/** The ids of summoned units: 'summon-<serial>' (never a character of the data's) */
export const SUMMON_ID_PREFIX = 'summon-'

/** A summoned unit (召喚ユニット), by its id alone */
export const isSummon = (characterId: CharacterId): boolean => characterId.startsWith(SUMMON_ID_PREFIX)

/** A summoned unit as a character: its template's pictures, with its own name and abilities, of type 召喚 */
export function summonCharacter(id: CharacterId, summon: SummonState): Character {
  const template = CHARACTER_MAP[summon.templateId]
  return {
    id,
    name: summon.name,
    type: 'summon',
    imageInfo: template?.imageInfo ?? { sprite: { sheet: 1, x: 0, y: 0 }, faceRect: { x: 0, y: 0, width: 0, height: 0 } },
    leadership: summon.leadership,
    strength: summon.strength,
    intelligence: summon.intelligence,
    politics: SUMMON_FIXED_ABILITY,
    charm: SUMMON_FIXED_ABILITY,
  }
}

/**
 * A character of the game: one of the data's (CHARACTER_MAP), or a summoned unit (summonCharacter).
 * What a summoned unit can go through looks characters up with this; undefined: none such
 */
export function characterOf(state: Pick<GameState, 'summons'>, id: CharacterId): Character | undefined {
  const summon = state.summons[id]
  return summon ? summonCharacter(id, summon) : CHARACTER_MAP[id]
}
