import { buildSketch, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'

// 秋の戦略画面（リテイク）のフック集 02。
// フック集 01 への試聴メモ（「澄んだ空、遠い雲」がイメージに近い、極端な跳躍や機械的アルペジオの回避、
// 攻勢への期待と冬への不安を両立する引き締まった主題）を踏まえた12案。
// COMPOSING.md の「フックの書き方」に従い、旋律のリズム型（1〜2小節）と輪郭を先に決め、
// 同じリズム型を2回繰り返す（2回目は音高や到達音を変える）。伸ばす音は拍頭で、和音の構成音または長7度・9度・テンション。
// 各案でリズム型・輪郭・拍子・和声の発想（平行移動、テンション、ドリア、リディア、3+3+2など）を変える。
// テンポは ♩=120〜144。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

// ---------- 伴奏の型 ----------

/** 4/4: 8分の和音の刻み。1拍目と3拍目に軽いアクセント。 */
const pulse44 = (v: Voicing) => {
  const c = ch(v)
  return `v62 ${c}:.5 v46 ${c}:.5 ${c}:.5 ${c}:.5 v58 ${c}:.5 v46 ${c}:.5 ${c}:.5 ${c}:.5`
}

/** 4/4: 2分音符で保つ和音。動きは低音と旋律に任せる。 */
const pad44 = (v: Voicing) => `v56 ${ch(v)}:2 v50 ${ch(v)}:2`

/** 4/4: シンコペーションを1つ含む軽い刻み。 */
const comp44 = (v: Voicing) => {
  const c = ch(v)
  return `v60 ${c}:1 r:.5 v50 ${c}:.5 r:.5 v54 ${c}:.5 v50 ${c}:1`
}

/** 4/4: 3+3+2 の和音。旋律のリズムと揃える。 */
const tresillo44 = (v: Voicing) => `v62 ${ch(v)}:1.5 v56 ${ch(v)}:1.5 v58 ${ch(v)}:1`

/** 4/4: 8分の分散和音（4声を上下）。 */
const flow44 = (v: Voicing) =>
  `v56 ${v[0]}:.5 v48 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5 ${v[2]}:.5 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5`

/** 3/4: 1拍目を低音に任せ、2・3拍目に和音を置くワルツ。 */
const waltz34 = (v: Voicing) => `r:1 v54 ${ch(v)}:1 v48 ${ch(v)}:1`

/** 6/8: 拍頭を休み、8分2つで和音を揺らす。 */
const sway68 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v54 ${c}:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 v46 ${c}:.5`
}

// ---------- 低音の型 ----------

/** 4/4: 根音・2拍裏・5度・根音。 */
const drive = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`

/** 4/4: 8分のオクターブの往復。前へ進む推進力。 */
const octaves = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`

/** 4/4: 頭・2拍裏・3拍裏・4拍でオクターブ上・4拍裏。 */
const push = (root: string, up: string) => `${root}:1.5 ${root}:1 ${root}:.5 ${up}:.5 ${root}:.5`

// ==========================================
// 12案の Passage 定義
// ==========================================

// ---------- 01 黄金の斥候 ----------
// リズム型: ♩ ♩ ♩. ♪ | 𝅗𝅥 𝅗𝅥 。跳んで順次に上がり、2拍伸ばして降りる。2回目は1音上から始めて最高音D6へ。
export const goldenScoutHook: Passage = {
  chords: ['Gmaj9', 'Em9', 'Cmaj9', 'Dsus4(add9)'],
  melody: [
    'v86 D5:1 v88 G5:1 v92 A5:1.5 v88 B5:.5',
    'v94 C6:2 v90 B5:2',
    'v86 E5:1 v88 A5:1 v92 B5:1.5 v88 C6:.5',
    'v96 D6:2 v92 B5:2',
  ],
  harmony: [
    pulse44(['F#4', 'A4', 'B4', 'D5']),
    pulse44(['G4', 'B4', 'D5', 'F#5']),
    pulse44(['G4', 'B4', 'D5', 'E5']),
    pulse44(['G4', 'A4', 'D5', 'E5']),
  ],
  bass: [drive('G1', 'D2'), drive('E1', 'B1'), drive('C2', 'G2'), drive('D2', 'A1')],
}

// ---------- 02 北風の狼煙 ----------
// リズム型: ♪ ♪ ♩ ♩ ♩ | 𝅗 。8分2つから順次に駆け上がり、全音符で保つ。2回目はドリアの長6度 B5 を経由して主音 D6 へ。
export const northBeaconHook: Passage = {
  chords: ['Dm9', 'Bbmaj9', 'G9', 'A7sus4'],
  melody: [
    'v84 D5:.5 E5:.5 v88 F5:1 v90 G5:1 v92 A5:1',
    'v94 C6:4',
    'v84 E5:.5 F5:.5 v88 G5:1 v90 A5:1 v92 B5:1',
    'v96 D6:4',
  ],
  harmony: [
    pad44(['F4', 'A4', 'C5', 'E5']),
    pad44(['F4', 'A4', 'C5', 'D5']),
    pad44(['F4', 'A4', 'B4', 'D5']),
    pad44(['E4', 'G4', 'A4', 'D5']),
  ],
  bass: [
    octaves('D1', 'D2', 'A1'),
    octaves('Bb1', 'Bb2', 'F2'),
    octaves('G1', 'G2', 'D2'),
    octaves('A1', 'A2', 'E2'),
  ],
}

// ---------- 03 霜降る朝の行軍 ----------
// リズム型: ♩ ♩. ♪ ♩ | 𝅗 。跳んで順次に上がり全音符へ。「澄んだ空」の短3度上平行移動（Fmaj9→Abmaj9）を発展。
export const frostMarchHook: Passage = {
  chords: ['Fmaj9', 'Fmaj7', 'Abmaj9', 'Abmaj7'],
  melody: [
    'v84 C5:1 v88 F5:1.5 v86 G5:.5 v92 A5:1',
    'v96 C6:4',
    'v84 Eb5:1 v88 Ab5:1.5 v86 Bb5:.5 v92 C6:1',
    'v96 Eb6:4',
  ],
  harmony: [
    pad44(['A3', 'C4', 'E4', 'G4']),
    pad44(['A3', 'C4', 'E4', 'A4']),
    pad44(['C4', 'Eb4', 'G4', 'Bb4']),
    pad44(['C4', 'Eb4', 'G4', 'C5']),
  ],
  bass: [
    octaves('F1', 'F2', 'C2'),
    push('F1', 'C2'),
    octaves('Ab1', 'Ab2', 'Eb2'),
    push('Ab1', 'Eb2'),
  ],
}

// ---------- 04 収穫の篝火 ----------
// リズム型: ♩ ♩ ♩ | ♩. ♪ ♩ 。3/4拍子で駆け上がり、付点4分で保って降りる。2回目は1音上からD6へ。
export const harvestBonfireHook: Passage = {
  chords: ['Am9', 'D9/F#', 'Fmaj7', 'E7sus4'],
  melody: [
    'v86 E5:1 v90 A5:1 v92 B5:1',
    'v94 C6:1.5 v88 B5:.5 v86 A5:1',
    'v86 F5:1 v90 B5:1 v92 C6:1',
    'v96 D6:1.5 v90 C6:.5 v88 B5:1',
  ],
  harmony: [
    waltz34(['C4', 'E4', 'G4', 'B4']),
    waltz34(['C4', 'D4', 'F#4', 'A4']),
    waltz34(['C4', 'E4', 'A4']),
    waltz34(['B3', 'D4', 'E4', 'A4']),
  ],
  bass: ['A1:1 r:2', 'F#1:1 r:2', 'F1:1 r:2', 'E1:1 r:2'],
}

// ---------- 05 白樺の稜線 ----------
// リズム型: 𝅗𝅥 ♩ ♩ | 𝅗𝅥. ♩ 。長い音から歩み出して3拍保ち、ステップする。伴奏は流れるような8分分散和音。
export const birchRidgeHook: Passage = {
  chords: ['Bbmaj9', 'Gm9', 'Ebmaj9', 'Fsus4(add9)'],
  melody: [
    'v86 F5:2 v88 G5:1 v90 A5:1',
    'v94 Bb5:3 v88 C6:1',
    'v86 G5:2 v88 A5:1 v90 Bb5:1',
    'v96 D6:3 v90 C6:1',
  ],
  harmony: [
    flow44(['D4', 'F4', 'A4', 'C5']),
    flow44(['D4', 'F4', 'Bb4', 'D5']),
    flow44(['Eb4', 'G4', 'Bb4', 'D5']),
    flow44(['Eb4', 'F4', 'Bb4', 'C5']),
  ],
  bass: [drive('Bb1', 'F2'), drive('G1', 'D2'), drive('Eb1', 'Bb1'), drive('F1', 'C2')],
}

// ---------- 06 琥珀の回廊 ----------
// リズム型: ♩. ♪ ♩ ♩ | 𝅗 。付点のリズムで踏み出し、全音符で伸ばす。伴奏はシンコペーションを1つ含む刻み。
export const amberCorridorHook: Passage = {
  chords: ['Em9', 'Cmaj9', 'Am9', 'Bm7'],
  melody: [
    'v86 B4:1.5 v84 E5:.5 v88 F#5:1 v90 G5:1',
    'v94 A5:4',
    'v86 C5:1.5 v84 F#5:.5 v88 G5:1 v90 A5:1',
    'v96 B5:4',
  ],
  harmony: [
    comp44(['G3', 'B3', 'D4', 'F#4']),
    comp44(['G3', 'B3', 'D4', 'E4']),
    comp44(['G3', 'C4', 'E4', 'G4']),
    comp44(['F#3', 'A3', 'D4', 'F#4']),
  ],
  bass: [push('E1', 'B1'), push('C2', 'G1'), push('A1', 'E2'), push('B1', 'F#2')],
}

// ---------- 07 雁の遠鳴き ----------
// リズム型: ♩. ♩ ♪ | 𝅗. 。6/8拍子で降りてステップし、澄んだ音を保つ。伴奏は拍頭を休む揺らぎ。
export const wildGeeseHook: Passage = {
  chords: ['Dmaj9', 'Bm9', 'Gmaj9', 'A(add9)'],
  melody: [
    'v92 A5:1.5 v86 F#5:1 v88 G5:.5',
    'v94 A5:3',
    'v94 B5:1.5 v88 G5:1 v90 A5:.5',
    'v96 F#5:3',
  ],
  harmony: [
    sway68(['F#3', 'A3', 'C#4', 'E4']),
    sway68(['F#3', 'A3', 'D4', 'E4']),
    sway68(['G3', 'B3', 'D4', 'F#4']),
    sway68(['E3', 'A3', 'C#4', 'B4']),
  ],
  bass: ['D2:1.5 A1:1.5', 'B1:1.5 F#1:1.5', 'G1:1.5 D2:1.5', 'A1:1.5 E2:1.5'],
}

// ---------- 08 谷風の物見櫓 ----------
// リズム型: ♩ ♩ ♩ ♩ | 𝅗 。4分4つでリディアの#4音（F#5）を通って上がり、長7度 B5 を全音符で伸ばす。
export const valleyWatchtowerHook: Passage = {
  chords: ['Cmaj7(#11)', 'D/C', 'Bm7', 'Em9'],
  melody: [
    'v86 E5:1 v88 F#5:1 v90 G5:1 v92 A5:1',
    'v96 B5:4',
    'v86 D5:1 v88 E5:1 v90 F#5:1 v92 G5:1',
    'v94 A5:4',
  ],
  harmony: [
    pulse44(['E4', 'G4', 'B4', 'D5']),
    pulse44(['F#4', 'A4', 'D5', 'F#5']),
    pulse44(['D4', 'F#4', 'A4', 'D5']),
    pulse44(['E4', 'G4', 'B4', 'F#5']),
  ],
  bass: [
    octaves('C2', 'C3', 'G2'),
    octaves('C2', 'C3', 'A2'),
    octaves('B1', 'B2', 'F#2'),
    octaves('E1', 'E2', 'B1'),
  ],
}

// ---------- 09 落葉と蹄音 ----------
// リズム型: 3+3+2 (♩. ♩. ♩ | 𝅗 )。力強い 3+3+2 で上がり、全音符で保つ。規律ある行進の緊張感。
export const leavesAndHoovesHook: Passage = {
  chords: ['Am7', 'Fmaj7', 'Dm9', 'Em7'],
  melody: [
    'v88 A4:1.5 v90 C5:1.5 v92 E5:1',
    'v96 G5:4',
    'v88 B4:1.5 v90 D5:1.5 v92 F5:1',
    'v96 A5:4',
  ],
  harmony: [
    tresillo44(['C4', 'E4', 'G4']),
    tresillo44(['C4', 'E4', 'A4']),
    tresillo44(['D4', 'F4', 'A4', 'C5']),
    tresillo44(['E4', 'G4', 'B4', 'D5']),
  ],
  bass: ['A1:1.5 A1:1.5 E2:1', 'F1:1.5 F1:1.5 C2:1', 'D2:1.5 D2:1.5 A1:1', 'E1:1.5 E1:1.5 B1:1'],
}

// ---------- 10 晩秋の陣旗 ----------
// リズム型: ♩ ♩ 𝅗𝅥 | 𝅗 。2音歩んで伸ばし、全音下へ平行移動（Fmaj9→Ebmaj9）。堂々たる旗のたなびき。
export const lateAutumnBannerHook: Passage = {
  chords: ['Fmaj9', 'Fmaj7', 'Ebmaj9', 'Ebmaj7'],
  melody: [
    'v88 A5:1 v90 Bb5:1 v94 C6:2',
    'v96 C6:4',
    'v88 G5:1 v90 Ab5:1 v94 Bb5:2',
    'v96 Bb5:4',
  ],
  harmony: [
    pad44(['A3', 'C4', 'E4', 'G4']),
    pad44(['A3', 'C4', 'E4', 'A4']),
    pad44(['G3', 'Bb3', 'D4', 'F4']),
    pad44(['G3', 'Bb3', 'D4', 'G4']),
  ],
  bass: [drive('F1', 'C2'), push('F1', 'C2'), drive('Eb1', 'Bb1'), push('Eb1', 'Bb1')],
}

// ---------- 11 早霜の城壁 ----------
// リズム型: ♩ ♩ ♩ | 𝅗. 。3/4拍子で駆け上がり、付点2分で保つ。Gm9→Ebmaj7→Cm9→D7sus4。
export const earlyFrostRampartHook: Passage = {
  chords: ['Gm9', 'Ebmaj7', 'Cm9', 'D7sus4'],
  melody: [
    'v86 D5:1 v88 G5:1 v90 A5:1',
    'v94 Bb5:3',
    'v86 Eb5:1 v88 A5:1 v90 Bb5:1',
    'v96 C6:3',
  ],
  harmony: [
    waltz34(['Bb3', 'D4', 'F4', 'A4']),
    waltz34(['Bb3', 'D4', 'G4']),
    waltz34(['G3', 'Bb3', 'D4', 'Eb4']),
    waltz34(['A3', 'C4', 'D4', 'G4']),
  ],
  bass: ['G1:1 r:2', 'Eb1:1 r:2', 'C2:1 r:2', 'D2:1 r:2'],
}

// ---------- 12 収穫の誓い ----------
// リズム型: 𝅗𝅥 ♩. ♪ | 𝅗 。2拍伸ばしてから順次に下り、全音符で着地。流れる分散和音に乗せる歌心。
export const harvestOathHook: Passage = {
  chords: ['Dmaj9', 'A/C#', 'Bm9', 'Gmaj9'],
  melody: [
    'v90 F#5:2 v86 E5:1.5 v84 D5:.5',
    'v94 A5:4',
    'v90 G5:2 v86 F#5:1.5 v84 E5:.5',
    'v96 B5:4',
  ],
  harmony: [
    flow44(['F#3', 'A3', 'C#4', 'E4']),
    flow44(['E3', 'A3', 'C#4', 'E4']),
    flow44(['F#3', 'A3', 'D4', 'E4']),
    flow44(['G3', 'B3', 'D4', 'F#4']),
  ],
  bass: [push('D2', 'A1'), push('C#2', 'A1'), push('B1', 'F#1'), push('G1', 'D2')],
}

// ==========================================
// Sketch 組み立て
// ==========================================

const hook = (
  id: string,
  title: string,
  description: string,
  tempo: number,
  meter: readonly [number, number],
  intention: string,
  passage: Passage,
  moments: CompositionStudy['moments'],
  gates: { harmonyGate?: number; bassGate?: number } = {},
) =>
  buildSketch({
    id,
    title,
    description,
    tempo,
    meter,
    ...gates,
    passages: [{ label: 'フック', intention, passage }],
    moments,
  })

export const secondHooks: CompositionStudy[] = [
  hook(
    'autumn-retake-hook2-golden-scout',
    '黄金の斥候',
    'ト長調 · ♩=124 · 4/4。DからGへ跳んで順次に上がり、C6（Em9の11度）を2拍伸ばしてB5へ。2回目は1音上からD6へ。Gmaj9→Em9→Cmaj9→Dsus4(add9)で、実りの光と引き締まった前進を描く。伴奏は8分刻み',
    124,
    [4, 4],
    '跳んで順次に上がり伸ばす。2回目は1音上から最高音D6へ届く',
    goldenScoutHook,
    [
      { bar: 2, beat: 0, pitches: ['E1', 'G4', 'C6'], intention: 'Em9の上でC6を2拍伸ばす' },
      { bar: 4, beat: 0, pitches: ['D2', 'G4', 'D6'], intention: '最高音D6へ到達' },
    ],
    { harmonyGate: 0.7, bassGate: 0.9 },
  ),
  hook(
    'autumn-retake-hook2-north-beacon',
    '北風の狼煙',
    'ニ短調 · ♩=128 · 4/4。8分2つから順次に駆け上がり、Bbmaj9の9度 C6 を全音符で保つ。2回目はドリアの長6度 B5 を経由して主音 D6 へ。低音の8分オクターブで冷徹な緊張感を保つ',
    128,
    [4, 4],
    '駆け上がって全音符で保つ。2回目はドリアの長6度を通ってD6へ',
    northBeaconHook,
    [
      { bar: 2, beat: 0, pitches: ['Bb1', 'F4', 'C6'], intention: 'Bbmaj9の9度 C6 を保つ' },
      { bar: 4, beat: 0, pitches: ['A1', 'E4', 'D6'], intention: 'A7sus4の上でD6を保つ' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'autumn-retake-hook2-frost-march',
    '霜降る朝の行軍',
    'ヘ長調 · ♩=120 · 4/4。CからFへ跳んで順次に上がり、C6を堂々と全音符で伸ばす。「澄んだ空」で好評だった短3度上平行移動（Fmaj9→Abmaj9）を受け継ぎ、2回目はEb6へ。和音は2分音符で保ち、低音のオクターブで前へ進める',
    120,
    [4, 4],
    '跳んで順次に上がり伸ばす。短3度上の平行移動で最高音Eb6へ',
    frostMarchHook,
    [
      { bar: 2, beat: 0, pitches: ['F1', 'A3', 'C6'], intention: 'Fmaj7の5度 C6 を堂々と保つ' },
      { bar: 4, beat: 0, pitches: ['Ab1', 'C4', 'Eb6'], intention: 'Abmaj7の5度 Eb6 で遠い雪山を見る' },
    ],
  ),
  hook(
    'autumn-retake-hook2-harvest-bonfire',
    '収穫の篝火',
    'イ短調 · ♩=138 · 3/4。E–A–Bと駆け上がり、C6を付点4分で保って降りる。2回目は1音上からD6へ。Am9→D9/F#（ドリアの明るいIV）→Fmaj7→E7sus4。伴奏は低音の1拍目打ちと2・3拍目の和音',
    138,
    [3, 4],
    '3/4拍子で駆け上がり保って降りる。2回目はD6へ',
    harvestBonfireHook,
    [
      { bar: 2, beat: 0, pitches: ['F#1', 'C6'], intention: 'D9/F#の7度 C6' },
      { bar: 4, beat: 0, pitches: ['E1', 'D6'], intention: 'E7sus4の7度 D6' },
    ],
  ),
  hook(
    'autumn-retake-hook2-birch-ridge',
    '白樺の稜線',
    '変ロ長調 · ♩=124 · 4/4。F5を2拍保ち、G–Aと歩んでBb5を3拍伸ばす。2回目は1音上からD6へ。Bbmaj9→Gm9→Ebmaj9→Fsus4(add9)。伴奏は8分の分散和音',
    124,
    [4, 4],
    '長い音から歩み出して伸ばす。2回目はD6へ',
    birchRidgeHook,
    [
      { bar: 2, beat: 0, pitches: ['G1', 'D4', 'Bb5'], intention: 'Gm9の3度 Bb5' },
      { bar: 4, beat: 0, pitches: ['F1', 'Eb4', 'D6'], intention: 'Fsus4の13度 D6' },
    ],
  ),
  hook(
    'autumn-retake-hook2-amber-corridor',
    '琥珀の回廊',
    'ホ短調 · ♩=122 · 4/4。BからEへ跳び、順次に上がってA5（11度）を全音符で保つ。2回目はCからF#へ跳びB5へ。Em9→Cmaj9→Am9→Bm7。伴奏はシンコペーションを1つ含む刻み',
    122,
    [4, 4],
    '跳んで順次に上がり全音符で伸ばす。2回目はB5へ',
    amberCorridorHook,
    [
      { bar: 2, beat: 0, pitches: ['C2', 'G3', 'A5'], intention: 'Cmaj9の13度 A5' },
      { bar: 4, beat: 0, pitches: ['B1', 'F#3', 'B5'], intention: 'Bm7の根音 B5' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'autumn-retake-hook2-wild-geese',
    '雁の遠鳴き',
    'ニ長調 · ♩=126（付点4分=84）· 6/8。A5から降りてステップし、5度音A5を保つ。2回目は1音上のB5から降りてF#5へ着地。Dmaj9→Bm9→Gmaj9→A(add9)。伴奏は拍頭を休む揺れ',
    126,
    [6, 8],
    '降りてステップし保つ。2回目はF#5へ着地',
    wildGeeseHook,
    [
      { bar: 2, beat: 0, pitches: ['B1', 'A5'], intention: 'Bm9の7度 A5' },
      { bar: 4, beat: 0, pitches: ['A1', 'F#5'], intention: 'A(add9)の13度 F#5' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'autumn-retake-hook2-valley-watchtower',
    '谷風の物見櫓',
    'ハ長調 · ♩=130 · 4/4。4分4つでリディアの#4音（F#5）を通って上がり、長7度 B5 を全音符で伸ばす。2回目は1音下からA5へ。Cmaj7(#11)→D/C→Bm7→Em9。伴奏は8分刻み',
    130,
    [4, 4],
    'リディアの#4音を通って上がり長7度B5を伸ばす。2回目はA5へ',
    valleyWatchtowerHook,
    [
      { bar: 2, beat: 0, pitches: ['C2', 'F#4', 'B5'], intention: 'D/Cの上の長6度 B5' },
      { bar: 4, beat: 0, pitches: ['E1', 'E4', 'A5'], intention: 'Em9の11度 A5' },
    ],
    { harmonyGate: 0.7, bassGate: 0.9 },
  ),
  hook(
    'autumn-retake-hook2-leaves-and-hooves',
    '落葉と蹄音',
    'イ短調 · ♩=136 · 4/4。3+3+2のリズムで力強く上り、7度G5を全音符で保つ。2回目は1音上からA5へ。Am7→Fmaj7→Dm9→Em7。伴奏と低音も 3+3+2 で前進する',
    136,
    [4, 4],
    '3+3+2で上り全音符で保つ。2回目はA5へ',
    leavesAndHoovesHook,
    [
      { bar: 2, beat: 0, pitches: ['F1', 'C4', 'G5'], intention: 'Fmaj7の9度 G5' },
      { bar: 4, beat: 0, pitches: ['E1', 'E4', 'A5'], intention: 'Em7の11度 A5' },
    ],
    { harmonyGate: 0.85, bassGate: 0.85 },
  ),
  hook(
    'autumn-retake-hook2-late-autumn-banner',
    '晩秋の陣旗',
    'ヘ長調 · ♩=120 · 4/4。A–BbからC6へ進んで堂々と保ち、2回目は和声ごと全音下に平行移動（Fmaj9→Ebmaj9）してBb5を保つ。和音は2分音符で保ち、低音の推進力で支える',
    120,
    [4, 4],
    '2音歩んで伸ばす。全音下の平行移動でBb5へ',
    lateAutumnBannerHook,
    [
      { bar: 2, beat: 0, pitches: ['F1', 'A3', 'C6'], intention: 'Fmaj7の5度 C6' },
      { bar: 4, beat: 0, pitches: ['Eb1', 'G3', 'Bb5'], intention: 'Ebmaj7の5度 Bb5' },
    ],
  ),
  hook(
    'autumn-retake-hook2-early-frost-rampart',
    '早霜の城壁',
    'ト短調 · ♩=144 · 3/4。Dから跳んで順次に上がり、Bb5を付点2分で伸ばす。2回目は半音上のEbから跳んでC6へ。Gm9→Ebmaj7→Cm9→D7sus4。伴奏はワルツ',
    144,
    [3, 4],
    '3/4拍子で跳んで上がり伸ばす。2回目はC6へ',
    earlyFrostRampartHook,
    [
      { bar: 2, beat: 0, pitches: ['Eb1', 'Bb5'], intention: 'Ebmaj7の5度 Bb5' },
      { bar: 4, beat: 0, pitches: ['D2', 'C6'], intention: 'D7sus4の7度 C6' },
    ],
  ),
  hook(
    'autumn-retake-hook2-harvest-oath',
    '収穫の誓い',
    'ニ長調 · ♩=124 · 4/4。F#5を2拍保ち、順次に下りて全音符で着地。2回目は1音上からB5へ着地。Dmaj9→A/C#→Bm9→Gmaj9。伴奏は8分の分散和音',
    124,
    [4, 4],
    '保ってから下り全音符で着地。2回目はB5へ',
    harvestOathHook,
    [
      { bar: 2, beat: 0, pitches: ['C#2', 'E3', 'A5'], intention: 'A/C#の上の A5' },
      { bar: 4, beat: 0, pitches: ['G1', 'G3', 'B5'], intention: 'Gmaj9の3度 B5' },
    ],
  ),
]
