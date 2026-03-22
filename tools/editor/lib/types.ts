export interface SpriteInfo {
  url: string;
  x: number;
  y: number;
}

export interface FaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageInfo {
  sprite: SpriteInfo;
  faceRect: FaceRect;
}

export interface MercenaryInfo {
  name: string;
  fee: number;
}

export interface Relation {
  relation: "father" | "mother" | "son" | "daughter" | "brother" | "sister" | "married" | "best_friend";
  characterId: string;
}

export interface Character {
  id: string;
  name: string;
  gender?: "male" | "female";
  type: string;
  imageInfo: ImageInfo;
  politics: number;
  intelligence: number;
  leadership: number;
  strength: number;
  charm: number;
  mercenaryInfo?: MercenaryInfo | null;
  relations?: Relation[] | null;
  biography?: string;
  belongTo?: string | null;
  isLord?: boolean;
  belongToFaction?: string | null;
  isPatriarch?: boolean;
}
