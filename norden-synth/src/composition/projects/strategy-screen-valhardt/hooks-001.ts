import { buildSketch, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'

// 戦略画面のBGMその6「ヴァルハルト家」 — フック集 01。
// ヴァルハルト家（山岳・辺境を拠点とする旧ソルヴェイン帝国北方軍団の系譜「灰の守護者」、
// 誓約騎士の誇りと禁忌遺跡ヘクサリアの影、鉱山と冬の気風）と、
// 参考資料 src/songs/source_midi/srb/analysis のコード感・調（add9、sus2、bIIM7/I、aug、
// bIII・bVI 借用、分数和音、保続低音）を元に、不思議なテイストのあるリズミカルなフックを12案作った。
//
// COMPOSING.md の「フックの書き方」に従い、先にリズム型と輪郭を決めてから和声を付ける。
// 同じリズム型を2回（または1小節の型を4回）使い、2回目は音高だけ変える。伸ばす音は拍頭で、和音の音か長7度・9度。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

// ---------- 伴奏の型 ----------

/** 3/4: 1拍目を低音に任せ、2拍目の8分2つと3拍目に和音。 */
const pluck34 = (v: Voicing) => {
  const c = ch(v)
  return `r:1 v54 ${c}:.5 v46 ${c}:.5 v50 ${c}:1`
}

/** 3/4: 4分音符ごとに短く切った和音。旋律の2拍子（ヘミオラ）と交差させる。 */
const tick34 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:.5 r:.5 v46 ${c}:.5 r:.5 v50 ${c}:.5 r:.5`
}

/** 3/4: 3声を8分で往復する分散和音。 */
const roll34 = (v: Voicing) => `v52 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 ${v[1]}:.5 v48 ${v[2]}:.5 v44 ${v[1]}:.5`

/** 4/4: 8分の和音の刻み。1拍目と3拍目に軽いアクセント。 */
const pulse44 = (v: Voicing) => {
  const c = ch(v)
  return `v60 ${c}:.5 v44 ${c}:.5 ${c}:.5 ${c}:.5 v56 ${c}:.5 v44 ${c}:.5 ${c}:.5 ${c}:.5`
}

/** 4/4: シンコペーションを含む刻み。 */
const comp44 = (v: Voicing) => {
  const c = ch(v)
  return `v60 ${c}:1 r:.5 v50 ${c}:.5 r:.5 v54 ${c}:.5 v48 ${c}:1`
}

/** 4/4: 3+3+2 の和音。 */
const tresillo44 = (v: Voicing) => `v62 ${ch(v)}:1.5 v54 ${ch(v)}:1.5 v58 ${ch(v)}:1`

/** 4/4: 3声を8分で順に回す。3音周期が4拍子とずれて、からくりのように回る。 */
const cycle44 = (v: Voicing) =>
  `v54 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v50 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v50 ${v[0]}:.5 v44 ${v[1]}:.5`

/** 4/4: 裏拍だけの和音。 */
const offbeat44 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v54 ${c}:.5 r:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 r:.5 v46 ${c}:.5`
}

/** 6/8: 拍頭を休み、8分2つで和音を揺らす。 */
const sway68 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v54 ${c}:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 v46 ${c}:.5`
}

/** 6/8: 8分6つの和音。各拍の頭にアクセント。 */
const jig68 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:.5 v42 ${c}:.5 ${c}:.5 v54 ${c}:.5 v42 ${c}:.5 ${c}:.5`
}

/** 12/8: 4声を8分で上下する分散和音を2回。 */
const roll128 = (v: Voicing) => {
  const once = `v52 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v48 ${v[3]}:.5 v44 ${v[2]}:.5 ${v[1]}:.5`
  return `${once} ${once}`
}

// ---------- 低音の型 ----------

/** 3/4: 根音を2拍、5度を1拍。 */
const waltz = (root: string, fifth: string) => `${root}:2 ${fifth}:1`

