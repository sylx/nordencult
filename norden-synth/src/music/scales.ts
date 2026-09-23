// スケール (旋法) と調。
//
// 音程は主音からの半音数で持つ。マカームの 4 分音は 0.5 刻みの小数で表す
// (Synth は小数のキーをそのままの音程で鳴らす)。

export interface ScaleDef {
  id: string
  name: string
  // 由来や別名
  note: string
  // 主音からの半音数 (昇順、先頭は 0)
  steps: number[]
  // 聴き慣れなさ 0..1。エキゾチック度のパラメータとの近さで選ばれやすさが決まる
  exotic: number
  // そのスケールらしさを出す音 (steps の添字)。和音やメロディで強調する
  color: number[]
}

export const SCALES: ScaleDef[] = [
  // 西洋の旋法
  { id: 'aeolian', name: 'エオリアン', note: '自然短音階', steps: [0, 2, 3, 5, 7, 8, 10], exotic: 0.05, color: [5] },
  { id: 'dorian', name: 'ドリアン', note: 'ケルト・北欧民謡', steps: [0, 2, 3, 5, 7, 9, 10], exotic: 0.15, color: [5] },
  { id: 'mixolydian', name: 'ミクソリディアン', note: '', steps: [0, 2, 4, 5, 7, 9, 10], exotic: 0.15, color: [6] },
  { id: 'phrygian', name: 'フリジアン', note: 'マカーム・クルド', steps: [0, 1, 3, 5, 7, 8, 10], exotic: 0.35, color: [1] },
  { id: 'lydian', name: 'リディアン', note: '', steps: [0, 2, 4, 6, 7, 9, 11], exotic: 0.3, color: [3] },
  { id: 'harmonic-minor', name: '和声的短音階', note: 'マカーム・ナハワンド', steps: [0, 2, 3, 5, 7, 8, 11], exotic: 0.35, color: [5, 6] },
  { id: 'hindu', name: 'ミクソリディアン♭6', note: 'ヒンドゥー', steps: [0, 2, 4, 5, 7, 8, 10], exotic: 0.4, color: [2, 5] },
  { id: 'lydian-dominant', name: 'リディアン・ドミナント', note: '', steps: [0, 2, 4, 6, 7, 9, 10], exotic: 0.45, color: [3, 6] },
  // 中東・東欧・インド
  { id: 'ukrainian-dorian', name: 'ウクライナ・ドリアン', note: 'マカーム・ニクリーズ', steps: [0, 2, 3, 6, 7, 9, 10], exotic: 0.6, color: [2, 3] },
  { id: 'hijaz', name: 'ヒジャーズ', note: 'フリジアン・ドミナント', steps: [0, 1, 4, 5, 7, 8, 10], exotic: 0.6, color: [1, 2] },
  { id: 'neapolitan-minor', name: 'ナポリ短音階', note: '', steps: [0, 1, 3, 5, 7, 8, 11], exotic: 0.6, color: [1, 6] },
  { id: 'hungarian-minor', name: 'ハンガリー短音階', note: 'ジプシー', steps: [0, 2, 3, 6, 7, 8, 11], exotic: 0.75, color: [3, 6] },
  { id: 'double-harmonic', name: 'ダブル・ハーモニック', note: 'ヒジャーズ・カール / ラーガ・バイラヴ', steps: [0, 1, 4, 5, 7, 8, 11], exotic: 0.8, color: [1, 2, 6] },
  { id: 'hungarian-major', name: 'ハンガリー長音階', note: '', steps: [0, 3, 4, 6, 7, 9, 10], exotic: 0.85, color: [1, 3] },
  { id: 'todi', name: 'ラーガ・トーディ', note: '', steps: [0, 1, 3, 6, 7, 8, 11], exotic: 0.9, color: [1, 3] },
  { id: 'marwa', name: 'ラーガ・マールワー', note: '6 音。5 度がない', steps: [0, 1, 4, 6, 9, 11], exotic: 0.9, color: [1, 3] },
  { id: 'persian', name: 'ペルシャ', note: '', steps: [0, 1, 4, 5, 6, 8, 11], exotic: 0.95, color: [1, 4] },
  // 5 音音階
  { id: 'minor-pentatonic', name: '短調の 5 音音階', note: '', steps: [0, 3, 5, 7, 10], exotic: 0.05, color: [4] },
  { id: 'egyptian', name: 'エジプシャン', note: 'サスペンデッド 5 音音階', steps: [0, 2, 5, 7, 10], exotic: 0.25, color: [1] },
  { id: 'hirajoshi', name: '平調子', note: '箏', steps: [0, 2, 3, 7, 8], exotic: 0.55, color: [2, 4] },
  { id: 'in', name: '都節', note: '陰音階', steps: [0, 1, 5, 7, 8], exotic: 0.6, color: [1] },
  { id: 'pelog', name: 'ペロッグ', note: 'ガムラン (12 平均律で近似)', steps: [0, 1, 3, 7, 8], exotic: 0.7, color: [1, 4] },
  { id: 'iwato', name: '岩戸', note: '', steps: [0, 1, 5, 6, 10], exotic: 0.9, color: [1, 3] },
  // 4 分音を含むマカーム
  { id: 'rast', name: 'マカーム・ラースト', note: '4 分音 (中立 3 度・7 度)', steps: [0, 2, 3.5, 5, 7, 9, 10.5], exotic: 0.7, color: [2, 6] },
  { id: 'bayati', name: 'マカーム・バヤーティー', note: '4 分音 (中立 2 度)', steps: [0, 1.5, 3, 5, 7, 8, 10], exotic: 0.75, color: [1] },
  { id: 'saba', name: 'マカーム・サバー', note: '4 分音 (中立 2 度・減 4 度)', steps: [0, 1.5, 3, 4, 7, 8, 10], exotic: 0.95, color: [1, 3] },
]

