import { compileSong, DRUM_KEYS, parsePitch, type Song } from '../songs/song.ts'

// 小節番号は intro + loop 1 周の並びで 1 始まり。拍は四分音符単位で 0 始まり。
export interface CompositionStudy {
  song: Song
  melodyPart: string
  hypothesis: string
  phrases: { label: string; from: number; to: number; intention: string }[]
  // コード名を解釈するのではなく、指定時点に実在すべき音を検査する。
  // pitches はオクターブ付きで記述するが、比較はピッチクラス。
  moments: { bar: number; beat: number; pitches: string[]; intention: string }[]
}

export interface MelodyEvent {
  at: number
  duration: number
  key: number
  bar: number
}

const EPS = 1e-6
const round = (n: number) => Math.round(n * 1e6) / 1e6
const pc = (n: number) => ((n % 12) + 12) % 12
const pitchNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
export const pitchName = (key: number) => `${pitchNames[pc(key)]}${Math.floor(key / 12) - 1}`

// gate による余韻・音切りを除いて、書かれた音価とタイを調べる。
function writtenScore(song: Song) {
  return compileSong({ ...song, parts: song.parts.map((p) => ({ ...p, gate: 1 })) })
}

function barOffsets(song: ReturnType<typeof compileSong>): number[] {
  const offsets = [0]
  for (const bar of song.bars) offsets.push(offsets.at(-1)! + bar.beats)
  return offsets
}

/** 移調しても同じになる、音程・発音位置・音価の署名。休符の位置も残す。 */
export function motifSignature(events: MelodyEvent[]): string {
  if (!events.length) return ''
  const first = events[0]
  return events.map((e) => `${e.key - first.key}@${round(e.at - first.at)}:${round(e.duration)}`).join(' ')
}

export function inspectMelody(song: Song, partId: string, from = 1, to?: number) {
  const part = song.parts.find((p) => p.id === partId)
  if (!part) throw new Error(`unknown melody part: ${partId}`)
  if (DRUM_KEYS[part.instrument]) throw new Error('melody part must be pitched')
  const compiled = writtenScore(song)
  const end = to ?? compiled.bars.length
  if (!Number.isInteger(from) || !Number.isInteger(end) || from < 1 || end < from || end > compiled.bars.length)
    throw new Error(`invalid bar range: ${from}..${end} (1..${compiled.bars.length})`)
  const offsets = barOffsets(compiled)
  const startBeat = offsets[from - 1]
  const endBeat = offsets[end]
  const events: MelodyEvent[] = []
  let polyphonicOnsets = 0
  let carriedIn = 0
  compiled.bars.forEach((bar, i) => {
    const groups = new Map<number, typeof events>()
    for (const note of bar.notes.get(partId) ?? []) {
      const at = offsets[i] + note.beat
      if (at < startBeat && at + note.duration > startBeat + EPS) carriedIn++
      if (i < from - 1 || i >= end) continue
      const group = groups.get(note.beat) ?? []
      group.push({ at, key: note.key, duration: note.duration, bar: i + 1 })
      groups.set(note.beat, group)
    }
    for (const group of groups.values()) {
      if (group.length > 1) polyphonicOnsets++
      // 既存のオクターブ重複などを調べるときは最高音を仮の旋律として扱う。
      events.push(group.reduce((a, b) => a.key > b.key ? a : b))
    }
  })
  const intervals = events.slice(1).map((e, i) => e.key - events[i].key)
  const repeatedMotifs: { firstBar: number; returnBar: number; transposition: number }[] = []
  const seen = new Map<string, number>()
  for (let i = 0; i + 4 <= events.length; i++) {
    const signature = motifSignature(events.slice(i, i + 4))
    const first = seen.get(signature)
    if (first === undefined) seen.set(signature, i)
    else if (i - first >= 4) repeatedMotifs.push({
      firstBar: events[first].bar, returnBar: events[i].bar, transposition: events[i].key - events[first].key,
    })
  }
  const warnings: string[] = []
  if (!events.length) warnings.push('この範囲には旋律の発音がありません。')
  if (polyphonicOnsets) warnings.push(`${polyphonicOnsets} 箇所に同時発音があります。最高音を仮の旋律として分析しています。`)
  if (carriedIn) warnings.push('範囲外から持ち越すタイがあります。統計は範囲内で発音する音だけです。')
  if (events.length >= 8 && new Set(events.map((e) => round(e.duration))).size === 1)
    warnings.push('音価がすべて同じです。狙った反復か、句読点が欲しいかを試聴してください。')
  const maxLeap = intervals.length ? Math.max(...intervals.map(Math.abs)) : 0
  if (maxLeap > 12) warnings.push('オクターブを超える跳躍があります。歌いにくさが狙いに合うか確認してください。')
  return {
    from, to: end, beats: endBeat - startBeat, events, intervals, polyphonicOnsets,
    range: events.length ? [Math.min(...events.map((e) => e.key)), Math.max(...events.map((e) => e.key))] : [],
    durationKinds: [...new Set(events.map((e) => round(e.duration)))].sort((a, b) => a - b),
    maxLeap, repeatedMotifs, warnings,
  }
}

