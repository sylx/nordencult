import { defineScene, type InputOf, type InputSpec, type Scene, type SceneRun, type ScriptShape } from 'norden-dialogue'
import type { GameState } from '../game'

/** A dialogue scene of the game, as norden-dialogue's over the game state */
export type GameScene<S extends ScriptShape, I extends InputSpec> = Scene<S, GameState, I>

/**
 * A dialogue scene of the game: its script (the JSON imported), the input of its flow, the flow, and the input the
 * editor and the debug console try it with when none is given (null: it cannot happen in that state)
 */
export const gameScene = <S extends ScriptShape, I extends InputSpec>(
  script: S, input: I, run: SceneRun<S, GameState, I>, sample?: (state: GameState) => InputOf<I> | null,
): GameScene<S, I> => defineScene(script, input, run, sample)
