import { createContext, useContext, useSyncExternalStore } from 'react'
import type { GameStore } from './store'
import type { GameState } from './types'

export const GameContext = createContext<GameStore | null>(null)

/** The game state, and update() to apply an action to it */
export function useGame(): { state: GameState; update: GameStore['update'] } {
  const store = useContext(GameContext)
  if (!store) throw new Error('useGame() must be used inside <GameContext>')
  const state = useSyncExternalStore(store.subscribe, store.getState)
  return { state, update: store.update }
}
