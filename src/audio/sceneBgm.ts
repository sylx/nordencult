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
  /** 凱旋の叙勲 (勝利ファンファーレ〜戦後処理) */
  battleResult: 'victor-accolade',
}
