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
import { inspectMelody, motifSignature, opensWith, themeReuse } from '../src/composition/study.ts'
import { buildSketch, transposeBar, transposeChord, transposePassage, type Passage } from '../src/composition/sketch.ts'
import { compileSong } from '../src/songs/song.ts'

const project = PROJECTS.find((p) => p.id === 'strategy-screen')!
const BATCHES = project.batches
const lib = (batches: CompositionBatch[]): CompositionProject => ({ ...project, batches })
const latestThemes = BATCHES.filter((b) => b.stage === 'themes').at(-1)!
const theme = latestThemes.candidates[0]
const otherTheme = latestThemes.candidates[1]
const firstBarBeats = (s: typeof theme) => compileSong(s.song).bars[0].beats
// フル尺の構成案: 主題のあとに、新しい旋律の24小節を続ける。
function structureBatch(id = 'structure-001', parentId = theme.song.id): CompositionBatch {
  return {
    id, title: id, stage: 'structure', parentId,
    candidates: Array.from({ length: 3 }, (_, i) => {
      const candidate = structuredClone(STUDIES.find((s) => s.song.id === parentId)!)
      const beats = firstBarBeats(candidate)
      const bars = compileSong(candidate.song).bars.length
      candidate.song.id = `${id}-${i}`
      candidate.song.title = `構成 ${id} ${i}`
      candidate.song.sections.push({
        id: 'b', label: '対比', chords: Array(24).fill('C'),
        parts: { melody: Array(24).fill(`${['Db6', 'Eb6', 'Gb6'][i]}:${beats}`), bass: Array(24).fill(`C2:${beats}`) },
      })
      candidate.song.loop = [...candidate.song.loop, 'b']
      candidate.phrases = [
        { label: 'A', from: 1, to: bars, intention: '主題' },
        { label: 'B', from: bars + 1, to: bars + 24, intention: '対比' },
      ]
      return candidate
    }),
  }
}

// 構成の段階に置き換える前の和声案（旧形式）。
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
  const batch = currentBatch(BATCHES, initialState(BATCHES))!
  assert.equal(batch.stage, 'themes')
  assert.ok(batch.candidates.length >= 5)
  assert.equal(new Set(batch.candidates.map((c) => c.song.title)).size, batch.candidates.length)
  assert.equal(new Set(batch.candidates.map((c) => motifSignature(inspectMelody(c.song, c.melodyPart).events))).size, batch.candidates.length)
  const instruments = new Set((JSON.parse(readFileSync(new URL('../public/instruments/index.json', import.meta.url), 'utf8')) as { instruments: { id: string }[] }).instruments.map((i) => i.id))
  for (const c of batch.candidates) for (const part of c.song.parts) assert.ok(instruments.has(part.instrument))
})

test('主題を選ぶとメモと正しい派生元を含めたフル尺の構成案の依頼になる', () => {
  const state = initialState(BATCHES)
  state.notes[latestThemes.id] = '長い歌にしたい'
  state.notes[theme.song.id] = '冒頭を残し、後半を明るく'
  const next = chooseCandidate(project, state, theme.song.id)
  assert.equal(state.stage, 'themes')
  assert.equal(next.stage, 'structure')
  assert.equal(next.themeId, theme.song.id)
  assert.equal(next.structureId, undefined)
  assert.equal(currentBatch(BATCHES, next), undefined)
  const request = next.history.at(-1)!
  assert.equal(request.parentId, theme.song.id)
  assert.match(request.text, /フル尺の構成案を3案以上/)
  assert.match(request.text, /主題を2周するだけの曲にせず/)
  assert.doesNotMatch(request.text, /主旋律の音符・リズム・テンポ・拍子を保ち/)
  assert.match(request.text, /冒頭を残し、後半を明るく/)
  assert.match(request.text, /長い歌にしたい/)
})

