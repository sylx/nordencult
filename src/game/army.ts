import { CITY_LIST } from 'norden-strategy/data'
import { CHARACTER_MAP } from '../data/character'
import { DEFAULT_UNIT_TYPES, type UnitTypeId } from '../data/unitTypes'
import type { CharacterId, CityId } from './types'

/** Provisional soldier rules until the battle rules (battle-editor) come in: numbers only scale the stats */
const SOLDIERS_PER_MILITARY = 5
const SOLDIERS_PER_LEADERSHIP = 5

const MILITARY = new Map(CITY_LIST.map((c) => [c.id, c.military]))

/** Soldiers a city can send out in a turn: its 軍事 × 5 */
export const soldierPool = (cityId: CityId): number => (MILITARY.get(cityId) ?? 0) * SOLDIERS_PER_MILITARY

/** Most soldiers a character can lead: their 統率 × 5 */
export const maxSoldiers = (characterId: CharacterId): number =>
  (CHARACTER_MAP[characterId]?.leadership ?? 0) * SOLDIERS_PER_LEADERSHIP

/** The unit type a character leads unless the player picks another */
export const defaultUnitType = (characterId: CharacterId): UnitTypeId =>
  DEFAULT_UNIT_TYPES[CHARACTER_MAP[characterId]?.type ?? 'knight']
