// SF2 のプリセット/インストゥルメントの2階層を、シンセがそのまま使える
// 平坦なリージョンのリストに変換する。

import type { Envelope, RegionData } from '../../src/synth/types.ts'
import { Gen, GenName, type Range, type Sf2, type Sf2Preset, type Zone } from './sf2.ts'

// sample は SF2 のサンプル番号。ステレオの場合は [L, R]
export type FlatRegion = Omit<RegionData, 'sample'> & { sample: number[] }

const DEFAULTS: Partial<Record<number, number>> = {
  [Gen.initialFilterFc]: 13500,
  [Gen.delayModLFO]: -12000,
  [Gen.delayVibLFO]: -12000,
  [Gen.delayModEnv]: -12000,
  [Gen.attackModEnv]: -12000,
  [Gen.holdModEnv]: -12000,
  [Gen.decayModEnv]: -12000,
  [Gen.releaseModEnv]: -12000,
  [Gen.delayVolEnv]: -12000,
  [Gen.attackVolEnv]: -12000,
  [Gen.holdVolEnv]: -12000,
  [Gen.decayVolEnv]: -12000,
  [Gen.releaseVolEnv]: -12000,
  [Gen.keynum]: -1,
  [Gen.velocity]: -1,
  [Gen.scaleTuning]: 100,
  [Gen.overridingRootKey]: -1,
}

// インストゥルメント階層でのみ有効で、プリセット側の値を加算しないジェネレータ
const INSTRUMENT_ONLY = new Set<number>([
  Gen.startAddrsOffset,
  Gen.endAddrsOffset,
  Gen.startloopAddrsOffset,
  Gen.endloopAddrsOffset,
  Gen.startAddrsCoarseOffset,
  Gen.endAddrsCoarseOffset,
  Gen.startloopAddrsCoarseOffset,
  Gen.endloopAddrsCoarseOffset,
  Gen.keynum,
  Gen.velocity,
  Gen.sampleModes,
  Gen.exclusiveClass,
  Gen.overridingRootKey,
])

// このシンセでは実装していないジェネレータ。0 以外が使われていたら警告する
const UNSUPPORTED = [
  Gen.startAddrsOffset,
  Gen.endAddrsOffset,
  Gen.startloopAddrsOffset,
  Gen.endloopAddrsOffset,
  Gen.startAddrsCoarseOffset,
  Gen.endAddrsCoarseOffset,
  Gen.startloopAddrsCoarseOffset,
  Gen.endloopAddrsCoarseOffset,
  Gen.vibLfoToPitch,
  Gen.modLfoToVolume,
]

// SF2 2.04 / FluidSynth の既定モジュレータ「ベロシティ → フィルタカットオフ」
const VEL_TO_FILTER_SRC = 0x0102
const VEL_TO_FILTER_AMOUNT = -2400

// E-mu 実機との互換のため FluidSynth と同様に initialAttenuation を 0.4 倍する
const ATTENUATION_SCALE = 0.4

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round = (v: number) => Number(v.toPrecision(4))
// SF2 の仕様・FluidSynth と同じく下限 -12000 は約 1ms。0 秒になるのは -32768 のときだけ
const timecents = (tc: number, max: number) => (tc <= -32768 ? 0 : round(2 ** (clamp(tc, -12000, max) / 1200)))

function intersect(a: Range | undefined, b: Range | undefined): Range {
  const lo = Math.max(a?.[0] ?? 0, b?.[0] ?? 0)
  const hi = Math.min(a?.[1] ?? 127, b?.[1] ?? 127)
  return [lo, hi]
}

