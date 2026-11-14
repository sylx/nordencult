import { buildSketch, transposePassage, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { crystalMapHook } from './hooks-001.ts'

// 「水晶の地図」の主題の展開 01。
// フック（A(add9) → Cmaj7 → Fmaj7 → E7sus4、♩=116、4/4）を冒頭にそのまま置き、続きをフックの動機から作る。
// 動機のリズム型: ♩. ♪ ♩ ♩ | 𝅗𝅥. 𝄽 。輪郭: 2度で2つ降りて4度ほど跳び降り、3度ほど跳び上がって伸ばす。
// 続きもこのリズム型のまま音高だけを変える（4拍目の休符を次の小節への4分の弱起にすることはある）。
//
// 和声は参考曲 srb-04（イ長調の夏の戦略画面、analysis/srb-04.txt）の語彙から取った（AI の読み取り）:
// bIII（C）・bVI（F、F6）・iv（Dm7、Dm6）の借用、主和音の下で低音を G に置く A7/G・C6/G、
// 全音下の bVII（G）の領域への移動、E7sus4 / Esus2 から主和音への帰着。
//
// 案ごとに、平行移動の位置（5小節目／9小節目／なし）、幅（全音下・短3度下・5度下）、戻り方、山場の位置を変える。

type Voicing = readonly string[]

const ACCENT = [60, 44, 44, 44, 56, 44, 44, 44]

/** 4/4: 8分の和音の刻み（フックと同じ伴奏）。split 個目の8分から和音 b に替える。 */
const pulse44 = (a: Voicing, b: Voicing = a, split = 8) =>
  ACCENT.map((v, i) => `v${v} ${(i < split ? a : b).join('+')}:.5`).join(' ')

/** 4/4: 8分のオクターブの往復（フックと同じ低音）。 */
const octaves = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`

// フックの小節を切り出す（言い直しで頭の2小節をそのまま使う）。
const hookBars = (from: number, to: number): Passage => ({
  chords: crystalMapHook.chords.slice(from, to),
  melody: crystalMapHook.melody.slice(from, to),
  harmony: crystalMapHook.harmony.slice(from, to),
  bass: crystalMapHook.bass.slice(from, to),
})

// ---------- よく使う響き ----------
const A_ADD9: Voicing = ['E4', 'A4', 'B4', 'C#5']
const E7SUS4: Voicing = ['D4', 'E4', 'A4', 'B4']
const E7: Voicing = ['D4', 'E4', 'G#4', 'B4']

// ==========================================
// 案1: 5小節目から全音下（ト長調）に留まり、bIII・bVI を通って帰る
// ==========================================

// 9〜12小節: ト長調に留まる。到達音を F#5（D/C のリディアの #4）→ B5 と上げ、11小節目に最高音 D6 を1回だけ置く。
// 12小節目の Cmaj7 はト長調の IV で、同時にイ長調の bIII（フック2小節目と同じ和音）。ここから帰り道に入る。
const stayInG: Passage = {
  chords: ['Am9', 'D/C', 'Em9', 'Cmaj7'],
  melody: [
    'v86 C6:1.5 v84 B5:.5 v86 A5:1 v84 E5:1',
    'v92 F#5:3 v86 A5:1',
    'v96 D6:1.5 v90 C6:.5 v88 B5:1 v86 G5:1',
    'v92 B5:3 r:1',
  ],
  harmony: [
    pulse44(['E4', 'G4', 'B4', 'C5']),
    pulse44(['D4', 'F#4', 'A4', 'D5']),
    pulse44(['D4', 'F#4', 'G4', 'B4']),
    pulse44(['E4', 'G4', 'B4', 'C5']),
  ],
  bass: [
    octaves('A1', 'A2', 'E2'),
    octaves('C2', 'C3', 'D2'),
    octaves('E1', 'E2', 'B1'),
    octaves('C2', 'C3', 'G2'),
  ],
}

// 13〜16小節: フック3小節目（Fmaj7 の C6–A5–G5–F5）をそのまま思い出し、iv7（Dm7）→ E7 → 主和音で完全終止。
const closeFromG: Passage = {
  chords: ['Fmaj7', 'Dm7', 'E7sus4 E7', 'A(add9)'],
  melody: [
    'v88 C6:1.5 v84 A5:.5 v86 G5:1 v84 F5:1',
    'v90 A5:3 r:1',
    'v88 B5:1.5 v84 A5:.5 v86 G#5:1 v84 E5:1',
    'v90 A5:4',
  ],
  harmony: [
    pulse44(['E4', 'F4', 'A4', 'C5']),
    pulse44(['D4', 'F4', 'A4', 'C5']),
    pulse44(E7SUS4, E7, 4),
    pulse44(A_ADD9),
  ],
  bass: [
    octaves('F1', 'F2', 'C2'),
    octaves('D2', 'D3', 'A2'),
    octaves('E1', 'E2', 'B1'),
    octaves('A1', 'A2', 'E2'),
  ],
}

// ==========================================
// 案2: 言い直しで C#7sus4 へ開き、9小節目から短3度下（嬰ヘ長調）へ。同主短調の F#m9 から帰る
// ==========================================

// 7〜8小節: フック3〜4小節目を変える。iv の Dm9 で C6–A5–F5–E5 と降り、
// 低音を D → C# と半音下げて C#7sus4 の G#5 を伸ばす（嬰ヘ長調への属和音）。
const restateToCSharp: Passage = {
  chords: ['Dm9', 'C#7sus4'],
  melody: [
    'v88 C6:1.5 v84 A5:.5 v86 F5:1 v84 E5:1',
    'v92 G#5:3 r:1',
  ],
  harmony: [
    pulse44(['E4', 'F4', 'A4', 'C5']),
    pulse44(['C#4', 'F#4', 'G#4', 'B4']),
  ],
  bass: [
    octaves('D2', 'D3', 'A2'),
    octaves('C#2', 'C#3', 'G#2'),
  ],
}

// 13〜16小節: F# を同主短調の F#m9（イ長調の vi）に替えて主調へ戻る。
// フック1小節目の C#6–B5–A5 を思い出し、15小節目に最高音 D6 を置いて、主和音の3度 C#6 で終える。
const closeFromFSharp: Passage = {
  chords: ['F#m9', 'Dmaj7', 'E7sus4', 'A(add9)'],
  melody: [
    'v88 C#6:1.5 v84 B5:.5 v86 A5:1 v84 F#5:1',
    'v90 A5:3 r:1',
    'v96 D6:1.5 v90 C#6:.5 v88 B5:1 v86 A5:1',
    'v92 C#6:4',
  ],
  harmony: [
    pulse44(['E4', 'G#4', 'A4', 'C#5']),
    pulse44(['D4', 'F#4', 'A4', 'C#5']),
    pulse44(E7SUS4),
    pulse44(A_ADD9),
  ],
  bass: [
    octaves('F#1', 'F#2', 'C#2'),
    octaves('D2', 'D3', 'A2'),
    octaves('E1', 'E2', 'B1'),
    octaves('A1', 'A2', 'E2'),
  ],
}

// ==========================================
// 案3: 平行移動せず、主調のまま借用和音で歌い広げる
// ==========================================

// 5〜8小節: フック1〜2小節目の旋律を、低音 G の上（A7/G → C6/G、参考曲の I7/G・bIII6/G）で付け直す。
// 7小節目の bVI6（F6）で最高音 D6 に届き、8小節目は E7sus4 の A5 から G#5 へ解決して半終止。
const restateOverG: Passage = {
  chords: ['A7/G', 'C6/G', 'F6', 'E7sus4 E7'],
  melody: [
    'v86 C#6:1.5 v84 B5:.5 v86 A5:1 v84 E5:1',
    'v92 G5:3 r:1',
    'v96 D6:1.5 v90 C6:.5 v88 A5:1 v86 F5:1',
    'v92 A5:3 v88 G#5:1',
  ],
  harmony: [
    pulse44(['C#4', 'E4', 'A4', 'B4']),
    pulse44(['E4', 'G4', 'A4', 'C5']),
    pulse44(['D4', 'F4', 'A4', 'C5']),
    pulse44(E7SUS4, E7, 6),
  ],
  bass: [
    octaves('G1', 'G2', 'E2'),
    octaves('G1', 'G2', 'E2'),
    octaves('F1', 'F2', 'C2'),
    octaves('E1', 'E2', 'B1'),
  ],
}

// 9〜12小節: 動機を3度下の音域（A5–G#5–F#5–C#5）で歌い、vi → IV → iv6 → E7sus4 と陰らせる。
const shadeInA: Passage = {
  chords: ['F#m7', 'Dmaj7', 'Dm6', 'E7sus4'],
  melody: [
    'v84 A5:1.5 v82 G#5:.5 v84 F#5:1 v82 C#5:1',
    'v88 E5:3 r:1',
    'v86 A5:1.5 v84 F5:.5 v86 E5:1 v84 B4:1',
    'v88 D5:3 r:1',
  ],
  harmony: [
    pulse44(['E4', 'F#4', 'A4', 'C#5']),
    pulse44(['D4', 'F#4', 'A4', 'C#5']),
    pulse44(['D4', 'F4', 'A4', 'B4']),
    pulse44(E7SUS4),
  ],
  bass: [
    octaves('F#1', 'F#2', 'C#2'),
    octaves('D2', 'D3', 'A2'),
    octaves('D2', 'D3', 'A2'),
    octaves('E1', 'E2', 'B1'),
  ],
}

// 13〜16小節: フックの bIII → bVI（Cmaj7 → Fmaj7）を旋律を変えて通り、iv6 と E7 から主和音へ。
const closeInA: Passage = {
  chords: ['Cmaj7', 'Fmaj7', 'Dm6 E7', 'A(add9)'],
  melody: [
    'v88 B5:1.5 v84 A5:.5 v86 G5:1 v84 E5:1',
    'v90 G5:3 r:1',
    'v88 B5:1.5 v84 A5:.5 v86 G#5:1 v84 E5:1',
    'v90 A5:3 r:1',
  ],
  harmony: [
    pulse44(['E4', 'G4', 'B4', 'C5']),
    pulse44(['E4', 'F4', 'A4', 'C5']),
    pulse44(['D4', 'F4', 'A4', 'B4'], E7, 4),
    pulse44(A_ADD9),
  ],
  bass: [
    octaves('C2', 'C3', 'G2'),
    octaves('F1', 'F2', 'C2'),
    'D2:.5 D3:.5 A2:.5 D3:.5 E1:.5 E2:.5 B1:.5 E2:.5',
    octaves('A1', 'A2', 'E2'),
  ],
}

// ==========================================
// 案4: 5小節目から5度下（ニ長調）へ沈み、その属和音を主和音に読み替えて帰る
// ==========================================

// 9〜12小節: ニ長調に留まる。5小節目の F#5–E5–D5 を言い直して到達音を B4 → D5 → F#5 と上げ、
// 4拍目の弱起（F#5、A5）で次の小節へ渡す。12小節目は G/A（ニ長調の属和音の響き）。
const stayInD: Passage = {
  chords: ['Gmaj7', 'Em9', 'Bm9', 'G/A'],
  melody: [
    'v84 F#5:1.5 v82 E5:.5 v84 D5:1 v82 B4:1',
    'v88 D5:3 v84 F#5:1',
    'v88 B5:1.5 v86 A5:.5 v88 F#5:1 v84 D5:1',
    'v90 F#5:3 v86 A5:1',
  ],
  harmony: [
    pulse44(['D4', 'F#4', 'G4', 'B4']),
    pulse44(['D4', 'F#4', 'G4', 'B4']),
    pulse44(['D4', 'F#4', 'A4', 'C#5']),
    pulse44(['D4', 'G4', 'B4', 'D5']),
  ],
  bass: [
    octaves('G1', 'G2', 'D2'),
    octaves('E1', 'E2', 'B1'),
    octaves('B1', 'B2', 'F#2'),
    octaves('A1', 'A2', 'E2'),
  ],
}

// 13〜16小節: G/A をニ長調へ解決させず、A(add9) に着いてフック1小節目の C#6–B5–A5–E5 を思い出す（山場）。
// 低音 A を保ったまま D/A → Dm6/A（iv6 の陰り）→ A(add9) と変格終止で閉じる。
const plagalHome: Passage = {
  chords: ['A(add9)', 'D/A', 'Dm6/A', 'A(add9)'],
  melody: [
    'v94 C#6:1.5 v88 B5:.5 v86 A5:1 v84 E5:1',
    'v90 A5:3 r:1',
    'v88 B5:1.5 v84 A5:.5 v86 F5:1 v84 D5:1',
    'v88 C#5:4',
  ],
  harmony: [
    pulse44(A_ADD9),
    pulse44(['D4', 'F#4', 'A4', 'D5']),
    pulse44(['D4', 'F4', 'A4', 'B4']),
    pulse44(A_ADD9),
  ],
  bass: [
    octaves('A1', 'A2', 'E2'),
    octaves('A1', 'A2', 'A1'),
    octaves('A1', 'A2', 'A1'),
    octaves('A1', 'A2', 'E2'),
  ],
}

// ==========================================
// Sketch 組み立て
// ==========================================

const HOOK = { label: 'フック', intention: '選ばれたフックのまま', passage: crystalMapHook }
const sketch = (draft: Omit<Parameters<typeof buildSketch>[0], 'tempo' | 'meter' | 'harmonyGate'>) =>
  buildSketch({ ...draft, tempo: 116, meter: [4, 4], harmonyGate: 0.7 })

export const crystalMapDevelopments: CompositionStudy[] = [
  sketch({
    id: 'screen5-theme-crystal-whole-step-down',
    title: '水晶の地図 — 全音下の影に留まり、bIII・bVI を通って帰る',
    description:
      'イ長調 · ♩=116 · 4/4 · 16小節。5小節目でフックを旋律と和声ごと全音下（ト長調、参考曲の bVII の領域）へ移し、9〜12小節もト長調に留まる。到達音を F#5（リディアの #4）→ B5 と上げ、11小節目に最高音 D6。12小節目の Cmaj7（ト長調の IV＝イ長調の bIII）から、フック3小節目の旋律と Dm7 → E7 を通って主和音へ完全終止',
    passages: [
      HOOK,
      { label: '平行移動', intention: '全音下（ト長調）へ、旋律と和声ごと', passage: transposePassage(crystalMapHook, -2) },
      { label: '留まる', intention: 'ト長調で到達音を上げ、11小節目に最高音 D6', passage: stayInG },
      { label: '帰着', intention: 'フック3小節目を思い出し、iv7 → E7 → 主和音', passage: closeFromG },
    ],
    moments: [
      { bar: 6, beat: 0, pitches: ['Bb1', 'F5'], intention: '全音下の Bbmaj7（ト長調の bIII）の5度 F5' },
      { bar: 10, beat: 0, pitches: ['C2', 'F#4', 'F#5'], intention: 'D/C の F#5（C に対するリディアの #4）' },
      { bar: 11, beat: 0, pitches: ['E1', 'D6'], intention: '最高音 D6（Em9 の7度）' },
      { bar: 16, beat: 0, pitches: ['A1', 'C#5', 'A5'], intention: '主和音で完全終止' },
    ],
  }),
  sketch({
    id: 'screen5-theme-crystal-minor-third-down',
    title: '水晶の地図 — 言い直しから短3度下へ、同主短調の影から帰る',
    description:
      'イ長調 · ♩=116 · 4/4 · 16小節。5〜6小節はフックの言い直し、7〜8小節を iv の Dm9 → C#7sus4（低音 D → C#）に変えて開く。9小節目でフックを短3度下（嬰ヘ長調）へ移す。13小節目で F# を同主短調の F#m9（イ長調の vi）に替えて主調へ戻り、15小節目に最高音 D6、主和音の3度 C#6 で終える',
    passages: [
      HOOK,
      { label: '言い直し', intention: 'フックの頭2小節をそのまま', passage: hookBars(0, 2) },
      { label: '言い直しの変化', intention: 'iv の Dm9 から C#7sus4 へ開く（短3度下への属和音）', passage: restateToCSharp },
      { label: '平行移動', intention: '短3度下（嬰ヘ長調）へ、旋律と和声ごと', passage: transposePassage(crystalMapHook, -3) },
      { label: '帰着', intention: 'F#m9 → Dmaj7 → E7sus4、15小節目に最高音 D6、C#6 で終止', passage: closeFromFSharp },
    ],
    moments: [
      { bar: 8, beat: 0, pitches: ['C#2', 'G#5'], intention: 'C#7sus4 の5度 G#5（嬰ヘ長調への属和音）' },
      { bar: 10, beat: 0, pitches: ['A1', 'E5'], intention: '短3度下の Amaj7 の5度 E5' },
      { bar: 13, beat: 0, pitches: ['F#1', 'A4', 'C#6'], intention: 'F# を同主短調 F#m9 に替える' },
      { bar: 15, beat: 0, pitches: ['E1', 'D6'], intention: '最高音 D6（E7sus4 の7度）' },
      { bar: 16, beat: 0, pitches: ['A1', 'C#6'], intention: '主和音の3度 C#6 で終止' },
    ],
  }),
  sketch({
    id: 'screen5-theme-crystal-home-key',
    title: '水晶の地図 — 平行移動せず、主調の借用和音で歌い広げる',
    description:
      'イ長調 · ♩=116 · 4/4 · 16小節。5〜6小節はフックの旋律を低音 G の上（A7/G → C6/G、参考曲の I7/G・bIII6/G）で付け直し、7小節目の bVI6 で最高音 D6、8小節目の E7 で半終止。9〜12小節は動機を3度下の音域で歌い vi → IV → iv6 と陰らせ、13〜16小節はフックの Cmaj7 → Fmaj7 を別の旋律で通って主和音へ',
    passages: [
      HOOK,
      { label: '言い直し', intention: '低音 G の上で付け直し、bVI6 で最高音 D6、E7 で半終止', passage: restateOverG },
      { label: '陰り', intention: '動機を3度下で、vi → IV → iv6 → E7sus4', passage: shadeInA },
      { label: '帰着', intention: 'bIII → bVI → iv6・E7 → 主和音', passage: closeInA },
    ],
    moments: [
      { bar: 5, beat: 0, pitches: ['G1', 'C#4', 'C#6'], intention: 'A7/G（主和音の下に低音 G）' },
      { bar: 7, beat: 0, pitches: ['F1', 'D4', 'D6'], intention: 'bVI6（F6）の6度で最高音 D6' },
      { bar: 8, beat: 3, pitches: ['E1', 'G#4', 'G#5'], intention: 'E7sus4 から E7 へ解決' },
      { bar: 11, beat: 0, pitches: ['D2', 'F4', 'B4', 'A5'], intention: 'iv6（Dm6）の陰り' },
      { bar: 16, beat: 0, pitches: ['A1', 'C#5', 'A5'], intention: '主和音で終止' },
    ],
  }),
  sketch({
    id: 'screen5-theme-crystal-fifth-down',
    title: '水晶の地図 — 5度下のニ長調へ沈み、属和音を主和音に読み替えて帰る',
    description:
      'イ長調 · ♩=116 · 4/4 · 16小節。5小節目でフックを旋律と和声ごと5度下（ニ長調）へ移し、低い音域に沈む。9〜12小節もニ長調に留まり、到達音を B4 → D5 → F#5 と上げて G/A（ニ長調の属和音の響き）へ。13小節目はニ長調へ解決せず A(add9) に着き、フック1小節目の C#6 を山場に思い出す。低音 A を保って D/A → Dm6/A → A(add9) の変格終止',
    passages: [
      HOOK,
      { label: '平行移動', intention: '5度下（ニ長調）へ、旋律と和声ごと', passage: transposePassage(crystalMapHook, -7, { bass: 1 }) },
      { label: '留まる', intention: 'ニ長調で到達音を上げ、G/A へ', passage: stayInD },
      { label: '帰着', intention: '属和音を主和音に読み替え、フック1小節目を山場に。iv6 から変格終止', passage: plagalHome },
    ],
    moments: [
      { bar: 6, beat: 0, pitches: ['F2', 'C5'], intention: '5度下の Fmaj7（ニ長調の bIII）の5度 C5' },
      { bar: 12, beat: 0, pitches: ['A1', 'G4', 'F#5'], intention: 'G/A の上で F#5（G の長7度）' },
      { bar: 13, beat: 0, pitches: ['A1', 'C#5', 'C#6'], intention: 'ニ長調へ解決せず A(add9) に着く' },
      { bar: 15, beat: 0, pitches: ['A1', 'F4', 'B5'], intention: 'Dm6/A（iv6）の陰り' },
      { bar: 16, beat: 0, pitches: ['A1', 'C#5'], intention: '主和音の3度で変格終止' },
    ],
  }),
]
