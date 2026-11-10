import { compileSong, DRUM_KEYS } from '../songs/song.ts'
import { inspectMelody, type CompositionStudy } from './study.ts'

export type Stage = 'themes' | 'harmony' | 'orchestration'
export const STAGES: { id: Stage; label: string }[] = [
  { id: 'themes', label: '1. 主題＋和声を選ぶ' },
  { id: 'harmony', label: '2. 和声の別案を聴く' },
  { id: 'orchestration', label: '3. オーケストレーション' },
]

export interface CompositionBatch {
  id: string
  title: string
  stage: Stage
  // 派生元の候補 id。主題集には不要、和声案・編曲には必須。
  parentId?: string
  candidates: CompositionStudy[]
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
  harmonyId?: string
  // 過去の組を明示的に見たいときだけ設定。通常は最新の組を表示する。
  batchId?: string
  notes: Record<string, string>
  history: CompositionRequest[]
}

export const initialState = (): WorkshopState => ({ version: 1, stage: 'themes', notes: {}, history: [] })
export const findCandidate = (batches: CompositionBatch[], id?: string) =>
  batches.flatMap((b) => b.candidates).find((c) => c.song.id === id)

export function parentFor(state: WorkshopState): string | undefined {
  return state.stage === 'harmony' ? state.themeId : state.stage === 'orchestration' ? state.harmonyId : undefined
}

export function batchesFor(batches: CompositionBatch[], state: WorkshopState): CompositionBatch[] {
  return batches.filter((b) => b.stage === state.stage && b.parentId === parentFor(state))
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
    if (!batch.id.trim() || !batch.title.trim() || !STAGES.some((s) => s.id === batch.stage)) throw new Error('invalid batch')
    if (batch.candidates.length < (batch.stage === 'orchestration' ? 1 : 5)) throw new Error(`${batch.id}: at least 5 candidates required`)
    const titles = new Set<string>()
    const parent = batch.parentId ? candidates.get(batch.parentId) : undefined
    if (batch.stage === 'themes' ? !!batch.parentId : !parent) throw new Error(`${batch.id}: invalid parent`)
    if (parent && stages.get(parent.song.id) !== (batch.stage === 'harmony' ? 'themes' : 'harmony'))
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
        // 音符・発音位置・音価を保った和声違い。編曲は構成を広げられる。
        const a = inspectMelody(parent.song, parent.melodyPart)
        const b = inspectMelody(study.song, study.melodyPart)
        if (JSON.stringify(a.events) !== JSON.stringify(b.events) || parent.song.tempo !== study.song.tempo ||
          JSON.stringify(compileSong(parent.song).bars.map((bar) => bar.timeSignature)) !== JSON.stringify(score.bars.map((bar) => bar.timeSignature)))
          throw new Error(`${study.song.id}: harmony variation changed the theme`)
      }
      candidates.set(study.song.id, study)
      stages.set(study.song.id, batch.stage)
    }
  }
}

export function makeRequest(batches: CompositionBatch[], stage: Stage, parentId?: string, batchId?: string, feedback = ''): CompositionRequest {
  if (stage === 'themes' && parentId) throw new Error('新しい主題集には派生元を指定しません。')
  const parent = findCandidate(batches, parentId)
  const sourceBatch = batches.find((b) => b.candidates.some((c) => c.song.id === parentId))
  if (stage !== 'themes' && (!parent || sourceBatch?.stage !== (stage === 'harmony' ? 'themes' : 'harmony')))
    throw new Error('先に元になる候補を選んでください。')
  const prior = batches.find((b) => b.id === batchId)
  const task = stage === 'themes'
    ? '名前の付いた新しい主題を5案以上、一気に作ってください。すべて最初から和声・低音・伴奏付きで、主題と和声を一緒に評価できるプレビューにしてください。輪郭・リズム・拍子・和声の発想が異なる案をください。'
    : stage === 'harmony'
      ? 'この主題から、名前の付いた和声のバリエーションを5案作ってください。主旋律の音符・リズム・テンポ・拍子を保ち、低音・内声・コード進行・緊張と解放の方向を変えてください。どの案も主題＋和声を一緒にプレビューできる形にしてください。'
      : '選んだ主題＋和声を基にオーケストレーションしてください。採用した旋律と和声の魅力を保って展開し、編曲版をプレビューできる形にしてください。'
  const text = [
    'norden-synth/COMPOSING.md と composition/preferences.json に従って作曲してください。', task,
    parent ? `派生元: 「${parent.song.title}」 (parentId: ${parent.song.id})` : '',
    prior ? `今回の組: ${prior.title} (${prior.id})。既存案は履歴として残し、別の組を追加してください。` : '',
    feedback.trim() ? `要望・試聴メモ:\n${feedback.trim()}` : '',
    `登録先: src/composition/studies.ts の BATCHES。stage: ${stage}${parent ? `、parentId: ${parent.song.id}` : ''}。新しい batch id と候補 id を使う。`,
    'ユーザーが選ぶ前に次の段階へ進めない。通常の曲一覧には混ぜない。テスト・型検査・ビルドで確認し、ブラウザ確認は不要。',
  ].filter(Boolean).join('\n\n')
  return { stage, parentId, batchId, feedback, text }
}

