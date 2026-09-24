// プロシージャル BGM の作曲者。Sequencer の conductor とトラックとしてつなぐ。
//
// セクション (既定 8 小節) ごとに調・拍子・盛り上がり・編成を決め、
// 和音は和音の枠ごとに、役割の音符は小節ごとにその場で作る。
// セクション最後の和音の枠に入ったところで次の調を決め、両方の調に含まれる和音 (ピボット) で転調する。
// アーティクル (既定 4 セクション) ごとに伴奏セットを替え、役割を受け持つ奏者を入れ替える。
// ソング (既定 2 アーティクル) の最初のセクションで主題を示し、あとのセクションで同じ拍子・和音・メロディで再現する。
// ソングの頭では乱数と役割の状態をソングの番号から作り直すので、同じソングを繰り返すと同じ音楽になる。
// 繰り返しを終えると次の番号のソングに移る。再現の前とソングの終わりでは、次の調へピボットで転調する。
// 役割は conductor の中で役割の順に作り (対旋律がメロディを参照するため)、奏者のトラックはそれを書き込むだけ。

import type { Channel, ConductorBar, Sequencer, Track } from '../synth/index.ts'
import { chooseArrangement, seatOf, type Arrangement } from './arrangement.ts'
import { NoteWriter, type BarContext, type ChordSpan, type PlayerId, type RoleId, type Section, type WrittenNote } from './context.ts'
import { chooseEnergy, chooseMeter, firstKey, meterBeats, meterGroups, meterLabel, nextKey, transposedKey } from './form.ts'
import { chooseChord, chooseProgression, chordName, progressionLabel, type Chord } from './harmony.ts'
import type { MelodyInfo } from './melody.ts'
import { DEFAULT_PARAMS, type BgmParams } from './params.ts'
import { PLAYER_DEFS, ROLE_DEFS, createRoles, type Role } from './parts.ts'
import { Random } from './random.ts'
import { songTitle } from './title.ts'
import type { Key } from './scales.ts'

// 表示用の、ある小節の状態
export interface BarSnapshot {
  bar: number
  section: number
  barInSection: number
  sectionBars: number
  key: string
  scaleNote: string
  meter: string
  chords: string[]
  // 根音の動かし方
  progression: string
  energy: number
  // ソングの番号 (繰り返しでは同じ) と曲名、何回目の繰り返しか。songRepeats は 0 でずっと
  song: number
  title: string
  songRepeat: number
  songRepeats: number
  sectionInSong: number
  songSections: number
  // 主題を示す・再現するセクションか
  theme?: 'statement' | 'return'
  // ソングの中の何番目のアーティクルか
  article: number
  // アーティクルの中で何番目のセクションか
  sectionInArticle: number
  articleSections: number
  arrangement: string
  // 鳴っている役割と、受け持つ奏者と弾き方 (役割の順)
  roles: { role: RoleId; player: PlayerId; style?: string }[]
  // セクション最後の小節で、次に転調する調
  modulatingTo?: string
  // メロディの句と音型 (リードが休んでいる・編成にないなら undefined)
  melody?: MelodyInfo
}

interface Song {
  number: number
  repeat: number
  repeats: number
  startSection: number
  articles: number
  articleSections: number
  sections: number
  key: Key
  // 最初のセクションの調と拍子が決まったところで付ける
  title: string
  firstArrangement?: Arrangement
  // 主題を示したセクション
  theme?: Section
}

// ソングの中で主題を示す・再現するセクションか。
// 最初のセクションで示し、アーティクルの頭と最後から 2 番目で再現する。最後のセクションは次の頭へのつなぎにする
function themeSlot(song: Song, i: number): boolean {
  if (i === 0) return true
  if (i >= song.sections - 1) return false
  return (song.articleSections >= 2 && i % song.articleSections === 0) || i === song.sections - 2
}