test('構成案の追加後、同じ選択状態で最新の組を表示し、別主題の案を混ぜない。旧形式の和声案も同じ段階に並ぶ', () => {
  const state = chooseCandidate(project, initialState(BATCHES), theme.song.id)
  const first = harmonyBatch()
  const other = structureBatch('other', otherTheme.song.id)
  const second = structureBatch('structure-002')
  const library = [...BATCHES, first, other, second]
  assert.equal(currentBatch(library, state), second)
  assert.equal(currentBatch(library, { ...state, batchId: first.id }), first)
  assert.equal(currentBatch(library, { ...state, batchId: other.id }), second)
  assert.equal(currentBatch(library, restoreState(JSON.stringify(state), library)), second)
})

test('選んだ構成から編曲へ進み、既存の編曲版をその楽器編成のまま取得する', () => {
  const harmonies = structureBatch()
  const library = [...BATCHES, harmonies]
  let state = chooseCandidate(lib(library), initialState(BATCHES), theme.song.id)
  assert.equal(state.history.length, 0) // 作成済みの案は依頼を増やさず開く
  state = chooseCandidate(lib(library), state, harmonies.candidates[2].song.id)
  assert.equal(state.stage, 'orchestration')
  assert.equal(state.structureId, harmonies.candidates[2].song.id)
  assert.equal(state.history.at(-1)!.parentId, state.structureId)
  assert.match(state.history.at(-1)!.text, /構成案のまま保ち/)
  const arranged = structuredClone(harmonies.candidates[2])
  arranged.song.id = 'arranged-001'
  arranged.song.parts[0].instrument = 'violin'
  const orchestration: CompositionBatch = { id: 'orchestra-001', title: '編曲', stage: 'orchestration', parentId: state.structureId, candidates: [arranged] }
  validateBatches([...library, orchestration])
  assert.equal(currentBatch([...library, orchestration], state)!.candidates[0].song.parts[0].instrument, 'violin')
  const retry = requestMore(lib([...library, orchestration]), state, 'structure')
  assert.equal(retry.history.at(-1)!.parentId, theme.song.id)
  assert.equal(retry.stage, 'structure')
})

test('見送り・出し直しでは過去の案とメモを保持し、主題の選択をリセットできる', () => {
  let state = chooseCandidate(project, initialState(BATCHES), theme.song.id)
  state.notes[theme.song.id] = '残しておくメモ'
  // 旧形式の主題にはフックがないので、主題の展開は依頼できない。出し直しはフックから。
  assert.throws(() => requestMore(project, state, 'themes'), /先に元/)
  state = requestMore(project, state, 'hooks')
  assert.equal(state.stage, 'hooks')
  assert.equal(state.themeId, undefined)
  assert.equal(state.structureId, undefined)
  assert.equal(state.notes[theme.song.id], '残しておくメモ')
  assert.equal(state.history.length, 2)
  assert.equal(state.history.at(-1)!.parentId, undefined)
  assert.match(state.history.at(-1)!.text, /フック.*10案以上/)
  assert.equal(currentBatch(BATCHES, state), undefined)
  assert.equal(currentBatch(BATCHES, { ...state, stage: 'themes' }), latestThemes)
})

