// テストページの「LLM 作成曲」タブ。src/songs の曲を選んで聞く

import { SONGS, compileSong, filterSongs, type CatalogSong, type CompiledSong, type SongTier } from './songs/index.ts'
import { SongPlayer } from './songs/player.ts'
import type { Synth } from './synth/index.ts'

const STORAGE_KEY = 'norden-synth:song'
type ListedSong = CompiledSong & { song: CatalogSong }

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
const tagsHtml = (tags: readonly string[]) => tags.map((tag) => `<span class="song-tag">${escape(tag)}</span>`).join('')

function loadSelection(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveSelection(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // 保存できなくても動作には関係ない
  }
}

function formatTime(sec: number): string {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function setupSongsPage(synth: Synth, root: HTMLElement): { stop: () => void } {
  const songs: ListedSong[] = SONGS.map((song) => ({ ...compileSong(song), song }))
  let current = songs.find((c) => c.song.id === loadSelection()) ?? songs.find((c) => c.song.tier === 1) ?? songs[0]
  let tier: SongTier | 'all' = current.song.tier
  const selectedTags = new Set<string>()
  let loop = true
  // 曲 id → プレイヤー。曲を切り替えても作り直さない
  const players = new Map<string, SongPlayer>()
  let player: SongPlayer | undefined
  let request = 0
  let loading = false
  const loads = new Map<string, Promise<SongPlayer>>()
  const muted = new Set<string>()

  root.innerHTML = `
    <div class="song-filters">
      <fieldset>
        <legend>表示</legend>
        <div id="song-tiers" class="buttons"></div>
      </fieldset>
      <fieldset>
        <legend>タグ</legend>
        <div id="song-tags" class="buttons"></div>
        <p class="hint">複数選ぶと、選んだタグをすべて含む曲を表示します。</p>
        <button id="song-clear-tags" disabled>タグをクリア</button>
      </fieldset>
    </div>
    <p id="song-count" class="info" role="status"></p>
    <div id="song-list"></div>
    <p id="song-empty" class="hint" hidden>条件に一致する曲はありません。表示区分を変えるか、タグをクリアしてください。</p>
    <div class="buttons controls">
      <button id="song-play">再生</button>
      <button id="song-stop" class="stop">停止</button>
      <label><input id="song-loop" type="checkbox" checked /> ループ</label>
      <span id="song-message" class="info"></span>
    </div>
    <div id="song-now" class="now"></div>
    <h2>パート</h2>
    <div id="song-parts" class="parts"></div>
    <p class="hint">曲は src/songs/ に 1 曲 1 ファイルで置き、src/songs/index.ts の SONGS に分類 (tier) とタグ (tags) を付けて並べます。書式は src/songs/song.ts を参照</p>
  `
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!
  const message = $('#song-message')
  const now = $('#song-now')
  const partList = $('#song-parts')

  // --- 曲の一覧 ---

  const list = $('#song-list')
  const listButtons = new Map<string, HTMLButtonElement>()
  const tierButtons = new Map<SongTier | 'all', HTMLButtonElement>()
  const tagButtons = new Map<string, HTMLButtonElement>()
  const clearTags = $<HTMLButtonElement>('#song-clear-tags')

  for (const value of [1, 2, 'all'] as const) {
    const b = document.createElement('button')
    b.textContent = `${value === 'all' ? 'すべて' : `${value}軍`} (${filterSongs(value).length})`
    b.addEventListener('click', () => {
      tier = value
      selectedTags.clear()
      renderList()
    })
    $('#song-tiers').append(b)
    tierButtons.set(value, b)
  }

  for (const tag of new Set(SONGS.flatMap((song) => song.tags))) {
    const b = document.createElement('button')
    b.textContent = tag
    b.addEventListener('click', () => {
      if (!selectedTags.delete(tag)) selectedTags.add(tag)
      renderList()
    })
    $('#song-tags').append(b)
    tagButtons.set(tag, b)
  }

  clearTags.addEventListener('click', () => {
    selectedTags.clear()
    renderList()
  })

  function renderList() {
    for (const [value, b] of tierButtons) {
      b.classList.toggle('selected', value === tier)
      b.setAttribute('aria-pressed', String(value === tier))
    }
    for (const [tag, b] of tagButtons) {
      b.classList.toggle('selected', selectedTags.has(tag))
      b.setAttribute('aria-pressed', String(selectedTags.has(tag)))
    }
    clearTags.disabled = selectedTags.size === 0
    const visible = new Set(filterSongs(tier, [...selectedTags]).map((song) => song.id))
    list.innerHTML = ''
    listButtons.clear()
    $('#song-count').textContent = `${visible.size} 曲を表示`
    $('#song-empty').hidden = visible.size > 0

    for (const group of [1, 2] as const) {
      const entries = songs.filter((c) => c.song.tier === group && visible.has(c.song.id))
      if (!entries.length) continue
      const section = document.createElement('section')
      section.className = 'song-group'
      section.innerHTML = `<h3>${group}軍 <span class="info">${entries.length} 曲</span></h3>`
      const grid = document.createElement('div')
      grid.className = 'instruments songs'
      for (const c of entries) {
        const { song, bars, introBars } = c
        const loopSec = (bars.slice(introBars).reduce((sum, b) => sum + b.beats, 0) * 60) / song.tempo
        const b = document.createElement('button')
        b.innerHTML = `<span class="name">${escape(song.title)}</span><span class="meta">${bars.length} 小節 · ループ ${formatTime(loopSec)}</span><span class="song-tags">${tagsHtml(song.tags)}</span>`
        b.classList.toggle('selected', song.id === current.song.id)
        b.setAttribute('aria-pressed', String(song.id === current.song.id))
        b.addEventListener('click', () => select(c))
        grid.append(b)
        listButtons.set(song.id, b)
      }
      section.append(grid)
      list.append(section)
    }
  }

  // --- パート (チェックを外すと鳴らさない。今の小節で音があるパートを強調する) ---

  const partLabels = new Map<string, HTMLElement>()
  function renderParts() {
    partList.innerHTML = ''
    partLabels.clear()
    for (const part of current.song.parts) {
      const label = document.createElement('label')
      label.innerHTML = `<input type="checkbox" ${muted.has(part.id) ? '' : 'checked'} /> ${escape(part.label)}`
      label.querySelector('input')!.addEventListener('change', (e) => {
        if ((e.target as HTMLInputElement).checked) muted.delete(part.id)
        else muted.add(part.id)
        const track = player?.tracks.get(part.id)
        if (track) track.muted = muted.has(part.id)
      })
      partList.append(label)
      partLabels.set(part.id, label)
    }
  }

  function select(c: ListedSong) {
    const wasPlaying = !!player?.playing || loading
    stop()
    player = undefined
    muted.clear()
    current = c
    saveSelection(c.song.id)
    for (const [id, b] of listButtons) {
      b.classList.toggle('selected', id === c.song.id)
      b.setAttribute('aria-pressed', String(id === c.song.id))
    }
    renderParts()
    shown = ''
    if (wasPlaying) play()
  }

  // --- 再生 ---

  function stop() {
    request++
    loading = false
    player?.stop()
    message.textContent = ''
  }

  async function play() {
    stop()
    const token = request
    loading = true
    const c = current
    message.textContent = '音色を読み込み中…'
    message.classList.remove('error')
    let p: SongPlayer
    try {
      await synth.resume()
      if (token !== request) return
      let load = loads.get(c.song.id)
      if (!load) {
        load = SongPlayer.load(synth, c)
        loads.set(c.song.id, load)
        load.catch(() => loads.delete(c.song.id))
      }
      p = players.get(c.song.id) ?? (await load)
    } catch (err) {
      if (token !== request) return
      loading = false
      message.textContent = `読み込みに失敗: ${err}`
      message.classList.add('error')
      return
    }
    players.set(c.song.id, p)
    // 読み込み中に別の曲が選ばれた
    if (token !== request || c !== current) return
    loading = false
    message.textContent = ''
    for (const [id, track] of p.tracks) track.muted = muted.has(id)
    p.loop = loop
    player = p
    p.start()
  }

  $('#song-play').addEventListener('click', play)
  $('#song-stop').addEventListener('click', stop)
  const loopInput = $<HTMLInputElement>('#song-loop')
  loopInput.addEventListener('change', () => {
    loop = loopInput.checked
    if (player) player.loop = loop
  })

  // --- 今鳴っている位置 ---

  // form の i 番目のセクションが始まる小節 (intro と loop を 1 回ずつ並べた中で)
  function formStarts(i: number): number {
    const { song } = current
    return [...song.intro, ...song.loop].slice(0, i).reduce((sum, id) => sum + song.sections.find((s) => s.id === id)!.chords.length, 0)
  }

  let shown = ''
  function update() {
    const at = player?.position()
    const pos = at?.position
    const b = at?.bar
    const { song, bars } = current
    // ループしないときは最後の小節を過ぎたら止める
    if (pos && !b && player?.playing) player.stop()
    // 構成の中で今鳴っているセクション (intro と loop を並べた位置)
    const form = [...song.intro, ...song.loop]
    let active = -1
    if (pos && b) {
      const linear = bars.indexOf(b)
      active = form.findIndex((_, i) => linear >= formStarts(i) && linear < formStarts(i + 1))
    }
    const formHtml =
      form
        .map((id, i) => {
          const text = escape(song.sections.find((s) => s.id === id)?.label ?? id)
          const html = i === active ? `<b>${text}</b>` : `<span class="muted">${text}</span>`
          return i === song.intro.length ? `[ ${html}` : html
        })
        .join(' → ') + ' ]'
    let html = `
      <div class="title">『${escape(song.title)}』</div>
      <div class="song-tags"><span class="song-tier">${song.tier}軍</span>${tagsHtml(song.tags)}</div>
      <p class="description">${escape(song.description)}</p>
      <dl>
        <dt>構成</dt><dd>${formHtml}</dd>`
    if (pos && b) {
      const [n, d] = pos.timeSignature
      html += `
        <dt>位置</dt><dd>${pos.bar + 1} 小節目 · ${escape(b.section.label)} ${b.barInSection + 1}/${b.section.chords.length} · ${n}/${d} · ♩=${pos.tempo.toFixed(0)}</dd>
        <dt>和音</dt><dd>${escape(b.chord)}</dd>`
    }
    html += '</dl>'
    for (const [id, label] of partLabels) label.classList.toggle('active', !!b?.notes.get(id)?.length)
    if (html !== shown) {
      now.innerHTML = html
      shown = html
    }
    requestAnimationFrame(update)
  }

  renderList()
  select(current)
  update()
  return { stop }
}
