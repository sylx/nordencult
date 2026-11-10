import type { Song } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'
import { thirdThemes } from './themes-003.ts'

const parent = thirdThemes.find((study) => study.song.id === 'borderline-scouts')!
const parentMelody = parent.song.sections[0].parts.melody

interface HarmonyDraft {
  id: string
  title: string
  description: string
  harmonyGate: number
  bassGate: number
  chords: string[]
  harmony: string[]
  bass: string[]
  counter?: string[]
  fill?: string[]
  phrases: CompositionStudy['phrases']
  moments: CompositionStudy['moments']
}

function buildVariation(draft: HarmonyDraft): CompositionStudy {
  const parts: Song['parts'] = [
    { id: 'melody', label: '主題', instrument: 'yamaha-grand-piano', volume: 0.68, pan: 0.04, velocity: 84, gate: 0.96 },
    { id: 'harmony', label: '和声・伴奏', instrument: 'yamaha-grand-piano', volume: 0.42, pan: 0.14, velocity: 58, gate: draft.harmonyGate },
    { id: 'bass', label: '低音', instrument: 'yamaha-grand-piano', volume: 0.52, pan: -0.08, velocity: 68, gate: draft.bassGate },
  ]
  const sectionParts: Record<string, string[]> = {
    melody: [...parentMelody],
    harmony: draft.harmony,
    bass: draft.bass,
  }
  if (draft.counter) {
    parts.push({ id: 'counter', label: '内声・対旋律', instrument: 'yamaha-grand-piano', volume: 0.44, pan: -0.14, velocity: 60, gate: 1.05 })
    sectionParts.counter = draft.counter
  }
  if (draft.fill) {
    parts.push({ id: 'fill', label: '合いの手・内声', instrument: 'yamaha-grand-piano', volume: 0.4, pan: -0.14, velocity: 56, gate: 1.1 })
    sectionParts.fill = draft.fill
  }
  const song: Song = {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    tempo: parent.song.tempo,
    timeSignature: parent.song.timeSignature,
    intro: [],
    loop: ['theme'],
    parts,
    sections: [
      {
        id: 'theme',
        label: draft.title,
        chords: draft.chords,
        parts: sectionParts,
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

export const borderlineScoutsHarmonies: CompositionStudy[] = [
  buildVariation({
    id: 'borderline-scouts-monolith',
    title: '国境線の斥候 — 霧の石碑',
    harmonyGate: 1.38,
    bassGate: 1.25,
    description:
      '「風蝕の石碑」の豊かな分散和音と色彩転調を「国境線の斥候」へ移した案。前半は柔らかな9th・#11アルペジオで包み、後半は Fmaj9(#11)→Gm9→Ebmaj9(#11) から12小節目に唐突で明るい Emaj9 へ抜け、終盤の Fm6 で陰って戻る',
    chords: [
      'Am9', 'Dm9 Bbmaj7(#11)', 'Fmaj9(#11) Em9/G', 'D9/F# Fmaj7',
      'Fmaj9', 'Dm9 G13', 'Fmaj9(#11) E7(b9)', 'E7sus4 E7',
      'Fmaj9(#11)', 'Gm9', 'Ebmaj9(#11)', 'Emaj9',
      'Am9', 'Bbmaj9(#11)', 'Dm9 Fm6', 'E7sus4 E7(b9)',
    ],
    harmony: [
      'r:.5 E3:.5 B3:.5 C4:.5 G4:1 B3:1',
      'r:.5 F3:.5 C4:.5 E4:.5 D4:1 A3:1',
      'r:.5 A3:.5 B3:.5 E4:.5 F#4:1 B3:1',
      'r:.5 A3:.5 C4:.5 E4:.5 A3:1 E4:1',
      'r:.5 A3:.5 E4:.5 G4:.5 C4:1 A3:1',
      'r:.5 F3:.5 C4:.5 E4:.5 F3:1 B3:1',
      'r:.5 A3:.5 B3:.5 E4:.5 G#3:1 F4:1',
      'r:.5 A3:.5 D4:.5 G#3:.5 D4:1 r:1',
      'r:.5 A3:.5 E4:.5 G4:.5 B3:1 E4:1',
      'r:.5 Bb3:.5 D4:.5 F4:.5 A3:1 D4:1',
      'r:.5 G3:.5 D4:.5 F4:.5 A3:1 D4:1',
      'r:.5 G#3:.5 D#4:.5 F#4:.5 B3:1 r:1',
      'r:.5 E3:.5 B3:.5 C4:.5 D4:1 B3:1',
      'r:.5 F3:.5 A3:.5 C4:.5 E4:1 A3:1',
      'r:.5 F3:.5 C4:.5 E4:.5 Ab3:1 D4:1',
      'r:.5 A3:.5 D4:.5 G#3:.5 F4:1 r:1',
    ],
    bass: [
      'A2:2 E2:2',
      'D2:2 Bb2:2',
      'F2:2 G2:2',
      'F#2:2 F2:2',
      'F2:2 C3:2',
      'D2:2 G2:2',
      'F2:2 E2:2',
      'E2:2 B2:1 r:1',
      'F2:2 C3:2',
      'G2:2 D3:2',
      'Eb2:2 Bb2:2',
      'E2:2 B2:1 r:1',
      'A2:2 E2:2',
      'Bb2:2 F2:2',
      'D2:2 F2:2',
      'E2:2 B2:1 r:1',
    ],
    fill: [
      '', '', '', '',
      '', '', '', 'r:2.5 v52 E4:.5 F4:.5 G4:.5',
      '', '', '', 'r:2.5 v52 G#4:.5 A4:.5 B4:.5',
      '', '', '', 'r:2.5 v52 G#3:.5 B3:.5 D4:.5',
    ],
    phrases: [
      { label: '石碑の霧', from: 1, to: 4, intention: '乾いた刻みを廃し、Dm9→Bbmaj7(#11) や Fmaj9(#11) の分散和音で空間を広げる。' },
      { label: '半音の余韻', from: 5, to: 8, intention: 'Fmaj9(#11) から E7(b9) へ半音で降りて緊張を置く。' },
      { label: '明転の衝撃', from: 9, to: 12, intention: 'Fmaj9(#11)→Gm9→Ebmaj9(#11) を経て、12小節目の E5 を明るい Emaj9 で受け止める。' },
      { label: '陰りの帰着', from: 13, to: 16, intention: 'Bbmaj9(#11) と同主短調の Fm6 を通り、E7(b9) から頭を呼び戻す。' },
    ],
    moments: [
      { bar: 3, beat: 1, pitches: ['F2', 'B3', 'A5'], intention: 'Fmaj9(#11) の #11（B3）' },
      { bar: 11, beat: 2, pitches: ['Bb2', 'A3', 'A5'], intention: 'Ebmaj9(#11) の #11（A）' },
      { bar: 12, beat: 1.5, pitches: ['E2', 'F#4', 'E5'], intention: '唐突な明転 Emaj9 の 9度 F#4 と主音 E5' },
      { bar: 15, beat: 2, pitches: ['F2', 'Ab3', 'F5'], intention: 'Dm9 から半音陰る Fm6 の短3度 Ab3' },
    ],
  }),

  buildVariation({
    id: 'borderline-scouts-sparse',
    title: '国境線の斥候 — 透徹の五度',
    harmonyGate: 0.62,
    bassGate: 0.72,
    description:
      '装飾とテンションを極限まで削ぎ、空虚5度と乾いた断音だけで輪郭を際立たせる案。冷たい盤面上で主旋律の線が剥き出しになり、終止も導音や7度を抜いた E5 の余白で止める',
    chords: [
      'Am5', 'Dm F5', 'Am5 G5', 'D5/F#',
      'F5', 'Dm G5', 'Am/C F5', 'E5',
      'F5', 'Eb5', 'Dm G5', 'C5 E5/B',
      'Am5 G5', 'F5 Dm', 'Bb5', 'E5',
    ],
    harmony: [
      'E3+A3:1 r:1 E3:1 r:1',
      'F3+A3:1 r:1 A3+C4:1 r:1',
      'E3+A3:1 r:1 D3+G3:1 r:1',
      'A3+D4:1 r:1 A3:1 r:1',
      'C4:1 r:1 A3+C4:1 r:1',
      'F3+A3:1 r:1 D3+G3:1 r:1',
      'E3+A3:1 r:1 C4:1 r:1',
      'B3:1.5 B3:1.5 r:1',
      'C4:1 r:1 C4:1 r:1',
      'Bb3:1 r:1 Bb3:1 r:1',
      'A3:1 r:1 G3+B3:1 r:1',
      'G3+C4:1.5 G#3+B3:1.5 r:1',
      'E3+A3:1 r:1 D3+G3:1 r:1',
      'C4:1 r:1 A3:1 r:1',
      'F3+Bb3:1 r:1 F3:1 r:1',
      'B3:2 r:2',
    ],
    bass: [
      'A2:1 r:1 E2:1 r:1',
      'D2:1 r:1 F2:1 r:1',
      'A2:1 r:1 G2:1 r:1',
      'F#2:1 r:1 D2:1 r:1',
      'F2:1 r:1 C3:1 r:1',
      'D2:1 r:1 G2:1 r:1',
      'C3:1 r:1 F2:1 r:1',
      'E2:1.5 B2:1.5 r:1',
      'F2:1 r:1 C3:1 r:1',
      'Eb2:1 r:1 Bb2:1 r:1',
      'D2:1 r:1 G2:1 r:1',
      'C3:1.5 B2:1.5 r:1',
      'A2:1 r:1 G2:1 r:1',
      'F2:1 r:1 D2:1 r:1',
      'Bb2:1 r:1 F2:1 r:1',
      'E2:2 r:2',
    ],
    phrases: [
      { label: '簡素な骨格', from: 1, to: 4, intention: '9度や7度を抜き、素の5度音程だけで斥候の輪郭を浮かび上がらせる。' },
      { label: '無音の折り返し', from: 5, to: 8, intention: '2拍・4拍の休符を活かして隙間を広げ、空虚5度 E5 で息を継ぐ。' },
      { label: '純5度の転位', from: 9, to: 12, intention: 'F5→Eb5 の裸の5度平行移動で、余計な濁りのない色彩転換を作る。' },
      { label: '研ぎ澄ました終止', from: 13, to: 16, intention: 'Bb5 を一瞬踏んだあと、一切の装飾を排した E2+B3 の5度で閉じる。' },
    ],
    moments: [
      { bar: 1, beat: 0, pitches: ['A2', 'E3', 'A3', 'E5'], intention: '装飾を排した素の5度 A–E による提示' },
      { bar: 8, beat: 0, pitches: ['E2', 'B3', 'B4'], intention: '3度を抜いた空虚5度 E–B の折り返し' },
      { bar: 10, beat: 0, pitches: ['Eb2', 'Bb3', 'G5'], intention: '純5度 Eb–Bb だけの平行移動' },
      { bar: 16, beat: 0, pitches: ['E2', 'B3', 'B4'], intention: '和音を完全に絞った空虚5度での終止' },
    ],
  }),

  buildVariation({
    id: 'borderline-scouts-lament',
    title: '国境線の斥候 — 下降する低音',
    harmonyGate: 0.96,
    bassGate: 1.05,
    description:
      '全16小節を貫く階段状の下降ベース（前半 A→G→F→E→D→C→B→A→E、後半 F→Eb→D→C#→C→B→Bb→E）と対旋律で組み替えた案。12小節目に C#m7 を踏み、13小節目は C2 低音上で旋律の F#5 が #11 として鳴る',
    chords: [
      'Am', 'G9sus4 Fmaj7', 'Am/E', 'Dm9',
      'Cmaj7 F/C', 'G/B', 'Fmaj7/A Dm7/F', 'E7sus4 E7',
      'Fmaj9(#11)', 'Ebmaj9(#11)', 'Dm9', 'C#m7',
      'Cmaj9(#11)', 'Dm/B', 'Bbmaj9(#11)', 'E7sus4 E7',
    ],
    harmony: [
      'E3+A3:1.5 r:.5 E3+C4:1 E3+B3:1',
      'F3+D4:1 r:1 E3+C4:1 r:1',
      'A3+C4:1.5 r:.5 A3+E4:1 G3+E4:1',
      'A3+C4:1.5 r:.5 A3+C4:1 r:1',
      'E3+B3:1.5 r:.5 F3+A3:1 A3+C4:1',
      'G3+D4:1.5 r:.5 G3+D4:1 G3+D4:1',
      'E3+C4:1.5 r:.5 A3+C4:1 A3+D4:1',
      'D4:1.5 D4:1.5 r:1',
      'A3+C4:1.5 r:.5 B3+E4:1 B3+D4:1',
      'G3+Bb3:1.5 r:.5 A3+D4:1 A3+C4:1',
      'F3+A3:1.5 r:.5 A3+C4:1 F3+B3:1',
      'G#3+B3:1.5 G#3+B3:1.5 r:1',
      'E3+B3:1.5 r:.5 G3+B3:1 G3+D4:1',
      'F3+A3:1.5 r:.5 F3+B3:1 F3+A3:1',
      'F3+A3:1.5 r:.5 F3+A3:1 F3+A3:1',
      'D4:1.5 D4:1.5 r:1',
    ],
    counter: [
      'r:2 C4:1 B3:1',
      'B3:1 C4:1 A3:2',
      'C4:2 D4:2',
      'F4:1 E4:1 C4:2',
      'G3:2 A3:2',
      'G3:2 G3:2',
      'E3:2 A3:2',
      'A3:1.5 G#3:1.5 r:1',
      'E4:2 D4:2',
      'D4:2 C4:2',
      'C4:2 B3:2',
      'G#3:2 F#3:1 r:1',
      'G3:2 A3:2',
      'F3:2 A3:2',
      'D4:2 C4:2',
      'A3:1.5 G#3:1.5 r:1',
    ],
    bass: [
      'A2:2 A2:2',
      'G2:2 F2:2',
      'E2:2 E2:2',
      'D2:2 D2:2',
      'C2:2 C2:2',
      'B1:2 B1:2',
      'A1:2 F2:2',
      'E2:2 E2:1 r:1',
      'F2:2 F2:2',
      'Eb2:2 Eb2:2',
      'D2:2 D2:2',
      'C#2:2 C#2:1 r:1',
      'C2:2 C2:2',
      'B1:2 B1:2',
      'Bb1:2 Bb1:2',
      'E2:2 E2:1 r:1',
    ],
    phrases: [
      { label: 'ラメントの導入', from: 1, to: 4, intention: '低音を A2→G2→F2→E2→D2 へと順次下降させ、主旋律に重厚な引力を作る。' },
      { label: '低音の継続下降', from: 5, to: 8, intention: 'C2→B1→A1→F2→E2 と途切れなく降りて E7 へ到達する。' },
      { label: '半音下降の転調', from: 9, to: 12, intention: 'F2→Eb2→D2 から12小節目に C#2（C#m7）へ滑り落ち、和声の景色を反転させる。' },
      { label: '最終の半音階', from: 13, to: 16, intention: 'C2（Cmaj9#11）→B1（Dm/B）→Bb1（Bbmaj9#11）と半音ずつ降りて E7 へ戻る。' },
    ],
    moments: [
      { bar: 2, beat: 2, pitches: ['F2', 'A3', 'E5'], intention: 'A–G–F と下りるラメント低音と Fmaj7 の長7度' },
      { bar: 12, beat: 0, pitches: ['C#2', 'G#3', 'B3', 'E5'], intention: 'F–Eb–D–C# の半音低音下降が導く C#m7' },
      { bar: 13, beat: 2, pitches: ['C2', 'G3', 'B3', 'F#5'], intention: 'C2 低音の上で旋律の F#5 が #11 として輝く Cmaj9(#11)' },
      { bar: 15, beat: 2, pitches: ['Bb1', 'A3', 'C4', 'E5'], intention: 'B1→Bb1 の下降先 Bbmaj9(#11)（#11 の E5）' },
    ],
  }),

  buildVariation({
    id: 'borderline-scouts-major-shift',
    title: '国境線の斥候 — 陽光の転回',
    harmonyGate: 1.0,
    bassGate: 1.0,
    description:
      '同じ旋律を長調側の和声（Fmaj9→G13→Cmaj7）で読み替え、着地点を変える案。冒頭から視界が開け、終止も Em7 ではなく長調の Cmaj9（旋律の B4 を長7度として響かせる）に明るく着地する',
    chords: [
      'Fmaj9', 'G13', 'Cmaj7 Em7/B', 'Am9',
      'Cmaj9', 'G9sus4 G7', 'Fmaj9(#11)', 'G13sus4 G6',
      'Am9 G6', 'Bbmaj9', 'Gm9 C13', 'Fmaj9 G/F',
      'D9/F#', 'Dm9/F Bbmaj7(#11)', 'G13sus4', 'Cmaj9',
    ],
    harmony: [
      'A3+E4:1 r:.5 A3+E4:.5 G3+C4:1 A3+E4:1',
      'F3+B3:1 r:.5 F3+B3:.5 G3+D4:1 r:1',
      'G3+E4:1 r:.5 G3+E4:.5 G3+D4:1 G3+E4:1',
      'G3+C4:1 r:.5 G3+B3:.5 G3+C4:1 r:1',
      'G3+E4:1 r:.5 G3+D4:.5 G3+E4:1 B3+D4:1',
      'F3+C4:1 B3+D4:1 F3+B3:1 G3+D4:1',
      'A3+E4:1 r:.5 A3+B3:.5 A3+E4:1 G3+C4:1',
      'F3+C4:1.5 G3+E4:1.5 r:1',
      'G3+C4:1 r:.5 G3+E4:.5 B3+D4:1 G3+D4:1',
      'F3+D4:1 r:.5 F3+C4:.5 F3+D4:1 A3+C4:1',
      'F3+Bb3:1 r:.5 F3+A3:.5 E3+Bb3:1 G3+Bb3:1',
      'A3+E4:1.5 G3+D4:1.5 r:1',
      'A3+C4:1 r:.5 A3+E4:.5 A3+C4:1 A3+E4:1',
      'A3+C4:1 r:.5 A3+E4:.5 A3+D4:1 F3+A3:1',
      'F3+A3:1 r:.5 F3+B3:.5 F3+C4:1 G3+D4:1',
      'G3+E4:1.5 D4+E4:1.5 r:1',
    ],
    bass: [
      'F2:1.5 C3:.5 F2:1 C3:1',
      'G2:1.5 D3:.5 G2:1 r:1',
      'C3:1.5 G2:.5 B2:1 E2:1',
      'A2:1.5 E2:.5 A2:1 r:1',
      'C3:1.5 G2:.5 C3:1 G2:1',
      'G2:1.5 D3:.5 G2:1 D3:1',
      'F2:1.5 C3:.5 F2:1 C3:1',
      'G2:1.5 D3:1.5 r:1',
      'A2:1.5 E2:.5 G2:1 D3:1',
      'Bb2:1.5 F2:.5 Bb2:1 F2:1',
      'G2:1.5 D3:.5 C3:1 G2:1',
      'F2:1.5 F2:1.5 r:1',
      'F#2:1.5 D3:.5 F#2:1 D3:1',
      'F2:1.5 C3:.5 Bb2:1 F2:1',
      'G2:1.5 D3:.5 G2:1 D3:1',
      'C2:1.5 G2:1.5 r:1',
    ],
    fill: [
      '', '', '', 'r:2.5 v52 G3:.5 A3:.5 B3:.5',
      '', '', '', 'r:2.5 v52 D4:.5 E4:.5 G4:.5',
      '', '', '', 'r:2.5 v52 G3:.5 A3:.5 B3:.5',
      '', '', '', 'r:2.5 v52 G3:.5 A3:.5 C4:.5',
    ],
    phrases: [
      { label: '明朝の再解釈', from: 1, to: 4, intention: '冒頭の E5–A5–G5 を Fmaj9 の長7度・9度として受け、IV–V–I（F–G–C）の明快な光へ転じる。' },
      { label: '長調の折り返し', from: 5, to: 8, intention: 'Fmaj9(#11) を経て G6 へ着地し、前半から一貫して開けた景色を保つ。' },
      { label: '陽光の転調', from: 9, to: 12, intention: 'Bbmaj9→Gm9–C13→Fmaj9 と晴れやかな II–V 進行で後半を駆動する。' },
      { label: '長7度の地平', from: 13, to: 16, intention: 'D9/F#→Dm9/F→Bbmaj7(#11) の陰影を一度通ったあと、Cmaj9 の長7度（B4）へ着地を変える。' },
    ],
    moments: [
      { bar: 1, beat: 0, pitches: ['F2', 'A3', 'E4', 'E5'], intention: '冒頭主題を明るい Fmaj9 で受け止める' },
      { bar: 8, beat: 1.5, pitches: ['D3', 'G3', 'E4', 'B4'], intention: 'G6 による長調の折り返し' },
      { bar: 10, beat: 2, pitches: ['Bb2', 'F3', 'D4', 'A5'], intention: 'Bbmaj9 の長7度 A5 と明るい9度' },
      { bar: 16, beat: 0, pitches: ['C2', 'G3', 'E4', 'B4'], intention: '終止を Em7 から Cmaj9（B4 を長7度）へ着地変更' },
    ],
  }),

  buildVariation({
    id: 'borderline-scouts-pedal-drive',
    title: '国境線の斥候 — 保続の鼓動',
    harmonyGate: 0.78,
    bassGate: 0.86,
    description:
      'A2 と E2 の保続低音の上で内声の8分刻みだけが和声を変える緊張感重視の案。前半は A2 上で Am9→G(add9)/A→Fmaj7/A→D9/A と移り、終盤は再び A2 ペダル上で D9/A→Dm6/A→Bbmaj7(#11)/A と擦れながら E7(b9) へ解放する',
    chords: [
      'Am9', 'G(add9)/A', 'Fmaj7/A', 'D9/A',
      'Fmaj7/E', 'Dm9/E', 'Cmaj7/E', 'Esus4 E7(b9)',
      'Fmaj9(#11)', 'Ebmaj9(#11)', 'Dm9 G13', 'Cmaj9 B7/D#',
      'D9/A', 'Dm6/A', 'Bbmaj7(#11)/A', 'Esus4 E7(b9)',
    ],
    harmony: [
      'E3:.5 B3 C4 B3 E3 B3 C4 B3',
      'D3:.5 A3 B3 A3 D3+B3:.5 A3 B3 A3',
      'E3:.5 A3 C4 A3 E3 A3 C4 A3',
      'F#3:.5 A3 C4 A3 F#3 A3 C4 A3',
      'A3:.5 C4 E4 C4 A3 C4 E4 C4',
      'A3:.5 D4 F4 D4 G3 B3 D4 B3',
      'G3:.5 C4 E4 C4 G3 B3 E4 B3',
      'A3+D4:1.5 G#3+F4:1.5 r:1',
      'A3:.5 E4 G4 E4 B3 E4 G4 E4',
      'G3:.5 D4 F4 D4 A3 D4 F4 D4',
      'F3:.5 A3 C4 A3 F3 B3 E4 B3',
      'G3:.5 B3 D4 B3 F#3 A3 D#4 A3',
      'F#3:.5 A3 C4 A3 F#3 A3 C4 A3',
      'F3:.5 A3 D4 A3 F3 A3 D4 A3',
      'F3:.5 Bb3 D4 Bb3 F3 Bb3 D4 Bb3',
      'A3+D4:1.5 G#3+F4:1.5 r:1',
    ],
    bass: [
      'A2:1.5 A2:.5 A2:1 A2:1',
      'A2:1.5 A2:.5 A2:1 A2:1',
      'A2:1.5 A2:.5 A2:1 A2:1',
      'A2:1.5 A2:.5 A2:1 r:1',
      'E2:1.5 E2:.5 E2:1 E2:1',
      'E2:1.5 E2:.5 E2:1 E2:1',
      'E2:1.5 E2:.5 E2:1 E2:1',
      'E2:1.5 B2:1.5 r:1',
      'F2:1.5 C3:.5 F2:1 C3:1',
      'Eb2:1.5 Bb2:.5 Eb2:1 Bb2:1',
      'D2:1.5 A2:.5 G2:1 D3:1',
      'C3:1.5 G2:.5 D#2:1 B2:1',
      'A2:1.5 A2:.5 A2:1 A2:1',
      'A2:1.5 A2:.5 A2:1 A2:1',
      'A2:1.5 A2:.5 A2:1 A2:1',
      'E2:1.5 B2:1.5 r:1',
    ],
    phrases: [
      { label: 'A ペダルの緊迫', from: 1, to: 4, intention: '動かぬ A2 の保続低音の上で、8分刻みだけが Am9→G/A→Fmaj7/A→D9/A へと移る。' },
      { label: 'E ペダルの圧迫', from: 5, to: 8, intention: '低音を E2 へ落とし、Fmaj7/E→Dm9/E→Cmaj7/E と積み上げて E7(b9) に締める。' },
      { label: '移動と導音の転換', from: 9, to: 12, intention: '原案の平行移動から12小節目の B7/D# へ踏み込み、次の A ペダルへ繋ぐ。' },
      { label: '擦過と解放', from: 13, to: 16, intention: 'D9/A→Dm6/A→Bbmaj7(#11)/A と A2 上で半音ずつ陰り、E7(b9) で解き放つ。' },
    ],
    moments: [
      { bar: 2, beat: 2, pitches: ['A2', 'D3', 'B3', 'E5'], intention: 'A2 保続低音上の G(add9)/A' },
      { bar: 5, beat: 2, pitches: ['E2', 'E4', 'G5'], intention: 'E2 保続低音上の Fmaj7/E' },
      { bar: 14, beat: 1, pitches: ['A2', 'D4', 'F5'], intention: 'D9/A から Dm6/A へ陰る A2 保続上の上声変化' },
      { bar: 15, beat: 2.5, pitches: ['A2', 'Bb3', 'E5'], intention: 'A2 保続低音の上で鋭く擦れる Bbmaj7(#11)/A' },
    ],
  }),
]
