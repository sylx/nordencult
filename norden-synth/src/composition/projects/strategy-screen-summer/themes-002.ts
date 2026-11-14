import type { CompositionStudy } from '../../study.ts'
import {
  buildTheme, comp, firstThemes, FOUR_ON_FLOOR, FOUR_TAMB, octaves, offbeats, push, repeat, TRESILLO_KIT, up,
} from './themes-001.ts'

// 夏の戦略画面の主題集 02。主題集 01 の「入道雲の階段」（調の中心が定まらない平行移動）と
// 「真昼の凱風」（刻むリズムの上の覚えやすい歌）の2方向を取り直す。

/** 頭・2拍裏で押し、4拍を8分2つで締める伴奏。 */
const drive = (a: string, b = a) => `${a}:1.5 ${a}:1 r:.5 ${b}:.5 ${b}:.5`

/** 2拍ずつ根音を替えるオクターブ低音。 */
export const octavePair = (a: string, b: string) => `${a}:.5 ${up(a)}:.5 ${a}:.5 ${up(a)}:.5 ${b}:.5 ${up(b)}:.5 ${b}:.5 ${up(b)}:.5`

/** 12/8 のシャッフル: 2拍目・4拍目の跳ねに置く伴奏。 */
const shuffle = (a: string, b = a) => `r:1 ${a}:.5 ${a}:1 r:.5 r:1 ${b}:.5 ${b}:1 r:.5`

/** 12/8 のシャッフル低音。 */
const shuffleBass = (root: string) => repeat(`${root}:1 ${root}:.5 ${up(root)}:1 ${root}:.5`, 2).join(' ')

/** バイヨン風の刻み（1拍裏・2拍裏・3拍裏・4拍裏、2拍裏だけ長い）。 */
const baiao = (a: string) => `r:.5 ${a}:.5 r:.5 ${a}:1 ${a}:.5 r:.5 ${a}:.5`

/** 3+3+2 の低音（根音・根音・5度）。 */
const tresilloBass = (root: string, fifth: string) => `${root}:1.5 ${root}:1.5 ${fifth}:1`

const SHUFFLE_KIT = repeat('v62 bd:1 v32 shaker:.5 v58 clap:1 v32 shaker:.5', 2).join(' ')

// ---------- 01 真昼の凱風、ふたたび ----------
// 前半8小節は主題集 01 の「真昼の凱風」をそのまま使い、8小節目の弱起と後半だけを書き直す。
const noon = firstThemes.find((study) => study.song.id === 'summer-noon-fair-wind')!.song.sections[0]
const planeAb = 'C4+Eb4+G4'
const planeBb = 'D4+F4+A4'
const planeC = 'E4+G4+B4'
const planeD = 'F#4+A4+C#5'

// ---------- 02 積乱雲の回廊 ----------
// 3度・5度・9度の同じ形を平行移動する
const corD = 'F#3+A3+E4'
const corF = 'A3+C4+G4'
const corG = 'B3+D4+A4'
const corBb = 'D4+F4+C5'
const corC = 'E4+G4+D5'
const corA = 'C#4+E4+B4'
const corDhigh = 'F#4+A4+E5'

// ---------- 03 南風のシャッフル ----------
const shA = 'A3+C#4+E4'
const shD = 'A3+D4+F#4'
const shE = 'G#3+B3+E4'
const shDm7 = 'F3+A3+C4'
const shEm7 = 'G3+B3+D4'

// ---------- 04 珊瑚礁の航路図 ----------
const reefF = 'A3+C4+E4'
const reefE7 = 'G#3+D4+E4'
const reefAm7 = 'G3+C4+E4'
const reefC7 = 'G3+Bb3+E4'
const reefA7 = 'G3+C#4+E4'
const reefDm7 = 'F3+A3+C4'
const reefEm7 = 'G3+B3+D4'
const reefG7 = 'B3+D4+F4'
const reefAb = 'C4+Eb4+G4'
const reefBb = 'D4+F4+A4'
const reefEsus = 'A3+D4+E4'