/** 3/4: 保続低音。1拍目を低く、2・3拍目をオクターブ上で。 */
const pedal34 = (low: string, high: string) => `${low}:1 ${high}:1 ${high}:1`

/** 4/4: 根音・2拍裏・5度・根音。 */
const drive = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`

/** 4/4: 同じ音の保続低音。4拍目だけオクターブ上。 */
const pedalDrive = (low: string, high: string) => `${low}:1.5 ${low}:.5 ${low}:1 ${high}:1`

/** 4/4: 8分のオクターブの往復。 */
const octaves = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`

/** 4/4: 3+3+2 の低音。 */
const tresilloBass = (a: string, b: string, c: string) => `${a}:1.5 ${b}:1.5 ${c}:1`

/** 6/8: 根音・8分の根音・5度。 */
const six8 = (root: string, fifth: string) => `${root}:1 ${root}:.5 ${fifth}:1.5`

/** 12/8: 根音を2拍ぶん保ち、5度・根音。 */
const float128 = (root: string, fifth: string) => `${root}:3 ${fifth}:1.5 ${root}:1.5`

// ==========================================
// 12案の Passage 定義
// ==========================================

// ---------- 01 灰鷲の紋章 ----------
// リズム型: 𝄽 ♪ ♩ ♩ | 𝅗𝅥. （3/4）。弱起の8分から4分2つで上り、拍頭で長く伸ばす。2回目は到達音を A5 へ上げる。
// 和声: ニ短調。srb-03（春の戦略画面）の EbM7/D（bII の長7度を主音 D の低音に乗せる）と Faug を主音保続の上で使う。
export const ashenEagleHook: Passage = {
  chords: ['Dm(add9)', 'EbM7/D', 'Dm(add9)', 'Faug/D'],
  melody: [
    'r:.5 v84 A4:.5 v86 D5:1 E5:1',
    'v92 F5:3',
    'r:.5 v84 A4:.5 v86 D5:1 F5:1',
    'v94 A5:3',
  ],
  harmony: [
    pluck34(['F3', 'A3', 'E4']),
    pluck34(['G3', 'Bb3', 'Eb4']),
    pluck34(['F3', 'A3', 'E4']),
    pluck34(['F3', 'A3', 'C#4']),
  ],
  bass: [waltz('D2', 'A1'), waltz('D2', 'A1'), waltz('D2', 'A1'), waltz('D2', 'A1')],
}

// ---------- 02 コーカサの稜線 ----------
// リズム型: ♩. ♪ ♩ ♩ | 𝅗𝅥. 𝄽 （4/4）。付点から順次で降り、長7度 B4 で伸ばす。2回目は F5 から降りて Esus2 に着地。
// 和声: イ短調。srb-04（夏の戦略画面）の Amadd9/B → CM7 → Fmaj7 → Esus2。
export const caucasaWatchHook: Passage = {
  chords: ['Am(add9)/B', 'CM7', 'Fmaj7', 'Esus2'],
  melody: [
    'v88 E5:1.5 v84 D5:.5 v86 C5:1 A4:1',
    'v92 B4:3 r:1',
    'v88 F5:1.5 v84 E5:.5 v86 D5:1 C5:1',
    'v92 B4:3 r:1',
  ],
  harmony: [
    pulse44(['A3', 'C4', 'E4', 'B4']),
    pulse44(['G3', 'B3', 'E4']),
    pulse44(['A3', 'C4', 'E4']),
    pulse44(['E3', 'F#3', 'B3']),
  ],
  bass: [drive('B1', 'E2'), drive('C2', 'G1'), drive('F1', 'C2'), drive('E1', 'B1')],
}

