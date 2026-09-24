// テストページの「LLM 作成曲」タブ。src/songs の曲を選んで聞く

import { SONGS, barAt, compileSong, type CompiledSong } from './songs/index.ts'
import { Sequencer, type Channel, type Synth, type Track } from './synth/index.ts'

const STORAGE_KEY = 'norden-synth:song'

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

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

export function setupSongsPage(synth: Synth, root: HTMLElement): void {
  const songs = SONGS.map(compileSong)
  let current = songs.find((c) => c.song.id === loadSelection()) ?? songs[0]
  let loop = true
  const seq = new Sequencer(synth.ctx, { tempo: current.song.tempo, timeSignature: current.song.timeSignature })
  // 曲 id → パート id → チャンネル。曲を切り替えても作り直さない
  const channels = new Map<string, Map<string, Channel>>()
  const tracks = new Map<string, Track>()
  const muted = new Set<string>()

  root.innerHTML = `
    <div id="song-list" class="instruments songs"></div>
    <div class="buttons controls">
      <button id="song-play">再生</button>
      <button id="song-stop" class="stop">停止</button>
      <label><input id="song-loop" type="checkbox" checked /> ループ</label>
      <span id="song-message" class="info"></span>
    </div>
    <div id="song-now" class="now"></div>
    <h2>パート</h2>
    <div id="song-parts" class="parts"></div>
    <p class="hint">曲は src/songs/ に 1 曲 1 ファイルで置き、src/songs/index.ts の SONGS に並べます。書式は src/songs/song.ts を参照</p>
  `
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!
  const message = $('#song-message')
  const now = $('#song-now')
  const partList = $('#song-parts')

  // --- 曲の一覧 ---

  const list = $('#song-list')
  const listButtons = new Map<string, HTMLButtonElement>()
  for (const c of songs) {
    const { song, bars, introBars, beatsPerBar } = c
    const loopSec = ((bars.length - introBars) * beatsPerBar * 60) / song.tempo
    const b = document.createElement('button')
    b.innerHTML = `<span class="name">${escape(song.title)}</span><span class="meta">${bars.length} 小節 · ループ ${formatTime(loopSec)}</span>`
    b.addEventListener('click', () => select(c))
    list.append(b)
    listButtons.set(song.id, b)
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
        const track = tracks.get(part.id)
        if (track) track.muted = muted.has(part.id)
      })
      partList.append(label)
      partLabels.set(part.id, label)
    }
  }

  function select(c: CompiledSong) {
    const wasPlaying = seq.playing
    seq.stop()
    for (const track of tracks.values()) seq.removeTrack(track)
    tracks.clear()
    muted.clear()
    current = c
    saveSelection(c.song.id)
    for (const [id, b] of listButtons) b.classList.toggle('selected', id === c.song.id)
    renderParts()
    shown = ''
    if (wasPlaying) play()
  }

  // --- 再生 ---

  // 小節ごとに最初に呼ばれる。リタルダンドの後はテンポを戻す
  let ramped = false
  seq.conductor = (bar) => {
    const b = barAt(current, bar.index, loop)
    if (ramped) {
      bar.setTempo(current.song.tempo)
      ramped = false
    }
    const rit = b?.section.ritardando
    if (rit && b.barInSection === b.section.chords.length - 1) {
      bar.rampTempo(current.song.tempo * rit, 0, bar.beats)
      ramped = true
    }
  }

  async function load(c: CompiledSong): Promise<Map<string, Channel>> {
    let map = channels.get(c.song.id)
    if (map) return map
    const instruments = await Promise.all(c.song.parts.map((p) => synth.loadInstrument(p.instrument)))
    map = new Map(
      c.song.parts.map((part, i) => {
        const ch = synth.createChannel(instruments[i])
        ch.volume = part.volume
        ch.pan = part.pan
        return [part.id, ch]
      }),
    )
    channels.set(c.song.id, map)
    return map
  }

  async function play() {
    const c = current
    message.textContent = '音色を読み込み中…'
    message.classList.remove('error')
    let map: Map<string, Channel>
    try {
      await synth.resume()
      map = await load(c)
    } catch (err) {
      message.textContent = `読み込みに失敗: ${err}`
      message.classList.add('error')
      return
    }
    // 読み込み中に別の曲が選ばれた
    if (c !== current) return
    message.textContent = ''
    if (tracks.size === 0) {
      for (const part of c.song.parts) {
        const track = seq.addTrack(map.get(part.id)!, (bar) => {
          for (const n of barAt(c, bar.index, loop)?.notes.get(part.id) ?? []) bar.note(n.beat, n.key, n.velocity, n.duration)
        })
        track.muted = muted.has(part.id)
        tracks.set(part.id, track)
      }
    }
    ramped = false
    seq.tempo = c.song.tempo
    seq.timeSignature = c.song.timeSignature ?? [4, 4]
    seq.start()
  }

  $('#song-play').addEventListener('click', play)
  $('#song-stop').addEventListener('click', () => seq.stop())
  const loopInput = $<HTMLInputElement>('#song-loop')
  loopInput.addEventListener('change', () => (loop = loopInput.checked))

  // --- 今鳴っている位置 ---

  // form の i 番目のセクションが始まる小節 (intro と loop を 1 回ずつ並べた中で)
  function formStarts(i: number): number {
    const { song } = current
    return [...song.intro, ...song.loop].slice(0, i).reduce((sum, id) => sum + song.sections.find((s) => s.id === id)!.chords.length, 0)
  }

  let shown = ''
  function update() {
    const pos = seq.position()
    const b = pos && barAt(current, pos.bar, loop)
    const { song, bars } = current
    // ループしないときは最後の小節を過ぎたら止める
    if (pos && !b && seq.playing) seq.stop()
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

  select(current)
  update()
}
