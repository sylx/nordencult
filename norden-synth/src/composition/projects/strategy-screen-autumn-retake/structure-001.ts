import type { Song, SongPart } from '../../../songs/song.ts'
import type { CompositionStudy } from '../../study.ts'

// 「白樺の稜線 — 主調のまま澄んだ稜線を歌い継ぐ」(autumn-retake-theme2-birch-diatonic-pure) からのフル尺の構成案 01。
// 変ロ長調 · ♩=124 · 4/4、主題の段階と同じ簡潔な編成（グランドピアノ＋アコースティックベース）。
// ユーザーの要望「最後のトニックが落ち着きすぎてる。ちょっとテンションコードなどでオシャレにしたい」を反映し、
// 終止には Bbmaj9 や 9度・3度音の豊かな余韻を配置。
// 主題を2周するだけにせず、対比部（短調の陰影、陽光の下属調、3+3+2の進軍歌）と展開、主題への感動的な戻り方を作る。

export type Voicing = readonly string[]

export const CHORDS: Record<string, { v: Voicing; bass: readonly [string, string] }> = {
  // 主調（変ロ長調）周辺
  'Bbmaj9': { v: ['D4', 'F4', 'A4', 'C5'], bass: ['Bb1', 'F2'] },
  'Bbmaj9/D': { v: ['D4', 'F4', 'A4', 'C5'], bass: ['D2', 'A1'] },
  'Bbmaj9(#11)': { v: ['D4', 'E4', 'A4', 'C5'], bass: ['Bb1', 'F2'] },
  'Bb(add9)': { v: ['D4', 'F4', 'Bb4', 'C5'], bass: ['Bb1', 'F2'] },
  'Gm7': { v: ['D4', 'F4', 'Bb4', 'D5'], bass: ['G1', 'D2'] },
  'Gm9': { v: ['D4', 'F4', 'Bb4', 'D5'], bass: ['G1', 'D2'] },
  'Ebmaj7': { v: ['D4', 'G4', 'Bb4', 'D5'], bass: ['Eb1', 'Bb1'] },
  'Ebmaj9': { v: ['Eb4', 'G4', 'Bb4', 'D5'], bass: ['Eb1', 'Bb1'] },
  'Cm7': { v: ['Eb4', 'G4', 'Bb4', 'C5'], bass: ['C2', 'G1'] },
  'Cm9': { v: ['Eb4', 'G4', 'Bb4', 'D5'], bass: ['C2', 'G2'] },
  'Dm7': { v: ['D4', 'F4', 'A4', 'C5'], bass: ['D2', 'A1'] },
  'Fsus4': { v: ['Eb4', 'F4', 'Bb4', 'C5'], bass: ['F1', 'C2'] },
  'Fsus4(add9)': { v: ['Eb4', 'F4', 'Bb4', 'C5'], bass: ['F1', 'C2'] },
  'F7sus4': { v: ['Eb4', 'F4', 'A4', 'C5'], bass: ['F1', 'C2'] },
  'F7': { v: ['Eb4', 'F4', 'A4', 'C5'], bass: ['F1', 'Eb2'] },

  // 短調対比（Gm / Cm 周辺）
  'D7sus4': { v: ['D4', 'G4', 'A4', 'C5'], bass: ['D2', 'A1'] },
  'D7': { v: ['D4', 'F#4', 'A4', 'C5'], bass: ['D2', 'A1'] },
  'Am7b5': { v: ['Eb4', 'G4', 'A4', 'C5'], bass: ['A1', 'E2'] },
  'G7sus4': { v: ['D4', 'F4', 'G4', 'C5'], bass: ['G1', 'D2'] },
  'G7': { v: ['D4', 'F4', 'G4', 'B4'], bass: ['G1', 'D2'] },
  'Dm7b5': { v: ['D4', 'F4', 'Ab4', 'C5'], bass: ['D2', 'A1'] },
  'Abmaj7': { v: ['Eb4', 'G4', 'Ab4', 'C5'], bass: ['Ab1', 'Eb2'] },
  'Abmaj9': { v: ['Eb4', 'G4', 'Ab4', 'C5'], bass: ['Ab1', 'Eb2'] },

  // 変ホ長調（下属調）周辺
  'Bb/D': { v: ['D4', 'F4', 'Bb4', 'D5'], bass: ['D2', 'Bb1'] },
  'Bb/Ab': { v: ['D4', 'F4', 'Bb4', 'D5'], bass: ['Ab1', 'Eb2'] },
  'C7sus4': { v: ['E4', 'G4', 'Bb4', 'C5'], bass: ['C2', 'G1'] },

  // ドミナント保続・展開周辺
  'Fm9/Bb': { v: ['Eb4', 'Ab4', 'C5', 'Eb5'], bass: ['Bb1', 'F2'] },
  'Gm7/Bb': { v: ['D4', 'G4', 'Bb4', 'D5'], bass: ['Bb1', 'F2'] },
  'Abmaj7/Bb': { v: ['Eb4', 'Ab4', 'C5', 'Eb5'], bass: ['Bb1', 'F2'] },
  'Bb7sus4': { v: ['D4', 'F4', 'Ab4', 'Bb4'], bass: ['Bb1', 'F2'] },
  'Ebm9': { v: ['Eb4', 'Gb4', 'Bb4', 'Db5'], bass: ['Eb1', 'Bb1'] },
  'Bbm7': { v: ['Db4', 'F4', 'Ab4', 'Db5'], bass: ['Bb1', 'F2'] },
  'Dbmaj7': { v: ['F4', 'Ab4', 'C5', 'Db5'], bass: ['Db2', 'Ab1'] },
  'Fm9': { v: ['Eb4', 'Ab4', 'C5', 'Eb5'], bass: ['F1', 'C2'] },
}

