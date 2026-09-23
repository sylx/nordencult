// テストページのシーケンサのデモ。
// コード進行だけを決めておき、各パートは小節ごとにその場で音符を作る (一部は乱数で変化する)

import { Sequencer, type Channel, type Synth, type TimeSignature, type TrackBar } from './synth/index.ts'

type Chord = { name: string; tones: number[] }

// A マイナー。tones はピッチクラス (0 = C) で、先頭がルート
const CHORDS: Record<string, number[]> = {
  Am: [9, 0, 4],
  F: [5, 9, 0],
  C: [0, 4, 7],
  G: [7, 11, 2],
  Dm: [2, 5, 9],
  E: [4, 8, 11],
}
const PROGRESSION = ['Am', 'F', 'C', 'G', 'F', 'C', 'Dm', 'E']
const PHRASE = PROGRESSION.length
// A ナチュラルマイナー
const SCALE = [9, 11, 0, 2, 4, 5, 7]
// メロディの音域 (音階上の音だけ)
const MELODY_KEYS = [...Array(20).keys()].map((i) => i + 69).filter((k) => SCALE.includes(k % 12))

const TIME_SIGNATURES: TimeSignature[] = [
  [4, 4],
  [3, 4],
  [6, 8],
  [5, 4],
]

interface Part {
  id: string
  label: string
  instrument: string
  volume: number
  pan: number
  muted?: boolean
  generate: (bar: TrackBar, chord: Chord) => void
}

// lo 以上で最も低い、ピッチクラス pc のキー
const above = (pc: number, lo: number) => lo + ((pc - lo) % 12 + 12) % 12

// 前の音に最も近いコードトーン。avoid と同じピッチクラスは避ける
function nearestTone(chord: Chord, prev: number, lo: number, hi: number, avoid?: number): number {
  let best = prev
  let dist = Infinity
  for (let k = lo; k <= hi; k++) {
    if (!chord.tones.includes(k % 12) || (avoid !== undefined && k % 12 === avoid % 12)) continue
    const d = Math.abs(k - prev)
    if (d < dist) [best, dist] = [k, d]
  }
  return best
}

// 強拍ほどベロシティを上げる
function accent(beat: number, base: number): number {
  if (beat === 0) return base + 15
  return Number.isInteger(beat) ? base + 5 : base - 5
}

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]