// ---------- 03 ヘクサリアの封印 ----------
// リズム型: ♩ ♪♪ ♩ ♩ | 𝅝 （4/4）。4度上行から8分2つで山を越え、bVI(add9) の上で伸ばす。2回目は C6 へ届いて G5 で閉じる。
// 和声: ト長調。srb-06（冬の戦略画面）の Iadd9 ↔ bVIadd9（Gadd9 ↔ Ebadd9）の往復。伴奏は3音周期が4拍子とずれる。
export const hexariaSealHook: Passage = {
  chords: ['G(add9)', 'Eb(add9)', 'G(add9)', 'Ebmaj7'],
  melody: [
    'v84 D5:1 v86 G5:.5 A5:.5 v88 B5:1 G5:1',
    'v92 F5:4',
    'v84 D5:1 v86 G5:.5 A5:.5 v88 C6:1 A5:1',
    'v94 G5:4',
  ],
  harmony: [
    cycle44(['B3', 'D4', 'A4']),
    cycle44(['G3', 'Bb3', 'F4']),
    cycle44(['B3', 'D4', 'A4']),
    cycle44(['G3', 'Bb3', 'D4']),
  ],
  bass: [pedalDrive('G1', 'G2'), pedalDrive('Eb1', 'Eb2'), pedalDrive('G1', 'G2'), pedalDrive('Eb1', 'Eb2')],
}

// ---------- 04 誓約騎士の歩み ----------
// リズム型: ♩. ♩. ♩ | 𝅗𝅥. 𝄽 （4/4、3+3+2）。4度跳躍から1音上がり、3拍伸ばす。2回目は1音下から Dsus2 → Bm7 へ。
// 和声: ホ短調。srb-09 の Em → Cmaj7 → Dsus2 → Bm7 の厳格かつ透明な響き。
export const ironOathHook: Passage = {
  chords: ['Em(add9)', 'Cmaj7', 'Dsus2', 'Bm7'],
  melody: [
    'v86 B4:1.5 v88 E5:1.5 v86 F#5:1',
    'v92 G5:3 r:1',
    'v86 A4:1.5 v88 D5:1.5 v86 E5:1',
    'v94 F#5:3 r:1',
  ],
  harmony: [
    tresillo44(['G3', 'B3', 'F#4']),
    tresillo44(['G3', 'B3', 'E4']),
    tresillo44(['A3', 'D4', 'E4']),
    tresillo44(['A3', 'D4', 'F#4']),
  ],
  bass: [
    tresilloBass('E1', 'E1', 'B1'),
    tresilloBass('C2', 'C2', 'G1'),
    tresilloBass('D2', 'D2', 'A1'),
    tresilloBass('B1', 'B1', 'F#1'),
  ],
}

// ---------- 05 レンハウスの坑道灯 ----------
// リズム型: 𝄽 ♩ ♩ ♩ | 𝅝 （4/4）。1拍休んで4分で上り、全音符で伸ばす。2回目は終点を C6 へ引き上げる。
// 和声: 変イ長調。srb-05（秋の戦略画面）の Ab(add9)/Bb から始まり、Ebsus4 → Bbm7 → Dbmaj7 へ進む。
export const mineLanternHook: Passage = {
  chords: ['Ab(add9)/Bb', 'Ebsus4', 'Bbm7', 'Dbmaj7'],
  melody: [
    'r:1 v84 Eb5:1 v86 F5:1 v88 Ab5:1',
    'v92 G5:4',
    'r:1 v84 Eb5:1 v86 F5:1 v88 Bb5:1',
    'v94 C6:4',
  ],
  harmony: [
    offbeat44(['Ab3', 'C4', 'Eb4', 'Bb4']),
    offbeat44(['Ab3', 'Bb3', 'Eb4']),
    offbeat44(['Ab3', 'Db4', 'F4']),
    offbeat44(['Ab3', 'C4', 'F4']),
  ],
  bass: [drive('Bb1', 'F2'), drive('Eb2', 'Bb1'), drive('Bb1', 'F2'), drive('Db2', 'Ab1')],
}