// 伴奏テクスチャ
export type Texture = 'flow' | 'pulse' | 'tresillo' | 'pad'

export const texturePattern = (texture: Texture, v: Voicing) => {
  const stack = `${v[0]}+${v[1]}+${v[2]}+${v[3]}`
  switch (texture) {
    case 'flow':
      return `v56 ${v[0]}:.5 v48 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5 ${v[2]}:.5 ${v[1]}:.5 ${v[2]}:.5 ${v[3]}:.5`
    case 'pulse':
      return `v62 ${stack}:.5 v46 ${stack}:.5 ${stack}:.5 ${stack}:.5 v58 ${stack}:.5 v46 ${stack}:.5 ${stack}:.5 ${stack}:.5`
    case 'tresillo':
      return `v62 ${stack}:1.5 v56 ${stack}:1.5 v58 ${stack}:1`
    case 'pad':
      return `v56 ${stack}:2 v50 ${stack}:2`
  }
}

export type Bar = { chord: string; melody: string; bassType?: 'drive' | 'push' | 'octave' | 'hold' }

export interface SectionDraft {
  id: string
  label: string
  texture: Texture
  bars: Bar[]
}

function compileSection({ id, label, texture, bars }: SectionDraft) {
  return {
    id,
    label,
    chords: bars.map((b) => b.chord),
    parts: {
      melody: bars.map((b) => b.melody),
      harmony: bars.map((b) => {
        const c = CHORDS[b.chord]
        if (!c) throw new Error(`unknown chord: ${b.chord}`)
        return texturePattern(texture, c.v)
      }),
      bass: bars.map((b) => {
        const c = CHORDS[b.chord]
        if (!c) throw new Error(`unknown chord: ${b.chord}`)
        const [root, fifth] = c.bass
        switch (b.bassType) {
          case 'push':
            return `${root}:1.5 ${root}:1 ${root}:.5 ${fifth}:.5 ${root}:.5`
          case 'octave':
            return `${root}:.5 ${fifth}:.5 ${root}:.5 ${fifth}:.5 ${root}:.5 ${fifth}:.5 ${root}:.5 ${fifth}:.5`
          case 'hold':
            return `${root}:4`
          case 'drive':
          default:
            return `${root}:1.5 ${root}:.5 ${fifth}:1 ${root}:1`
        }
      }),
    },
  }
}

interface StructureDraft {
  id: string
  title: string
  description: string
  sections: SectionDraft[]
  phrases: CompositionStudy['phrases']
  moments: CompositionStudy['moments']
}

function buildStructure(draft: StructureDraft): CompositionStudy {
  const parts: SongPart[] = [
    { id: 'melody', label: '主旋律', instrument: 'yamaha-grand-piano', volume: 0.72, pan: 0.04, velocity: 86, gate: 0.95 },
    { id: 'harmony', label: '和声・伴奏', instrument: 'yamaha-grand-piano', volume: 0.38, pan: 0.14, velocity: 56, gate: 1.1 },
    { id: 'bass', label: '低音', instrument: 'acoustic-bass', volume: 0.54, pan: -0.06, velocity: 76, gate: 1.0 },
  ]
  const song: Song = {
    id: draft.id,
    title: draft.title,
    description: draft.description,
    tempo: 124,
    timeSignature: [4, 4],
    intro: [],
    loop: draft.sections.map((s) => s.id),
    parts,
    sections: draft.sections.map(compileSection),
  }
  return {
    song,
    melodyPart: 'melody',
    hypothesis: draft.description,
    phrases: draft.phrases,
    moments: draft.moments,
  }
}

