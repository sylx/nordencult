// テストページの「BGM 生成」タブ

import { Composer, DEFAULT_PARAMS, PARAM_DEFS, PLAYER_DEFS, ROLE_DEFS, type BgmParams, type MelodyInfo, type PlayerId } from './music/index.ts'
import { Sequencer, type Synth, type Track } from './synth/index.ts'

const STORAGE_KEY = 'norden-synth:bgm-params'

function loadParams(): BgmParams {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<BgmParams>
    return { ...DEFAULT_PARAMS, ...saved }
  } catch {
    return { ...DEFAULT_PARAMS }
  }
}

function saveParams(p: BgmParams): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // 保存できなくても動作には関係ない
  }
}

const fmt = (v: number) => String(Math.round(v * 100) / 100)

export function setupBgmPage(synth: Synth, root: HTMLElement): void {
  const composer = new Composer(loadParams())
  const p = composer.params
  const seq = new Sequencer(synth.ctx, { tempo: p.tempo })
  const tracks = new Map<PlayerId, Track>()
  const muted = new Set<PlayerId>()

  const groups = [...new Set(PARAM_DEFS.map((d) => d.group))]
  root.innerHTML = `
    <div class="buttons">
      <button id="bgm-play">再生</button>
      <button id="bgm-stop" class="stop">停止</button>
      <button id="bgm-new">新しい曲</button>
      <label class="seed">シード <input id="bgm-seed" type="number" min="0" step="1" value="${p.seed}" /></label>
      <span id="bgm-message" class="info"></span>
    </div>

    <div id="bgm-now" class="now"></div>

    <h2>奏者</h2>
    <div id="bgm-parts" class="parts"></div>

    ${groups
      .map(
        (g) => `
      <h2>${g}</h2>
      <div class="params">
        ${PARAM_DEFS.filter((d) => d.group === g)
          .map(
            (d) => `
          <div class="param">
            <label for="bgm-${d.key}">${d.label}</label>
            ${
              d.options
                ? `<select id="bgm-${d.key}">${d.options.map((o) => `<option value="${o}" ${o === p[d.key] ? 'selected' : ''}>${o}</option>`).join('')}</select>`
                : `<input id="bgm-${d.key}" type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${p[d.key]}" /><output>${fmt(p[d.key])}</output>`
            }
            <p>${d.description}<span class="applies">${d.applies === 'bar' ? '次の小節から' : '次のセクションから'}</span></p>
          </div>`,
          )
          .join('')}
      </div>`,
      )
      .join('')}

    <div class="buttons footer">
      <button id="bgm-defaults">既定値に戻す</button>
      <button id="bgm-copy">設定をコピー (JSON)</button>
    </div>
  `
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!
  const message = $('#bgm-message')
  const now = $('#bgm-now')

  // --- 奏者 (チェックを外すと鳴らさない。受け持っている役割を横に出す) ---

  const partList = $('#bgm-parts')
  const partLabels = new Map<PlayerId, HTMLElement>()
  const partRoles = new Map<PlayerId, HTMLElement>()
  for (const def of PLAYER_DEFS) {
    const label = document.createElement('label')
    label.innerHTML = `<input type="checkbox" checked /> ${def.label}<span class="role"></span>`
    partRoles.set(def.id, label.querySelector('.role')!)
    label.querySelector('input')!.addEventListener('change', (e) => {
      if ((e.target as HTMLInputElement).checked) muted.delete(def.id)
      else muted.add(def.id)
      const track = tracks.get(def.id)
      if (track) track.muted = muted.has(def.id)
    })
    partList.append(label)
    partLabels.set(def.id, label)
  }

  // --- パラメータ ---

  for (const d of PARAM_DEFS) {
    const input = $<HTMLInputElement | HTMLSelectElement>(`#bgm-${d.key}`)
    input.addEventListener('input', () => {
      const v = Number(input.value)
      p[d.key] = v
      if (input.nextElementSibling instanceof HTMLOutputElement) input.nextElementSibling.textContent = fmt(v)
      if (d.key === 'tempo') seq.tempo = v
      saveParams(p)
    })
  }

  const seedInput = $<HTMLInputElement>('#bgm-seed')
  seedInput.addEventListener('change', () => {
    p.seed = Math.max(0, Math.floor(Number(seedInput.value) || 0))
    saveParams(p)
  })

  $('#bgm-defaults').addEventListener('click', () => {
    Object.assign(p, { ...DEFAULT_PARAMS, seed: p.seed })
    for (const d of PARAM_DEFS) {
      const input = $<HTMLInputElement | HTMLSelectElement>(`#bgm-${d.key}`)
      input.value = String(p[d.key])
      if (input.nextElementSibling instanceof HTMLOutputElement) input.nextElementSibling.textContent = fmt(p[d.key])
    }
    seq.tempo = p.tempo
    saveParams(p)
  })

  $('#bgm-copy').addEventListener('click', async () => {
    const json = JSON.stringify(p, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      message.textContent = '設定をクリップボードにコピーしました'
    } catch {
      message.textContent = json
    }
  })

  // --- 再生 ---

  let loading: Promise<void> | undefined
  function load(): Promise<void> {
    loading ??= Promise.all(PLAYER_DEFS.map((d) => synth.loadInstrument(d.instrument))).then((instruments) => {
      const channels = Object.fromEntries(
        PLAYER_DEFS.map((d, i) => {
          const ch = synth.createChannel(instruments[i])
          ch.volume = d.volume
          ch.pan = d.pan
          return [d.id, ch]
        }),
      )
      for (const [id, track] of composer.attach(seq, channels)) {
        track.muted = muted.has(id)
        tracks.set(id, track)
      }
    })
    loading.catch(() => (loading = undefined))
    return loading
  }

  async function play() {
    message.textContent = '音色を読み込み中…'
    message.classList.remove('error')
    try {
      await synth.resume()
      await load()
    } catch (err) {
      message.textContent = `読み込みに失敗: ${err}`
      message.classList.add('error')
      return
    }
    message.textContent = ''
    seq.stop()
    composer.reset()
    seq.tempo = p.tempo
    seq.start()
  }

  $('#bgm-play').addEventListener('click', play)
  $('#bgm-stop').addEventListener('click', () => seq.stop())
  $('#bgm-new').addEventListener('click', () => {
    p.seed = Math.floor(Math.random() * 1e6)
    seedInput.value = String(p.seed)
    saveParams(p)
    play()
  })

  // --- 今鳴っている位置 ---

  const playerName = new Map(PLAYER_DEFS.map((d) => [d.id, d.label]))
  const roleName = new Map(ROLE_DEFS.map((d) => [d.id, d.label]))
  // 句の役割と音型の並び。今の小節の音型を強調する
  function melodyHtml(m: MelodyInfo | undefined): string {
    if (!m) return '<span class="muted">休み</span>'
    const figures = m.figures.map((f, i) => (i === m.bar ? `<b>${f}</b>` : `<span class="muted">${f}</span>`)).join(' → ')
    return `${m.role}${m.theme ? ' <span class="muted">主題</span>' : ''} · ${figures}${m.detail ? ` · ${m.detail}` : ''}`
  }
  let shown = ''
  function update() {
    const pos = seq.position()
    const snap = pos && composer.snapshot(pos.bar)
    let html = ''
    if (pos && snap) {
      const energy = Math.round(snap.energy * 100)
      const lead = snap.roles.find((r) => r.role === 'melody')
      html = `
        <div class="key">${snap.key}${snap.scaleNote ? `<span>${snap.scaleNote}</span>` : ''}</div>
        <dl>
          <dt>セクション</dt><dd>${snap.section + 1} (${snap.barInSection + 1}/${snap.sectionBars} 小節)</dd>
          <dt>拍子</dt><dd>${snap.meter} · ♩=${pos.tempo.toFixed(0)}</dd>
          <dt>和音</dt><dd>${snap.chords.join(' / ')}${snap.modulatingTo ? ` → <b>${snap.modulatingTo}</b> へ転調` : ''}</dd>
          <dt>アーティクル</dt><dd>${snap.article + 1} (${snap.sectionInArticle + 1}/${snap.articleSections} セクション) · ${snap.arrangement}</dd>
          ${lead ? `<dt>メロディ</dt><dd>${playerName.get(lead.player)} · ${melodyHtml(snap.melody)}</dd>` : ''}
          <dt>盛り上がり</dt><dd><span class="meter"><span style="width:${energy}%"></span></span></dd>
          <dt>編成</dt><dd>${snap.roles.map((r) => `${roleName.get(r.role)}: ${playerName.get(r.player)}`).join('、')}</dd>
        </dl>`
      for (const [id, label] of partLabels) {
        const role = snap.roles.find((r) => r.player === id)?.role
        label.classList.toggle('active', role !== undefined)
        partRoles.get(id)!.textContent = role ? ` · ${roleName.get(role)}` : ''
      }
    } else if (!seq.playing) {
      html = '<p class="info">「再生」で生成を始めます。同じシードとパラメータなら同じ曲になります</p>'
      for (const label of partLabels.values()) label.classList.remove('active')
      for (const role of partRoles.values()) role.textContent = ''
    }
    if (html && html !== shown) {
      now.innerHTML = html
      shown = html
    }
    requestAnimationFrame(update)
  }
  update()
}