// ---------- 06 旧帝国の暦 ----------
// リズム型: ♩ ♪ ♩ ♪ | 𝅗𝅥. （6/8）。ドリアの上行句から長音へ。2回目は F5 を経て Abmaj7/C の長7度 G5 へ。
// 和声: ハ短調。srb-16 の Cmadd9 → F7/C（主音保続上のドリア IV7）と、借用の Abmaj7/C。
export const imperialCalendarHook: Passage = {
  chords: ['Cm(add9)', 'F7/C', 'Cm(add9)', 'Abmaj7/C'],
  melody: [
    'v84 G4:1 v86 C5:.5 v88 D5:1 v84 Eb5:.5',
    'v92 Eb5:3',
    'v84 G4:1 v86 C5:.5 v88 D5:1 v84 F5:.5',
    'v94 G5:3',
  ],
  harmony: [
    sway68(['Eb4', 'G4', 'D5']),
    sway68(['Eb4', 'F4', 'A4']),
    sway68(['Eb4', 'G4', 'D5']),
    sway68(['Eb4', 'Ab4', 'C5']),
  ],
  bass: [six8('C2', 'G1'), six8('C2', 'F1'), six8('C2', 'G1'), six8('C2', 'Ab1')],
}

// ---------- 07 北方軍団の号令 ----------
// リズム型: ♩ ♪♪ 𝅗𝅥 （4/4、1小節の型を4回）。sus2 の和音を4音で降り、半音下・長3度下へと平行に降りる。
// 和声: イ長調。srb-17 の C#sus2 → Csus2 → Asus2 → G(add9) の半音下降の平行進行。
export const northernGarrisonHook: Passage = {
  chords: ['C#sus2', 'Csus2', 'Asus2', 'G(add9)'],
  melody: [
    'v88 G#5:1 v84 F#5:.5 D#5:.5 v92 C#5:2',
    'v86 G5:1 v82 F5:.5 D5:.5 v90 C5:2',
    'v88 E5:1 v84 D5:.5 B4:.5 v92 A4:2',
    'v86 D5:1 v82 B4:.5 A4:.5 v90 G4:2',
  ],
  harmony: [
    comp44(['C#4', 'D#4', 'G#4']),
    comp44(['C4', 'D4', 'G4']),
    comp44(['A3', 'B3', 'E4']),
    comp44(['G3', 'A3', 'B3', 'D4']),
  ],
  bass: [pedalDrive('C#2', 'C#1'), pedalDrive('C2', 'C1'), pedalDrive('A1', 'A2'), pedalDrive('G1', 'G2')],
}

// ---------- 08 銀鷲の滑空 ----------
// リズム型: ♩. ♩. | 𝅗𝅥. （3/4 の上の2拍子＝ヘミオラ）。4度跳んで長7度 A5 で伸ばす。2回目は1音上からリディアの C/Bb へ。
// 和声: 変ロ長調。srb-02（メニュー曲）の BbM7 → C7/Bb の色。伴奏は3拍子で短く刻み、旋律の2拍子と交差する。
export const silverWingHook: Passage = {
  chords: ['Bbmaj7', 'C/Bb', 'Bbmaj7', 'C/Bb'],
  melody: [
    'v86 F5:1.5 v88 Bb5:1.5',
    'v92 A5:3',
    'v86 G5:1.5 v88 C6:1.5',
    'v94 G5:3',
  ],
  harmony: [
    tick34(['D4', 'F4', 'A4']),
    tick34(['E4', 'G4', 'C5']),
    tick34(['D4', 'F4', 'A4']),
    tick34(['E4', 'G4', 'C5']),
  ],
  bass: [pedal34('Bb1', 'Bb2'), pedal34('Bb1', 'Bb2'), pedal34('Bb1', 'Bb2'), pedal34('Bb1', 'Bb2')],
}

