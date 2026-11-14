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
  /** 凍土の鉄騎 */
  battle: 'tundra-march',
  /** 戦果に応じて BattleResultScene が victor-accolade / fallen-requiem を切り替える */
  battleResult: undefined,
}
