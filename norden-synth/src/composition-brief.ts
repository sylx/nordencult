import { copyText, escape, readStorage, writeStorage } from './composition/browser.ts'
import { emptyBrief, makeProjectRequest, type BriefDraft, type CompositionProject } from './composition/workflow.ts'
import type { Song } from './songs/index.ts'

const DRAFT_KEY = 'norden-synth:workshop:brief-draft'

// 保存された下書きは壊れていても入力欄の初期値として使えるものだけ拾う。
export function restoreDraft(raw: string | null, songs: { id: string }[]): { draft: BriefDraft; request: string } {
  const result = { draft: emptyBrief(), request: '' }
  if (!raw) return result
  try {
    const value = JSON.parse(raw)
    const d = value?.draft
    for (const field of ['title', 'purpose', 'image', 'avoid'] as const)
      if (typeof d?.[field] === 'string') result.draft[field] = d[field]
    if (Array.isArray(d?.references)) result.draft.references = d.references.filter((r: { songId?: unknown; notes?: unknown } | null) =>
      typeof r?.songId === 'string' && typeof r.notes === 'string' && songs.some((s) => s.id === r.songId))
    if (typeof value?.request === 'string') result.request = value.request
  } catch { /* 壊れた下書きは捨てる */ }
  return result
}

// 新しいプロジェクトのブリーフを書き、最初のフック集を作る依頼文を作る。
// 画面はリポジトリに書き込まない。依頼文を受け取ったAIがプロジェクトを登録する。
export function mountBriefForm(root: HTMLElement, projects: CompositionProject[], songs: Song[]) {
  let { draft, request } = restoreDraft(readStorage(DRAFT_KEY), songs)
  let storageMessage = '下書きはこのブラウザに保存されます。'

  root.innerHTML = `
    <section class="workshop-brief-form">
      <h3>新しいプロジェクト</h3>
      <p class="hint">これから作る曲の用途とイメージを書くと、主題の冒頭になる短いフックを10案以上（和声・伴奏付き）作る依頼文を作ります。コピーしてこのチャットのAIに送ってください。AIがプロジェクトを登録すると、上の「プロジェクト」から選べるようになります（開いている画面は再読み込みが必要です）。</p>
      <label>プロジェクト名 <span class="required">必須</span>
        <input data-field="title" type="text" placeholder="例：作戦会議のBGM" /></label>
      <label>用途・場面
        <textarea data-field="purpose" rows="3" placeholder="例：ファンタジーSLGの作戦会議画面。長時間ループで流れる"></textarea></label>
      <label>欲しいイメージ
        <textarea data-field="image" rows="3" placeholder="例：緊張感はあるが重すぎない。覚えやすい主題"></textarea></label>
      <label>避けたいこと
        <textarea data-field="avoid" rows="2" placeholder="例：バロック風、変拍子、凝りすぎた旋律"></textarea></label>
      <p class="hint">用途・場面か欲しいイメージのどちらかは書いてください。空欄の項目は依頼文に入れません。</p>
      <fieldset class="workshop-references">
        <legend>参考曲（任意）— 曲一覧から選び、どこが良いかを書く</legend>
        <div data-references></div>
      </fieldset>
      <div class="buttons">
        <button class="workshop-choose" data-make>依頼文を作成</button>
        <button data-clear>下書きを消去</button>
      </div>
      <p data-error class="info error" role="alert"></p>
      <textarea data-request rows="14" readonly aria-label="新しいプロジェクトの作曲依頼" placeholder="入力して「依頼文を作成」を押してください。"></textarea>
      <div class="controls">
        <button data-copy>依頼文をコピー</button>
        <span data-copy-status class="info" role="status"></span>
      </div>
      <p data-storage class="hint"></p>
    </section>
  `
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!
  const requestText = $<HTMLTextAreaElement>('[data-request]')
  const error = $('[data-error]')

  function save() {
    if (!writeStorage(DRAFT_KEY, JSON.stringify({ draft, request })))
      storageMessage = 'このブラウザでは下書きを保存できません。依頼文をコピーして残してください。'
    $('[data-storage]').textContent = storageMessage
  }

  function render() {
    for (const input of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]'))
      input.value = draft[input.dataset.field as 'title' | 'purpose' | 'image' | 'avoid']
    $('[data-references]').innerHTML = songs.map((song) => {
      const ref = draft.references.find((r) => r.songId === song.id)
      return `<div class="workshop-reference${ref ? ' selected' : ''}">
        <label><input type="checkbox" data-ref="${escape(song.id)}" ${ref ? 'checked' : ''} /> ${escape(song.title)}</label>
        ${ref ? `<input type="text" data-ref-notes="${escape(song.id)}" value="${escape(ref.notes)}" placeholder="良いところ（例：冒頭の休符を含む主題の輪郭）" aria-label="「${escape(song.title)}」の良いところ" />` : ''}
      </div>`
    }).join('')
    for (const box of root.querySelectorAll<HTMLInputElement>('[data-ref]')) box.addEventListener('change', () => {
      draft.references = box.checked
        ? [...draft.references, { songId: box.dataset.ref!, notes: '' }]
        : draft.references.filter((r) => r.songId !== box.dataset.ref)
      save()
      render()
      root.querySelector<HTMLInputElement>(`[data-ref-notes="${CSS.escape(box.dataset.ref!)}"]`)?.focus()
    })
    for (const input of root.querySelectorAll<HTMLInputElement>('[data-ref-notes]')) input.addEventListener('input', () => {
      const ref = draft.references.find((r) => r.songId === input.dataset.refNotes)
      if (ref) { ref.notes = input.value; save() }
    })
    requestText.value = request
    $<HTMLButtonElement>('[data-copy]').disabled = !request
    $('[data-storage]').textContent = storageMessage
  }

  for (const input of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]')) input.addEventListener('input', () => {
    draft[input.dataset.field as 'title' | 'purpose' | 'image' | 'avoid'] = input.value
    save()
  })
  $('[data-make]').addEventListener('click', () => {
    error.textContent = ''
    $('[data-copy-status]').textContent = ''
    try {
      request = makeProjectRequest(draft, songs, projects)
      save()
      render()
      requestText.focus()
    } catch (e) {
      error.textContent = (e as Error).message
    }
  })
  $('[data-clear]').addEventListener('click', () => {
    if (!confirm('ブリーフの下書きと依頼文を消去しますか？')) return
    draft = emptyBrief()
    request = ''
    error.textContent = ''
    save()
    render()
  })
  $('[data-copy]').addEventListener('click', () => copyText(requestText, $('[data-copy-status]')))
  render()
  return { stop() {}, dispose() {} }
}
