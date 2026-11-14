import { buildSketch, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { northernLegionDevelopments } from './themes-001.ts'

// 戦略画面BGMその7「ヴァルハルト家（再」 — 構成案 02。
// 派生元: valhardt2-theme-northern-home-modal（「北方軍団の行進 — 主調のまま bII（Fmaj7）の陰りで深める」）。
// 構成案 01 への試聴メモ（高音がきつい、もっと憂いが残るほうがいい、主題以外の部分に驚きと感動を、
// 意味不明な Intro を避ける）を受け、最高音を B5 までに抑えつつ、
// 転調の驚き・歌心ある対比部・深い憂いを持つ 3 案を新たに構成した。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

const stride44 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:1 v46 ${c}:1 v54 ${c}:1 v46 ${c}:1`
}

const pulse44 = (v: Voicing) => {
  const c = ch(v)
  return `v54 ${c}:.5 v42 ${c}:.5 ${c}:.5 ${c}:.5 v50 ${c}:.5 v42 ${c}:.5 ${c}:.5 ${c}:.5`
}

const cycle44 = (v: Voicing) =>
  `v52 ${v[0]}:.5 v42 ${v[1]}:.5 ${v[2]}:.5 v48 ${v[0]}:.5 v42 ${v[1]}:.5 ${v[2]}:.5 v48 ${v[0]}:.5 v42 ${v[1]}:.5`

const tresillo44 = (v: Voicing) => `v56 ${ch(v)}:1.5 v46 ${ch(v)}:1.5 v52 ${ch(v)}:1`

const driveBass = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`
const pedalBounce = (low: string, high: string) => `${low}:1.5 ${low}:.5 ${low}:1 ${high}:1`
const octaveDrive = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`
const halfBass = (a: string, b: string) => `${a}:2 ${b}:2`
const tresilloBass = (a: string, b: string, c: string) => `${a}:1.5 ${b}:1.5 ${c}:1`

const selectedThemeSection = northernLegionDevelopments[3].song.sections[0]
const themePassage: Passage = {
  chords: selectedThemeSection.chords,
  melody: selectedThemeSection.parts.melody,
  harmony: selectedThemeSection.parts.harmony,
  bass: selectedThemeSection.parts.bass,
}

// ==========================================
// 案1: ハ短調の憂いから、ナポリのヘ長調へ開く（A–B–C–A′）（36小節）
// ==========================================

const lamentBCMinor: Passage = {
  chords: ['Cm9', 'Abmaj7', 'Fm9', 'Gsus4', 'Cm9', 'Abmaj7', 'Fadd9', 'Gsus4'],
  melody: [
    'v88 G5:1.5 v84 F5:.5 v90 Eb5:1 D5:1',
    'v92 C5:2 v86 G4:1 Bb4:1',
    'v88 C5:1.5 v84 D5:.5 v90 Eb5:1 G5:1',
    'v92 F5:2 v86 D5:2',
    'v88 G5:1.5 v84 Ab5:.5 v92 Bb5:1 G5:1',
    'v94 G5:2 v88 Eb5:1 F5:1',
    'v90 G5:1.5 v84 F5:.5 v88 D5:1 C5:1',
    'v90 D5:2 v86 B4:2',
  ],
  harmony: [
    cycle44(['G3', 'Bb3', 'D4']),
    cycle44(['G3', 'C4', 'Eb4']),
    cycle44(['G3', 'Ab3', 'C4']),
    cycle44(['G3', 'C4', 'D4']),
    cycle44(['G3', 'Bb3', 'D4']),
    cycle44(['G3', 'C4', 'Eb4']),
    cycle44(['G3', 'A3', 'C4']),
    cycle44(['G3', 'C4', 'D4']),
  ],
  bass: [
    halfBass('C2', 'G2'),
    halfBass('Ab1', 'Eb2'),
    halfBass('F2', 'C3'),
    halfBass('G2', 'D3'),
    halfBass('C2', 'G2'),
    halfBass('Ab1', 'Eb2'),
    halfBass('F2', 'C3'),
    halfBass('G2', 'D3'),
  ],
}

const lamentCNeapolitan: Passage = {
  chords: ['Fmaj7', 'Gadd9', 'Am9', 'Fmaj7', 'Am7', 'Bsus4'],
  melody: [
    'v90 C5:1 v86 F5:.5 G5:.5 v94 A5:1.5 v88 G5:.5',
    'v92 A5:2 v88 B5:2',
    'v94 B5:1 v88 A5:.5 G5:.5 v92 E5:1.5 G5:.5',
    'v92 A5:2 v88 E5:1 F5:1',
    'v90 G5:1.5 v84 F5:.5 v88 E5:1 D5:1',
    'v92 F#5:2 v86 D#5:2',
  ],
  harmony: [
    pulse44(['A3', 'C4', 'E4']),
    pulse44(['A3', 'B3', 'D4']),
    pulse44(['G3', 'B3', 'E4']),
    pulse44(['A3', 'C4', 'E4']),
    pulse44(['G3', 'C4', 'E4']),
    pulse44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    driveBass('F2', 'C3'),
    driveBass('G2', 'D3'),
    driveBass('A1', 'E2'),
    driveBass('F2', 'C3'),
    driveBass('A1', 'E2'),
    halfBass('B1', 'F#2'),
  ],
}

const lamentAPrimeReturn: Passage = {
  chords: ['Em(add9)', 'Dadd9/E', 'Cmaj7', 'Am9', 'Bsus4', 'Em(add9)'],
  melody: [
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 E5:1',
    'v90 F#5:2 v86 D5:1 E5:1',
    'v88 G5:1.5 v84 F#5:.5 v90 E5:1 D5:1',
    'v92 E5:2 v86 C5:2',
    'v88 D5:1.5 v84 E5:.5 v90 F#5:1 D#5:1',
    'v92 E5:3 r:1',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['G3', 'B3', 'C4']),
    stride44(['F#3', 'B3', 'E4']),
    stride44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    driveBass('E2', 'B2'),
    pedalBounce('E2', 'B2'),
    driveBass('C2', 'G2'),
    driveBass('A1', 'E2'),
    halfBass('B1', 'F#2'),
    pedalBounce('E2', 'B2'),
  ],
}

// ==========================================
// 案2: 刻みの導入から、嬰ハ短調の追憶と再起へ（Intro–A–B–A′–Coda）（34小節）
// ==========================================

const elegyIntro: Passage = {
  chords: ['Em(add9)', 'Em(add9)'],
  melody: [
    'r:4',
    'r:2 v84 B4:1 D5:1',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    octaveDrive('E2', 'E3', 'B2'),
    octaveDrive('E2', 'E3', 'B2'),
  ],
}

const elegyBCSharp: Passage = {
  chords: ['C#m9', 'Amaj7', 'F#m9', 'G#7sus4', 'Amaj7', 'Badd9', 'G#m7', 'Bsus4'],
  melody: [
    'v88 G#4:1 v84 C#5:.5 D#5:.5 v90 E5:1.5 v86 D#5:.5',
    'v92 C#5:2 v86 G#4:2',
    'v88 A4:1 v84 B4:.5 C#5:.5 v90 D#5:1.5 v86 C#5:.5',
    'v92 D#5:2 v86 C#5:2',
    'v90 E5:1 v84 F#5:.5 G#5:.5 v94 A5:1.5 v88 G#5:.5',
    'v92 F#5:2 v86 D#5:2',
    'v90 E5:1.5 v84 D#5:.5 v88 B4:1 C#5:1',
    'v90 D#5:2 v86 B4:2',
  ],
  harmony: [
    pulse44(['G#3', 'B3', 'D#4']),
    pulse44(['G#3', 'C#4', 'E4']),
    pulse44(['G#3', 'A3', 'C#4']),
    pulse44(['F#3', 'B3', 'D#4']),
    pulse44(['G#3', 'C#4', 'E4']),
    pulse44(['F#3', 'B3', 'C#4']),
    pulse44(['F#3', 'B3', 'D#4']),
    pulse44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    driveBass('C#2', 'G#2'),
    driveBass('A1', 'E2'),
    driveBass('F#2', 'C#3'),
    halfBass('G#1', 'D#2'),
    driveBass('A1', 'E2'),
    driveBass('B1', 'F#2'),
    driveBass('G#1', 'D#2'),
    halfBass('B1', 'F#2'),
  ],
}

const elegyAPrimeShadow: Passage = {
  chords: ['Em(add9)', 'Dadd9/E', 'Am9', 'Fmaj7', 'Dadd9', 'Bsus4'],
  melody: [
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 B5:1',
    'v94 A5:2 v88 F#5:1 G5:1',
    'v92 E5:1 v86 G5:.5 A5:.5 v94 B5:1 v88 G5:1',
    'v92 A5:2 v88 E5:1 F5:1',
    'v90 G5:1.5 v84 F#5:.5 v88 D5:1 E5:1',
    'v92 F#5:2 v86 D#5:2',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['G3', 'B3', 'C4']),
    stride44(['A3', 'C4', 'E4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    octaveDrive('E2', 'E3', 'B2'),
    pedalBounce('E2', 'E3'),
    driveBass('A1', 'E2'),
    driveBass('F2', 'C3'),
    driveBass('D2', 'A2'),
    halfBass('B1', 'F#2'),
  ],
}

const elegyCoda: Passage = {
  chords: ['Cmaj7', 'Em(add9)'],
  melody: [
    'v88 G5:2 v84 E5:2',
    'v90 E5:3 r:1',
  ],
  harmony: [
    cycle44(['G3', 'B3', 'E4']),
    cycle44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    halfBass('C2', 'G2'),
    pedalBounce('E2', 'B2'),
  ],
}

// ==========================================
// 案3: ト長調〜ロ短調の陰影から、半音下の変ホ長調へ飛ぶ（A–B–C–A′）（32小節）
// ==========================================

const mirageBRelative: Passage = {
  chords: ['Gmaj7', 'Bm7', 'Em9', 'Cmaj7', 'Am9', 'Bbadd9'],
  melody: [
    'v88 A5:1.5 v84 G5:.5 v90 F#5:1 D5:1',
    'v90 F#5:2 v86 D5:1 B4:1',
    'v88 G5:1.5 v84 F#5:.5 v90 E5:1 B4:1',
    'v92 E5:2 v86 D5:2',
    'v88 E5:1 v84 G5:.5 A5:.5 v92 B5:1 v86 G5:1',
    'v90 F5:2 v86 D5:2',
  ],
  harmony: [
    cycle44(['G3', 'B3', 'F#4']),
    cycle44(['F#3', 'A3', 'D4']),
    cycle44(['G3', 'B3', 'F#4']),
    cycle44(['G3', 'B3', 'E4']),
    cycle44(['G3', 'B3', 'C4']),
    cycle44(['F3', 'Bb3', 'C4']),
  ],
  bass: [
    halfBass('G1', 'D2'),
    halfBass('B1', 'F#2'),
    halfBass('E2', 'B2'),
    halfBass('C2', 'G2'),
    halfBass('A1', 'E2'),
    halfBass('Bb1', 'F2'),
  ],
}

const mirageCEbMajor: Passage = {
  chords: ['Ebmaj7', 'Abmaj7', 'Fm9', 'Bbadd9', 'Cm9', 'Bsus4'],
  melody: [
    'v90 G5:1.5 v86 F5:.5 v92 G5:1 Bb5:1',
    'v94 G5:2 v88 Eb5:2',
    'v90 G5:1.5 v86 Ab5:.5 v92 Bb5:1 G5:1',
    'v94 F5:2 v88 D5:2',
    'v90 Eb5:1.5 v86 F5:.5 v92 G5:1 Eb5:1',
    'v90 F#5:2 v86 D#5:2',
  ],
  harmony: [
    tresillo44(['G3', 'Bb3', 'D4']),
    tresillo44(['G3', 'C4', 'Eb4']),
    tresillo44(['G3', 'Ab3', 'C4']),
    tresillo44(['F3', 'Bb3', 'C4']),
    tresillo44(['G3', 'Bb3', 'D4']),
    tresillo44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    tresilloBass('Eb2', 'Eb2', 'Bb2'),
    tresilloBass('Ab1', 'Ab1', 'Eb2'),
    tresilloBass('F2', 'F2', 'C3'),
    tresilloBass('Bb1', 'Bb1', 'F2'),
    tresilloBass('C2', 'C2', 'G2'),
    halfBass('B1', 'F#2'),
  ],
}

const mirageAPrimeClose: Passage = {
  chords: ['Em(add9)', 'Fmaj7', 'Cmaj7', 'Em(add9)'],
  melody: [
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 E5:1',
    'v90 F5:2 v86 C5:1 D5:1',
    'v88 E5:1.5 v84 F#5:.5 v90 G5:1 D5:1',
    'v92 E5:3 r:1',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['A3', 'C4', 'E4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['G3', 'B3', 'F#4']),
  ],
  bass: [
    driveBass('E2', 'B2'),
    driveBass('F2', 'C3'),
    driveBass('C2', 'G2'),
    pedalBounce('E2', 'B2'),
  ],
}

// ==========================================
// 3案の試聴用 Study 組み立て
// ==========================================

export const northernHomeModalStructures02: CompositionStudy[] = [
  buildSketch({
    id: 'valhardt2-struct2-neapolitan-lament',
    title: 'ハ短調の深い憂いから、ナポリのヘ長調へ開く（A–B–C–A′）',
    description:
      'ホ短調 · ♩=128 · 4/4 · 36小節。主題 A の直後に同主短調の遠縁・ハ短調（Cm9→Abmaj7→Fm9）で憂いある歌を紡ぎ、25小節目でナポリの Fmaj7→Gadd9→Am9 へ感情を開放して（最高音 B5）、余韻を残しながら帰着する',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'A 主題', intention: '選ばれた主題（16小節）をそのまま提示する', passage: themePassage },
      { label: 'B 対比（ハ短調の憂い）', intention: 'Cm9→Abmaj7→Fadd9 のアルペジオに乗せ、中音域で切ない歌を歌う', passage: lamentBCMinor },
      { label: 'C 展開（ヘ長調の開放）', intention: 'Gsus4 から Fmaj7 へ予想外に解決し、B5 までの温かな山場を作る', passage: lamentCNeapolitan },
      { label: 'A′ 帰着', intention: 'Am9 の陰りを挟みつつ、静かに主音 E5 へ戻る', passage: lamentAPrimeReturn },
    ],
  }),
  buildSketch({
    id: 'valhardt2-struct2-csharp-elegy',
    title: '刻みの導入から、嬰ハ短調の追憶と再起へ（Intro–A–B–A′–Coda）',
    description:
      'ホ短調 · ♩=128 · 4/4 · 34小節。主題と同じ行進の鼓動を2小節だけ前置きして A に入り、19小節目から短3度下の嬰ハ短調（C#m9→Amaj7→F#m9）で追憶の B を歌ったあと、Am9 と Fmaj7 の影を帯びた A′ と Coda で閉じる',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'Intro 導入', intention: '主題と同じ低音・和声の刻みを2小節鳴らし、迷いなく本編へ入る', passage: elegyIntro },
      { label: 'A 主題', intention: '選ばれた主題（16小節）をそのまま提示する', passage: themePassage },
      { label: 'B 対比（嬰ハ短調の追憶）', intention: '8小節かけて C#5→A5 へじわじわ登り、胸に迫る陰りを描く', passage: elegyBCSharp },
      { label: 'A′ 再現', intention: 'Am9→Fmaj7 を経て、B の憂いを引きずったまま主調を言い直す', passage: elegyAPrimeShadow },
      { label: 'Coda 結び', intention: 'Cmaj7→Em(add9) の2小節で静かな余韻を残す', passage: elegyCoda },
    ],
  }),
  buildSketch({
    id: 'valhardt2-struct2-eb-mirage',
    title: 'ト長調〜ロ短調の陰影から、半音下の変ホ長調へ飛ぶ（A–B–C–A′）',
    description:
      'ホ短調 · ♩=128 · 4/4 · 32小節。主題 A のあと Gmaj7→Bm7→Em9 と陰りを帯びて降り、23小節目で主調の半音下・変ホ長調（Ebmaj7→Abmaj7）へ鮮やかに転調して、28小節目の半音上行（Bsus4）で劇的に主調へ引き戻す',
    tempo: 128,
    meter: [4, 4],
    passages: [
      { label: 'A 主題', intention: '選ばれた主題（16小節）をそのまま提示する', passage: themePassage },
      { label: 'B 対比（ト長調〜ロ短調）', intention: 'Gmaj7 から Bm7–Em9 へと儚く降り、Bbadd9 で転調を仕掛ける', passage: mirageBRelative },
      { label: 'C 転調（変ホ長調の遠望）', intention: '半音下の変ホ長調へ抜け、3+3+2 のリズムで切なく美しい山場を作る', passage: mirageCEbMajor },
      { label: 'A′ 帰着', intention: 'Fmaj7 の影をもう一度鳴らし、主音 E5 でループを閉じる', passage: mirageAPrimeClose },
    ],
  }),
]
