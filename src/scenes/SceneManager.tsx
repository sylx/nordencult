import { Suspense, useMemo, useState, type ComponentType } from 'react'
import { SCENES } from './registry'
import { SceneContext } from './sceneContext'
import type { GoTo, SceneEntry, SceneNavigator } from './types'
import './SceneManager.css'

interface Props {
  initial: SceneEntry
}

/** Shows one scene at a time. Leaving a scene unmounts it, which disposes what it holds (e.g. the WebGL map) */
export function SceneManager({ initial }: Props) {
  const [current, setCurrent] = useState<SceneEntry>(initial)
  const navigator = useMemo<SceneNavigator>(() => {
    const goTo: GoTo = (id, ...params) => setCurrent({ id, params: params[0] } as SceneEntry)
    return { current, goTo }
  }, [current])
  // The registry pairs each id with its own props type; TypeScript cannot follow that through the union
  const Scene = SCENES[current.id] as ComponentType<{ params: SceneEntry['params'] }>

  return (
    <SceneContext value={navigator}>
      <Suspense fallback={<div className="scene-loading">読み込み中…</div>}>
        <div className="scene" key={current.id} data-scene={current.id}>
          <Scene params={current.params} />
        </div>
      </Suspense>
    </SceneContext>
  )
}