// 主題「白樺の稜線」の前半8小節
const THEME_FIRST_8: Bar[] = [
  { chord: 'Bbmaj9', melody: 'v86 F5:2 v88 G5:1 v90 A5:1' },
  { chord: 'Gm9', melody: 'v94 Bb5:3 v88 C6:1' },
  { chord: 'Ebmaj9', melody: 'v86 G5:2 v88 A5:1 v90 Bb5:1' },
  { chord: 'Fsus4(add9)', melody: 'v96 D6:3 v90 C6:1' },
  { chord: 'Bbmaj9', melody: 'v86 F5:2 v88 G5:1 v90 A5:1' },
  { chord: 'Gm9', melody: 'v94 Bb5:3 v88 C6:1' },
  { chord: 'Cm9', melody: 'v88 C6:2 v90 D6:1 v92 Eb6:1' },
  { chord: 'F7sus4', melody: 'v96 F6:3 v92 Eb6:1' },
]

// ==========================================
// 3案のフル尺構成
// ==========================================

export const birchStructures: CompositionStudy[] = [
  // ---------- 01 秋霜の対比と夕照の再現 (A 16 – B 8 – A′ 8, 32小節) ----------
  buildStructure({
    id: 'autumn-retake-struct-birch-frost-reprise',
    title: '白樺の稜線 — 秋霜の対比と夕照の再現',
    description:
      'A 16 – B 8 – A′ 8 の32小節。Aは主題提示で、16小節目のトニックを単なる解決ではなく Bbmaj9 の9度（C6）でオシャレに開いたまま保つ。Bはト短調（Gm）へ転じ、8分の刻みと引き締まった短調の歌で冬への緊張感を対比。A′は主題の山場部（Dm7〜Ebmaj9）を高音域で感動的に再現し、最後は3度音（D6）の豊かな余韻でループへ結ぶ',
    sections: [
      {
        id: 'A',
        label: 'A 主題提示',
        texture: 'flow',
        bars: [
          ...THEME_FIRST_8,
          { chord: 'Gm7', melody: 'v90 D6:2 v88 C6:1 v86 Bb5:1' },
          { chord: 'Dm7', melody: 'v94 F6:3 v90 D6:1' },
          { chord: 'Ebmaj9', melody: 'v88 G5:2 v90 A5:1 v92 Bb5:1' },
          { chord: 'Cm7', melody: 'v94 Eb6:3 v90 D6:1' },
          { chord: 'Ebmaj9', melody: 'v88 F5:2 v90 G5:1 v92 A5:1' },
          { chord: 'F7sus4', melody: 'v94 Bb5:3 v90 C6:1' },
          { chord: 'F7', melody: 'v92 D6:2 v90 C6:1 v92 A5:1' },
          // ユーザー要望反映: トニックを落ち着かせすぎず、Bbmaj9の9度(C6)の余韻でBへ渡す
          { chord: 'Bbmaj9', melody: 'v94 C6:3 v90 Bb5:1', bassType: 'push' },
        ],
      },
      {
        id: 'B',
        label: 'B 秋霜の対比（ト短調）',
        texture: 'pulse',
        bars: [
          { chord: 'Gm9', melody: 'v86 D5:1.5 v88 G5:.5 v90 A5:1 v92 Bb5:1' },
          { chord: 'Ebmaj7', melody: 'v94 C6:3 v90 Bb5:1' },
          { chord: 'Cm9', melody: 'v88 Eb5:1.5 v90 G5:.5 v92 A5:1 v94 Bb5:1' },
          { chord: 'D7sus4', melody: 'v96 D6:3 v92 C6:1' },
          { chord: 'Gm9', melody: 'v90 Bb5:2 v92 A5:1 v90 G5:1' },
          { chord: 'Ebmaj9', melody: 'v94 F#5:3 v90 G5:1' },
          { chord: 'Am7b5', melody: 'v92 A5:2 v94 Bb5:1 v96 C6:1' },
          { chord: 'D7', melody: 'v96 D6:4' },
        ],
      },
      {
        id: 'A_prime',
        label: 'A′ 夕照の再現と結尾',
        texture: 'flow',
        bars: [
          { chord: 'Gm7', melody: 'v92 D6:2 v90 C6:1 v88 Bb5:1' },
          { chord: 'Dm7', melody: 'v98 F6:3 v94 D6:1' }, // 山場 F6
          { chord: 'Ebmaj9', melody: 'v90 G5:2 v92 A5:1 v94 Bb5:1' },
          { chord: 'Cm7', melody: 'v96 Eb6:3 v92 D6:1' },
          { chord: 'Ebmaj9', melody: 'v90 F5:2 v92 G5:1 v94 A5:1' },
          { chord: 'F7sus4', melody: 'v96 Bb5:3 v92 C6:1' },
          { chord: 'F7', melody: 'v96 D6:2 v94 C6:1 v96 F6:1' },
          // 結尾: Bbmaj9の3度音(D6)でオシャレなテンションの余韻を残す
          { chord: 'Bbmaj9', melody: 'v96 D6:4', bassType: 'push' },
        ],
      },
    ],
    phrases: [
      { label: 'A 主題提示', from: 1, to: 16, intention: '主題を端正に提示し、トニックを9度でオシャレに開く' },
      { label: 'B ト短調の対比', from: 17, to: 24, intention: '秋霜の冷気と短調の緊張感で主題と明確に対比' },
      { label: 'A′ 再現と結尾', from: 25, to: 32, intention: '最高音F6の山場を築き、3度音の豊かな余韻で閉じる' },
    ],
    moments: [
      { bar: 16, beat: 0, pitches: ['Bb1', 'D4', 'C6'], intention: '16小節目の終止をBbmaj9の9度C6でオシャレに保つ' },
      { bar: 24, beat: 0, pitches: ['D2', 'D4', 'D6'], intention: 'D7の頂点で短調の緊張感を極める' },
      { bar: 26, beat: 0, pitches: ['D2', 'D4', 'F6'], intention: '再現部の最高山場 F6' },
      { bar: 32, beat: 0, pitches: ['Bb1', 'D4', 'D6'], intention: 'Bbmaj9の3度D6でテンションを残してループへ' },
    ],
  }),

  // ---------- 02 風渡る前哨と黄金の展開 (Intro 4 – A 8 – B 8 – C 8 – A′ 8, 36小節) ----------
  buildStructure({
    id: 'autumn-retake-struct-birch-golden-rondo',
    title: '白樺の稜線 — 風渡る前哨と黄金の展開',
    description:
      'Intro 4 – A 8 – B 8 – C 8 – A′ 8 の36小節。低音の呼びかけから静かに始まるIntroの後、主題前半(A)を提示。Bは下属調（変ホ長調）で陽光と実りの広がりを描く。CはBb保続音の上でドミナントテンションが張り詰める冬の進軍。A′で主題の山場が力強く再現され、Bbmaj9(#11) の透明な響きで結ぶ',
    sections: [
      {
        id: 'Intro',
        label: '前哨の朝霧（Intro）',
        texture: 'pad',
        bars: [
          { chord: 'Bbmaj9', melody: 'v80 F4:2 v82 G4:1 v84 A4:1' },
          { chord: 'Gm9', melody: 'v86 Bb4:4' },
          { chord: 'Ebmaj9', melody: 'v80 Eb4:2 v82 F4:1 v84 G4:1' },
          { chord: 'Fsus4', melody: 'v86 C5:4' },
        ],
      },
      {
        id: 'A',
        label: 'A 主題前半',
        texture: 'flow',
        bars: THEME_FIRST_8,
      },
      {
        id: 'B',
        label: 'B 実りの陽光（変ホ長調）',
        texture: 'flow',
        bars: [
          { chord: 'Ebmaj9', melody: 'v88 G5:1 v90 Bb5:1.5 v88 C6:.5 v92 D6:1' },
          { chord: 'Bb/D', melody: 'v94 Eb6:3 v90 D6:1' },
          { chord: 'Cm9', melody: 'v88 Eb5:1 v90 G5:1.5 v88 A5:.5 v92 Bb5:1' },
          { chord: 'Gm7', melody: 'v94 C6:3 v90 Bb5:1' },
          { chord: 'Abmaj9', melody: 'v90 C6:2 v92 D6:1 v94 Eb6:1' },
          { chord: 'Bb/Ab', melody: 'v96 F6:3 v92 Eb6:1' },
          { chord: 'Gm7', melody: 'v92 D6:2 v90 C6:1 v88 Bb5:1' },
          { chord: 'C7sus4', melody: 'v94 G5:4' },
        ],
      },
      {
        id: 'C',
        label: 'C 進軍の緊張（ドミナント展開）',
        texture: 'pulse',
        bars: [
          { chord: 'Fm9/Bb', melody: 'v88 Ab5:2 v90 G5:1 v92 F5:1' },
          { chord: 'Gm7/Bb', melody: 'v94 Bb5:3 v90 Ab5:1' },
          { chord: 'Abmaj7/Bb', melody: 'v92 C6:2 v94 D6:1 v96 Eb6:1' },
          { chord: 'Bb7sus4', melody: 'v98 F6:4' }, // 展開の頂点 F6
          { chord: 'Ebm9', melody: 'v90 Gb5:2 v92 F5:1 v90 Eb5:1' },
          { chord: 'Bbm7', melody: 'v94 F5:3 v90 Db5:1' },
          { chord: 'F7sus4', melody: 'v92 Eb5:2 v94 F5:1 v96 G5:1' },
          { chord: 'F7', melody: 'v96 A5:4' },
        ],
      },
      {
        id: 'A_prime',
        label: 'A′ 再現と澄明な結尾',
        texture: 'flow',
        bars: [
          { chord: 'Gm7', melody: 'v92 D6:2 v90 C6:1 v88 Bb5:1' },
          { chord: 'Dm7', melody: 'v96 F6:3 v92 D6:1' },
          { chord: 'Ebmaj9', melody: 'v90 G5:2 v92 A5:1 v94 Bb5:1' },
          { chord: 'Cm7', melody: 'v94 Eb6:3 v90 D6:1' },
          { chord: 'Ebmaj9', melody: 'v90 F5:2 v92 G5:1 v94 A5:1' },
          { chord: 'F7sus4', melody: 'v96 Bb5:3 v92 C6:1' },
          { chord: 'F7', melody: 'v94 D6:2 v92 C6:1 v90 A5:1' },
          // 結尾: Bbmaj9(#11) の透明なテンション和音
          { chord: 'Bbmaj9(#11)', melody: 'v96 D6:4', bassType: 'push' },
        ],
      },
    ],
    phrases: [
      { label: 'Intro', from: 1, to: 4, intention: '前哨の朝霧を低音と和音で静かに予告' },
      { label: 'A 主題前半', from: 5, to: 12, intention: '主題の前半を端正に提示し半終止へ導く' },
      { label: 'B 変ホ長調の陽光', from: 13, to: 20, intention: '実りの秋の豊かさと明るさを歌う対比部' },
      { label: 'C ドミナント展開', from: 21, to: 28, intention: '冬の気配と進軍の緊張感をドミナント保続で極める' },
      { label: 'A′ 再現と澄明な結尾', from: 29, to: 36, intention: '主題を美しく再現し、Bbmaj9(#11)の透明な余韻で結ぶ' },
    ],
    moments: [
      { bar: 4, beat: 0, pitches: ['F1', 'Eb4', 'C5'], intention: 'Introから主題へ導くFsus4' },
      { bar: 24, beat: 0, pitches: ['Bb1', 'D4', 'F6'], intention: '展開部Cの頂点で響くF6' },
      { bar: 36, beat: 0, pitches: ['Bb1', 'D4', 'D6'], intention: 'Bbmaj9(#11)のオシャレで澄んだ響き' },
    ],
  }),

  // ---------- 03 暮れゆく砦の行軍歌 (A 8 – A′ 8 – B 12 – Codetta 4, 32小節) ----------
  buildStructure({
    id: 'autumn-retake-struct-birch-fortress-march',
    title: '白樺の稜線 — 暮れゆく砦の行軍歌',
    description:
      'A 8 – A′ 8 – B 12 – Codetta 4 の32小節。Aで主題前半、A′で山場を提示。A′の終わりは Bb/D で浮遊感を持たせる。Bはハ短調(Cm)の12小節に及ぶ長大な対比部で、3+3+2のリズムに乗せて寒風の砦の攻防と決意を描く。最後はCodettaでフックの動機が優しく回帰し、Bbmaj9の9度(C6)の余韻で美しく閉じる',
    sections: [
      {
        id: 'A',
        label: 'A 主題前半',
        texture: 'flow',
        bars: THEME_FIRST_8,
      },
      {
        id: 'A_prime',
        label: 'A′ 主題山場と浮遊終止',
        texture: 'flow',
        bars: [
          { chord: 'Gm7', melody: 'v90 D6:2 v88 C6:1 v86 Bb5:1' },
          { chord: 'Dm7', melody: 'v94 F6:3 v90 D6:1' },
          { chord: 'Ebmaj9', melody: 'v88 G5:2 v90 A5:1 v92 Bb5:1' },
          { chord: 'Cm7', melody: 'v94 Eb6:3 v90 D6:1' },
          { chord: 'Ebmaj9', melody: 'v88 F5:2 v90 G5:1 v92 A5:1' },
          { chord: 'F7sus4', melody: 'v94 Bb5:3 v90 C6:1' },
          { chord: 'F7', melody: 'v92 D6:2 v90 C6:1 v92 A5:1' },
          // A′終わり: Bb/D で第1転回の浮遊感を残してBへ橋渡し
          { chord: 'Bbmaj9/D', melody: 'v94 C6:4', bassType: 'push' },
        ],
      },
      {
        id: 'B',
        label: 'B ハ短調の長い行軍歌',
        texture: 'tresillo',
        bars: [
          { chord: 'Cm9', melody: 'v88 G5:1.5 v90 Bb5:1.5 v92 C6:1' },
          { chord: 'Abmaj9', melody: 'v96 Eb6:3 v92 D6:1' },
          { chord: 'Fm9', melody: 'v88 C6:1.5 v90 D6:1.5 v92 Eb6:1' },
          { chord: 'G7sus4', melody: 'v94 D6:3 v90 C6:1' },
          { chord: 'G7', melody: 'v92 B5:4' }, // G7の導音 B5
          { chord: 'Cm9', melody: 'v88 C6:1.5 v90 D6:1.5 v92 Eb6:1' },
          { chord: 'Abmaj7', melody: 'v96 G6:3 v92 F6:1' }, // 対比部の最高音 G6
          { chord: 'Dm7b5', melody: 'v94 Eb6:2 v92 D6:1 v90 C6:1' },
          { chord: 'G7', melody: 'v92 D6:4' },
          { chord: 'Ebm9', melody: 'v90 Gb5:2 v92 F5:1 v90 Eb5:1' },
          { chord: 'F7sus4', melody: 'v94 F5:3 v92 G5:1' },
          { chord: 'F7', melody: 'v96 A5:4' },
        ],
      },
      {
        id: 'Codetta',
        label: 'Codetta テンション結尾',
        texture: 'flow',
        bars: [
          { chord: 'Bbmaj9', melody: 'v88 F5:2 v90 G5:1 v92 A5:1' },
          { chord: 'Gm9', melody: 'v94 Bb5:3 v90 C6:1' },
          { chord: 'Ebmaj9', melody: 'v92 D6:2 v94 C6:1 v96 A5:1' },
          // 結尾: Bbmaj9の9度(C6)を伸ばし、オシャレで透明な余韻を残す
          { chord: 'Bbmaj9', melody: 'v96 C6:4', bassType: 'push' },
        ],
      },
    ],
    phrases: [
      { label: 'A 主題前半', from: 1, to: 8, intention: '主題の前半を提示し半終止で上へ開く' },
      { label: 'A′ 主題山場', from: 9, to: 16, intention: '主題の山場を歌い、Bb/Dの浮遊感でBへ渡す' },
      { label: 'B ハ短調の長い行軍歌', from: 17, to: 28, intention: '3+3+2の推進力とハ短調の緊迫感で熱く歌い上げる' },
      { label: 'Codetta テンション結尾', from: 29, to: 32, intention: '動機が静かに主調へ戻り、Bbmaj9の9度音でオシャレに結ぶ' },
    ],
    moments: [
      { bar: 16, beat: 0, pitches: ['D2', 'D4', 'C6'], intention: 'Bbmaj9/D の浮遊感ある終止' },
      { bar: 23, beat: 0, pitches: ['Ab1', 'Eb4', 'G6'], intention: '対比部Bの頂点 G6' },
      { bar: 32, beat: 0, pitches: ['Bb1', 'D4', 'C6'], intention: 'Bbmaj9の9度C6で洗練された余韻' },
    ],
  }),
]
