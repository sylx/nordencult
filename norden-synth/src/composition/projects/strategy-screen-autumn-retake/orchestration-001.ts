import type { Song, SongPart, SongSection } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { birchStructures, CHORDS, type Voicing } from './structure-001.ts'

// 「白樺の稜線 — 秋霜の対比と夕照の再現」(autumn-retake-struct-birch-frost-reprise) の管弦楽編曲 01。
// 部分の並び（A 16 – B 8 – A′ 8 = 32小節）・旋律・和声は構成案のまま保ち、
// 管弦楽の豊かな色彩、音の厚み、強弱で実りの攻勢への期待と冬への緊張感を描き分ける。
//
// A (1–16): バイオリンの澄んだ歌とハープの波。5小節目からフルートとホルンが加わり光が射す。
//           16小節目の終止はBbmaj9の9度(C6)をハープとトライアングルでオシャレに開いてBへ渡す。
// B (17–24): ハープとフルートが引き、チェロが1オクターブ下でト短調の哀愁ある歌を朗々と歌う。
//            ピチカートが8分で刻み、21小節目からバイオリンが合流。24小節目のティンパニロールで山場へ。
// A′ (25–32): 全奏（トゥッティ）による雄大な再現。フルートとバイオリンの斉奏、26小節目のF6に大太鼓とシンバル。
//            最後はBbmaj9の長3度音(D6)の上でフルートとハープが澄んだ余韻を残し、トライアングルで静かに結ぶ。

const structure = birchStructures[0]
const [secA, secB, secA_prime] = structure.song.sections
if (!secA || !secB || !secA_prime) throw new Error('sections missing from autumn-retake-struct-birch-frost-reprise')

