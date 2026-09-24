// LLM が書いた曲の形式と、それを小節ごとの音符に展開する処理。
//
// 曲はセクションの並びで、各セクションはパートごとに 1 小節 1 文字列で音符を書く。
// 小節の文字列は空白区切りのトークンの並び:
//   A4:1.5      音名 + オクターブ (C4 = 60) と長さ (拍、四分音符 = 1)。# と b も使える
//   D4+F4+A4:4  + でつなぐと和音
//   r:1         休符
//   -:2         直前の音符 (和音) を伸ばす。小節をまたいでつなぐときに使う
//   v90         以降のベロシティ。セクションの頭でパートの既定値に戻る
// 長さは 0.5 / .5 / 1/3 のように書く。省略すると同じパートの直前の長さになる。
// 空文字列はその小節全体の休み。各小節の長さの合計は拍子とちょうど一致しなければならない。

import type { TimeSignature } from '../synth/index.ts'

export interface SongPart {
  id: string
  label: string
  // public/instruments の楽器 id
  instrument: string
  volume: number
  pan: number
  // v を書いていないときのベロシティ。既定 80
  velocity?: number
  // 書いた長さのうち実際に鳴らす割合。1 を超えると次の音に重ねて響かせる。既定 0.95
  gate?: number
}

export interface SongSection {
  id: string
  label: string
  // 小節ごとのコード名 (表示用)。1 小節に 2 つあるときは空白で区切る
  chords: string[]
  // パート id ごとの小節の並び。長さは chords と同じ。書いていないパートは休み
  parts: Record<string, string[]>
  // 最後の小節でテンポをこの倍率まで落とす (0.9 など)
  ritardando?: number
}

export interface Song {
  id: string
  title: string
  // 調や雰囲気などの説明
  description: string
  // 四分音符/分
  tempo: number
  timeSignature?: TimeSignature
  parts: SongPart[]
  sections: SongSection[]
  // 最初に一度だけ演奏するセクション
  intro: string[]
  // intro の後に繰り返すセクション
  loop: string[]
}

export interface SongNote {
  // 小節頭からの拍
  beat: number
  key: number
  velocity: number
  duration: number
}

export interface SongBar {
  section: SongSection
  barInSection: number
  chord: string
  // パート id → この小節で始まる音符
  notes: Map<string, SongNote[]>
}

export interface CompiledSong {
  song: Song
  beatsPerBar: number
  // intro と loop を 1 回ずつ並べた小節
  bars: SongBar[]
  introBars: number
}

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function parsePitch(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name)
  if (!m) throw new Error(`invalid pitch: ${name}`)
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return (Number(m[3]) + 1) * 12 + PITCH_CLASS[m[1]] + accidental
}

function parseDuration(text: string): number {
  const m = /^(\d+)\/(\d+)$/.exec(text)
  const v = m ? Number(m[1]) / Number(m[2]) : /^(\d+(\.\d*)?|\.\d+)$/.test(text) ? Number(text) : NaN
  if (!(v > 0)) throw new Error(`invalid duration: ${text}`)
  return v
}

// 伸ばせるように、長さを後から書き換える
interface PendingNote extends SongNote {
  bar: number
}

export function compileSong(song: Song): CompiledSong {
  const [n, d] = song.timeSignature ?? [4, 4]
  const beatsPerBar = (n * 4) / d
  const sections = new Map(song.sections.map((s) => [s.id, s]))
  const partIds = new Set(song.parts.map((p) => p.id))
  const order = [...song.intro, ...song.loop].map((id) => {
    const s = sections.get(id)
    if (!s) throw new Error(`${song.id}: unknown section ${id}`)
    return s
  })
  if (song.loop.length === 0) throw new Error(`${song.id}: loop is empty`)

  const bars: SongBar[] = []
  for (const section of order) {
    for (const [id, list] of Object.entries(section.parts)) {
      if (!partIds.has(id)) throw new Error(`${song.id}/${section.id}: unknown part ${id}`)
      if (list.length !== section.chords.length)
        throw new Error(`${song.id}/${section.id}/${id}: ${list.length} bars, expected ${section.chords.length}`)
    }
    section.chords.forEach((chord, i) => bars.push({ section, barInSection: i, chord, notes: new Map() }))
  }

  for (const part of song.parts) {
    const gate = part.gate ?? 0.95
    const notes: PendingNote[] = []
    let last: PendingNote[] = []
    let duration = 1
    let velocity = part.velocity ?? 80
    bars.forEach((bar, index) => {
      const where = `${song.id}/${bar.section.id}/${part.id} bar ${bar.barInSection + 1}`
      if (bar.barInSection === 0) {
        velocity = part.velocity ?? 80
        last = []
      }
      const text = bar.section.parts[part.id]?.[bar.barInSection] ?? ''
      let beat = 0
      for (const token of text.split(/\s+/).filter(Boolean)) {
        try {
          if (/^v\d+$/.test(token)) {
            velocity = Math.min(127, Number(token.slice(1)))
            continue
          }
          const [head, len, ...rest] = token.split(':')
          if (rest.length > 0) throw new Error(`invalid token: ${token}`)
          if (len !== undefined) duration = parseDuration(len)
          if (head === 'r') {
            last = []
          } else if (head === '-') {
            if (last.length === 0) throw new Error('nothing to extend')
            for (const note of last) note.duration += duration
          } else {
            last = head.split('+').map((p) => ({ bar: index, beat, key: parsePitch(p), velocity, duration }))
            notes.push(...last)
          }
          beat += duration
        } catch (err) {
          throw new Error(`${where}: ${(err as Error).message}`)
        }
      }
      if (text.trim() === '') beat = beatsPerBar
      if (Math.abs(beat - beatsPerBar) > 1e-6) throw new Error(`${where}: ${beat} beats, expected ${beatsPerBar}`)
    })
    for (const { bar, ...note } of notes) {
      const list = bars[bar].notes.get(part.id) ?? []
      list.push({ ...note, duration: note.duration * gate })
      bars[bar].notes.set(part.id, list)
    }
  }

  return { song, beatsPerBar, bars, introBars: song.intro.reduce((sum, id) => sum + sections.get(id)!.chords.length, 0) }
}

// 再生中の小節番号 (0 から) に対応する小節。loop が false なら 1 回演奏したところで終わる
export function barAt(compiled: CompiledSong, index: number, loop: boolean): SongBar | undefined {
  const { bars, introBars } = compiled
  if (index < bars.length) return bars[index]
  if (!loop) return undefined
  return bars[introBars + ((index - introBars) % (bars.length - introBars))]
}