// ---------- 05 蜃気楼の四つ辻 ----------
// 低音を保ったまま、主和音と全音上の長三和音を行き来する。4小節ごとに短3度上へ。
const mirC = 'G3+C4+E4'
const mirD = 'A3+D4+F#4'
const mirEb = 'Bb3+Eb4+G4'
const mirF = 'C4+F4+A4'
const mirFs = 'A#3+C#4+F#4'
const mirGs = 'C4+D#4+G#4'
const mirA = 'A3+C#4+E4'
const mirB = 'B3+D#4+F#4'
const mirCall = 'v88 G4:.5 C5:.5 v92 E5:1 v90 F#5:.5 v94 G5:1.5'

// ---------- 06 南方街道のバイヨン ----------
const baiD7 = 'F#3+A3+C4'
const baiC7 = 'E3+G3+Bb3'
const baiF = 'F3+A3+C4'
const baiG = 'G3+B3+D4'
const baiBm = 'F#3+B3+D4'
const baiA = 'E3+A3+C#4'
const baiCall = 'v88 D5:.5 F#5:.5 A5:.5 v92 G#5:.5 v94 A5:1 v88 F#5:1'

export const secondThemes: CompositionStudy[] = [
  buildTheme({
    id: 'summer-noon-fair-wind-ascent',
    title: '真昼の凱風、ふたたび',
    tempo: 126,
    meter: [4, 4],
    harmonyGate: 0.75,
    bassGate: 0.8,
    description:
      'ハ長調 · ♩=126 · 4/4。「真昼の凱風」の前半8小節をそのまま残し、後半を書き直した案。冒頭の「3拍伸ばして2音で返す」動機を Abmaj7→Bbmaj7→Cmaj7 と長7の和音ごと全音ずつ上げ、Dmaj7 の D6 で一度目の頂点。そこから Fmaj7→G と 3+3+2 で畳み、Ab→Bb→C でもう一度押し上げる',
    chords: [
      'Fmaj7', 'G', 'Em7', 'Am7',
      'Fmaj7', 'G', 'C(add9)', 'C',
      'Abmaj7', 'Bbmaj7', 'Cmaj7', 'Dmaj7',
      'Fmaj7', 'G', 'Ab Bb', 'C',
    ],
    melody: [
      ...noon.parts.melody.slice(0, 7),
      '-:2 r:1 v86 Eb5:.5 v90 F5:.5',
      'v94 G5:3 v86 Eb5:.5 v90 G5:.5',
      'v96 A5:3 v88 F5:.5 v92 A5:.5',
      'v98 B5:3 v90 G5:.5 v94 B5:.5',
      'v102 D6:1.5 v96 C#6:1.5 v92 A5:1',
      'v94 A5:1.5 v90 G5:1.5 v88 E5:1',
      'v96 B5:1.5 v92 A5:1.5 v90 G5:1',
      'v98 C6:1 v92 Ab5:1 v102 D6:1 v94 Bb5:1',
      'v100 C6:2.5 r:.5 v84 C5:.5 v86 D5:.5',
    ],
    harmony: [
      ...noon.parts.harmony.slice(0, 8),
      comp(planeAb), comp(planeBb), comp(planeC), comp(planeD),
      comp('A3+C4+E4'), comp('B3+D4+G4'), comp('C4+Eb4+Ab4', 'D4+F4+Bb4'), comp('E4+G4+C5'),
    ],
    bass: [
      ...noon.parts.bass.slice(0, 8),
      push('Ab1'), push('Bb1'), push('C2'), push('D2'),
      push('F2'), push('G2'), 'Ab1:1.5 Ab1:.5 Bb1:1.5 Bb1:.5', push('C2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '長い呼びかけ（元のまま）', from: 1, to: 4, intention: 'E5・D5 を3拍ずつ伸ばし、Em7 で G5 へ開いて Am7 の E5 に収める。' },
      { label: '主音への到着（元のまま）', from: 5, to: 8, intention: 'G5 を6拍伸ばして C に落ち着き、Eb5–F5 の弱起で後半の調へ踏み出す。' },
      { label: '長7の平行移動', from: 9, to: 12, intention: '冒頭の動機を Abmaj7→Bbmaj7→Cmaj7 と全音ずつ上げ（旋律は G–A–B）、Dmaj7 の D6 で頂点。' },
      { label: 'もう一押し', from: 13, to: 16, intention: 'Fmaj7→G で 3+3+2 に畳み、Ab→Bb の2拍ずつの平行移動から C6 を伸ばして冒頭へ戻る。' },
    ],
    moments: [
      { bar: 9, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'G5'], intention: 'Abmaj7 と長7度の G5' },
      { bar: 10, beat: 0, pitches: ['Bb1', 'D4', 'F4', 'A4', 'A5'], intention: '全音上の Bbmaj7（同じ形）' },
      { bar: 12, beat: 0, pitches: ['D2', 'F#4', 'A4', 'C#5', 'D6'], intention: 'Dmaj7 と頂点の D6' },
      { bar: 15, beat: 3, pitches: ['Bb1', 'D4', 'F4', 'Bb5'], intention: '終盤の Ab→Bb の Bb' },
    ],
  }),

  buildTheme({
    id: 'summer-cumulonimbus-corridor',
    title: '積乱雲の回廊',
    tempo: 122,
    meter: [4, 4],
    harmonyGate: 0.85,
    bassGate: 0.8,
    description:
      '調の中心を定めない案（ニから始まる）· ♩=122 · 4/4。「入道雲の階段」の add9 の平行移動を、D→F→G→Bb→C と全音・短3度を混ぜて上へ進む形に変え、低音はディスコ風のオクターブにした。旋律は弱起の駆け上がり・伸ばす音・休符を小節ごとに入れ替え、後半は G→A→C→D と同じ形のまま D6 まで昇る',
    chords: [
      'D(add9)', 'F(add9)', 'G(add9)', 'Bb(add9) C(add9)',
      'D(add9)', 'F(add9)', 'G(add9)', 'Asus4',
      'G(add9)', 'A(add9)', 'C(add9)', 'D(add9)',
      'F(add9)', 'G(add9)', 'Bb(add9)', 'C(add9)',
    ],
    melody: [
      'r:.5 v86 A4:.5 D5:.5 E5:.5 v94 F#5:1.5 v88 E5:.5',
      'v92 G5:1 v88 F5:.5 v86 C5:1.5 r:1',
      'r:.5 v86 B4:.5 D5:.5 G5:.5 v96 A5:1.5 v90 G5:.5',
      'v90 F5:1 v86 D5:1 v94 G5:1 v88 E5:.5 v92 G5:.5',
      'v98 A5:2 r:.5 v88 F#5:.5 E5:.5 D5:.5',
      'v86 C5:.5 F5:.5 v90 G5:1 v96 A5:1.5 v90 G5:.5',
      'v98 B5:1.5 v92 A5:.5 v90 G5:1 v86 D5:1',
      'v90 E5:2.5 r:1.5',
      'r:.5 v88 D5:.5 G5:.5 A5:.5 v98 B5:1.5 v92 A5:.5',
      'v96 B5:1 v92 A5:.5 v88 E5:1.5 r:1',
      'r:.5 v90 E5:.5 G5:.5 C6:.5 v102 D6:1.5 v96 C6:.5',
      'v94 A5:1 v90 F#5:.5 v102 D6:1.5 r:1',
      'v98 C6:1.5 v92 A5:1.5 v90 G5:1',
      'v102 D6:1.5 v96 B5:1.5 v92 A5:1',
      'v102 D6:1 v96 C6:.5 v94 Bb5:1 v88 F5:.5 v92 Bb5:1',
      'v96 C6:1 v90 G5:1 v86 E5:1 r:1',
    ],
    harmony: [
      drive(corD), drive(corF), drive(corG), drive(corBb, corC),
      drive(corD), drive(corF), drive(corG), drive('A3+D4+E4'),
      drive(corG), drive(corA), drive(corC), drive(corDhigh),
      drive(corF), drive(corG), drive(corBb), drive(corC),
    ],
    bass: [
      octaves('D2'), octaves('F2'), octaves('G2'), octavePair('Bb1', 'C2'),
      octaves('D2'), octaves('F2'), octaves('G2'), octaves('A1'),
      octaves('G2'), octaves('A1'), octaves('C2'), octaves('D2'),
      octaves('F2'), octaves('G2'), octaves('Bb1'), octaves('C2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '駆け上がりと返事', from: 1, to: 4, intention: '弱起から F#5 へ駆け上がる小節と、頭から降りて休む小節を交互に置き、Bb→C の2拍ずつで D へ押し戻す。' },
      { label: '伸ばして崩す', from: 5, to: 8, intention: 'A5 を2拍伸ばしてから細かく降り、B5 を経て Asus4 の E5 で止める。' },
      { label: '同じ形で昇る', from: 9, to: 12, intention: '冒頭の2小節を G→A、C→D と和音ごと上げ、D6 を頂点にする。' },
      { label: '3+3+2 の締め', from: 13, to: 16, intention: 'F→G→Bb→C と昇る和音の上で 3+3+2 の下降句を重ね、休符を置いて冒頭の弱起へ戻る。' },
    ],
    moments: [
      { bar: 1, beat: 2, pitches: ['D2', 'F#3', 'A3', 'E4', 'F#5'], intention: 'D(add9) と旋律の F#5' },
      { bar: 2, beat: 0, pitches: ['F2', 'A3', 'C4', 'G4', 'G5'], intention: '短3度上の F(add9)（同じ形、旋律は9度の G5）' },
      { bar: 11, beat: 2, pitches: ['C2', 'E4', 'G4', 'D5', 'D6'], intention: '後半の C(add9) と D6' },
      { bar: 15, beat: 0, pitches: ['Bb1', 'D4', 'F4', 'C5', 'D6'], intention: '終盤の Bb(add9)' },
    ],
  }),

  buildTheme({
    id: 'summer-south-wind-shuffle',
    title: '南風のシャッフル',
    tempo: 162,
    meter: [12, 8],
    harmonyGate: 0.7,
    bassGate: 0.82,
    description:
      'イ長調 · ♩=162（付点4分=108）· 12/8。跳ねるシャッフルの案。A→F#m7→D→E の素直な進行に「長・短」で弾む歌を乗せ、後半は Dm7→Em7→F#m7 と短7の和音を全音ずつ平行移動して、同じ動機が F5→G5→A5 と昇る',
    chords: [
      'A', 'F#m7', 'D', 'E',
      'A', 'F#m7', 'D', 'E',
      'Dm7', 'Em7', 'F#m7', 'E',
      'Dm7', 'Em7', 'F#m7', 'Esus4 E',
    ],
    melody: [
      'v88 C#5:1 E5:.5 v96 A5:1.5 v90 G#5:1 v86 E5:.5 v90 F#5:1.5',
      'v88 E5:1.5 v84 C#5:2.5 r:1 v84 A4:.5 B4:.5',
      'v88 C#5:1 D5:.5 v94 F#5:1.5 v88 E5:1 D5:.5 v96 A5:1.5',
      'v92 G#5:1.5 v86 E5:2.5 r:2',
      'v88 C#5:1 E5:.5 v96 A5:1.5 v90 G#5:1 v86 E5:.5 v90 F#5:1.5',
      'v88 E5:1.5 v84 C#5:1.5 v96 A5:1.5 v90 G#5:1 v92 A5:.5',
      'v98 B5:1.5 v92 A5:1 v88 F#5:.5 v86 D5:1.5 v88 F#5:1 v92 A5:.5',
      'v94 G#5:3 r:3',
      'v90 F5:1 v86 D5:.5 v90 F5:1.5 v96 A5:1.5 v90 F5:1.5',
      'v92 G5:1 v88 E5:.5 v92 G5:1.5 v98 B5:1.5 v92 G5:1.5',
      'v94 A5:1 v90 F#5:.5 v94 A5:1.5 v100 C#6:1.5 v94 A5:1.5',
      'v98 B5:3 v92 G#5:1.5 v88 E5:1.5',
      'v90 F5:1 v86 D5:.5 v90 F5:1.5 v96 A5:1.5 v98 C6:1.5',
      'v92 G5:1 v88 E5:.5 v92 G5:1.5 v98 B5:1.5 v102 D6:1.5',
      'v100 C#6:1.5 v94 A5:1.5 v90 F#5:1.5 v94 A5:1.5',
      'v96 B5:1.5 v92 A5:1.5 v90 G#5:1.5 r:1.5',
    ],
    harmony: [
      shuffle(shA), shuffle(shA), shuffle(shD), shuffle(shE),
      shuffle(shA), shuffle(shA), shuffle(shD), shuffle(shE),
      shuffle(shDm7), shuffle(shEm7), shuffle(shA), shuffle(shE),
      shuffle(shDm7), shuffle(shEm7), shuffle(shA), shuffle('A3+B3+E4', shE),
    ],
    bass: [
      shuffleBass('A1'), shuffleBass('F#2'), shuffleBass('D2'), shuffleBass('E2'),
      shuffleBass('A1'), shuffleBass('F#2'), shuffleBass('D2'), shuffleBass('E2'),
      shuffleBass('D2'), shuffleBass('E2'), shuffleBass('F#2'), shuffleBass('E2'),
      shuffleBass('D2'), shuffleBass('E2'), shuffleBass('F#2'), shuffleBass('E2'),
    ],
    drums: repeat(SHUFFLE_KIT, 16),
    phrases: [
      { label: '弾む呼びかけ', from: 1, to: 4, intention: 'C#5–E5–A5 と跳ねて上がり、F#m7 で長く休んでから D→E で A5・G#5 へ返す。' },
      { label: '休まず押す', from: 5, to: 8, intention: '同じ出だしから休みを埋めて B5 まで届き、E の G#5 を伸ばす。' },
      { label: '短7の平行移動', from: 9, to: 12, intention: '同じ動機を Dm7→Em7→F#m7 と全音ずつ上げ、E の B5 で受ける。' },
      { label: '頂点へ', from: 13, to: 16, intention: '動機の末尾を上向きに変えて C6・D6 まで昇り、F#m7 から Esus4→E で冒頭へ戻る。' },
    ],
    moments: [
      { bar: 2, beat: 1.5, pitches: ['F#2', 'A3', 'C#4', 'E4', 'C#5'], intention: 'F#m7' },
      { bar: 9, beat: 1.5, pitches: ['D2', 'F3', 'A3', 'C4', 'F5'], intention: '長調から外れる Dm7' },
      { bar: 10, beat: 1.5, pitches: ['E2', 'G3', 'B3', 'D4', 'G5'], intention: '全音上の Em7（同じ形）' },
      { bar: 11, beat: 1.5, pitches: ['F#2', 'A3', 'C#4', 'E4', 'A5'], intention: 'さらに全音上の F#m7' },
    ],
  }),

  buildTheme({
    id: 'summer-coral-reef-chart',
    title: '珊瑚礁の航路図',
    tempo: 118,
    meter: [4, 4],
    harmonyGate: 0.65,
    bassGate: 0.78,
    description:
      'イ短調（ヘから始まる）· ♩=118 · 4/4。「真昼の凱風」と同じく、刻むリズムの上で音を伸ばす案。Fmaj7→E7→Am7→C7 のシティポップ寄りの循環に、頭を空けて入り長く伸ばす動機を置く。低音はオクターブ、伴奏は裏拍。後半は Dm7→Em7→Fmaj7→G7 と昇り、Abmaj7→Bbmaj7 の平行移動から E7 へ落として戻る',
    chords: [
      'Fmaj7', 'E7', 'Am7', 'C7',
      'Fmaj7', 'E7', 'Am7', 'A7',
      'Dm7', 'Em7', 'Fmaj7', 'G7',
      'Abmaj7', 'Bbmaj7', 'E7sus4', 'E7',
    ],
    melody: [
      'r:.5 v92 A5:.5 v88 G5:.5 v92 E5:2.5',
      'r:.5 v92 G#5:.5 v88 F5:.5 v90 D5:2.5',
      'r:.5 v86 C5:.5 E5:.5 v94 G5:1.5 v88 E5:1',
      'v88 E5:.5 G5:.5 v96 Bb5:2 r:1',
      'r:.5 v92 A5:.5 v88 G5:.5 v92 E5:2.5',
      'r:.5 v92 G#5:.5 v88 F5:.5 v90 D5:1.5 v90 E5:1',
      'r:.5 v86 C5:.5 E5:.5 v96 A5:1.5 v90 G5:1',
      'v90 E5:2 r:1 v88 E5:.5 v92 G5:.5',
      'v96 A5:2 r:.5 v88 F5:.5 v92 A5:.5 v96 C6:.5',
      'v98 B5:2 r:.5 v90 G5:.5 v94 B5:.5 v98 D6:.5',
      'v100 C6:1.5 v94 A5:1.5 v88 E5:1',
      'v102 D6:1.5 v96 B5:1.5 v92 G5:1',
      'v100 C6:1 v94 Bb5:.5 v92 G5:1 v86 Eb5:.5 v92 G5:1',
      'v102 D6:1 v96 C6:.5 v94 A5:1 v88 F5:.5 v94 A5:1',
      'v98 B5:3 v92 A5:1',
      'v94 G#5:2 r:2',
    ],
    harmony: [
      offbeats(reefF), offbeats(reefE7), offbeats(reefAm7), offbeats(reefC7),
      offbeats(reefF), offbeats(reefE7), offbeats(reefAm7), offbeats(reefA7),
      offbeats(reefDm7), offbeats(reefEm7), offbeats(reefF), offbeats(reefG7),
      offbeats(reefAb), offbeats(reefBb), offbeats(reefEsus), offbeats(reefE7),
    ],
    bass: [
      octaves('F2'), octaves('E2'), octaves('A1'), octaves('C2'),
      octaves('F2'), octaves('E2'), octaves('A1'), octaves('A1'),
      octaves('D2'), octaves('E2'), octaves('F2'), octaves('G2'),
      octaves('Ab1'), octaves('Bb1'), octaves('E2'), octaves('E2'),
    ],
    drums: repeat(FOUR_TAMB, 16),
    phrases: [
      { label: '空けて入る', from: 1, to: 4, intention: '頭を休んで A5–G5–E5、G#5–F5–D5 と同じ形で入り、C7 の Bb5 で F へ向ける。' },
      { label: '応答', from: 5, to: 8, intention: '同じ入りから A5 へ上げ、A7 の E5 と弱起で後半へ渡す。' },
      { label: '一段ずつ昇る', from: 9, to: 12, intention: 'Dm7→Em7 で伸ばす音を A5→B5 と上げ、Fmaj7→G7 で 3+3+2 に変えて D6 へ。' },
      { label: '平行移動から戻る', from: 13, to: 16, intention: 'Abmaj7→Bbmaj7 で同じ句を全音上げ、E7sus4 の B5 を伸ばして G#5 で冒頭へ戻る。' },
    ],
    moments: [
      { bar: 2, beat: 0.5, pitches: ['E2', 'G#3', 'D4', 'E4', 'G#5'], intention: '2小節目の E7（G#）' },
      { bar: 4, beat: 1.5, pitches: ['C2', 'G3', 'Bb3', 'E4', 'Bb5'], intention: 'F へ向かう C7' },
      { bar: 13, beat: 0.5, pitches: ['Ab1', 'C4', 'Eb4', 'G4', 'C6'], intention: 'Abmaj7 への転換' },
      { bar: 14, beat: 0.5, pitches: ['Bb1', 'D4', 'F4', 'A4', 'D6'], intention: '全音上の Bbmaj7（同じ形）' },
    ],
  }),

  buildTheme({
    id: 'summer-mirage-crossroads',
    title: '蜃気楼の四つ辻',
    tempo: 120,
    meter: [4, 4],
    harmonyGate: 0.7,
    bassGate: 0.8,
    description:
      '調の中心が4小節ごとに短3度ずつ上がる案（C→Eb→F#→A で一巡）· ♩=120 · 4/4。低音は同じ音のオクターブを保ち、その上で主和音と全音上の長三和音を行き来する（リディアの響き）。旋律は G4–C5–E5–F#5–G5 と駆け上がる呼びかけ。3つ目の F# では低い音域から歌い直し、A で頂点、G を経て C へ戻る',
    chords: [
      'C', 'D/C', 'C', 'D/C',
      'Eb', 'F/Eb', 'Eb', 'F/Eb',
      'F#', 'G#/F#', 'F#', 'G#/F#',
      'A', 'B/A', 'A', 'Gsus4 G',
    ],
    melody: [
      mirCall,
      'v96 A5:1.5 v90 F#5:1 v86 D5:.5 r:1',
      mirCall,
      'v96 A5:1 v98 B5:.5 v94 A5:1 v88 F#5:.5 r:1',
      'v90 Bb4:.5 Eb5:.5 v94 G5:1 v92 A5:.5 v96 Bb5:1.5',
      'v100 C6:1.5 v94 A5:1 v88 F5:.5 r:1',
      'v96 Bb5:1 v90 G5:.5 v94 Bb5:1 v90 G5:.5 v86 Eb5:1',
      'v98 C6:1 v92 A5:.5 v88 F5:1.5 r:1',
      'v84 C#5:1.5 v80 A#4:1 v84 C#5:.5 v90 F#5:1',
      'v92 G#5:1.5 v86 D#5:1 r:1.5',
      'v86 C#5:1.5 v82 A#4:1 v86 C#5:.5 v90 F#5:.5 v92 G#5:.5',
      'v96 A#5:1.5 v92 G#5:1 v88 D#5:.5 r:1',
      'v102 C#6:1.5 v96 A5:1 v90 E5:.5 v94 A5:1',
      'v98 B5:1.5 v92 F#5:1 v88 D#5:.5 v92 F#5:1',
      'v94 A5:1 v96 B5:.5 v102 C#6:1.5 v96 A5:1',
      'v102 D6:2 v94 B5:1 r:1',
    ],
    harmony: [
      offbeats(mirC), offbeats(mirD), offbeats(mirC), offbeats(mirD),
      offbeats(mirEb), offbeats(mirF), offbeats(mirEb), offbeats(mirF),
      offbeats(mirFs), offbeats(mirGs), offbeats(mirFs), offbeats(mirGs),
      offbeats(mirA), offbeats(mirB), offbeats(mirA), offbeats('G3+C4+D4', 'G3+B3+D4'),
    ],
    bass: [
      ...repeat(octaves('C2'), 4),
      ...repeat(octaves('Eb2'), 4),
      ...repeat(octaves('F#2'), 4),
      ...repeat(octaves('A2'), 3), octaves('G2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: 'ハの辻', from: 1, to: 4, intention: 'G4 から G5 へ駆け上がり、D/C の上で A5 から降りる。F#5 がリディアの色。' },
      { label: '変ホの辻', from: 5, to: 8, intention: '同じ呼びかけを短3度上げ、後半は Bb5–G5 の往復に変えて C6 まで届く。' },
      { label: '嬰ヘの辻', from: 9, to: 12, intention: '低い音域の伸ばす句で歌い直し、A#5 へ少しずつ上げる。' },
      { label: 'イの辻と帰路', from: 13, to: 16, intention: 'C#6 から降りる句で頂点を作り、Gsus4→G の D6 で C へ戻る。' },
    ],
    moments: [
      { bar: 2, beat: 0.5, pitches: ['C3', 'A3', 'D4', 'F#4', 'A5'], intention: 'C の低音上の D（リディアの F#）' },
      { bar: 5, beat: 0.5, pitches: ['Eb3', 'Bb3', 'Eb4', 'G4', 'Eb5'], intention: '短3度上の Eb' },
      { bar: 9, beat: 0.5, pitches: ['F#3', 'A#3', 'C#4', 'F#4', 'C#5'], intention: 'さらに短3度上の F#' },
      { bar: 14, beat: 0.5, pitches: ['A3', 'B3', 'D#4', 'F#4', 'B5'], intention: 'A の低音上の B' },
    ],
  }),

  buildTheme({
    id: 'summer-southern-road-baiao',
    title: '南方街道のバイヨン',
    tempo: 112,
    meter: [4, 4],
    harmonyGate: 0.7,
    bassGate: 0.85,
    description:
      'ニのミクソリディア（#4 入り）· ♩=112 · 4/4。ブラジル北東部の舞曲バイヨン風の案。3+3+2 の低音と裏拍の刻みの上で、D7 の分散和音に G# を挟む動機を D7→C7 と全音下へ平行移動し、7小節目は F へ跳ぶ。後半は Bm→A→G の上で 3+3+2 の長めの歌に替える',
    chords: [
      'D7', 'D7', 'C7', 'C7',
      'D7', 'D7', 'F', 'G',
      'Bm', 'Bm', 'A', 'A',
      'G', 'G', 'A', 'A',
    ],
    melody: [
      baiCall,
      'v98 C6:1.5 v92 B5:.5 v90 A5:1 r:1',
      'v86 C5:.5 E5:.5 G5:.5 v90 F#5:.5 v92 G5:1 v86 E5:1',
      'v96 Bb5:1.5 v90 A5:.5 v88 G5:1 r:1',
      baiCall,
      'v98 C6:1.5 v92 B5:.5 v90 A5:.5 v94 B5:.5 v98 C6:1',
      'v90 F5:.5 A5:.5 C6:.5 v96 B5:.5 v100 C6:1 v92 A5:1',
      'v102 D6:1.5 v96 B5:.5 v92 G5:1 r:1',
      'v90 F#5:1.5 v86 D5:1.5 v90 F#5:1',
      'v98 B5:2.5 v92 A5:.5 v88 F#5:1',
      'v88 E5:1.5 v84 C#5:1.5 v88 E5:1',
      'v96 A5:3 r:1',
      'v96 B5:1.5 v90 G5:1.5 v94 B5:1',
      'v102 D6:2.5 v96 B5:.5 v92 G5:1',
      'v100 C#6:1.5 v94 A5:1.5 v88 E5:1',
      'v94 A5:1 v90 G5:1 v86 E5:1 r:1',
    ],
    harmony: [
      baiao(baiD7), baiao(baiD7), baiao(baiC7), baiao(baiC7),
      baiao(baiD7), baiao(baiD7), baiao(baiF), baiao(baiG),
      baiao(baiBm), baiao(baiBm), baiao(baiA), baiao(baiA),
      baiao(baiG), baiao(baiG), baiao(baiA), baiao(baiA),
    ],
    bass: [
      tresilloBass('D2', 'A2'), tresilloBass('D2', 'A2'), tresilloBass('C2', 'G2'), tresilloBass('C2', 'G2'),
      tresilloBass('D2', 'A2'), tresilloBass('D2', 'A2'), tresilloBass('F2', 'C3'), tresilloBass('G2', 'D3'),
      tresilloBass('B1', 'F#2'), tresilloBass('B1', 'F#2'), tresilloBass('A1', 'E2'), tresilloBass('A1', 'E2'),
      tresilloBass('G2', 'D3'), tresilloBass('G2', 'D3'), tresilloBass('A1', 'E2'), tresilloBass('A1', 'E2'),
    ],
    drums: repeat(TRESILLO_KIT, 16),
    phrases: [
      { label: '街道の合図', from: 1, to: 4, intention: 'D–F#–A–G#–A の動機と C6 からの返事を、C7 へ全音下げて繰り返す。' },
      { label: '跳ぶ', from: 5, to: 8, intention: '同じ動機から C6 に留まり、F へ跳んで G の D6 まで上げる。' },
      { label: '長い歌', from: 9, to: 12, intention: 'Bm→A の上で 3+3+2 の歌に替え、B5・A5 を伸ばす。' },
      { label: '頂点と戻り', from: 13, to: 16, intention: 'G の D6 を頂点に、A の上を G5（ミクソリディアの7度）で降りて冒頭へ戻る。' },
    ],
    moments: [
      { bar: 1, beat: 1.5, pitches: ['D2', 'F#3', 'A3', 'C4', 'G#5'], intention: 'D7 の上の #4（G#5）' },
      { bar: 3, beat: 0.5, pitches: ['C2', 'E3', 'G3', 'Bb3', 'E5'], intention: '全音下の C7' },
      { bar: 7, beat: 0.5, pitches: ['F2', 'F3', 'A3', 'C4', 'A5'], intention: '7小節目の F' },
      { bar: 9, beat: 0.5, pitches: ['B1', 'F#3', 'B3', 'D4', 'F#5'], intention: '後半の Bm' },
    ],
  }),
]
