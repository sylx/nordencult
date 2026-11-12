import characterData from './characterData.json'
import characterStart from './characterStart.json'
import type { PersonalityTag, VoiceToneId } from './characterVoice'
import type { UnitTypeId } from './unitTypes'

/** 騎士・学者・政治家・魔術師・狩人・ライフル兵・砲兵・ランツクネヒト・召喚（召喚ユニットとその型紙。SPECIAL_CHARACTER_IDS） */
export type CharacterType = 'knight' | 'scholar' | 'politician' | 'magician' | 'hunter' | 'rifleman' | 'artillery' | 'landsknecht' | 'summon'

export const CHARACTER_TYPE_LABELS: Readonly<Record<CharacterType, string>> = {
  knight: '騎士',
  scholar: '学者',
  politician: '政治家',
  magician: '魔術師',
  hunter: '狩人',
  rifleman: 'ライフル兵',
  artillery: '砲兵',
  landsknecht: 'ランツクネヒト',
  summon: '召喚',
}

/**
 * Ids kept for special characters, 991..999: the templates of summoned units (991 ドラゴン, 992 ゴーレム, 993 ベヒーモス),
 * which hold their pictures and default values and are never placed in the game. norden-data numbers new characters below them
 */
export const SPECIAL_CHARACTER_IDS = { min: 991, max: 999 } as const

/** Whether an id is one of a special character (991..999) */
export function isSpecialCharacterId(id: string): boolean {
  const n = Number(id)
  return Number.isInteger(n) && n >= SPECIAL_CHARACTER_IDS.min && n <= SPECIAL_CHARACTER_IDS.max
}

/**
 * The id norden-data gives a new character: one above the largest id below the special ones ('001'.. three digits),
 * null when 990 is taken and no id is left before them
 */
export function nextCharacterId(ids: readonly string[]): string | null {
  const ordinary = ids.map((id) => parseInt(id, 10) || 0).filter((n) => n < SPECIAL_CHARACTER_IDS.min)
  const next = Math.max(0, ...ordinary) + 1
  return next < SPECIAL_CHARACTER_IDS.min ? String(next).padStart(3, '0') : null
}

/** Where a character is drawn on the sprite sheets (src/assets/character-<n>.webp; sizes in characterSprite.json, read through characterSheets.ts) */
export interface CharacterImageInfo {
  /** Which sheet, and the cell's top left on it */
  sprite: { sheet: number; x: number; y: number }
  /** The face, relative to the sprite */
  faceRect: { x: number; y: number; width: number; height: number }
}

interface Relation {
  relation: 'father' | 'mother' | 'son' | 'daughter' | 'brother' | 'sister' | 'married' | 'best_friend'
  characterId: string
}

/**
 * Master data of a character, written by norden-data's character editor. Where
 * they serve is game state (src/game/); CHARACTER_START is where they begin.
 */
export interface Character {
  /** '001'..'999' */
  id: string
  name: string
  gender?: 'male' | 'female'
  /** 口調 */
  voiceTone?: VoiceToneId
  /** 性格。PERSONALITY_AXES の軸ごとに 1 つまで */
  personality?: PersonalityTag[]
  type: CharacterType
  imageInfo: CharacterImageInfo
  /** 政治・知力・統率・武力・魅力 (0-100) */
  politics: number
  intelligence: number
  leadership: number
  strength: number
  charm: number
  /** A mercenary (傭兵), hired for gold */
  mercenaryInfo?: {
    /** The company's name */
    name: string
    /** 契約金; the monthly fee is 1/MERCENARY_MONTHLY_DIVISOR of it */
    fee: number
    /** 最大兵力: their own soldiers at full strength (MAX_SOLDIERS at most) */
    maxSoldiers: number
    /** プライド (1..5): the higher, the more the standing with the mercenaries changes their price and whether they sign */
    pride: number
    /** The unit type of their company, one their type of character can lead. Omitted: the default of their type */
    unitType?: UnitTypeId
  }
  relations?: Relation[]
  biography?: string
  /** Head of their faction */
  isPatriarch?: boolean
}

/** Where a character serves when the game starts */
export interface CharacterStart {
  id: string
  /** The city they serve in, are held in, or (with no `factionId`) roam from */
  cityId: string
  /** Omitted: they serve nobody (a mercenary not hired, anyone else 放浪) */
  factionId?: string
  /** 怨恨勢力, for those starting 放浪 only */
  grudge?: string
  /** Lord of the city */
  isLord?: boolean
  /** Held prisoner in the city (捕虜); `factionId` is the faction they served (omitted: none) */
  isPrisoner?: boolean
}

export const CHARACTER_LIST: readonly Character[] = characterData as Character[]

export const CHARACTER_MAP: Readonly<Record<string, Character>> = Object.fromEntries(CHARACTER_LIST.map((c) => [c.id, c]))

export const CHARACTER_START: readonly CharacterStart[] = characterStart
