// SoundFont 2 (.sf2) の最小限のパーサ。
// プリセット/インストゥルメント/サンプルのヘッダと PCM データを読み出す。
// モジュレータ (pmod/imod) はゾーンごとに生の値のまま保持する。

export const Gen = {
  startAddrsOffset: 0,
  endAddrsOffset: 1,
  startloopAddrsOffset: 2,
  endloopAddrsOffset: 3,
  startAddrsCoarseOffset: 4,
  modLfoToPitch: 5,
  vibLfoToPitch: 6,
  modEnvToPitch: 7,
  initialFilterFc: 8,
  initialFilterQ: 9,
  modLfoToFilterFc: 10,
  modEnvToFilterFc: 11,
  endAddrsCoarseOffset: 12,
  modLfoToVolume: 13,
  chorusEffectsSend: 15,
  reverbEffectsSend: 16,
  pan: 17,
  delayModLFO: 21,
  freqModLFO: 22,
  delayVibLFO: 23,
  freqVibLFO: 24,
  delayModEnv: 25,
  attackModEnv: 26,
  holdModEnv: 27,
  decayModEnv: 28,
  sustainModEnv: 29,
  releaseModEnv: 30,
  keynumToModEnvHold: 31,
  keynumToModEnvDecay: 32,
  delayVolEnv: 33,
  attackVolEnv: 34,
  holdVolEnv: 35,
  decayVolEnv: 36,
  sustainVolEnv: 37,
  releaseVolEnv: 38,
  keynumToVolEnvHold: 39,
  keynumToVolEnvDecay: 40,
  instrument: 41,
  keyRange: 43,
  velRange: 44,
  startloopAddrsCoarseOffset: 45,
  keynum: 46,
  velocity: 47,
  initialAttenuation: 48,
  endloopAddrsCoarseOffset: 50,
  coarseTune: 51,
  fineTune: 52,
  sampleID: 53,
  sampleModes: 54,
  scaleTuning: 56,
  exclusiveClass: 57,
  overridingRootKey: 58,
} as const

export const GenName: Record<number, string> = Object.fromEntries(
  Object.entries(Gen).map(([name, id]) => [id, name]),
)

export type Range = [lo: number, hi: number]

export interface Modulator {
  src: number
  dest: number
  amount: number
  amtSrc: number
  trans: number
}

export interface Zone {
  // keyRange / velRange / instrument / sampleID 以外のジェネレータ (符号付き 16bit)
  gens: Map<number, number>
  mods: Modulator[]
  keyRange?: Range
  velRange?: Range
  instrument?: number
  sampleID?: number
}

export interface Sf2Preset {
  name: string
  program: number
  bank: number
  globalZone?: Zone
  zones: Zone[]
}

export interface Sf2Instrument {
  name: string
  globalZone?: Zone
  zones: Zone[]
}

export interface Sf2Sample {
  name: string
  start: number
  end: number
  loopStart: number
  loopEnd: number
  sampleRate: number
  originalPitch: number
  pitchCorrection: number
  sampleLink: number
  sampleType: number
}

export interface Sf2 {
  presets: Sf2Preset[]
  instruments: Sf2Instrument[]
  samples: Sf2Sample[]
  pcm: Int16Array
}

interface Chunk {
  id: string
  offset: number
  size: number
}

function* chunks(view: DataView, offset: number, end: number): Generator<Chunk> {
  while (offset + 8 <= end) {
    const id = ascii(view, offset, 4)
    const size = view.getUint32(offset + 4, true)
    yield { id, offset: offset + 8, size }
    offset += 8 + size + (size & 1)
  }
}

