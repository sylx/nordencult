import './style.css'
import { setupBgmPage } from './bgm-page.ts'
import { setupSequencerDemo } from './sequencer-demo.ts'
import { Synth, type Channel, type Instrument, type InstrumentIndexEntry } from './synth/index.ts'

const synth = new Synth()
let channel: Channel | undefined
let velocity = 100
let baseKey = 48
// AudioParam の値は float32 なので表示用に丸める
const fmt = (v: number) => String(Math.round(v * 100) / 100)
const reverbLevel = fmt(synth.reverbReturn.gain.value)
const masterLevel = fmt(synth.master.gain.value)

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <header>
    <h1>norden-synth</h1>
    <span id="status" class="status"></span>
  </header>

  <nav class="tabs">
    <a href="#instrument" data-tab="instrument">音源チェック</a>
    <a href="#sequencer" data-tab="sequencer">シーケンサ</a>
    <a href="#bgm" data-tab="bgm">BGM 生成</a>
  </nav>

  <div data-page="instrument">
    <section>
      <h2>音色</h2>
      <div id="instruments" class="instruments"></div>
      <p id="info" class="info">音色を選ぶと読み込みます</p>
    </section>

    <section>
      <h2>テスト再生</h2>
      <div class="buttons">
        <button data-phrase="scale">音階</button>
        <button data-phrase="chords">和音</button>
        <button data-phrase="arpeggio">アルペジオ</button>
        <button data-phrase="sweep">全音域</button>
        <button data-phrase="long">ロングトーン</button>
        <button data-phrase="stop" class="stop">停止</button>
      </div>
      <div class="controls">
        <label>ベロシティ <input id="velocity" type="range" min="1" max="127" value="${velocity}" /><output>${velocity}</output></label>
        <label>リバーブ <input id="reverb" type="range" min="0" max="2" step="0.05" value="${reverbLevel}" /><output>${reverbLevel}</output></label>
        <label>音量 <input id="volume" type="range" min="0" max="1.5" step="0.05" value="${masterLevel}" /><output>${masterLevel}</output></label>
        <label>オクターブ
          <button id="oct-down">−</button><output id="octave"></output><button id="oct-up">+</button>
        </label>
      </div>
    </section>

    <section>
      <h2>鍵盤</h2>
      <div id="keyboard" class="keyboard"></div>
      <p class="hint">PC キーボード: Z〜M 行が下のオクターブ、Q〜U 行が上のオクターブ</p>
    </section>
  </div>

  <div data-page="sequencer" hidden>
    <section>
      <h2>デモ曲</h2>
      <div id="sequencer"></div>
    </section>
  </div>

  <div data-page="bgm" hidden>
    <section>
      <h2>プロシージャル BGM</h2>
      <div id="bgm"></div>
    </section>
  </div>
`

const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!

// --- タブ ---
// URL のハッシュで開くページを決める (#instrument / #sequencer / #bgm)

const pages = ['instrument', 'sequencer', 'bgm'] as const
type Page = (typeof pages)[number]
let page: Page = 'instrument'

function showPage() {
  const hash = location.hash.slice(1)
  page = pages.find((p) => p === hash) ?? 'instrument'
  for (const el of app.querySelectorAll<HTMLElement>('[data-page]')) el.hidden = el.dataset.page !== page
  for (const el of app.querySelectorAll<HTMLElement>('[data-tab]')) el.classList.toggle('selected', el.dataset.tab === page)
  // 別のページに移ったら鍵盤で押しっぱなしの音を離す
  if (page !== 'instrument') for (const key of [...pressed]) release(key)
}
window.addEventListener('hashchange', showPage)

// --- 音色の選択と読み込み ---

const instrumentList = $('#instruments')
const info = $('#info')
const buttons = new Map<string, HTMLButtonElement>()

synth.listInstruments().then(
  (entries) => {
    for (const entry of entries) {
      const b = document.createElement('button')
      b.innerHTML = `<span class="name">${entry.name}</span><span class="meta">#${entry.program} · ${(entry.bytes / 1e6).toFixed(2)} MB</span>`
      b.addEventListener('click', () => select(entry))
      instrumentList.append(b)
      buttons.set(entry.id, b)
    }
    if (entries[0]) select(entries.find((e) => e.id === 'violin') ?? entries[0])
  },
  (err) => {
    info.textContent = `楽器一覧を読み込めません: ${err}. npm run build:instruments を実行してください`
    info.classList.add('error')
  },
)

async function select(entry: InstrumentIndexEntry) {
  for (const [id, b] of buttons) b.classList.toggle('selected', id === entry.id)
  info.textContent = `${entry.name} を読み込み中…`
  const t = performance.now()
  let instrument: Instrument
  try {
    instrument = await synth.loadInstrument(entry.id)
  } catch (err) {
    info.textContent = `${entry.name} の読み込みに失敗: ${err}`
    info.classList.add('error')
    return
  }
  info.classList.remove('error')
  const ms = performance.now() - t
  const [lo, hi] = instrument.keyRange
  info.textContent =
    `${instrument.name}: ${instrument.data.regions.length} リージョン / ${instrument.samples.length} サンプル / ` +
    `${(instrument.bytes / 1e6).toFixed(2)} MB / 音域 ${noteName(lo)}–${noteName(hi)} / 読み込み ${ms.toFixed(0)} ms`
  if (channel) channel.instrument = instrument
  else channel = synth.createChannel(instrument)
  buttons.get(entry.id)?.classList.add('loaded')
}

// --- コントロール ---

