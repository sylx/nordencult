// ConvolverNode 用のインパルス応答を合成する。
// 減衰するステレオノイズに、時間とともに高域が落ちるよう 1 次ローパスをかけたもの。
// 残響時間は 10 秒以上の深いものにもできる。

export interface ReverbOptions {
  // 残響時間 (-60dB に達するまでの秒数)
  duration?: number
  preDelay?: number
  // 0..1。大きいほど後半の高域が速く減衰する
  damping?: number
}

export function createReverbImpulse(ctx: BaseAudioContext, options: ReverbOptions = {}): AudioBuffer {
  const { duration = 2.4, preDelay = 0.02, damping = 0.6 } = options
  const rate = ctx.sampleRate
  const length = Math.ceil((duration + preDelay) * rate)
  const impulse = new AudioBuffer({ numberOfChannels: 2, length, sampleRate: rate })
  const start = Math.floor(preDelay * rate)
  // -60dB = 振幅 1/1000 に duration 秒で到達する減衰率
  const decay = Math.log(1000) / duration

  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c)
    let lp = 0
    for (let i = start; i < length; i++) {
      const t = (i - start) / rate
      // 時間とともにローパスのカットオフを下げる (係数 a が 0 に近いほど暗い)
      const a = 1 - damping * Math.min(1, t / duration) * 0.95
      lp += a * (Math.random() * 2 - 1 - lp)
      data[i] = lp * Math.exp(-decay * t)
    }
  }

  // 音量を正規化する (エネルギー合計を 1 に)
  let energy = 0
  for (let c = 0; c < 2; c++) for (const x of impulse.getChannelData(c)) energy += x * x
  const scale = 1 / Math.sqrt(energy / 2)
  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c)
    for (let i = 0; i < length; i++) data[i] *= scale
  }
  return impulse
}
