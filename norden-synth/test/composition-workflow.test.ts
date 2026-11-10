import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { PROJECTS, STUDIES } from '../src/composition/projects.ts'
import {
  chooseCandidate, currentBatch, initialState, makeProjectRequest, makeRequest, openBatch, requestMore, restoreState,
  validateBatches, validateProjects, emptyBrief, type CompositionBatch, type CompositionProject,
} from '../src/composition/workflow.ts'
import { restoreDraft } from '../src/composition-brief.ts'
import { SONGS } from '../src/songs/index.ts'
import { inspectMelody, motifSignature } from '../src/composition/study.ts'
import { compileSong } from '../src/songs/song.ts'

const project = PROJECTS.find((p) => p.id === 'strategy-screen')!
const BATCHES = project.batches
const lib = (batches: CompositionBatch[]): CompositionProject => ({ ...project, batches })
const latestThemes = BATCHES.filter((b) => b.stage === 'themes').at(-1)!
const theme = latestThemes.candidates[0]
const otherTheme = latestThemes.candidates[1]
const firstBarBeats = (s: typeof theme) => compileSong(s.song).bars[0].beats
function harmonyBatch(id = 'harmony-001', parentId = theme.song.id): CompositionBatch {
  return {
    id, title: id, stage: 'harmony', parentId,
    candidates: Array.from({ length: 5 }, (_, i) => {
      const candidate = structuredClone(STUDIES.find((s) => s.song.id === parentId)!)
      candidate.song.id = `${id}-${i}`
      candidate.song.title = `和声 ${id} ${i}`
      // テスト用。主旋律の保持と派生先の選択を検証する。
      candidate.song.sections[0].parts.bass[0] = `${['D2', 'F2', 'Bb2', 'G2', 'A2'][i]}:${firstBarBeats(candidate)}`
      return candidate
    }),
  }
}

test('初回は名前付き・和声付きの異なる主題が5案以上あり、音色も存在する', () => {
  validateBatches(BATCHES)
  const batch = currentBatch(BATCHES, initialState())!
  assert.equal(batch.stage, 'themes')
  assert.ok(batch.candidates.length >= 5)
  assert.equal(new Set(batch.candidates.map((c) => c.song.title)).size, batch.candidates.length)
  assert.equal(new Set(batch.candidates.map((c) => motifSignature(inspectMelody(c.song, c.melodyPart).events))).size, batch.candidates.length)
  const instruments = new Set((JSON.parse(readFileSync(new URL('../public/instruments/index.json', import.meta.url), 'utf8')) as { instruments: { id: string }[] }).instruments.map((i) => i.id))
  for (const c of batch.candidates) for (const part of c.song.parts) assert.ok(instruments.has(part.instrument))
})

test('主題を選ぶとメモと正しい派生元を含めた5つの和声案の依頼になる', () => {
  const state = initialState()
  state.notes[latestThemes.id] = '長い歌にしたい'
  state.notes[theme.song.id] = '冒頭を残し、後半を明るく'
  const next = chooseCandidate(project, state, theme.song.id)
  assert.equal(state.stage, 'themes')
  assert.equal(next.stage, 'harmony')
  assert.equal(next.themeId, theme.song.id)
  assert.equal(next.harmonyId, undefined)
  assert.equal(currentBatch(BATCHES, next), undefined)
  const request = next.history.at(-1)!
  assert.equal(request.parentId, theme.song.id)
  assert.match(request.text, /バリエーションを5案/)
  assert.match(request.text, /冒頭を残し、後半を明るく/)
  assert.match(request.text, /長い歌にしたい/)
})

test('和声案の追加後、同じ選択状態で最新の組を表示し、別主題の案を混ぜない', () => {
  const state = chooseCandidate(project, initialState(), theme.song.id)
  const first = harmonyBatch()
  const other = harmonyBatch('other', otherTheme.song.id)
  const second = harmonyBatch('harmony-002')
  const library = [...BATCHES, first, other, second]
  assert.equal(currentBatch(library, state), second)
  assert.equal(currentBatch(library, { ...state, batchId: first.id }), first)
  assert.equal(currentBatch(library, { ...state, batchId: other.id }), second)
  assert.equal(currentBatch(library, restoreState(JSON.stringify(state), library)), second)
})

