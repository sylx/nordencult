import { useState } from 'react'
import { GameContext, createGameStore, createInitialState, readPlayerFaction } from './game'
import { SceneManager } from './scenes/SceneManager'
import { isSceneId } from './scenes/registry'
import type { SceneEntry } from './scenes/types'

/** ?scene=title opens that scene directly (scenes that take no parameters) */
function initialScene(): SceneEntry {
  const id = new URLSearchParams(window.location.search).get('scene')
  if (isSceneId(id) && (id === 'title' || id === 'strategy')) return { id, params: undefined }
  return { id: 'strategy', params: undefined }
}

export default function App() {
  // Above the scenes: the game goes on while they come and go
  const [store] = useState(() => createGameStore(createInitialState(readPlayerFaction(window.location.search))))
  return (
    <GameContext value={store}>
      <SceneManager initial={initialScene()} />
    </GameContext>
  )
}