export const isMicrotonal = (scale: ScaleDef) => scale.steps.some((s) => !Number.isInteger(s))

const NAMES = ['C', 'C#', 'D', 'E♭', 'E', 'F', 'F#', 'G', 'A♭', 'A', 'B♭', 'B']

// ピッチクラスの名前。4 分音は半音上の音名に ↓ を付ける (3.5 → E↓)
export function pitchName(pc: number): string {
  const p = ((pc % 12) + 12) % 12
  if (Number.isInteger(p)) return NAMES[p]
  return `${NAMES[Math.ceil(p) % 12]}↓`
}

const EPS = 1e-6

// 主音 (0..11 の整数) とスケールの組
export class Key {
  readonly scale: ScaleDef
  readonly tonic: number

  constructor(scale: ScaleDef, tonic: number) {
    this.scale = scale
    this.tonic = ((Math.round(tonic) % 12) + 12) % 12
  }

  get size(): number {
    return this.scale.steps.length
  }

  get name(): string {
    return `${pitchName(this.tonic)} ${this.scale.name}`
  }

  // 構成音のピッチクラス
  get pitchClasses(): number[] {
    return this.scale.steps.map((s) => (this.tonic + s) % 12)
  }

  contains(pc: number): boolean {
    const p = ((pc % 12) + 12) % 12
    return this.pitchClasses.some((q) => Math.abs(q - p) < EPS)
  }

  // 通し番号の度数 (0 = MIDI オクターブ -1 の主音) のキー
  keyAt(degree: number): number {
    const n = this.size
    const octave = Math.floor(degree / n)
    return this.tonic + 12 * octave + this.scale.steps[degree - octave * n]
  }

  // キーに対応する通し番号の度数。スケール外なら undefined
  degreeOf(key: number): number | undefined {
    const n = this.size
    const octave = Math.floor((key - this.tonic) / 12)
    for (let i = 0; i < n; i++) {
      if (Math.abs(this.keyAt(octave * n + i) - key) < EPS) return octave * n + i
    }
    return undefined
  }

  // [lo, hi] に入るスケール音を昇順で。filter は度数 (0..size-1) で絞り込む
  keysInRange(lo: number, hi: number, filter?: (degree: number) => boolean): number[] {
    const n = this.size
    const keys: number[] = []
    for (let d = Math.floor((lo - this.tonic) / 12 - 1) * n; ; d++) {
      const k = this.keyAt(d)
      if (k > hi + EPS) break
      if (k >= lo - EPS && (!filter || filter(((d % n) + n) % n))) keys.push(k)
    }
    return keys
  }

  // 範囲内で最も低い主音
  tonicIn(lo: number): number {
    return lo + ((((this.tonic - lo) % 12) + 12) % 12)
  }

  // 2 つの調の遠さ 0..1。構成音の違いが主で、主音が変わると少し足す
  distance(other: Key): number {
    const a = this.pitchClasses
    const b = other.pitchClasses
    const common = a.filter((p) => b.some((q) => Math.abs(p - q) < EPS)).length
    const setDistance = 1 - common / Math.max(a.length, b.length)
    return Math.min(1, setDistance * 0.85 + (this.tonic === other.tonic ? 0 : 0.15))
  }

  equals(other: Key): boolean {
    return this.scale.id === other.scale.id && this.tonic === other.tonic
  }
}
