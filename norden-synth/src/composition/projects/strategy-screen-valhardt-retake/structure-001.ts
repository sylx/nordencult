import { buildSketch, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { northernLegionDevelopments } from './themes-001.ts'

// 戦略画面BGMその7「ヴァルハルト家（再」 — 構成案 01。
// 派生元: valhardt2-theme-northern-home-modal（「北方軍団の行進 — 主調のまま bII（Fmaj7）の陰りで深める」）。
// 主題と同じ簡潔な編成（ピアノ旋律・ピアノ和声・アコースティックベース）で、
// 形式（部分の並びと長さ）、対比部の調・和声・リズム、山場の位置が大きく異なる 3 案を構成する。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

const stride44 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:1 v46 ${c}:1 v54 ${c}:1 v46 ${c}:1`
}

const pulse44 = (v: Voicing) => {
  const c = ch(v)
  return `v56 ${c}:.5 v44 ${c}:.5 ${c}:.5 ${c}:.5 v52 ${c}:.5 v44 ${c}:.5 ${c}:.5 ${c}:.5`
}

const tresillo44 = (v: Voicing) => `v58 ${ch(v)}:1.5 v48 ${ch(v)}:1.5 v54 ${ch(v)}:1`

const cycle44 = (v: Voicing) =>
  `v52 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v48 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v48 ${v[0]}:.5 v44 ${v[1]}:.5`

const offbeat44 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v52 ${c}:.5 r:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 r:.5 v46 ${c}:.5`
}