// ---------- 09 霜降る城壁 ----------
// リズム型: ♪ ♩ ♪ ♩ ♩ | 𝅝 （4/4、シンコペーション1つ）。主音 F の保続の上で、フリギアの bII（Gbmaj7/F）の長7度 F5 に着地する。
// 和声: ヘ短調。srb-03 の bIIM7/I の発想をヘ短調に移し、後半は Dbmaj7 → C7sus4 で開く。
export const frostBastionHook: Passage = {
  chords: ['Fm9', 'Gbmaj7/F', 'Dbmaj7', 'C7sus4'],
  melody: [
    'v84 C5:.5 v88 F5:1 v84 G5:.5 v88 Ab5:1 v86 G5:1',
    'v92 F5:4',
    'v84 C5:.5 v88 F5:1 v84 G5:.5 v88 Bb5:1 v86 Ab5:1',
    'v94 G5:4',
  ],
  harmony: [
    pulse44(['Ab3', 'C4', 'Eb4', 'G4']),
    pulse44(['Bb3', 'Db4', 'F4']),
    pulse44(['F3', 'Ab3', 'C4']),
    pulse44(['G3', 'Bb3', 'C4', 'F4']),
  ],
  bass: [
    octaves('F1', 'F2', 'C2'),
    octaves('F1', 'F2', 'Db2'),
    octaves('Db1', 'Db2', 'Ab1'),
    octaves('C1', 'C2', 'G1'),
  ],
}

// ---------- 10 アルガルデの交易路 ----------
// リズム型: ♪♪♪ ♩. | 𝅗𝅥. （6/8）。8分3つで駆け上がって伸び、2回目は bVImaj7/V（Ebmaj7/D）の上で A5（#11）または Bb5 を経て Dsus4 へ。
// 和声: ト長調。srb-06（冬の戦略画面）の Gadd9/D → Csus2/D に、Ebmaj7/D の影を差す。
export const algardeCaravanHook: Passage = {
  chords: ['G(add9)/D', 'Csus2/D', 'Ebmaj7/D', 'Dsus4'],
  melody: [
    'v86 D5:.5 v84 G5:.5 A5:.5 v88 B5:1.5',
    'v92 A5:3',
    'v86 D5:.5 v84 G5:.5 Bb5:.5 v88 C6:1.5',
    'v94 A5:3',
  ],
  harmony: [
    jig68(['B3', 'D4', 'A4']),
    jig68(['G3', 'C4', 'D4']),
    jig68(['G3', 'Bb3', 'D4']),
    jig68(['G3', 'A3', 'D4']),
  ],
  bass: [six8('D2', 'A1'), six8('D2', 'G1'), six8('D2', 'Bb1'), six8('D2', 'A1')],
}

// ---------- 11 灰座への敬礼 ----------
// リズム型: 𝅗𝅥. ♩. ♪♪♪ | 𝅗𝅥. 𝅗𝅥. （12/8）。大きく保ってから8分3つで次の小節へ渡る。
// 和声: ニ長調。srb-03 後半の Dadd9 ↔ Cadd9 と Cm7/D（bvii7/I）の不思議な借用を再現。
export const greyThroneHook: Passage = {
  chords: ['D(add9)', 'C(add9)', 'D(add9)', 'Cm7/D'],
  melody: [
    'v90 A5:3 v84 F#5:1.5 v82 D5:.5 E5:.5 F#5:.5',
    'v92 G5:6',
    'v90 A5:3 v84 F#5:1.5 v82 D5:.5 E5:.5 G5:.5',
    'v94 F5:6',
  ],
  harmony: [
    roll128(['F#3', 'A3', 'D4', 'E4']),
    roll128(['E3', 'G3', 'C4', 'D4']),
    roll128(['F#3', 'A3', 'D4', 'E4']),
    roll128(['Eb3', 'G3', 'Bb3', 'C4']),
  ],
  bass: [float128('D2', 'A1'), float128('C2', 'G1'), float128('D2', 'A1'), float128('D2', 'Bb1')],
}

