import type { CharacterInfo, DialogueProviders } from 'norden-dialogue'
import { CHARACTER_MAP } from '../data/character'
import { CHARACTER_CELL_H, CHARACTER_CELL_W, characterSheet } from '../data/characterSheets'
import { CITY_MAP } from '../data/city'

/** src/assets/bg/<name>.webp as the background <name> */
const BACKGROUNDS = import.meta.glob<string>('../assets/bg/*.webp', { eager: true, query: '?url', import: 'default' })

const BACKGROUND_URLS = new Map(Object.entries(BACKGROUNDS).map(([path, url]) => [path.replace(/^.*\//, '').replace(/\.webp$/, ''), url]))

/** The backgrounds there are pictures of */
export const BACKGROUND_NAMES: readonly string[] = [...BACKGROUND_URLS.keys()]

/** A character of the dialogue: their name and 口調, and where the sprite sheets draw them (the game and the editor use this) */
export function dialogueCharacter(id: string): CharacterInfo | undefined {
  const character = CHARACTER_MAP[id]
  if (!character) return undefined
  const { sprite, faceRect } = character.imageInfo
  const { url, width, height } = characterSheet(sprite.sheet)
  return {
    name: character.name,
    tone: character.voiceTone,
    sheetUrl: url,
    sheet: { width, height },
    cell: { x: sprite.x, y: sprite.y, width: CHARACTER_CELL_W, height: CHARACTER_CELL_H },
    face: faceRect,
  }
}

/** The characters, cities and backgrounds of the dialogue providers */
export const CAST: Pick<DialogueProviders, 'character' | 'city' | 'background'> = {
  character: dialogueCharacter,
  city: (id) => (CITY_MAP[id] ? { name: CITY_MAP[id].name } : undefined),
  background: (name) => BACKGROUND_URLS.get(name),
}
