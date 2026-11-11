import { PROJECTS } from './composition/projects.ts'
import { ComparisonTransport } from './composition/transport.ts'
import {
  STAGES, batchesFor, currentBatch, findCandidate, chooseCandidate, noteScope, openBatch, parentFor, requestMore, restoreState, stageLabel,
  type CompositionProject, type Stage,
} from './composition/workflow.ts'
import { copyText, escape, readStorage, writeStorage } from './composition/browser.ts'
import { mountBriefForm } from './composition-brief.ts'
import { compileSong, SONGS } from './songs/index.ts'
import { SongPlayer } from './songs/player.ts'
import type { Synth } from './synth/index.ts'

const CURRENT_KEY = 'norden-synth:workshop:project'
const NEW_PROJECT = 'new'
// プロジェクト化前の保存。最初のプロジェクトの状態として読む。
const LEGACY_KEY = 'norden-synth:workshop:v1'
const LEGACY_PROJECT = 'strategy-screen'
const stateKey = (projectId: string) => `norden-synth:workshop:v1:${projectId}`
export interface Mounted { stop(): void; dispose(): void }

export function setupCompositionPage(synth: Synth, root: HTMLElement): { stop: () => void } {
  root.innerHTML = `
    <div class="controls workshop-project">
      <label>プロジェクト <select data-project aria-label="作曲プロジェクト"></select></label>
    </div>
    <div data-project-body></div>
  `
  const select = root.querySelector<HTMLSelectElement>('[data-project]')!
  const body = root.querySelector<HTMLElement>('[data-project-body]')!
  let mounted: Mounted | undefined

  select.innerHTML = [...PROJECTS].reverse().map((p) =>
    `<option value="${escape(p.id)}">${escape(p.title)} · ${p.batches.length}組${p.adoptedSongId ? ' · 採用済み' : ''}</option>`).join('') +
    `<option value="${NEW_PROJECT}">＋ 新しいプロジェクト（最初の主題5案を依頼）</option>`

  function show(id: string) {
    mounted?.dispose()
    body.innerHTML = ''
    const project = PROJECTS.find((p) => p.id === id)
    select.value = project ? project.id : NEW_PROJECT
    writeStorage(CURRENT_KEY, select.value)
    mounted = project ? mountWorkshop(synth, body, project) : mountBriefForm(body, PROJECTS, SONGS)
  }

  select.addEventListener('change', () => show(select.value))
  const saved = readStorage(CURRENT_KEY)
  show(saved === NEW_PROJECT || PROJECTS.some((p) => p.id === saved) ? saved! : PROJECTS.at(-1)?.id ?? NEW_PROJECT)
  return { stop: () => mounted?.stop() }
}

