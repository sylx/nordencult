import { buildSketch, transposePassage, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { crystalMapHook } from './hooks-001.ts'

// 「水晶の地図」の主題の展開 02。
// 展開 01 への感想（ユーザーの発言）: 「リズムが全部同じで、和音が違うだけ。それはメロディではないアルペジオだ」
// 「ずっと一緒すぎてビビる」。
//
// 展開 01 は16小節すべてをフックのリズム型（♩. ♪ ♩ ♩ | 𝅗𝅥. 𝄽）で書き、伴奏も8分刻みとオクターブの低音のままだった。
// ここからは AI の仮説: 参考曲 srb-06 の旋律（analysis/srb-06.txt）は、4小節の句のうち伸ばすのは4小節目だけで、
// 1〜3小節目は同音連打・刺繍音・付点16分・シンコペーションで動き、部分ごとにリズムの密度が変わる。
// そこで今回は次のようにする。
// - 4小節ごとに旋律のリズムの性格を変える（フック → 刻む応答・裏拍・拡大・縮小など）。
//   句の中でも a–b–a′–長い音 にし、同じリズムを3小節続けない。
// - 動機はリズムを変形して使う: 付点の下行（C#–B）を付点8分＋16分に縮める、2倍に伸ばす、3度上の跳躍を裏拍へずらす。
// - 旋律は順次進行・同音・刺繍音・倚音を中心にし、和音の構成音を上下になぞらない。
// - 伴奏と低音も部分ごとに変える（8分刻み、2分の和音＋歩く低音、3+3+2、裏拍、シンコペーションの刻み）。
// - 和音の変わる速さも変える（1小節2和音の部分と1和音の部分）。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

// ---------- 伴奏の型 ----------

const ACCENT = [60, 44, 44, 44, 56, 44, 44, 44]

/** 8分の和音の刻み（フックと同じ）。split 個目の8分から和音 b。 */
const pulse = (a: Voicing, b: Voicing = a, split = 4) =>
  ACCENT.map((v, i) => `v${v} ${ch(i < split ? a : b)}:.5`).join(' ')

/** 2分音符で保つ和音。2拍目から b。 */
const pad = (a: Voicing, b: Voicing = a) => `v56 ${ch(a)}:2 v50 ${ch(b)}:2`

/** 3+3+2 の和音。 */
const tres = (a: Voicing) => `v62 ${ch(a)}:1.5 v54 ${ch(a)}:1.5 v58 ${ch(a)}:1`

/** 3+1+3+1 の和音。2拍目から b。 */
const tres2 = (a: Voicing, b: Voicing) => `v62 ${ch(a)}:1.5 v52 ${ch(a)}:.5 v60 ${ch(b)}:1.5 v52 ${ch(b)}:.5`

/** 裏拍だけの和音。2拍目から b。 */
const offbeat = (a: Voicing, b: Voicing = a) =>
  `r:.5 v54 ${ch(a)}:.5 r:.5 v46 ${ch(a)}:.5 r:.5 v52 ${ch(b)}:.5 r:.5 v46 ${ch(b)}:.5`

/** シンコペーションの刻み。2拍裏から b。 */
const comp = (a: Voicing, b: Voicing = a) =>
  `v60 ${ch(a)}:1 r:.5 v50 ${ch(a)}:.5 r:.5 v54 ${ch(b)}:.5 v48 ${ch(b)}:1`

// ---------- 低音の型 ----------

/** 8分のオクターブの往復（フックと同じ）。 */
const octaves = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`

/** 8分のオクターブの往復。2拍目から別の根音。 */
const octaves2 = (a: string, aUp: string, b: string, bUp: string) =>
  `${a}:.5 ${aUp}:.5 ${a}:.5 ${aUp}:.5 ${b}:.5 ${bUp}:.5 ${b}:.5 ${bUp}:.5`

/** 4分で歩く低音。 */
const walk = (a: string, b: string, c: string, d: string) => `${a}:1 ${b}:1 ${c}:1 ${d}:1`

/** 3+3+2 の低音。 */
const bass332 = (a: string, b: string, c: string) => `${a}:1.5 ${b}:1.5 ${c}:1`

/** 頭・2拍裏・3拍裏・4拍でオクターブ上・4拍裏。 */
const push = (root: string, up: string) => `${root}:1.5 ${root}:1 ${root}:.5 ${up}:.5 ${root}:.5`

// ---------- 響き ----------

const A_ADD9: Voicing = ['E4', 'A4', 'B4', 'C#5']
const E7SUS4: Voicing = ['D4', 'E4', 'A4', 'B4']
const E7: Voicing = ['D4', 'E4', 'G#4', 'B4']
const CMAJ7: Voicing = ['E4', 'G4', 'B4', 'C5']
const FMAJ7: Voicing = ['E4', 'F4', 'A4', 'C5']
const DMAJ7: Voicing = ['D4', 'F#4', 'A4', 'C#5']
const D_OVER_C: Voicing = ['D4', 'F#4', 'A4', 'D5']

// ==========================================
// 案1: 刻む応答から全音下（ト長調）へ
// ==========================================

// 5〜8小節: 同音連打と16分の回り（♩ ♪ ♩ 𝅘𝅥𝅯𝅘𝅥𝅯 ♩）で上へ答える。6小節目は付点のあと8分で上る別の形。
// 伸ばすのは8小節目だけで、E7sus4 の A5 から G#5 へ掛留を解く。
// 伴奏は2分音符の和音、低音は D–C#–B–A｜C–B–A–G｜F–G–A–C と4分で歩く。
const answerInA: Passage = {
  chords: ['Dmaj7', 'Cmaj7', 'Fmaj7', 'E7sus4 E7'],
  melody: [
    'v84 F#5:1 v80 F#5:.5 v88 A5:1 v84 G#5:.25 F#5:.25 v86 E5:1',
    'v86 G5:1.5 v82 E5:.5 v84 G5:.5 A5:.5 v88 B5:1',
    'v86 A5:1 v82 A5:.5 v90 C6:1 v86 B5:.25 A5:.25 v88 G5:1',
    'v92 A5:2 v86 G#5:2',
  ],
  harmony: [pad(DMAJ7), pad(CMAJ7), pad(FMAJ7), pad(E7SUS4, E7)],
  bass: [
    walk('D2', 'C#2', 'B1', 'A1'),
    walk('C2', 'B1', 'A1', 'G1'),
    walk('F1', 'G1', 'A1', 'C2'),
    'E1:1.5 E1:.5 B1:1 D2:1',
  ],
}

// 13〜16小節: ト長調に留まり、5小節目の刻む型を思い出してから、14小節目に8分で D6 まで上って伸ばす（山場）。
// 15小節目でフックのリズムに戻り、Fmaj7（ト長調の bVII＝イ長調の bVI）から E7 を経て主和音へ。伴奏は 3+3+2。
const climbAndReturnFromG: Passage = {
  chords: ['Cmaj7', 'D/C', 'Fmaj7 E7', 'A(add9)'],
  melody: [
    'v86 G5:1 v82 G5:.5 v88 B5:1 v84 C6:.25 B5:.25 v86 A5:1',
    'v86 A5:.5 v88 B5:.5 v90 C6:.5 v96 D6:2.5',
    'v90 C6:1.5 v84 B5:.5 v86 A5:1 v84 G#5:1',
    'v88 A5:3 r:1',
  ],
  harmony: [tres(CMAJ7), tres(D_OVER_C), tres2(FMAJ7, E7), tres(A_ADD9)],
  bass: [
    bass332('C2', 'C2', 'G2'),
    bass332('C2', 'C2', 'C3'),
    'F1:1.5 F1:.5 E1:1.5 E2:.5',
    bass332('A1', 'A1', 'E2'),
  ],
}

// ==========================================
// 案2: bVI のヘ長調へ移り、裏拍で歌って帰る
// ==========================================

// 9〜12小節: ヘ長調に留まる。拍の裏から入り、拍をまたいで伸ばすシンコペーション（𝄾 ♪ ♪ ♩ ♪ ♩）。
// 10小節目は付点4分から8分で上る別の形。12小節目は C7sus4 の F5 から E5 へ掛留を解く。
// 伴奏は2分音符の和音、低音は4分で歩く。
const offbeatInF: Passage = {
  chords: ['Dm9', 'Bbmaj7', 'Gm9 C9', 'C7sus4 C7'],
  melody: [
    'r:.5 v84 A5:.5 v86 C6:.5 v88 A5:1 v82 G5:.5 v86 F5:1',
    'v86 F5:1.5 v82 D5:.5 v84 F5:.5 G5:.5 v88 A5:1',
    'r:.5 v86 G5:.5 v88 Bb5:.5 v90 A5:1 v84 G5:.5 A5:.5 G5:.5',
    'v90 F5:2 v86 E5:2',
  ],
  harmony: [
    pad(['E4', 'F4', 'A4', 'C5']),
    pad(['D4', 'F4', 'A4', 'Bb4']),
    pad(['Bb3', 'D4', 'F4', 'A4'], ['Bb3', 'D4', 'E4', 'G4']),
    pad(['Bb3', 'C4', 'F4', 'G4'], ['Bb3', 'C4', 'E4', 'G4']),
  ],
  bass: [
    walk('D2', 'C2', 'Bb1', 'A1'),
    walk('Bb1', 'C2', 'D2', 'F2'),
    walk('G1', 'A1', 'C2', 'Bb1'),
    'C2:1.5 C2:.5 G1:1 C2:1',
  ],
}

// 13〜16小節: フック3小節目（Fmaj7 の C6–A5–G5–F5）をそのまま思い出し、裏拍から G#5–B5 と上って、
// 主和音の3度 C#6 を2小節伸ばす（山場）。最後は Dm6/A（iv6）の上で B5 に動き、フック冒頭の C#6 へつながる。
const holdHomeFromF: Passage = {
  chords: ['Fmaj7', 'Dm6 E7', 'A(add9)', 'Dm6/A'],
  melody: [
    'v88 C6:1.5 v84 A5:.5 v86 G5:1 v84 F5:1',
    'r:.5 v82 D5:.5 v84 F5:.5 v88 A5:1 v86 G#5:.5 v90 B5:1',
    'v96 C#6:4',
    '-:2 v84 B5:1 r:1',
  ],
  harmony: [
    pulse(FMAJ7, FMAJ7, 8),
    pulse(['D4', 'F4', 'A4', 'B4'], E7),
    tres(A_ADD9),
    tres(['D4', 'F4', 'A4', 'B4']),
  ],
  bass: [
    octaves('F1', 'F2', 'C2'),
    octaves2('D2', 'D3', 'E1', 'E2'),
    bass332('A1', 'A1', 'E2'),
    bass332('A1', 'A1', 'A2'),
  ],
}

// ==========================================
// 案3: 平行移動せず、動機を伸ばして縮めて伸ばす
// ==========================================

// 5〜8小節: フック1小節目と3小節目の旋律を2倍の長さに伸ばす（C#6–B5｜A5–E5、C6–A5｜G5–A5）。
// 旋律がゆっくりになるぶん、伴奏と低音は 3+3+2 で前へ進め、和音は1小節に2つ変わる。
const stretchedInA: Passage = {
  chords: ['F#m9', 'Dmaj7 C#m7', 'Fmaj7', 'Dm9 E7sus4'],
  melody: [
    'v86 C#6:3 v82 B5:1',
    'v86 A5:2 v82 E5:2',
    'v88 C6:3 v84 A5:1',
    'v86 G5:2 v84 A5:2',
  ],
  harmony: [
    tres(['E4', 'G#4', 'A4', 'C#5']),
    tres2(DMAJ7, ['E4', 'G#4', 'B4', 'C#5']),
    tres(FMAJ7),
    tres2(['E4', 'F4', 'A4', 'C5'], E7SUS4),
  ],
  bass: [
    bass332('F#1', 'F#1', 'C#2'),
    'D2:1.5 D2:.5 C#2:1.5 C#2:.5',
    bass332('F1', 'F1', 'C2'),
    'D2:1.5 D2:.5 E1:1.5 E2:.5',
  ],
}

// 9〜12小節: 同じ下行を付点8分＋16分に縮め（C#6. B5 A5 E5）、後半を8分の音階で上る。
// 10小節目は付点4分の別の形、11小節目で縮めた形に戻る。伴奏は裏拍、低音は4分で歩く。
const compressedInA: Passage = {
  chords: ['A(add9)', 'Cmaj7 D/C', 'Fmaj7 G/F', 'E7sus4 E7'],
  melody: [
    'v86 C#6:.75 v82 B5:.25 v84 A5:.5 E5:.5 v84 F#5:.5 G#5:.5 v88 A5:1',
    'v86 G5:1.5 v82 E5:.5 v84 F#5:1 G5:.5 A5:.5',
    'v88 C6:.75 v84 B5:.25 v86 A5:.5 F5:.5 v86 G5:.5 A5:.5 v90 B5:1',
    'v88 A5:2 v84 G#5:1 v88 B5:1',
  ],
  harmony: [
    offbeat(A_ADD9),
    offbeat(CMAJ7, D_OVER_C),
    offbeat(FMAJ7, ['D4', 'G4', 'B4', 'D5']),
    offbeat(E7SUS4, E7),
  ],
  bass: [
    walk('A1', 'B1', 'C#2', 'E2'),
    walk('C2', 'E2', 'C2', 'G1'),
    walk('F1', 'A1', 'F1', 'F2'),
    walk('E1', 'B1', 'E2', 'D2'),
  ],
}

// 13〜16小節: もう一度伸ばして山場の D6 を3拍保ち、E7 の G#5 を経て A5 を2小節伸ばす。
// 最後の小節で和音だけ C6/G（参考曲の bIII6/G）にずらし、フック冒頭の A(add9) へ戻る。伴奏はフックと同じ8分刻み。
const stretchedClose: Passage = {
  chords: ['Bm7', 'E7sus4 E7', 'A(add9)', 'C6/G'],
  melody: [
    'v96 D6:3 v86 C#6:1',
    'v88 B5:2 v84 A5:1 G#5:1',
    'v90 A5:4',
    '-:3 r:1',
  ],
  harmony: [
    pulse(DMAJ7, DMAJ7, 8),
    pulse(E7SUS4, E7),
    pulse(A_ADD9, A_ADD9, 8),
    pulse(['E4', 'G4', 'A4', 'C5'], ['E4', 'G4', 'A4', 'C5'], 8),
  ],
  bass: [
    octaves('B1', 'B2', 'F#2'),
    octaves2('E1', 'E2', 'E1', 'E2'),
    octaves('A1', 'A2', 'E2'),
    octaves('G1', 'G2', 'E2'),
  ],
}

// ==========================================
// 案4: 付点で駆ける応答を、句ごと短3度上へ
// ==========================================

// 5〜8小節: 付点8分＋16分で刺繍音を回る応答（a）、6小節目は付点4分の別の形（b）、7小節目は a の変形、8小節目で伸ばす。
// 和声は Bm9 → Dmaj7・E/D → Cmaj7・F/C（借用）→ E7sus4・E7。伴奏はシンコペーションの刻み。
// この句を9小節目から旋律・和声ごと短3度上（ハ長調）へ平行移動する。
export const dottedAnswer: Passage = {
  chords: ['Bm9', 'Dmaj7 E/D', 'Cmaj7 F/C', 'E7sus4 E7'],
  melody: [
    'v84 F#5:.75 v80 E5:.25 v84 F#5:.75 v80 G#5:.25 v88 A5:1 v84 F#5:1',
    'v86 A5:1.5 v82 B5:.5 v86 A5:1 v84 G#5:1',
    'v86 G5:.75 v82 F#5:.25 v84 E5:.75 v80 F#5:.25 v88 G5:1 A5:1',
    'v92 B5:2 v86 A5:1 G#5:1',
  ],
  harmony: [
    comp(DMAJ7),
    comp(DMAJ7, ['D4', 'E4', 'G#4', 'B4']),
    comp(CMAJ7, ['C4', 'F4', 'A4', 'C5']),
    comp(E7SUS4, E7),
  ],
  bass: [push('B1', 'B2'), push('D2', 'D3'), push('C2', 'C3'), push('E1', 'E2')],
}

// 13〜16小節: ハ長調に留まったまま、フックのリズムで枠を閉じる。Am9 の上で C6–B5–A5–E5（フック1小節目の C#6 が C6 になる）、
// bVI の Abmaj7 の長7度 G5 を伸ばし、Fmaj7 → E7 で主調へ戻って A5 で終える。伴奏はフックと同じ8分刻み。
export const frameInC: Passage = {
  chords: ['Am9', 'Abmaj7', 'Fmaj7 E7', 'A(add9)'],
  melody: [
    'v88 C6:1.5 v84 B5:.5 v86 A5:1 v84 E5:1',
    'v90 G5:3 r:1',
    'v88 C6:1.5 v84 B5:.5 v86 A5:1 v84 G#5:1',
    'v90 A5:4',
  ],
  harmony: [
    pulse(CMAJ7, CMAJ7, 8),
    pulse(['Eb4', 'G4', 'Ab4', 'C5'], ['Eb4', 'G4', 'Ab4', 'C5'], 8),
    pulse(FMAJ7, E7),
    pulse(A_ADD9, A_ADD9, 8),
  ],
  bass: [
    octaves('A1', 'A2', 'E2'),
    octaves('Ab1', 'Ab2', 'Eb2'),
    octaves2('F1', 'F2', 'E1', 'E2'),
    octaves('A1', 'A2', 'E2'),
  ],
}

// ==========================================
// Sketch 組み立て
// ==========================================

const HOOK = { label: 'フック', intention: '選ばれたフックのまま', passage: crystalMapHook }
const sketch = (draft: Omit<Parameters<typeof buildSketch>[0], 'tempo' | 'meter' | 'harmonyGate'>) =>
  buildSketch({ ...draft, tempo: 116, meter: [4, 4], harmonyGate: 0.9 })

export const secondCrystalMapDevelopments: CompositionStudy[] = [
  sketch({
    id: 'screen5-theme2-crystal-answer-whole-step',
    title: '水晶の地図 — 刻む応答から全音下へ',
    description:
      'イ長調 · ♩=116 · 4/4 · 16小節。5〜8小節は同音連打と16分の回りで上へ答え、伸ばすのは8小節目の掛留だけ。伴奏は2分の和音、低音は4分で歩く。9小節目でフックを全音下（ト長調）へ移し、13〜14小節もト長調に留まって8分で D6 まで上り伸ばす（山場）。15小節目でフックのリズムに戻り、Fmaj7 → E7 → 主和音。最後の4小節は 3+3+2 の伴奏',
    passages: [
      HOOK,
      { label: '刻む応答', intention: '同音連打と16分の回りで上へ答え、8小節目だけ伸ばす', passage: answerInA },
      { label: '平行移動', intention: '全音下（ト長調）へ、旋律と和声ごと', passage: transposePassage(crystalMapHook, -2) },
      { label: '留まって帰る', intention: 'ト長調で刻む型を思い出し、D6 まで上って伸ばす。bVI → E7 で主調へ', passage: climbAndReturnFromG },
    ],
    moments: [
      { bar: 5, beat: 0, pitches: ['D2', 'C#5', 'F#5'], intention: '刻む応答の始まり（Dmaj7、低音は4分で歩く）' },
      { bar: 8, beat: 2, pitches: ['B1', 'G#4', 'G#5'], intention: 'E7sus4 の A5 から G#5 へ掛留を解く' },
      { bar: 10, beat: 0, pitches: ['Bb1', 'F5'], intention: '全音下の Bbmaj7 の5度 F5' },
      { bar: 14, beat: 1.5, pitches: ['C2', 'F#4', 'D6'], intention: '山場の D6（D/C）' },
      { bar: 16, beat: 0, pitches: ['A1', 'C#5', 'A5'], intention: '主和音で終止' },
    ],
  }),
  sketch({
    id: 'screen5-theme2-crystal-flat-six-offbeat',
    title: '水晶の地図 — bVI のヘ長調へ移り、裏拍で歌って帰る',
    description:
      'イ長調 · ♩=116 · 4/4 · 16小節。5小節目でフックを長3度下（ヘ長調、イ長調の bVI）へ移す。9〜12小節はヘ長調に留まり、裏拍から入って拍をまたぐシンコペーションで歌う。伴奏は2分の和音、低音は4分で歩き、C7sus4 の掛留で区切る。13小節目でフック3小節目を思い出し、裏拍から上って主和音の3度 C#6 を2小節伸ばす（山場）。Dm6/A の B5 からフック冒頭へつながる',
    passages: [
      HOOK,
      { label: '平行移動', intention: '長3度下（ヘ長調＝bVI）へ、旋律と和声ごと', passage: transposePassage(crystalMapHook, -4, { bass: 1 }) },
      { label: '裏拍で留まる', intention: 'ヘ長調で拍の裏から入り、拍をまたいで歌う', passage: offbeatInF },
      { label: '帰着', intention: 'フック3小節目を思い出し、C#6 を2小節伸ばす。iv6 からフック冒頭へ', passage: holdHomeFromF },
    ],
    moments: [
      { bar: 6, beat: 0, pitches: ['Ab2', 'Eb5'], intention: '長3度下の Abmaj7 の5度 Eb5' },
      { bar: 9, beat: 1.5, pitches: ['F4', 'A5'], intention: '裏拍から入り拍をまたぐ A5（Dm9）' },
      { bar: 12, beat: 2, pitches: ['G1', 'E4', 'E5'], intention: 'C7sus4 の F5 から E5 へ掛留を解く' },
      { bar: 15, beat: 0, pitches: ['A1', 'C#5', 'C#6'], intention: '山場、主和音の3度 C#6 を2小節伸ばす' },
      { bar: 16, beat: 2, pitches: ['A1', 'F4', 'B5'], intention: 'Dm6/A（iv6）の上で B5、フック冒頭の C#6 へ' },
    ],
  }),
  sketch({
    id: 'screen5-theme2-crystal-stretch',
    title: '水晶の地図 — 平行移動せず、動機を伸ばして縮めて伸ばす',
    description:
      'イ長調 · ♩=116 · 4/4 · 16小節。5〜8小節はフックの旋律を2倍の長さに伸ばし、その下で伴奏と低音を 3+3+2 で進め、和音を1小節に2つ変える。9〜12小節は同じ下行を付点8分＋16分に縮め、後半を8分の音階で上る（伴奏は裏拍、低音は歩く）。13小節目でもう一度伸ばして山場の D6 を保ち、A5 を2小節伸ばす。最後の小節で和音だけ C6/G にずらしてフック冒頭へ',
    passages: [
      HOOK,
      { label: '伸ばす', intention: 'フックの旋律を2倍の長さで、伴奏は 3+3+2', passage: stretchedInA },
      { label: '縮める', intention: '下行を付点8分＋16分に縮め、8分の音階で上る', passage: compressedInA },
      { label: '伸ばして閉じる', intention: '山場の D6 を保ち、A5 を2小節伸ばして C6/G へずらす', passage: stretchedClose },
    ],
    moments: [
      { bar: 5, beat: 0, pitches: ['F#1', 'G#4', 'C#6'], intention: 'フック1小節目を2倍に伸ばした C#6（F#m9）' },
      { bar: 9, beat: 0.75, pitches: ['A1', 'B5'], intention: '縮めた付点8分＋16分の B5' },
      { bar: 13, beat: 0, pitches: ['B1', 'D6'], intention: '山場の D6（Bm7）' },
      { bar: 16, beat: 0, pitches: ['G1', 'C5', 'A5'], intention: 'A5 を保ったまま和音だけ C6/G へずらす' },
    ],
  }),
  sketch({
    id: 'screen5-theme2-crystal-dotted-sequence',
    title: '水晶の地図 — 付点で駆ける応答を、句ごと短3度上へ',
    description:
      'イ長調 · ♩=116 · 4/4 · 16小節。5〜8小節は付点8分＋16分で刺繍音を回る応答（伴奏はシンコペーションの刻み）。9小節目でこの応答の句を旋律・和声ごと短3度上（ハ長調）へ平行移動し、12小節目の D6 が山場。13〜14小節はハ長調に留まってフックのリズムに戻り、Am9 の上で C6、bVI の Abmaj7 の長7度 G5 を伸ばす。Fmaj7 → E7 で主調の A5 へ',
    passages: [
      HOOK,
      { label: '付点の応答', intention: '付点8分＋16分で刺繍音を回り、8小節目だけ伸ばす', passage: dottedAnswer },
      { label: '平行移動', intention: '応答の句を短3度上（ハ長調）へ、旋律と和声ごと', passage: transposePassage(dottedAnswer, 3) },
      { label: '枠を閉じる', intention: 'ハ長調に留まりフックのリズムで Am9 → Abmaj7、bVI → E7 で主調へ', passage: frameInC },
    ],
    moments: [
      { bar: 5, beat: 0.75, pitches: ['B1', 'E5'], intention: '付点8分＋16分の刺繍音 E5（Bm9）' },
      { bar: 9, beat: 0, pitches: ['D2', 'A5'], intention: '短3度上へ移した応答（Dm9）' },
      { bar: 12, beat: 0, pitches: ['G1', 'D6'], intention: '山場の D6（G7sus4）' },
      { bar: 14, beat: 0, pitches: ['Ab1', 'G5'], intention: 'bVI の Abmaj7 の長7度 G5' },
      { bar: 16, beat: 0, pitches: ['A1', 'C#5', 'A5'], intention: '主和音で終止' },
    ],
  }),
]