export class Composer {
  // 変更は次の小節 / 次のセクションから反映される (ParamDef.applies)
  params: BgmParams
  private formRng!: Random
  private harmonyRng!: Random
  private arrangementRng!: Random
  private roleRng!: Record<RoleId, Random>
  private roles!: Record<RoleId, Role>
  private seed = 0
  private arrangement!: Arrangement
  private article = { index: -1, startSection: 0, sections: 0 }
  private song?: Song
  // 今のソングの次に鳴らすソング (ソングの最後のセクションで決める)
  private upcoming?: { number: number; repeat: number; key: Key }
  // この小節で各奏者が鳴らす音符
  private written = new Map<PlayerId, WrittenNote[]>()
  private section?: Section
  private next?: Key
  private ctx?: BarContext
  private readonly snapshots = new Map<number, BarSnapshot>()

  constructor(params: Partial<BgmParams> = {}) {
    this.params = { ...DEFAULT_PARAMS, ...params }
    this.reset()
  }

  // params.seed から最初からやり直す。Sequencer.start() の前に呼ぶ
  reset(): void {
    this.seed = this.params.seed
    this.article = { index: -1, startSection: 0, sections: 0 }
    this.song = undefined
    this.upcoming = undefined
    this.written.clear()
    this.section = undefined
    this.next = undefined
    this.ctx = undefined
    this.snapshots.clear()
  }

  // seq の conductor を置き換え、channels にある奏者のトラックを足す
  attach(seq: Sequencer, channels: Partial<Record<PlayerId, Channel>>): Map<PlayerId, Track> {
    seq.conductor = (bar) => this.conduct(bar)
    const tracks = new Map<PlayerId, Track>()
    for (const def of PLAYER_DEFS) {
      const channel = channels[def.id]
      if (!channel) continue
      const track = seq.addTrack(channel, (bar) => {
        if (this.ctx?.index !== bar.index) return
        for (const n of this.written.get(def.id) ?? []) bar.note(n.beat, n.key, n.velocity, n.duration)
      })
      tracks.set(def.id, track)
    }
    return tracks
  }

  snapshot(bar: number): BarSnapshot | undefined {
    return this.snapshots.get(bar)
  }

  private conduct(bar: ConductorBar): void {
    const p = this.params
    if (!this.section || bar.index >= this.section.startBar + this.section.bars) this.startSection(bar.index)
    const s = this.section!
    const barInSection = bar.index - s.startBar
    const beats = meterBeats(s.meter)
    bar.timeSignature = s.meter.timeSignature
    if (barInSection === 0) bar.setTempo(p.tempo)

    const chords = this.chordSpans(s, barInSection, beats)
    const last = barInSection === s.bars - 1
    const modulating = last && this.next !== undefined && !this.next.equals(s.key)
    const song = this.song!
    const sectionInSong = s.index - song.startSection
    // 転調の直前と、ソングの終わりでテンポを落とす
    const songEnd = last && sectionInSong === song.sections - 1
    if ((modulating || songEnd) && p.ritardando > 0) bar.rampTempo(p.tempo * (1 - 0.3 * p.ritardando), 0, beats)

    this.ctx = {
      index: bar.index,
      section: s,
      barInSection,
      beats,
      groups: meterGroups(s.meter),
      chords,
      first: barInSection === 0,
      last,
      nextKey: this.next,
      params: p,
    }

    const roles = ROLE_DEFS.flatMap((d) => {
      const seat = s.roles.has(d.id) ? seatOf(this.arrangement, d.id) : undefined
      return seat ? [seat] : []
    })
    this.written.clear()
    let melody: MelodyInfo | undefined
    const styles = new Map<RoleId, string | undefined>()
    for (const seat of roles) {
      const rng = this.roleRng[seat.role]
      const role = this.roles[seat.role]
      const out = new NoteWriter(rng, p.humanize, seat.gain)
      try {
        role.generate(this.ctx, out, rng, seat)
      } catch (err) {
        console.error(`composer: ${seat.role} failed at bar ${bar.index}`, err)
      }
      this.written.set(seat.player, out.events)
      if (role.melody) melody = role.melody()
      styles.set(seat.role, role.style?.())
    }

    this.snapshots.set(bar.index, {
      bar: bar.index,
      section: s.index,
      barInSection,
      sectionBars: s.bars,
      key: s.key.name,
      scaleNote: s.key.scale.note,
      meter: meterLabel(s.meter),
      chords: chords.map((c) => chordName(s.key, c.chord)),
      progression: progressionLabel(s.progression),
      energy: s.energy,
      song: song.number,
      title: song.title,
      songRepeat: song.repeat,
      songRepeats: song.repeats,
      sectionInSong,
      songSections: song.sections,
      theme: s.theme,
      article: this.article.index,
      sectionInArticle: s.index - this.article.startSection,
      articleSections: this.article.sections,
      arrangement: this.arrangement.name,
      roles: roles.map((seat) => ({ role: seat.role, player: seat.player, style: styles.get(seat.role) })),
      modulatingTo: modulating ? this.next!.name : undefined,
      melody,
    })
    this.snapshots.delete(bar.index - 64)
  }