test('保存した選択を復元し、壊れた状態や別主題の構成案を安全に外す。旧形式の保存も読む', () => {
  assert.deepEqual(restoreState('{broken', BATCHES), initialState(BATCHES))
  assert.deepEqual(restoreState('{"version":0}', BATCHES), initialState(BATCHES))
  const harmonies = structureBatch()
  const library = [...BATCHES, harmonies]
  const state = chooseCandidate(lib(library), chooseCandidate(lib(library), initialState(BATCHES), theme.song.id), harmonies.candidates[0].song.id)
  const restored = restoreState(JSON.stringify(state), library)
  assert.equal(restored.stage, 'orchestration')
  assert.equal(restored.structureId, state.structureId)
  const unrelated = restoreState(JSON.stringify({ ...state, themeId: otherTheme.song.id }), library)
  assert.equal(unrelated.stage, 'structure')
  assert.equal(unrelated.structureId, undefined)
  const removed = restoreState(JSON.stringify(state), BATCHES)
  assert.equal(removed.stage, 'structure')
  assert.equal(removed.themeId, theme.song.id)
  // 構成の段階に置き換える前の保存: stage 'harmony' と harmonyId
  const old = harmonyBatch()
  const oldId = old.candidates[1].song.id
  const saved = { version: 1, stage: 'harmony', themeId: theme.song.id, harmonyId: oldId, notes: {}, history: [{ stage: 'harmony', parentId: theme.song.id, feedback: '', text: 'x' }] }
  const migrated = restoreState(JSON.stringify(saved), [...BATCHES, old])
  assert.equal(migrated.stage, 'structure')
  assert.equal(migrated.structureId, oldId)
  assert.equal(migrated.history[0].stage, 'structure')
  assert.equal(restoreState(JSON.stringify({ ...saved, stage: 'orchestration' }), [...BATCHES, old]).stage, 'orchestration')
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
  // 旧形式の和声案からも編曲を依頼できる
  assert.match(makeRequest(lib([...BATCHES, harmonyBatch()]), 'orchestration', 'harmony-001-0').text, /主題＋和声を基に/)
  const solo = structuredClone(BATCHES)
  solo[0].candidates[0].song.parts = solo[0].candidates[0].song.parts.filter((p) => p.id === 'melody')
  solo[0].candidates[0].song.sections[0].parts = { melody: solo[0].candidates[0].song.sections[0].parts.melody }
  assert.throws(() => validateBatches(solo), /accompaniment required/)
})

test('構成案は3案以上・フル尺・全小節を覆う句・主題の繰り返しでないことを求める', () => {
  const ok = structureBatch()
  validateBatches([...BATCHES, ok])
  const few = structureBatch()
  few.candidates.pop()
  assert.throws(() => validateBatches([...BATCHES, few]), /at least 3/)
  const short = structureBatch()
  short.candidates[0].song.loop = short.candidates[0].song.loop.slice(0, -1)
  assert.throws(() => validateBatches([...BATCHES, short]), /full length/)
  const gap = structureBatch()
  gap.candidates[0].phrases[1].from++
  assert.throws(() => validateBatches([...BATCHES, gap]), /cover the whole form/)
  const tail = structureBatch()
  tail.candidates[0].phrases.pop()
  assert.throws(() => validateBatches([...BATCHES, tail]), /cover the whole form/)
  // 主題を何周もするだけの「構成」
  const repeated = structureBatch()
  const song = repeated.candidates[0].song
  const themeBars = compileSong(theme.song).bars.length
  const times = Math.ceil(24 / themeBars) + 1
  song.loop = Array(times).fill(theme.song.loop).flat()
  repeated.candidates[0].phrases = Array.from({ length: times }, (_, i) => ({ label: `A${i}`, from: i * themeBars + 1, to: (i + 1) * themeBars, intention: '主題' }))
  assert.throws(() => validateBatches([...BATCHES, repeated]), /only repeats the theme/)
  assert.equal(themeReuse(theme, theme), 1)
  assert.ok(themeReuse(theme, ok.candidates[0]) < 0.7)
  // 構成案の親は主題。構成案や旧形式の和声案を親にできない
  assert.throws(() => validateBatches([...BATCHES, ok, { ...structureBatch('nested'), parentId: ok.candidates[0].song.id }]), /wrong parent stage/)
})

