import type { BgmPlayer } from 'norden-synth'
import { getVolumes, subscribeVolumes, volumeGain } from './volume'

let player: Promise<BgmPlayer> | undefined
/** The last song asked for, played when the BGM is turned up before the player was made */
let requested: string | null = null

/**
 * The game's one BGM player, created on first use. norden-synth (with every song) is
 * loaded then, outside the main chunk. Its AudioContext starts on the first click or key press.
 * At volume 0 the player stops its AudioContext
 */
export function getBgm(): Promise<BgmPlayer> {
  player ??= import('norden-synth').then(({ BgmPlayer }) => {
    const bgm = new BgmPlayer({ indexUrl: `${import.meta.env.BASE_URL}instruments/index.json` })
    bgm.volume = volumeGain(getVolumes().bgm)
    return bgm
  })
  return player
}

/**
 * Switches to the song (a norden-synth song id), cross-fading; null fades out to silence.
 * While the BGM is at 0 from the start, norden-synth and its instruments are not loaded until it is turned up
 */
export function playBgm(songId: string | null): void {
  requested = songId
  if (!player && getVolumes().bgm === 0) return
  getBgm()
    .then((bgm) => bgm.play(songId))
    .catch((err: unknown) => console.error(`bgm: cannot play ${songId}`, err))
}

const unsubscribe = subscribeVolumes(() => {
  const { bgm } = getVolumes()
  if (player) void player.then((p) => (p.volume = volumeGain(bgm)))
  else if (bgm > 0 && requested !== null) playBgm(requested)
})

// An edit of this module would otherwise leave the old player playing alongside the new one
import.meta.hot?.dispose(() => {
  unsubscribe()
  void player?.then((p) => p.dispose())
  player = undefined
})