function createParts(): Part[] {
  let violin = 76
  let viola = 64
  let melody = 76

  return [
    {
      id: 'melody',
      label: 'メロディ (ピアノ)',
      instrument: 'yamaha-grand-piano',
      volume: 0.7,
      pan: 0,
      generate(bar, chord) {
        // 音価をランダムに並べて小節を埋め、音程は音階上の酔歩。小節頭はコードトーンに寄せる
        for (let beat = 0; beat < bar.beats; ) {
          const length = Math.min(pick([0.5, 0.5, 1, 1, 1.5, 2]), bar.beats - beat)
          if (beat === 0) {
            melody = nearestTone(chord, melody, 69, 88)
          } else {
            const i = Math.max(0, MELODY_KEYS.indexOf(melody))
            const step = pick([-2, -1, -1, 1, 1, 2])
            melody = MELODY_KEYS[Math.max(0, Math.min(MELODY_KEYS.length - 1, i + step))]
          }
          // ドミナント (E) の上では G ではなく G# にする
          const key = chord.name === 'E' && melody % 12 === 7 ? melody + 1 : melody
          if (beat === 0 || Math.random() > 0.15) bar.note(beat, key, accent(beat, 80), length * 0.95)
          beat += length
        }
      },
    },
    {
      id: 'violin',
      label: 'バイオリン',
      instrument: 'violin',
      volume: 0.55,
      pan: -0.35,
      generate(bar, chord) {
        violin = nearestTone(chord, violin, 67, 81)
        bar.note(0, violin, 70, bar.beats)
      },
    },
    {
      id: 'viola',
      label: 'ビオラ',
      instrument: 'viola',
      volume: 0.55,
      pan: 0.1,
      generate(bar, chord) {
        viola = nearestTone(chord, viola, 57, 69, violin)
        bar.note(0, viola, 70, bar.beats)
      },
    },
    {
      id: 'cello',
      label: 'チェロ',
      instrument: 'cello',
      volume: 0.6,
      pan: 0.3,
      generate(bar, chord) {
        const split = bar.beats >= 4 ? bar.beats / 2 : bar.beats - 1
        bar.note(0, above(chord.tones[0], 43), 80, split)
        bar.note(split, above(chord.tones[2], 43), 72, bar.beats - split)
      },
    },
    {
      id: 'contrabass',
      label: 'コントラバス',
      instrument: 'contrabass',
      volume: 0.8,
      pan: 0.4,
      generate(bar, chord) {
        bar.note(0, above(chord.tones[0], 28), 85, bar.beats)
      },
    },
    {
      id: 'pizzicato',
      label: 'ピチカート',
      instrument: 'pizzicato-section',
      volume: 0.6,
      pan: -0.15,
      generate(bar, chord) {
        // 8 分音符のアルペジオ。音型は小節ごとに選ぶ
        const shape = pick([
          [0, 1, 2, 1],
          [0, 2, 1, 2],
          [0, 1, 2, 3],
          [2, 1, 0, 1],
        ])
        const tones = [...chord.tones, chord.tones[0]].map((pc, i) => above(pc, 55) + (i === 3 ? 12 : 0))
        tones.sort((a, b) => a - b)
        for (let i = 0; i * 0.5 < bar.beats; i++) {
          const beat = i * 0.5
          bar.note(beat, tones[shape[i % shape.length]], accent(beat, 70), 0.4)
        }
      },
    },
    {
      id: 'harp',
      label: 'ハープ',
      instrument: 'harp',
      volume: 0.7,
      pan: 0.25,
      generate(bar, chord) {
        // 2 小節に 1 回、16 分音符で駆け上がる
        if (bar.index % 2 !== 0) return
        const keys: number[] = []
        for (let k = 57; keys.length < 8; k++) if (chord.tones.includes(k % 12)) keys.push(k)
        keys.forEach((k, i) => bar.note(i * 0.25, k, 75 - i * 2, bar.beats - i * 0.25))
      },
    },
    {
      id: 'timpani',
      label: 'ティンパニ',
      instrument: 'timpani',
      volume: 0.8,
      pan: 0,
      generate(bar, chord) {
        const root = above(chord.tones[0], 40)
        if (bar.index % 4 === 0) bar.note(0, root, 100, 1)
        // フレーズの最後の拍はロール
        if (bar.index % PHRASE === PHRASE - 1) {
          const from = bar.beats - 1
          for (let i = 0; i < 8; i++) bar.note(from + i / 8, root, 60 + i * 6, 0.2)
        }
      },
    },
    {
      id: 'choir',
      label: 'クワイア',
      instrument: 'ahh-choir',
      volume: 0.5,
      pan: 0,
      muted: true,
      generate(bar, chord) {
        for (const pc of chord.tones) bar.note(0, above(pc, 55), 60, bar.beats)
      },
    },
  ]
}

