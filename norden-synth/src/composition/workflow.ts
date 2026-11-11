import { compileSong, DRUM_KEYS } from '../songs/song.ts'
import { inspectMelody, themeReuse, type CompositionStudy } from './study.ts'

export type Stage = 'themes' | 'structure' | 'orchestration'
export const STAGES: { id: Stage; label: string }[] = [
  { id: 'themes', label: '1. 主題を選ぶ' },
  { id: 'structure', label: '2. フル尺の構成を決める' },
  { id: 'orchestration', label: '3. オーケストレーション' },
]

// 'harmony' は構成の段階に置き換える前の和声案（主旋律を固定した16小節程度の別案）。
// 新しくは作らない。履歴として残し、画面では構成の段階に並べる。
export type BatchStage = Stage | 'harmony'
export const stageOf = (batch: { stage: BatchStage }): Stage => batch.stage === 'harmony' ? 'structure' : batch.stage
export const stageLabel = (stage: BatchStage) =>
  stage === 'harmony' ? '和声案（旧）' : STAGES.find((s) => s.id === stage)!.label.replace(/^\d\. /, '')

// 構成案の下限。主題をそのまま再掲する小節がこの割合を超える案は、主題の繰り返しとして受け付けない。
export const MIN_STRUCTURE_BARS = 24
export const MAX_THEME_REUSE = 0.7
const minCandidates = (stage: BatchStage) => stage === 'orchestration' ? 1 : stage === 'structure' ? 3 : 5

export interface CompositionBatch {
  id: string
  title: string
  stage: BatchStage
  // 派生元の候補 id。主題集には不要、構成案（主題）・編曲（構成案）には必須。
  parentId?: string
  candidates: CompositionStudy[]
}

// 曲の用途とイメージ。ユーザーの入力をそのまま記録し、AIの解釈を混ぜない。
export interface ProjectBrief {
  purpose: string
  image: string
  avoid: string
  references: { songId: string; notes: string }[]
}

// 各組への試聴の感想。userWords などはユーザーの発言で、AI の推測を入れない。
export interface FeedbackEntry {
  batchId?: string
  candidates: string[]
  mode?: 'theme-with-harmony' | 'harmony-variation' | 'structure' | 'orchestration'
  preferred: string
  keep?: string
  change?: string
  userWords: string
}

// 1曲ぶんの作曲。主題・構成・編曲の組と感想をまとめて持つ。
export interface CompositionProject {
  id: string
  title: string
  brief: ProjectBrief
  // 完成して src/songs の SONGS に登録した曲
  adoptedSongId?: string
  batches: CompositionBatch[]
  feedback: FeedbackEntry[]
}

export interface CompositionRequest {
  stage: Stage
  parentId?: string
  batchId?: string
  feedback: string
  text: string
}

export interface WorkshopState {
  version: 1
  stage: Stage
  themeId?: string
  // 選んだ構成案（旧形式では和声案）
  structureId?: string
  // 過去の組を明示的に見たいときだけ設定。通常は最新の組を表示する。
  batchId?: string
  notes: Record<string, string>
  history: CompositionRequest[]
}

export const initialState = (): WorkshopState => ({ version: 1, stage: 'themes', notes: {}, history: [] })
export const findCandidate = (batches: CompositionBatch[], id?: string) =>
  batches.flatMap((b) => b.candidates).find((c) => c.song.id === id)

export function parentFor(state: WorkshopState): string | undefined {
  return state.stage === 'structure' ? state.themeId : state.stage === 'orchestration' ? state.structureId : undefined
}

export function batchesFor(batches: CompositionBatch[], state: WorkshopState): CompositionBatch[] {
  return batches.filter((b) => stageOf(b) === state.stage && b.parentId === parentFor(state))
}

export function currentBatch(batches: CompositionBatch[], state: WorkshopState): CompositionBatch | undefined {
  const choices = batchesFor(batches, state)
  return choices.find((b) => b.id === state.batchId) ?? choices.at(-1)
}