function ascii(view: DataView, offset: number, length: number): string {
  let s = ''
  for (let i = 0; i < length; i++) {
    const c = view.getUint8(offset + i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s.trimEnd()
}

export function parseSf2(data: Uint8Array): Sf2 {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (ascii(view, 0, 4) !== 'RIFF' || ascii(view, 8, 4) !== 'sfbk') {
    throw new Error('not a SoundFont 2 file')
  }

  const sub = new Map<string, Chunk>()
  for (const list of chunks(view, 12, view.byteLength)) {
    if (list.id !== 'LIST') continue
    for (const c of chunks(view, list.offset + 4, list.offset + list.size)) sub.set(c.id, c)
  }
  const need = (id: string): Chunk => {
    const c = sub.get(id)
    if (!c) throw new Error(`missing chunk: ${id}`)
    return c
  }
  if (sub.has('sm24')) console.warn('sm24 (24bit) chunk is ignored')

  const records = <T>(id: string, size: number, read: (o: number) => T): T[] => {
    const c = need(id)
    const out: T[] = []
    for (let i = 0; i < c.size / size; i++) out.push(read(c.offset + i * size))
    return out
  }

  const phdr = records('phdr', 38, (o) => ({
    name: ascii(view, o, 20),
    program: view.getUint16(o + 20, true),
    bank: view.getUint16(o + 22, true),
    bagIndex: view.getUint16(o + 24, true),
  }))
  const pbag = records('pbag', 4, (o) => ({ gen: view.getUint16(o, true), mod: view.getUint16(o + 2, true) }))
  const pgen = records('pgen', 4, (o) => ({ op: view.getUint16(o, true), amount: o + 2 }))
  const readMod = (o: number): Modulator => ({
    src: view.getUint16(o, true),
    dest: view.getUint16(o + 2, true),
    amount: view.getInt16(o + 4, true),
    amtSrc: view.getUint16(o + 6, true),
    trans: view.getUint16(o + 8, true),
  })
  const pmod = records('pmod', 10, readMod)
  const inst = records('inst', 22, (o) => ({ name: ascii(view, o, 20), bagIndex: view.getUint16(o + 20, true) }))
  const ibag = records('ibag', 4, (o) => ({ gen: view.getUint16(o, true), mod: view.getUint16(o + 2, true) }))
  const igen = records('igen', 4, (o) => ({ op: view.getUint16(o, true), amount: o + 2 }))
  const imod = records('imod', 10, readMod)
  const shdr = records('shdr', 46, (o) => ({
    name: ascii(view, o, 20),
    start: view.getUint32(o + 20, true),
    end: view.getUint32(o + 24, true),
    loopStart: view.getUint32(o + 28, true),
    loopEnd: view.getUint32(o + 32, true),
    sampleRate: view.getUint32(o + 36, true),
    originalPitch: view.getUint8(o + 40),
    pitchCorrection: view.getInt8(o + 41),
    sampleLink: view.getUint16(o + 42, true),
    sampleType: view.getUint16(o + 44, true),
  }))

  type Bag = { gen: number; mod: number }
  type GenRecord = { op: number; amount: number }

  const readZone = (gens: GenRecord[], mods: Modulator[], bag: Bag, next: Bag): Zone => {
    const zone: Zone = { gens: new Map(), mods: mods.slice(bag.mod, next.mod) }
    for (let g = bag.gen; g < next.gen; g++) {
      const { op, amount } = gens[g]
      switch (op) {
        case Gen.keyRange:
          zone.keyRange = [view.getUint8(amount), view.getUint8(amount + 1)]
          break
        case Gen.velRange:
          zone.velRange = [view.getUint8(amount), view.getUint8(amount + 1)]
          break
        case Gen.instrument:
          zone.instrument = view.getUint16(amount, true)
          break
        case Gen.sampleID:
          zone.sampleID = view.getUint16(amount, true)
          break
        default:
          zone.gens.set(op, view.getInt16(amount, true))
      }
    }
    return zone
  }

  // 最初のゾーンが instrument/sampleID を持たなければグローバルゾーン
  const readZones = (
    bags: Bag[],
    gens: GenRecord[],
    mods: Modulator[],
    from: number,
    to: number,
    isGlobal: (z: Zone) => boolean,
  ) => {
    const zones: Zone[] = []
    let globalZone: Zone | undefined
    for (let b = from; b < to; b++) {
      const zone = readZone(gens, mods, bags[b], bags[b + 1])
      if (b === from && isGlobal(zone)) globalZone = zone
      else zones.push(zone)
    }
    return { globalZone, zones }
  }

  const presets: Sf2Preset[] = []
  for (let i = 0; i < phdr.length - 1; i++) {
    const h = phdr[i]
    const z = readZones(pbag, pgen, pmod, h.bagIndex, phdr[i + 1].bagIndex, (zone) => zone.instrument === undefined)
    presets.push({ name: h.name, program: h.program, bank: h.bank, ...z })
  }

  const instruments: Sf2Instrument[] = []
  for (let i = 0; i < inst.length - 1; i++) {
    const h = inst[i]
    const z = readZones(ibag, igen, imod, h.bagIndex, inst[i + 1].bagIndex, (zone) => zone.sampleID === undefined)
    instruments.push({ name: h.name, ...z })
  }

  const smpl = need('smpl')
  // smpl の開始位置が奇数バイトの場合があるのでコピーして整列させる。
  // Node の Buffer.slice はコピーせず元のメモリを参照するので、new Uint8Array で明示的にコピーする
  const pcm = new Int16Array(new Uint8Array(data.subarray(smpl.offset, smpl.offset + smpl.size)).buffer)

  return { presets, instruments, samples: shdr.slice(0, -1), pcm }
}
