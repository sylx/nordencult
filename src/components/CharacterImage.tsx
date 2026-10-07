import type { CSSProperties } from 'react'
import type { Character } from '../data/character'
import spriteSheet from '../assets/character.webp'
import './CharacterImage.css'

/** One character on the sprite sheet, and the whole sheet */
const SPRITE_W = 512
const SPRITE_H = 768
const SHEET_W = 2560
const SHEET_H = 4608

interface Props {
  character: Character
  /** full: the whole figure (2:3), face: the face cut out */
  mode?: 'full' | 'face'
  className?: string
  style?: CSSProperties
}

/**
 * background-position in %: the offset is (container - background) * pct / 100,
 * so pct = offset / (sheet - view) * 100 whatever the container's size.
 */
function bgPos(offset: number, sheetDim: number, viewDim: number): number {
  const denom = sheetDim - viewDim
  return denom > 0 ? (offset / denom) * 100 : 0
}

/** A character's portrait from the sprite sheet (moved from nordencult-old) */
export function CharacterImage({ character, mode = 'full', className = '', style }: Props) {
  const { sprite, faceRect } = character.imageInfo
  const view = mode === 'face'
    ? { x: sprite.x + faceRect.x, y: sprite.y + faceRect.y, width: faceRect.width, height: faceRect.height }
    : { x: sprite.x, y: sprite.y, width: SPRITE_W, height: SPRITE_H }
  return (
    <div className={`character-image character-image--${mode} ${className}`}
      style={{ aspectRatio: `${view.width} / ${view.height}`, ...style }}>
      <div className="character-image__inner" style={{
        backgroundImage: `url(${spriteSheet})`,
        backgroundSize: `${(SHEET_W / view.width) * 100}% ${(SHEET_H / view.height) * 100}%`,
        backgroundPosition: `${bgPos(view.x, SHEET_W, view.width)}% ${bgPos(view.y, SHEET_H, view.height)}%`,
      }} />
    </div>
  )
}
