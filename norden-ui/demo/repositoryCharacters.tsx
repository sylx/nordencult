import { useId } from 'react'

/** Optional access to the parent game's assets; the standalone catalog still works without them. */
export interface RepositoryCharacter {
  id: string
  name: string
  leadership: number
  strength: number
  intelligence: number
  imageInfo: {
    sprite: { x: number; y: number }
    faceRect: { x: number; y: number; width: number; height: number }
  }
}

const data = import.meta.glob<RepositoryCharacter[]>('../../src/data/characterData.json', { eager: true, import: 'default' })
const sheets = import.meta.glob<string>('../../src/assets/character.webp', { eager: true, query: '?url', import: 'default' })
const sheet = Object.values(sheets)[0]
// The sheet's size changes as characters are added; norden-data's character editor writes it next to the sheet
const sprites = import.meta.glob<{ width: number; height: number; cellWidth: number; cellHeight: number }>('../../src/data/characterSprite.json', { eager: true, import: 'default' })
const { width: SHEET_W, height: SHEET_H, cellWidth: CELL_W, cellHeight: CELL_H } = Object.values(sprites)[0] ?? { width: 2560, height: 7680, cellWidth: 512, cellHeight: 768 }
export const repositoryCharacters = sheet ? Object.values(data)[0] ?? [] : []

export function RepositoryPortrait({ character }: { character: RepositoryCharacter }) {
  const { sprite, faceRect } = character.imageInfo
  return <svg viewBox={`${sprite.x + faceRect.x} ${sprite.y + faceRect.y} ${faceRect.width} ${faceRect.height}`}
    preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <image href={sheet} width={SHEET_W} height={SHEET_H} />
  </svg>
}

export function RepositoryCharacterArt({ character }: { character: RepositoryCharacter }) {
  const clipId = useId()
  const { sprite } = character.imageInfo
  return <svg viewBox={`${sprite.x} ${sprite.y} ${CELL_W} ${CELL_H}`}
    preserveAspectRatio="xMidYMin slice" aria-hidden="true">
    <defs><clipPath id={clipId}>
      <rect x={sprite.x} y={sprite.y} width={CELL_W} height={CELL_H} />
    </clipPath></defs>
    <image href={sheet} width={SHEET_W} height={SHEET_H} clipPath={`url(#${clipId})`} />
  </svg>
}
