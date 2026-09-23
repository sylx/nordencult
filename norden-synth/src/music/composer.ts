// プロシージャル BGM の作曲者。Sequencer の conductor とトラックとしてつなぐ。
//
// セクション (既定 8 小節) ごとに調・拍子・盛り上がり・編成を決め、
// 和音は和音の枠ごとに、パートの音符は小節ごとにその場で作る。
// セクション最後の和音の枠に入ったところで次の調を決め、両方の調に含まれる和音 (ピボット) で転調する。

import type { Channel, ConductorBar, Sequencer, Track, TrackBar } from '../synth/index.ts'
import { NoteWriter, type BarContext, type ChordSpan, type PartId, type Section } from './context.ts'
import { chooseEnergy, chooseMeter, firstKey, meterBeats, meterGroups, meterLabel, nextKey } from './form.ts'
import { chooseChord, chordName, type Chord } from './harmony.ts'
import type { MelodyInfo } from './melody.ts'
import { DEFAULT_PARAMS, type BgmParams } from './params.ts'
import { PART_DEFS, createParts, type Part } from './parts.ts'
import { Random } from './random.ts'
import type { Key } from './scales.ts'

// 表示用の、ある小節の状態
export interface BarSnapshot {
  bar: number
  section: number
  barInSection: number
  sectionBars: number
  key: string
  scaleNote: string
  meter: string
  chords: string[]
  energy: number
  parts: PartId[]
  // セクション最後の小節で、次に転調する調
  modulatingTo?: string
  // メロディの句と音型 (リードが休んでいる・編成にないなら undefined)
  melody?: MelodyInfo
}

export class Composer {
  // 変更は次の小節 / 次のセクションから反映される (ParamDef.applies)
  params: BgmParams
  private formRng!: Random
  private harmonyRng!: Random
  private partRng!: Record<PartId, Random>
  private parts!: Record<PartId, Part>
  private section?: Section
  private next?: Key
  private ctx?: BarContext
  private readonly snapshots = new Map<number, BarSnapshot>()

  constructor(params: Partial<BgmParams> = {}) {
    this.params = { ...DEFAULT_PARAMS, ...params }
    this.reset()
  }

  // params.seed から最初からやり直す。Sequencer.start() の前に呼ぶ
  reset(): void {
    const seed = this.params.seed
    this.formRng = Random.derive(seed, 'form')
    this.harmonyRng = Random.derive(seed, 'harmony')
    this.partRng = Object.fromEntries(PART_DEFS.map((d) => [d.id, Random.derive(seed, d.id)])) as Record<PartId, Random>
    this.parts = createParts()
    this.section = undefined
    this.next = undefined
    this.ctx = undefined
    this.snapshots.clear()
  }

  // seq の conductor を置き換え、channels にあるパートのトラックを足す
  attach(seq: Sequencer, channels: Partial<Record<PartId, Channel>>): Map<PartId, Track> {
    seq.conductor = (bar) => this.conduct(bar)
    const tracks = new Map<PartId, Track>()
    for (const def of PART_DEFS) {
      const channel = channels[def.id]
      if (channel) tracks.set(def.id, seq.addTrack(channel, (bar) => this.play(def.id, bar)))
    }
    return tracks
  }

  snapshot(bar: number): BarSnapshot | undefined {
    return this.snapshots.get(bar)
  }

