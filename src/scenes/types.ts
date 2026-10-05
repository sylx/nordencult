/**
 * Every scene and the parameters it is entered with. Adding a scene: add its
 * entry here and its component in registry.ts, e.g. `battle: { cityId: string }`.
 */
export interface SceneParams {
  title: undefined
  strategy: undefined
}

export type SceneId = keyof SceneParams

/** A scene to show, with its parameters */
export type SceneEntry = { [K in SceneId]: { id: K; params: SceneParams[K] } }[SceneId]

/** Props each scene component receives */
export interface SceneProps<K extends SceneId> {
  params: SceneParams[K]
}

/** goTo('title') for scenes without parameters, goTo('battle', { cityId }) otherwise */
export type GoTo = <K extends SceneId>(id: K, ...params: SceneParams[K] extends undefined ? [] : [SceneParams[K]]) => void

export interface SceneNavigator {
  current: SceneEntry
  goTo: GoTo
}
