import type { CSSProperties } from 'react'
import type { CharacterInfo, Rect } from '../player'

/** シートの上の矩形を、要素いっぱいに描く（要素の大きさによらない % 指定） */
export function spriteStyle(info: CharacterInfo, rect: Rect): CSSProperties {
  const { width, height } = info.sheet
  const position = (offset: number, size: number, total: number) => (total === size ? 0 : (offset / (total - size)) * 100)
  return {
    backgroundImage: `url(${info.sheetUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${(width / rect.width) * 100}% ${(height / rect.height) * 100}%`,
    backgroundPosition: `${position(rect.x, rect.width, width)}% ${position(rect.y, rect.height, height)}%`,
    aspectRatio: `${rect.width} / ${rect.height}`,
  }
}

/** 顔: シートの上の矩形 */
export const faceRect = ({ cell, face }: CharacterInfo): Rect => ({ x: cell.x + face.x, y: cell.y + face.y, width: face.width, height: face.height })
