import { createContext, useContext } from 'react'
import type { SceneNavigator } from './types'

export const SceneContext = createContext<SceneNavigator | null>(null)

/** The current scene and goTo() for switching scenes */
export function useScene(): SceneNavigator {
  const navigator = useContext(SceneContext)
  if (!navigator) throw new Error('useScene() must be used inside <SceneManager>')
  return navigator
}
