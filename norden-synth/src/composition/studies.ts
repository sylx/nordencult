import type { Song } from '../songs/song.ts'
import type { CompositionStudy } from './study.ts'
import { secondThemes } from './themes-002.ts'
import { thirdThemes } from './themes-003.ts'
import { fourthThemes } from './themes-004.ts'
import { fifthThemes } from './themes-005.ts'
import { borderlineScoutsHarmonies } from './borderline-scouts-harmony-001.ts'
import { borderlineScoutsOrchestrated } from './borderline-scouts-orchestration-001.ts'
import type { CompositionBatch } from './workflow.ts'

// 各案を旋律・和声・低音の組として書く。新しい組は BATCHES の末尾に追加する。
function theme(spec: {
  id: string; title: string; description: string; tempo: number; meter: readonly [number, number]
  melody: string[]; chords: string[]; bass: string[]; voicings: string[]; texture: 'flow' | 'dance' | 'broad'
}): CompositionStudy {
  const beats = spec.meter[0] * 4 / spec.meter[1]
  const harmony = spec.voicings.map((v) => {
    const [a, b, c, d = b] = v.split(' ')
    if (spec.texture === 'broad') return `${v.split(' ').join('+')}:${beats - 1} r:1`
    if (spec.meter[1] === 8) {
      const notes = spec.meter[0] === 7 ? [a, b, c, b, d, b, c] : [a, b, c, d, c, b]
      return notes.map((n) => `${n}:.5`).join(' ')
    }
    if (spec.texture === 'dance') return `r:.5 ${a}+${b}+${c}:1 ${d}:.5 ${a}+${c}:1`
    return `${a}:.5 ${b}:.5 ${c}:1 ${b}:.5 ${d}:.5 ${c}:1`
  })
  const song: Song = {
    id: spec.id, title: spec.title, description: spec.description, tempo: spec.tempo,
    timeSignature: spec.meter, intro: [], loop: ['theme'],
    parts: [
      { id: 'melody', label: '主題', instrument: 'yamaha-grand-piano', volume: 0.65, pan: 0, velocity: 78, gate: 0.96 },
      { id: 'harmony', label: '和声', instrument: 'yamaha-grand-piano', volume: 0.36, pan: 0, velocity: 58, gate: 1.05 },
      { id: 'bass', label: '低音', instrument: 'yamaha-grand-piano', volume: 0.4, pan: 0, velocity: 64, gate: 0.95 },
    ],
    sections: [{
      id: 'theme', label: spec.title, chords: spec.chords,
      parts: { melody: spec.melody, harmony, bass: spec.bass.map((n) => `${n}:${beats}`) },
    }],
  }
  return {
    song, melodyPart: 'melody', hypothesis: spec.description,
    phrases: [
      { label: '呼びかけ', from: 1, to: 2, intention: '冒頭の音型と響きを提示する。' },
      { label: '応答', from: 3, to: 4, intention: '同じ曲の言葉として応答をつなぐ。' },
      { label: '展開', from: 5, to: 6, intention: '旋律と和声を一緒に動かす。' },
      { label: '帰路', from: 7, to: 8, intention: '次の一周につながる句を作る。' },
    ],
    moments: [],
  }
}

