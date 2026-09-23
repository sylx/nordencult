// テストページ全体の音量とリバーブ。どのタブからも使う

import type { ReverbSettings, Synth } from './synth/index.ts'

interface MixerSettings extends ReverbSettings {
  master: number
  dry: number
  wet: number
}

const PRESETS: { name: string; settings: MixerSettings }[] = [
  { name: '部屋', settings: { master: 0.5, dry: 1, wet: 0.4, duration: 1, preDelay: 0.008, damping: 0.7 } },
  { name: 'ホール', settings: { master: 0.5, dry: 1, wet: 0.6, duration: 2.4, preDelay: 0.02, damping: 0.6 } },
  { name: '大聖堂', settings: { master: 0.5, dry: 0.9, wet: 1.2, duration: 6, preDelay: 0.04, damping: 0.45 } },
  { name: '洞窟', settings: { master: 0.5, dry: 0.75, wet: 1.8, duration: 10, preDelay: 0.07, damping: 0.3 } },
  { name: '霧の中', settings: { master: 0.5, dry: 0.45, wet: 2.6, duration: 15, preDelay: 0.1, damping: 0.5 } },
]

const CONTROLS: { key: keyof MixerSettings; label: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: 'master', label: '音量', min: 0, max: 1.5, step: 0.05 },
  { key: 'dry', label: '原音', min: 0, max: 1.5, step: 0.05 },
  { key: 'wet', label: 'リバーブ量', min: 0, max: 4, step: 0.05 },
  { key: 'duration', label: '残響時間', min: 0.3, max: 15, step: 0.1, unit: '秒' },
  { key: 'preDelay', label: 'プリディレイ', min: 0, max: 0.2, step: 0.005, unit: '秒' },
  { key: 'damping', label: '高域の減衰', min: 0, max: 1, step: 0.05 },
]

const STORAGE_KEY = 'norden-synth:mixer'
const fmt = (v: number) => String(Math.round(v * 1000) / 1000)

export function setupMixer(synth: Synth, root: HTMLElement): void {
  // AudioParam の値は float32 なので丸めておく (プリセットとの比較のため)
  const round = (v: number) => Math.round(v * 1000) / 1000
  const initial: MixerSettings = {
    master: round(synth.master.gain.value),
    dry: round(synth.dry.gain.value),
    wet: round(synth.reverbReturn.gain.value),
    ...synth.reverbSettings,
  }
  let settings = initial
  try {
    settings = { ...initial, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<MixerSettings>) }
  } catch {
    // 保存した設定が読めなければ既定値のまま
  }

  root.innerHTML = `
    <div class="buttons">
      <span class="mixer-title">リバーブ</span>
      ${PRESETS.map((p, i) => `<button data-preset="${i}">${p.name}</button>`).join('')}
    </div>
    <div class="controls">
      ${CONTROLS.map(
        (c) =>
          `<label>${c.label} <input data-key="${c.key}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" /><output></output>${c.unit ?? ''}</label>`,
      ).join('')}
    </div>
  `
  const inputs = new Map(
    [...root.querySelectorAll<HTMLInputElement>('input[data-key]')].map((el) => [el.dataset.key as keyof MixerSettings, el]),
  )

  // インパルス応答の作り直しは重いので、スライダーを動かしている間は間引く
  let reverbTimer: ReturnType<typeof setTimeout> | undefined
  let appliedReverb = synth.reverbSettings
  function apply(immediate: boolean) {
    synth.master.gain.value = settings.master
    synth.dry.gain.value = settings.dry
    synth.reverbReturn.gain.value = settings.wet
    const { duration, preDelay, damping } = settings
    if (duration === appliedReverb.duration && preDelay === appliedReverb.preDelay && damping === appliedReverb.damping) return
    clearTimeout(reverbTimer)
    const update = () => {
      appliedReverb = { duration, preDelay, damping }
      synth.setReverb(appliedReverb)
    }
    if (immediate) update()
    else reverbTimer = setTimeout(update, 150)
  }

  function show() {
    for (const [key, input] of inputs) {
      input.value = String(settings[key])
      ;(input.nextElementSibling as HTMLOutputElement).textContent = fmt(settings[key])
    }
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-preset]')) {
      const p = PRESETS[Number(b.dataset.preset)].settings
      b.classList.toggle('selected', CONTROLS.every((c) => c.key === 'master' || p[c.key] === settings[c.key]))
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // 保存できなくても動作には関係ない
    }
  }

  for (const [key, input] of inputs) {
    input.addEventListener('input', () => {
      settings = { ...settings, [key]: Number(input.value) }
      apply(false)
      show()
      save()
    })
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-preset]')) {
    b.addEventListener('click', () => {
      // 音量はプリセットで変えない
      settings = { ...PRESETS[Number(b.dataset.preset)].settings, master: settings.master }
      apply(true)
      show()
      save()
    })
  }

  apply(true)
  show()
}