export function flattenPreset(sf: Sf2, preset: Sf2Preset, warn: (msg: string) => void): FlatRegion[] {
  const regions: FlatRegion[] = []

  for (const pz of preset.zones) {
    const inst = sf.instruments[pz.instrument!]
    const pg = preset.globalZone

    for (const iz of inst.zones) {
      const ig = inst.globalZone
      const [keyLo, keyHi] = intersect(pz.keyRange ?? pg?.keyRange, iz.keyRange ?? ig?.keyRange)
      const [velLo, velHi] = intersect(pz.velRange ?? pg?.velRange, iz.velRange ?? ig?.velRange)
      if (keyLo > keyHi || velLo > velHi) continue

      const instGen = (g: number) => iz.gens.get(g) ?? ig?.gens.get(g) ?? DEFAULTS[g] ?? 0
      const presetGen = (g: number) => (INSTRUMENT_ONLY.has(g) ? 0 : (pz.gens.get(g) ?? pg?.gens.get(g) ?? 0))
      const gen = (g: number) => instGen(g) + presetGen(g)

      for (const g of UNSUPPORTED) {
        if (gen(g) !== 0) warn(`${preset.name}/${inst.name}: unsupported generator ${GenName[g]}=${gen(g)}`)
      }
      if (instGen(Gen.keynum) >= 0 || instGen(Gen.velocity) >= 0) {
        warn(`${preset.name}/${inst.name}: fixed keynum/velocity is not supported`)
      }

      const sample = sf.samples[iz.sampleID!]
      const rootKey = instGen(Gen.overridingRootKey) >= 0 ? instGen(Gen.overridingRootKey) : sample.originalPitch
      const loopMode = instGen(Gen.sampleModes) & 3

      const envelope = (first: number, sustainMax: number): Envelope => ({
        delay: timecents(gen(first), 5000),
        attack: timecents(gen(first + 1), 8000),
        hold: timecents(gen(first + 2), 5000),
        decay: timecents(gen(first + 3), 8000),
        sustain: clamp(gen(first + 4), 0, sustainMax),
        release: timecents(gen(first + 5), 8000),
        keynumToHold: clamp(gen(first + 6), -1200, 1200),
        keynumToDecay: clamp(gen(first + 7), -1200, 1200),
      })

      regions.push({
        sample: [iz.sampleID!],
        keyLo,
        keyHi,
        velLo,
        velHi,
        rootKey,
        tune: gen(Gen.coarseTune) * 100 + gen(Gen.fineTune) + sample.pitchCorrection,
        scaleTuning: gen(Gen.scaleTuning),
        loopMode: loopMode === 2 ? 0 : (loopMode as 0 | 1 | 3),
        attenuation: round(clamp(gen(Gen.initialAttenuation), 0, 1440) * ATTENUATION_SCALE),
        pan: clamp(gen(Gen.pan), -500, 500),
        filterFc: clamp(gen(Gen.initialFilterFc), 1500, 13500),
        filterQ: clamp(gen(Gen.initialFilterQ), 0, 960),
        velToFilterFc: velToFilterAmount(iz, ig, pz, pg),
        volEnv: envelope(Gen.delayVolEnv, 1440),
        modEnv: envelope(Gen.delayModEnv, 1000),
        modEnvToPitch: clamp(gen(Gen.modEnvToPitch), -12000, 12000),
        modEnvToFilterFc: clamp(gen(Gen.modEnvToFilterFc), -12000, 12000),
        modLfoDelay: timecents(gen(Gen.delayModLFO), 5000),
        modLfoFreq: round(8.176 * 2 ** (clamp(gen(Gen.freqModLFO), -16000, 4500) / 1200)),
        modLfoToPitch: clamp(gen(Gen.modLfoToPitch), -12000, 12000),
        modLfoToFilterFc: clamp(gen(Gen.modLfoToFilterFc), -12000, 12000),
        reverbSend: clamp(gen(Gen.reverbEffectsSend), 0, 1000) / 1000,
        exclusiveClass: instGen(Gen.exclusiveClass),
      })
    }
  }

  return mergeVelocityLayers(mergeStereoPairs(sf, regions))
}

// 既定モジュレータはゾーンに同じ src/dest のモジュレータがあれば上書きされる
function velToFilterAmount(iz: Zone, ig: Zone | undefined, pz: Zone, pg: Zone | undefined): number {
  const find = (z: Zone | undefined) =>
    z?.mods.find((m) => m.src === VEL_TO_FILTER_SRC && m.dest === Gen.initialFilterFc)
  const inst = find(iz) ?? find(ig)
  const preset = find(pz) ?? find(pg)
  return (inst ? inst.amount : VEL_TO_FILTER_AMOUNT) + (preset?.amount ?? 0)
}

// sample と pan 以外が同一で、左右に振り切った 2 つのリージョンを 1 つのステレオリージョンにまとめる
function mergeStereoPairs(sf: Sf2, regions: FlatRegion[]): FlatRegion[] {
  const signature = (r: FlatRegion) => JSON.stringify({ ...r, sample: undefined, pan: undefined })
  const out: FlatRegion[] = []
  const used = new Set<FlatRegion>()

  for (const left of regions) {
    if (used.has(left) || left.pan !== -500) continue
    const sig = signature(left)
    const right = regions.find((r) => !used.has(r) && r.pan === 500 && signature(r) === sig)
    if (!right) continue
    const a = sf.samples[left.sample[0]]
    const b = sf.samples[right.sample[0]]
    const sameShape =
      a.end - a.start === b.end - b.start &&
      a.loopStart - a.start === b.loopStart - b.start &&
      a.loopEnd - a.start === b.loopEnd - b.start &&
      a.sampleRate === b.sampleRate &&
      a.pitchCorrection === b.pitchCorrection
    if (!sameShape) continue
    used.add(left).add(right)
    out.push({ ...left, sample: [left.sample[0], right.sample[0]], pan: 0 })
  }

  for (const r of regions) if (!used.has(r)) out.push(r)
  return out
}

// velRange 以外が同一で、ベロシティ範囲が連続しているリージョンを結合する
function mergeVelocityLayers(regions: FlatRegion[]): FlatRegion[] {
  const signature = (r: FlatRegion) => JSON.stringify({ ...r, velLo: undefined, velHi: undefined })
  const sorted = [...regions].sort((a, b) => a.keyLo - b.keyLo || a.velLo - b.velLo)
  const out: FlatRegion[] = []
  for (const r of sorted) {
    const prev = out.findLast((p) => signature(p) === signature(r))
    if (prev && prev.velHi + 1 === r.velLo) prev.velHi = r.velHi
    else out.push({ ...r })
  }
  return out
}
