import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectMelody, motifSignature, reviewStudy, type CompositionStudy } from '../src/composition/study.ts'
import { STUDIES } from '../src/composition/projects.ts'
import { compileSong } from '../src/songs/song.ts'

const fixture: CompositionStudy = {
  song: {
    id: 'test', title: 'test', description: '', tempo: 100, intro: [], loop: ['a'],
    parts: [
      { id: 'm', label: 'm', instrument: 'flute', volume: 1, pan: -0.2, gate: 0.5 },
      { id: 'h', label: 'h', instrument: 'harp', volume: 0.5, pan: 0.2, gate: 2 },
      { id: 'd', label: 'd', instrument: 'orchestra-kit', volume: 0.4, pan: 0 },
    ],
    sections: [{
      id: 'a', label: 'a', timeSignature: [[3, 4], [2, 4], [6, 8]], chords: ['C', 'G', 'C'],
      parts: {
        m: ['v99 C5:2 -:1', '-:1 D5:1', 'E5:1 G5:1 r:1'],
        h: ['C3+E3:3', 'G3:1 B3:1', 'C3+E3:3'],
        d: ['', 'C4:2', ''],
      },
    }],
  },
  melodyPart: 'm', hypothesis: 'test',
  phrases: [{ label: 'a', from: 1, to: 3, intention: 'test' }],
  moments: [
    { bar: 2, beat: 0, pitches: ['C4', 'G4'], intention: '前小節からのタイ' },
    { bar: 2, beat: 1, pitches: ['D4', 'B4'], intention: '同じ小節内で和声が変わる' },
  ],
}

test('拍子の変化・タイを展開し、gate で音価の診断を変えない', () => {
  const r = inspectMelody(fixture.song, 'm')
  assert.equal(r.beats, 8)
  assert.deepEqual(r.events.map((e) => [e.at, e.duration, e.key]), [[0, 4, 72], [4, 1, 74], [5, 1, 76], [6, 1, 79]])
  assert.equal(r.maxLeap, 3)
  assert.deepEqual(r.range, [72, 79])
  const slice = inspectMelody(fixture.song, 'm', 2, 2)
  assert.equal(slice.events.length, 1)
  assert.ok(slice.warnings.some((w) => w.includes('タイ')))
  assert.throws(() => inspectMelody(fixture.song, 'm', 0), /invalid bar range/)
  assert.throws(() => inspectMelody(fixture.song, 'm', 1, NaN), /invalid bar range/)
  assert.throws(() => inspectMelody(fixture.song, 'absent'), /unknown melody part/)
  assert.throws(() => inspectMelody(fixture.song, 'd'), /pitched/)
})

test('動機は移調しても一致し、リズムや休符の位置が違えば一致しない', () => {
  const events = inspectMelody(fixture.song, 'm').events
  assert.equal(motifSignature(events), motifSignature(events.map((e) => ({ ...e, key: e.key + 5, at: e.at + 8 }))))
  const changed = structuredClone(events)
  changed[1].at += 0.5
  assert.notEqual(motifSignature(events), motifSignature(changed))
  changed[1].at -= 0.5
  changed[1].duration += 0.5
  assert.notEqual(motifSignature(events), motifSignature(changed))
  assert.equal(motifSignature([]), '')
})

test('和声検査は同じ瞬間の持続音を読み、gate の余韻・打楽器・後の音を混ぜない', () => {
  assert.ok(reviewStudy(fixture).moments.every((m) => !m.missing.length))
  const study = structuredClone(fixture)
  study.moments = [
    { bar: 2, beat: 0, pitches: ['B4', 'E4'], intention: '後に鳴る B と gate で残る E は不在' },
    { bar: 2, beat: 1, pitches: ['C4', 'G4'], intention: '終わった C と G は不在。打楽器の C は無視' },
  ]
  assert.deepEqual(reviewStudy(study).moments.map((m) => m.missing), [['B4', 'E4'], ['C4', 'G4']])
  study.moments[0].beat = 2
  assert.throws(() => reviewStudy(study), /invalid harmonic moment/)
})

test('既存の和音パートは最高音として警告し、試案の主旋律の和音は拒否する', () => {
  const study = structuredClone(fixture)
  study.song.sections[0].parts.m[0] = 'C4+C5:3'
  const r = inspectMelody(study.song, 'm')
  assert.equal(r.events[0].key, 72)
  assert.equal(r.polyphonicOnsets, 1)
  assert.ok(r.warnings.some((w) => w.includes('最高音')))
  assert.throws(() => reviewStudy(study), /monophonic/)
})

test('全試案の音符・句の範囲・宣言した響きと試聴版が有効', () => {
  assert.equal(new Set(STUDIES.map((s) => s.song.id)).size, STUDIES.length)
  for (const study of STUDIES) {
    const r = reviewStudy(study)
    assert.ok(r.phrases.every((p) => p.attacks > 0), study.song.id)
    assert.ok(r.moments.every((m) => !m.missing.length), study.song.id)
    assert.ok(compileSong(study.song).bars.length > 0)
  }
})
