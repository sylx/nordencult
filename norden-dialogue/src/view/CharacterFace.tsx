import type { CharacterInfo } from '../player'
import { faceRect, spriteStyle } from './sprite'

/** 騎士の顔（スプライトの faceRect）。大きさは className か style で決める */
export function CharacterFace({ info, className = '', size }: { info: CharacterInfo; className?: string; size?: number }) {
  return <span className={className} style={{ display: 'inline-block', ...(size && { width: size }), ...spriteStyle(info, faceRect(info)) }} role="img" aria-label={info.name} />
}
