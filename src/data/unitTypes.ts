import type { CharacterType } from './character'

/** 歩兵・弓兵・騎兵・魔術師・ライフル兵・砲兵・ランツクネヒト、魔物のドラゴン・ゴーレム・ベヒーモス（召喚ユニットだけ） */
export type UnitTypeId = 'infantry' | 'archer' | 'cavalry' | 'mage' | 'rifleman' | 'artillery' | 'landsknecht' | 'dragon' | 'golem' | 'behemoth'

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
  { id: 'rifleman', name: 'ライフル兵', description: '撃って敵の足を止める' },
  { id: 'artillery', name: '砲兵', description: '遠くから砲撃する' },
  { id: 'landsknecht', name: 'ランツクネヒト', description: '攻めにも守りにも強い' },
  { id: 'dragon', name: 'ドラゴン', description: '空を飛び、炎で焼き払う' },
  { id: 'golem', name: 'ゴーレム', description: '硬く、攻撃によく耐える' },
  { id: 'behemoth', name: 'ベヒーモス', description: '光線で遠くの敵を焼く' },
]

/** The monsters' unit types (norden-battle's UNIT_DEFS with monster): led by summoned units only, never by a knight */
export const MONSTER_UNIT_TYPES: readonly UnitTypeId[] = ['dragon', 'golem', 'behemoth']

export const UNIT_TYPE_MAP: Readonly<Record<string, UnitType>> = Object.fromEntries(UNIT_TYPES.map((t) => [t.id, t]))

/**
 * The unit types each type of character can lead: anyone can lead 歩兵. ライフル兵・砲兵・ランツクネヒト
 * have their own unit images and only characters of the same type lead them. A summoned unit leads none of them:
 * its unit type is its relic's (Relic.summon.unitType)
 */
export const UNIT_TYPES_BY_CHARACTER_TYPE: Readonly<Record<CharacterType, readonly UnitTypeId[]>> = {
  knight: ['infantry', 'cavalry'],
  hunter: ['infantry', 'archer'],
  magician: ['infantry', 'mage'],
  scholar: ['infantry'],
  politician: ['infantry'],
  rifleman: ['infantry', 'rifleman'],
  artillery: ['infantry', 'artillery'],
  landsknecht: ['infantry', 'landsknecht'],
  summon: [],
}

/** The unit types of the units a commander leads indirectly, without a knight of their own */
export const INDIRECT_UNIT_TYPES: readonly UnitTypeId[] = ['infantry', 'archer']

/**
 * The unit type chosen first for each type of character (one of UNIT_TYPES_BY_CHARACTER_TYPE).
 * 召喚 leads none of those: its entry stands in only until the game asks the summon's own unit type
 */
export const DEFAULT_UNIT_TYPES: Readonly<Record<CharacterType, UnitTypeId>> = {
  knight: 'cavalry',
  hunter: 'archer',
  magician: 'mage',
  scholar: 'infantry',
  politician: 'infantry',
  rifleman: 'rifleman',
  artillery: 'artillery',
  landsknecht: 'landsknecht',
  summon: 'infantry',
}