test('採用した和声から編曲へ進み、既存の編曲版をその楽器編成のまま取得する', () => {
  const harmonies = harmonyBatch()
  const library = [...BATCHES, harmonies]
  let state = chooseCandidate(lib(library), initialState(), theme.song.id)
  assert.equal(state.history.length, 0) // 作成済みの案は依頼を増やさず開く
  state = chooseCandidate(lib(library), state, harmonies.candidates[2].song.id)
  assert.equal(state.stage, 'orchestration')
  assert.equal(state.harmonyId, harmonies.candidates[2].song.id)
  assert.equal(state.history.at(-1)!.parentId, state.harmonyId)
  const arranged = structuredClone(harmonies.candidates[2])
  arranged.song.id = 'arranged-001'
  arranged.song.parts[0].instrument = 'violin'
  const orchestration: CompositionBatch = { id: 'orchestra-001', title: '編曲', stage: 'orchestration', parentId: state.harmonyId, candidates: [arranged] }
  validateBatches([...library, orchestration])
  assert.equal(currentBatch([...library, orchestration], state)!.candidates[0].song.parts[0].instrument, 'violin')
  const retry = requestMore(lib([...library, orchestration]), state, 'harmony')
  assert.equal(retry.history.at(-1)!.parentId, theme.song.id)
  assert.equal(retry.stage, 'harmony')
})

test('見送り・出し直しでは過去の案とメモを保持し、主題の選択をリセットできる', () => {
  let state = chooseCandidate(project, initialState(), theme.song.id)
  state.notes[theme.song.id] = '残しておくメモ'
  state = requestMore(project, state, 'themes')
  assert.equal(state.stage, 'themes')
  assert.equal(state.themeId, undefined)
  assert.equal(state.harmonyId, undefined)
  assert.equal(state.notes[theme.song.id], '残しておくメモ')
  assert.equal(state.history.length, 2)
  assert.equal(state.history.at(-1)!.parentId, undefined)
  assert.match(state.history.at(-1)!.text, /5案以上/)
  assert.equal(currentBatch(BATCHES, state), latestThemes)
})

test('保存した選択を復元し、壊れた状態や別主題の和声を安全に外す', () => {
  assert.deepEqual(restoreState('{broken', BATCHES), initialState())
  assert.deepEqual(restoreState('{"version":0}', BATCHES), initialState())
  const harmonies = harmonyBatch()
  const library = [...BATCHES, harmonies]
  const state = chooseCandidate(lib(library), chooseCandidate(lib(library), initialState(), theme.song.id), harmonies.candidates[0].song.id)
  const restored = restoreState(JSON.stringify(state), library)
  assert.equal(restored.stage, 'orchestration')
  assert.equal(restored.harmonyId, state.harmonyId)
  const unrelated = restoreState(JSON.stringify({ ...state, themeId: otherTheme.song.id }), library)
  assert.equal(unrelated.stage, 'harmony')
  assert.equal(unrelated.harmonyId, undefined)
  const removed = restoreState(JSON.stringify(state), BATCHES)
  assert.equal(removed.stage, 'harmony')
  assert.equal(removed.themeId, theme.song.id)
})

test('候補数・名前・派生元の不正や和声案の主旋律変更を検出する', () => {
  const small = structuredClone(BATCHES)
  small[0].candidates.pop()
  assert.throws(() => validateBatches(small), /at least 5/)
  const names = structuredClone(BATCHES)
  names[0].candidates[1].song.title = names[0].candidates[0].song.title
  assert.throws(() => validateBatches(names), /distinct names/)
  const harmonies = harmonyBatch()
  validateBatches([...BATCHES, harmonies])
  harmonies.candidates[0].song.sections[0].parts.melody[0] = `D5:${firstBarBeats(harmonies.candidates[0])}`
  assert.throws(() => validateBatches([...BATCHES, harmonies]), /changed the theme/)
  assert.throws(() => validateBatches([{ ...harmonyBatch(), parentId: 'missing' }]), /invalid parent/)
  const solo = structuredClone(BATCHES)
  solo[0].candidates[0].song.parts = solo[0].candidates[0].song.parts.filter((p) => p.id === 'melody')
  solo[0].candidates[0].song.sections[0].parts = { melody: solo[0].candidates[0].song.sections[0].parts.melody }
  assert.throws(() => validateBatches(solo), /accompaniment required/)
})

test('未選択で後の段階へ進めず、候補IDの取り違えを拒否する', () => {
  assert.throws(() => makeRequest(project, 'harmony'), /先に元/)
  assert.throws(() => makeRequest(project, 'orchestration', theme.song.id), /先に元/)
  assert.throws(() => makeRequest(project, 'themes', theme.song.id), /派生元/)
  assert.throws(() => chooseCandidate(project, initialState(), 'missing'), /表示中/)
})