function bindRange(sel: string, apply: (v: number) => void) {
  const input = $<HTMLInputElement>(sel)
  const out = input.nextElementSibling as HTMLOutputElement
  input.addEventListener('input', () => {
    apply(Number(input.value))
    out.textContent = input.value
  })
}
bindRange('#velocity', (v) => (velocity = v))
bindRange('#reverb', (v) => (synth.reverbReturn.gain.value = v))
bindRange('#volume', (v) => (synth.master.gain.value = v))

const octave = $('#octave')
function setBaseKey(key: number) {
  baseKey = Math.max(12, Math.min(96, key))
  octave.textContent = noteName(baseKey)
  renderKeyboard()
}
$('#oct-down').addEventListener('click', () => setBaseKey(baseKey - 12))
$('#oct-up').addEventListener('click', () => setBaseKey(baseKey + 12))

// AudioContext は最初のユーザー操作で再開する
window.addEventListener('pointerdown', () => synth.resume(), { once: true })
window.addEventListener('keydown', () => synth.resume(), { once: true })

// --- テストフレーズ ---

const phrases: Record<string, (ch: Channel, t: number) => void> = {
  scale(ch, t) {
    const steps = [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0]
    steps.forEach((s, i) => ch.playNote(baseKey + 12 + s, velocity, t + i * 0.25, 0.3))
  },
  chords(ch, t) {
    // I - IV - V7 - I
    const chords = [
      [0, 4, 7, 12],
      [0, 5, 9, 12],
      [-1, 5, 7, 11],
      [0, 4, 7, 12],
    ]
    chords.forEach((c, i) => {
      ch.playNote(baseKey, velocity, t + i * 1.2, 1.1)
      for (const n of c) ch.playNote(baseKey + 12 + n, velocity, t + i * 1.2, 1.1)
    })
  },
  arpeggio(ch, t) {
    const pattern = [0, 7, 12, 16, 19, 16, 12, 7]
    const roots = [0, 9, 5, 7]
    roots.forEach((r, bar) => {
      pattern.forEach((p, i) => ch.playNote(baseKey + r + p, velocity, t + (bar * 8 + i) * 0.15, 0.4))
    })
  },
  sweep(ch, t) {
    const [lo, hi] = ch.instrument.keyRange
    for (let k = lo; k <= hi; k++) ch.playNote(k, velocity, t + (k - lo) * 0.1, 0.25)
  },
  long(ch, t) {
    // ループの継ぎ目を確認するための長い音
    for (const n of [0, 7, 16]) ch.playNote(baseKey + 12 + n, velocity, t, 6)
  },
}

for (const b of app.querySelectorAll<HTMLButtonElement>('[data-phrase]')) {
  b.addEventListener('click', () => {
    const name = b.dataset.phrase!
    if (name === 'stop') {
      synth.allNotesOff()
      return
    }
    if (channel) phrases[name](channel, synth.currentTime + 0.05)
  })
}

// --- 鍵盤 ---

const keyboard = $('#keyboard')
const BLACK = new Set([1, 3, 6, 8, 10])
const keyElements = new Map<number, HTMLElement>()
const pressed = new Set<number>()

function renderKeyboard() {
  keyboard.innerHTML = ''
  keyElements.clear()
  const whites = [...Array(25).keys()].filter((i) => !BLACK.has(i % 12)).length
  let white = 0
  for (let i = 0; i <= 24; i++) {
    const key = baseKey + i
    const el = document.createElement('div')
    const isBlack = BLACK.has(i % 12)
    el.className = isBlack ? 'key black' : 'key white'
    if (isBlack) el.style.left = `${(white / whites) * 100}%`
    else white++
    if (i % 12 === 0) el.textContent = noteName(key)
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId)
      press(key)
    })
    el.addEventListener('pointerup', () => release(key))
    el.addEventListener('pointercancel', () => release(key))
    keyboard.append(el)
    keyElements.set(key, el)
  }
  keyboard.style.setProperty('--whites', String(whites))
}

function press(key: number) {
  if (!channel || pressed.has(key)) return
  pressed.add(key)
  channel.noteOn(key, velocity)
  keyElements.get(key)?.classList.add('down')
}

function release(key: number) {
  if (!pressed.delete(key)) return
  channel?.noteOff(key)
  keyElements.get(key)?.classList.remove('down')
}

const PC_KEYS = ['zsxdcvgbhnjm,', 'q2w3er5t6y7ui']
function pcKeyToNote(k: string): number | undefined {
  for (let row = 0; row < PC_KEYS.length; row++) {
    const i = PC_KEYS[row].indexOf(k.toLowerCase())
    if (i >= 0) return baseKey + row * 12 + i
  }
}
window.addEventListener('keydown', (e) => {
  if (page !== 'instrument' || e.repeat || e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return
  const key = pcKeyToNote(e.key)
  if (key !== undefined) press(key)
})
window.addEventListener('keyup', (e) => {
  const key = pcKeyToNote(e.key)
  if (key !== undefined) release(key)
})

setBaseKey(baseKey)
setupSequencerDemo(synth, $('#sequencer'))
setupBgmPage(synth, $('#bgm'))
showPage()

// --- ステータス表示 ---

const status = $('#status')
function updateStatus() {
  status.textContent = `${synth.ctx.state} · ${synth.ctx.sampleRate} Hz · ボイス ${synth.activeVoiceCount}`
  requestAnimationFrame(updateStatus)
}
updateStatus()

function noteName(key: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return `${names[key % 12]}${Math.floor(key / 12) - 1}`
}
