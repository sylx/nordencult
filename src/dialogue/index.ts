import { runScene, type AnyScene, type DialogueProviders, type InputOf, type RunOptions } from 'norden-dialogue'
import type { GameState } from '../game'
import { DIALOGUE_AUDIO } from './audio'
import { CAST } from './cast'
import { hireMercenaryScene } from './hireMercenary'
import { travelingMerchantScene } from './travelingMerchant'

/**
 * The dialogue scenes (src/dialogue/<id>.json: the script, <id>.ts: the flow). The game, the editor (norden-dialogue)
 * and the debug console find them here
 */
export const SCENES = {
  hireMercenary: hireMercenaryScene,
  travelingMerchant: travelingMerchantScene,
} satisfies Record<string, AnyScene<GameState>>

export type DialogueId = keyof typeof SCENES

/** What a scene's flow is given */
export type DialogueInput<K extends DialogueId> = InputOf<(typeof SCENES)[K]['input']>

export const isDialogueId = (id: string): id is DialogueId => Object.hasOwn(SCENES, id)

/** The characters, cities, backgrounds and sounds of the game, for the dialogue */
export const DIALOGUE_PROVIDERS: DialogueProviders = { ...CAST, ...DIALOGUE_AUDIO }

/** Plays a scene (runScene) and gives the state it ends with */
export const runDialogue = <K extends DialogueId>(id: K, input: DialogueInput<K>, options: RunOptions<GameState>): Promise<GameState> =>
  runScene(SCENES[id] as AnyScene<GameState>, input, options)
