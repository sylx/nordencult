import type { ScriptCatalog } from 'norden-dialogue'
import { SONGS } from 'norden-synth'
import { SE_NAMES } from '../audio/se'
import { CHARACTER_MAP } from '../data/character'
import { VOICE_TONE_IDS } from '../data/characterVoice'
import { BACKGROUND_NAMES } from './cast'
import { DIALOGUE_PANELS } from './panels'

const SONG_IDS = new Set(SONGS.map((song) => song.id))

/**
 * What the scripts may name: characters, backgrounds, songs, sound effects, 口調 and panels. For the tests and the editor
 * only (it loads every song)
 */
export const DIALOGUE_CATALOG: ScriptCatalog = {
  character: (id) => Object.hasOwn(CHARACTER_MAP, id),
  background: (name) => BACKGROUND_NAMES.includes(name),
  bgm: (id) => SONG_IDS.has(id),
  se: (name) => SE_NAMES.includes(name),
  tone: (id) => (VOICE_TONE_IDS as readonly string[]).includes(id),
  panel: (name) => Object.hasOwn(DIALOGUE_PANELS, name),
}