  private conduct(bar: ConductorBar): void {
    const p = this.params
    if (!this.section || bar.index >= this.section.startBar + this.section.bars) this.startSection(bar.index)
    const s = this.section!
    const barInSection = bar.index - s.startBar
    const beats = meterBeats(s.meter)
    bar.timeSignature = s.meter.timeSignature
    if (barInSection === 0) bar.setTempo(p.tempo)

    const chords = this.chordSpans(s, barInSection, beats)
    const last = barInSection === s.bars - 1
    const modulating = last && this.next !== undefined && !this.next.equals(s.key)
    if (modulating && p.ritardando > 0) bar.rampTempo(p.tempo * (1 - 0.3 * p.ritardando), 0, beats)

    this.ctx = {
      index: bar.index,
      section: s,
      barInSection,
      beats,
      groups: meterGroups(s.meter),
      chords,
      first: barInSection === 0,
      last,
      nextKey: this.next,
      params: p,
    }

    this.snapshots.set(bar.index, {
      bar: bar.index,
      section: s.index,
      barInSection,
      sectionBars: s.bars,
      key: s.key.name,
      scaleNote: s.key.scale.note,
      meter: meterLabel(s.meter),
      chords: chords.map((c) => chordName(s.key, c.chord)),
      energy: s.energy,
      parts: PART_DEFS.map((d) => d.id).filter((id) => s.parts.has(id)),
      modulatingTo: modulating ? this.next!.name : undefined,
    })
    this.snapshots.delete(bar.index - 64)
  }

  private play(id: PartId, bar: TrackBar): void {
    const ctx = this.ctx
    if (!ctx || ctx.index !== bar.index || !ctx.section.parts.has(id)) return
    const rng = this.partRng[id]
    const part = this.parts[id]
    part.generate(ctx, new NoteWriter(bar, rng, this.params.humanize), rng)
    const snapshot = this.snapshots.get(ctx.index)
    if (part.melody && snapshot) snapshot.melody = part.melody()
  }

  private startSection(startBar: number): void {
    const p = this.params
    const prev = this.section
    const rng = this.formRng
    const key = prev ? (this.next ?? nextKey(prev.key, p, rng)) : firstKey(p, rng)
    this.next = undefined
    const meter = chooseMeter(prev?.meter, p, rng)
    const energy = chooseEnergy(prev?.energy, p, rng)

    // 盛り上がりに応じて編成を決め、ときどき 1 パート抜いて変化をつける
    const parts = new Set<PartId>()
    for (const def of PART_DEFS) {
      const [lo, hi] = def.energy
      if (energy < lo || energy > hi) continue
      if (def.id !== 'drone' && def.id !== 'lead' && rng.chance(0.15)) continue
      parts.add(def.id)
    }

    this.section = {
      index: prev ? prev.index + 1 : 0,
      startBar,
      // 5/8 のような短い小節では、セクションが短くなりすぎないよう小節数を倍にする
      bars: meterBeats(meter) < 3 ? p.sectionBars * 2 : p.sectionBars,
      key,
      modulated: prev ? !prev.key.equals(key) : false,
      meter,
      energy,
      chordBars: p.chordBars,
      parts,
      chords: [],
    }
  }

  private chordSpans(s: Section, barInSection: number, beats: number): ChordSpan[] {
    if (s.chordBars >= 1) {
      const cb = s.chordBars
      const slot = Math.floor(barInSection / cb)
      const within = barInSection % cb
      const bars = Math.min(cb, s.bars - slot * cb) - within
      return [{ start: 0, end: beats, length: bars * beats, isNew: within === 0, chord: this.chord(s, slot) }]
    }
    // 小節の途中で変わる: 真ん中に最も近いまとまりの頭で分ける
    const starts = meterGroups(s.meter).map((g) => g.start).filter((t) => t > 0)
    const split = starts.reduce((a, b) => (Math.abs(b - beats / 2) < Math.abs(a - beats / 2) ? b : a), starts[0] ?? beats / 2)
    const slot = barInSection * 2
    return [
      { start: 0, end: split, length: split, isNew: true, chord: this.chord(s, slot) },
      { start: split, end: beats, length: beats - split, isNew: true, chord: this.chord(s, slot + 1) },
    ]
  }

  private chord(s: Section, slot: number): Chord {
    const total = s.chordBars >= 1 ? Math.ceil(s.bars / s.chordBars) : s.bars * 2
    while (s.chords.length <= slot) {
      const n = s.chords.length
      const final = n === total - 1
      if (final && !this.next) this.next = nextKey(s.key, this.params, this.formRng)
      s.chords.push(
        chooseChord(s.key, s.chords[n - 1], this.params, this.harmonyRng, {
          first: n === 0,
          final,
          next: final ? this.next : undefined,
        }),
      )
    }
    return s.chords[slot]
  }
}
