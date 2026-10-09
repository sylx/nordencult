import type { CharacterType } from './character'

/** 歩兵・弓兵・騎兵・魔術師 */
export type UnitTypeId = 'infantry' | 'archer' | 'cavalry' | 'mage'

export interface UnitType {
  id: UnitTypeId
  name: string
  description: string
}

/** The unit types a knight can lead (provisional until the battle rules use them) */
export const UNIT_TYPES: readonly UnitType[] = [
  { id: 'infantry', name: '歩兵', description: '守りに強い' },
  { id: 'archer', name: '弓兵', description: '遠くから攻撃する' },
  { id: 'cavalry', name: '騎兵', description: '移動が速い' },
  { id: 'mage', name: '魔術師', description: '魔法で攻撃する' },
]

export const UNIT_TYPE_MAP: Readonly<Record<string, UnitType>> = Object.fromEntries(UNIT_TYPES.map((t) => [t.id, t]))

/** The unit type chosen first for each type of character */
export const DEFAULT_UNIT_TYPES: Readonly<Record<CharacterType, UnitTypeId>> = {
  knight: 'cavalry',
  hunter: 'archer',
  magician: 'mage',
  scholar: 'infantry',
  politician: 'infantry',
}
