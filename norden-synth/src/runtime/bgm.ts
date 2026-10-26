// ゲームの BGM。曲 id を指定すると、今の曲をフェードアウトしながら次の曲をフェードインする

import { SONGS, type Song } from '../songs/index.ts'
import { SongPlayer } from '../songs/player.ts'
import { Synth, type SynthOptions } from '../synth/index.ts'

export interface BgmPlayerOptions extends SynthOptions {
  // 鳴らせる曲。既定は SONGS
  songs?: Song[]
  // 曲を切り替えるときのフェードの秒数。既定 1.5
  fade?: number
  // タブが裏に回るか、ウィンドウのフォーカスが外れている間は一時停止する。既定 true
  pauseWhenInactive?: boolean
}

export class BgmPlayer {
  readonly synth: Synth
  // 切り替えのフェードの秒数 (play / stop で省略したとき)
  fade: number
  private readonly songs: Map<string, Song>
  private player?: SongPlayer
  // 最後に指定された曲。読み込み中に別の曲が指定されたら、読み込み終わった方は捨てる
  private requested?: string
  private level = 1
  private readonly pauseWhenInactive: boolean
  private paused = false
  private suspendTimer?: ReturnType<typeof setTimeout>
  private readonly unlock = () => {
    // 一時停止中は再開しない (戻ったときに updateActive が再開する)
    if (this.paused) return
    void this.synth.resume().then(() => {
      if (this.synth.ctx.state === 'running') this.removeUnlockListeners()
    })
  }
  private readonly updateActive = () => {
    const active = document.visibilityState === 'visible' && document.hasFocus()
    if (active === !this.paused) return
    this.paused = !active
    if (this.paused) this.suspend()
    else this.resumeFromPause()
  }

  constructor(options: BgmPlayerOptions = {}) {
    const { songs = SONGS, fade = 1.5, pauseWhenInactive = true, ...synthOptions } = options
    this.synth = new Synth(undefined, synthOptions)
    this.fade = fade
    this.songs = new Map(songs.map((s) => [s.id, s]))
    this.pauseWhenInactive = pauseWhenInactive
    // ブラウザの自動再生制限で AudioContext は止まった状態で始まることがある。最初のユーザー操作で再開する
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, this.unlock, { capture: true })
    if (pauseWhenInactive) {
      this.synth.ctx.addEventListener('statechange', this.onRunning)
      document.addEventListener('visibilitychange', this.updateActive)
      window.addEventListener('blur', this.updateActive)
      window.addEventListener('focus', this.updateActive)
      this.updateActive()
    }
  }

  // 鳴っている (または読み込み中の) 曲の id
  get current(): string | undefined {
    return this.requested
  }

  // 0..1 程度。ミックスとは別の最終的な音量
  get volume(): number {
    return this.level
  }

  set volume(value: number) {
    this.level = value
    if (this.paused) return
    const gain = this.synth.output.gain
    gain.cancelScheduledValues(this.synth.currentTime)
    gain.value = value
  }

  // 非アクティブで一時停止しているか
  get inactive(): boolean {
    return this.paused
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
    clearTimeout(this.suspendTimer)
    if (this.pauseWhenInactive) {
      document.removeEventListener('visibilitychange', this.updateActive)
      window.removeEventListener('blur', this.updateActive)
      window.removeEventListener('focus', this.updateActive)
    }
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

  // AudioContext ごと止める。曲の位置 (AudioContext の時刻) も止まるので、再開すると続きから鳴る。
  // いきなり止めるとプツッと鳴るので、少し絞ってから止める
  private suspend(): void {
    const t = this.synth.currentTime
    const gain = this.synth.output.gain
    gain.cancelScheduledValues(t)
    gain.setValueAtTime(gain.value, t)
    gain.linearRampToValueAtTime(0, t + PAUSE_FADE)
    clearTimeout(this.suspendTimer)
    this.suspendTimer = setTimeout(() => {
      // 止めている途中で戻ったら、止め終わってから再開する
      void this.synth.ctx.suspend().then(() => {
        if (!this.paused) this.synth.resume().catch(() => {})
      })
    }, PAUSE_FADE * 1000 + 20)
  }

  // 止める前に戻ったなら、そのまま音量を戻す。止めていれば動き出したとき (onRunning) に戻す。
  // 自動再生制限が解けていなければ、最初のユーザー操作まで止まったまま
  private resumeFromPause(): void {
    clearTimeout(this.suspendTimer)
    if (this.synth.ctx.state === 'running') this.restoreLevel()
    else this.synth.resume().catch(() => {})
  }

  private readonly onRunning = () => {
    if (this.synth.ctx.state === 'running' && !this.paused) this.restoreLevel()
  }

  private restoreLevel(): void {
    const t = this.synth.currentTime
    const gain = this.synth.output.gain
    gain.cancelScheduledValues(t)
    gain.setValueAtTime(gain.value, t)
    gain.linearRampToValueAtTime(this.level, t + RESUME_FADE)
  }

  private removeUnlockListeners(): void {
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, this.unlock, { capture: true })
  }
}

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const
// 一時停止で絞る秒数と、再開で戻す秒数
const PAUSE_FADE = 0.15
const RESUME_FADE = 0.4
