import type { GameState } from './types'

/** Holds the game state above the scenes, so that it survives switching scenes */
export interface GameStore {
  getState: () => GameState
  subscribe: (listener: () => void) => () => void
  /** Replaces the state with what an action (e.g. addOrder) makes of it; actions throw GameRuleError when not allowed */
  update: (action: (state: GameState) => GameState) => void
}

export function createGameStore(initial: GameState): GameStore {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    update: (action) => {
      const next = action(state)
      if (next === state) return
      state = next
      for (const listener of listeners) listener()
    },
  }
}
