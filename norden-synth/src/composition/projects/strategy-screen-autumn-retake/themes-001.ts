import { buildSketch, transposePassage, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { birchRidgeHook } from './hooks-002.ts'

// 「白樺の稜線」の主題の展開 01。
// フックの動機（長い音から歩み出して3拍保ち、隣の音へそっとステップする: 𝅗𝅥 ♩ ♩ | 𝅗𝅥. ♩）から展開する。
// 4案ともフックを冒頭4小節にそのまま保ち、平行移動の位置・幅・戻り方・山場を聴いてわかるほど変えた16小節。

type Voicing = readonly string[]

/** 4/4: 8分の分散和音（4声を上下）。 */
const flow44 = (v: Voicing) =>
  `v56 ${v[0]}:.5 v48 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5 ${v[2]}:.5 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5`

/** 4/4: 根音・2拍裏・5度・根音。 */
const drive = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`

/** 4/4: 頭・2拍裏・3拍裏・4拍でオクターブ上・4拍裏。 */
const push = (root: string, up: string) => `${root}:1.5 ${root}:1 ${root}:.5 ${up}:.5 ${root}:.5`

// ==========================================
// 案1: 全音上で留まり、高みへ開く
// ==========================================

const stayWholeStep: Passage = {
  chords: ['Fmaj9', 'G/F', 'Em7', 'Am9'],
  melody: [
    'v88 A5:2 v90 B5:1 v92 C6:1',
    'v96 F6:3 v92 E6:1',
    'v88 G5:2 v90 A5:1 v92 B5:1',
    'v94 E6:3 v90 D6:1',
  ],
  harmony: [
    flow44(['E4', 'G4', 'A4', 'C5']),
    flow44(['D4', 'G4', 'B4', 'D5']),
    flow44(['E4', 'G4', 'B4', 'D5']),
    flow44(['E4', 'A4', 'C5', 'E5']),
  ],
  bass: [drive('F1', 'C2'), drive('F1', 'D2'), drive('E1', 'B1'), drive('A1', 'E2')],
}

const closeWholeStep: Passage = {
  chords: ['Ebm9', 'F7sus4', 'Bbmaj9', 'Bb(add9)'],
  melody: [
    'v86 Gb5:2 v88 F5:1 v90 Eb5:1',
    'v92 F5:3 v88 G5:1',
    'v94 Bb5:2 v90 C6:1 v92 D6:1',
    'v96 Bb5:4',
  ],
  harmony: [
    flow44(['Eb4', 'Gb4', 'Bb4', 'Db5']),
    flow44(['Eb4', 'F4', 'Bb4', 'C5']),
    flow44(['D4', 'F4', 'A4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
  ],
  bass: [drive('Eb1', 'Bb1'), drive('F1', 'C2'), drive('Bb1', 'F2'), push('Bb1', 'F2')],
}

// ==========================================
// 案2: 言い直しから短3度上の雪明かりへ
// ==========================================

const restateDb: Passage = {
  chords: ['Bbmaj9', 'Gm9', 'Cm9', 'F7sus4'],
  melody: [
    'v86 F5:2 v88 G5:1 v90 A5:1',
    'v94 Bb5:3 v88 C6:1',
    'v88 C6:2 v90 D6:1 v92 Eb6:1',
    'v96 F6:3 v92 Eb6:1',
  ],
  harmony: [
    flow44(['D4', 'F4', 'A4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
    flow44(['Eb4', 'F4', 'A4', 'C5']),
  ],
  bass: [drive('Bb1', 'F2'), drive('G1', 'D2'), drive('C2', 'G2'), drive('F1', 'C2')],
}

const closeDb: Passage = {
  chords: ['Gbmaj7', 'Ebm9', 'F7sus4', 'Bbmaj9'],
  melody: [
    'v88 F5:2 v90 Gb5:1 v92 Ab5:1',
    'v94 Bb5:3 v90 Ab5:1',
    'v92 C6:2 v94 D6:1 v96 Eb6:1',
    'v96 D6:4',
  ],
  harmony: [
    flow44(['F4', 'Bb4', 'Db5', 'F5']),
    flow44(['Eb4', 'Gb4', 'Bb4', 'Db5']),
    flow44(['Eb4', 'F4', 'Bb4', 'C5']),
    flow44(['D4', 'F4', 'A4', 'C5']),
  ],
  bass: [drive('Gb1', 'Db2'), drive('Eb1', 'Bb1'), drive('F1', 'C2'), push('Bb1', 'F2')],
}

// ==========================================
// 案3: 全音下へ沈み、低音の推進力で戻る
// ==========================================

const stayAb: Passage = {
  chords: ['Dbmaj9', 'Eb/Db', 'Cm7', 'Fm9'],
  melody: [
    'v88 F5:2 v90 G5:1 v92 Ab5:1',
    'v96 C6:3 v92 Bb5:1',
    'v90 Ab5:2 v92 Bb5:1 v94 C6:1',
    'v96 Eb6:3 v92 Db6:1',
  ],
  harmony: [
    flow44(['F4', 'Ab4', 'C5', 'Eb5']),
    flow44(['Eb4', 'G4', 'Bb4', 'Eb5']),
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
    flow44(['Eb4', 'Ab4', 'C5', 'Eb5']),
  ],
  bass: [drive('Db2', 'Ab1'), drive('Db2', 'Bb1'), drive('C2', 'G1'), drive('F1', 'C2')],
}

const closeAb: Passage = {
  chords: ['Bbm9', 'Eb9', 'Fsus4', 'Bb(add9)'],
  melody: [
    'v88 Db6:2 v86 C6:1 v88 Bb5:1',
    'v92 C6:3 v88 Bb5:1',
    'v94 A5:2 v90 Bb5:1 v92 C6:1',
    'v96 Bb5:4',
  ],
  harmony: [
    flow44(['Db4', 'F4', 'Ab4', 'C5']),
    flow44(['Db4', 'Eb4', 'G4', 'Bb4']),
    flow44(['Eb4', 'F4', 'Bb4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
  ],
  bass: [drive('Bb1', 'F2'), drive('Eb1', 'Bb1'), drive('F1', 'C2'), push('Bb1', 'F2')],
}

// ==========================================
// 案4: 平行移動せず主調で歌い広げる
// ==========================================

const expandDiatonic: Passage = {
  chords: ['Cm9', 'Dm7', 'Ebmaj9', 'F9'],
  melody: [
    'v86 G5:2 v88 A5:1 v90 Bb5:1',
    'v94 C6:3 v88 D6:1',
    'v88 Bb5:2 v90 C6:1 v92 D6:1',
    'v96 Eb6:3 v90 D6:1',
  ],
  harmony: [
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
    flow44(['F4', 'A4', 'C5', 'D5']),
    flow44(['G4', 'Bb4', 'D5', 'F5']),
    flow44(['A4', 'C5', 'Eb5', 'G5']),
  ],
  bass: [drive('C2', 'G1'), drive('D2', 'A1'), drive('Eb1', 'Bb1'), drive('F1', 'C2')],
}

const climaxDiatonic: Passage = {
  chords: ['Gm9', 'Ebmaj9', 'Dm7', 'Cm9'],
  melody: [
    'v90 D6:2 v92 Eb6:1 v94 F6:1',
    'v96 G6:2 v92 F6:2',
    'v88 Eb6:2 v90 D6:1 v92 C6:1',
    'v94 D6:3 v88 C6:1',
  ],
  harmony: [
    flow44(['F4', 'A4', 'Bb4', 'D5']),
    flow44(['G4', 'Bb4', 'D5', 'F5']),
    flow44(['F4', 'A4', 'C5', 'D5']),
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
  ],
  bass: [drive('G1', 'D2'), drive('Eb1', 'Bb1'), drive('D2', 'A1'), drive('C2', 'G1')],
}

const closeDiatonic: Passage = {
  chords: ['Ebmaj7', 'F7sus4', 'F7', 'Bbmaj9'],
  melody: [
    'v88 G5:2 v90 A5:1 v92 Bb5:1',
    'v94 C6:3 v90 Bb5:1',
    'v92 A5:2 v90 Bb5:1 v94 C6:1',
    'v96 Bb5:4',
  ],
  harmony: [
    flow44(['G4', 'Bb4', 'D5', 'F5']),
    flow44(['F4', 'Bb4', 'C5', 'Eb5']),
    flow44(['F4', 'A4', 'C5', 'Eb5']),
    flow44(['D4', 'F4', 'A4', 'C5']),
  ],
  bass: [drive('Eb1', 'Bb1'), drive('F1', 'C2'), drive('F1', 'Eb2'), push('Bb1', 'F2')],
}

// ==========================================
// 候補の組み立て
// ==========================================

export const birchRidgeDevelopments: CompositionStudy[] = [
  buildSketch({
    id: 'autumn-retake-theme-birch-whole-step',
    title: '白樺の稜線 — 全音上で留まり、高みへ開く',
    description:
      '変ロ長調 · ♩=124 · 4/4。冒頭は「白樺の稜線」のフックそのまま。5小節目から全音上（ハ長調）へ平行移動し、移動先に留まって山場の最高音 F6 へ駆け上がる。最後はサブドミナントマイナーの影を通って主調へ美しく帰着する16小節',
    tempo: 124,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま提示', passage: birchRidgeHook },
      { label: '平行移動', intention: '全音上（ハ長調）へ、旋律と和声ごと移調', passage: transposePassage(birchRidgeHook, 2) },
      { label: '移動先に留まる', intention: 'ハ長調のまま最高音 F6 へ山場を開く', passage: stayWholeStep },
      { label: '帰着', intention: 'サブドミナントマイナーの影を経て主調へ美しく終止', passage: closeWholeStep },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['F1', 'D4', 'F6'], intention: 'ハ長調の山場で最高音 F6 を響かせる' },
      { bar: 13, beat: 0, pitches: ['Eb1', 'Eb4', 'Gb5'], intention: 'サブドミナントマイナー Ebm9 の影' },
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'Bb5'], intention: '主音 Bb5 で堂々と着地' },
    ],
  }),
  buildSketch({
    id: 'autumn-retake-theme-birch-minor-third',
    title: '白樺の稜線 — 言い直しから短3度上の雪明かりへ',
    description:
      '変ロ長調 · ♩=124 · 4/4。冒頭フックの後、主調のまま動機を言い直して上へ開く（半終止）。9小節目から短3度上（変ニ長調）へ平行移動し、雪明かりのような透明感を広げてから主調へ回帰する16小節',
    tempo: 124,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま提示', passage: birchRidgeHook },
      { label: '言い直し', intention: '主調のまま上へ開いて半終止へ導く', passage: restateDb },
      { label: '平行移動', intention: '短3度上（変ニ長調）へ平行移動し雪の気配を重ねる', passage: transposePassage(birchRidgeHook, 3) },
      { label: '帰着', intention: '変ニ長調から主調へ回帰し、3度音の豊かな余韻で閉じる', passage: closeDb },
    ],
    moments: [
      { bar: 8, beat: 0, pitches: ['F1', 'Eb4', 'F6'], intention: '半終止の上で高音 F6 へ抜ける' },
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'D6'], intention: '主和音の3度 D6 で豊かな余韻' },
    ],
  }),
  buildSketch({
    id: 'autumn-retake-theme-birch-whole-step-down',
    title: '白樺の稜線 — 全音下へ沈み、低音の推進力で戻る',
    description:
      '変ロ長調 · ♩=124 · 4/4。冒頭フックの後、5小節目から全音下（変イ長調）へ平行移動して夕暮れの深まりへ沈み、移動先に留まって低音の推進力とともに山場（Eb6）へ駆け上がり主調へ立ち上がる16小節',
    tempo: 124,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま提示', passage: birchRidgeHook },
      { label: '平行移動', intention: '全音下（変イ長調）へ沈む', passage: transposePassage(birchRidgeHook, -2, { bass: 0 }) },
      { label: '移動先に留まる', intention: '変イ長調で留まり、低音の推進力とともに Eb6 へ', passage: stayAb },
      { label: '帰着', intention: '力強く立ち上がり主音に着地', passage: closeAb },
    ],
    moments: [
      { bar: 12, beat: 0, pitches: ['F1', 'Eb4', 'Eb6'], intention: '変イ長調の最高音 Eb6' },
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'Bb5'], intention: '力強い主音着地' },
    ],
  }),
  buildSketch({
    id: 'autumn-retake-theme-birch-stay-diatonic',
    title: '白樺の稜線 — 平行移動せず主調で歌い広げる',
    description:
      '変ロ長調 · ♩=124 · 4/4。平行移動せず主調のまま展開。和声の内声をCm9→Dm7→Ebmaj9と広げ、9小節目で動機が山場の最高音 G6 へ大きく跳躍して歌い上げ、最後は完全終止で結ぶ16小節',
    tempo: 124,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま提示', passage: birchRidgeHook },
      { label: '言い直し・対比', intention: '主調のまま和声の内声を上へ広げる', passage: expandDiatonic },
      { label: '山場の展開', intention: '動機から最高音 G6 へ跳躍し歌い上げる', passage: climaxDiatonic },
      { label: '帰着', intention: '完全終止で堂々と結ぶ', passage: closeDiatonic },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Eb1', 'G4', 'G6'], intention: '曲全体の最高音 G6' },
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'Bb5'], intention: '主調の完全終止' },
    ],
  }),
]
