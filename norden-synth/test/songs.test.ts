import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { SONGS, barAt, compileSong, type Song } from '../src/songs/index.ts'
import { parsePitch } from '../src/songs/song.ts'

const instruments = new Set(
  (JSON.parse(readFileSync(new URL('../public/instruments/index.json', import.meta.url), 'utf8')) as { instruments: { id: string }[] }).instruments.map(
    (i) => i.id,
  ),
)

for (const song of SONGS) {
  test(`${song.id}: 展開できて、楽器が揃っている`, () => {
    const compiled = compileSong(song)
    assert.ok(compiled.bars.length > compiled.introBars)
    for (const part of song.parts) assert.ok(instruments.has(part.instrument), `${part.id}: ${part.instrument}`)
    assert.equal(new Set(SONGS.map((s) => s.id)).size, SONGS.length)
  })
}

const tiny: Song = {
  id: 'tiny',
  title: 'tiny',
  description: '',
  tempo: 120,
  timeSignature: [3, 4],
  parts: [{ id: 'p', label: 'p', instrument: 'harp', volume: 1, pan: 0, velocity: 70, gate: 0.5 }],
  sections: [
    { id: 'i', label: 'i', chords: ['C'], parts: { p: ['C4+E4:1 r G4'] } },
    { id: 'a', label: 'a', chords: ['C', 'G'], parts: { p: ['v90 A4:2 -:1', '-:1 B4:.5 B4:1/2 C5:1'] } },
  ],
  intro: ['i'],
  loop: ['a'],
}

test('音名・長さ・和音・休符・伸ばし・ベロシティを展開する', () => {
  assert.equal(parsePitch('C4'), 60)
  assert.equal(parsePitch('Bb3'), 58)
  assert.equal(parsePitch('C#-1'), 1)
  const c = compileSong(tiny)
  assert.deepEqual(c.bars[0].notes.get('p'), [
    { beat: 0, key: 60, velocity: 70, duration: 0.5 },
    { beat: 0, key: 64, velocity: 70, duration: 0.5 },
    { beat: 2, key: 67, velocity: 70, duration: 0.5 },
  ])
  // A4 は次の小節まで 4 拍伸びる。.5 拍と 1/2 拍の B4
  assert.deepEqual(c.bars[1].notes.get('p'), [{ beat: 0, key: 69, velocity: 90, duration: 2 }])
  assert.deepEqual(c.bars[2].notes.get('p'), [
    { beat: 1, key: 71, velocity: 90, duration: 0.25 },
    { beat: 1.5, key: 71, velocity: 90, duration: 0.25 },
    { beat: 2, key: 72, velocity: 90, duration: 0.5 },
  ])
})

test('ループはイントロの後から繰り返し、ループしなければ終わる', () => {
  const c = compileSong(tiny)
  assert.equal(c.introBars, 1)
  assert.equal(barAt(c, 3, true), c.bars[1])
  assert.equal(barAt(c, 4, true), c.bars[2])
  assert.equal(barAt(c, 3, false), undefined)
})

test('拍子はセクションごと・小節ごとに変えられる', () => {
  const song = structuredClone(tiny)
  song.sections[1].timeSignature = [
    [7, 8],
    [2, 4],
  ]
  song.sections[1].parts.p = ['A4:3.5', 'B4:2']
  const c = compileSong(song)
  assert.deepEqual(
    c.bars.map((b) => [b.timeSignature, b.beats]),
    [
      [[3, 4], 3],
      [[7, 8], 3.5],
      [[2, 4], 2],
    ],
  )
  // 6/8 は 3/4 と同じ 3 拍なので通り、2/4 では長さが合わない
  song.sections[0].timeSignature = [6, 8]
  assert.equal(compileSong(song).bars[0].beats, 3)
  song.sections[0].timeSignature = [2, 4]
  assert.throws(() => compileSong(song), /tiny\/i\/p bar 1: 3 beats, expected 2/)
})

test('小節の長さが合わないとエラーになる', () => {
  const bad = structuredClone(tiny)
  bad.sections[1].parts.p[1] = 'B4:1'
  assert.throws(() => compileSong(bad), /tiny\/a\/p bar 2: 1 beats, expected 3/)
  const unknown = structuredClone(tiny)
  unknown.sections[0].parts.q = ['']
  assert.throws(() => compileSong(unknown), /unknown part q/)
})
