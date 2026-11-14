// フックと展開案を、同じ句の組み合わせで書くための部品。
// 句（Passage）を並べて試聴用の曲を作り、平行移動は音符を書き直さずに transposePassage で作る。

import { parsePitch, type Song, type SongPart } from '../songs/song.ts'
import { pitchName, type CompositionStudy } from './study.ts'

/** 数小節ぶんの旋律・和声・低音とコード名。4つの配列は同じ長さ（1要素 = 1小節）。 */
export interface Passage {
  chords: string[]
  melody: string[]
  harmony: string[]
  bass: string[]
}

const NOTE = /^[A-G][#b]?-?\d(\+[A-G][#b]?-?\d)*$/
const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

/** 1小節の音符を半音単位で移調する。休符・タイ・ベロシティ・長さはそのまま。 */
export function transposeBar(bar: string, semitones: number): string {
  return bar.split(/(\s+)/).map((token) => {
    const [head, ...rest] = token.split(':')
    if (!NOTE.test(head)) return token
    return [head.split('+').map((p) => pitchName(parsePitch(p) + semitones)).join('+'), ...rest].join(':')
  }).join('')
}

/** コード名（表示用）の根音と分数コードの低音を移調する。'Abmaj7 Bb6/Ab' のように1小節に複数あってもよい。 */
export function transposeChord(name: string, semitones: number): string {
  return name.replace(/(^|[\s/])([A-G][#b]?)/g, (_, before: string, root: string) =>
    before + ROOTS[(((parsePitch(`${root}4`) + semitones) % 12) + 12) % 12])
}

/**
 * 句を旋律・和声・低音・コード名ごと平行移動する。
 * octaves で声部ごとにオクターブを足し引きできる（例: 上へ5半音移して低音だけ1オクターブ下げる { bass: -1 }）。
 */
export function transposePassage(
  passage: Passage, semitones: number, octaves: { melody?: number; harmony?: number; bass?: number } = {},
): Passage {
  const move = (bars: string[], octave = 0) => bars.map((bar) => transposeBar(bar, semitones + octave * 12))
  return {
    chords: passage.chords.map((c) => transposeChord(c, semitones)),
    melody: move(passage.melody, octaves.melody),
    harmony: move(passage.harmony, octaves.harmony),
    bass: move(passage.bass, octaves.bass),
  }
}

export interface SketchDraft {
  id: string
  title: string
  // 調・テンポ・拍子と、この案の音楽的な特徴。画面のカードに出る
  description: string
  tempo: number
  meter: readonly [number, number]
  harmonyGate?: number
  bassGate?: number
  bassInstrument?: 'acoustic-bass' | 'yamaha-grand-piano'
  // 順に並べる句。label と intention はそのまま phrases（形式の区分）になる
  passages: { label: string; intention: string; passage: Passage }[]
  moments?: CompositionStudy['moments']
}

/**
 * 句を順に並べ、ピアノの旋律・ピアノの伴奏・低音の簡潔な編成で試聴できる候補にする。
 * フックは句1つ、展開案は最初の句にフックの Passage をそのまま渡す。
 * 句をまたぐと直前の長さとベロシティを引き継ぐので、各句の最初の音には長さと v を書く。
 */
export function buildSketch(draft: SketchDraft): CompositionStudy {
  const bassInstrument = draft.bassInstrument ?? 'acoustic-bass'
  const parts: SongPart[] = [
    { id: 'melody', label: '主題', instrument: 'yamaha-grand-piano', volume: 0.7, pan: 0.04, velocity: 86, gate: 0.95 },
    { id: 'harmony', label: '和声・伴奏', instrument: 'yamaha-grand-piano', volume: 0.38, pan: 0.14, velocity: 56, gate: draft.harmonyGate ?? 1.1 },
    {
      id: 'bass', label: '低音', instrument: bassInstrument,
      volume: bassInstrument === 'acoustic-bass' ? 0.52 : 0.48, pan: -0.06,
      velocity: bassInstrument === 'acoustic-bass' ? 76 : 68, gate: draft.bassGate ?? 1,
    },
  ]
  let bar = 1
  const phrases = draft.passages.map(({ label, intention, passage }) => {
    const length = passage.chords.length
    if (!length || [passage.melody, passage.harmony, passage.bass].some((p) => p.length !== length))
      throw new Error(`${draft.id}/${label}: passage parts must have the same number of bars`)
    const phrase = { label, from: bar, to: bar + length - 1, intention }
    bar += length
    return phrase
  })
  const all = (pick: (p: Passage) => string[]) => draft.passages.flatMap((x) => pick(x.passage))
  const song: Song = {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    tempo: draft.tempo,
    timeSignature: [draft.meter[0], draft.meter[1]],
    intro: [],
    loop: ['theme'],
    parts,
    sections: [{
      id: 'theme', label: draft.title, chords: all((p) => p.chords),
      parts: { melody: all((p) => p.melody), harmony: all((p) => p.harmony), bass: all((p) => p.bass) },
    }],
  }
  return { song, melodyPart: 'melody', hypothesis: draft.description, phrases, moments: draft.moments ?? [] }
}
