import { buildSketch, transposePassage, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { birchRidgeHook } from './hooks-002.ts'

// 「白樺の稜線」の主題の展開 02。
// 展開 01 への試聴メモ（頭に入ってこない急激な転調の回避、高すぎる音域の抑制、
// 不自然な言い直しの修正、平行移動と帰着の滑らかな連結）を踏まえた16小節の4案。
// フックの動機（長い音から歩み出して3拍保ち、隣の音へそっとステップする: 𝅗𝅥 ♩ ♩ | 𝅗𝅥. ♩）から展開する。

type Voicing = readonly string[]

/** 4/4: 8分の分散和音（4声を上下）。 */
const flow44 = (v: Voicing) =>
  `v56 ${v[0]}:.5 v48 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5 ${v[2]}:.5 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5`

/** 4/4: 根音・2拍裏・5度・根音。 */
const drive = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`

/** 4/4: 頭・2拍裏・3拍裏・4拍でオクターブ上・4拍裏。 */
const push = (root: string, up: string) => `${root}:1.5 ${root}:1 ${root}:.5 ${up}:.5 ${root}:.5`

// ==========================================
// 案1: 主調のまま澄んだ稜線を歌い継ぐ
// ==========================================

// 5〜8小節: フックの頭2小節をそのまま言い直し、7〜8小節で自然に上へ開く（半終止）
const restateOpenPure: Passage = {
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

// 9〜12小節: 主調の中で優しく展開、高すぎず自然な山場（F6〜Eb6）
const climaxPure: Passage = {
  chords: ['Gm7', 'Dm7', 'Ebmaj9', 'Cm7'],
  melody: [
    'v90 D6:2 v88 C6:1 v86 Bb5:1',
    'v94 F6:3 v90 D6:1',
    'v88 G5:2 v90 A5:1 v92 Bb5:1',
    'v94 Eb6:3 v90 D6:1',
  ],
  harmony: [
    flow44(['D4', 'F4', 'Bb4', 'D5']),
    flow44(['D4', 'F4', 'A4', 'C5']),
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
    flow44(['Eb4', 'G4', 'Bb4', 'C5']),
  ],
  bass: [drive('G1', 'D2'), drive('D2', 'A1'), drive('Eb1', 'Bb1'), drive('C2', 'G1')],
}

// 13〜16小節: 完全終止で堂々と結ぶ
const closePure: Passage = {
  chords: ['Ebmaj9', 'F7sus4', 'F7', 'Bb(add9)'],
  melody: [
    'v88 F5:2 v90 G5:1 v92 A5:1',
    'v94 Bb5:3 v90 C6:1',
    'v92 D6:2 v90 C6:1 v92 A5:1',
    'v96 Bb5:4',
  ],
  harmony: [
    flow44(['G4', 'Bb4', 'D5', 'F5']),
    flow44(['F4', 'Bb4', 'C5', 'Eb5']),
    flow44(['F4', 'A4', 'C5', 'Eb5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
  ],
  bass: [drive('Eb1', 'Bb1'), drive('F1', 'C2'), drive('F1', 'Eb2'), push('Bb1', 'F2')],
}

// ==========================================
// 案2: 言い直しから属調（ヘ長調）へ平行移動
// ==========================================

const restateDominant: Passage = {
  chords: ['Bbmaj9', 'Gm9', 'Cm9', 'Fsus4'],
  melody: [
    'v86 F5:2 v88 G5:1 v90 A5:1',
    'v94 Bb5:3 v88 C6:1',
    'v88 C6:2 v90 D6:1 v92 Eb6:1',
    'v94 D6:3 v90 C6:1',
  ],
  harmony: [
    flow44(['D4', 'F4', 'A4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
    flow44(['Eb4', 'F4', 'Bb4', 'C5']),
  ],
  bass: [drive('Bb1', 'F2'), drive('G1', 'D2'), drive('C2', 'G2'), drive('F1', 'C2')],
}

const closeFromF: Passage = {
  chords: ['Gm7', 'Cm9', 'F7sus4', 'Bb(add9)'],
  melody: [
    'v88 Bb5:2 v86 A5:1 v88 G5:1',
    'v92 C6:3 v88 D6:1',
    'v94 Eb6:2 v90 D6:1 v92 C6:1',
    'v96 Bb5:4',
  ],
  harmony: [
    flow44(['D4', 'F4', 'Bb4', 'D5']),
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
    flow44(['Eb4', 'F4', 'A4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
  ],
  bass: [drive('G1', 'D2'), drive('C2', 'G2'), drive('F1', 'C2'), push('Bb1', 'F2')],
}

// ==========================================
// 案3: 言い直しから全音下（変イ長調）へ平行移動
// ==========================================

const restateToBb: Passage = {
  chords: ['Bbmaj9', 'Gm9', 'Ebmaj9', 'Bbmaj9'],
  melody: [
    'v86 F5:2 v88 G5:1 v90 A5:1',
    'v94 Bb5:3 v88 C6:1',
    'v88 G5:2 v90 A5:1 v92 Bb5:1',
    'v94 F5:4',
  ],
  harmony: [
    flow44(['D4', 'F4', 'A4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
    flow44(['D4', 'F4', 'A4', 'C5']),
  ],
  bass: [drive('Bb1', 'F2'), drive('G1', 'D2'), drive('Eb1', 'Bb1'), push('Bb1', 'F2')],
}

const closeFromAb: Passage = {
  chords: ['Dbmaj7', 'Ebm9', 'F7sus4', 'Bb(add9)'],
  melody: [
    'v88 F5:2 v90 G5:1 v92 Ab5:1',
    'v94 Bb5:3 v90 C6:1',
    'v96 D6:2 v92 C6:1 v94 A5:1',
    'v96 Bb5:4',
  ],
  harmony: [
    flow44(['F4', 'Ab4', 'C5', 'Db5']),
    flow44(['Eb4', 'Gb4', 'Bb4', 'Db5']),
    flow44(['Eb4', 'F4', 'Bb4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
  ],
  bass: [drive('Db2', 'Ab1'), drive('Eb1', 'Bb1'), drive('F1', 'C2'), push('Bb1', 'F2')],
}

// ==========================================
// 案4: 下属調（変ホ長調）へ平行移動し、実りを広げる
// ==========================================

const stayEb: Passage = {
  chords: ['Abmaj9', 'Bb/Ab', 'Gm7', 'Cm9'],
  melody: [
    'v88 C5:2 v90 D5:1 v92 Eb5:1',
    'v96 Ab5:3 v92 G5:1',
    'v88 Bb4:2 v90 C5:1 v92 D5:1',
    'v94 G5:3 v90 F5:1',
  ],
  harmony: [
    flow44(['Eb4', 'G4', 'Bb4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
    flow44(['D4', 'G4', 'Bb4', 'D5']),
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
  ],
  bass: [drive('Ab1', 'Eb2'), drive('Ab1', 'F2'), drive('G1', 'D2'), drive('C2', 'G1')],
}

const closeFromEb: Passage = {
  chords: ['Fm9', 'Bb7sus4', 'F7', 'Bb(add9)'],
  melody: [
    'v88 Ab5:2 v90 G5:1 v92 F5:1',
    'v94 Bb5:3 v90 C6:1',
    'v96 D6:2 v92 C6:1 v94 A5:1',
    'v96 Bb5:4',
  ],
  harmony: [
    flow44(['Eb4', 'Ab4', 'C5', 'Eb5']),
    flow44(['D4', 'F4', 'Ab4', 'Bb4']),
    flow44(['Eb4', 'F4', 'A4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
  ],
  bass: [drive('F1', 'C2'), drive('Bb1', 'F2'), drive('F1', 'Eb2'), push('Bb1', 'F2')],
}

// ==========================================
// 候補の組み立て
// ==========================================

export const secondBirchRidgeDevelopments: CompositionStudy[] = [
  buildSketch({
    id: 'autumn-retake-theme2-birch-diatonic-pure',
    title: '白樺の稜線 — 主調のまま澄んだ稜線を歌い継ぐ',
    description:
      '変ロ長調 · ♩=124 · 4/4。前回の「一番まとも」をブラッシュアップ。平行移動せず主調のまま、冒頭2小節をそのまま言い直して上へ開き、高すぎない自然な山場（F6〜Eb6）を経て完全終止で結ぶ端正な16小節',
    tempo: 124,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま提示', passage: birchRidgeHook },
      { label: '言い直し', intention: '冒頭2小節をそのまま言い直し、上へ開いて半終止へ', passage: restateOpenPure },
      { label: '山場の展開', intention: '主調の中で動機が展開し、高すぎず自然な山場（F6）を築く', passage: climaxPure },
      { label: '帰着', intention: '完全終止で主音へ着地', passage: closePure },
    ],
    moments: [
      { bar: 8, beat: 0, pitches: ['F1', 'Eb4', 'F6'], intention: '半終止の上でF6へ到達' },
      { bar: 10, beat: 0, pitches: ['D2', 'D4', 'F6'], intention: 'Dm7の上でF6を響かせる' },
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'Bb5'], intention: '主調の完全終止' },
    ],
  }),
  buildSketch({
    id: 'autumn-retake-theme2-birch-dominant-shift',
    title: '白樺の稜線 — 言い直しから属調（ヘ長調）へ平行移動',
    description:
      '変ロ長調 · ♩=124 · 4/4。冒頭フックの後、言い直しで主調を確立してから、9小節目で最も無理のない属調（ヘ長調）へ平行移動。落ち着いた歌心ある音域で歌い、主調へ滑らかに回帰する16小節',
    tempo: 124,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま提示', passage: birchRidgeHook },
      { label: '言い直し', intention: '主調で言い直し、Fsus4へ導く', passage: restateDominant },
      { label: '平行移動', intention: '属調（ヘ長調）へ平行移動し、落ち着いた音域で歌う', passage: transposePassage(birchRidgeHook, -5, { bass: 0 }) },
      { label: '帰着', intention: 'ヘ長調からGm7・Cm9を経て主調へ滑らかに回帰', passage: closeFromF },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['D1', 'A3', 'F5'], intention: 'ヘ長調の主音 F5' },
      { bar: 15, beat: 0, pitches: ['F1', 'Eb4', 'Eb6'], intention: 'ドミナントの上でEb6から主音へ' },
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'Bb5'], intention: '主音着地' },
    ],
  }),
  buildSketch({
    id: 'autumn-retake-theme2-birch-ab-refined',
    title: '白樺の稜線 — 言い直しから全音下（変イ長調）へ平行移動',
    description:
      '変ロ長調 · ♩=124 · 4/4。前回の「全音下」を改良。5〜8小節の言い直しで一度主和音（Bbmaj9）に着地させてから9小節目で全音下（変イ長調）へ平行移動することで、夕暮れが深まるような自然な連結を実現した16小節',
    tempo: 124,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま提示', passage: birchRidgeHook },
      { label: '言い直し', intention: '言い直しで主和音（Bbmaj9）に一度静かに着地', passage: restateToBb },
      { label: '平行移動', intention: '主調の解決から全音下（変イ長調）へ自然に沈む', passage: transposePassage(birchRidgeHook, -2, { bass: 0 }) },
      { label: '帰着', intention: '変イ長調からドミナントを経て主調へ堂々と回帰', passage: closeFromAb },
    ],
    moments: [
      { bar: 8, beat: 0, pitches: ['Bb1', 'D4', 'F5'], intention: '主調で一度静かに解決' },
      { bar: 10, beat: 0, pitches: ['F1', 'C4', 'Ab5'], intention: '変イ長調の主音 Ab5' },
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'Bb5'], intention: '主調Bbへ堂々たる帰着' },
    ],
  }),
  buildSketch({
    id: 'autumn-retake-theme2-birch-subdominant-shift',
    title: '白樺の稜線 — 下属調（変ホ長調）へ平行移動し、実りを広げる',
    description:
      '変ロ長調 · ♩=124 · 4/4。フックの終わり（Fsus4）から5小節目で下属調（変ホ長調）へ平行移動。ドミナントからの解決のように滑らかに接続し、変ホ長調に留まって実りの豊かさを広げ、主調へ雄大に帰着する16小節',
    tempo: 124,
    meter: [4, 4],
    passages: [
      { label: 'フック', intention: '選ばれたフックのまま提示', passage: birchRidgeHook },
      { label: '平行移動', intention: '下属調（変ホ長調）へスムーズに平行移動', passage: transposePassage(birchRidgeHook, -7, { bass: 0 }) },
      { label: '移動先に留まる', intention: '変ホ長調に留まり、温かな実りを歌い上げる', passage: stayEb },
      { label: '帰着', intention: '変ホ長調からドミナントを経て主調へ雄大に帰着', passage: closeFromEb },
    ],
    moments: [
      { bar: 10, beat: 0, pitches: ['Ab1', 'D4', 'Ab5'], intention: '変ホ長調のAbmaj9の根音 Ab5' },
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'Bb5'], intention: '主調Bbへ雄大な帰着' },
    ],
  }),
]