export function validateBatches(batches: CompositionBatch[]): void {
  const batchIds = new Set<string>()
  const candidates = new Map<string, CompositionStudy>()
  const stages = new Map<string, Stage>()
  for (const batch of batches) {
    if (batchIds.has(batch.id)) throw new Error(`duplicate batch: ${batch.id}`)
    batchIds.add(batch.id)
    if (!batch.id.trim() || !batch.title.trim() || !STAGES.some((s) => s.id === stageOf(batch))) throw new Error('invalid batch')
    if (batch.candidates.length < minCandidates(batch.stage)) throw new Error(`${batch.id}: at least ${minCandidates(batch.stage)} candidates required`)
    const titles = new Set<string>()
    const parent = batch.parentId ? candidates.get(batch.parentId) : undefined
    if (batch.stage === 'themes' ? !!batch.parentId : !parent) throw new Error(`${batch.id}: invalid parent`)
    if (parent && stages.get(parent.song.id) !== (stageOf(batch) === 'structure' ? 'themes' : 'structure'))
      throw new Error(`${batch.id}: wrong parent stage`)
    for (const study of batch.candidates) {
      if (candidates.has(study.song.id)) throw new Error(`duplicate candidate: ${study.song.id}`)
      if (!study.song.title.trim() || titles.has(study.song.title)) throw new Error(`${batch.id}: candidates need distinct names`)
      titles.add(study.song.title)
      const score = compileSong(study.song)
      if (!score.bars.some((bar) => [...bar.notes].some(([id, notes]) =>
        id !== study.melodyPart && notes.length && !DRUM_KEYS[study.song.parts.find((p) => p.id === id)!.instrument])))
        throw new Error(`${study.song.id}: accompaniment required`)
      if (batch.stage === 'harmony' && parent) {
        // 旧形式: 音符・発音位置・音価を保った和声違い。
        const a = inspectMelody(parent.song, parent.melodyPart)
        const b = inspectMelody(study.song, study.melodyPart)
        if (JSON.stringify(a.events) !== JSON.stringify(b.events) || parent.song.tempo !== study.song.tempo ||
          JSON.stringify(compileSong(parent.song).bars.map((bar) => bar.timeSignature)) !== JSON.stringify(score.bars.map((bar) => bar.timeSignature)))
          throw new Error(`${study.song.id}: harmony variation changed the theme`)
      }
      if (batch.stage === 'structure' && parent) {
        // フル尺で、句（形式の区分）が全小節を切れ目なく覆い、主題の単純な繰り返しでないこと。
        if (score.bars.length < Math.max(MIN_STRUCTURE_BARS, compileSong(parent.song).bars.length + 1))
          throw new Error(`${study.song.id}: structure must be full length (${MIN_STRUCTURE_BARS}+ bars, longer than the theme)`)
        if (study.phrases.reduce((next, p) => p.from === next ? p.to + 1 : NaN, 1) !== score.bars.length + 1)
          throw new Error(`${study.song.id}: phrases must cover the whole form in order`)
        if (themeReuse(parent, study) > MAX_THEME_REUSE)
          throw new Error(`${study.song.id}: structure only repeats the theme`)
      }
      candidates.set(study.song.id, study)
      stages.set(study.song.id, stageOf(batch))
    }
  }
}

export const PROJECT_DIR = 'src/composition/projects'