test('全プロジェクトの ID・参考曲・採用曲・感想の対象が正しい', () => {
  validateProjects(PROJECTS, SONGS.map((s) => s.id))
  const dup = structuredClone(project)
  assert.throws(() => validateProjects([project, { ...dup, id: 'copy' }]), /duplicate batch/)
  assert.throws(() => validateProjects([{ ...project, id: 'Bad Id' }]), /invalid project id/)
  assert.throws(() => validateProjects([{ ...project, feedback: [{ batchId: 'missing', candidates: [], preferred: 'neither', userWords: '' }] }]), /unknown batch/)
  assert.throws(() => validateProjects([{ ...project, brief: { ...project.brief, references: [{ songId: 'missing', notes: '' }] } }], SONGS.map((s) => s.id)), /reference/)
})

test('依頼文はプロジェクトの登録先・ブリーフ・感想の記録先を示す', () => {
  const text = makeRequest(project, 'harmony', theme.song.id, undefined, '後半を明るく').text
  assert.match(text, /src\/composition\/projects\/strategy-screen\/project\.ts/)
  assert.match(text, /feedback\.ts/)
  assert.match(text, /後半を明るく/)
})

test('履歴から任意の組を、派生関係を復元して開く', () => {
  const orchestration = BATCHES.find((b) => b.stage === 'orchestration')!
  const harmony = BATCHES.find((b) => b.candidates.some((c) => c.song.id === orchestration.parentId))!
  const state = openBatch(project, { ...initialState(), notes: { a: 'メモ' } }, orchestration.id)
  assert.equal(state.stage, 'orchestration')
  assert.equal(state.harmonyId, orchestration.parentId)
  assert.equal(state.themeId, harmony.parentId)
  assert.equal(currentBatch(BATCHES, state), orchestration)
  assert.equal(state.notes.a, 'メモ')
  const themes = openBatch(project, state, BATCHES[0].id)
  assert.equal(themes.stage, 'themes')
  assert.equal(themes.themeId, undefined)
  assert.equal(currentBatch(BATCHES, themes), BATCHES[0])
  assert.deepEqual(restoreState(JSON.stringify(state), BATCHES).harmonyId, state.harmonyId)
  assert.throws(() => openBatch(project, state, 'missing'), /unknown batch/)
})

test('新しいプロジェクトの依頼文は入力したブリーフだけを含み、最初の主題5案を求める', () => {
  const draft = { ...emptyBrief(), title: '作戦会議', purpose: '会議画面', references: [{ songId: SONGS[0].id, notes: '冒頭' }, { songId: 'missing', notes: 'x' }] }
  const text = makeProjectRequest(draft, SONGS, PROJECTS)
  assert.match(text, /「作戦会議」/)
  assert.match(text, /用途・場面:\n会議画面/)
  assert.doesNotMatch(text, /欲しいイメージ:/)
  assert.doesNotMatch(text, /避けたいこと:/)
  assert.match(text, new RegExp(`「${SONGS[0].title}」 \\(${SONGS[0].id}\\) — 冒頭`))
  assert.doesNotMatch(text, /missing/)
  assert.match(text, /5案以上/)
  assert.match(text, /strategy-screen/) // 既存 id と重ねない
  const json = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1])
  assert.deepEqual(json, { purpose: '会議画面', image: '', avoid: '', references: [{ songId: SONGS[0].id, notes: '冒頭' }] })
  assert.throws(() => makeProjectRequest({ ...draft, title: ' ' }, SONGS), /プロジェクト名/)
  assert.throws(() => makeProjectRequest({ ...emptyBrief(), title: 'a', avoid: 'x' }, SONGS), /用途・場面か/)
})

test('ブリーフの下書きは壊れた値や存在しない参考曲を捨てて復元する', () => {
  assert.deepEqual(restoreDraft('{broken', SONGS), { draft: emptyBrief(), request: '' })
  const restored = restoreDraft(JSON.stringify({ draft: { title: 'a', purpose: 1, references: [{ songId: SONGS[0].id, notes: 'n' }, { songId: 'missing', notes: '' }, null] }, request: 'r' }), SONGS)
  assert.equal(restored.draft.title, 'a')
  assert.equal(restored.draft.purpose, '')
  assert.deepEqual(restored.draft.references, [{ songId: SONGS[0].id, notes: 'n' }])
  assert.equal(restored.request, 'r')
})
