// ゲームの BGM。曲 id を指定すると、今の曲をフェードアウトしながら次の曲をフェードインする

import { SONGS, type Song } from '../songs/index.ts'
import { SongPlayer } from '../songs/player.ts'
import { Synth, type SynthOptions } from '../synth/index.ts'

export interface BgmPlayerOptions extends SynthOptions {
  // 鳴らせる曲。既定は SONGS
  songs?: Song[]
  // 曲を切り替えるときのフェードの秒数。既定 1.5
  fade?: number
}

export class BgmPlayer {
  readonly synth: Synth
  // 切り替えのフェードの秒数 (play / stop で省略したとき)
  fade: number
  private readonly songs: Map<string, Song>
  private player?: SongPlayer
  // 最後に指定された曲。読み込み中に別の曲が指定されたら、読み込み終わった方は捨てる
  private requested?: string
  private readonly unlock = () => {
    void this.synth.resume().then(() => {
      if (this.synth.ctx.state === 'running') this.removeUnlockListeners()
    })
  }

  constructor(options: BgmPlayerOptions = {}) {
    const { songs = SONGS, fade = 1.5, ...synthOptions } = options
    this.synth = new Synth(undefined, synthOptions)
    this.fade = fade
    this.songs = new Map(songs.map((s) => [s.id, s]))
    // ブラウザの自動再生制限で AudioContext は止まった状態で始まることがある。最初のユーザー操作で再開する
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, this.unlock, { capture: true })
  }

  // 鳴っている (または読み込み中の) 曲の id
  get current(): string | undefined {
    return this.requested
  }

  // 0..1 程度。ミックスとは別の最終的な音量
  get volume(): number {
    return this.synth.output.gain.value
  }

  set volume(value: number) {
    this.synth.output.gain.value = value
  }

  // id の曲に切り替える。同じ曲が鳴っていれば何もしない。null で止める。
  // 音色の読み込みが終わってから切り替えるので、それまでは今の曲が鳴り続ける
  async play(id: string | null, fade = this.fade): Promise<void> {
    if (id === null) return this.stop(fade)
    if (id === this.requested) return
    const song = this.songs.get(id)
    if (!song) throw new Error(`unknown song: ${id}`)
    this.requested = id
    // 別の曲を読み込んでいる間に今の曲へ戻した
    if (id === this.player?.song.id) return
    let next: SongPlayer
    try {
      next = await SongPlayer.load(this.synth, song)
    } catch (err) {
      if (this.requested === id) this.requested = this.player?.song.id
      throw err
    }
    if (this.requested !== id) {
      next.dispose()
      return
    }
    this.release(fade)
    this.player = next
    next.start(fade)
  }

  // 今の曲をフェードアウトして止める
  stop(fade = this.fade): void {
    this.requested = undefined
    this.release(fade)
  }

  // 曲の音色を先に読み込んでおく
  async preload(ids: string[]): Promise<void> {
    const songs = ids.map((id) => this.songs.get(id)).filter((s) => s !== undefined)
    await Promise.all(songs.flatMap((s) => s.parts.map((p) => this.synth.loadInstrument(p.instrument))))
  }

  // すぐに止めて AudioContext を閉じる。以後は使えない
  dispose(): void {
    this.removeUnlockListeners()
    this.requested = undefined
    this.player?.dispose()
    this.player = undefined
    void this.synth.ctx.close()
  }

  private release(fade: number): void {
    const player = this.player
    if (!player) return
    this.player = undefined
    player.stop(fade)
    // フェードし終わったら出力から外す (音量 0 なので残響が切れても聞こえない)。フェードしないときは余韻を待つ
    setTimeout(() => player.dispose(), (fade > 0 ? fade + 0.5 : 8) * 1000)
  }

  private removeUnlockListeners(): void {
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, this.unlock, { capture: true })
  }
}

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const