test('未選択で後の段階へ進めず、候補IDの取り違えを拒否する', () => {
  assert.throws(() => makeRequest(project, 'structure'), /先に元/)
  assert.throws(() => makeRequest(project, 'orchestration', theme.song.id), /先に元/)
  assert.throws(() => makeRequest(project, 'themes', theme.song.id), /先に元/)
  assert.throws(() => makeRequest(project, 'themes'), /先に元/)
  assert.throws(() => makeRequest(project, 'hooks', theme.song.id), /派生元/)
  assert.throws(() => chooseCandidate(project, initialState(BATCHES), 'missing'), /表示中/)
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
  const text = makeRequest(project, 'structure', theme.song.id, undefined, '後半を明るく').text
  assert.match(text, /stage: structure、parentId: /)
  assert.match(text, /src\/composition\/projects\/strategy-screen\/project\.ts/)
  assert.match(text, /feedback\.ts/)
  assert.match(text, /後半を明るく/)
})

test('履歴から任意の組を、派生関係を復元して開く', () => {
  const orchestration = BATCHES.find((b) => b.stage === 'orchestration')!
  const harmony = BATCHES.find((b) => b.candidates.some((c) => c.song.id === orchestration.parentId))!
  const state = openBatch(project, { ...initialState(BATCHES), notes: { a: 'メモ' } }, orchestration.id)
  assert.equal(state.stage, 'orchestration')
  assert.equal(state.structureId, orchestration.parentId)
  assert.equal(state.themeId, harmony.parentId)
  assert.equal(currentBatch(BATCHES, state), orchestration)
  assert.equal(state.notes.a, 'メモ')
  const themes = openBatch(project, state, BATCHES[0].id)
  assert.equal(themes.stage, 'themes')
  assert.equal(themes.themeId, undefined)
  assert.equal(currentBatch(BATCHES, themes), BATCHES[0])
  assert.deepEqual(restoreState(JSON.stringify(state), BATCHES).structureId, state.structureId)
  assert.throws(() => openBatch(project, state, 'missing'), /unknown batch/)
})