export function noteScope(batches: CompositionBatch[], state: WorkshopState): string {
  return currentBatch(batches, state)?.id ?? `${state.stage}:${parentFor(state) ?? 'new'}`
}

function requestFor(batches: CompositionBatch[], state: WorkshopState, stage: Stage, parentId?: string) {
  const batch = currentBatch(batches, state)
  const feedback = [
    state.notes[noteScope(batches, state)] ?? '',
    ...(batch?.candidates ?? []).filter((s) => state.notes[s.song.id]?.trim())
      .map((s) => `「${s.song.title}」へのメモ: ${state.notes[s.song.id]}`),
  ].filter(Boolean).join('\n')
  return makeRequest(batches, stage, parentId, batch?.id, feedback)
}

export function chooseCandidate(batches: CompositionBatch[], state: WorkshopState, id: string): WorkshopState {
  if (state.stage === 'orchestration' || !currentBatch(batches, state)?.candidates.some((c) => c.song.id === id))
    throw new Error('表示中の組から候補を選んでください。')
  const stage = state.stage === 'themes' ? 'harmony' : 'orchestration'
  const exists = batches.some((b) => b.stage === stage && b.parentId === id)
  return {
    ...state, stage, batchId: undefined,
    themeId: state.stage === 'themes' ? id : state.themeId,
    harmonyId: state.stage === 'themes' ? undefined : id,
    history: exists ? state.history : [...state.history, requestFor(batches, state, stage, id)],
  }
}

export function requestMore(batches: CompositionBatch[], state: WorkshopState, stage: Stage): WorkshopState {
  const parentId = stage === 'harmony' ? state.themeId : stage === 'orchestration' ? state.harmonyId : undefined
  const next = requestFor(batches, state, stage, parentId)
  return {
    ...state, stage, batchId: undefined,
    themeId: stage === 'themes' ? undefined : state.themeId,
    harmonyId: stage === 'themes' ? undefined : state.harmonyId,
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
    const isStage = (s: unknown): s is Stage => STAGES.some((stage) => stage.id === s)
    const belongs = (id: unknown, stage: Stage) => typeof id === 'string' && batches.some((b) => b.stage === stage && b.candidates.some((c) => c.song.id === id))
    if (belongs(value.themeId, 'themes')) state.themeId = value.themeId
    if (belongs(value.harmonyId, 'harmony') && batches.some((b) => b.parentId === state.themeId && b.candidates.some((c) => c.song.id === value.harmonyId))) state.harmonyId = value.harmonyId
    if (isStage(value.stage)) state.stage = value.stage
    if (state.stage === 'harmony' && !state.themeId) state.stage = 'themes'
    if (state.stage === 'orchestration' && !state.harmonyId) state.stage = state.themeId ? 'harmony' : 'themes'
    if (batchesFor(batches, state).some((b) => b.id === value.batchId)) state.batchId = value.batchId
    if (value.notes && typeof value.notes === 'object' && !Array.isArray(value.notes))
      state.notes = Object.fromEntries(Object.entries(value.notes).filter((entry) => typeof entry[1] === 'string')) as Record<string, string>
    if (Array.isArray(value.history)) state.history = value.history.filter((r: Partial<CompositionRequest> | null) =>
      r && isStage(r.stage) && typeof r.text === 'string' && typeof r.feedback === 'string' &&
      (r.parentId === undefined || typeof r.parentId === 'string') && (r.batchId === undefined || typeof r.batchId === 'string'))
    return state
  } catch { return initialState() }
}