const shift = (bar: string, octaves: number) =>
  bar.replace(/([A-G][#b]?)(-?\d)/g, (_, p: string, o: string) => `${p}${Number(o) + octaves}`)

const dyn = (bar: string, delta: number) =>
  bar.replace(/v(\d+)/g, (_, v: string) => `v${Math.max(1, Math.min(127, Number(v) + delta))}`)

const blank = (count: number) => Array.from({ length: count }, () => '')

const only = (bars: string[], from: number, to: number) =>
  bars.map((bar, i) => (i + 1 >= from && i + 1 <= to ? bar : ''))

const chordV = (chordName: string): Voicing => {
  const c = CHORDS[chordName]
  if (!c) throw new Error(`unknown chord: ${chordName}`)
  return c.v
}

const chordBass = (chordName: string): readonly [string, string] => {
  const c = CHORDS[chordName]
  if (!c) throw new Error(`unknown chord: ${chordName}`)
  return c.bass
}

// 伴奏テクスチャ（4/4: 8分の波）
const wave44 = (chords: string[], octaves = 0) =>
  chords.map((name) => {
    const v = chordV(name)
    const shifted = shift(
      `v56 ${v[0]}:.5 v48 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5 ${v[2]}:.5 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5`,
      octaves,
    )
    return shifted
  })

// 和音の指定音を保持するパッド
const padChord = (chords: string[], pick: (v: Voicing) => string, velocity: number, octaves = 0) =>
  chords.map((name) => {
    const v = chordV(name)
    return `v${velocity} ${shift(pick(v), octaves)}:4`
  })

// 構成案に沿ったベースライン（drive）
const bassLine = (chords: string[], velocity: number, octaves = 0) =>
  chords.map((name) => {
    const [root, fifth] = chordBass(name)
    return `v${velocity} ${shift(`${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`, octaves)}`
  })

// ピチカート刻み（8分音符で和音を刻む）
const pizzPulse = (chords: string[], octaves = 0) =>
  chords.map((name) => {
    const v = chordV(name)
    const stack = `${v[0]}+${v[1]}+${v[2]}`
    return shift(`v58 ${stack}:.5 v46 ${stack}:.5 ${stack}:.5 ${stack}:.5 v54 ${stack}:.5 v46 ${stack}:.5 ${stack}:.5 ${stack}:.5`, octaves)
  })

// ハープのアルペジオ（下から1回転がして伸ばす）
const rolledHarp = (chords: string[], octaves = 0) =>
  chords.map((name) => {
    const v = chordV(name)
    return shift(`v60 ${v[0]}:.5 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:2.5`, octaves)
  })

// ティンパニのロール
const timpRoll = (pitch: string, beats: number, from: number, to: number) => {
  const count = Math.round(beats / 0.25)
  return Array.from(
    { length: count },
    (_, i) => `v${Math.round(from + ((to - from) * i) / (count - 1))} ${pitch}:.25`,
  ).join(' ')
}

// ------------------------------------------
// セクションごとの管弦楽パート
// ------------------------------------------

const sectionA: SongSection = {
  id: 'A',
  label: 'A 主題提示（バイオリン、5小節目からフルートとホルン、16小節目のオシャレな余韻）',
  chords: secA.chords,
  parts: {
    vn1: secA.parts.melody.map((m, i) => (i < 12 ? dyn(m, -2) : dyn(m, 0))),
    fl: [
      ...blank(4),
      ...secA.parts.melody.slice(4, 12).map((m) => dyn(shift(m, 1), -8)),
      ...padChord(secA.chords.slice(12, 15), (v) => v[3], 54, 1),
      `v70 ${shift('D6', 1)}:4`, // 16小節目: 1オクターブ上でフルートがそっと舞う
    ],
    hn: [
      ...blank(4),
      ...padChord(secA.chords.slice(4, 12), (v) => `${v[0]}+${v[2]}`, 48),
      ...padChord(secA.chords.slice(12, 16), (v) => `${v[0]}+${v[1]}`, 52),
    ],
    vn2: padChord(secA.chords, (v) => v[2], 44),
    va: padChord(secA.chords, (v) => v[1], 44),
    vc: bassLine(secA.chords, 58, 1),
    cb: bassLine(secA.chords, 64),
    harp: [
      ...wave44(secA.chords.slice(0, 15)),
      rolledHarp([secA.chords[15]])[0], // 16小節目: ハープが綺麗に転がる
    ],
    perc: [
      ...blank(15),
      'v40 tri:4', // 16小節目のトニックでチーンと澄んだトライアングル
    ],
  },
}

const sectionB: SongSection = {
  id: 'B',
  label: 'B 秋霜の対比（チェロの歌とピチカート、21小節目からバイオリン、ティンパニロール）',
  chords: secB.chords,
  parts: {
    vc: [
      ...secB.parts.melody.slice(0, 4).map((m) => shift(m, -1)),
      ...secB.parts.melody.slice(4).map((m) => dyn(shift(m, -1), 4)),
    ],
    vn1: [
      ...blank(4),
      ...secB.parts.melody.slice(4).map((m) => dyn(m, 2)), // 21小節目から合流
    ],
    pizz: pizzPulse(secB.chords),
    hn: only(padChord(secB.chords, (v) => `${v[0]}+${v[2]}`, 56), 3, 8),
    vn2: padChord(secB.chords, (v) => v[3], 46),
    va: padChord(secB.chords, (v) => v[1], 46),
    cb: bassLine(secB.chords, 66),
    timp: [
      'v64 G1:2 r:2',
      '',
      'v66 C2:2 r:2',
      'v68 D2:2 r:2',
      'v70 G1:2 r:2',
      '',
      '',
      timpRoll('D2', 4, 40, 96), // 24小節目: 山場へ向けて力強いロール！
    ],
  },
}

const sectionA_prime: SongSection = {
  id: 'A_prime',
  label: 'A′ 夕照の再現と結尾（全奏の山場、大太鼓とシンバル、澄明な終止）',
  chords: secA_prime.chords,
  parts: {
    fl: secA_prime.parts.melody.map((m, i) => (i < 4 ? dyn(m, 4) : dyn(m, 0))),
    vn1: secA_prime.parts.melody.map((m, i) => (i < 4 ? dyn(m, 4) : dyn(m, 0))),
    vn2: [
      ...secA_prime.parts.melody.slice(0, 4).map((m) => shift(m, -1)),
      ...padChord(secA_prime.chords.slice(4), (v) => v[3], 50),
    ],
    va: padChord(secA_prime.chords, (v) => `${v[1]}+${v[2]}`, 56),
    hn: [
      ...padChord(secA_prime.chords.slice(0, 4), (v) => `${v[0]}+${v[2]}`, 68),
      ...padChord(secA_prime.chords.slice(4), (v) => `${v[0]}+${v[2]}`, 52),
    ],
    harp: [
      ...wave44(secA_prime.chords.slice(0, 4), 1),
      ...wave44(secA_prime.chords.slice(4, 7)),
      rolledHarp([secA_prime.chords[7]])[0],
    ],
    vc: [
      ...bassLine(secA_prime.chords.slice(0, 4), 74, 1),
      ...bassLine(secA_prime.chords.slice(4), 60, 1),
    ],
    cb: [
      ...bassLine(secA_prime.chords.slice(0, 4), 78),
      ...bassLine(secA_prime.chords.slice(4), 66),
    ],
    timp: [
      '',
      'v92 Bb1:2 r:2', // 26小節目: 最高音F6と同時にティンパニ
      '',
      'v72 C2:2 r:2',
      '',
      'v76 F1:2 r:2',
      '',
      '',
    ],
    perc: [
      '',
      'v84 bd+cym:4', // 26小節目: 大太鼓とシンバルで山場を強調！
      '',
      '',
      '',
      '',
      '',
      'v36 tri:4', // 32小節目の結尾: 遠い白樺林に鳴るトライアングル
    ],
  },
}

// ------------------------------------------
// 楽器編成の定義
// ------------------------------------------

const parts: SongPart[] = [
  { id: 'vn1', label: 'バイオリン I', instrument: 'violin', volume: 0.54, pan: -0.3, velocity: 82, gate: 0.95 },
  { id: 'fl', label: 'フルート', instrument: 'flute', volume: 0.5, pan: -0.12, velocity: 82, gate: 0.94 },
  { id: 'hn', label: 'ホルン', instrument: 'french-horns', volume: 0.46, pan: -0.24, velocity: 62, gate: 0.97 },
  { id: 'vn2', label: 'バイオリン II', instrument: 'violin', volume: 0.36, pan: -0.16, velocity: 56, gate: 0.98 },
  { id: 'va', label: 'ビオラ', instrument: 'viola', volume: 0.4, pan: 0.12, velocity: 56, gate: 0.98 },
  { id: 'vc', label: 'チェロ', instrument: 'cello', volume: 0.52, pan: 0.22, velocity: 70, gate: 0.97 },
  { id: 'cb', label: 'コントラバス', instrument: 'contrabass', volume: 0.54, pan: 0.34, velocity: 70, gate: 0.95 },
  { id: 'pizz', label: 'ピチカート', instrument: 'pizzicato-section', volume: 0.44, pan: -0.2, velocity: 64, gate: 0.65 },
  { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.46, pan: 0.26, velocity: 60, gate: 1.3 },
  { id: 'timp', label: 'ティンパニ', instrument: 'timpani', volume: 0.44, pan: 0, velocity: 70, gate: 0.95 },
  { id: 'perc', label: '打楽器', instrument: 'orchestra-kit', volume: 0.36, pan: 0, velocity: 60, gate: 1 },
]

const song: Song = {
  id: 'autumn-retake-birch-frost-reprise-orchestral',
  title: '白樺の稜線 — 秋霜の対比と夕照の再現（管弦楽）',
  description:
    '変ロ長調 · ♩=124 · 4/4 · 32小節。構成案「白樺の稜線 — 秋霜の対比と夕照の再現」の並び・旋律・和声のまま管弦楽に編曲。Aはバイオリンの澄んだ歌とハープの波、5小節目からフルートとホルン。16小節目はBbmaj9の9度(C6)をハープとトライアングルでオシャレに保つ。Bはチェロが1オクターブ下でト短調の歌を受け持ち、ピチカートが刻む。24小節目のティンパニロールから、A′は全奏の雄大な再現で最高音F6（大太鼓・シンバル）。最後はBbmaj9の長3度音(D6)の上でトライアングルが静かに響いてループへ結ぶ',
  tempo: 124,
  timeSignature: [4, 4],
  intro: [],
  loop: ['A', 'B', 'A_prime'],
  parts,
  sections: [sectionA, sectionB, sectionA_prime],
}

export const birchOrchestrations: CompositionStudy[] = [
  {
    song,
    melodyPart: 'vn1',
    hypothesis: song.description,
    phrases: [
      {
        label: 'A 主題提示',
        from: 1,
        to: 16,
        intention: 'バイオリンとハープの波で主題を提示。5小節目からフルートとホルンが加わり、16小節目をBbmaj9の9度C6でオシャレに開く。',
      },
      {
        label: 'B 秋霜の対比（ト短調）',
        from: 17,
        to: 24,
        intention: 'チェロが1オクターブ下でト短調の歌を歌い、ピチカートが刻んで冬への緊張感を描く。24小節目のティンパニロールで山場へ導く。',
      },
      {
        label: 'A′ 夕照の再現と結尾',
        from: 25,
        to: 32,
        intention: 'フルートとバイオリンの斉奏による全奏の再現。26小節目の最高音F6に大太鼓とシンバル。最後はBbmaj9の3度音D6で澄んだ余韻を残す。',
      },
    ],
    moments: [
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'C6'], intention: '16小節目終止のBbmaj9の9度C6とトライアングルの余韻' },
      { bar: 17, beat: 0, pitches: ['G1', 'D4'], intention: 'チェロが1オクターブ下でト短調の歌を歌い出し、ピチカートがGm9を刻む' },
      { bar: 24, beat: 3.75, pitches: ['D2'], intention: 'ティンパニのロール（D2）が山場へ極まる' },
      { bar: 26, beat: 0, pitches: ['D2', 'D4', 'F6'], intention: '最高山場 F6（フルートとバイオリンの斉奏）と大太鼓・シンバル' },
      { bar: 32, beat: 0, pitches: ['Bb1', 'D4', 'D6'], intention: 'Bbmaj9の3度D6でオシャレなテンションの余韻を残してループへ' },
    ],
  },
]
