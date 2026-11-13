import { buildSketch, transposePassage, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { greyThroneHook } from './hooks-001.ts'
import { restateOpenInD, stayInFAndReturn } from './themes-001.ts'

// 「灰座への敬礼 — 言い直しから短3度上（ヘ長調）へ」(valhardt-theme-grey-restate-minor-third-up) からのフル尺の構成案 01。
// ニ長調 · ♩=126 · 12/8、主題の段階と同じ簡潔な編成（ピアノの旋律・ピアノの伴奏・アコースティックベース）。
//
// 3案で形式（A–B–A′ 32小節 / A–B–C–A′ 36小節 / Intro–A₁–B–A₂–Coda 32小節）、
// 対比部の調とリズム型（ロ短調の持続和音 / イ短調の付点4分刻み＋ヘ短調の展開 / 変イ長調の揺れる伴奏）、
// 山場の位置（再現部 A′ / B→C の移行 / B の後半）を変える。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

const concat = (...list: Passage[]): Passage => ({
  chords: list.flatMap((p) => p.chords),
  melody: list.flatMap((p) => p.melody),
  harmony: list.flatMap((p) => p.harmony),
  bass: list.flatMap((p) => p.bass),
})

// ---------- 伴奏の型（12/8 = 1小節6拍） ----------

/** 12/8: 4声を8分で上下する分散和音を2回（主題と同じ）。 */
const roll128 = (v: Voicing) => {
  const once = `v52 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v48 ${v[3]}:.5 v44 ${v[2]}:.5 ${v[1]}:.5`
  return `${once} ${once}`
}

/** 12/8: 付点2分音符で静かに保つ和音（2小節ごとに色を変える B 部用）。 */
const pad128 = (a: Voicing, b: Voicing = a) => `v54 ${ch(a)}:3 v48 ${ch(b)}:3`

/** 12/8: 付点4分音符ごとの刻み（1小節4拍の力強い拍節）。 */
const pulse128 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:1.5 v46 ${c}:1.5 v54 ${c}:1.5 v46 ${c}:1.5`
}

/** 12/8: 2声を8分で交互に揺らす伴奏。 */
const rock128 = (low: Voicing, high: Voicing) => {
  const a = ch(low)
  const b = ch(high)
  const once = `v50 ${a}:.5 v44 ${b}:.5 ${a}:.5 v48 ${b}:.5 v44 ${a}:.5 ${b}:.5`
  return `${once} ${once}`
}

// ---------- 低音の型（12/8 = 1小節6拍） ----------

/** 12/8: 根音を3拍保ち、5度・根音（主題と同じ）。 */
const float128 = (root: string, fifth: string) => `${root}:3 ${fifth}:1.5 ${root}:1.5`

/** 12/8: 付点4分で歩く低音。 */
const walk128 = (a: string, b: string, c: string, d: string) => `${a}:1.5 ${b}:1.5 ${c}:1.5 ${d}:1.5`

/** 12/8: シンコペーション気味の低音。 */
const sync128 = (root: string, fifth: string) => `${root}:2 ${root}:1 ${fifth}:1.5 ${root}:1.5`

// 選ばれた主題（16小節）
const shiftInF = transposePassage(greyThroneHook, 3)
const THEME = concat(greyThroneHook, restateOpenInD, shiftInF, stayInFAndReturn)

// ==========================================
// 案1: A–B–A′（32小節）。ロ短調の霧を越えて、高音域の再現へ
// ==========================================

const bMinorMist: Passage = {
  chords: ['Bm9', 'Gmaj7', 'Em9', 'F#7sus4', 'Bm9', 'A/C#', 'Dmaj7', 'A7sus4'],
  melody: [
    'v86 F#4:1.5 v84 G4:.5 A4:.5 B4:.5 v90 D5:3',
    'v88 C#5:3 v84 B4:1.5 A4:1.5',
    'v86 G4:1.5 v84 A4:.5 B4:.5 D5:.5 v90 F#5:3',
    'v90 E5:4.5 v84 D5:1.5',
    'v88 F#5:1.5 v86 E5:.5 D5:.5 B4:.5 v90 C#5:3',
    'v88 E5:3 v86 A4:1.5 B4:1.5',
    'v90 D5:1.5 v88 E5:1.5 v90 F#5:1.5 G5:1.5',
    'v92 E5:6',
  ],
  harmony: [
    pad128(['A3', 'C#4', 'D4', 'F#4']),
    pad128(['G3', 'B3', 'D4', 'F#4']),
    pad128(['G3', 'B3', 'D4', 'F#4']),
    pad128(['E3', 'F#3', 'B3', 'C#4']),
    pad128(['A3', 'C#4', 'D4', 'F#4']),
    pad128(['A3', 'C#4', 'E4']),
    pad128(['F#3', 'A3', 'C#4', 'D4']),
    pad128(['E3', 'G3', 'A3', 'D4']),
  ],
  bass: [
    walk128('B1', 'F#1', 'B1', 'D2'),
    walk128('G1', 'D2', 'G1', 'B1'),
    walk128('E1', 'B1', 'E2', 'G1'),
    walk128('F#1', 'C#2', 'F#1', 'C#2'),
    walk128('B1', 'F#1', 'B1', 'D2'),
    walk128('C#2', 'A1', 'C#2', 'E2'),
    walk128('D2', 'A1', 'F#1', 'D2'),
    walk128('A1', 'E2', 'A1', 'E2'),
  ],
}

const repriseHighInD: Passage = {
  chords: ['D(add9)', 'C(add9)', 'Gmaj7', 'Cm7/D', 'Bm9', 'Gmaj7', 'A7sus4', 'D(add9)'],
  melody: [
    'v92 A5:3 v86 F#5:1.5 v84 D5:.5 E5:.5 F#5:.5',
    'v94 G5:6',
    'v96 D6:3 v90 B5:1.5 v86 G5:.5 A5:.5 B5:.5',
    'v94 A5:6',
    'v90 F#5:3 v86 D5:1.5 v84 B4:.5 C#5:.5 D5:.5',
    'v92 E5:6',
    'v88 E5:3 v84 F#5:1.5 v82 G5:.5 F#5:.5 E5:.5',
    'v90 D5:6',
  ],
  harmony: [
    roll128(['F#3', 'A3', 'D4', 'E4']),
    roll128(['E3', 'G3', 'C4', 'D4']),
    roll128(['F#3', 'G3', 'B3', 'D4']),
    roll128(['Eb3', 'G3', 'Bb3', 'C4']),
    roll128(['F#3', 'A3', 'C#4', 'D4']),
    roll128(['F#3', 'G3', 'B3', 'D4']),
    roll128(['E3', 'G3', 'A3', 'D4']),
    roll128(['F#3', 'A3', 'D4', 'E4']),
  ],
  bass: [
    float128('D2', 'A1'),
    float128('C2', 'G1'),
    float128('G1', 'D2'),
    float128('D2', 'Bb1'),
    float128('B1', 'F#1'),
    float128('G1', 'D2'),
    float128('A1', 'E2'),
    float128('D2', 'A1'),
  ],
}

// ==========================================
// 案2: A–B–C–A′（36小節）。イ短調の誓約からヘ短調の展開を経て、静かな再現へ
// ==========================================

const aMinorOath: Passage = {
  chords: ['Am9', 'Fmaj7', 'Dm9', 'E7sus4', 'Am9', 'G6', 'Fmaj7', 'E7sus4'],
  melody: [
    'v88 E5:1.5 r:.5 E5:.5 F5:.5 v92 G5:1.5 E5:1.5',
    'v88 C5:1.5 r:.5 C5:.5 D5:.5 v90 E5:3',
    'v88 A5:1.5 r:.5 A5:.5 G5:.5 v92 F5:1.5 D5:1.5',
    'v90 E5:4.5 r:1.5',
    'v90 E5:1.5 r:.5 E5:.5 F5:.5 v94 A5:1.5 G5:1.5',
    'v92 D5:1.5 r:.5 D5:.5 E5:.5 v92 G5:3',
    'v94 C6:1.5 v90 B5:1.5 v88 A5:1.5 G5:1.5',
    'v92 E5:6',
  ],
  harmony: [
    pulse128(['G3', 'B3', 'C4', 'E4']),
    pulse128(['E3', 'A3', 'C4', 'E4']),
    pulse128(['F3', 'A3', 'C4', 'E4']),
    pulse128(['E3', 'A3', 'B3', 'D4']),
    pulse128(['G3', 'B3', 'C4', 'E4']),
    pulse128(['G3', 'B3', 'D4', 'E4']),
    pulse128(['E3', 'A3', 'C4', 'E4']),
    pulse128(['E3', 'A3', 'B3', 'D4']),
  ],
  bass: [
    sync128('A1', 'E2'),
    sync128('F1', 'C2'),
    sync128('D2', 'A1'),
    sync128('E1', 'B1'),
    sync128('A1', 'E2'),
    sync128('G1', 'D2'),
    sync128('F1', 'C2'),
    sync128('E1', 'B1'),
  ],
}

const fMinorClimb: Passage = {
  chords: ['Fm9', 'Dbmaj7', 'Bbm9', 'A7sus4'],
  melody: [
    'v88 C5:3 v86 Ab4:1.5 v84 F4:.5 G4:.5 Ab4:.5',
    'v90 G4:3 v88 C5:3',
    'v92 F5:3 v88 Db5:1.5 v84 Bb4:.5 C5:.5 D5:.5',
    'v94 E5:6',
  ],
  harmony: [
    roll128(['G3', 'Ab3', 'C4', 'Eb4']),
    roll128(['F3', 'Ab3', 'C4', 'F4']),
    roll128(['F3', 'Ab3', 'C4', 'Db4']),
    roll128(['E3', 'G3', 'A3', 'D4']),
  ],
  bass: [float128('F1', 'C2'), float128('Db1', 'Ab1'), float128('Bb1', 'F1'), float128('A1', 'E2')],
}

const warmRepriseInD: Passage = {
  chords: ['D(add9)', 'Bbmaj7/D', 'G/D', 'Cm7/D', 'Gmaj7', 'Em9', 'A7sus4', 'D(add9)'],
  melody: [
    'v90 A5:3 v84 F#5:1.5 v82 D5:.5 E5:.5 F#5:.5',
    'v92 F5:6',
    'v90 B5:3 v84 G5:1.5 v82 D5:.5 E5:.5 F#5:.5',
    'v92 G5:6',
    'v88 F#5:3 v84 D5:1.5 v82 B4:.5 C#5:.5 D5:.5',
    'v88 E5:6',
    'v86 G5:3 v82 E5:1.5 v80 D5:.5 E5:.5 F#5:.5',
    'v88 D5:6',
  ],
  harmony: [
    roll128(['F#3', 'A3', 'D4', 'E4']),
    roll128(['F3', 'A3', 'Bb3', 'D4']),
    roll128(['G3', 'B3', 'D4', 'E4']),
    roll128(['Eb3', 'G3', 'Bb3', 'C4']),
    roll128(['F#3', 'G3', 'B3', 'D4']),
    roll128(['F#3', 'G3', 'B3', 'D4']),
    roll128(['E3', 'G3', 'A3', 'D4']),
    roll128(['F#3', 'A3', 'D4', 'E4']),
  ],
  bass: [
    float128('D2', 'A1'),
    float128('D2', 'Bb1'),
    float128('D2', 'B1'),
    float128('D2', 'Eb2'),
    float128('G1', 'D2'),
    float128('E1', 'B1'),
    float128('A1', 'E2'),
    float128('D2', 'A1'),
  ],
}

// ==========================================
// 案3: Intro–A₁–B–A₂–Coda（32小節）。鐘の導入から主題を割り、変イ長調を挟む
// ==========================================

const bellIntro: Passage = {
  chords: ['D(add9)', 'C/D', 'Bbmaj7/D', 'A7sus4/D'],
  melody: [
    'v82 A5:6',
    'v80 G5:6',
    'v82 F5:6',
    'v84 E5:4.5 v82 D5:.5 E5:.5 F#5:.5',
  ],
  harmony: [
    pad128(['F#3', 'A3', 'E4']),
    pad128(['E3', 'G3', 'C4', 'D4']),
    pad128(['F3', 'A3', 'Bb3', 'D4']),
    pad128(['E3', 'G3', 'A3', 'D4']),
  ],
  bass: ['D2:6', 'D2:6', 'D2:6', 'D2:6'],
}

const abMajorVista: Passage = {
  chords: ['Ab(add9)/Bb', 'Ebsus4', 'Bbm7', 'Dbmaj7', 'Ab(add9)', 'Fm9', 'Dbmaj7', 'A7sus4'],
  melody: [
    'v86 Eb5:1.5 v88 F5:1.5 v90 Ab5:1.5 v88 G5:1.5',
    'v90 F5:3 v86 Eb5:3',
    'v88 F5:1.5 v90 Ab5:1.5 v92 Bb5:1.5 v90 Ab5:1.5',
    'v92 C6:6',
    'v90 Eb5:1.5 v92 Ab5:1.5 v94 Bb5:1.5 v96 C6:1.5',
    'v94 Bb5:3 v90 Ab5:3',
    'v90 F5:1.5 v88 Ab5:1.5 v86 G5:1.5 v84 F5:1.5',
    'v90 E5:6',
  ],
  harmony: [
    rock128(['Ab3', 'C4'], ['Eb4', 'Bb4']),
    rock128(['Ab3', 'Bb3'], ['Eb4', 'G4']),
    rock128(['Ab3', 'Db4'], ['F4', 'Ab4']),
    rock128(['Ab3', 'C4'], ['F4', 'Ab4']),
    rock128(['Ab3', 'C4'], ['Eb4', 'Bb4']),
    rock128(['G3', 'Ab3'], ['C4', 'Eb4']),
    rock128(['Ab3', 'C4'], ['F4', 'Ab4']),
    rock128(['E3', 'G3'], ['A3', 'D4']),
  ],
  bass: [
    float128('Bb1', 'F2'),
    float128('Eb2', 'Bb1'),
    float128('Bb1', 'F2'),
    float128('Db2', 'Ab1'),
    float128('Ab1', 'Eb2'),
    float128('F1', 'C2'),
    float128('Db2', 'Ab1'),
    float128('A1', 'E2'),
  ],
}

const bellCoda: Passage = {
  chords: ['Gmaj7', 'Cm7/D', 'A7sus4', 'D(add9)'],
  melody: [
    'v88 B5:3 v84 G5:1.5 v82 D5:.5 E5:.5 F#5:.5',
    'v90 F5:6',
    'v86 E5:3 v82 F#5:1.5 v80 G5:.5 F#5:.5 E5:.5',
    'v86 D5:6',
  ],
  harmony: [
    pad128(['F#3', 'G3', 'B3', 'D4']),
    pad128(['Eb3', 'G3', 'Bb3', 'C4']),
    pad128(['E3', 'G3', 'A3', 'D4']),
    pad128(['F#3', 'A3', 'D4', 'E4']),
  ],
  bass: [float128('G1', 'D2'), float128('D2', 'Bb1'), float128('A1', 'E2'), 'D2:6'],
}

// ==========================================
// 3つの構成案を組み立てる
// ==========================================

const structure = (
  id: string,
  title: string,
  description: string,
  passages: { label: string; intention: string; passage: Passage }[],
  moments: CompositionStudy['moments'],
) =>
  buildSketch({
    id,
    title,
    description,
    tempo: 126,
    meter: [12, 8],
    harmonyGate: 0.9,
    passages,
    moments,
  })

export const greyThroneStructures: CompositionStudy[] = [
  structure(
    'valhardt-struct-bminor-arch',
    'ロ短調の霧を越えて、高音域の再現へ（A–B–A′）',
    'ニ長調 · ♩=126 · 12/8 · 32小節。A（16小節）のあと、B（17〜24小節）はロ短調へ移り、持続和音と歩く低音の上で低く歌い上げる。A′（25〜32小節）は Gmaj7 上の D6 を山場に高音域で主題を再現し、静かに閉じる',
    [
      { label: 'A 主題', intention: '選ばれた主題（16小節）：ニ長調のフックから言い直し・ヘ長調への移調・帰着', passage: THEME },
      { label: 'B 対比（ロ短調の霧）', intention: '持続和音と歩く低音に切り替え、低い音域から段階的に登る新しい旋律', passage: bMinorMist },
      { label: 'A′ 再現と山場', intention: '27小節目の D6 で頂点を作り、Bm9 → A7sus4 → D(add9) で閉じる', passage: repriseHighInD },
    ],
    [
      { bar: 17, beat: 0, pitches: ['B1', 'A3', 'D4', 'F#4'], intention: 'B 部の始まり：ロ短調 Bm9 の持続和音' },
      { bar: 27, beat: 0, pitches: ['G1', 'F#3', 'D6'], intention: 'A′ の山場：Gmaj7 上の最高音 D6' },
      { bar: 32, beat: 1.5, pitches: ['D2', 'E4', 'D5'], intention: 'ニ長調 D(add9) の根音で終止' },
    ],
  ),
  structure(
    'valhardt-struct-am-fm-journey',
    'イ短調の誓約からヘ短調の展開を経て帰る（A–B–C–A′）',
    'ニ長調 · ♩=126 · 12/8 · 36小節。A（16小節）のあと、B（17〜24小節）はイ短調の付点4分刻みで儀礼的な対比を置き、C（25〜28小節）はヘ短調へ転じて緊張を高める。A′（29〜36小節）は Bbmaj7/D や G/D を添えて穏やかに再現する',
    [
      { label: 'A 主題', intention: '選ばれた主題（16小節）', passage: THEME },
      { label: 'B 対比（イ短調の誓約）', intention: '付点4分の和音刻みと休符を含む短い呼びかけで、A と対比する', passage: aMinorOath },
      { label: 'C 展開（ヘ短調の影）', intention: 'ヘ短調（Fm9 → Dbmaj7 → Bbm9）から A7sus4 へ駆け上がり再現へ渡す', passage: fMinorClimb },
      { label: 'A′ 穏やかな再現', intention: 'D 保続上の Bbmaj7/D・G/D・Cm7/D を経て静かに終止', passage: warmRepriseInD },
    ],
    [
      { bar: 17, beat: 0, pitches: ['A1', 'G3', 'C4', 'E5'], intention: 'B 部の始まり：イ短調 Am9 の付点4分刻み' },
      { bar: 25, beat: 0.5, pitches: ['F1', 'Ab3', 'C5'], intention: 'C 部の展開：ヘ短調 Fm9 への転調' },
      { bar: 30, beat: 1, pitches: ['D2', 'Bb3', 'F5'], intention: 'A′ の Bbmaj7/D による陰り' },
    ],
  ),
  structure(
    'valhardt-struct-rondo-ab',
    '鐘の導入から主題を割り、変イ長調を挟む（Intro–A₁–B–A₂–Coda）',
    'ニ長調 · ♩=126 · 12/8 · 32小節。4小節の鐘の保続（Intro）から主題の前半 A₁（5〜12小節）を出し、対比部 B（13〜20小節）で三全音離れた変イ長調の揺れる旋律を挟む。後半 A₂（21〜28小節）はヘ長調の移調部から戻り、Coda で Intro の響きを回想する',
    [
      { label: 'Intro 鐘の保続', intention: '主音 D の保続の上で和音が静かに移り、主題の登場を待つ', passage: bellIntro },
      { label: 'A₁ 主題の前半', intention: 'フックと言い直し（8小節）でニ長調の主題を提示', passage: concat(greyThroneHook, restateOpenInD) },
      { label: 'B 対比（変イ長調の遠景）', intention: 'srb-05 の Ab(add9)/Bb の響きと揺れる伴奏で、19小節目の C6 へ上る', passage: abMajorVista },
      { label: 'A₂ 主題の後半と帰着', intention: 'ヘ長調の移調から主調ニ長調へ戻る（8小節）', passage: concat(shiftInF, stayInFAndReturn) },
      { label: 'Coda 結び', intention: 'Cm7/D をもう一度鳴らして Intro の余韻へつなぐ', passage: bellCoda },
    ],
    [
      { bar: 1, beat: 0, pitches: ['D2', 'F#3', 'A5'], intention: 'Intro の鐘：D(add9) の保続' },
      { bar: 13, beat: 0, pitches: ['Bb1', 'Ab3', 'Eb5'], intention: 'B 部の始まり：変イ長調 Ab(add9)/Bb' },
      { bar: 19, beat: 1.5, pitches: ['Db2', 'F4', 'Ab5'], intention: 'B 部の後半 Dbmaj7' },
      { bar: 32, beat: 1.5, pitches: ['D2', 'E4', 'D5'], intention: 'Coda の終止' },
    ],
  ),
]
