import { endFactionTurn } from './actions'
import { createInitialState } from './setup'
import type { FactionId, GameState } from './types'

/** For tests: turn 1 with the player playing `factions`, in the strategy phase of the first of them */
export function playing(...factions: FactionId[]): GameState {
  let state = createInitialState(factions)
  while (state.activeFaction !== factions[0]) state = endFactionTurn(state)
  return state
}

/** A state with no summoned unit, for what looks a character up in the summons only */
export const NO_SUMMONS: Pick<GameState, 'summons'> = { summons: {} }