  private startSection(startBar: number): void {
    const p = this.params
    const prev = this.section
    const index = prev ? prev.index + 1 : 0
    if (!this.song || index - this.song.startSection >= this.song.sections) this.startSong(index)
    const song = this.song!
    const inSong = index - song.startSection
    const rng = this.formRng

    // 主題の再現は、主題と同じ長さになるときだけ (途中でパラメータが変わったら示し直す)
    let theme: Section | undefined
    if (themeSlot(song, inSong) && inSong > 0 && song.theme) {
      const t = song.theme
      if (t.chordBars === p.chordBars && t.bars === this.sectionBars(t.meter)) theme = t
    }
    const statement = themeSlot(song, inSong) && !theme

    const key = inSong === 0 ? song.key : (this.next ?? theme?.key ?? nextKey(prev!.key, p, rng))
    this.next = undefined
    const meter = theme?.meter ?? chooseMeter(inSong === 0 ? undefined : prev?.meter, p, rng)
    const energy = chooseEnergy(inSong === 0 ? undefined : prev?.energy, p, rng)
    if (inSong === 0) song.title = songTitle(this.seed, song.number, key, meter)

    // アーティクルの頭で伴奏セットを替える。ソングの最後のアーティクルは、繰り返しの頭と同じセットを避ける
    if (inSong % song.articleSections === 0) {
      const article = inSong / song.articleSections
      const avoid = article > 0 && article === song.articles - 1 ? song.firstArrangement : undefined
      this.arrangement = chooseArrangement(inSong === 0 ? undefined : this.arrangement, this.arrangementRng, avoid)
      if (inSong === 0) song.firstArrangement = this.arrangement
      this.article = { index: article, startSection: index, sections: song.articleSections }
    }

    // 盛り上がりに応じて編成を決め、ときどき 1 つ抜いて変化をつける。主題のセクションはメロディを必ず入れる
    const roles = new Set<RoleId>()
    for (const def of ROLE_DEFS) {
      const [lo, hi] = def.energy
      if (energy < lo || energy > hi) continue
      if (def.id !== 'bass' && def.id !== 'melody' && rng.chance(0.15)) continue
      roles.add(def.id)
    }
    if (theme || statement) roles.add('melody')

    const bars = theme?.bars ?? this.sectionBars(meter)
    const chordBars = theme?.chordBars ?? p.chordBars
    const total = chordSlots(bars, chordBars)
    this.section = {
      index,
      startBar,
      bars,
      key,
      modulated: prev ? !prev.key.equals(key) : false,
      meter,
      energy,
      chordBars,
      roles,
      theme: theme ? 'return' : statement ? 'statement' : undefined,
      progression: theme?.progression ?? chooseProgression(key, total, p, this.harmonyRng),
      // 再現では最後の和音だけ、次の調へつなぐために選び直す
      chords: theme ? theme.chords.slice(0, total - 1) : [],
    }
    if (statement) song.theme = this.section

    // 次のセクションの調を先に決めておく (最後の和音をピボットにするため)
    if (inSong === song.sections - 1) this.next = this.planUpcoming().key
    else if (themeSlot(song, inSong + 1) && song.theme) {
      const home = song.theme.key
      this.next = inSong + 1 === song.sections - 2 ? home : transposedKey(home, p, rng)
    }
  }

  // 5/8 のような短い小節では、セクションが短くなりすぎないよう小節数を倍にする
  private sectionBars(meter: Section['meter']): number {
    return meterBeats(meter) < 3 ? this.params.sectionBars * 2 : this.params.sectionBars
  }

