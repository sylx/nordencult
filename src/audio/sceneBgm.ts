import type { SceneId } from '../scenes/types'

/**
 * The BGM of each scene (song ids of norden-synth/src/songs/). A song id switches
 * to that song, null fades out to silence, undefined keeps what is playing.
 */
export const SCENE_BGM: Record<SceneId, string | null | undefined> = {
  /** 霧の巡礼 */
  title: 'mist-pilgrim',
  /** 雪原の評議 */
  strategy: 'winter-council',
  /** 鬨の声 */
  battle: 'battle-cry',
  /** The battle's song goes on */
  battleResult: undefined,
}
