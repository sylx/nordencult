import type { Song } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'

// 夏の戦略画面の主題集 01。リズムの型（低音・伴奏・打楽器）を案ごとに変え、
// 旋律と和声は単純に保つ。ピアノ＋ウッドベース＋軽い打楽器の簡潔な編成。

interface ThemeDraft {
  id: string
  title: string
  description: string
  tempo: number
  meter: readonly [number, number]
  harmonyGate: number
  bassGate: number
  chords: string[]
  melody: string[]
  harmony: string[]
  bass: string[]
  drums: string[]
  phrases: CompositionStudy['phrases']
  moments: CompositionStudy['moments']
}

export function buildTheme(draft: ThemeDraft): CompositionStudy {
  const song: Song = {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    tempo: draft.tempo,
    timeSignature: draft.meter,
    intro: [],
    loop: ['theme'],
    parts: [
      { id: 'melody', label: '主題', instrument: 'yamaha-grand-piano', volume: 0.7, pan: 0.04, velocity: 88, gate: 0.94 },
      { id: 'harmony', label: '和声・伴奏', instrument: 'yamaha-grand-piano', volume: 0.38, pan: 0.16, velocity: 60, gate: draft.harmonyGate },
      { id: 'bass', label: '低音', instrument: 'acoustic-bass', volume: 0.5, pan: -0.06, velocity: 80, gate: draft.bassGate },
      { id: 'drums', label: '打楽器', instrument: 'orchestra-kit', volume: 0.36, pan: 0, velocity: 60, gate: 1 },
    ],
    sections: [
      {
        id: 'theme',
        label: draft.title,
        chords: draft.chords,
        parts: {
          melody: draft.melody,
          harmony: draft.harmony,
          bass: draft.bass,
          drums: draft.drums,
        },
      },
    ],
  }
  return {
    song,
    melodyPart: 'melody',
    hypothesis: draft.description,
    phrases: draft.phrases,
    moments: draft.moments,
  }
}

export const repeat = (bar: string, count: number) => Array.from({ length: count }, () => bar)

export const up = (pitch: string) => pitch.replace(/-?\d$/, (octave) => String(Number(octave) + 1))

/** ディスコ風のオクターブ低音（8分音符で 根音→1オクターブ上 を4回）。 */
export const octaves = (root: string) => repeat(`${root}:.5 ${up(root)}:.5`, 4).join(' ')

/** 裏拍だけを刻む伴奏。b を渡すと後半2拍を b に替える。 */
export const offbeats = (a: string, b = a) => `r:.5 ${a}:.5 r:.5 ${a}:.5 r:.5 ${b}:.5 r:.5 ${b}:.5`

/** 2拍目と、3拍裏・4拍に置く伴奏。 */
const skank = (a: string, b = a) => `r:1 ${a}:.5 r:1 ${b}:.5 ${b}:.5 r:.5`

/** 3+3+2 の伴奏。 */
const tresillo = (a: string) => `${a}:1.5 ${a}:1.5 ${a}:1`

/** 6/8 の 4分+8分 の刻み。 */
const jig = (a: string, b = a) => `${a}:1 ${a}:.5 ${b}:1 ${b}:.5`

/** 1拍裏・3拍・4拍の短い合いの手。 */
const stabs = (a: string, b = a) => `r:.5 ${a}:.5 r:1 ${b}:.5 r:.5 ${b}:.5 r:.5`

/** 頭・2拍裏・3拍裏・4拍のシンコペーション。 */
export const comp = (a: string, b = a) => `${a}:1 r:.5 ${a}:.5 r:.5 ${b}:.5 ${b}:1`

/** comp と噛み合う低音（頭・2拍裏・3拍裏・4拍でオクターブ上・4拍裏）。 */
export const push = (root: string) => `${root}:1.5 ${root}:1 ${root}:.5 ${up(root)}:.5 ${root}:.5`

export const FOUR_ON_FLOOR = 'v62 bd:.5 v34 shaker:.5 v62 bd+clap:.5 v34 shaker:.5 v62 bd:.5 v34 shaker:.5 v62 bd+clap:.5 v34 shaker:.5'
export const FOUR_TAMB = 'v60 bd:.5 v32 cabasa:.5 v60 bd:.5 v44 tamb:.5 v60 bd:.5 v32 cabasa:.5 v60 bd:.5 v44 tamb:.5'
export const TRESILLO_KIT = 'v62 bd:.5 v32 shaker:.5 shaker:.5 v58 bd:.5 v32 shaker:.5 shaker:.5 v58 clap:.5 v32 shaker:.5'
const JIG_KIT = 'v60 bd:.5 v30 tamb:.5 tamb:.5 v54 clap:.5 v30 tamb:.5 tamb:.5'
const FUNK_KIT = 'v62 bd:.5 v32 cabasa:.5 v58 clap:.5 v32 cabasa:.5 cabasa:.5 v58 bd:.5 v58 clap:.5 v32 cabasa:.5'

