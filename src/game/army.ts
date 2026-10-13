import { CHARACTER_MAP } from '../data/character'
import { CITY_LIST } from '../data/city'
import { DEFAULT_UNIT_TYPES, UNIT_TYPES_BY_CHARACTER_TYPE, type UnitTypeId } from '../data/unitTypes'
import type { CharacterId, CityId } from './types'

/** Provisional soldier rules until the battle rules (battle-editor) come in: numbers only scale the stats */
const SOLDIERS_PER_PRODUCTION = 5
const SOLDIERS_PER_LEADERSHIP = 5

/** Most units of an invasion, those the commander leads indirectly included */
export const MAX_UNITS = 6

const PRODUCTION = new Map(CITY_LIST.map((c) => [c.id, c.production]))

/** Soldiers a city can send out in a turn: its 生産 × 5 */
export const soldierPool = (cityId: CityId): number => (PRODUCTION.get(cityId) ?? 0) * SOLDIERS_PER_PRODUCTION

/** Most soldiers a character can lead: their 統率 × 5 */
export const maxSoldiers = (characterId: CharacterId): number =>
  (CHARACTER_MAP[characterId]?.leadership ?? 0) * SOLDIERS_PER_LEADERSHIP

/** The unit type a character leads unless the player picks another */
export const defaultUnitType = (characterId: CharacterId): UnitTypeId =>
  DEFAULT_UNIT_TYPES[CHARACTER_MAP[characterId]?.type ?? 'knight']

/** The unit types a character can lead, by their type */
export const unitTypesOf = (characterId: CharacterId): readonly UnitTypeId[] =>
  UNIT_TYPES_BY_CHARACTER_TYPE[CHARACTER_MAP[characterId]?.type ?? 'knight']

/** Most soldiers of each unit a commander leads indirectly: half of what they lead themselves */
export const indirectMaxSoldiers = (commanderId: CharacterId): number => Math.floor(maxSoldiers(commanderId) / 2)
