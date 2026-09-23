// 1 リージョン分の発音。ノード構成:
//
//   source → [lowpass] → envGain → releaseGain → [panner] → output
//                                              └→ reverbSend → reverb
//
// envGain は attack〜sustain をノートオン時に一度だけ書き込み、
// releaseGain はノートオフ時にだけ書き込む。これで cancelAndHoldAtTime に頼らず
// 任意の時刻にリリースできる。

import { EnvelopeShape, SILENT, dbToAmp } from './envelope.ts'
import type { Sample } from './instrument.ts'
import type { RegionData } from './types.ts'

export interface VoiceTarget {
  output: AudioNode
  reverb: AudioNode
}

// initialFilterFc の上限。これ以上ならフィルタを通さない
const FILTER_FC_MAX = 13500

export class Voice {
  readonly key: number
  readonly startTime: number
  private readonly ctx: BaseAudioContext
  private readonly region: RegionData
  private readonly source: AudioBufferSourceNode
  private readonly filter?: BiquadFilterNode
  private readonly releaseGain: GainNode
  // attenuation とベロシティによる固定のゲイン
  private readonly level: number
  private readonly volEnv: EnvelopeShape
  private readonly modEnv?: EnvelopeShape
  private readonly nodes: AudioNode[]
  private releaseTime?: number
  private stopTime = Infinity
  private ended = false
  // kill() 済み。ボイススティールの対象から外す
  killed = false
  onended?: (voice: Voice) => void

  constructor(
    ctx: BaseAudioContext,
    region: RegionData,
    sample: Sample,
    key: number,
    velocity: number,
    time: number,
    target: VoiceTarget,
  ) {
    this.ctx = ctx
    this.region = region
    this.key = key
    this.startTime = time

    const { data, buffer } = sample
    const source = new AudioBufferSourceNode(ctx, { buffer })
    const cents = (key - region.rootKey) * region.scaleTuning + region.tune
    source.playbackRate.value = 2 ** (cents / 1200)
    if (region.loopMode !== 0 && data.loopEnd > data.loopStart) {
      source.loop = true
      source.loopStart = data.loopStart / buffer.sampleRate
      source.loopEnd = data.loopEnd / buffer.sampleRate
    }
    this.source = source
    this.nodes = [source]
    let head: AudioNode = source

    this.volEnv = EnvelopeShape.volume(region.volEnv, key)
    const usesModEnv = region.modEnvToPitch !== 0 || region.modEnvToFilterFc !== 0
    if (usesModEnv) this.modEnv = EnvelopeShape.modulation(region.modEnv, key)

    // FluidSynth の既定モジュレータ: ベロシティ < 64 のときだけカットオフを下げる
    const velFilter = velocity < 64 ? region.velToFilterFc * (1 - velocity / 128) : 0
    const fc = region.filterFc + velFilter
    if (fc < FILTER_FC_MAX || region.modEnvToFilterFc !== 0) {
      const filter = new BiquadFilterNode(ctx, {
        type: 'lowpass',
        frequency: Math.min(8.176 * 2 ** (fc / 1200), ctx.sampleRate / 2),
        // SF2 の Q は共振ピークの高さ (cB)。Web Audio の lowpass Q は dB で、0dB が Q=1 相当なので
        // FluidSynth と同じく 3.01dB 引いてバターワース (Q=0.707) を基準にする
        Q: region.filterQ / 10 - 3.01,
      })
      head.connect(filter)
      head = filter
      this.filter = filter
      this.nodes.push(filter)
    }

    const envGain = new GainNode(ctx, { gain: 0 })
    this.volEnv.scheduleVolume(envGain.gain, time)
    head.connect(envGain)

    // 既定モジュレータ: ベロシティ → 減衰 (凹カーブ 960cB) は振幅で (vel/127)^2 になる
    const velocityGain = (velocity / 127) ** 2
    this.level = dbToAmp(-region.attenuation / 10) * velocityGain
    const releaseGain = new GainNode(ctx, { gain: this.level })
    envGain.connect(releaseGain)
    this.releaseGain = releaseGain
    this.nodes.push(envGain, releaseGain)
    head = releaseGain

    if (region.pan !== 0) {
      const panner = new StereoPannerNode(ctx, { pan: region.pan / 500 })
      head.connect(panner)
      head = panner
      this.nodes.push(panner)
    }
    head.connect(target.output)

    if (region.reverbSend > 0) {
      const send = new GainNode(ctx, { gain: region.reverbSend })
      head.connect(send).connect(target.reverb)
      this.nodes.push(send)
    }

    if (this.modEnv) {
      if (region.modEnvToPitch !== 0) this.modEnv.scheduleModulation(source.detune, time, region.modEnvToPitch)
      if (this.filter) this.modEnv.scheduleModulation(this.filter.detune, time, region.modEnvToFilterFc)
    }

    source.onended = () => this.dispose()
    source.start(time)
    const silentAt = this.volEnv.silentAt
    if (silentAt !== undefined) this.scheduleStop(time + silentAt)
  }

  get released(): boolean {
    return this.releaseTime !== undefined
  }

  get exclusiveClass(): number {
    return this.region.exclusiveClass
  }

  release(time: number): void {
    if (this.ended || this.releaseTime !== undefined) return
    time = Math.max(time, this.startTime)
    this.releaseTime = time

    const t = time - this.startTime
    const amp = this.volEnv.ampAt(t)
    const duration = this.volEnv.volumeReleaseTime(t)
    const gain = this.releaseGain.gain
    gain.setValueAtTime(this.level, time)
    // envGain が amp のまま止まっていると見なし、合計が SILENT になるまで下げる
    gain.exponentialRampToValueAtTime(this.level * Math.min(1, SILENT / Math.max(amp, SILENT)), time + duration)

    if (this.modEnv) {
      const r = this.region
      if (r.modEnvToPitch !== 0) this.modEnv.releaseModulation(this.source.detune, this.startTime, time, r.modEnvToPitch)
      if (this.filter) this.modEnv.releaseModulation(this.filter.detune, this.startTime, time, r.modEnvToFilterFc)
    }

    // loopMode 3: リリース後はループを抜けてサンプル末尾まで再生する
    if (this.region.loopMode === 3) {
      const delay = Math.max(0, (time - this.ctx.currentTime) * 1000)
      setTimeout(() => (this.source.loop = false), delay)
    }

    this.scheduleStop(time + duration)
  }

  // 即座に (短いフェードで) 止める
  kill(time: number): void {
    if (this.ended || this.killed) return
    this.killed = true
    const gain = this.releaseGain.gain
    gain.cancelScheduledValues(time)
    gain.setTargetAtTime(0, time, 0.005)
    this.releaseTime ??= time
    this.scheduleStop(time + 0.03)
  }

  private scheduleStop(time: number): void {
    if (this.ended || time >= this.stopTime) return
    this.stopTime = time
    this.source.stop(time)
  }

  private dispose(): void {
    if (this.ended) return
    this.ended = true
    for (const n of this.nodes) n.disconnect()
    this.onended?.(this)
  }
}
