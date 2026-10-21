import type { CSSProperties } from 'react'
import type { Character } from '../data/character'
import { CHARACTER_CELL_H, CHARACTER_CELL_W, characterSheet } from '../data/characterSheets'
import './CharacterImage.css'

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
  const { url, width: sheetW, height: sheetH } = characterSheet(sprite.sheet)
  const view = mode === 'face'
    ? { x: sprite.x + faceRect.x, y: sprite.y + faceRect.y, width: faceRect.width, height: faceRect.height }
    : { x: sprite.x, y: sprite.y, width: CHARACTER_CELL_W, height: CHARACTER_CELL_H }
  return (
    <div className={`character-image character-image--${mode} ${className}`}
      style={{ aspectRatio: `${view.width} / ${view.height}`, ...style }}>
      <div className="character-image__inner" style={{
        backgroundImage: `url(${url})`,
        backgroundSize: `${(sheetW / view.width) * 100}% ${(sheetH / view.height) * 100}%`,
        backgroundPosition: `${bgPos(view.x, sheetW, view.width)}% ${bgPos(view.y, sheetH, view.height)}%`,
      }} />
    </div>
  )
}
