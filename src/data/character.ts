import type { City } from "./city"
import type { Faction } from "./faction"
import CharacterData from "./characterData.json"

interface ImageInfo {
  // spriteシートの座標とサイズ
  sprite: {
    url: string
    x: number
    y: number
  }
  //顔部分矩形
  faceRect: {
    x: number
    y: number
    width: number
    height: number
  }
}
// 騎士、学者、政治家、魔法使い、狩人
type CharacterType = "knight" | "scholar" | "politician" | "magician" | "hunter"

// 傭兵の場合
interface MercenaryInfo {
  name: string
  fee: number
}

// 血縁関係
interface Relation {
  relation: "father" | "mother" | "son" | "daughter" | "brother" | "sister" | "married" | "best_friend"
  characterId: Character['id']
}

export interface Character {
  id: string //001-999
  name: string
  gender?: "male" | "female"
  type: CharacterType
  imageInfo: ImageInfo
  //能力値 政治 知力 統率 武力 魅力（0-100）
  politics: number
  intelligence: number
  leadership: number
  strength: number
  charm: number

  //傭兵情報
  mercenaryInfo?: MercenaryInfo
  //血縁関係
  relations?: Relation[]


  // 略歴
  biography?: string

  //所属都市
  belongTo?: City['id'] //P000-P030
  // 領主か？
  isLord?: boolean
  //所属派閥
  belongToFaction?: Faction['id']
  // 当主か？
  isPatriarch?: boolean
}

export const CHARACTER_LIST: Character[] = CharacterData as Character[]