export function makeRequest(project: CompositionProject, stage: Stage, parentId?: string, batchId?: string, feedback = ''): CompositionRequest {
  const batches = project.batches
  if (stage === 'themes' && parentId) throw new Error('新しい主題集には派生元を指定しません。')
  const parent = findCandidate(batches, parentId)
  const sourceBatch = batches.find((b) => b.candidates.some((c) => c.song.id === parentId))
  if (stage !== 'themes' && (!parent || !sourceBatch || stageOf(sourceBatch) !== (stage === 'structure' ? 'themes' : 'structure')))
    throw new Error('先に元になる候補を選んでください。')
  const prior = batches.find((b) => b.id === batchId)
  const task = stage === 'themes'
    ? '名前の付いた新しい主題を5案以上、一気に作ってください。すべて最初から和声・低音・伴奏付きで、主題と和声を一緒に評価できるプレビューにしてください。輪郭・リズム・拍子・和声の発想が異なる案をください。'
    : stage === 'structure'
      ? `この主題から、名前の付いたフル尺の構成案を3案以上作ってください。1ループぶんの曲全体（${MIN_STRUCTURE_BARS}小節以上）を、主題の段階と同じ簡潔な編成で最後まで書き、そのまま通して試聴できる形にしてください。主題を2周するだけの曲にせず、主題と対比する新しい旋律の部分（B など）、展開、主題への戻り方を作ってください。案ごとに、形式（部分の並びと長さ）、対比部の旋律・調・和声・リズム、山場の位置を聴いてわかるほど変えてください。和声は主題案を出発点に、構成に合わせて変えて構いません。細かな和声の差だけで案の数を埋めないでください。`
      : sourceBatch?.stage === 'harmony'
        ? '選んだ主題＋和声を基にオーケストレーションしてください。採用した旋律と和声の魅力を保って展開し、編曲版をプレビューできる形にしてください。'
        : '選んだ構成案をオーケストレーションしてください。部分の並び・長さ・旋律・和声は構成案のまま保ち、楽器の割り当て、音の厚み、強弱で各部分の違いと山場を描いてください。編曲版をプレビューできる形にしてください。'
  const dir = `${PROJECT_DIR}/${project.id}`
  const text = [
    'norden-synth/COMPOSING.md と composition/preferences.json に従って作曲してください。',
    `プロジェクト: 「${project.title}」 (id: ${project.id})。${dir}/project.ts のブリーフと ${dir}/feedback.ts の感想を読む。`,
    task,
    parent ? `派生元: 「${parent.song.title}」 (parentId: ${parent.song.id})` : '',
    prior ? `今回の組: ${prior.title} (${prior.id})。既存案は履歴として残し、別の組を追加してください。` : '',
    feedback.trim() ? `要望・試聴メモ:\n${feedback.trim()}` : '',
    feedback.trim() ? `上の要望・試聴メモは、対象の組 (batchId) を付けて ${dir}/feedback.ts にユーザーの発言として記録する。AIの推測を混ぜない。` : '',
    `登録先: ${dir}/project.ts の batches の末尾。stage: ${stage}${parent ? `、parentId: ${parent.song.id}` : ''}。新しい batch id と候補 id を使う（全プロジェクトで一意）。`,
    'ユーザーが選ぶ前に次の段階へ進めない。通常の曲一覧には混ぜない。テスト・型検査・ビルドで確認し、ブラウザ確認は不要。',
  ].filter(Boolean).join('\n\n')
  return { stage, parentId, batchId, feedback, text }
}

export function noteScope(batches: CompositionBatch[], state: WorkshopState): string {
  return currentBatch(batches, state)?.id ?? `${state.stage}:${parentFor(state) ?? 'new'}`
}

function requestFor(project: CompositionProject, state: WorkshopState, stage: Stage, parentId?: string) {
  const batch = currentBatch(project.batches, state)
  const feedback = [
    state.notes[noteScope(project.batches, state)] ?? '',
    ...(batch?.candidates ?? []).filter((s) => state.notes[s.song.id]?.trim())
      .map((s) => `「${s.song.title}」へのメモ: ${state.notes[s.song.id]}`),
  ].filter(Boolean).join('\n')
  return makeRequest(project, stage, parentId, batch?.id, feedback)
}

export function chooseCandidate(project: CompositionProject, state: WorkshopState, id: string): WorkshopState {
  const batches = project.batches
  if (state.stage === 'orchestration' || !currentBatch(batches, state)?.candidates.some((c) => c.song.id === id))
    throw new Error('表示中の組から候補を選んでください。')
  const stage = state.stage === 'themes' ? 'structure' : 'orchestration'
  const exists = batches.some((b) => stageOf(b) === stage && b.parentId === id)
  return {
    ...state, stage, batchId: undefined,
    themeId: state.stage === 'themes' ? id : state.themeId,
    structureId: state.stage === 'themes' ? undefined : id,
    history: exists ? state.history : [...state.history, requestFor(project, state, stage, id)],
  }
}

