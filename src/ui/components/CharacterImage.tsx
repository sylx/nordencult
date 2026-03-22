import type { Character } from '../../data/character'
import CharacterSpriteSheet from '../../assets/character.webp'
import './CharacterImage.css'

export type CharacterImageMode = 'full' | 'face'

// スプライトシート上の1キャラクターのサイズ
const SPRITE_W = 512
const SPRITE_H = 768

// スプライトシート全体のサイズ
const SHEET_W = 2560
const SHEET_H = 4608

export interface CharacterImageProps {
  character: Character
  mode?: CharacterImageMode
  className?: string
  style?: React.CSSProperties
}

/**
 * background-position をパーセンテージで計算する。
 * CSS の % 指定は (containerSize - bgSize) * pct / 100 = offset なので
 * pct = offset / (bgSize - containerSize) * 100
 *     = offset / (sheetDim / viewDim * containerSize - containerSize) * 100
 * containerSize が消えて pct = offset / (sheetDim - viewDim) * 100 になる。
 */
function bgPos(offset: number, sheetDim: number, viewDim: number): number {
  const denom = sheetDim - viewDim
  return denom > 0 ? (offset / denom) * 100 : 0
}

export default function CharacterImage({
  character,
  mode = 'full',
  className,
  style,
}: CharacterImageProps) {
  const { sprite, faceRect } = character.imageInfo

  if (mode === 'face') {
    // 顔モード: faceRectで切り抜き
    const bgSizeX = (SHEET_W / faceRect.width) * 100
    const bgSizeY = (SHEET_H / faceRect.height) * 100
    const posX = bgPos(sprite.x + faceRect.x, SHEET_W, faceRect.width)
    const posY = bgPos(sprite.y + faceRect.y, SHEET_H, faceRect.height)

    return (
      <div
        className={`character-image character-image--face ${className || ''}`}
        style={{
          aspectRatio: `${faceRect.width} / ${faceRect.height}`,
          ...style,
        }}
      >
        <div
          className="character-image-inner"
          style={{
            backgroundImage: `url(${CharacterSpriteSheet})`,
            backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
            backgroundPosition: `${posX}% ${posY}%`,
          }}
        />
      </div>
    )
  }

  // 全身モード
  const posX = bgPos(sprite.x, SHEET_W, SPRITE_W)
  const posY = bgPos(sprite.y, SHEET_H, SPRITE_H)

  return (
    <div
      className={`character-image character-image--full ${className || ''}`}
      style={{
        aspectRatio: `2 / 3`,
        ...style,
      }}
    >
      <div
        className="character-image-inner"
        style={{
          backgroundImage: `url(${CharacterSpriteSheet})`,
          backgroundSize: `500%`,
          backgroundPosition: `${posX}% ${posY}%`,
        }}
      />
    </div>
  )
}