const driveBass = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`
const pedalBounce = (low: string, high: string) => `${low}:1.5 ${low}:.5 ${low}:1 ${high}:1`
const halfBass = (a: string, b: string) => `${a}:2 ${b}:2`
const tresilloBass = (a: string, b: string, c: string) => `${a}:1.5 ${b}:1.5 ${c}:1`

// 選ばれた主題（16小節）をそのまま Passage として取り出す
const selectedThemeSection = northernLegionDevelopments[3].song.sections[0]
const themePassage: Passage = {
  chords: selectedThemeSection.chords,
  melody: selectedThemeSection.parts.melody,
  harmony: selectedThemeSection.parts.harmony,
  bass: selectedThemeSection.parts.bass,
}

// ==========================================
// 案1: Intro–A–B（嬰ハ短調の陰り）–A′（高音山場）–Coda（34小節）
// ==========================================

const archIntro: Passage = {
  chords: ['Em(add9)', 'Dadd9/E'],
  melody: [
    'r:4',
    'r:2 v84 B4:1 D5:1',
  ],
  harmony: [
    tresillo44(['G3', 'B3', 'F#4']),
    tresillo44(['A3', 'D4', 'E4']),
  ],
  bass: [
    pedalBounce('E2', 'E3'),
    pedalBounce('E2', 'B2'),
  ],
}

const archBCSharpMinor: Passage = {
  chords: ['C#m(add9)', 'Amaj7', 'F#m7', 'G#sus4', 'C#m(add9)', 'Badd9', 'Amaj7', 'Bsus4'],
  melody: [
    'v86 G#4:2 v84 B4:1.5 C#5:.5',
    'v90 E5:2 v86 D#5:2',
    'v88 C#5:2 v84 A4:1.5 B4:.5',
    'v90 C#5:2 v86 D#5:2',
    'v88 E5:2 v84 G#5:1.5 F#5:.5',
    'v92 D#5:2 v86 B4:2',
    'v88 C#5:1.5 D#5:.5 E5:1 F#5:1',
    'v90 E5:2 v86 D#5:2',
  ],
  harmony: [
    cycle44(['G#3', 'C#4', 'D#4']),
    cycle44(['G#3', 'C#4', 'E4']),
    cycle44(['A3', 'C#4', 'E4']),
    cycle44(['G#3', 'C#4', 'D#4']),
    cycle44(['G#3', 'C#4', 'D#4']),
    cycle44(['F#3', 'B3', 'C#4']),
    cycle44(['G#3', 'C#4', 'E4']),
    cycle44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    halfBass('C#2', 'G#2'),
    halfBass('A1', 'E2'),
    halfBass('F#2', 'C#3'),
    halfBass('G#1', 'D#2'),
    halfBass('C#2', 'G#2'),
    halfBass('B1', 'F#2'),
    halfBass('A1', 'E2'),
    halfBass('B1', 'F#2'),
  ],
}

const archAPrimeClimax: Passage = {
  chords: ['Em(add9)', 'Cmaj7', 'Am(add9)', 'Dadd9', 'Gmaj7', 'Cmaj7'],
  melody: [
    'v92 B4:1 v86 E5:.5 F#5:.5 v94 G5:1 v88 B5:1',
    'v94 A5:2 v88 F#5:1 G5:1',
    'v92 A5:1 v86 B5:.5 C6:.5 v96 D6:1 v90 B5:1',
    'v94 C6:2 v88 A5:1 B5:1',
    'v92 B5:1 v86 A5:.5 G5:.5 v94 F#5:1 v88 D5:1',
    'v92 E5:2 v86 G5:2',
  ],
  harmony: [
    pulse44(['G3', 'B3', 'F#4']),
    pulse44(['G3', 'B3', 'E4']),
    pulse44(['G3', 'B3', 'C4']),
    pulse44(['A3', 'D4', 'E4']),
    pulse44(['G3', 'B3', 'F#4']),
    pulse44(['G3', 'B3', 'E4']),
  ],
  bass: [
    driveBass('E2', 'B2'),
    driveBass('C2', 'G2'),
    driveBass('A1', 'E2'),
    driveBass('D2', 'A2'),
    driveBass('G1', 'D2'),
    halfBass('C2', 'G2'),
  ],
}

const archCoda: Passage = {
  chords: ['Dadd9', 'Em(add9)'],
  melody: [
    'v90 F#5:2 v86 D5:2',
    'v92 E5:3 r:1',
  ],
  harmony: [
    stride44(['A3', 'D4', 'E4']),
    stride44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    halfBass('D2', 'A2'),
    pedalBounce('E2', 'B2'),
  ],
}

// ==========================================
// 案2: A–B（ト長調）–A′（短縮再現）–C（変ロ長調の神秘・山場）–A″（終結）（36小節）
// ==========================================

const rondoBG: Passage = {
  chords: ['Gadd9', 'Cmaj7/G', 'Am7', 'Dsus4', 'Em7', 'Dadd9'],
  melody: [
    'v88 G5:2 v84 D5:1 B4:1',
    'v86 C5:1.5 D5:.5 v90 E5:2',
    'v88 E5:1.5 F#5:.5 v90 G5:1 A5:1',
    'v92 F#5:3 r:1',
    'v88 G5:1.5 F#5:.5 v86 E5:1 D5:1',
    'v90 F#5:2 v86 D5:2',
  ],
  harmony: [
    offbeat44(['A3', 'B3', 'D4']),
    offbeat44(['G3', 'C4', 'E4']),
    offbeat44(['G3', 'C4', 'E4']),
    offbeat44(['G3', 'A3', 'D4']),
    offbeat44(['G3', 'B3', 'D4']),
    offbeat44(['A3', 'D4', 'E4']),
  ],
  bass: [
    driveBass('G2', 'D3'),
    pedalBounce('G2', 'D3'),
    driveBass('A1', 'E2'),
    halfBass('D2', 'A2'),
    driveBass('E2', 'B2'),
    halfBass('D2', 'A2'),
  ],
}

const rondoAPrimeShort: Passage = {
  chords: ['Em(add9)', 'Fmaj7', 'Cmaj7', 'Dsus4'],
  melody: [
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 E5:1',
    'v90 F5:2 v86 C5:1 D5:1',
    'v90 E5:1 v84 G5:.5 A5:.5 v92 B5:1 v86 G5:1',
    'v90 A5:2 v86 G5:2',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['A3', 'C4', 'E4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['G3', 'A3', 'D4']),
  ],
  bass: [
    driveBass('E2', 'B2'),
    driveBass('F2', 'C3'),
    driveBass('C2', 'G2'),
    halfBass('D2', 'A2'),
  ],
}

const rondoCBb: Passage = {
  chords: ['Bbmaj7', 'Ebadd9', 'Cm7', 'Fsus4', 'Gm(add9)', 'Bsus4'],
  melody: [
    'v90 F5:1.5 v86 G5:.5 v92 A5:1 Bb5:1',
    'v94 C6:2 v88 Bb5:2',
    'v90 G5:1.5 v86 A5:.5 v92 Bb5:1 C6:1',
    'v96 D6:2 v90 C6:2',
    'v92 Bb5:1.5 v86 A5:.5 v90 G5:1 F5:1',
    'v92 F#5:2 v86 D#5:2',
  ],
  harmony: [
    tresillo44(['A3', 'D4', 'F4']),
    tresillo44(['G3', 'Bb3', 'F4']),
    tresillo44(['G3', 'Bb3', 'Eb4']),
    tresillo44(['Bb3', 'C4', 'F4']),
    tresillo44(['A3', 'Bb3', 'D4']),
    tresillo44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    tresilloBass('Bb1', 'Bb1', 'F2'),
    tresilloBass('Eb2', 'Eb2', 'Bb2'),
    tresilloBass('C2', 'C2', 'G2'),
    tresilloBass('F2', 'F2', 'C3'),
    tresilloBass('G2', 'G2', 'D3'),
    halfBass('B1', 'F#2'),
  ],
}

const rondoADoublePrimeEnd: Passage = {
  chords: ['Em(add9)', 'Am7', 'Cmaj7', 'Em(add9)'],
  melody: [
    'v92 B5:1 v86 A5:.5 G5:.5 v90 F#5:1 E5:1',
    'v88 G5:2 v84 E5:2',
    'v88 F#5:1.5 v84 E5:.5 v88 D5:1 E5:1',
    'v92 E5:3 r:1',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['G3', 'C4', 'E4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    driveBass('E2', 'B2'),
    driveBass('A1', 'E2'),
    driveBass('C2', 'G2'),
    pedalBounce('E2', 'B2'),
  ],
}

// ==========================================
// 案3: Intro（4小節）–A–B（ハ長調）–C（イ短調の山場）–A′（帰着）（32小節）
// ==========================================

const gradualIntro: Passage = {
  chords: ['Em(add9)', 'Fmaj7', 'Em(add9)', 'Bsus4'],
  melody: [
    'v84 E5:3 v80 B4:1',
    'v86 C5:3 v82 A4:1',
    'v84 B4:4',
    'r:2 v84 B4:1 D5:1',
  ],
  harmony: [
    cycle44(['G3', 'B3', 'F#4']),
    cycle44(['A3', 'C4', 'E4']),
    cycle44(['G3', 'B3', 'F#4']),
    cycle44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    halfBass('E2', 'B2'),
    halfBass('F2', 'C3'),
    halfBass('E2', 'B2'),
    halfBass('B1', 'F#2'),
  ],
}

const gradualBCMajor: Passage = {
  chords: ['Cadd9', 'G/B', 'Fmaj7', 'Gsus4'],
  melody: [
    'v90 G4:1 v86 C5:1 D5:1 E5:1',
    'v94 G5:2.5 v88 E5:.5 D5:1',
    'v90 E5:1 v86 F5:1 G5:1 A5:1',
    'v92 G5:2 v86 D5:2',
  ],
  harmony: [
    pulse44(['G3', 'D4', 'E4']),
    pulse44(['G3', 'B3', 'D4']),
    pulse44(['A3', 'C4', 'E4']),
    pulse44(['G3', 'C4', 'D4']),
  ],
  bass: [
    driveBass('C2', 'G2'),
    driveBass('B1', 'G2'),
    driveBass('F2', 'C3'),
    halfBass('G2', 'D3'),
  ],
}

const gradualCClimaxAMinor: Passage = {
  chords: ['Am(add9)', 'Fmaj7', 'Dm7', 'Bsus4'],
  melody: [
    'v92 E5:1 v86 A5:.5 B5:.5 v96 C6:1 v90 A5:1',
    'v94 C6:2 v88 A5:1 G5:1',
    'v92 F5:1 v86 G5:.5 A5:.5 v94 D6:1 v88 C6:1',
    'v94 B5:2 v88 F#5:2',
  ],
  harmony: [
    stride44(['G3', 'B3', 'C4']),
    stride44(['A3', 'C4', 'E4']),
    stride44(['A3', 'C4', 'F4']),
    stride44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    driveBass('A1', 'E2'),
    driveBass('F2', 'C3'),
    driveBass('D2', 'A2'),
    halfBass('B1', 'F#2'),
  ],
}

const gradualAPrimeClose: Passage = {
  chords: ['Em(add9)', 'Dadd9/E', 'Cmaj7', 'Em(add9)'],
  melody: [
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 E5:1',
    'v90 F#5:2 v86 D5:1 E5:1',
    'v88 G5:1.5 v84 F#5:.5 v88 E5:1 D5:1',
    'v92 E5:3 r:1',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    driveBass('E2', 'B2'),
    pedalBounce('E2', 'B2'),
    driveBass('C2', 'G2'),
    pedalBounce('E2', 'B2'),
  ],
}

// ==========================================
// 3案の試聴用 Study 組み立て
// ==========================================

export const northernHomeModalStructures: CompositionStudy[] = [
  buildSketch({
    id: 'valhardt2-struct-arch-csharp',
    title: '導入から嬰ハ短調の陰りを越えて、高音の山場へ（Intro–A–B–A′–Coda）',
    description:
      'ホ短調 · ♩=128 · 4/4 · 34小節。2小節の導入から主題 A（16小節）に入り、短3度下の嬰ハ短調でアルペジオに乗せた静かな B（8小節）を歌ったあと、29小節目の D6 へ登る A′ と余韻の Coda で閉じる',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'Intro 導入', intention: '3+3+2 の和音と保続低音で場を開き、2小節目の弱起で主題へ渡す', passage: archIntro },
      { label: 'A 主題', intention: '選ばれた主題（bII の Fmaj7 を含む16小節）をそのまま提示する', passage: themePassage },
      { label: 'B 対比（嬰ハ短調）', intention: '短3度下の嬰ハ短調へ移り、アルペジオと2分音符の息の長い歌で陰りを描く', passage: archBCSharpMinor },
      { label: 'A′ 再現と山場', intention: '8分刻みの推進力で主調に戻り、29小節目の D6 で頂点を作る', passage: archAPrimeClimax },
      { label: 'Coda 結び', intention: 'Dadd9 から Em(add9) へ落ち着いてループ頭へつなぐ', passage: archCoda },
    ],
  }),
  buildSketch({
    id: 'valhardt2-struct-rondo-distant',
    title: '春のト長調と遠隔の変ロ長調を巡るロンド（A–B–A′–C–A″）',
    description:
      'ホ短調 · ♩=128 · 4/4 · 36小節。主題 A のあと平行長調（ト長調）の軽快な B、短縮された A′ を挟み、27小節目から遠隔調の変ロ長調（C）で不思議な浮遊感と最高音 D6 の山場を迎えて帰着する',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'A 主題', intention: '選ばれた主題（16小節）で勇ましく始まる', passage: themePassage },
      { label: 'B 対比（ト長調）', intention: '平行長調と裏拍和音で、春の戦略画面らしい開けた空気を作る', passage: rondoBG },
      { label: 'A′ 中間再現', intention: '主題の動機を4小節に凝縮し、Fmaj7 の陰りを残して次へ渡す', passage: rondoAPrimeShort },
      { label: 'C 展開（変ロ長調）', intention: '3+3+2 の変ロ長調で不思議な色彩を広げ、30小節目の D6 で山場を作る', passage: rondoCBb },
      { label: 'A″ 終結', intention: 'B5 から降りて主調の Em(add9) に静かに着地する', passage: rondoADoublePrimeEnd },
    ],
  }),
  buildSketch({
    id: 'valhardt2-struct-climax-aminor',
    title: '長い導入からハ長調の行進とイ短調の頂点へ（Intro–A–B–C–A′）',
    description:
      'ホ短調 · ♩=128 · 4/4 · 32小節。4小節の緩やかな導入から主題 A に入り、ハ長調の明るい B（4小節）からイ短調の激しい山場 C（4小節・D6）へ駆け上がり、静かな A′（4小節）で結ぶ',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'Intro 導入', intention: '長い音価の呼びかけと Fmaj7 の揺らぎで雰囲気を作る', passage: gradualIntro },
      { label: 'A 主題', intention: '選ばれた主題（16小節）を堂々と鳴らす', passage: themePassage },
      { label: 'B 対比（ハ長調）', intention: '順次上行の力強いハ長調で、軍団の前進を描く', passage: gradualBCMajor },
      { label: 'C 山場（イ短調）', intention: '下属調イ短調で動機を畳みかけ、27小節目の D6 で頂点に達する', passage: gradualCClimaxAMinor },
      { label: 'A′ 帰着', intention: '冒頭の動機を落ち着いて言い直し、主音 E5 でループを閉じる', passage: gradualAPrimeClose },
    ],
  }),
]