function mountWorkshop(synth: Synth, root: HTMLElement, project: CompositionProject): Mounted {
  const BATCHES = project.batches
  const key = stateKey(project.id)
  let state = restoreState(readStorage(key) ?? (project.id === LEGACY_PROJECT ? readStorage(LEGACY_KEY) : null), BATCHES)
  const transport = new ComparisonTransport<SongPlayer>()
  let request = 0
  let activeId: string | undefined
  let shownPosition = ''
  let loop = false
  let frame = 0
  let storageMessage = '選択・メモ・依頼履歴はこのブラウザにプロジェクトごとに保存されます。'

  const brief = project.brief
  const songTitle = (id: string) => SONGS.find((s) => s.id === id)?.title ?? id
  const briefRows = [
    ['用途・場面', brief.purpose], ['欲しいイメージ', brief.image], ['避けたいこと', brief.avoid],
    ['参考曲', brief.references.map((r) => `「${songTitle(r.songId)}」${r.notes ? ` — ${r.notes}` : ''}`).join('\n')],
  ].filter(([, v]) => v.trim())

  root.innerHTML = `
    <section class="workshop-overview">
      <h3>${escape(project.title)}${project.adoptedSongId ? `<span class="workshop-adopted">採用曲「${escape(songTitle(project.adoptedSongId))}」を曲一覧に登録済み</span>` : ''}</h3>
      ${briefRows.length ? `<dl class="workshop-brief">${briefRows.map(([k, v]) => `<dt>${k}</dt><dd>${escape(v)}</dd>`).join('')}</dl>` : '<p class="hint">ブリーフは未記入です。</p>'}
      <details class="workshop-timeline"><summary>プロジェクトの履歴 · ${BATCHES.length}組・感想 ${project.feedback.length}件</summary><ol data-timeline></ol></details>
    </section>
    <p class="hint">名前付きの主題を和声ごと聴き、見込みのある主題からフル尺の構成案（主題・対比・展開・戻り）を聴き比べて、編曲へ進めます。</p>
    <nav class="workshop-steps" aria-label="作曲の段階"></nav>
    <p data-lineage class="workshop-lineage"></p>
    <div class="controls workshop-batch">
      <label>候補の組 <select data-batch aria-label="候補の組"></select></label>
      <button data-latest>最新の組を表示</button>
      <button data-stop class="stop">停止</button>
      <label><input data-loop type="checkbox" /> ループ</label>
    </div>
    <p data-batch-status class="hint"></p>
    <p data-message class="info" role="status"></p>
    <p data-position class="info">停止中</p>
    <div data-candidates class="workshop-candidates"></div>
    <section class="workshop-feedback">
      <label for="workshop-feedback">この組への要望・出し直す理由</label>
      <textarea id="workshop-feedback" rows="3" placeholder="例：今回は見送り。もっと長く歌う主題がほしい／対比の部分をもっと短く、戻りを劇的にしたい"></textarea>
      <div class="buttons" data-actions></div>
    </section>
    <section class="workshop-request">
      <h3>次の作曲依頼</h3>
      <p class="hint">候補を選ぶと、選択とメモを含む依頼文を作ります。コピーしてこのチャットのAIに送ってください。追加された候補は、同じ段階の最新の組に表示されます。</p>
      <textarea data-request rows="9" readonly aria-label="AIへの作曲依頼" placeholder="候補を選ぶか、出し直しの依頼を作成してください。"></textarea>
      <div class="controls">
        <button data-copy>依頼文をコピー</button>
        <span data-copy-status class="info" role="status"></span>
      </div>
      <details class="workshop-history"><summary>依頼履歴</summary><div data-history></div></details>
    </section>
    <p data-storage class="hint"></p>
  `
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!
  const message = $('[data-message]')
  const position = $('[data-position]')
  const feedback = $<HTMLTextAreaElement>('#workshop-feedback')
  const requestText = $<HTMLTextAreaElement>('[data-request]')
  const batchSelect = $<HTMLSelectElement>('[data-batch]')
  const scope = () => noteScope(BATCHES, state)

  function save() {
    if (!writeStorage(key, JSON.stringify(state)))
      storageMessage = 'このブラウザでは保存できません。必要なメモと依頼文をコピーして残してください。'
    $('[data-storage]').textContent = storageMessage
  }

  function highlight() {
    for (const card of root.querySelectorAll<HTMLElement>('[data-candidate]')) {
      const active = card.dataset.candidate === activeId
      card.classList.toggle('playing', active)
      card.querySelector('[data-play]')!.textContent = active ? '最初から聴き直す' : '再生'
    }
  }

  function stop() {
    request++
    transport.stop()
    activeId = undefined
    shownPosition = ''
    message.textContent = ''
    position.textContent = '停止中'
    highlight()
  }

  async function play(id: string) {
    stop()
    const candidate = findCandidate(BATCHES, id)
    if (!candidate) return
    const token = request
    activeId = id
    highlight()
    message.classList.remove('error')
    message.textContent = `「${candidate.song.title}」を読み込み中…`
    try {
      await synth.resume()
      if (token !== request) return
      // 常に和声・伴奏を含む曲全体。編曲の段階は実際のオーケストレーションで鳴らす。
      const player = await transport.play(candidate.song, (song) => SongPlayer.load(synth, song), () => loop)
      if (token !== request || !player) return
      message.textContent = `「${candidate.song.title}」を再生中`
    } catch (error) {
      if (token !== request) return
      stop()
      message.classList.add('error')
      message.textContent = `読み込みに失敗: ${error}`
    }
  }

  function apply(next: typeof state) {
    stop()
    state = next
    save()
    render()
  }

  function retry(stage: Stage) {
    apply(requestMore(project, state, stage))
    requestText.focus()
  }

  function renderTimeline() {
    const shown = currentBatch(BATCHES, state)?.id
    $('[data-timeline]').innerHTML = BATCHES.map((b) => {
      const parent = findCandidate(BATCHES, b.parentId)
      const notes = project.feedback.filter((f) => f.batchId === b.id)
      const label = stageLabel(b.stage)
      return `<li${b.id === shown ? ' class="current"' : ''}>
        <div class="workshop-timeline-row">
          <span class="workshop-stage-tag">${escape(label)}</span>
          <span class="workshop-timeline-title">${escape(b.title)} · ${b.candidates.length}案${parent ? ` · 派生元「${escape(parent.song.title)}」` : ''}</span>
          <button data-open="${escape(b.id)}" ${b.id === shown ? 'disabled' : ''}>${b.id === shown ? '表示中' : '開く'}</button>
        </div>
        ${notes.map((f) => `<p class="hint">${f.preferred !== 'neither' ? `選択：「${escape(findCandidate(BATCHES, f.preferred)?.song.title ?? f.preferred)}」 ／ ` : ''}${escape(f.userWords)}</p>`).join('')}
      </li>`
    }).join('') || '<li class="hint">まだ候補の組はありません。</li>'
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-open]'))
      button.addEventListener('click', () => apply(openBatch(project, state, button.dataset.open!)))
  }

  function renderRequest() {
    requestText.value = state.history.at(-1)?.text ?? ''
    $<HTMLButtonElement>('[data-copy]').disabled = !requestText.value
    $('[data-copy-status]').textContent = ''
    $('[data-history]').innerHTML = [...state.history].reverse().map((r) =>
      `<details><summary>${escape(STAGES.find((s) => s.id === r.stage)!.label)}${r.parentId ? ` · ${escape(findCandidate(BATCHES, r.parentId)?.song.title ?? r.parentId)}` : ''}</summary><pre>${escape(r.text)}</pre></details>`).join('') || '<p class="hint">まだ依頼はありません。</p>'
  }

  function render() {
    $('.workshop-steps').innerHTML = STAGES.map((s) => `<button data-stage="${s.id}" ${s.id === state.stage ? 'aria-current="step" class="selected"' : ''} ${s.id === 'structure' && !state.themeId || s.id === 'orchestration' && !state.structureId ? 'disabled' : ''}>${escape(s.label)}</button>`).join('')
    const theme = findCandidate(BATCHES, state.themeId)
    const structure = findCandidate(BATCHES, state.structureId)
    $('[data-lineage]').textContent = [theme ? `主題：${theme.song.title}` : 'まだ主題を選んでいません', structure ? `構成：${structure.song.title}` : ''].filter(Boolean).join(' → ')
    const choices = batchesFor(BATCHES, state)
    const batch = currentBatch(BATCHES, state)
    // 構成の段階に置き換える前の和声案の組
    const legacy = batch?.stage === 'harmony'
    const latestRequest = state.history.at(-1)
    const awaiting = latestRequest?.stage === state.stage && latestRequest.parentId === parentFor(state) &&
      (!choices.length || choices.at(-1)?.id === latestRequest.batchId)
    $('[data-batch-status]').textContent = awaiting && batch
      ? '出し直しの依頼文を作成しました。新しい候補はまだ追加されていないため、前の候補を表示しています。'
      : batch ? `${batch.candidates.length}案を${state.stage === 'structure' && !legacy ? '曲の最後まで通して' : '和声付きで'}試聴できます。${state.stage === 'orchestration' ? '' : '見込みがなければ、下のボタンから出し直せます。'}` : ''
    batchSelect.innerHTML = choices.map((b) => `<option value="${escape(b.id)}">${escape(b.title)} · ${b.candidates.length}案</option>`).join('') || '<option>候補はまだありません</option>'
    batchSelect.value = batch?.id ?? ''
    batchSelect.disabled = !choices.length
    $<HTMLButtonElement>('[data-latest]').disabled = !choices.length
    feedback.value = state.notes[scope()] ?? ''
    $('[data-candidates]').innerHTML = batch ? batch.candidates.map((candidate, index) => {
      const score = compileSong(candidate.song)
      const hasNext = BATCHES.some((b) => b.parentId === candidate.song.id)
      const action = state.stage === 'themes' ? hasNext ? 'この主題の構成案を見る' : 'この主題からフル尺の構成を3案依頼'
        : state.stage === 'structure' ? hasNext ? 'この案の編曲を見る' : legacy ? 'この主題＋和声で編曲を依頼' : 'この構成で編曲を依頼' : ''
      const seconds = Math.round(score.bars.reduce((sum, b) => sum + b.beats, 0) * 60 / candidate.song.tempo)
      return `<article class="workshop-candidate" data-candidate="${escape(candidate.song.id)}">
        <h3><span class="workshop-number">${String(index + 1).padStart(2, '0')}</span>${escape(candidate.song.title)}</h3>
        <p class="info">${score.bars.length} 小節 · ♩=${candidate.song.tempo} · ${score.bars[0].timeSignature.join('/')} · 約${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, '0')}秒 · ${state.stage === 'orchestration' ? '編曲版' : '和声・伴奏付き'}</p>
        <p class="workshop-description">${escape(candidate.hypothesis)}</p>
        ${state.stage === 'themes' ? '' : `<ol class="workshop-form">${candidate.phrases.map((p) => `<li><b>${escape(p.label)}</b> ${p.from}–${p.to}小節 <span class="hint">${escape(p.intention)}</span></li>`).join('')}</ol>`}
        <div class="buttons"><button data-play="${escape(candidate.song.id)}">再生</button>${action ? `<button class="workshop-choose" data-choose="${escape(candidate.song.id)}">${action}</button>` : ''}</div>
        <label class="workshop-note-label">残したい点・変えたい点<textarea data-note="${escape(candidate.song.id)}" rows="2" placeholder="この案の気に入った箇所、直したいところ">${escape(state.notes[candidate.song.id] ?? '')}</textarea></label>
        <details><summary>和音と展開</summary><p class="hint">${score.bars.map((b, i) => `${i + 1}: ${escape(b.chord)}`).join(' ／ ')}</p></details>
      </article>`
    }).join('') : `<div class="workshop-empty"><h3>${state.stage === 'structure' ? '選んだ主題の構成案を待っています' : state.stage === 'orchestration' ? '選んだ構成の編曲を待っています' : '新しい主題集を待っています'}</h3><p>下の依頼文をAIに送ってください。候補が追加されたら、この画面で試聴できます。</p></div>`
    $('[data-actions]').innerHTML = state.stage === 'themes'
      ? '<button data-retry="themes">見込みなし・新しい主題を5案以上依頼</button>'
      : state.stage === 'structure'
        ? '<button data-retry="structure">構成の別案をさらに3つ以上依頼</button><button data-retry="themes">主題から出し直す</button>'
        : '<button data-stage="structure">構成の選択に戻る</button><button data-retry="structure">構成の別案をさらに3つ以上依頼</button><button data-retry="orchestration">この構成で編曲を改稿依頼</button>'
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-stage]')) button.addEventListener('click', () => {
      apply({ ...state, stage: button.dataset.stage as Stage, batchId: undefined })
    })
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-play]')) button.addEventListener('click', () => play(button.dataset.play!))
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-choose]')) button.addEventListener('click', () => apply(chooseCandidate(project, state, button.dataset.choose!)))
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-retry]')) button.addEventListener('click', () => retry(button.dataset.retry as Stage))
    for (const note of root.querySelectorAll<HTMLTextAreaElement>('[data-note]')) note.addEventListener('input', () => { state.notes[note.dataset.note!] = note.value; save() })
    renderTimeline()
    renderRequest()
    highlight()
    $('[data-storage]').textContent = storageMessage
  }

  feedback.addEventListener('input', () => { state.notes[scope()] = feedback.value; save() })
  batchSelect.addEventListener('change', () => apply({ ...state, batchId: batchSelect.value }))
  $('[data-latest]').addEventListener('click', () => apply({ ...state, batchId: undefined }))
  $('[data-stop]').addEventListener('click', stop)
  $<HTMLInputElement>('[data-loop]').addEventListener('change', (event) => {
    loop = (event.target as HTMLInputElement).checked
    if (transport.current) transport.current.loop = loop
  })
  $('[data-copy]').addEventListener('click', () => copyText(requestText, $('[data-copy-status]')))

  function update() {
    const player = transport.current
    const at = player?.position()
    if (player?.playing && at && !at.bar) stop()
    else if (at?.bar && activeId) {
      const index = player!.compiled.bars.indexOf(at.bar)
      const key = `${activeId}:${index}`
      if (key !== shownPosition) {
        position.textContent = `${findCandidate(BATCHES, activeId)!.song.title} · ${index + 1} / ${player!.compiled.bars.length} 小節 · ${at.bar.chord}`
        shownPosition = key
      }
    }
    frame = requestAnimationFrame(update)
  }
  render()
  update()
  return { stop, dispose: () => { stop(); cancelAnimationFrame(frame) } }
}