  // 次のソング。繰り返しが残っていれば同じ番号と調、なければ次の番号で新しい調
  private planUpcoming(): { number: number; repeat: number; key: Key } {
    if (this.upcoming) return this.upcoming
    const s = this.song!
    s.repeats = Math.max(0, Math.round(this.params.songRepeats))
    if (s.repeats === 0 || s.repeat + 1 < s.repeats) this.upcoming = { number: s.number, repeat: s.repeat + 1, key: s.key }
    else this.upcoming = { number: s.number + 1, repeat: 0, key: this.songKey(s.number + 1, s.key) }
    return this.upcoming
  }

  private songKey(number: number, prev?: Key): Key {
    const rng = Random.derive(this.seed, `song${number}:key`)
    return prev ? nextKey(prev, this.params, rng) : firstKey(this.params, rng)
  }

  // ソングの頭。乱数と役割の状態をソングの番号から作り直す
  private startSong(index: number): void {
    const p = this.params
    const next = this.song ? this.planUpcoming() : { number: 0, repeat: 0, key: this.songKey(0) }
    this.upcoming = undefined
    const derive = (name: string) => Random.derive(this.seed, `song${next.number}:${name}`)
    this.formRng = derive('form')
    this.harmonyRng = derive('harmony')
    this.arrangementRng = derive('arrangement')
    this.roleRng = Object.fromEntries(ROLE_DEFS.map((d) => [d.id, derive(d.id)])) as Record<RoleId, Random>
    this.roles = createRoles()
    const articles = Math.max(1, Math.round(p.songArticles))
    const articleSections = Math.max(1, Math.round(p.articleSections))
    this.song = {
      number: next.number,
      repeat: next.repeat,
      repeats: Math.max(0, Math.round(p.songRepeats)),
      startSection: index,
      articles,
      articleSections,
      sections: articles * articleSections,
      key: next.key,
      title: '',
    }
  }

  private chordSpans(s: Section, barInSection: number, beats: number): ChordSpan[] {
    if (s.chordBars >= 1) {
      const cb = s.chordBars
      const slot = Math.floor(barInSection / cb)
      const within = barInSection % cb
      const bars = Math.min(cb, s.bars - slot * cb) - within
      return [{ start: 0, end: beats, length: bars * beats, isNew: within === 0, chord: this.chord(s, slot), next: this.nextChord(s, slot + 1) }]
    }
    // 小節の途中で変わる: 真ん中に最も近いまとまりの頭で分ける
    const starts = meterGroups(s.meter).map((g) => g.start).filter((t) => t > 0)
    const split = starts.reduce((a, b) => (Math.abs(b - beats / 2) < Math.abs(a - beats / 2) ? b : a), starts[0] ?? beats / 2)
    const slot = barInSection * 2
    return [
      { start: 0, end: split, length: split, isNew: true, chord: this.chord(s, slot), next: this.chord(s, slot + 1) },
      { start: split, end: beats, length: beats - split, isNew: true, chord: this.chord(s, slot + 1), next: this.nextChord(s, slot + 2) },
    ]
  }

  // slot 番目の和音の枠の和音。セクションの枠を超えたら undefined
  private nextChord(s: Section, slot: number): Chord | undefined {
    return slot < chordSlots(s.bars, s.chordBars) ? this.chord(s, slot) : undefined
  }

  private chord(s: Section, slot: number): Chord {
    const total = chordSlots(s.bars, s.chordBars)
    const period = s.progression.period
    while (s.chords.length <= slot) {
      const n = s.chords.length
      const final = n === total - 1
      if (final && !this.next) this.next = nextKey(s.key, this.params, this.formRng)
      // 繰り返す進行でも、最後の枠は終止か転調のために選び直す
      if (period && n >= period && !final) {
        s.chords.push(s.chords[n - period])
        continue
      }
      s.chords.push(
        chooseChord(s.key, s.chords[n - 1], this.params, this.harmonyRng, {
          first: n === 0,
          final,
          next: final ? this.next : undefined,
          progression: s.progression,
        }),
      )
    }
    return s.chords[slot]
  }
}

// セクションの和音の枠の数
const chordSlots = (bars: number, chordBars: number) => (chordBars >= 1 ? Math.ceil(bars / chordBars) : bars * 2)