/**
 * 構成案の旋律のうち、主題の小節をそのまま（同じ音高・発音位置・音価で）再掲している小節の割合。
 * 旋律が発音しない小節は数えない。移調・変形した再現は再掲に数えない。
 */
export function themeReuse(theme: CompositionStudy, study: CompositionStudy): number {
  const bars = (s: CompositionStudy) => writtenScore(s.song).bars
    .map((bar) => (bar.notes.get(s.melodyPart) ?? []).map((n) => `${round(n.beat)}:${round(n.duration)}:${n.key}`).sort().join(' '))
    .filter(Boolean)
  const original = new Set(bars(theme))
  const sung = bars(study)
  return sung.length ? sung.filter((bar) => original.has(bar)).length / sung.length : 0
}

export function reviewStudy(study: CompositionStudy) {
  const { song } = study
  if (!study.hypothesis.trim()) throw new Error(`${song.id}: hypothesis is empty`)
  if (new Set(song.parts.map((p) => p.id)).size !== song.parts.length) throw new Error('duplicate part id')
  if (new Set(song.sections.map((s) => s.id)).size !== song.sections.length) throw new Error('duplicate section id')
  const melody = inspectMelody(song, study.melodyPart)
  if (!melody.events.length || melody.polyphonicOnsets) throw new Error(`${song.id}: study melody must be nonempty and monophonic`)
  if (!study.phrases.length) throw new Error(`${song.id}: phrases are empty`)
  const phrases = study.phrases.map((phrase) => {
    const analysis = inspectMelody(song, study.melodyPart, phrase.from, phrase.to)
    if (!phrase.intention.trim()) throw new Error('phrase intention is empty')
    return { ...phrase, signature: motifSignature(analysis.events), attacks: analysis.events.length }
  })
  const compiled = writtenScore(song)
  const offsets = barOffsets(compiled)
  const pitched = new Set(song.parts.filter((p) => !DRUM_KEYS[p.instrument]).map((p) => p.id))
  const notes = compiled.bars.flatMap((bar, i) => [...bar.notes.entries()].flatMap(([id, ns]) =>
    pitched.has(id) ? ns.map((n) => ({ ...n, at: offsets[i] + n.beat })) : []))
  const moments = study.moments.map((moment) => {
    const bar = compiled.bars[moment.bar - 1]
    if (!Number.isInteger(moment.bar) || !bar || !Number.isFinite(moment.beat) || moment.beat < 0 || moment.beat >= bar.beats)
      throw new Error(`invalid harmonic moment: bar ${moment.bar}, beat ${moment.beat}`)
    if (!moment.pitches.length || !moment.intention.trim()) throw new Error('harmonic moment needs pitches and intention')
    const at = offsets[moment.bar - 1] + moment.beat
    const active = new Set(notes.filter((n) => n.at <= at + EPS && n.at + n.duration > at + EPS).map((n) => pc(n.key)))
    const missing = moment.pitches.filter((p) => !active.has(pc(parsePitch(p))))
    return { ...moment, missing, sounding: [...active].sort((a, b) => a - b).map((p) => pitchNames[p]) }
  })
  return { melody, phrases, moments }
}