// ---------- 12 禁忌の書庫 ----------
// リズム型: 𝅗𝅥 ♪♪ | 𝅗𝅥. （3/4）。2拍保ってから8分2つで上り、3拍伸ばす。2回目は導音 E#5 を経て G#5（9度）へ。
// 和声: 嬰ヘ短調。F#m → Dmaj7 の明暗のあと、F#m(maj7) → Bm9 で神秘的な余韻を残す。
export const forbiddenArchiveHook: Passage = {
  chords: ['F#m', 'Dmaj7', 'F#m(maj7)', 'Bm9'],
  melody: [
    'v88 C#5:2 v84 D5:.5 E5:.5',
    'v92 F#5:3',
    'v88 C#5:2 v84 E#5:.5 F#5:.5',
    'v94 G#5:3',
  ],
  harmony: [
    roll34(['A3', 'C#4', 'F#4']),
    roll34(['A3', 'C#4', 'F#4']),
    roll34(['A3', 'C#4', 'E#4']),
    roll34(['A3', 'C#4', 'D4']),
  ],
  bass: [waltz('F#1', 'C#2'), waltz('D2', 'A1'), waltz('F#1', 'C#2'), waltz('B1', 'F#1')],
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

export const firstHooks: CompositionStudy[] = [
  hook(
    'valhardt-hook-ashen-eagle',
    '灰鷲の紋章',
    'ニ短調 · ♩=130 · 3/4。弱起の8分から上り、主音 D の保続の上で EbM7/D の9度 F5 を伸ばす。2回目は Faug/D の A5 へ上る。srb-03 の bIIM7/I と増三和音の色',
    130,
    [3, 4],
    '弱起から上って伸ばす。bIIM7/I と増三和音の上で2回目は A5 へ',
    ashenEagleHook,
    [
      { bar: 2, beat: 1, pitches: ['D2', 'G3', 'Eb4', 'F5'], intention: 'EbM7/D の9度 F5（主音 D の上の bIIM7）' },
      { bar: 4, beat: 1, pitches: ['D2', 'F3', 'C#4', 'A5'], intention: 'Faug/D の A5 と C#4 の増三和音' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'valhardt-hook-caucasa-watch',
    'コーカサの稜線',
    'イ短調 · ♩=120 · 4/4。付点から順次で降り、CM7 の長7度 B4 で伸ばす。2回目は F5 から降りて Esus2 へ。srb-04 の Amadd9/B → CM7 → Fmaj7 → Esus2',
    120,
    [4, 4],
    '付点から降りて長7度で止まる。2回目は1音上から Esus2 へ',
    caucasaWatchHook,
    [
      { bar: 1, beat: 0, pitches: ['B1', 'A3', 'B4', 'E5'], intention: 'Am(add9)/B の9度 B4 と E5' },
      { bar: 2, beat: 0, pitches: ['C2', 'G3', 'E4', 'B4'], intention: 'CM7 の長7度 B4 で伸ばす' },
    ],
    { harmonyGate: 0.7 },
  ),
  hook(
    'valhardt-hook-hexaria-seal',
    'ヘクサリアの封印',
    'ト長調 · ♩=126 · 4/4。4度上行から山を越えて Eb(add9) の9度 F5 で伸ばす。2回目は C6 へ届いて G5 へ。srb-06 の Gadd9 ↔ Ebadd9 と3音周期のからくり伴奏',
    126,
    [4, 4],
    '山を越えて bVI(add9) の上で伸ばす。3音周期の伴奏が4拍子とずれる',
    hexariaSealHook,
    [
      { bar: 2, beat: 0, pitches: ['Eb1', 'G3', 'F5'], intention: 'Eb(add9) の9度 F5' },
      { bar: 4, beat: 1, pitches: ['Eb1', 'D4', 'G5'], intention: 'Ebmaj7 の3度 G5 と内声の長7度 D4' },
    ],
    { harmonyGate: 0.75 },
  ),
  hook(
    'valhardt-hook-iron-oath',
    '誓約騎士の歩み',
    'ホ短調 · ♩=132 · 4/4（3+3+2）。3+3+2 の足取りで4度跳び、Cmaj7 で伸ばす。2回目は1音下から Dsus2 → Bm7 へ。srb-09 の透明な短調の歩み',
    132,
    [4, 4],
    '3+3+2 のリズムで跳躍して伸ばす。2回目は1音下から',
    ironOathHook,
    [
      { bar: 2, beat: 0, pitches: ['C2', 'B3', 'E4', 'G5'], intention: 'Cmaj7 の5度 G5 と内声 B3' },
      { bar: 4, beat: 0, pitches: ['B1', 'A3', 'F#5'], intention: 'Bm7 の5度 F#5' },
    ],
    { harmonyGate: 0.75 },
  ),
  hook(
    'valhardt-hook-mine-lantern',
    'レンハウスの坑道灯',
    '変イ長調 · ♩=118 · 4/4。1拍休んで4分で上り、Ebsus4 の G5 を伸ばす。2回目は Dbmaj7 の長7度 C6 へ。srb-05 の Ab(add9)/Bb による浮遊した始まり',
    118,
    [4, 4],
    '1拍休んで上り、全音符で伸ばす。裏拍の和音で坑道の反響を描く',
    mineLanternHook,
    [
      { bar: 1, beat: 0.5, pitches: ['Bb1', 'Ab3', 'C4', 'Bb4'], intention: 'Ab(add9)/Bb の裏拍和音' },
      { bar: 4, beat: 0.5, pitches: ['Db2', 'Ab3', 'F4', 'C6'], intention: 'Dbmaj7 の長7度 C6' },
    ],
    { harmonyGate: 0.75 },
  ),
  hook(
    'valhardt-hook-imperial-calendar',
    '旧帝国の暦',
    'ハ短調 · ♩=132 · 6/8。揺れる6拍子でドリアの上行句を歌い、F7/C の上で伸ばす。2回目は Abmaj7/C の長7度 G5 へ。srb-16 の主音保続上のドリア IV7',
    132,
    [6, 8],
    'ドリアの上行句を主音 C の保続の上で鳴らし、2回目は長7度 G5 へ',
    imperialCalendarHook,
    [
      { bar: 2, beat: 0.5, pitches: ['C2', 'F4', 'A4', 'Eb5'], intention: 'F7/C の7度 Eb5（主音保続上のドリア IV7）' },
      { bar: 4, beat: 0.5, pitches: ['C2', 'Ab4', 'C5', 'G5'], intention: 'Abmaj7/C の長7度 G5' },
    ],
    { harmonyGate: 0.8 },
  ),
  hook(
    'valhardt-hook-northern-garrison',
    '北方軍団の号令',
    'イ長調 · ♩=136 · 4/4。1小節の下降型を半音・全音と平行に降ろす。srb-17 の C#sus2 → Csus2 → Asus2 → G(add9) の神秘的な平行進行',
    136,
    [4, 4],
    '同じ下降型を C#sus2 → Csus2 → Asus2 → G(add9) と平行に降ろす',
    northernGarrisonHook,
    [
      { bar: 1, beat: 3, pitches: ['C#2', 'D#4', 'G#4', 'C#5'], intention: 'C#sus2 の響き' },
      { bar: 2, beat: 3, pitches: ['C2', 'D4', 'G4', 'C5'], intention: '半音下の Csus2 へ平行移動' },
    ],
    { harmonyGate: 0.75 },
  ),
  hook(
    'valhardt-hook-silver-wing',
    '銀鷲の滑空',
    '変ロ長調 · ♩=128 · 3/4。3拍子の伴奏の上で2拍子（ヘミオラ）の4度上行を鳴らし、長7度 A5 へ。2回目は C/Bb（リディア）の上で G5 へ。srb-02 の BbM7 → C/Bb',
    128,
    [3, 4],
    '3拍子の上のヘミオラ。Bbmaj7 の長7度からリディアの C/Bb へ',
    silverWingHook,
    [
      { bar: 1, beat: 0, pitches: ['Bb1', 'D4', 'F4', 'F5'], intention: 'Bbmaj7 の響き' },
      { bar: 4, beat: 0, pitches: ['Bb1', 'E4', 'C5', 'G5'], intention: 'C/Bb の5度 G5 と内声の #4 (E4)' },
    ],
    { harmonyGate: 0.7 },
  ),
  hook(
    'valhardt-hook-frost-bastion',
    '霜降る城壁',
    'ヘ短調 · ♩=124 · 4/4。シンコペーション1つの上行句から、フリギアの bII（Gbmaj7/F）の長7度 F5 を全音符で伸ばす。2回目は Dbmaj7 → C7sus4 へ',
    124,
    [4, 4],
    'シンコペーションから上り、bIIM7/I の長7度 F5 で冷たく止まる',
    frostBastionHook,
    [
      { bar: 2, beat: 0, pitches: ['F1', 'Bb3', 'Db4', 'F5'], intention: 'Gbmaj7/F の長7度 F5（主音 F と bII の衝突）' },
      { bar: 4, beat: 0, pitches: ['C1', 'Bb3', 'F4', 'G5'], intention: 'C7sus4 の5度 G5' },
    ],
    { harmonyGate: 0.7 },
  ),
  hook(
    'valhardt-hook-algarde-caravan',
    'アルガルデの交易路',
    'ト長調 · ♩=136 · 6/8。8分3つで駆け上がって9度 A5 で伸ばす。2回目は Ebmaj7/D の影を踏み、Dsus4 の A5 へ。srb-06 の D 保続の上の add9 と sus2',
    136,
    [6, 8],
    '8分3つで駆け上がり、D 保続の上で借用の Ebmaj7/D を踏む',
    algardeCaravanHook,
    [
      { bar: 2, beat: 0, pitches: ['D2', 'G3', 'C4', 'A5'], intention: 'Csus2/D の13度 A5' },
      { bar: 3, beat: 1.5, pitches: ['D2', 'G3', 'Bb3', 'C6'], intention: 'Ebmaj7/D の上の C6' },
    ],
    { harmonyGate: 0.75 },
  ),
  hook(
    'valhardt-hook-grey-throne',
    '灰座への敬礼',
    'ニ長調 · ♩=126 · 12/8。大きく保った音から8分3つで次小節へ渡る。srb-03 後半の D(add9) → C(add9) と、4小節目の Cm7/D（bvii7/I）の不思議な陰り',
    126,
    [12, 8],
    '12/8 の広い歩幅。D(add9) から bVII と bvii7/I の陰りへ渡る',
    greyThroneHook,
    [
      { bar: 2, beat: 1.5, pitches: ['C2', 'D4', 'G5'], intention: 'C(add9) の9度 D4 と5度 G5' },
      { bar: 4, beat: 1, pitches: ['D2', 'Bb3', 'F5'], intention: 'Cm7/D の短7度 Bb3 と11度 F5' },
    ],
    { harmonyGate: 0.9 },
  ),
  hook(
    'valhardt-hook-forbidden-archive',
    '禁忌の書庫',
    '嬰ヘ短調 · ♩=136 · 3/4。2拍保ってから8分2つで上り、3拍伸ばす。2回目は導音 E#5 を踏んで Bm9 の9度（13度）G#5 へ。分散和音で静かに秘匿を描く',
    136,
    [3, 4],
    '2拍保って8分2つで上る。導音 E#5 を踏んで Bm9 の G#5 へ',
    forbiddenArchiveHook,
    [
      { bar: 2, beat: 0.5, pitches: ['D2', 'C#4', 'F#5'], intention: 'Dmaj7 の長7度 C#4 と3度 F#5' },
      { bar: 4, beat: 1, pitches: ['B1', 'D4', 'G#5'], intention: 'Bm9 の3度 D4 と13度 G#5' },
    ],
    { harmonyGate: 0.85 },
  ),
]
