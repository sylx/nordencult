import { Instrument, loadInstrument } from './instrument.ts'
import { createReverbImpulse } from './reverb.ts'
import type { InstrumentIndex, InstrumentIndexEntry } from './types.ts'
import { Voice, type VoiceTarget } from './voice.ts'

export interface SynthOptions {
  // index.json の URL
  indexUrl?: string
  // 同時発音数の上限。超えたら古いボイスから止める
  maxVoices?: number
}

export class Synth {
  readonly ctx: AudioContext
  readonly master: GainNode
  readonly reverb: ConvolverNode
  readonly reverbReturn: GainNode
  readonly maxVoices: number
  private readonly dry: GainNode
  private readonly indexUrl: URL
  private index?: Promise<InstrumentIndexEntry[]>
  private readonly instruments = new Map<string, Promise<Instrument>>()
  private readonly voices = new Set<Voice>()

  constructor(ctx: AudioContext = new AudioContext(), options: SynthOptions = {}) {
    this.ctx = ctx
    this.indexUrl = new URL(options.indexUrl ?? 'instruments/index.json', location.href)
    this.maxVoices = options.maxVoices ?? 96

    // dry と reverb をまとめて、リミッタ代わりのコンプレッサを通して出力する
    const compressor = new DynamicsCompressorNode(ctx, { threshold: -6, knee: 6, ratio: 8, attack: 0.003, release: 0.25 })
    this.master = new GainNode(ctx, { gain: 0.5 })
    this.master.connect(compressor).connect(ctx.destination)

    this.dry = new GainNode(ctx)
    this.dry.connect(this.master)

    this.reverb = new ConvolverNode(ctx, { buffer: createReverbImpulse(ctx) })
    this.reverbReturn = new GainNode(ctx, { gain: 0.6 })
    this.reverb.connect(this.reverbReturn).connect(this.master)
  }

  // ブラウザの自動再生制限で suspended の場合があるので、ユーザー操作の中で呼ぶ
  resume(): Promise<void> {
    return this.ctx.resume()
  }

  get currentTime(): number {
    return this.ctx.currentTime
  }

  get activeVoiceCount(): number {
    return this.voices.size
  }

  listInstruments(): Promise<InstrumentIndexEntry[]> {
    this.index ??= fetch(this.indexUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`failed to fetch ${this.indexUrl}: ${r.status}`)
        return r.json() as Promise<InstrumentIndex>
      })
      .then((i) => i.instruments)
    return this.index
  }

  // id (例: "violin") または音色名で楽器を読み込む。同じ楽器は一度だけ読み込む
  async loadInstrument(idOrName: string): Promise<Instrument> {
    const entries = await this.listInstruments()
    const entry = entries.find((e) => e.id === idOrName || e.name === idOrName)
    if (!entry) throw new Error(`unknown instrument: ${idOrName}`)
    let loading = this.instruments.get(entry.id)
    if (!loading) {
      loading = loadInstrument(new URL(entry.url, this.indexUrl))
      loading.catch(() => this.instruments.delete(entry.id))
      this.instruments.set(entry.id, loading)
    }
    return loading
  }

  createChannel(instrument: Instrument): Channel {
    return new Channel(this, instrument, this.dry, this.reverb)
  }

  allNotesOff(time = this.ctx.currentTime): void {
    for (const v of this.voices) v.release(time)
  }

  /** @internal Channel から呼ばれる */
  startVoice(
    instrument: Instrument,
    key: number,
    velocity: number,
    time: number,
    target: VoiceTarget,
  ): Voice[] {
    // キーは小数 (微分音) でもよい。リージョンは最も近い半音で選び、音程は小数のまま使う
    velocity = Math.max(1, Math.min(127, Math.round(velocity)))
    const started: Voice[] = []
    for (const region of instrument.findRegions(Math.round(key), velocity)) {
      const voice = new Voice(this.ctx, region, instrument.samples[region.sample], key, velocity, time, target)
      voice.onended = (v) => this.voices.delete(v)
      this.voices.add(voice)
      started.push(voice)
    }
    this.stealVoices(time)
    return started
  }

  private stealVoices(time: number): void {
    const alive = [...this.voices].filter((v) => !v.killed)
    let excess = alive.length - this.maxVoices
    if (excess <= 0) return
    // リリース中のものを優先し、古い順に止める
    const candidates = alive.sort(
      (a, b) => Number(b.released) - Number(a.released) || a.startTime - b.startTime,
    )
    for (const v of candidates) {
      if (excess-- <= 0) break
      v.kill(time)
    }
  }
}

// 1 つの楽器を鳴らすパート。音量・パン・リバーブ量を持つ
//
//   voices → dryIn → panner → Synth の dry
//   voices → wetIn → reverbAmount → Synth の reverb
export class Channel {
  readonly synth: Synth
  instrument: Instrument
  private readonly dryIn: GainNode
  private readonly wetIn: GainNode
  private readonly reverbAmount: GainNode
  private readonly panner: StereoPannerNode
  private readonly target: VoiceTarget
  private readonly held = new Map<number, Voice[]>()

  constructor(synth: Synth, instrument: Instrument, dry: AudioNode, reverb: AudioNode) {
    const ctx = synth.ctx
    this.synth = synth
    this.instrument = instrument
    this.dryIn = new GainNode(ctx)
    this.wetIn = new GainNode(ctx)
    this.reverbAmount = new GainNode(ctx)
    this.panner = new StereoPannerNode(ctx)
    this.dryIn.connect(this.panner).connect(dry)
    this.wetIn.connect(this.reverbAmount).connect(reverb)
    this.target = { output: this.dryIn, reverb: this.wetIn }
  }

  // 0..1 程度
  set volume(value: number) {
    this.dryIn.gain.value = value
    this.wetIn.gain.value = value
  }

  get volume(): number {
    return this.dryIn.gain.value
  }

  // 音色ごとのリバーブ送り量に掛ける倍率。1 で SF2 の設定どおり
  set reverb(value: number) {
    this.reverbAmount.gain.value = value
  }

  get reverb(): number {
    return this.reverbAmount.gain.value
  }

  // -1 (左) .. 1 (右)
  set pan(value: number) {
    this.panner.pan.value = value
  }

  get pan(): number {
    return this.panner.pan.value
  }

  // time は AudioContext の時刻。省略時は即時
  noteOn(key: number, velocity = 100, time = this.synth.currentTime): Voice[] {
    const voices = this.synth.startVoice(this.instrument, key, velocity, time, this.target)
    const list = this.held.get(key)
    if (list) list.push(...voices)
    else this.held.set(key, voices)
    return voices
  }

  noteOff(key: number, time = this.synth.currentTime): void {
    const list = this.held.get(key)
    if (!list) return
    for (const v of list) v.release(time)
    this.held.delete(key)
  }

  // 長さの決まった音を予約する。BGM の再生は基本的にこれを使う
  playNote(key: number, velocity: number, time: number, duration: number): Voice[] {
    const voices = this.synth.startVoice(this.instrument, key, velocity, time, this.target)
    for (const v of voices) v.release(time + duration)
    return voices
  }

  allNotesOff(time = this.synth.currentTime): void {
    for (const key of [...this.held.keys()]) this.noteOff(key, time)
  }
}
