import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { Composer, PART_DEFS, type BgmParams, type PartId } from '../src/music/index.ts'
import { Sequencer } from '../src/synth/sequencer.ts'
import type { Channel } from '../src/synth/synth.ts'

interface Played {
  part: PartId
  key: number
  velocity: number
  time: number
  duration: number
}

// 実時間を使わずに bars 小節ぶん生成する
function render(params: Partial<BgmParams>, bars: number) {
  const ctx = { currentTime: 0 }
  const seq = new Sequencer(ctx as unknown as BaseAudioContext, { lookahead: 0.5 })
  after(() => seq.stop())
  const composer = new Composer(params)
  const played: Played[] = []
  const channels = Object.fromEntries(
    PART_DEFS.map((d) => [
      d.id,
      {
        playNote(key: number, velocity: number, time: number, duration: number) {
          played.push({ part: d.id, key, velocity, time, duration })
          return []
        },
      } as unknown as Channel,
    ]),
  )
  // リードの小節ごとの発音位置 (拍)
  const leadBeats = new Map<number, number[]>()
  const addTrack = seq.addTrack.bind(seq)
  seq.addTrack = (channel, generate) =>
    addTrack(channel, (bar) => {
      if (channel !== channels.lead) return generate(bar)
      const beats: number[] = []
      leadBeats.set(bar.index, beats)
      const note = bar.note.bind(bar)
      generate({ ...bar, note: (beat, key, velocity, duration) => (beats.push(beat), note(beat, key, velocity, duration)) })
    })
  composer.attach(seq, channels)
  const error = console.error
  const errors: unknown[] = []
  console.error = (...args: unknown[]) => errors.push(args)
  try {
    seq.start(0)
    while (!composer.snapshot(bars)) {
      ctx.currentTime += 0.1
      ;(seq as unknown as { tick(): void }).tick()
    }
  } finally {
    console.error = error
  }
  const snapshots = [...Array(bars).keys()].map((i) => composer.snapshot(i)).filter((s) => s !== undefined)
  return { played, errors, composer, snapshots, leadBeats }
}

const RANGES: Record<PartId, [number, number]> = {
  drone: [28, 52],
  lead: [50, 77],
  counter: [64, 91],
  pad: [55, 71],
  choir: [55, 74],
  ostinato: [48, 67],
  harp: [50, 90],
  percussion: [40, 59],
  shimmer: [72, 96],
}

test('いろいろなシードとパラメータで例外なく生成でき、音域とベロシティが範囲内', () => {
  const variants: Partial<BgmParams>[] = [
    {},
    { exoticism: 1, microtones: 1, modulationRate: 1, modulationDistance: 1, oddMeter: 1 },
    { exoticism: 0, microtones: 0, modulationRate: 0, oddMeter: 0, chordBars: 0.5, sectionBars: 4 },
    { energy: 1, dynamics: 1, melodyDensity: 1, ornaments: 1, chordBars: 4, sectionBars: 16 },
    { energy: 0, dynamics: 0, melodyDensity: 0, ornaments: 0, drone: 0, humanize: 1 },
  ]
  for (const [i, v] of variants.entries()) {
    for (const seed of [1, 2, 3]) {
      const { played, errors } = render({ ...v, seed }, 64)
      assert.deepEqual(errors, [], `variant ${i} seed ${seed}`)
      assert.ok(played.length > 20, `variant ${i} seed ${seed}: ${played.length} notes`)
      for (const n of played) {
        const [lo, hi] = RANGES[n.part]
        assert.ok(n.key >= lo && n.key <= hi, `${n.part} key ${n.key} (variant ${i} seed ${seed})`)
        assert.ok(n.velocity >= 1 && n.velocity <= 127)
        assert.ok(n.duration > 0 && n.time >= 0)
      }
    }
  }
})

test('同じシードとパラメータなら同じ曲になる', () => {
  const a = render({ seed: 42 }, 32).played
  const b = render({ seed: 42 }, 32).played
  assert.deepEqual(a, b)
  const c = render({ seed: 43 }, 32).played
  assert.notDeepEqual(a, c)
})

test('転調の頻度 0 なら調が変わらず、1 ならセクションごとに変わる', () => {
  const keys = (p: Partial<BgmParams>) => [...new Set(render({ ...p, sectionBars: 4 }, 64).snapshots.map((s) => s.key))]
  assert.equal(keys({ modulationRate: 0 }).length, 1)
  assert.ok(keys({ modulationRate: 1 }).length >= 12)
})

test('微分音 0 なら 4 分音を使わない', () => {
  const { played } = render({ microtones: 0, exoticism: 0.8, modulationRate: 1, sectionBars: 4 }, 96)
  assert.ok(played.every((n) => Number.isInteger(n.key)))
  const micro = render({ microtones: 1, exoticism: 0.8, modulationRate: 1, sectionBars: 4 }, 96).played
  assert.ok(micro.some((n) => !Number.isInteger(n.key)))
})

test('メロディは A と A\' の句で同じリズムを繰り返す', () => {
  let checked = 0
  for (const seed of [1, 2, 3, 4]) {
    const { snapshots, leadBeats } = render({ seed, sectionBars: 8, oddMeter: 0, humanize: 0, ornaments: 0 }, 64)
    for (const s of snapshots) {
      // 最初のセクションの最初の句と静かなセクションの奇数番目の句は休むので除く
      if (s.barInSection !== 0 || s.section === 0 || s.energy < 0.3 || !s.parts.includes('lead')) continue
      for (let i = 0; i < 4; i++) {
        const a = leadBeats.get(s.bar + i)
        const b = leadBeats.get(s.bar + 4 + i)
        if (!a || !b) continue
        assert.deepEqual(b, a, `seed ${seed} bar ${s.bar + i}`)
        checked++
      }
    }
  }
  assert.ok(checked > 20, `${checked} bars checked`)
})