export function requestMore(project: CompositionProject, state: WorkshopState, stage: Stage): WorkshopState {
  const parentId = stage === 'structure' ? state.themeId : stage === 'orchestration' ? state.structureId : undefined
  const next = requestFor(project, state, stage, parentId)
  return {
    ...state, stage, batchId: undefined,
    themeId: stage === 'themes' ? undefined : state.themeId,
    structureId: stage === 'themes' ? undefined : state.structureId,
    history: [...state.history, next],
  }
}

// localStorage は破損・旧形式・削除された候補に耐える。保存内容は指示として自動実行しない。
export function restoreState(raw: string | null, batches: CompositionBatch[]): WorkshopState {
  const state = initialState()
  if (!raw) return state
  try {
    const value = JSON.parse(raw)
    if (value?.version !== 1) return state
    // 構成の段階に置き換える前の保存は stage: 'harmony' と harmonyId を持つ。
    const stage = (s: unknown) => s === 'harmony' ? 'structure' : s
    const isStage = (s: unknown): s is Stage => STAGES.some((stage) => stage.id === s)
    const belongs = (id: unknown, stage: Stage) => typeof id === 'string' && batches.some((b) => stageOf(b) === stage && b.candidates.some((c) => c.song.id === id))
    const structureId = value.structureId ?? value.harmonyId
    if (belongs(value.themeId, 'themes')) state.themeId = value.themeId
    if (belongs(structureId, 'structure') && batches.some((b) => b.parentId === state.themeId && b.candidates.some((c) => c.song.id === structureId))) state.structureId = structureId
    if (isStage(stage(value.stage))) state.stage = stage(value.stage) as Stage
    if (state.stage === 'structure' && !state.themeId) state.stage = 'themes'
    if (state.stage === 'orchestration' && !state.structureId) state.stage = state.themeId ? 'structure' : 'themes'
    if (batchesFor(batches, state).some((b) => b.id === value.batchId)) state.batchId = value.batchId
    if (value.notes && typeof value.notes === 'object' && !Array.isArray(value.notes))
      state.notes = Object.fromEntries(Object.entries(value.notes).filter((entry) => typeof entry[1] === 'string')) as Record<string, string>
    if (Array.isArray(value.history)) state.history = value.history.filter((r: Partial<CompositionRequest> | null) =>
      r && isStage(stage(r.stage)) && typeof r.text === 'string' && typeof r.feedback === 'string' &&
      (r.parentId === undefined || typeof r.parentId === 'string') && (r.batchId === undefined || typeof r.batchId === 'string'))
      .map((r: CompositionRequest) => ({ ...r, stage: stage(r.stage) as Stage }))
    return state
  } catch { return initialState() }
}

// 全プロジェクトを検査する。候補 id は CLI の inspect/review で引くため全体で一意。
export function validateProjects(projects: CompositionProject[], songIds: string[] = []): void {
  const projectIds = new Set<string>()
  const batchIds = new Set<string>()
  const candidateIds = new Set<string>()
  for (const project of projects) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(project.id)) throw new Error(`invalid project id: ${project.id}`)
    if (projectIds.has(project.id)) throw new Error(`duplicate project: ${project.id}`)
    projectIds.add(project.id)
    if (!project.title.trim()) throw new Error(`${project.id}: title required`)
    validateBatches(project.batches)
    for (const batch of project.batches) {
      if (batchIds.has(batch.id)) throw new Error(`duplicate batch: ${batch.id}`)
      batchIds.add(batch.id)
      for (const c of batch.candidates) {
        if (candidateIds.has(c.song.id)) throw new Error(`duplicate candidate: ${c.song.id}`)
        candidateIds.add(c.song.id)
      }
    }
    for (const entry of project.feedback)
      if (entry.batchId && !project.batches.some((b) => b.id === entry.batchId)) throw new Error(`${project.id}: feedback for unknown batch ${entry.batchId}`)
    if (songIds.length) {
      for (const ref of project.brief.references)
        if (!songIds.includes(ref.songId)) throw new Error(`${project.id}: unknown reference song ${ref.songId}`)
      if (project.adoptedSongId && !songIds.includes(project.adoptedSongId)) throw new Error(`${project.id}: unknown adopted song`)
    }
  }
}

