import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { SceneId, SceneProps } from './types'

/** Scene components, loaded when first entered */
export const SCENES: { [K in SceneId]: LazyExoticComponent<ComponentType<SceneProps<K>>> } = {
  title: lazy(() => import('./title/TitleScene')),
  strategy: lazy(() => import('./strategy/StrategyScene')),
  battle: lazy(() => import('./battle/BattleScene')),
  battleResult: lazy(() => import('./battleResult/BattleResultScene')),
}

export const isSceneId = (value: string | null): value is SceneId =>
  value !== null && Object.hasOwn(SCENES, value)
