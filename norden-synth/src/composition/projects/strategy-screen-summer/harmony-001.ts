import type { Song } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { comp, FOUR_ON_FLOOR, octaves, offbeats, push, repeat, TRESILLO_KIT, up } from './themes-001.ts'
import { secondThemes } from './themes-002.ts'

// 「真昼の凱風、ふたたび」の和声案 01。旋律は派生元のまま。
// 9〜12小節目（元は Abmaj7→Bbmaj7→Cmaj7→Dmaj7）の受け方を中心に、低音の向き・内声・刻みを変える。
// 13〜16小節目（Fmaj7→G→Ab Bb→C）の進行は、低音を変える1案を除いて保つ。

const parent = secondThemes.find((study) => study.song.id === 'summer-noon-fair-wind-ascent')!
const parentParts = parent.song.sections[0].parts

interface HarmonyDraft {
  id: string
  title: string
  description: string
  harmonyGate: number
  bassGate: number
  chords: string[]
  harmony: string[]
  bass: string[]
  drums: string[]
  phrases: CompositionStudy['phrases']
  moments: CompositionStudy['moments']
}

function buildVariation(draft: HarmonyDraft): CompositionStudy {
  const song: Song = {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    tempo: parent.song.tempo,
    timeSignature: parent.song.timeSignature,
    intro: [],
    loop: ['theme'],
    parts: parent.song.parts.map((part) =>
      part.id === 'harmony' ? { ...part, gate: draft.harmonyGate } : part.id === 'bass' ? { ...part, gate: draft.bassGate } : { ...part }),
    sections: [
      {
        id: 'theme',
        label: draft.title,
        chords: draft.chords,
        parts: {
          melody: [...parentParts.melody],
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

/** 2拍ずつ根音を替えるオクターブ低音。 */
const octavePair = (a: string, b: string) => `${a}:.5 ${up(a)}:.5 ${a}:.5 ${up(a)}:.5 ${b}:.5 ${up(b)}:.5 ${b}:.5 ${up(b)}:.5`

/** 3+3+2 の伴奏と低音。 */
const tresillo = (a: string) => `${a}:1.5 ${a}:1.5 ${a}:1`
const tresilloBass = (root: string, fifth: string) => `${root}:1.5 ${root}:1.5 ${fifth}:1`

// 派生元と共通の押さえ方
const F = 'A3+C4+E4'
const G = 'B3+D4+G4'
const Em7 = 'G3+B3+D4'
const Am7 = 'G3+C4+E4'
const Cadd9 = 'G3+D4+E4'
const C = 'G3+C4+E4'
const Abmaj7 = 'C4+Eb4+G4'
const AbTop = 'C4+Eb4+Ab4'
const BbTop = 'D4+F4+Bb4'
const CTop = 'E4+G4+C5'
const AB_BB_BASS = 'Ab1:1.5 Ab1:.5 Bb1:1.5 Bb1:.5'

export const noonAscentHarmonies: CompositionStudy[] = [
  buildVariation({
    id: 'summer-noon-ascent-falling-bass',
    title: '真昼の凱風、ふたたび — 降りる低音',
    harmonyGate: 0.75,
    bassGate: 0.8,
    description:
      '前半と刻みは派生元のまま、Abmaj7 の後だけを変える案。旋律が G→A→B→D と昇るのに対し、低音を Ab→G→F→E と1音ずつ降ろす（Abmaj7→Gm9→Fmaj9(#11)→E9sus4）。E から半音上の Fmaj7 へ入って終盤につなぐ。8小節目の後半に Eb/G を置いて Ab への入口を作る',
    chords: [
      'Fmaj7', 'G', 'Em7', 'Am7',
      'Fmaj7', 'G', 'C(add9)', 'C Eb/G',
      'Abmaj7', 'Gm9', 'Fmaj9(#11)', 'E9sus4',
      'Fmaj7', 'G', 'Ab Bb', 'C',
    ],
    harmony: [
      ...parentParts.harmony.slice(0, 7), comp(C, 'G3+Bb3+Eb4'),
      comp(Abmaj7), comp('Bb3+D4+F4'), comp('A3+E4+G4'), comp('A3+D4+F#4'),
      comp(F), comp(G), comp(AbTop, BbTop), comp(CTop),
    ],
    bass: [
      ...parentParts.bass.slice(0, 7), 'C2:1.5 C2:1 G2:.5 G3:.5 G2:.5',
      push('Ab2'), push('G2'), push('F2'), push('E2'),
      push('F2'), push('G2'), AB_BB_BASS, push('C2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '前半（派生元のまま）', from: 1, to: 7, intention: 'Fmaj7→G→Em7→Am7 と刻みを保つ。' },
      { label: 'Ab への入口', from: 8, to: 9, intention: '8小節目の後半を Eb/G にし、低音 G→Ab で Abmaj7 へ入る。' },
      { label: '反行', from: 10, to: 12, intention: '旋律の上行に対して低音を G→F→E と降ろす。Gm9・Fmaj9(#11) では旋律が9度と #11。' },
      { label: '終盤（進行は派生元のまま）', from: 13, to: 16, intention: 'E から半音上の Fmaj7 へ入り、G→Ab→Bb→C で締める。' },
    ],
    moments: [
      { bar: 8, beat: 3, pitches: ['G3', 'Bb3', 'Eb4', 'Eb5'], intention: 'Ab への入口の Eb/G' },
      { bar: 10, beat: 0, pitches: ['G2', 'Bb3', 'D4', 'F4', 'A5'], intention: 'Gm9（旋律の A5 が9度）' },
      { bar: 11, beat: 0, pitches: ['F2', 'A3', 'E4', 'G4', 'B5'], intention: 'Fmaj9(#11)（旋律の B5 が #11）' },
      { bar: 12, beat: 0, pitches: ['E2', 'A3', 'D4', 'F#4', 'D6'], intention: 'E9sus4 と頂点の D6' },
    ],
  }),

  buildVariation({
    id: 'summer-noon-ascent-mediant',
    title: '真昼の凱風、ふたたび — 三度の乗り継ぎ',
    harmonyGate: 0.65,
    bassGate: 0.78,
    description:
      '低音をディスコ風のオクターブ、伴奏を裏拍にした案。前半は Dm9→G→Cmaj7→Am7 と主音へ素直に進む形に替える。Abmaj7 からは短3度下の Fmaj7、半音下の Em7 と降り、12小節目は Asus4→A で旋律の D6→C#6 をそのまま解決にする',
    chords: [
      'Dm9', 'G', 'Cmaj7', 'Am7',
      'Dm9', 'G', 'C(add9)', 'C',
      'Abmaj7', 'Fmaj7', 'Em7', 'Asus4 A',
      'Fmaj7', 'G', 'Ab Bb', 'C',
    ],
    harmony: [
      offbeats('F3+C4+E4'), offbeats('G3+B3+D4'), offbeats('G3+B3+E4'), offbeats(Am7),
      offbeats('F3+C4+E4'), offbeats('G3+B3+D4'), offbeats(Cadd9), offbeats(C),
      offbeats(Abmaj7), offbeats(F), offbeats(Em7), 'r:.5 A3+D4+E4:.5 r:.5 A3+C#4+E4:.5 r:.5 A3+C#4+E4:.5 r:.5 A3+C#4+E4:.5',
      offbeats(F), offbeats(G), offbeats(AbTop, BbTop), offbeats(CTop),
    ],
    bass: [
      octaves('D2'), octaves('G2'), octaves('C2'), octaves('A1'),
      octaves('D2'), octaves('G2'), octaves('C2'), octaves('C2'),
      octaves('Ab1'), octaves('F2'), octaves('E2'), octaves('A1'),
      octaves('F2'), octaves('G2'), octavePair('Ab1', 'Bb1'), octaves('C2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '主音へ進む前半', from: 1, to: 8, intention: 'Dm9→G→Cmaj7→Am7。旋律の E5 は Dm9 の9度になる。' },
      { label: '三度と半音で降りる', from: 9, to: 11, intention: 'Abmaj7→Fmaj7→Em7。旋律の A5・B5 は Fmaj7 の3度、Em7 の5度。' },
      { label: '掛留の解決', from: 12, to: 12, intention: 'Asus4 の D6 が A の C#6 へ解決する。' },
      { label: '終盤', from: 13, to: 16, intention: 'A から Fmaj7 へ移り、G→Ab→Bb→C で締める。' },
    ],
    moments: [
      { bar: 1, beat: 0.5, pitches: ['D3', 'F3', 'C4', 'E4', 'E5'], intention: 'Dm9（旋律の E5 が9度）' },
      { bar: 10, beat: 0.5, pitches: ['F3', 'A3', 'C4', 'E4', 'A5'], intention: 'Abmaj7 から短3度下の Fmaj7' },
      { bar: 11, beat: 0.5, pitches: ['E3', 'G3', 'B3', 'D4', 'B5'], intention: 'Em7' },
      { bar: 12, beat: 1.5, pitches: ['A2', 'A3', 'C#4', 'E4', 'C#6'], intention: 'A への解決（C#）' },
    ],
  }),

  buildVariation({
    id: 'summer-noon-ascent-pedal-minor-ninths',
    title: '真昼の凱風、ふたたび — 保続から短9の平行移動',
    harmonyGate: 0.75,
    bassGate: 0.78,
    description:
      '前半8小節は低音を C のオクターブに固定し、上の和音だけを動かす案。Abmaj7 で初めて低音が動く。そこからは長7ではなく短9の和音を Gm9→Am9→Bm9 と全音ずつ平行移動し、E7sus4 を挟んで Fmaj7 へ入る',
    chords: [
      'Fmaj7/C', 'G/C', 'Em7/C', 'Am7/C',
      'Fmaj7/C', 'G/C', 'C(add9)', 'C',
      'Abmaj7', 'Gm9', 'Am9', 'Bm9 E7sus4',
      'Fmaj7', 'G', 'Ab Bb', 'C',
    ],
    harmony: [
      ...parentParts.harmony.slice(0, 8),
      comp(Abmaj7), comp('Bb3+D4+F4'), comp('C4+E4+G4'), comp('D4+F#4+A4', 'D4+E4+A4'),
      comp(F), comp(G), comp(AbTop, BbTop), comp(CTop),
    ],
    bass: [
      ...repeat(octaves('C2'), 8),
      octaves('Ab2'), octaves('G2'), octaves('A2'), octavePair('B1', 'E2'),
      octaves('F2'), octaves('G2'), octavePair('Ab1', 'Bb1'), octaves('C2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: 'C の保続', from: 1, to: 8, intention: '低音を C に留め、上で Fmaj7→G→Em7→Am7 を動かす。' },
      { label: '低音が動き出す', from: 9, to: 9, intention: 'Abmaj7 で初めて低音が C を離れる。' },
      { label: '短9の平行移動', from: 10, to: 12, intention: 'Gm9→Am9→Bm9 と同じ形で全音ずつ上げる。旋律は9度・9度・3度。12小節目の後半は E7sus4。' },
      { label: '終盤', from: 13, to: 16, intention: 'E から半音上の Fmaj7 へ入り、G→Ab→Bb→C で締める。' },
    ],
    moments: [
      { bar: 2, beat: 0, pitches: ['C2', 'B3', 'D4', 'G4', 'D5'], intention: 'C の低音上の G' },
      { bar: 10, beat: 0, pitches: ['G2', 'Bb3', 'D4', 'F4', 'A5'], intention: 'Gm9' },
      { bar: 11, beat: 0, pitches: ['A2', 'C4', 'E4', 'G4', 'B5'], intention: '全音上の Am9（同じ形）' },
      { bar: 12, beat: 0, pitches: ['B1', 'D4', 'F#4', 'A4', 'D6'], intention: 'さらに全音上の Bm9' },
    ],
  }),

  buildVariation({
    id: 'summer-noon-ascent-rising-bass',
    title: '真昼の凱風、ふたたび — 昇る低音',
    harmonyGate: 0.75,
    bassGate: 0.8,
    description:
      '低音を旋律と同じ向きに昇らせる案。前半は Dm9→Em7→Fmaj9→G6 と1音ずつ上がる。Abmaj7 からは Ab→A→B→C# と低音が昇り（F/A→G/B→A/C#）、そのまま Dm9 に届いてから G→Ab→Bb→C で締める。終盤の最初の和音だけ Fmaj7 から Dm9 に替わる',
    chords: [
      'Dm9', 'Em7', 'Fmaj9', 'G6',
      'Dm9', 'Em7', 'Am7', 'Gsus4 G',
      'Abmaj7', 'F/A', 'G/B', 'A/C#',
      'Dm9', 'G', 'Ab Bb', 'C',
    ],
    harmony: [
      comp('F3+C4+E4'), comp(Em7), comp(F), comp('B3+D4+E4'),
      comp('F3+C4+E4'), comp(Em7), comp(Am7), comp('G3+C4+D4', 'G3+B3+D4'),
      comp(Abmaj7), comp('C4+F4+A4'), comp('D4+G4+B4'), comp('E4+A4'),
      comp('F3+C4+E4'), comp(G), comp(AbTop, BbTop), comp(CTop),
    ],
    bass: [
      push('D2'), push('E2'), push('F2'), push('G2'),
      push('D2'), push('E2'), push('A1'), push('G1'),
      push('Ab1'), push('A1'), push('B1'), push('C#2'),
      push('D2'), push('G2'), AB_BB_BASS, push('C2'),
    ],
    drums: repeat(FOUR_ON_FLOOR, 16),
    phrases: [
      { label: '1音ずつ上がる前半', from: 1, to: 4, intention: 'Dm9→Em7→Fmaj9→G6。低音が D–E–F–G と昇る。' },
      { label: '半終止', from: 5, to: 8, intention: 'Am7 から Gsus4→G で止め、低音 G→Ab で後半へ入る。' },
      { label: '昇る低音', from: 9, to: 12, intention: 'Ab→A→B→C# と低音が昇る。A/C# では旋律の D6 が C#6 へ解決する。' },
      { label: '到着と締め', from: 13, to: 16, intention: '低音が D に届き、G→Ab→Bb→C で締める。' },
    ],
    moments: [
      { bar: 1, beat: 0, pitches: ['D2', 'F3', 'C4', 'E4', 'E5'], intention: 'Dm9' },
      { bar: 10, beat: 0, pitches: ['A1', 'C4', 'F4', 'A4', 'A5'], intention: 'F/A' },
      { bar: 11, beat: 0, pitches: ['B1', 'D4', 'G4', 'B4', 'B5'], intention: 'G/B' },
      { bar: 12, beat: 1.5, pitches: ['C#2', 'E4', 'A4', 'C#6'], intention: 'A/C#' },
    ],
  }),

  buildVariation({
    id: 'summer-noon-ascent-add9-tresillo',
    title: '真昼の凱風、ふたたび — 入道雲の刻み',
    harmonyGate: 0.9,
    bassGate: 0.85,
    description:
      '「入道雲の階段」の 3+3+2 の刻みと、3度・5度・9度を重ねた add9 の形を持ち込んだ案。長7の和音をやめて響きを軽くする。Ab(add9) の後は F(add9)→G(add9)→D(add9) と同じ形のまま動き、終盤の Ab→Bb→C も add9 でそろえる',
    chords: [
      'F(add9)', 'G(add9)', 'Em7', 'Am7',
      'F(add9)', 'G(add9)', 'C(add9)', 'C',
      'Ab(add9)', 'F(add9)', 'G(add9)', 'D(add9)',
      'F(add9)', 'G(add9)', 'Ab(add9) Bb(add9)', 'C(add9)',
    ],
    harmony: [
      tresillo('A3+C4+G4'), tresillo('B3+D4+A4'), tresillo(Em7), tresillo(Am7),
      tresillo('A3+C4+G4'), tresillo('B3+D4+A4'), tresillo('E4+G4+D5'), tresillo(C),
      tresillo('C4+Eb4+Bb4'), tresillo('A3+C4+G4'), tresillo('B3+D4+A4'), tresillo('F#4+A4+E5'),
      tresillo('A3+C4+G4'), tresillo('B3+D4+A4'), 'C4+Eb4+Bb4:1.5 C4+Eb4+Bb4:.5 D4+F4+C5:1 D4+F4+C5:1', tresillo('E4+G4+D5'),
    ],
    bass: [
      tresilloBass('F2', 'C3'), tresilloBass('G2', 'D3'), tresilloBass('E2', 'B2'), tresilloBass('A1', 'E2'),
      tresilloBass('F2', 'C3'), tresilloBass('G2', 'D3'), tresilloBass('C2', 'G2'), tresilloBass('C2', 'G2'),
      tresilloBass('Ab1', 'Eb2'), tresilloBass('F2', 'C3'), tresilloBass('G2', 'D3'), tresilloBass('D2', 'A2'),
      tresilloBass('F2', 'C3'), tresilloBass('G2', 'D3'), 'Ab1:1.5 Ab1:.5 Bb1:1 Bb1:1', tresilloBass('C2', 'G2'),
    ],
    drums: repeat(TRESILLO_KIT, 16),
    phrases: [
      { label: '3+3+2 の前半', from: 1, to: 8, intention: '進行は派生元に近いまま、刻みを 3+3+2 に、F と G を add9 の形にする。' },
      { label: 'add9 の移動', from: 9, to: 12, intention: 'Ab(add9)→F(add9)→G(add9)→D(add9)。旋律は順に長7度・3度・3度・根音。' },
      { label: '終盤', from: 13, to: 16, intention: 'F→G→Ab→Bb→C を add9 の同じ形でそろえる。' },
    ],
    moments: [
      { bar: 1, beat: 0, pitches: ['F2', 'A3', 'C4', 'G4', 'E5'], intention: 'F(add9) と旋律の E5' },
      { bar: 9, beat: 0, pitches: ['Ab1', 'C4', 'Eb4', 'Bb4', 'G5'], intention: 'Ab(add9)' },
      { bar: 12, beat: 0, pitches: ['D2', 'F#4', 'A4', 'E5', 'D6'], intention: 'D(add9) と頂点の D6' },
      { bar: 15, beat: 2, pitches: ['Bb1', 'D4', 'F4', 'C5', 'D6'], intention: '終盤の Bb(add9)' },
    ],
  }),
]