// 履歴の任意の組を、その派生関係の選択状態で開く。メモと依頼履歴は保つ。
export function openBatch(project: CompositionProject, state: WorkshopState, batchId: string): WorkshopState {
  const batch = project.batches.find((b) => b.id === batchId)
  if (!batch) throw new Error(`unknown batch: ${batchId}`)
  const sourceOf = (id?: string) => project.batches.find((b) => b.candidates.some((c) => c.song.id === id))
  const stage = stageOf(batch)
  const themeId = stage === 'structure' ? batch.parentId : stage === 'orchestration' ? sourceOf(batch.parentId)?.parentId : undefined
  const structureId = stage === 'orchestration' ? batch.parentId : undefined
  return { ...state, stage, themeId, structureId, batchId }
}

export interface BriefDraft extends ProjectBrief {
  title: string
}

export const emptyBrief = (): BriefDraft => ({ title: '', purpose: '', image: '', avoid: '', references: [] })

// 新しいプロジェクトの最初の主題集を依頼する文面。作曲と登録はこの文面を受け取ったAIが行う。
export function makeProjectRequest(draft: BriefDraft, songs: { id: string; title: string }[], existing: CompositionProject[] = []): string {
  if (!draft.title.trim()) throw new Error('プロジェクト名を入力してください。')
  if (!draft.purpose.trim() && !draft.image.trim()) throw new Error('用途・場面か、欲しいイメージを入力してください。')
  const refs = draft.references.filter((r) => songs.some((s) => s.id === r.songId))
  const block = (label: string, value: string) => value.trim() ? `${label}:\n${value.trim()}` : ''
  const brief = {
    purpose: draft.purpose.trim(), image: draft.image.trim(), avoid: draft.avoid.trim(),
    references: refs.map((r) => ({ songId: r.songId, notes: r.notes.trim() })),
  }
  return [
    'norden-synth/COMPOSING.md と composition/preferences.json に従って、新しい作曲プロジェクトを始めてください。',
    `プロジェクト名: 「${draft.title.trim()}」`,
    block('用途・場面', draft.purpose),
    block('欲しいイメージ', draft.image),
    block('避けたいこと', draft.avoid),
    refs.length ? `参考曲:\n${refs.map((r) => `- 「${songs.find((s) => s.id === r.songId)!.title}」 (${r.songId})${r.notes.trim() ? ` — ${r.notes.trim()}` : ''}`).join('\n')}` : '',
    [
      '作業:',
      `1. ${PROJECT_DIR}/<id>/project.ts を作り、src/composition/projects.ts の PROJECTS の末尾に登録する。id は英小文字・数字・ハイフンで、既存 (${existing.map((p) => p.id).join(', ') || 'なし'}) と重ならないもの。title はプロジェクト名、brief は次の値をそのまま使う（AIの解釈を足さない）。feedback.ts は空配列で作る。`,
      '```json', JSON.stringify(brief, null, 2), '```',
      '2. 名前付きの主題を5案以上、一気に作る。すべて最初から和声・低音・伴奏付きで、主題と和声を一緒に評価できるプレビューにする。輪郭・リズム・和声の発想が異なる案にする。最初の組 (stage: themes、parentId なし) として batches に追加する。',
      refs.length ? '3. 参考曲は npm run compose -- inspect で構造を確かめてよいが、旋律・和声を写さない。' : '',
    ].filter(Boolean).join('\n'),
    'ユーザーが選ぶ前に次の段階へ進めない。通常の曲一覧には混ぜない。テスト・型検査・ビルドで確認し、ブラウザ確認は不要。',
  ].filter(Boolean).join('\n\n')
}
