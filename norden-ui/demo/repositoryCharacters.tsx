import { useId } from 'react'

/** Optional access to the parent game's assets; the standalone catalog still works without them. */
export interface RepositoryCharacter {
  id: string
  name: string
  leadership: number
  strength: number
  intelligence: number
  imageInfo: {
    sprite: { sheet: number; x: number; y: number }
    faceRect: { x: number; y: number; width: number; height: number }
  }
}

const data = import.meta.glob<RepositoryCharacter[]>('../../src/data/characterData.json', { eager: true, import: 'default' })
// Characters are split over sheets of 50 (character-0.webp, character-1.webp, …); norden-data's character editor writes their sizes next to them
const sheetUrls = import.meta.glob<string>('../../src/assets/character-*.webp', { eager: true, query: '?url', import: 'default' })
const sprites = import.meta.glob<{ cellWidth: number; cellHeight: number; sheets: { width: number; height: number }[] }>('../../src/data/characterSprite.json', { eager: true, import: 'default' })
const sprite = Object.values(sprites)[0]
const { cellWidth: CELL_W, cellHeight: CELL_H } = sprite ?? { cellWidth: 512, cellHeight: 768 }
export const repositoryCharacters = sprite && Object.keys(sheetUrls).length > 0 ? Object.values(data)[0] ?? [] : []

function SheetImage({ sheet, clipPath }: { sheet: number; clipPath?: string }) {
  const size = sprite?.sheets[sheet]
  if (!size) return null
  return <image href={sheetUrls[`../../src/assets/character-${sheet}.webp`]} width={size.width} height={size.height} clipPath={clipPath} />
}

export function RepositoryPortrait({ character }: { character: RepositoryCharacter }) {
  const { sprite, faceRect } = character.imageInfo
  return <svg viewBox={`${sprite.x + faceRect.x} ${sprite.y + faceRect.y} ${faceRect.width} ${faceRect.height}`}
    preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <SheetImage sheet={sprite.sheet} />
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
    <SheetImage sheet={sprite.sheet} clipPath={`url(#${clipId})`} />
  </svg>
}
