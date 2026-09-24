import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { ARRANGEMENTS, Composer, PLAYER_DEFS, ROLE_DEFS, type BgmParams, type PlayerId } from '../src/music/index.ts'
import { Sequencer } from '../src/synth/sequencer.ts'
import type { Channel } from '../src/synth/synth.ts'

interface Played {
  player: PlayerId
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
    PLAYER_DEFS.map((d) => [
      d.id,
      {
        playNote(key: number, velocity: number, time: number, duration: number) {
          played.push({ player: d.id, key, velocity, time, duration })
          return []
        },
      } as unknown as Channel,
    ]),
  )
  // 小節ごと・奏者ごとの音符 (拍と音)
  const barNotes = new Map<number, Map<PlayerId, { beat: number; key: number }[]>>()
  const playerOf = new Map(Object.entries(channels).map(([id, ch]) => [ch, id as PlayerId]))
  const addTrack = seq.addTrack.bind(seq)
  seq.addTrack = (channel, generate) =>
    addTrack(channel, (bar) => {
      const notes: { beat: number; key: number }[] = []
      if (!barNotes.has(bar.index)) barNotes.set(bar.index, new Map())
      barNotes.get(bar.index)!.set(playerOf.get(channel)!, notes)
      const note = bar.note.bind(bar)
      generate({ ...bar, note: (beat, key, velocity, duration) => (notes.push({ beat, key }), note(beat, key, velocity, duration)) })
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
  return { played, errors, composer, snapshots, barNotes }
}

// メロディを受け持つ奏者の、その小節の発音位置
function melodyBeats(r: ReturnType<typeof render>, bar: number): number[] | undefined {
  const player = r.snapshots.find((s) => s.bar === bar)?.roles.find((x) => x.role === 'melody')?.player
  return player && r.barNotes.get(bar)?.get(player)?.map((n) => n.beat)
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
      const { played, errors, snapshots, barNotes } = render({ ...v, seed }, 64)
      assert.deepEqual(errors, [], `variant ${i} seed ${seed}`)
      assert.ok(played.length > 20, `variant ${i} seed ${seed}: ${played.length} notes`)
      // 各奏者の音は、その小節の伴奏セットで受け持つ席の音域に入る。席のない奏者は鳴らない
      for (const snap of snapshots) {
        const seats = ARRANGEMENTS.find((a) => a.name === snap.arrangement)!.seats
        for (const [player, notes] of barNotes.get(snap.bar) ?? []) {
          if (notes.length === 0) continue
          const role = snap.roles.find((r) => r.player === player)?.role
          const seat = seats.find((x) => x.role === role && x.player === player)
          assert.ok(seat, `${player} plays without a seat (variant ${i} seed ${seed} bar ${snap.bar})`)
          for (const n of notes) {
            assert.ok(n.key >= seat.lo && n.key <= seat.hi, `${player} as ${role} key ${n.key} (variant ${i} seed ${seed})`)
          }
        }
      }
      for (const n of played) {
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
    const r = render({ seed, sectionBars: 8, oddMeter: 0, humanize: 0, ornaments: 0 }, 64)
    for (const s of r.snapshots) {
      // 最初のセクションの最初の句と静かなセクションの奇数番目の句は休むので除く
      if (s.barInSection !== 0 || s.section === 0 || s.energy < 0.3) continue
      for (let i = 0; i < 4; i++) {
        const a = melodyBeats(r, s.bar + i)
        const b = melodyBeats(r, s.bar + 4 + i)
        if (!a || !b) continue
        assert.deepEqual(b, a, `seed ${seed} bar ${s.bar + i}`)
        checked++
      }
    }
  }
  assert.ok(checked > 20, `${checked} bars checked`)
})

