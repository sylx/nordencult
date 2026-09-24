// sf2-extract が出力し、シンセが読み込む楽器データの形式。
// 時間は秒、減衰量はセンチベル (cB)、ピッチ/カットオフはセント。

export interface InstrumentIndex {
  instruments: InstrumentIndexEntry[]
}

export interface InstrumentIndexEntry {
  id: string
  name: string
  bank: number
  program: number
  url: string
  bytes: number
}

export interface InstrumentData {
  name: string
  bank: number
  program: number
  files: AudioFile[]
  samples: SampleData[]
  regions: RegionData[]
}

// 複数サンプルを連結して圧縮した音声ファイル (常に 2ch)
export interface AudioFile {
  url: string
  sampleRate: number
  frames: number
}

export interface SampleData {
  name: string
  file: number
  // ファイル内の開始フレーム
  offset: number
  length: number
  // サンプル先頭からの相対フレーム位置
  loopStart: number
  loopEnd: number
  // 1 なら L チャンネルのみ使うモノラルサンプル
  channels: 1 | 2
}

export interface Envelope {
  delay: number
  attack: number
  hold: number
  decay: number
  // volEnv: 減衰量 (cB)、modEnv: 0..1000 (0.1% 単位で 1000 がレベル 0)
  sustain: number
  release: number
  // キー 60 を基準にキー 1 つあたり何タイムセント hold/decay を変えるか
  keynumToHold: number
  keynumToDecay: number
}

export interface RegionData {
  sample: number
  keyLo: number
  keyHi: number
  velLo: number
  velHi: number
  rootKey: number
  // coarseTune*100 + fineTune + サンプルの pitchCorrection
  tune: number
  scaleTuning: number
  // 0: ループなし, 1: 常にループ, 3: リリースまでループ
  loopMode: 0 | 1 | 3
  attenuation: number
  // -500 (左) .. 500 (右)。ステレオサンプルでは 0
  pan: number
  filterFc: number
  filterQ: number
  // ベロシティ < 64 のときにカットオフへ加わる最大量 (セント)。FluidSynth の既定モジュレータ相当
  velToFilterFc: number
  volEnv: Envelope
  modEnv: Envelope
  modEnvToPitch: number
  modEnvToFilterFc: number
  // モジュレーション LFO (三角波)。delay は秒、freq は Hz
  modLfoDelay: number
  modLfoFreq: number
  // LFO の振幅 ±1 あたりのピッチ/カットオフの変化量 (セント)
  modLfoToPitch: number
  modLfoToFilterFc: number
  // 0..1
  reverbSend: number
  exclusiveClass: number
}
