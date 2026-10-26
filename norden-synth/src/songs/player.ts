// 1 曲を Sequencer で鳴らす。曲ごとに Bus を持ち、まとめてフェードできる

import { Sequencer, type Bus, type Channel, type Position, type Synth, type Track } from '../synth/index.ts'
import { barAt, compileSong, type CompiledSong, type Song, type SongBar } from './song.ts'

export class SongPlayer {
  readonly compiled: CompiledSong
  readonly sequencer: Sequencer
  readonly bus: Bus
  // パート id → トラック。muted で鳴らさないようにできる
  readonly tracks: Map<string, Track>
  // false なら 1 回演奏したところで音符がなくなる (止めるのは呼び出し側)
  loop = true
  private stopTimer?: ReturnType<typeof setTimeout>

  // 音色を読み込んでから作る
  static async load(synth: Synth, song: Song | CompiledSong): Promise<SongPlayer> {
    const compiled = 'bars' in song ? song : compileSong(song)
    const instruments = await Promise.all(compiled.song.parts.map((p) => synth.loadInstrument(p.instrument)))
    const bus = synth.createBus()
    const channels = compiled.song.parts.map((part, i) => {
      const ch = synth.createChannel(instruments[i], bus)
      ch.volume = part.volume
      ch.pan = part.pan
      return ch
    })
    return new SongPlayer(synth, compiled, bus, channels)
  }

  private constructor(synth: Synth, compiled: CompiledSong, bus: Bus, channels: Channel[]) {
    this.compiled = compiled
    this.bus = bus
    const { song } = compiled
    this.sequencer = new Sequencer(synth.ctx, { tempo: song.tempo })

    // 小節ごとに最初に呼ばれる。拍子を決め、リタルダンドの後はテンポを戻す
    let ramped = false
    this.sequencer.conductor = (bar) => {
      if (bar.index === 0) ramped = false
      const b = barAt(compiled, bar.index, this.loop)
      if (b) bar.timeSignature = b.timeSignature
      if (ramped) {
        bar.setTempo(song.tempo)
        ramped = false
      }
      const rit = b?.section.ritardando
      if (rit && b.barInSection === b.section.chords.length - 1) {
        bar.rampTempo(song.tempo * rit, 0, bar.beats)
        ramped = true
      }
    }
    this.tracks = new Map(
      song.parts.map((part, i) => [
        part.id,
        this.sequencer.addTrack(channels[i], (bar) => {
          for (const n of barAt(compiled, bar.index, this.loop)?.notes.get(part.id) ?? []) bar.note(n.beat, n.key, n.velocity, n.duration)
        }),
      ]),
    )
  }

  get song(): Song {
    return this.compiled.song
  }

  get playing(): boolean {
    return this.sequencer.playing
  }

  // 曲頭から鳴らす。fadeIn 秒かけて音量を上げる
  start(fadeIn = 0): void {
    clearTimeout(this.stopTimer)
    this.bus.fade(1, fadeIn, fadeIn > 0 ? 0 : 1)
    this.sequencer.tempo = this.song.tempo
    this.sequencer.start()
  }

  // fadeOut 秒かけて音量を下げてから止める。フェードの間も先の音符を予約し続ける
  stop(fadeOut = 0): void {
    clearTimeout(this.stopTimer)
    if (!this.playing) return
    if (fadeOut <= 0) {
      this.sequencer.stop()
      return
    }
    this.bus.fade(0, fadeOut)
    this.stopTimer = setTimeout(() => this.sequencer.stop(), fadeOut * 1000)
  }

  // すぐに止めて、出力から外す。以後は使えない
  dispose(): void {
    clearTimeout(this.stopTimer)
    this.sequencer.stop()
    this.bus.disconnect()
  }

  // 今鳴っている位置と小節。ループしない曲で最後の小節を過ぎていれば bar は undefined
  position(): { position: Position; bar: SongBar | undefined } | undefined {
    const position = this.sequencer.position()
    return position && { position, bar: barAt(this.compiled, position.bar, this.loop) }
  }
}
