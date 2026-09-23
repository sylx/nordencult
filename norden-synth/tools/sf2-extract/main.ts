// SF2 からゲーム用の楽器データを書き出す。
//
//   node tools/sf2-extract/main.ts <input.sf2> <outDir> [--quality 4] [--min-snr 20]
//
// 出力:
//   <outDir>/index.json         楽器一覧
//   <outDir>/<id>.json          リージョンとサンプルの定義 (src/synth/types.ts)
//   <outDir>/<id>[-<rate>].ogg  サンプルを連結した 2ch Ogg Vorbis (サンプルレートごと)
//
// ffmpeg (libvorbis 付き) が必要。
// 高音域のアタックなど劣化しやすい素材があるため、ファイル内で最も悪いサンプルの
// 波形 SNR が --min-snr を下回ったら、そのファイルだけ品質を上げて再エンコードする。

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import type { AudioFile, InstrumentData, InstrumentIndex, SampleData } from '../../src/synth/types.ts'
import { flattenPreset } from './flatten.ts'
import { parseSf2, type Sf2 } from './sf2.ts'

// 非可逆圧縮でループの継ぎ目や次のサンプルのアタックが干渉しないよう、
// 各サンプルの後ろにループの続きをフェードアウトしながら付け足し、無音を挟む
const PAD_LOOP = 2048
const PAD_FADE = 2048
const PAD_SILENCE = 1024

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    quality: { type: 'string', default: '4' },
    'min-snr': { type: 'string', default: '20' },
  },
})
const [input, outDir] = positionals
if (!input || !outDir) {
  console.error('usage: node tools/sf2-extract/main.ts <input.sf2> <outDir> [--quality 4] [--min-snr 20]')
  process.exit(1)
}
const baseQuality = Number(values.quality)
const minSnr = Number(values['min-snr'])
const MAX_QUALITY = 8

const sf = parseSf2(readFileSync(input))
const warnings = new Set<string>()
const warn = (msg: string) => warnings.add(msg)

// ディレクトリ自体は消さずに中身だけ入れ替える (dev サーバーのファイル監視が外れないように)
mkdirSync(outDir, { recursive: true })
for (const f of readdirSync(outDir)) rmSync(join(outDir, f), { recursive: true, force: true })

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const index: InstrumentIndex = { instruments: [] }
let totalPcmBytes = 0
const qualities: string[] = []

for (const preset of [...sf.presets].sort((a, b) => a.bank - b.bank || a.program - b.program)) {
  const id = slug(preset.name)
  const regions = flattenPreset(sf, preset, warn)

  // リージョンが参照するサンプル (モノラル or L/R ペア) を重複なく列挙する
  const sampleKeys: string[] = []
  const sampleIndex = new Map<string, number>()
  for (const r of regions) {
    const key = r.sample.join(':')
    if (!sampleIndex.has(key)) {
      sampleIndex.set(key, sampleKeys.length)
      sampleKeys.push(key)
    }
  }
  const samplePairs = sampleKeys.map((k) => k.split(':').map(Number))

  // サンプルレートごとに 1 ファイルにまとめる
  const rates = [...new Set(samplePairs.map(([l]) => sf.samples[l].sampleRate))].sort((a, b) => a - b)
  const files: AudioFile[] = []
  const samples: SampleData[] = new Array(samplePairs.length)
  let presetBytes = 0

  for (const rate of rates) {
    const members = samplePairs.map((pair, i) => ({ pair, i })).filter(({ pair }) => sf.samples[pair[0]].sampleRate === rate)
    const url = rates.length === 1 ? `${id}.ogg` : `${id}-${rate}.ogg`
    const blocks: Int16Array[] = []
    let offset = 0

    for (const { pair, i } of members) {
      const block = buildBlock(sf, pair)
      const head = sf.samples[pair[0]]
      samples[i] = {
        name: head.name.replace(/\s*\((L|R)\)$/, ''),
        file: files.length,
        offset,
        length: head.end - head.start,
        loopStart: head.loopStart - head.start,
        loopEnd: head.loopEnd - head.start,
        channels: pair.length as 1 | 2,
      }
      blocks.push(block)
      offset += block.length / 2
    }

    const pcm = concat(blocks)
    totalPcmBytes += pcm.byteLength
    const path = join(outDir, url)
    const label = `${preset.name} @${rate}Hz`
    const fileSamples = samples.filter((s) => s.file === files.length)
    let quality = baseQuality
    let snr: number
    for (;;) {
      encode(pcm, rate, path, quality)
      snr = worstSnr(path, pcm, fileSamples, label)
      if (snr >= minSnr || quality >= MAX_QUALITY) break
      quality++
    }
    if (snr < minSnr) warn(`${label}: worst SNR ${snr.toFixed(1)} dB even at quality ${quality}`)
    qualities.push(`${url}: q${quality} (worst SNR ${snr.toFixed(1)} dB)`)
    presetBytes += statSync(path).size
    files.push({ url, sampleRate: rate, frames: offset })
  }

  const data: InstrumentData = {
    name: preset.name,
    bank: preset.bank,
    program: preset.program,
    files,
    samples,
    regions: regions.map((r) => ({ ...r, sample: sampleIndex.get(r.sample.join(':'))! })),
  }
  const json = JSON.stringify(data)
  writeFileSync(join(outDir, `${id}.json`), json)
  presetBytes += json.length

  index.instruments.push({ id, name: preset.name, bank: preset.bank, program: preset.program, url: `${id}.json`, bytes: presetBytes })
  console.log(
    `${preset.name.padEnd(20)} regions=${String(regions.length).padStart(3)} samples=${String(samples.length).padStart(3)} files=${files.length} ${(presetBytes / 1e6).toFixed(2)} MB`,
  )
}

writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2))

console.log('')
for (const q of qualities) console.log(q)
for (const w of warnings) console.warn(`warning: ${w}`)
const outBytes = readdirSync(outDir).reduce((sum, f) => sum + statSync(join(outDir, f)).size, 0)
console.log(`\nsource PCM (stereo interleaved, padded): ${(totalPcmBytes / 1e6).toFixed(2)} MB`)
console.log(`output total: ${(outBytes / 1e6).toFixed(2)} MB`)

// サンプル (または L/R ペア) 1 つ分の 2ch インターリーブ PCM をパディング付きで作る
function buildBlock(sf: Sf2, pair: number[]): Int16Array {
  const [l, r = l] = pair.map((i) => sf.samples[i])
  const length = l.end - l.start
  const loopStart = l.loopStart - l.start
  const loopEnd = l.loopEnd - l.start
  const loopLength = loopEnd - loopStart
  const looped = loopLength >= 16 && loopEnd <= length
  const total = length + (looped ? PAD_LOOP + PAD_FADE : 0) + PAD_SILENCE
  const out = new Int16Array(total * 2)

  for (let i = 0; i < length; i++) {
    out[i * 2] = sf.pcm[l.start + i]
    out[i * 2 + 1] = sf.pcm[r.start + i]
  }
  if (looped) {
    for (let k = 0; k < PAD_LOOP + PAD_FADE; k++) {
      const src = loopStart + ((length - loopEnd + k) % loopLength)
      const gain = k < PAD_LOOP ? 1 : 1 - (k - PAD_LOOP) / PAD_FADE
      out[(length + k) * 2] = Math.round(sf.pcm[l.start + src] * gain)
      out[(length + k) * 2 + 1] = Math.round(sf.pcm[r.start + src] * gain)
    }
  }
  return out
}

function concat(blocks: Int16Array[]): Int16Array {
  const out = new Int16Array(blocks.reduce((n, b) => n + b.length, 0))
  let o = 0
  for (const b of blocks) {
    out.set(b, o)
    o += b.length
  }
  return out
}

function encode(pcm: Int16Array, rate: number, path: string, quality: number) {
  const args = ['-loglevel', 'error', '-y', '-f', 's16le', '-ar', String(rate), '-ac', '2', '-i', 'pipe:0']
  args.push('-c:a', 'libvorbis', '-q:a', String(quality), path)
  const result = spawnSync('ffmpeg', args, { input: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength) })
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`)
}

// デコードし直して長さが一致すること (= オフセットがずれないこと) を確かめ、
// サンプルごとの波形 SNR の最小値を返す
function worstSnr(path: string, original: Int16Array, samples: SampleData[], label: string): number {
  const result = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', path, '-f', 's16le', '-ac', '2', 'pipe:1'], {
    maxBuffer: 1 << 30,
  })
  if (result.status !== 0) throw new Error(`ffmpeg decode failed: ${result.stderr}`)
  const decoded = new Int16Array(result.stdout.buffer, result.stdout.byteOffset, result.stdout.byteLength / 2)
  if (decoded.length !== original.length) {
    throw new Error(`${label}: decoded length ${decoded.length / 2} != ${original.length / 2} frames`)
  }
  let worst = Infinity
  for (const s of samples) {
    let signal = 0
    let noise = 0
    for (let i = s.offset * 2; i < (s.offset + s.length) * 2; i++) {
      signal += original[i] ** 2
      noise += (original[i] - decoded[i]) ** 2
    }
    worst = Math.min(worst, 10 * Math.log10(signal / Math.max(noise, 1)))
  }
  return worst
}
