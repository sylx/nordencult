import { SceneManager } from './scenes/SceneManager'
import { isSceneId } from './scenes/registry'
import type { SceneEntry } from './scenes/types'

/** ?scene=title opens that scene directly (scenes that take no parameters) */
function initialScene(): SceneEntry {
  const id = new URLSearchParams(window.location.search).get('scene')
  if (isSceneId(id)) return { id, params: undefined }
  return { id: 'strategy', params: undefined }
}

export default function App() {
  return <SceneManager initial={initialScene()} />
}
