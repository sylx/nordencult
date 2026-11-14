import type { Song } from '../songs/song.ts'

interface Player {
  loop: boolean
  start(): void
  stop(): void
}

// 読み込み中の停止・候補変更でも古い要求が後から再生されないようにする。
export class ComparisonTransport<T extends Player> {
  private request = 0
  private loads = new Map<string, Promise<T>>()
  current?: T

  stop(): void {
    this.request++
    this.current?.stop()
    this.current = undefined
  }

  async play(song: Song, load: (song: Song) => Promise<T>, loop: () => boolean): Promise<T | undefined> {
    this.stop()
    const token = this.request
    let pending = this.loads.get(song.id)
    if (!pending) {
      pending = load(song)
      this.loads.set(song.id, pending)
      pending.catch(() => this.loads.delete(song.id))
    }
    try {
      const player = await pending
      if (token !== this.request) return
      player.loop = loop()
      this.current = player
      player.start()
      return player
    } catch (error) {
      if (token === this.request) throw error
    }
  }
}