export function setupSequencerDemo(synth: Synth, root: HTMLElement): void {
  const parts = createParts()
  const seq = new Sequencer(synth.ctx, { tempo: 84 })
  let chord: Chord = { name: PROGRESSION[0], tones: CHORDS[PROGRESSION[0]] }
  let baseTempo = seq.tempo
  let ritardando = true
  let ramped = false

  // 小節ごとに最初に呼ばれる。コードとテンポを決める
  seq.conductor = (bar) => {
    const name = PROGRESSION[bar.index % PHRASE]
    chord = { name, tones: CHORDS[name] }
    if (ramped) {
      bar.setTempo(baseTempo)
      ramped = false
    }
    if (ritardando && bar.index % PHRASE === PHRASE - 1) {
      bar.rampTempo(baseTempo * 0.75, 0, bar.beats)
      ramped = true
    }
  }

  root.innerHTML = `
    <div class="buttons">
      <button id="seq-play">再生</button>
      <button id="seq-stop" class="stop">停止</button>
      <span id="seq-position" class="info"></span>
    </div>
    <div class="controls">
      <label>テンポ <input id="seq-tempo" type="range" min="40" max="180" value="${baseTempo}" /><output>${baseTempo}</output></label>
      <label>拍子
        <select id="seq-ts">${TIME_SIGNATURES.map((ts, i) => `<option value="${i}">${ts[0]}/${ts[1]}</option>`).join('')}</select>
      </label>
      <label><input id="seq-rit" type="checkbox" ${ritardando ? 'checked' : ''} /> フレーズ末でリタルダンド</label>
    </div>
    <div id="seq-parts" class="controls"></div>
    <p class="hint">拍子の変更は次の小節から、テンポとパートの切り替えは約 ${seq.lookahead} 秒の先読み分遅れて反映されます</p>
  `
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!
  const position = $('#seq-position')

  const partList = $('#seq-parts')
  const muted = new Map(parts.map((p) => [p.id, p.muted ?? false]))
  for (const part of parts) {
    const label = document.createElement('label')
    label.innerHTML = `<input type="checkbox" ${muted.get(part.id) ? '' : 'checked'} /> ${part.label}`
    label.querySelector('input')!.addEventListener('change', (e) => {
      muted.set(part.id, !(e.target as HTMLInputElement).checked)
      const track = tracks.get(part.id)
      if (track) track.muted = muted.get(part.id)!
    })
    partList.append(label)
  }

  let loading: Promise<void> | undefined
  const tracks = new Map<string, ReturnType<Sequencer['addTrack']>>()
  function load(): Promise<void> {
    loading ??= Promise.all(parts.map((p) => synth.loadInstrument(p.instrument))).then((instruments) => {
      parts.forEach((part, i) => {
        const channel: Channel = synth.createChannel(instruments[i])
        channel.volume = part.volume
        channel.pan = part.pan
        const track = seq.addTrack(channel, (bar) => part.generate(bar, chord))
        track.muted = muted.get(part.id)!
        tracks.set(part.id, track)
      })
    })
    loading.catch(() => (loading = undefined))
    return loading
  }

  $('#seq-play').addEventListener('click', async () => {
    position.textContent = '音色を読み込み中…'
    position.classList.remove('error')
    try {
      await synth.resume()
      await load()
    } catch (err) {
      position.textContent = `読み込みに失敗: ${err}`
      position.classList.add('error')
      return
    }
    ramped = false
    seq.start()
  })
  $('#seq-stop').addEventListener('click', () => seq.stop())

  const tempo = $<HTMLInputElement>('#seq-tempo')
  tempo.addEventListener('input', () => {
    baseTempo = Number(tempo.value)
    seq.tempo = baseTempo
    ;(tempo.nextElementSibling as HTMLOutputElement).textContent = tempo.value
  })
  const ts = $<HTMLSelectElement>('#seq-ts')
  ts.addEventListener('change', () => (seq.timeSignature = TIME_SIGNATURES[Number(ts.value)]))
  const rit = $<HTMLInputElement>('#seq-rit')
  rit.addEventListener('change', () => (ritardando = rit.checked))

  function update() {
    const pos = seq.position()
    if (pos) {
      const [n, d] = pos.timeSignature
      const name = PROGRESSION[pos.bar % PHRASE]
      position.textContent =
        `小節 ${pos.bar + 1} · ${(Math.max(0, pos.beat) + 1).toFixed(1)} 拍目 · ${n}/${d} · ` +
        `♩=${pos.tempo.toFixed(0)} · ${name}` +
        (seq.droppedNotes > 0 ? ` · 間に合わなかった音符 ${seq.droppedNotes}` : '')
    } else if (!seq.playing && position.textContent?.startsWith('小節')) {
      position.textContent = ''
    }
    requestAnimationFrame(update)
  }
  update()
}
