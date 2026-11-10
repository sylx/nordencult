import { BATCHES } from './composition/studies.ts'
import { ComparisonTransport } from './composition/transport.ts'
import {
  STAGES, batchesFor, currentBatch, findCandidate, chooseCandidate, noteScope, parentFor, requestMore, restoreState,
  type Stage,
} from './composition/workflow.ts'
import { compileSong } from './songs/song.ts'
import { SongPlayer } from './songs/player.ts'
import type { Synth } from './synth/index.ts'

const STORAGE_KEY = 'norden-synth:workshop:v1'
const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

export function setupCompositionPage(synth: Synth, root: HTMLElement): { stop: () => void } {
  let saved: string | null = null
  try { saved = localStorage.getItem(STORAGE_KEY) } catch { /* 保存不可でも試聴できる */ }
  let state = restoreState(saved, BATCHES)
  const transport = new ComparisonTransport<SongPlayer>()
  let request = 0
  let activeId: string | undefined
  let shownPosition = ''
  let loop = false
  let storageMessage = '選択・メモ・依頼履歴はこのブラウザに保存されます。'

  root.innerHTML = `
    <p class="hint">名前付きの主題を和声ごと聴き、見込みのある案から別の響きを試して、編曲へ進めます。</p>
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
      <textarea id="workshop-feedback" rows="3" placeholder="例：今回は見送り。もっと長く歌う主題がほしい／この主題の後半だけ、明るい着地を試したい"></textarea>
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }
    catch { storageMessage = 'このブラウザでは保存できません。必要なメモと依頼文をコピーして残してください。' }
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

  function advance(id: string) {
    stop()
    state = chooseCandidate(BATCHES, state, id)
    save()
    render()
  }

  function retry(stage: Stage) {
    stop()
    state = requestMore(BATCHES, state, stage)
    save()
    render()
    requestText.focus()
  }

  function renderRequest() {
    requestText.value = state.history.at(-1)?.text ?? ''
    $<HTMLButtonElement>('[data-copy]').disabled = !requestText.value
    $('[data-copy-status]').textContent = ''
    $('[data-history]').innerHTML = [...state.history].reverse().map((r) =>
      `<details><summary>${escape(STAGES.find((s) => s.id === r.stage)!.label)}${r.parentId ? ` · ${escape(findCandidate(BATCHES, r.parentId)?.song.title ?? r.parentId)}` : ''}</summary><pre>${escape(r.text)}</pre></details>`).join('') || '<p class="hint">まだ依頼はありません。</p>'
  }

  function render() {
    $('.workshop-steps').innerHTML = STAGES.map((s) => `<button data-stage="${s.id}" ${s.id === state.stage ? 'aria-current="step" class="selected"' : ''} ${s.id === 'harmony' && !state.themeId || s.id === 'orchestration' && !state.harmonyId ? 'disabled' : ''}>${escape(s.label)}</button>`).join('')
    const theme = findCandidate(BATCHES, state.themeId)
    const harmony = findCandidate(BATCHES, state.harmonyId)
    $('[data-lineage]').textContent = [theme ? `主題：${theme.song.title}` : 'まだ主題を選んでいません', harmony ? `和声：${harmony.song.title}` : ''].filter(Boolean).join(' → ')
    const choices = batchesFor(BATCHES, state)
    const batch = currentBatch(BATCHES, state)
    const latestRequest = state.history.at(-1)
    const awaiting = latestRequest?.stage === state.stage && latestRequest.parentId === parentFor(state) &&
      (!choices.length || choices.at(-1)?.id === latestRequest.batchId)
    $('[data-batch-status]').textContent = awaiting && batch
      ? '出し直しの依頼文を作成しました。新しい候補はまだ追加されていないため、前の候補を表示しています。'
      : batch ? `${batch.candidates.length}案を和声付きで試聴できます。${state.stage === 'orchestration' ? '' : '見込みがなければ、下のボタンから出し直せます。'}` : ''
    batchSelect.innerHTML = choices.map((b) => `<option value="${escape(b.id)}">${escape(b.title)} · ${b.candidates.length}案</option>`).join('') || '<option>候補はまだありません</option>'
    batchSelect.value = batch?.id ?? ''
    batchSelect.disabled = !choices.length
    $<HTMLButtonElement>('[data-latest]').disabled = !choices.length
    feedback.value = state.notes[scope()] ?? ''
    $('[data-candidates]').innerHTML = batch ? batch.candidates.map((candidate, index) => {
      const score = compileSong(candidate.song)
      const hasNext = BATCHES.some((b) => b.parentId === candidate.song.id)
      const action = state.stage === 'themes' ? hasNext ? 'この主題の和声案を見る' : 'この主題から和声を5案依頼'
        : state.stage === 'harmony' ? hasNext ? 'この組み合わせの編曲を見る' : 'この主題＋和声で編曲を依頼' : ''
      return `<article class="workshop-candidate" data-candidate="${escape(candidate.song.id)}">
        <h3><span class="workshop-number">${String(index + 1).padStart(2, '0')}</span>${escape(candidate.song.title)}</h3>
        <p class="info">${score.bars.length} 小節 · ♩=${candidate.song.tempo} · ${score.bars[0].timeSignature.join('/')} · ${state.stage === 'orchestration' ? '編曲版' : '和声・伴奏付き'}</p>
        <p class="workshop-description">${escape(candidate.hypothesis)}</p>
        <div class="buttons"><button data-play="${escape(candidate.song.id)}">再生</button>${action ? `<button class="workshop-choose" data-choose="${escape(candidate.song.id)}">${action}</button>` : ''}</div>
        <label class="workshop-note-label">残したい点・変えたい点<textarea data-note="${escape(candidate.song.id)}" rows="2" placeholder="この案の気に入った箇所、直したいところ">${escape(state.notes[candidate.song.id] ?? '')}</textarea></label>
        <details><summary>和音と展開</summary><p class="hint">${score.bars.map((b, i) => `${i + 1}: ${escape(b.chord)}`).join(' ／ ')}</p></details>
      </article>`
    }).join('') : `<div class="workshop-empty"><h3>${state.stage === 'harmony' ? '選んだ主題の和声案を待っています' : state.stage === 'orchestration' ? '選んだ組み合わせの編曲を待っています' : '新しい主題集を待っています'}</h3><p>下の依頼文をAIに送ってください。候補が追加されたら、この画面で試聴できます。</p></div>`
    $('[data-actions]').innerHTML = state.stage === 'themes'
      ? '<button data-retry="themes">見込みなし・新しい主題を5案以上依頼</button>'
      : state.stage === 'harmony'
        ? '<button data-retry="harmony">和声の別案をさらに5つ依頼</button><button data-retry="themes">主題から出し直す</button>'
        : '<button data-stage="harmony">和声の選択に戻る</button><button data-retry="harmony">和声の別案をさらに5つ依頼</button><button data-retry="orchestration">この組み合わせで編曲を改稿依頼</button>'
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-stage]')) button.addEventListener('click', () => {
      stop(); state.stage = button.dataset.stage as Stage; state.batchId = undefined; save(); render()
    })
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-play]')) button.addEventListener('click', () => play(button.dataset.play!))
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-choose]')) button.addEventListener('click', () => advance(button.dataset.choose!))
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-retry]')) button.addEventListener('click', () => retry(button.dataset.retry as Stage))
    for (const note of root.querySelectorAll<HTMLTextAreaElement>('[data-note]')) note.addEventListener('input', () => { state.notes[note.dataset.note!] = note.value; save() })
    renderRequest()
    highlight()
    $('[data-storage]').textContent = storageMessage
  }

  feedback.addEventListener('input', () => { state.notes[scope()] = feedback.value; save() })
  batchSelect.addEventListener('change', () => { stop(); state.batchId = batchSelect.value; save(); render() })
  $('[data-latest]').addEventListener('click', () => { stop(); state.batchId = undefined; save(); render() })
  $('[data-stop]').addEventListener('click', stop)
  $<HTMLInputElement>('[data-loop]').addEventListener('change', (event) => {
    loop = (event.target as HTMLInputElement).checked
    if (transport.current) transport.current.loop = loop
  })
  $('[data-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(requestText.value)
      $('[data-copy-status]').textContent = 'コピーしました。このチャットのAIに貼り付けてください。'
    } catch {
      requestText.focus(); requestText.select()
      $('[data-copy-status]').textContent = '依頼文を選択しました。手動でコピーしてください。'
    }
  })

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
    requestAnimationFrame(update)
  }
  render()
  update()
  return { stop }
}