// ---------- 01 夏空の遠征旗 ----------
const bannerA = 'F#3+A3+D4'
const bannerC = 'E3+G3+C4'
const bannerG = 'G3+B3+D4'
// 後半の平行移動は同じ形（第2転回）のまま全音ずつ上げる
const planeBb = 'F3+Bb3+D4'
const planeC = 'G3+C4+E4'
const planeD = 'A3+D4+F#4'

// ---------- 02 陽炎の街道 ----------
const hazeAm7 = 'G3+C4+E4'
const hazeD9 = 'F#3+C4+E4'
const hazeF = 'A3+C4+E4'
const hazeEsus = 'A3+D4+E4'
const hazeE7 = 'G#3+D4+E4'
const hazeG6 = 'B3+D4+E4'
const hazeA = 'A3+C#4+E4'

// ---------- 03 入道雲の階段 ----------
// 3度・5度・9度の同じ形を平行移動する
const cloudE = 'G#3+B3+F#4'
const cloudD = 'F#3+A3+E4'
const cloudC = 'E3+G3+D4'
const cloudG = 'B3+D4+A4'
const cloudA = 'C#4+E4+B4'
const cloudB = 'D#3+F#3+C#4'
const cloudBsus = 'A3+B3+E4'

// ---------- 04 白帆のジグ ----------
const jigG = 'G3+B3+D4'
const jigF = 'F3+A3+C4'
const jigD = 'F#3+A3+D4'
const jigEm = 'G3+B3+E4'
const jigC = 'G3+C4+E4'

// ---------- 05 熱砂の先遣隊 ----------
const sandEm7 = 'G3+B3+D4'
const sandA7 = 'G3+C#4+E4'
const sandGm7 = 'Bb3+D4+F4'
const sandC7 = 'Bb3+E4+G4'
const sandC = 'G3+C4+E4'
const sandD = 'A3+D4+F#4'
const sandEm = 'G3+B3+E4'
const sandBassEm = 'E2:1.5 E2:.5 r:.5 B2:.5 D3:.5 E3:.5'
const sandBassA = 'A2:1.5 A2:.5 r:.5 E2:.5 G2:.5 A2:.5'
const sandBassGm = 'G2:1.5 G2:.5 r:.5 D3:.5 F3:.5 G3:.5'
const sandBassC = 'C3:1.5 C3:.5 r:.5 G2:.5 Bb2:.5 C3:.5'
const sandRiff = 'v88 B4:.5 B4:.5 D5:.5 v92 E5:1 r:.5 v86 D5:.5 E5:.5'
const sandAnswer = 'v92 G5:1 v88 E5:.5 v86 C#5:1 r:1.5'

// ---------- 06 真昼の凱風 ----------
const noonF = 'A3+C4+E4'
const noonG = 'B3+D4+G4'
const noonEm7 = 'G3+B3+D4'
const noonAm7 = 'G3+C4+E4'
const noonCadd9 = 'G3+D4+E4'
const noonC = 'G3+C4+E4'
const noonDm7 = 'A3+C4+F4'
const noonA = 'A3+C#4+E4'
const noonGsus = 'G3+C4+D4'
const noonGlow = 'G3+B3+D4'