test('伴奏セットは 1 人の奏者に 1 つの役割で、メロディと低音を必ず含む', () => {
  for (const a of ARRANGEMENTS) {
    const players = a.seats.map((s) => s.player)
    assert.equal(new Set(players).size, players.length, a.id)
    assert.equal(new Set(a.seats.map((s) => s.role)).size, a.seats.length, a.id)
    assert.ok(a.seats.some((s) => s.role === 'melody') && a.seats.some((s) => s.role === 'bass'), a.id)
    for (const s of a.seats) assert.ok(s.hi - s.lo >= 12, `${a.id} ${s.role}`)
  }
  assert.ok(ROLE_DEFS.every((d) => ARRANGEMENTS.some((a) => a.seats.some((s) => s.role === d.id))))
})

test('アーティクルごとに伴奏セットが替わる', () => {
  const { snapshots } = render({ seed: 5, sectionBars: 4, oddMeter: 0, articleSections: 2 }, 48)
  const sections = snapshots.filter((s) => s.barInSection === 0)
  for (const s of sections) {
    assert.equal(s.article, Math.floor(s.section / 2))
    assert.equal(s.sectionInArticle, s.section % 2)
    const prev = sections.find((p) => p.section === s.section - 1)
    if (!prev) continue
    if (s.sectionInArticle === 0) assert.notEqual(s.arrangement, prev.arrangement)
    else assert.equal(s.arrangement, prev.arrangement)
  }
  assert.ok(new Set(sections.map((s) => s.arrangement)).size >= 3)
})

test('低音・和音パートの弾き方と根音の動かし方はセクションごとに変わる', () => {
  const bass = new Set<string>()
  const chords = new Set<string>()
  const progressions = new Set<string>()
  for (const seed of [1, 2, 3, 4]) {
    const r = render({ seed, sectionBars: 4, energy: 0.7, dynamics: 0.6, drone: 0.3, bassMotion: 0.7 }, 60)
    for (const s of r.snapshots) {
      for (const x of s.roles) {
        if (x.role === 'bass' && x.style) bass.add(x.style)
        if (x.role === 'chords' && x.style) chords.add(x.style)
      }
      progressions.add(s.progression.split(' · ')[0])
    }
  }
  assert.ok(bass.size >= 6, [...bass].join(', '))
  assert.ok(chords.size >= 4, [...chords].join(', '))
  assert.equal(progressions.size, 4, [...progressions].join(', '))
})

test('往復や繰り返しの進行では、最後の和音を除いて同じ周期で和音が繰り返す', () => {
  let checked = 0
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const r = render({ seed, sectionBars: 8, chordBars: 1, oddMeter: 0 }, 60)
    const sections = new Map<number, typeof r.snapshots>()
    for (const s of r.snapshots) sections.set(s.section, [...(sections.get(s.section) ?? []), s])
    for (const bars of sections.values()) {
      if (bars.length !== bars[0].sectionBars) continue
      const label = bars[0].progression
      const period = label.startsWith('2 和音の往復') ? 2 : Number(/(\d+) 和音ごとに繰り返し/.exec(label)?.[1] ?? 0)
      if (!period) continue
      const names = bars.map((b) => b.chords[0])
      for (let i = period; i < names.length - 1; i++) assert.equal(names[i], names[i - period], `seed ${seed} ${label}`)
      if (period === 2) assert.notEqual(names[0], names[1], `seed ${seed} ${names.join(' ')}`)
      checked++
    }
  }
  assert.ok(checked >= 3, `${checked} sections checked`)
})

test('和音の彩り 0 なら 4 音の和音を使わず、1 なら使う', () => {
  // 7 の和音・add9 か、名前のない 4 音の和音 (音程が 3 つ並ぶ)
  const fourNote = (name: string) => /(7|add9)$/.test(name) || /\([^,)]+,[^,)]+,[^,)]+\)$/.test(name)
  const names = (chordColor: number) =>
    render({ chordColor, exoticism: 0.3, microtones: 0, modulationRate: 1, sectionBars: 4 }, 60).snapshots.flatMap((s) => s.chords)
  assert.ok(!names(0).some(fourNote), names(0).filter(fourNote).join(' '))
  assert.ok(names(1).filter(fourNote).length >= 5)
})
