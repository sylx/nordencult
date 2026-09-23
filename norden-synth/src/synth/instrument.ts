import { smoothLoop } from './loop.ts'
import type { InstrumentData, RegionData, SampleData } from './types.ts'

export interface Sample {
  data: SampleData
  buffer: AudioBuffer
}

export class Instrument {
  readonly name: string
  readonly data: InstrumentData
  readonly samples: Sample[]
  readonly bytes: number

  constructor(data: InstrumentData, samples: Sample[], bytes: number) {
    this.name = data.name
    this.data = data
    this.samples = samples
    this.bytes = bytes
  }

  findRegions(key: number, velocity: number): RegionData[] {
    return this.data.regions.filter(
      (r) => key >= r.keyLo && key <= r.keyHi && velocity >= r.velLo && velocity <= r.velHi,
    )
  }

  // 発音可能なキー範囲
  get keyRange(): [number, number] {
    let lo = 127
    let hi = 0
    for (const r of this.data.regions) {
      lo = Math.min(lo, r.keyLo)
      hi = Math.max(hi, r.keyHi)
    }
    return [lo, hi]
  }
}

// 楽器 JSON と音声ファイルを読み込み、サンプルごとの AudioBuffer に切り出す
export async function loadInstrument(url: string | URL): Promise<Instrument> {
  const jsonUrl = new URL(url, location.href)
  const res = await fetch(jsonUrl)
  if (!res.ok) throw new Error(`failed to fetch ${jsonUrl}: ${res.status}`)
  const data = (await res.json()) as InstrumentData
  let bytes = Number(res.headers.get('content-length') ?? 0)

  const decoded = await Promise.all(
    data.files.map(async (file) => {
      const fileUrl = new URL(file.url, jsonUrl)
      const r = await fetch(fileUrl)
      if (!r.ok) throw new Error(`failed to fetch ${fileUrl}: ${r.status}`)
      const encoded = await r.arrayBuffer()
      bytes += encoded.byteLength
      // 元のサンプルレートのまま取り出すため、同じレートの OfflineAudioContext でデコードする。
      // (AudioContext でデコードすると出力レートにリサンプルされ、ループ点がずれる)
      const buffer = await new OfflineAudioContext(2, 1, file.sampleRate).decodeAudioData(encoded)
      if (buffer.length !== file.frames) {
        console.warn(`${fileUrl}: decoded ${buffer.length} frames, expected ${file.frames}`)
      }
      return buffer
    }),
  )

  const looped = new Set(data.regions.filter((r) => r.loopMode !== 0).map((r) => r.sample))
  const samples = data.samples.map((s, i): Sample => {
    const source = decoded[s.file]
    const buffer = new AudioBuffer({ numberOfChannels: s.channels, length: s.length, sampleRate: source.sampleRate })
    for (let c = 0; c < s.channels; c++) {
      const channel = source.getChannelData(c).slice(s.offset, s.offset + s.length)
      if (looped.has(i)) smoothLoop(channel, s.loopStart, s.loopEnd)
      buffer.copyToChannel(channel, c)
    }
    return { data: s, buffer }
  })

  return new Instrument(data, samples, bytes)
}