export const firstThemes: CompositionStudy[] = [
  buildTheme({
    id: 'summer-sky-banner',
    title: '夏空の遠征旗',
    tempo: 124,
    meter: [4, 4],
    harmonyGate: 0.7,
    bassGate: 0.8,
    description:
      'ニのミクソリディア · ♩=124 · 4/4。オクターブを8分で刻むディスコ風の低音と裏拍の和音に、D→C→G の明るい主題を乗せる。後半は Bb→C→D と長三和音を全音ずつ平行移動し、旋律も同じ形のまま一緒に上がって頂点の D6 へ届く',
    chords: [
      'D', 'C', 'G', 'D',
      'D', 'C', 'G', 'Asus4 A',
      'Bb', 'C', 'D', 'D',
      'Bb', 'C', 'D', 'Asus4 A',
    ],
    melody: [
      'v86 A4:.5 D5:.5 v92 F#5:1 v88 E5:.5 D5:1 E5:.5',
      'v90 E5:1.5 v84 C5:.5 v86 D5:1 v88 E5:1',
      'v88 D5:1.5 v84 B4:.5 v82 G4:1 v84 B4:1',
      'v86 A4:2.5 r:1.5',
      'v86 A4:.5 D5:.5 v92 F#5:1 v88 E5:.5 v90 F#5:1 v94 A5:.5',
      'v94 G5:1.5 v88 E5:.5 v90 G5:1 v86 E5:1',
      'v88 D5:1.5 v84 B4:.5 v88 D5:1 v92 G5:1',
      'v90 E5:2.5 r:1.5',
      'v88 D5:.5 F5:.5 v94 Bb5:1.5 v90 A5:.5 v88 F5:1',
      'v90 E5:.5 G5:.5 v96 C6:1.5 v92 B5:.5 v90 G5:1',
      'v92 F#5:.5 A5:.5 v100 D6:1.5 v94 C#6:.5 v92 A5:1',
      'v92 B5:1 v88 A5:.5 F#5:.5 v90 A5:1 r:1',
      'v88 D5:.5 F5:.5 v94 Bb5:1.5 v90 A5:.5 v88 F5:1',
      'v90 E5:.5 G5:.5 v96 C6:1.5 v92 B5:.5 v90 G5:1',
      'v92 F#5:.5 A5:.5 v100 D6:2 v92 A5:1',
      'v90 A5:1 v86 E5:1.5 r:1.5',
    ],
    harmony: [
      offbeats(bannerA), offbeats(bannerC), offbeats(bannerG), offbeats(bannerA),
      offbeats(bannerA), offbeats(bannerC), offbeats(bannerG), offbeats('A3+D4+E4', 'A3+C#4+E4'),
      offbeats(planeBb), offbeats(planeC), offbeats(planeD), offbeats(planeD),
      offbeats(planeBb), offbeats(planeC), offbeats(planeD), offbeats('A3+D4+E4', 'A3+C#4+E4'),
    ],
    bass: [
      octaves('D2'), octaves('C2'), octaves('G2'), octaves('D2'),
      octaves('D2'), octaves('C2'), octaves('G2'), octaves('A2'),
      octaves('Bb1'), octaves('C2'), octaves('D2'), octaves('D2'),
      octaves('Bb1'), octaves('C2'), octaves('D2'), octaves('A2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '旗を掲げる', from: 1, to: 4, intention: 'A4→D5→F#5 の上行と、2拍裏から伸びる D5 のシンコペーションで口ずさめる呼びかけを置く。' },
      { label: '高く応える', from: 5, to: 8, intention: '同じ出だしから A5・G5 まで広げ、Asus4→A で後半へ渡す。' },
      { label: '全音の平行移動', from: 9, to: 12, intention: '同じ動機を Bb→C→D と和音ごと全音ずつ上げ、D6 を頂点にする。' },
      { label: 'もう一段、そして戻る', from: 13, to: 16, intention: '平行移動を繰り返し、D6 を長く伸ばして Asus4→A から冒頭へ戻る。' },
    ],
    moments: [
      { bar: 2, beat: 0.5, pitches: ['C3', 'E3', 'G3', 'C4', 'E5'], intention: 'ミクソリディアの bVII（C の長三和音）' },
      { bar: 9, beat: 0.5, pitches: ['Bb2', 'F3', 'Bb3', 'D4', 'F5'], intention: '平行移動の1段目 Bb' },
      { bar: 10, beat: 0.5, pitches: ['C3', 'G3', 'C4', 'E4', 'G5'], intention: '全音上の C（同じ形）' },
      { bar: 11, beat: 0.5, pitches: ['D3', 'A3', 'D4', 'F#4', 'A5'], intention: 'さらに全音上の D（同じ形）' },
    ],
  }),

  buildTheme({
    id: 'summer-heat-haze-road',
    title: '陽炎の街道',
    tempo: 120,
    meter: [4, 4],
    harmonyGate: 0.65,
    bassGate: 0.78,
    description:
      'イ短調 / イのドリア · ♩=120 · 4/4。短調のディスコ。休符から飛び込む主題を Am7→D9→Fmaj7→E7 に乗せ、伴奏は最上音 E4 を保ったまま内側だけ動かす。後半は Fmaj7→G6 と旋律ごと全音上がり、15小節目だけ A の長三和音へ抜けてから E7 で戻る',
    chords: [
      'Am7', 'D9', 'Fmaj7', 'E7sus4 E7',
      'Am7', 'D9', 'Fmaj7', 'E7sus4 E7',
      'Fmaj7', 'G6', 'Am7', 'Am7',
      'Fmaj7', 'G6', 'A', 'E7sus4 E7',
    ],
    melody: [
      'r:.5 v86 E5:.5 G5:.5 v92 A5:1 v88 G5:.5 v86 E5:1',
      'v90 F#5:1.5 v86 E5:.5 v84 D5:1 r:1',
      'r:.5 v84 C5:.5 E5:.5 v90 F5:1 v86 E5:.5 v84 C5:1',
      'v86 B4:1.5 v82 A4:.5 v84 G#4:1 r:1',
      'r:.5 v86 E5:.5 G5:.5 v92 A5:1 v88 G5:.5 v86 E5:1',
      'v90 F#5:1.5 v86 E5:.5 v92 A5:1 r:1',
      'r:.5 v92 A5:.5 v88 G5:.5 v90 F5:1 v86 E5:.5 v84 C5:1',
      'v84 D5:1 v88 E5:2 r:1',
      'v92 A5:1.5 v88 G5:.5 v86 F5:1 v90 A5:1',
      'v94 B5:1.5 v90 A5:.5 v88 G5:1 v92 B5:1',
      'v96 C6:2 v90 B5:.5 A5:.5 v88 G5:1',
      'v90 A5:2.5 r:1.5',
      'v92 A5:1.5 v88 G5:.5 v86 F5:1 v90 A5:1',
      'v94 B5:1.5 v90 A5:.5 v88 G5:1 v92 B5:1',
      'v98 C#6:2 v92 B5:.5 A5:.5 v88 E5:1',
      'v88 E5:1 v86 D5:1 v84 B4:1 r:1',
    ],
    harmony: [
      skank(hazeAm7), skank(hazeD9), skank(hazeF), skank(hazeEsus, hazeE7),
      skank(hazeAm7), skank(hazeD9), skank(hazeF), skank(hazeEsus, hazeE7),
      skank(hazeF), skank(hazeG6), skank(hazeAm7), skank(hazeAm7),
      skank(hazeF), skank(hazeG6), skank(hazeA), skank(hazeEsus, hazeE7),
    ],
    bass: [
      octaves('A1'), octaves('D2'), octaves('F2'), octaves('E2'),
      octaves('A1'), octaves('D2'), octaves('F2'), octaves('E2'),
      octaves('F2'), octaves('G2'), octaves('A1'), octaves('A1'),
      octaves('F2'), octaves('G2'), octaves('A1'), octaves('E2'),
    ],
    drums: repeat(FOUR_TAMB, 16),
    phrases: [
      { label: '飛び込む呼びかけ', from: 1, to: 4, intention: '頭を空けて E5–G5–A5 と入り、D9 の F#5 でドリアの明るさを出す。' },
      { label: '応答', from: 5, to: 8, intention: '同じ入りから A5 へ跳ね、E7 の E5 で止める。' },
      { label: '全音上げて歌う', from: 9, to: 12, intention: 'Fmaj7 の句をそのまま G6 へ全音上げ、C6 から Am7 に降りる。' },
      { label: '長調への一瞬', from: 13, to: 16, intention: '15小節目だけ C#6 で A の長三和音に抜け、E7 で短調の冒頭へ戻る。' },
    ],
    moments: [
      { bar: 2, beat: 1, pitches: ['D2', 'F#3', 'C4', 'E4', 'F#5'], intention: 'ドリアの D9（長6度 F#）' },
      { bar: 10, beat: 1, pitches: ['G2', 'B3', 'D4', 'E4', 'B5'], intention: '全音上げた G6' },
      { bar: 15, beat: 1, pitches: ['A1', 'A3', 'C#4', 'E4', 'C#6'], intention: 'A の長三和音（C#）' },
      { bar: 16, beat: 3, pitches: ['E2', 'G#3', 'D4', 'E4'], intention: '戻りの E7' },
    ],
  }),

  buildTheme({
    id: 'summer-thunderhead-steps',
    title: '入道雲の階段',
    tempo: 116,
    meter: [4, 4],
    harmonyGate: 0.9,
    bassGate: 0.85,
    description:
      'ホ長調 · ♩=116 · 4/4。平行移動を主役にした案。3度・5度・9度を重ねた同じ形の和音が E→D→C と全音ずつ降り、旋律も同じ形で一緒に降りる。低音と伴奏は 3+3+2 の刻み。後半は G→A→B と逆に上がり、C→D から E へ戻る',
    chords: [
      'E(add9)', 'D(add9)', 'C(add9)', 'D(add9)',
      'E(add9)', 'D(add9)', 'C(add9)', 'B7sus4',
      'G(add9)', 'A(add9)', 'B(add9)', 'B(add9)',
      'G(add9)', 'A(add9)', 'C(add9) D(add9)', 'B7sus4',
    ],
    melody: [
      'v92 G#5:1 v88 F#5:.5 v90 E5:1 v84 B4:.5 v88 E5:1',
      'v90 F#5:1 v86 E5:.5 v88 D5:1 v82 A4:.5 v86 D5:1',
      'v88 E5:1 v84 D5:.5 v86 C5:1 v80 G4:.5 v84 C5:1',
      'v84 D5:.5 E5:.5 v88 F#5:1 v92 A5:1 r:1',
      'v92 G#5:1 v88 F#5:.5 v90 E5:1 v84 B4:.5 v88 E5:1',
      'v90 F#5:1 v86 E5:.5 v88 D5:1 v82 A4:.5 v86 D5:1',
      'v88 E5:1 v84 D5:.5 v86 C5:1 v80 G4:.5 v84 C5:1',
      'v84 B4:.5 C#5:.5 v88 E5:1 v90 F#5:1.5 r:.5',
      'v94 B5:1 v90 A5:.5 v92 G5:1 v86 D5:.5 v90 G5:1',
      'v96 C#6:1 v92 B5:.5 v94 A5:1 v88 E5:.5 v92 A5:1',
      'v98 D#6:1 v94 C#6:.5 v94 B5:2.5',
      'r:1 v86 F#5:.5 v90 B5:.5 v88 G#5:1 v86 F#5:1',
      'v94 B5:1 v90 A5:.5 v92 G5:1 v86 D5:.5 v90 G5:1',
      'v96 C#6:1 v92 B5:.5 v94 A5:1 v88 E5:.5 v92 A5:1',
      'v90 G5:1 v86 E5:1 v92 A5:1 v88 F#5:1',
      'v92 B5:2.5 r:1.5',
    ],
    harmony: [
      tresillo(cloudE), tresillo(cloudD), tresillo(cloudC), tresillo(cloudD),
      tresillo(cloudE), tresillo(cloudD), tresillo(cloudC), tresillo(cloudBsus),
      tresillo(cloudG), tresillo(cloudA), tresillo(cloudB), tresillo(cloudB),
      tresillo(cloudG), tresillo(cloudA), `${cloudC}:1.5 ${cloudC}:.5 ${cloudD}:1 ${cloudD}:1`, tresillo(cloudBsus),
    ],
    bass: [
      'E2:1.5 E2:1.5 B2:1', 'D2:1.5 D2:1.5 A2:1', 'C2:1.5 C2:1.5 G2:1', 'D2:1.5 D2:1.5 A2:1',
      'E2:1.5 E2:1.5 B2:1', 'D2:1.5 D2:1.5 A2:1', 'C2:1.5 C2:1.5 G2:1', 'B1:1.5 B1:1.5 F#2:1',
      'G2:1.5 G2:1.5 D3:1', 'A2:1.5 A2:1.5 E3:1', 'B1:1.5 B1:1.5 F#2:1', 'B1:1.5 B1:1.5 F#2:1',
      'G2:1.5 G2:1.5 D3:1', 'A2:1.5 A2:1.5 E3:1', 'C2:1.5 C2:.5 D2:1 D2:1', 'B1:1.5 B1:1.5 F#2:1',
    ],
    drums: repeat(TRESILLO_KIT, 16),
    phrases: [
      { label: '降りる階段', from: 1, to: 4, intention: '5つの音の動機を E→D→C と和音ごと全音ずつ下げ、4小節目で A5 へ上向きに返す。' },
      { label: '繰り返しと半終止', from: 5, to: 8, intention: '同じ階段を降り、B7sus4 の F#5 で止めて後半を待つ。' },
      { label: '昇る階段', from: 9, to: 12, intention: '同じ動機を G→A→B と上げ、D#6 から B5 を長く伸ばす。' },
      { label: '帰り道', from: 13, to: 16, intention: 'もう一度 G→A と昇り、C→D の2拍ずつの平行移動から B5 で E へ戻る。' },
    ],
    moments: [
      { bar: 1, beat: 0, pitches: ['E2', 'G#3', 'B3', 'F#4', 'G#5'], intention: 'E(add9) の基本形' },
      { bar: 2, beat: 0, pitches: ['D2', 'F#3', 'A3', 'E4', 'F#5'], intention: '全音下の D(add9)（同じ形）' },
      { bar: 3, beat: 0, pitches: ['C2', 'E3', 'G3', 'D4', 'E5'], intention: 'さらに全音下の C(add9)' },
      { bar: 10, beat: 0, pitches: ['A2', 'C#4', 'E4', 'B4', 'C#6'], intention: '後半、上向きの A(add9)' },
    ],
  }),

  buildTheme({
    id: 'summer-white-sail-jig',
    title: '白帆のジグ',
    tempo: 156,
    meter: [6, 8],
    harmonyGate: 0.8,
    bassGate: 0.85,
    description:
      'トのミクソリディア · ♩=156（付点4分=104）· 6/8。ケルト風の舞曲の跳ねで進む案。8分音符で駆ける主題を G→F の全音下への平行移動に乗せ、7小節目の F→D で F5→F#5 と半音上げて締める。後半は Em→C→G→D の上で4分+8分の長めの歌に切り替える',
    chords: [
      'G', 'G', 'F', 'D',
      'G', 'G', 'F D', 'G',
      'Em', 'C', 'G', 'D',
      'Em', 'C', 'F', 'D',
    ],
    melody: [
      'v86 G4:.5 B4:.5 D5:.5 v92 G5:1 v86 D5:.5',
      'v88 E5:.5 D5:.5 B4:.5 v88 D5:1.5',
      'v90 F5:.5 E5:.5 C5:.5 v84 A4:1 v86 C5:.5',
      'v88 D5:1.5 v84 A4:1 r:.5',
      'v86 G4:.5 B4:.5 D5:.5 v92 G5:1 v86 D5:.5',
      'v88 E5:.5 D5:.5 B4:.5 v92 G5:1.5',
      'v94 A5:.5 G5:.5 F5:.5 v92 F#5:1 v94 A5:.5',
      'v92 G5:2 r:1',
      'v94 B5:1 v88 G5:.5 v88 E5:1 v90 G5:.5',
      'v92 A5:1 v88 G5:.5 v86 E5:1.5',
      'v90 G5:1 v86 D5:.5 v84 B4:1 v86 D5:.5',
      'v90 F#5:1 v86 E5:.5 v86 D5:1.5',
      'v94 B5:1 v88 G5:.5 v88 E5:1 v90 G5:.5',
      'v96 C6:1 v92 A5:.5 v90 G5:1.5',
      'v92 A5:.5 G5:.5 F5:.5 v86 C5:1 v90 F5:.5',
      'v90 F#5:1 v86 D5:.5 v84 A4:1 r:.5',
    ],
    harmony: [
      jig(jigG), jig(jigG), jig(jigF), jig(jigD),
      jig(jigG), jig(jigG), jig(jigF, jigD), jig(jigG),
      jig(jigEm), jig(jigC), jig(jigG), jig(jigD),
      jig(jigEm), jig(jigC), jig(jigF), jig(jigD),
    ],
    bass: [
      'G2:1.5 D3:1.5', 'G2:1.5 D3:1.5', 'F2:1.5 C3:1.5', 'D2:1.5 A2:1.5',
      'G2:1.5 D3:1.5', 'G2:1.5 D3:1.5', 'F2:1.5 D2:1.5', 'G2:1.5 D3:1.5',
      'E2:1.5 B2:1.5', 'C2:1.5 G2:1.5', 'G2:1.5 D3:1.5', 'D2:1.5 A2:1.5',
      'E2:1.5 B2:1.5', 'C2:1.5 G2:1.5', 'F2:1.5 C3:1.5', 'D2:1.5 A2:1.5',
    ],
    drums: repeat(JIG_KIT, 16),
    phrases: [
      { label: '帆を上げる', from: 1, to: 4, intention: 'G の分散和音で駆け上がり、3小節目で F へ全音下がって D で止まる。' },
      { label: '風をつかむ', from: 5, to: 8, intention: '同じ出だしから A5 へ届き、F5→F#5 の半音で G に着地する。' },
      { label: '沖の歌', from: 9, to: 12, intention: '音数を減らし、B5 から降りる長めの歌を Em→C→G→D に乗せる。' },
      { label: '舵を戻す', from: 13, to: 16, intention: 'C6 まで上がり、F の駆け足から D の F#5 で冒頭へ戻る。' },
    ],
    moments: [
      { bar: 3, beat: 0, pitches: ['F2', 'F3', 'A3', 'C4', 'F5'], intention: 'ミクソリディアの bVII（F）' },
      { bar: 7, beat: 1.5, pitches: ['D2', 'F#3', 'A3', 'D4', 'F#5'], intention: 'F から D へ、F→F# の半音' },
      { bar: 9, beat: 0, pitches: ['E2', 'G3', 'B3', 'E4', 'B5'], intention: '後半の Em' },
      { bar: 15, beat: 0, pitches: ['F2', 'F3', 'A3', 'C4', 'A5'], intention: '終盤の F' },
    ],
  }),

  buildTheme({
    id: 'summer-hot-sand-vanguard',
    title: '熱砂の先遣隊',
    tempo: 108,
    meter: [4, 4],
    harmonyGate: 0.55,
    bassGate: 0.8,
    description:
      'ホのドリア · ♩=108 · 4/4。同音連打で始まる短いリフを主題にしたファンク寄りの案。Em7→A7 の2小節を繰り返し、低音は休符を挟んで跳ね上がる。後半はリフも低音も丸ごと短3度上の Gm7→C7 へ平行移動し、C→D→Em で締める',
    chords: [
      'Em7', 'A7', 'Em7', 'A7',
      'Em7', 'A7', 'Em7', 'A7',
      'Gm7', 'C7', 'Gm7', 'C7',
      'Em7', 'A7', 'C D', 'Em',
    ],
    melody: [
      sandRiff,
      sandAnswer,
      sandRiff,
      'v92 G5:1 v90 A5:.5 v94 B5:1 r:1.5',
      sandRiff,
      sandAnswer,
      'v88 B4:.5 B4:.5 D5:.5 v92 E5:1 r:.5 v90 G5:.5 A5:.5',
      'v96 B5:1 v90 A5:.5 v88 E5:1.5 r:1',
      'v90 D5:.5 D5:.5 F5:.5 v94 G5:1 r:.5 v88 F5:.5 G5:.5',
      'v96 Bb5:1 v90 G5:.5 v88 E5:1 r:1.5',
      'v90 D5:.5 D5:.5 F5:.5 v94 G5:1 r:.5 v88 F5:.5 G5:.5',
      'v96 Bb5:1 v94 C6:.5 v100 D6:1 r:1.5',
      sandRiff,
      sandAnswer,
      'v90 G5:1 v86 E5:.5 G5:.5 v94 A5:1 v88 F#5:.5 A5:.5',
      'v96 B5:2 r:2',
    ],
    harmony: [
      stabs(sandEm7), stabs(sandA7), stabs(sandEm7), stabs(sandA7),
      stabs(sandEm7), stabs(sandA7), stabs(sandEm7), stabs(sandA7),
      stabs(sandGm7), stabs(sandC7), stabs(sandGm7), stabs(sandC7),
      stabs(sandEm7), stabs(sandA7), stabs(sandC, sandD), stabs(sandEm),
    ],
    bass: [
      sandBassEm, sandBassA, sandBassEm, sandBassA,
      sandBassEm, sandBassA, sandBassEm, sandBassA,
      sandBassGm, sandBassC, sandBassGm, sandBassC,
      sandBassEm, sandBassA, 'C2:1.5 C2:.5 D2:1.5 D2:.5', sandBassEm,
    ],
    drums: repeat(FUNK_KIT, 16),
    phrases: [
      { label: 'リフ', from: 1, to: 4, intention: 'B4 の連打から E5 へ上がるリフと、A7 上の G5–E5–C#5 の応答。4小節目は B5 へ返す。' },
      { label: 'リフの念押し', from: 5, to: 8, intention: '同じリフを重ね、8小節目で B5 から E5 に降りて区切る。' },
      { label: '短3度上へ', from: 9, to: 12, intention: 'リフ・和音・低音を丸ごと短3度上げ、D6 を頂点にする。' },
      { label: '帰還', from: 13, to: 16, intention: '元の高さのリフに戻り、C→D の上で G5・A5 を踏んで Em の B5 で終える。' },
    ],
    moments: [
      { bar: 2, beat: 0.5, pitches: ['A2', 'G3', 'C#4', 'E4', 'G5'], intention: 'ドリアの A7（C#）' },
      { bar: 9, beat: 0.5, pitches: ['G2', 'Bb3', 'D4', 'F4', 'D5'], intention: '短3度上の Gm7 への平行移動' },
      { bar: 10, beat: 0.5, pitches: ['C3', 'Bb3', 'E4', 'G4', 'Bb5'], intention: '短3度上の C7' },
      { bar: 15, beat: 2, pitches: ['D2', 'A3', 'D4', 'F#4', 'A5'], intention: '締めの C→D の D' },
    ],
  }),

  buildTheme({
    id: 'summer-noon-fair-wind',
    title: '真昼の凱風',
    tempo: 126,
    meter: [4, 4],
    harmonyGate: 0.75,
    bassGate: 0.8,
    description:
      'ハ長調 · ♩=126 · 4/4。忙しく刻むリズムの上で、旋律は長く伸ばす案。Fmaj7→G→Em7→Am7 のポップス寄りの進行に3拍伸ばす音を置き、低音と伴奏はシンコペーションで押す。後半は 3+3+2 の下降動機に替わり、12小節目の A の長三和音（C#6）から D6 へ上がる',
    chords: [
      'Fmaj7', 'G', 'Em7', 'Am7',
      'Fmaj7', 'G', 'C(add9)', 'C',
      'Dm7', 'G', 'Em7', 'A',
      'Dm7', 'Em7', 'Fmaj7', 'Gsus4 G',
    ],
    melody: [
      'v90 E5:3 v84 C5:.5 v86 E5:.5',
      'v90 D5:3 v84 B4:.5 v86 D5:.5',
      'v94 G5:2.5 v88 E5:.5 v86 D5:1',
      'v88 E5:3 r:1',
      'v90 E5:3 v84 C5:.5 v86 E5:.5',
      'v90 D5:2.5 v86 E5:.5 v90 G5:.5 v92 A5:.5',
      'v94 G5:4',
      '-:2 r:1 v88 G5:.5 v92 A5:.5',
      'v96 C6:1.5 v92 A5:1.5 v88 F5:1',
      'v94 B5:1.5 v90 G5:1.5 v86 D5:1',
      'v90 G5:1.5 v88 E5:1.5 v90 G5:1',
      'v92 A5:2 r:.5 v92 A5:.5 v98 C#6:1',
      'v100 D6:1.5 v96 C6:1.5 v92 A5:1',
      'v94 B5:1.5 v90 G5:1.5 v88 E5:1',
      'v92 A5:1.5 v90 G5:1.5 v86 E5:1',
      'v88 D5:2.5 r:.5 v84 C5:.5 v86 D5:.5',
    ],
    harmony: [
      comp(noonF), comp(noonG), comp(noonEm7), comp(noonAm7),
      comp(noonF), comp(noonG), comp(noonCadd9), comp(noonC),
      comp(noonDm7), comp(noonG), comp(noonEm7), comp(noonA),
      comp(noonDm7), comp(noonEm7), comp(noonF), comp(noonGsus, noonGlow),
    ],
    bass: [
      push('F2'), push('G2'), push('E2'), push('A2'),
      push('F2'), push('G2'), push('C2'), push('C2'),
      push('D2'), push('G2'), push('E2'), push('A2'),
      push('D2'), push('E2'), push('F2'), push('G2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '長い呼びかけ', from: 1, to: 4, intention: 'E5・D5 を3拍ずつ伸ばし、Em7 で G5 へ開いて Am7 の E5 に収める。' },
      { label: '主音への到着', from: 5, to: 8, intention: '同じ呼びかけから A5 を経て G5 を6拍伸ばし、C に落ち着く。' },
      { label: '3+3+2 の下降', from: 9, to: 12, intention: 'C6 から降りる動機を Dm7→G→Em7 と順に下げ、A の C#6 で向きを変える。' },
      { label: '頂点と戻り', from: 13, to: 16, intention: 'D6 から Dm7→Em7→Fmaj7 と低音が上がる中を降り、C5–D5 の弱起で冒頭の E5 へ戻る。' },
    ],
    moments: [
      { bar: 1, beat: 0, pitches: ['F2', 'A3', 'C4', 'E4', 'E5'], intention: 'Fmaj7 と長7度の E5' },
      { bar: 3, beat: 0, pitches: ['E2', 'G3', 'B3', 'D4', 'G5'], intention: 'Em7' },
      { bar: 12, beat: 3, pitches: ['A2', 'A3', 'C#4', 'E4', 'C#6'], intention: 'A の長三和音（C#）' },
      { bar: 16, beat: 3, pitches: ['G2', 'G3', 'B3', 'D4'], intention: '戻りの G' },
    ],
  }),
]
