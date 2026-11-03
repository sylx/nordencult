import type { DialogueProviders } from 'norden-dialogue'
import { playBgm } from '../audio/bgm'
import { playSe } from '../audio/se'

/** The BGM and sound effects of the dialogue providers: the game's own (the editor plays them too) */
export const DIALOGUE_AUDIO: Pick<DialogueProviders, 'playBgm' | 'playSe'> = { playBgm, playSe }
