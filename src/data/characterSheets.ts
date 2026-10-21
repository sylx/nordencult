import characterSprite from './characterSprite.json'

/**
 * The sprite sheets (src/assets/character-<n>.webp), written with characterSprite.json by norden-data's
 * character editor. A sheet holds 50 characters; WebP can't be taller than 16383px
 */
const SHEET_URLS = import.meta.glob<string>('../assets/character-*.webp', { eager: true, query: '?url', import: 'default' })

/** One character on a sheet */
export const { cellWidth: CHARACTER_CELL_W, cellHeight: CHARACTER_CELL_H } = characterSprite

export interface CharacterSheet {
  url: string
  width: number
  height: number
}

/** The sheet a character is drawn on (CharacterImageInfo's sprite.sheet) */
export function characterSheet(index: number): CharacterSheet {
  const { width, height } = characterSprite.sheets[index]
  return { url: SHEET_URLS[`../assets/character-${index}.webp`], width, height }
}
