import characterData from './characterData.json'
import characterStart from './characterStart.json'
import type { PersonalityTag, VoiceToneId } from './characterVoice'

/** 騎士・学者・政治家・魔法使い・狩人・ライフル兵・砲兵・ランツクネヒト */
export type CharacterType = 'knight' | 'scholar' | 'politician' | 'magician' | 'hunter' | 'rifleman' | 'artillery' | 'landsknecht'

export const CHARACTER_TYPE_LABELS: Readonly<Record<CharacterType, string>> = {
  knight: '騎士',
  scholar: '学者',
  politician: '政治家',
  magician: '魔法使い',
  hunter: '狩人',
  rifleman: 'ライフル兵',
  artillery: '砲兵',
  landsknecht: 'ランツクネヒト',
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
  mercenaryInfo?: { name: string; fee: number }
  relations?: Relation[]
  biography?: string
  /** Head of their faction */
  isPatriarch?: boolean
}

/** Where a character serves when the game starts */
export interface CharacterStart {
  id: string
  cityId: string
  /** Omitted: the faction of the city */
  factionId?: string
  /** Lord of the city */
  isLord?: boolean
}

export const CHARACTER_LIST: readonly Character[] = characterData as Character[]

export const CHARACTER_MAP: Readonly<Record<string, Character>> = Object.fromEntries(CHARACTER_LIST.map((c) => [c.id, c]))

export const CHARACTER_START: readonly CharacterStart[] = characterStart
