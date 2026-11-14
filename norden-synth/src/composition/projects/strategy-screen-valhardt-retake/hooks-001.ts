import { buildSketch, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'

// 戦略画面BGMその7「ヴァルハルト家（再」 — フック集 01。
// ヴァルハルト家（山岳・辺境の「灰の守護者」、誓約騎士の誇りと禁忌遺跡ヘクサリアの影、
// 鉱山・冬の生活）と、src/songs/source_midi/srb の和声・調性（add9、sus2、sus4、maj7、
// bIII・bVI・bVII の借用、分数和音、保続低音）を元に、
// ごく普通の 4/4 拍子で不思議なテイストのある勇ましくリズミカルなフックを 12 案作った。
//
// COMPOSING.md「フックの書き方」に従い、旋律のリズム型と輪郭を先に決めてから和声を付け、
// 2回目は同じリズム型で音高だけを変える。伸ばす音は拍頭に置き、和音の構成音か長7度・9度にする。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

// ---------- 伴奏の型（すべて 4/4） ----------

/** 8分音符の和音刻み。1拍目と3拍目に軽いアクセント。 */
const pulse44 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:.5 v44 ${c}:.5 ${c}:.5 ${c}:.5 v54 ${c}:.5 v44 ${c}:.5 ${c}:.5 ${c}:.5`
}

/** 行進調の付点・8分刻み（1・2拍裏・3・4拍裏）。 */
const march44 = (v: Voicing) => {
  const c = ch(v)
  return `v60 ${c}:1 v46 ${c}:.5 ${c}:.5 v56 ${c}:1 v46 ${c}:.5 ${c}:.5`
}

/** 3+3+2 の和音刻み。 */
const tresillo44 = (v: Voicing) => `v60 ${ch(v)}:1.5 v50 ${ch(v)}:1.5 v56 ${ch(v)}:1`

/** 3声を8分で順に回すアルペジオ。3音周期が4拍子とずれて不思議な推進力を生む。 */
const cycle44 = (v: Voicing) =>
  `v54 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v50 ${v[0]}:.5 v44 ${v[1]}:.5 ${v[2]}:.5 v50 ${v[0]}:.5 v44 ${v[1]}:.5`

/** 裏拍だけの軽い刻み。 */
const offbeat44 = (v: Voicing) => {
  const c = ch(v)
  return `r:.5 v52 ${c}:.5 r:.5 v46 ${c}:.5 r:.5 v52 ${c}:.5 r:.5 v46 ${c}:.5`
}

/** 1拍目の和音と、2拍裏・4拍目の応答。 */
const comp44 = (v: Voicing) => {
  const c = ch(v)
  return `v60 ${c}:1 r:.5 v50 ${c}:.5 r:.5 v54 ${c}:.5 v48 ${c}:1`
}

/** 4分音符ごとの堅実な刻み（2・4拍を少し軽く）。 */
const stride44 = (v: Voicing) => {
  const c = ch(v)
  return `v58 ${c}:1 v46 ${c}:1 v54 ${c}:1 v46 ${c}:1`
}

// ---------- 低音の型（すべて 4/4） ----------

/** 根音・2拍裏・5度・根音。 */
const driveBass = (root: string, fifth: string) => `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`

/** 保続低音。4拍目だけオクターブ上で跳ねる。 */
const pedalBounce = (low: string, high: string) => `${low}:1.5 ${low}:.5 ${low}:1 ${high}:1`

/** 8分のオクターブ往復。 */
const octaveDrive = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`

/** 3+3+2 の低音。 */
const tresilloBass = (a: string, b: string, c: string) => `${a}:1.5 ${b}:1.5 ${c}:1`

/** 2拍ずつの堂々とした低音。 */
const halfBass = (a: string, b: string) => `${a}:2 ${b}:2`

// ==========================================
// 12案の Passage 定義（すべて 4/4 拍子・4小節）
// ==========================================

// ---------- 01 銀鷲の旗印 ----------
// リズム型: 𝄽 ♩ ♪♪ ♩. ♪ | 𝅗𝅥 𝅗𝅥 （2小節×2）。弱起気味の1拍休みから上行し、2拍ずつ伸ばす。
// 和声: ニ短調。srb-14 の Dm(add9)→Dm/C→Bb6→Asus4。
export const silverEagleBannerHook: Passage = {
  chords: ['Dm(add9)', 'Dm(add9)/C', 'Bb6', 'Asus4'],
  melody: [
    'r:1 v84 A4:.5 D5:.5 v90 E5:1.5 v86 F5:.5',
    'v94 A5:2 v88 G5:2',
    'r:1 v84 A4:.5 D5:.5 v90 F5:1.5 v86 G5:.5',
    'v94 A5:2 v88 E5:2',
  ],
  harmony: [
    march44(['F3', 'A3', 'E4']),
    march44(['F3', 'A3', 'E4']),
    march44(['D3', 'G3', 'Bb3']),
    march44(['D3', 'E3', 'A3']),
  ],
  bass: [
    driveBass('D2', 'A2'),
    driveBass('C2', 'G2'),
    driveBass('Bb1', 'F2'),
    driveBass('A1', 'E2'),
  ],
}

// ---------- 02 灰の守護者 ----------
// リズム型: ♩. ♪ 𝅗𝅥 | ♩ ♩ 𝅗𝅥 （2小節×2）。1拍目から付点で踏み出し、2小節目で着地する。
// 和声: ハ短調。srb-12 の C 保続低音の上で Cm→Abadd9/C→Fsus4/C→Gm7/C（ドリア的 IV と bVI の混在）。
export const ashenGuardianHook: Passage = {
  chords: ['Cm', 'Abadd9/C', 'Fsus4/C', 'Gm7/C'],
  melody: [
    'v92 G4:1.5 v86 Ab4:.5 v88 Bb4:2',
    'v86 C5:1 D5:1 v94 Eb5:2',
    'v92 G4:1.5 v86 Ab4:.5 v88 Bb4:2',
    'v86 F5:1 Eb5:1 v94 D5:2',
  ],
  harmony: [
    pulse44(['Eb3', 'G3', 'C4']),
    pulse44(['Eb3', 'Ab3', 'Bb3']),
    pulse44(['F3', 'Bb3', 'C4']),
    pulse44(['F3', 'G3', 'Bb3']),
  ],
  bass: [
    pedalBounce('C2', 'C3'),
    pedalBounce('C2', 'C3'),
    pedalBounce('C2', 'C3'),
    pedalBounce('C2', 'G2'),
  ],
}

// ---------- 03 コーカサの関所 ----------
// リズム型: ♩ ♪♪ ♩. ♪ | 𝅗𝅥. 𝄽 （2小節×2）。3音で回ってから高音へ跳び、長く保つ。2回目は到達音を G5 へ上げる。
// 和声: ヘ短調。srb-10 の Fm7→Ebadd9/F→Dbmaj7/F→Ebadd9/G。
export const caucasaGateHook: Passage = {
  chords: ['Fm7', 'Ebadd9/F', 'Dbmaj7/F', 'Ebadd9/G'],
  melody: [
    'v90 C5:1 v84 Bb4:.5 C5:.5 v92 Eb5:1.5 v86 C5:.5',
    'v94 F5:3 r:1',
    'v90 C5:1 v84 Bb4:.5 C5:.5 v92 F5:1.5 v86 Eb5:.5',
    'v94 G5:3 r:1',
  ],
  harmony: [
    comp44(['Eb3', 'Ab3', 'C4']),
    comp44(['F3', 'G3', 'Bb3']),
    comp44(['F3', 'Ab3', 'C4']),
    comp44(['F3', 'G3', 'Bb3']),
  ],
  bass: [
    driveBass('F2', 'C3'),
    pedalBounce('F2', 'F3'),
    driveBass('F2', 'C3'),
    halfBass('G2', 'Bb2'),
  ],
}

// ---------- 04 ヘクサリアの星盤 ----------
// リズム型: ♩. ♪ ♩ ♩ | 𝅗𝅥 𝅗𝅥 （2小節×2）。上から降りて低めの主音で受け、2回目は上行して Esus2 の5度 B4 に留まる。
// 和声: イ短調。srb-04 の Am(add9)→Fmaj7→Cadd9→Esus2 と 3+3+2 の伴奏。
export const hexariaAstrolabeHook: Passage = {
  chords: ['Am(add9)', 'Fmaj7', 'Cadd9', 'Esus2'],
  melody: [
    'v88 E5:1.5 v84 D5:.5 v86 C5:1 B4:1',
    'v92 A4:2 v88 E5:2',
    'v88 E5:1.5 v84 F5:.5 v86 G5:1 E5:1',
    'v94 B4:2 v88 C5:2',
  ],
  harmony: [
    tresillo44(['C4', 'E4', 'B4']),
    tresillo44(['A3', 'C4', 'E4']),
    tresillo44(['G3', 'D4', 'E4']),
    tresillo44(['F#3', 'B3', 'E4']),
  ],
  bass: [
    tresilloBass('A2', 'A2', 'E2'),
    tresilloBass('F2', 'F2', 'C2'),
    tresilloBass('C2', 'C2', 'G2'),
    tresilloBass('E2', 'E2', 'B2'),
  ],
}

// ---------- 05 北方軍団の行進 ----------
// リズム型: ♩ ♪♪ ♩ ♩ | 𝅗𝅥 ♩ ♩ （2小節×2）。歯切れのよい行進。2回目は B5 へ抜け、A5→F#5 で受ける。
// 和声: ホ短調。srb-11 / srb-17 系の Em(add9)→Dadd9/E→Cmaj7→Dadd9。
export const northernLegionHook: Passage = {
  chords: ['Em(add9)', 'Dadd9/E', 'Cmaj7', 'Dadd9'],
  melody: [
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 E5:1',
    'v90 F#5:2 v86 D5:1 E5:1',
    'v90 B4:1 v84 E5:.5 F#5:.5 v92 G5:1 v86 B5:1',
    'v94 A5:2 v88 F#5:2',
  ],
  harmony: [
    stride44(['G3', 'B3', 'F#4']),
    stride44(['A3', 'D4', 'E4']),
    stride44(['G3', 'B3', 'E4']),
    stride44(['A3', 'D4', 'E4']),
  ],
  bass: [
    octaveDrive('E2', 'E3', 'B2'),
    pedalBounce('E2', 'E3'),
    driveBass('C2', 'G2'),
    driveBass('D2', 'A2'),
  ],
}

// ---------- 06 霧氷の誓約 ----------
// リズム型: 𝄽 ♪ ♩ ♪♪ ♩ | 𝅗𝅥 𝅗𝅥 （2小節×2）。弱起の8分から跳んで順次下降し、2回目は上向きの頂点 Bb5 へ登る。
// 和声: ト短調。srb-16 の Gm(add9)→Cm(add9)→Ebmaj7→Dm7。
export const rimeOathHook: Passage = {
  chords: ['Gm(add9)', 'Cm(add9)', 'Ebmaj7', 'Dm7'],
  melody: [
    'r:.5 v84 D5:.5 v88 G5:1 v84 F5:.5 Eb5:.5 v90 D5:1',
    'v92 C5:2 v86 Bb4:2',
    'r:.5 v84 D5:.5 v88 G5:1 v84 A5:.5 Bb5:.5 v92 G5:1',
    'v94 F5:2 v88 D5:2',
  ],
  harmony: [
    offbeat44(['Bb3', 'D4', 'A4']),
    offbeat44(['Eb3', 'G3', 'D4']),
    offbeat44(['G3', 'Bb3', 'D4']),
    offbeat44(['F3', 'A3', 'C4']),
  ],
  bass: [
    driveBass('G2', 'D3'),
    driveBass('C2', 'G2'),
    driveBass('Eb2', 'Bb2'),
    driveBass('D2', 'A2'),
  ],
}

// ---------- 07 レンハウスの鍛冶歌 ----------
// リズム型: ♩ ♪♪ ♩. ♪ | 𝅗𝅥 𝅗𝅥 （2小節×2）。A 長調の力強い呼びかけから、2回目は bIII(C6) へ抜けて不思議な余韻を残す。
// 和声: イ長調。srb-01 / srb-17 の Asus2→Dsus2/E→Asus2→C6（借用 bIII6）。
export const renHausForgeHook: Passage = {
  chords: ['Asus2', 'Dsus2/E', 'Asus2', 'C6'],
  melody: [
    'v90 E5:1 v84 E5:.5 F#5:.5 v92 A5:1.5 v86 E5:.5',
    'v90 D5:2 v86 B4:2',
    'v90 E5:1 v84 E5:.5 F#5:.5 v92 A5:1.5 v86 B5:.5',
    'v94 G5:2 v88 E5:2',
  ],
  harmony: [
    cycle44(['A3', 'B3', 'E4']),
    cycle44(['A3', 'D4', 'E4']),
    cycle44(['A3', 'B3', 'E4']),
    cycle44(['G3', 'C4', 'E4']),
  ],
  bass: [
    driveBass('A2', 'E3'),
    driveBass('E2', 'B2'),
    driveBass('A2', 'E3'),
    halfBass('C2', 'G2'),
  ],
}

// ---------- 08 アルガルデの早馬 ----------
// リズム型: ♪♪ ♩ 𝅗𝅥 （1小節×3）＋ 𝅗𝅥 𝅗𝅥 （1小節）。軽快な伝令の足取り。
// 和声: 嬰ヘ短調。srb-11 の F#m(add9)→Eadd9→Dmaj7→C#sus4。
export const algardeDispatchHook: Passage = {
  chords: ['F#m(add9)', 'Eadd9', 'Dmaj7', 'C#sus4'],
  melody: [
    'v90 C#5:.5 F#5:.5 v86 G#5:1 v92 A5:2',
    'v90 C#5:.5 F#5:.5 v86 G#5:1 v92 E5:2',
    'v90 C#5:.5 F#5:.5 v86 A5:1 v92 B5:2',
    'v94 A5:2 v88 G#5:2',
  ],
  harmony: [
    march44(['A3', 'C#4', 'G#4']),
    march44(['G#3', 'B3', 'F#4']),
    march44(['F#3', 'A3', 'C#4']),
    march44(['F#3', 'G#3', 'C#4']),
  ],
  bass: [
    driveBass('F#2', 'C#3'),
    driveBass('E2', 'B2'),
    driveBass('D2', 'A2'),
    halfBass('C#2', 'G#2'),
  ],
}

// ---------- 09 冬越しの麦 ----------
// リズム型: ♩ ♩ ♩. ♪ | 𝅗𝅥. 𝄽 （2小節×2）。温かく堂々とした長調から、2回目は Bbmaj7（bVI）の陰りへ踏み込む。
// 和声: ニ長調。Dadd9→Gmaj7/D→Bbmaj7→Cadd9。
export const winterWheatHook: Passage = {
  chords: ['Dadd9', 'Gmaj7/D', 'Bbmaj7', 'Cadd9'],
  melody: [
    'v88 A4:1 v84 B4:1 v92 D5:1.5 v86 E5:.5',
    'v94 F#5:3 r:1',
    'v88 A4:1 v84 B4:1 v92 F5:1.5 v86 E5:.5',
    'v92 D5:3 r:1',
  ],
  harmony: [
    cycle44(['F#3', 'A3', 'E4']),
    cycle44(['G3', 'B3', 'F#4']),
    cycle44(['F3', 'A3', 'D4']),
    cycle44(['G3', 'D4', 'E4']),
  ],
  bass: [
    pedalBounce('D2', 'D3'),
    pedalBounce('D2', 'A2'),
    driveBass('Bb1', 'F2'),
    driveBass('C2', 'G2'),
  ],
}

// ---------- 10 旧帝国の暦 ----------
// リズム型: ♩ ♪♪ ♩. ♪ | 𝅗𝅥 𝅗𝅥 （2小節×2）。高めの F#5 から折り返し、2回目は G5 を踏んで Asus2 へ開く。
// 和声: ロ短調。Bm(add9)→F#m7/A→Gmaj7→Asus2。
export const imperialAlmanacHook: Passage = {
  chords: ['Bm(add9)', 'F#m7/A', 'Gmaj7', 'Asus2'],
  melody: [
    'v90 F#5:1 v84 E5:.5 D5:.5 v92 E5:1.5 v86 B4:.5',
    'v90 D5:2 v86 C#5:2',
    'v90 F#5:1 v84 E5:.5 D5:.5 v92 G5:1.5 v86 F#5:.5',
    'v94 E5:2 v88 F#5:2',
  ],
  harmony: [
    pulse44(['D3', 'F#3', 'C#4']),
    pulse44(['E3', 'A3', 'C#4']),
    pulse44(['D3', 'G3', 'B3']),
    pulse44(['E3', 'A3', 'B3']),
  ],
  bass: [
    driveBass('B1', 'F#2'),
    driveBass('A1', 'E2'),
    driveBass('G1', 'D2'),
    halfBass('A1', 'E2'),
  ],
}

// ---------- 11 黒鷲と白銀 ----------
// リズム型: ♩ ♪♪ ♩. ♪ | 𝅗𝅥 𝅗𝅥 （2小節×2）。変イ長調の透明感に II 音の低音を敷いた srb-05 の響き。
// 和声: 変イ長調。srb-05 の Abadd9/Bb→Abmaj7/Eb→Bbm7→Dbmaj7。
export const blackEagleSilverHook: Passage = {
  chords: ['Abadd9/Bb', 'Abmaj7/Eb', 'Bbm7', 'Dbmaj7'],
  melody: [
    'v88 Eb5:1 v84 F5:.5 G5:.5 v92 Ab5:1.5 v86 Eb5:.5',
    'v90 F5:2 v86 G5:2',
    'v88 Eb5:1 v84 F5:.5 G5:.5 v92 Bb5:1.5 v86 Ab5:.5',
    'v94 F5:2 v88 Eb5:2',
  ],
  harmony: [
    comp44(['C4', 'Eb4', 'Ab4']),
    comp44(['C4', 'Eb4', 'G4']),
    comp44(['Db4', 'F4', 'Ab4']),
    comp44(['C4', 'F4', 'Ab4']),
  ],
  bass: [
    driveBass('Bb1', 'F2'),
    driveBass('Eb2', 'Bb2'),
    driveBass('Bb1', 'F2'),
    halfBass('Db2', 'Ab2'),
  ],
}

// ---------- 12 灰都への使者 ----------
// リズム型: ♩ 𝅗𝅥 ♩ | ♩. ♪ 𝅗𝅥 （2小節×2）。2拍目を長く保つシンコペーション気味の凛とした歩み。
// 和声: 嬰ハ短調。srb-17 の C#sus2→C#m7/B→Amaj7→G#sus4。
export const envoyToAshdarHook: Passage = {
  chords: ['C#sus2', 'C#m7/B', 'Amaj7', 'G#sus4'],
  melody: [
    'v90 G#4:1 v94 C#5:2 v86 D#5:1',
    'v92 E5:1.5 v86 D#5:.5 v88 B4:2',
    'v90 G#4:1 v94 C#5:2 v86 E5:1',
    'v94 F#5:1.5 v88 E5:.5 v90 D#5:2',
  ],
  harmony: [
    stride44(['G#3', 'C#4', 'D#4']),
    stride44(['G#3', 'B3', 'E4']),
    stride44(['G#3', 'C#4', 'E4']),
    stride44(['G#3', 'C#4', 'D#4']),
  ],
  bass: [
    driveBass('C#2', 'G#2'),
    driveBass('B1', 'F#2'),
    driveBass('A1', 'E2'),
    halfBass('G#1', 'D#2'),
  ],
}

// ==========================================
// 12案の試聴用 Study 組み立て
// ==========================================

export const firstHooks: CompositionStudy[] = [
  buildSketch({
    id: 'valhardt2-hook-silver-eagle-banner',
    title: '銀鷲の旗印',
    description:
      'ニ短調 · ♩=120 · 4/4。1拍の呼吸から4度で駆け上がり、2小節目で堂々と伸ばす勇ましい主題。srb-14 の Dm(add9)→Dm/C→Bb6→Asus4 で支える',
    tempo: 120,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '弱起気味の1拍休みから立ち上がり、2回目は F5–G5 を経由して E5 へ開く',
        passage: silverEagleBannerHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-ashen-guardian',
    title: '灰の守護者',
    description:
      'ハ短調 · ♩=116 · 4/4。1拍目から付点のリズムで踏み出す堅実な旋律。srb-12 の C 保続低音の上で Cm→Abadd9/C→Fsus4/C→Gm7/C とドリア色が滲む',
    tempo: 116,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '順次上行の呼びかけを、2回目は D5（9度）の着地で言い直す',
        passage: ashenGuardianHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-caucasa-gate',
    title: 'コーカサの関所',
    description:
      'ヘ短調 · ♩=124 · 4/4。8分の折り返しから高音 F5 へ跳び、2回目は G5（9度）へ抜ける。srb-10 の Fm7→Ebadd9/F→Dbmaj7/F→Ebadd9/G',
    tempo: 124,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '短いターンから長音へ飛び、山岳の関所を見渡す',
        passage: caucasaGateHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-hexaria-astrolabe',
    title: 'ヘクサリアの星盤',
    description:
      'イ短調 · ♩=118 · 4/4。3+3+2 の伴奏に乗せて下降し、2回目は Esus2 の5度へ不思議に留まる。srb-04 の Am(add9)→Fmaj7→Cadd9→Esus2',
    tempo: 118,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '下降する呼びかけと、上向いて留まる応答の対比',
        passage: hexariaAstrolabeHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-northern-legion',
    title: '北方軍団の行進',
    description:
      'ホ短調 · ♩=128 · 4/4。オクターブ低音の推進力に乗る歯切れのよい行進。Em(add9)→Dadd9/E→Cmaj7→Dadd9 の澄んだ響き',
    tempo: 128,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '8分の跳躍を含む行進型。2回目は B5 へ抜け、A5–F#5 で受ける',
        passage: northernLegionHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-rime-oath',
    title: '霧氷の誓約',
    description:
      'ト短調 · ♩=114 · 4/4。弱起の8分から7度へ跳んで下り、2回目は Bb5 へ登る。srb-16 の Gm(add9)→Cm(add9)→Ebmaj7→Dm7 と裏拍の和音',
    tempo: 114,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '裏拍の和声に乗せて、下降の1回目と上行の2回目を対比する',
        passage: rimeOathHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-renhaus-forge',
    title: 'レンハウスの鍛冶歌',
    description:
      'イ長調 · ♩=126 · 4/4。3音周期の分散和音が4拍子とずれてからくりのように回る。srb-01/17 の Asus2→Dsus2/E から借用和音 C6 へ抜ける',
    tempo: 126,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '明るい Asus2 の呼びかけを、2回目は bIII6（C6）の不思議な色彩で言い直す',
        passage: renHausForgeHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-algarde-dispatch',
    title: 'アルガルデの早馬',
    description:
      '嬰ヘ短調 · ♩=132 · 4/4。1小節の短い動機を3度重ねて頂点 B5 へ駆け上がり、C#sus4 へ着地する。srb-11 の F#m(add9)→Eadd9→Dmaj7→C#sus4',
    tempo: 132,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '1小節動機×3＋終止1小節の疾走感ある戦略テーマ',
        passage: algardeDispatchHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-winter-wheat',
    title: '冬越しの麦',
    description:
      'ニ長調 · ♩=112 · 4/4。穏やかな長調の呼びかけを、2回目で bVI（Bbmaj7）と Cadd9 の不思議な陰りへ移す',
    tempo: 112,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '同じ上行の歩みで、長調の F#5 と借用短調側の F5 を対比する',
        passage: winterWheatHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-imperial-almanac',
    title: '旧帝国の暦',
    description:
      'ロ短調 · ♩=120 · 4/4。高めの F#5 から折り返す厳かな旋律。Bm(add9)→F#m7/A→Gmaj7→Asus2 の素直な下降低音に乗せる',
    tempo: 120,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '折り返しの動機から、2回目は G5 を踏んで Asus2 の開放感へ抜ける',
        passage: imperialAlmanacHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-black-eagle-silver',
    title: '黒鷲と白銀',
    description:
      '変イ長調 · ♩=116 · 4/4。srb-05 の Abadd9/Bb→Abmaj7/Eb→Bbm7→Dbmaj7 をそのまま再現した、澄んだ不思議な浮遊感のあるテーマ',
    tempo: 116,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: 'II 音の低音から始まる Ab の浮遊感と、Bb5 への伸びやかな頂点',
        passage: blackEagleSilverHook,
      },
    ],
  }),
  buildSketch({
    id: 'valhardt2-hook-envoy-to-ashdar',
    title: '灰都への使者',
    description:
      '嬰ハ短調 · ♩=122 · 4/4。2拍目を長く保つ凛とした歩み。srb-17 の C#sus2→C#m7/B→Amaj7→G#sus4 に乗せて堂々と進む',
    tempo: 122,
    meter: [4, 4],
    passages: [
      {
        label: 'フック',
        intention: '2拍目の長音で胸を張り、2回目は F#5 まで登って半終止する',
        passage: envoyToAshdarHook,
      },
    ],
  }),
]
