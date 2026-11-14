// SF2 の DAHDSR エンベロープ。
//
// FluidSynth と同様に 0..1 の正規化値 v で状態を持つ。各区間は v について線形:
//   delay: 0, attack: 0→1, hold: 1, decay: 1→sustain, release: 現在値→0
// 音量エンベロープでは attack 区間のみ振幅 = v、それ以外は v を 96dB のレンジで
// dB に写像する (decay/release は dB に対して線形 = 振幅に対して指数的)。

import type { Envelope } from './types.ts'

export const VOLUME_RANGE_DB = 96
// v = 0 に相当する振幅。exponentialRamp は 0 を目標にできないためこれを使う
export const SILENT = dbToAmp(-VOLUME_RANGE_DB)

export function dbToAmp(db: number): number {
  return 10 ** (db / 20)
}

// 音量エンベロープの正規化値 v を振幅にする (attack 区間以外)
export function volumeAmp(v: number): number {
  return v <= 0 ? SILENT : dbToAmp(-VOLUME_RANGE_DB * (1 - v))
}

// 振幅から正規化値 v に戻す。attack 中にリリースされた場合に使う
export function ampToVolumeV(amp: number): number {
  return amp <= SILENT ? 0 : Math.min(1, 1 + (20 * Math.log10(amp)) / VOLUME_RANGE_DB)
}

export class EnvelopeShape {
  readonly delayEnd: number
  readonly attackEnd: number
  readonly holdEnd: number
  readonly decayEnd: number
  readonly sustain: number
  readonly release: number

  // sustainLevel はエンベロープ種別に応じて呼び出し側で 0..1 に正規化した値
  constructor(env: Envelope, key: number, sustainLevel: number) {
    const hold = env.hold * 2 ** ((env.keynumToHold * (60 - key)) / 1200)
    const decay = env.decay * 2 ** ((env.keynumToDecay * (60 - key)) / 1200)
    this.sustain = Math.min(1, Math.max(0, sustainLevel))
    this.delayEnd = env.delay
    this.attackEnd = this.delayEnd + env.attack
    this.holdEnd = this.attackEnd + hold
    // decay 時間は 1→0 に要する時間なので、sustain までの時間はその割合分
    this.decayEnd = this.holdEnd + decay * (1 - this.sustain)
    this.release = env.release
  }

  static volume(env: Envelope, key: number): EnvelopeShape {
    return new EnvelopeShape(env, key, 1 - env.sustain / (VOLUME_RANGE_DB * 10))
  }

  static modulation(env: Envelope, key: number): EnvelopeShape {
    return new EnvelopeShape(env, key, 1 - env.sustain / 1000)
  }

  // ノートオンからの経過時間 t における正規化値
  valueAt(t: number): number {
    if (t < this.delayEnd) return 0
    if (t < this.attackEnd) return (t - this.delayEnd) / (this.attackEnd - this.delayEnd)
    if (t < this.holdEnd) return 1
    if (t < this.decayEnd) return 1 - ((1 - this.sustain) * (t - this.holdEnd)) / (this.decayEnd - this.holdEnd)
    return this.sustain
  }

  inAttack(t: number): boolean {
    return t >= this.delayEnd && t < this.attackEnd
  }

  // 音量エンベロープとしての振幅
  ampAt(t: number): number {
    return this.inAttack(t) ? this.valueAt(t) : t < this.delayEnd ? 0 : volumeAmp(this.valueAt(t))
  }

  // sustain が無音ならノートオフを待たずに鳴り終わる時刻 (ノートオンからの経過時間)
  get silentAt(): number | undefined {
    return this.sustain <= 0 ? this.decayEnd : undefined
  }

  // 音量エンベロープを gain に書き込む (リリースは含まない)
  scheduleVolume(param: AudioParam, t0: number): void {
    param.setValueAtTime(0, t0)
    param.setValueAtTime(0, t0 + this.delayEnd)
    param.linearRampToValueAtTime(1, t0 + this.attackEnd)
    param.setValueAtTime(1, t0 + this.holdEnd)
    if (this.decayEnd > this.holdEnd) {
      param.exponentialRampToValueAtTime(volumeAmp(this.sustain), t0 + this.decayEnd)
    }
  }

  // 音量のリリースにかかる時間。v が小さいほど短い
  volumeReleaseTime(tOff: number): number {
    return this.release * ampToVolumeV(this.ampAt(tOff))
  }

  // モジュレーションエンベロープを amount 倍して param に書き込む (リリースは含まない)
  scheduleModulation(param: AudioParam, t0: number, amount: number): void {
    param.setValueAtTime(0, t0)
    param.setValueAtTime(0, t0 + this.delayEnd)
    param.linearRampToValueAtTime(amount, t0 + this.attackEnd)
    param.setValueAtTime(amount, t0 + this.holdEnd)
    param.linearRampToValueAtTime(amount * this.sustain, t0 + this.decayEnd)
  }

  // モジュレーションエンベロープのリリース。tOff 以降の予定を置き換える
  releaseModulation(param: AudioParam, t0: number, tOff: number, amount: number): void {
    const v = this.valueAt(tOff - t0)
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(tOff)
    } else {
      // Firefox には cancelAndHoldAtTime が無い。進行中のランプが消えるので値を置き直す
      param.cancelScheduledValues(tOff)
      param.setValueAtTime(amount * v, tOff)
    }
    param.linearRampToValueAtTime(0, tOff + this.release * v)
  }
}
