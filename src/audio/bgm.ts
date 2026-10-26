import type { BgmPlayer } from 'norden-synth'

let player: Promise<BgmPlayer> | undefined

/**
 * The game's one BGM player, created on first use. norden-synth (with every song) is
 * loaded then, outside the main chunk. Its AudioContext starts on the first click or key press
 */
export function getBgm(): Promise<BgmPlayer> {
  player ??= import('norden-synth').then(
    ({ BgmPlayer }) => new BgmPlayer({ indexUrl: `${import.meta.env.BASE_URL}instruments/index.json` }),
  )
  return player
}

/** Switches to the song (a norden-synth song id), cross-fading; null fades out to silence */
export function playBgm(songId: string | null): void {
  getBgm()
    .then((bgm) => bgm.play(songId))
    .catch((err: unknown) => console.error(`bgm: cannot play ${songId}`, err))
}

// An edit of this module would otherwise leave the old player playing alongside the new one
import.meta.hot?.dispose(() => {
  void player?.then((p) => p.dispose())
  player = undefined
})