test('新しいプロジェクトの依頼文は入力したブリーフだけを含み、最初のフック10案を求める', () => {
  const draft = { ...emptyBrief(), title: '作戦会議', purpose: '会議画面', references: [{ songId: SONGS[0].id, notes: '冒頭' }, { songId: 'missing', notes: 'x' }] }
  const text = makeProjectRequest(draft, SONGS, PROJECTS)
  assert.match(text, /「作戦会議」/)
  assert.match(text, /用途・場面:\n会議画面/)
  assert.doesNotMatch(text, /欲しいイメージ:/)
  assert.doesNotMatch(text, /避けたいこと:/)
  assert.match(text, new RegExp(`「${SONGS[0].title}」 \\(${SONGS[0].id}\\) — 冒頭`))
  assert.doesNotMatch(text, /missing/)
  assert.match(text, /フック.*10案以上/)
  assert.match(text, /stage: hooks/)
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

// ---- フック → 主題の展開 ----
const hookPassage = (i: number): Passage => ({
  chords: ['Abmaj7', 'Bb6/Ab'],
  melody: [`v90 ${['C5', 'D5', 'Eb5', 'F5', 'G5', 'Ab5', 'Bb5', 'C6', 'D6', 'Eb6'][i]}:3 Eb5:.5 F5:.5`, 'G5:4'],
  harmony: ['Ab3+C4+G4:4', 'Ab3+D4+G4:4'],
  bass: ['Ab1:4', 'Ab1:4'],
})
const tail: Passage = { chords: Array(8).fill('Eb'), melody: Array(8).fill('v80 Eb5:4'), harmony: Array(8).fill('G3+Bb3:4'), bass: Array(8).fill('Eb2:4') }
const hookBatch = (): CompositionBatch => ({
  id: 'hooks-001', title: 'フック集', stage: 'hooks',
  candidates: Array.from({ length: 10 }, (_, i) => buildSketch({
    id: `hook-${i}`, title: `フック ${i}`, description: 'd', tempo: 100, meter: [4, 4],
    passages: [{ label: 'フック', intention: '冒頭', passage: hookPassage(i) }],
  })),
})
const developmentBatch = (hook = 0, id = 'dev-001'): CompositionBatch => ({
  id, title: id, stage: 'themes', parentId: `hook-${hook}`,
  candidates: Array.from({ length: 4 }, (_, i) => buildSketch({
    id: `${id}-${i}`, title: `展開 ${id} ${i}`, description: 'd', tempo: 100, meter: [4, 4],
    passages: [
      { label: 'フック', intention: '冒頭', passage: hookPassage(hook) },
      { label: '平行移動', intention: '全音上', passage: transposePassage(hookPassage(hook), i + 1) },
      { label: '帰着', intention: '主調', passage: tail },
    ],
  })),
})

test('句の平行移動は旋律・和声・低音・コード名を同じ幅で移し、休符と長さを保つ', () => {
  assert.equal(transposeBar('v90 Bb4:.5 r:1 -:2 Ab3+C4+G4:.5', 2), 'v90 C5:.5 r:1 -:2 Bb3+D4+A4:.5')
  assert.equal(transposeBar('B4:4', -12), 'B3:4')
  assert.equal(transposeChord('Abmaj7 Bb6/Ab', 2), 'Bbmaj7 C6/Bb')
  assert.equal(transposeChord('C(add9)', -1), 'B(add9)')
  assert.equal(transposeChord('E7(b9)', 1), 'F7(b9)')
  const moved = transposePassage(hookPassage(0), 5, { bass: -1 })
  assert.deepEqual(moved.chords, ['Dbmaj7', 'Eb6/Db'])
  assert.equal(moved.bass[0], 'C#1:4') // 音名の綴りは pitchName に従う（鳴る音は同じ）
  assert.equal(moved.melody[1], 'C6:4')
  const study = developmentBatch().candidates[0]
  assert.deepEqual(study.phrases.map((p) => [p.from, p.to]), [[1, 2], [3, 4], [5, 12]])
  const notes = inspectMelody(study.song, 'melody').events
  // 3–4小節は1–2小節を半音上へ移した同じ形
  assert.equal(motifSignature(notes.slice(0, 4)), motifSignature(notes.slice(4, 8)))
  assert.equal(notes[4].key - notes[0].key, 1)
  assert.throws(() => buildSketch({ id: 'x', title: 'x', description: 'd', tempo: 100, meter: [4, 4], passages: [{ label: 'a', intention: 'b', passage: { ...tail, bass: [] } }] }), /same number of bars/)
})

test('フックに○×を付けて選ぶと、フックを冒頭に保つ展開案の依頼になり、展開案から構成へ進める', () => {
  const hooks = hookBatch()
  const p = lib([hooks])
  validateBatches(p.batches)
  let state = initialState(p.batches)
  assert.equal(state.stage, 'hooks')
  assert.equal(initialState().stage, 'hooks')
  assert.equal(currentBatch(p.batches, state), hooks)
  state.marks = { 'hook-0': 'good', 'hook-3': 'good', 'hook-1': 'bad' }
  state = chooseCandidate(p, state, 'hook-0')
  assert.equal(state.stage, 'themes')
  assert.equal(state.hookId, 'hook-0')
  assert.equal(currentBatch(p.batches, state), undefined)
  const request = state.history.at(-1)!
  assert.equal(request.parentId, 'hook-0')
  assert.match(request.text, /展開案を、名前付きで4案以上/)
  assert.match(request.text, /transposePassage/)
  assert.match(request.text, /○ 見込みあり: 「フック 0」「フック 3」/)
  assert.match(request.text, /× 見送り: 「フック 1」/)
  assert.match(request.text, /stage: themes、parentId: hook-0/)

  const dev = developmentBatch()
  const other = developmentBatch(3, 'dev-other')
  const full = lib([hooks, dev, other])
  validateBatches(full.batches)
  assert.equal(currentBatch(full.batches, state), dev)
  assert.ok(opensWith(hooks.candidates[0], dev.candidates[0]))
  const chosen = chooseCandidate(full, state, 'dev-001-2')
  assert.equal(chosen.stage, 'structure')
  assert.equal(chosen.hookId, 'hook-0')
  assert.equal(chosen.themeId, 'dev-001-2')
  assert.match(chosen.history.at(-1)!.text, /フル尺の構成案を3案以上/)
  // 展開の出し直しはフックを保ち、フックの出し直しは選択を外す
  const again = requestMore(full, chosen, 'themes')
  assert.equal(again.hookId, 'hook-0')
  assert.equal(again.themeId, undefined)
  assert.equal(again.history.at(-1)!.parentId, 'hook-0')
  assert.equal(requestMore(full, chosen, 'hooks').hookId, undefined)
  // 保存と、履歴からの復元
  const restored = restoreState(JSON.stringify({ ...chosen, marks: { 'hook-0': 'good', x: 'maybe' } }), full.batches)
  assert.equal(restored.hookId, 'hook-0')
  assert.equal(restored.themeId, 'dev-001-2')
  assert.deepEqual(restored.marks, { 'hook-0': 'good' })
  assert.equal(restoreState(JSON.stringify({ ...chosen, themeId: undefined, stage: 'themes', hookId: 'missing' }), full.batches).stage, 'hooks')
  const opened = openBatch(full, initialState(full.batches), 'dev-other')
  assert.equal(opened.stage, 'themes')
  assert.equal(opened.hookId, 'hook-3')
  assert.equal(currentBatch(full.batches, opened), other)
})

test('フックは10案以上・4小節以内、展開案は4案以上・12小節以上でフックをそのまま冒頭に置く', () => {
  const hooks = hookBatch()
  const few = hookBatch()
  few.candidates.pop()
  assert.throws(() => validateBatches([few]), /at least 10/)
  const long = hookBatch()
  long.candidates[0] = buildSketch({ id: 'hook-0', title: 'フック 0', description: 'd', tempo: 100, meter: [4, 4], passages: [{ label: 'a', intention: 'b', passage: tail }] })
  assert.throws(() => validateBatches([long]), /4 bars or shorter/)
  assert.throws(() => validateBatches([{ ...hookBatch(), parentId: 'hook-0' }]), /invalid parent/)
  const fewDev = developmentBatch()
  fewDev.candidates.pop()
  assert.throws(() => validateBatches([hooks, fewDev]), /at least 4/)
  const changed = developmentBatch()
  changed.candidates[1].song.sections[0].parts.melody[0] = 'v90 C5:2 D5:1 Eb5:.5 F5:.5'
  assert.throws(() => validateBatches([hooks, changed]), /open with the hook unchanged/)
  const faster = developmentBatch()
  faster.candidates[0].song.tempo = 120
  assert.throws(() => validateBatches([hooks, faster]), /open with the hook unchanged/)
  const short = developmentBatch()
  short.candidates[0] = buildSketch({ id: 'dev-001-0', title: '展開 dev-001 0', description: 'd', tempo: 100, meter: [4, 4], passages: [{ label: 'フック', intention: '冒頭', passage: hookPassage(0) }, { label: '移動', intention: 'x', passage: transposePassage(hookPassage(0), 2) }] })
  assert.throws(() => validateBatches([hooks, short]), /12\+ bars/)
  // 展開案の親はフック。主題や構成案を親にできない
  assert.throws(() => validateBatches([...BATCHES, { ...developmentBatch(), parentId: theme.song.id }]), /wrong parent stage/)
  // 構成案は展開案を親にできる
  assert.throws(() => makeRequest(lib([hooks]), 'structure', 'hook-0'), /先に元/)
  assert.match(makeRequest(lib([hooks, developmentBatch()]), 'structure', 'dev-001-0').text, /フル尺の構成案/)
})