const firstThemes = [
  theme({
    id: 'snowlight-return', title: '雪明かりの帰路', tempo: 88, meter: [4, 4], texture: 'flow',
    description: '短い呼びかけを長く受け止める、静かな短調の主題。下降する低音に乗せて上を向き、後半は長調の明かりに触れる。',
    melody: [
      'r:.5 A4:.5 D5:1.5 E5:.5 F5:1',
      'E5:1 C5:.5 A4:.5 D5:1 r:1',
      'r:.5 A4:.5 D5:1.5 F5:.5 A5:1',
      'G5:1 E5:1 C#5:1 r:1',
      'F5:1.5 E5:.5 D5:.5 C5:.5 A4:1',
      'B4:.5 D5:.5 G5:2 F5:.5 E5:.5',
      'F5:1 E5:.5 D5:.5 C5:1 A4:1',
      'Bb4:1 G4:.5 A4:.5 C#5:1 r:1',
    ],
    chords: ['Dm(add9)', 'Bbmaj9(#11)', 'Gm9', 'A7', 'Fmaj7/A', 'G9/B', 'Bbmaj9', 'A7(b9)'],
    bass: ['D3', 'Bb2', 'G2', 'A2', 'A2', 'B2', 'Bb2', 'A2'],
    voicings: ['F3 A3 E4 D4', 'F3 A3 C4 E4', 'Bb3 D4 F4 A4', 'G3 C#4 E4 A3', 'F3 A3 C4 E4', 'F3 A3 D4 G3', 'D3 F3 A3 C4', 'G3 Bb3 C#4 E4'],
  }),
  theme({
    id: 'harbor-wind', title: '風を待つ港', tempo: 104, meter: [6, 8], texture: 'flow',
    description: '揺れる6拍子。呼びかけの上行と、少し遅れて下りる応答。終盤の短調の響きが、明るい港に小さな翳りを落とす。',
    melody: [
      'D5:.5 B4:.5 D5:.5 G5:1 E5:.5',
      'F#5:1 D5:.5 B4:1 r:.5',
      'E5:.5 B4:.5 E5:.5 G5:1 F#5:.5',
      'E5:1 C#5:.5 B4:.5 A4:1',
      'G5:1 E5:.5 D5:.5 C5:.5 E5:.5',
      'Eb5:1 D5:.5 C5:1 A4:.5',
      'B4:.5 D5:.5 G5:1 F#5:.5 E5:.5',
      'D5:1 C5:.5 A4:1 r:.5',
    ],
    chords: ['G6', 'Bm7', 'Em9', 'A9', 'Cmaj9', 'Cm6', 'G/D', 'D9'],
    bass: ['G2', 'B2', 'E3', 'A2', 'C3', 'C3', 'D3', 'D3'],
    voicings: ['G3 B3 E4 D4', 'A3 B3 D4 F#4', 'G3 B3 D4 F#4', 'G3 B3 C#4 E4', 'E3 G3 B3 D4', 'Eb3 G3 A3 C4', 'G3 B3 D4 G4', 'F#3 A3 C4 E4'],
  }),
  theme({
    id: 'brass-moon', title: '真鍮の月', tempo: 132, meter: [3, 4], texture: 'dance',
    description: '付点の足取りと半音の隣接音を持つワルツ。上がりきる前に振り返る旋律を、半音で動く内声が追いかける。',
    melody: [
      'B4:.75 C5:.25 E5:1 D#5:.5 B4:.5',
      'C5:1 A4:.5 B4:.5 F#5:1',
      'E5:.75 D#5:.25 C5:.5 B4:.5 A4:1',
      'G4:1 B4:.5 E5:.5 G5:1',
      'E5:.75 F#5:.25 G5:1 B5:.5 A5:.5',
      'G#5:1 F#5:.5 E5:.5 C#5:1',
      'E5:1 D#5:.5 C5:.5 B4:.5 A4:.5',
      'G4:1 F#4:.5 B4:.5 r:1',
    ],
    chords: ['Em(add9)', 'Am6', 'B7(b9)', 'Em/D', 'Cmaj7', 'F#9', 'B7(b9)', 'B7'],
    bass: ['E3', 'A2', 'B2', 'D3', 'C3', 'F#2', 'B2', 'B2'],
    voicings: ['G3 B3 E4 F#4', 'C4 E4 F#4 A3', 'A3 C4 D#4 F#4', 'G3 B3 E4 D4', 'E3 G3 B3 C4', 'A#3 C#4 E4 G#4', 'A3 C4 D#4 F#4', 'A3 B3 D#4 F#4'],
  }),
  theme({
    id: 'distant-lighthouse', title: '遠い灯台', tempo: 76, meter: [4, 4], texture: 'broad',
    description: '長く保つ音から始まる、余白の多い歌。後半は同じ形を半音低い色彩へ移し、帰る直前に明るさと陰りを重ねる。',
    melody: [
      'A4:2.5 C5:.5 F5:1',
      'E5:1 D5:2 r:1',
      'G5:2.5 F5:.5 E5:1',
      'C5:1 A4:2 r:1',
      'Ab4:2.5 C5:.5 Eb5:1',
      'D5:1 Db5:2 r:1',
      'C5:1 Eb5:.5 Ab5:.5 G5:1 F5:1',
      'E5:1 Db5:1 C5:1 r:1',
    ],
    chords: ['Fmaj9', 'Bbmaj9(#11)', 'C9', 'Fmaj7/A', 'Abmaj7', 'Dbmaj9', 'Abmaj7/Eb', 'C7(b9)'],
    bass: ['F2', 'Bb2', 'C3', 'A2', 'Ab2', 'Db3', 'Eb3', 'C3'],
    voicings: ['A3 C4 E4 G4', 'D3 F3 A3 C4', 'E3 G3 Bb3 D4', 'F3 A3 C4 E4', 'C4 Eb4 G4 Ab3', 'F3 Ab3 C4 Eb4', 'G3 Ab3 C4 Eb4', 'E3 G3 Bb3 Db4'],
  }),
  theme({
    id: 'cobblestone-tailwind', title: '石畳の追い風', tempo: 124, meter: [7, 8], texture: 'flow',
    description: '少し前のめりな7拍子。短い跳躍と伸ばす音を交互に置き、明るい6度と短調の終止を行き来する。',
    melody: [
      'r:.5 E5:.5 A5:.5 G5:.5 E5:.5 B4:1',
      'F#5:1 E5:.5 D5:.5 B4:.5 A4:1',
      'r:.5 G4:.5 C5:.5 E5:.5 G5:.5 D5:1',
      'F#5:1 E5:.5 D5:.5 C#5:.5 B4:1',
      'G#5:.5 F5:.5 E5:1 B4:.5 D5:1',
      'C5:.5 E5:.5 A5:1 G5:.5 E5:1',
      'F5:1 E5:.5 C5:.5 A4:.5 G4:1',
      'B4:.5 D5:.5 F5:.5 E5:.5 G#4:1 r:.5',
    ],
    chords: ['Am9', 'D9', 'Cmaj9', 'Bm9', 'E7(b9)', 'Am9', 'Fmaj9', 'E7(b9)'],
    bass: ['A2', 'D3', 'C3', 'B2', 'E3', 'A2', 'F2', 'E3'],
    voicings: ['C4 E4 G4 B3', 'F#3 A3 C4 E4', 'E3 G3 B3 D4', 'D4 F#4 A4 C#4', 'G#3 B3 D4 F4', 'C4 E4 G4 B3', 'A3 C4 E4 G3', 'G#3 B3 D4 F4'],
  }),
]

export const BATCHES: CompositionBatch[] = [
  { id: 'themes-001', title: '主題集 01 — 五つの風景', stage: 'themes', candidates: firstThemes },
  { id: 'themes-002', title: '主題集 02 — 盤上の六つの局面', stage: 'themes', candidates: secondThemes },
  { id: 'themes-003', title: '主題集 03 — 戦線と地図の六つの主題', stage: 'themes', candidates: thirdThemes },
  { id: 'themes-004', title: '主題集 04 — 斥候の輪郭と響きの六つの主題', stage: 'themes', candidates: fourthThemes },
  { id: 'themes-005', title: '主題集 05 — 軍議と旅路の六つの主題', stage: 'themes', candidates: fifthThemes },
  {
    id: 'borderline-scouts-harmony-001',
    title: '国境線の斥候 — 和声案 01',
    stage: 'harmony',
    parentId: 'borderline-scouts',
    candidates: borderlineScoutsHarmonies,
  },
  {
    id: 'borderline-scouts-orchestration-001',
    title: '国境線の斥候 — 編曲 01',
    stage: 'orchestration',
    parentId: 'borderline-scouts-pedal-drive',
    candidates: [borderlineScoutsOrchestrated],
  },
]

// 診断 CLI 用の索引。通常のゲーム用 SONGS には登録しない。
export const STUDIES: CompositionStudy[] = BATCHES.flatMap((batch) => batch.candidates)
