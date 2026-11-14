import { buildSketch, transposePassage, type Passage } from '../../sketch.ts'
import type { CompositionStudy } from '../../study.ts'
import { crystalMapHook } from './hooks-001.ts'
import { dottedAnswer, frameInC } from './themes-002.ts'

// 「水晶の地図 — 付点で駆ける応答を、句ごと短3度上へ」(screen5-theme2-crystal-dotted-sequence) からのフル尺の構成案 01。
// イ長調 · ♩=116 · 4/4、主題の段階と同じ簡潔な編成（ピアノの旋律・ピアノの伴奏・アコースティックベース）。
//
// ユーザーの発言（feedback.ts）: 展開 01 に「リズムが全部同じで、和音が違うだけ」、展開 02 の「伸ばして縮めて伸ばす」に
// 「最後の余韻がいいね」、選ばれた主題に「いいんじゃない？トリッキーだけど」。
// ここからは AI の仮説: 対比部は主題（♩. ♪ ♩ ♩ の下行、付点8分＋16分の応答）と違うリズム型・輪郭・音域で書く。
// 3案で対比部のリズム型（長い音で上る／3+3+2 と8分の音階／4分の3連符）、調（嬰ヘ短調／ニ長調→ニ短調／ホ長調）、
// 形式（A–B–A′／A–B–C–A′／主題を割って B を挟む）、山場（対比部の終わり／展開部／再現）を変える。
// 「最後の余韻」は案1でだけ使い、案2・3は別の終わり方にする。

type Voicing = readonly string[]
const ch = (v: Voicing) => v.join('+')

/** 句を順につなぐ。 */
const concat = (...list: Passage[]): Passage => ({
  chords: list.flatMap((p) => p.chords),
  melody: list.flatMap((p) => p.melody),
  harmony: list.flatMap((p) => p.harmony),
  bass: list.flatMap((p) => p.bass),
})

// ---------- 伴奏の型 ----------

const ACCENT = [60, 44, 44, 44, 56, 44, 44, 44]

/** 8分の和音の刻み（フックと同じ）。split 個目の8分から和音 b。 */
const pulse = (a: Voicing, b: Voicing = a, split = 4) =>
  ACCENT.map((v, i) => `v${v} ${ch(i < split ? a : b)}:.5`).join(' ')

/** 2分音符で保つ和音。2拍目から b。 */
const pad = (a: Voicing, b: Voicing = a) => `v56 ${ch(a)}:2 v50 ${ch(b)}:2`

/** 3+3+2 の和音。 */
const tres = (a: Voicing) => `v62 ${ch(a)}:1.5 v54 ${ch(a)}:1.5 v58 ${ch(a)}:1`

/** 3+1+3+1 の和音。2拍目から b。 */
const tres2 = (a: Voicing, b: Voicing) => `v62 ${ch(a)}:1.5 v52 ${ch(a)}:.5 v60 ${ch(b)}:1.5 v52 ${ch(b)}:.5`

/** 裏拍だけの和音。2拍目から b。 */
const offbeat = (a: Voicing, b: Voicing = a) =>
  `r:.5 v54 ${ch(a)}:.5 r:.5 v46 ${ch(a)}:.5 r:.5 v52 ${ch(b)}:.5 r:.5 v46 ${ch(b)}:.5`

// ---------- 低音の型 ----------

/** 8分のオクターブの往復（フックと同じ）。 */
const octaves = (low: string, high: string, fifth: string) =>
  `${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5 ${low}:.5 ${high}:.5 ${fifth}:.5 ${high}:.5`

/** 8分のオクターブの往復。2拍目から別の根音。 */
const octaves2 = (a: string, aUp: string, b: string, bUp: string) =>
  `${a}:.5 ${aUp}:.5 ${a}:.5 ${aUp}:.5 ${b}:.5 ${bUp}:.5 ${b}:.5 ${bUp}:.5`

/** 4分で歩く低音。 */
const walk = (a: string, b: string, c: string, d: string) => `${a}:1 ${b}:1 ${c}:1 ${d}:1`

/** 3+3+2 の低音。 */
const bass332 = (a: string, b: string, c: string) => `${a}:1.5 ${b}:1.5 ${c}:1`

// ---------- 響き ----------

const A_ADD9: Voicing = ['E4', 'A4', 'B4', 'C#5']
const E7SUS4: Voicing = ['D4', 'E4', 'A4', 'B4']
const E7: Voicing = ['D4', 'E4', 'G#4', 'B4']
const CMAJ7: Voicing = ['E4', 'G4', 'B4', 'C5']
const FMAJ7: Voicing = ['E4', 'F4', 'A4', 'C5']
const DMAJ7: Voicing = ['D4', 'F#4', 'A4', 'C#5']
const BBMAJ9: Voicing = ['D4', 'F4', 'A4', 'C5']
const DMAJ9_LOW: Voicing = ['C#4', 'E4', 'F#4', 'A4']

// 選ばれた主題（16小節）の4つの句
const answerUp = transposePassage(dottedAnswer, 3)
const THEME = concat(crystalMapHook, dottedAnswer, answerUp, frameInC)

// ==========================================
// 案1: A–B–A′（32小節）。嬰ヘ短調の谷を登り、余韻で帰る
// ==========================================

// B 17〜24: 平行調の嬰ヘ短調。主題（上から下る、高い音域）と逆に、低い C#5 から音階で上り、長い音で止まる。
// リズム型は 𝅗𝅥 ♩ ♩ | 𝅗𝅥. ♩（長い音から入る）。2小節単位で、出だしを C#5 → D5 → E5 と1音ずつ上げる。
// 21小節目は Dmaj7(#11) の G#5（リディアの色）。23小節目で8分を経ずに E6 へ届き、全体の山場にする。
// 24小節目でフックのリズム（♩. ♪ ♩ ♩）を先に鳴らし、C#7 から主題の再現へ渡す。
// 伴奏は前半が裏拍だけの和音と4分で歩く低音、後半が 3+3+2。
const valleyB: Passage = {
  chords: ['F#m9', 'Dmaj9', 'Bm9', 'C#7sus4', 'Dmaj7(#11)', 'Bm11', 'Dmaj9', 'Bm7/C# C#7'],
  melody: [
    'v78 C#5:2 v80 D5:1 E5:1',
    'v84 F#5:3 v80 E5:1',
    'v80 D5:2 v82 E5:1 F#5:1',
    'v86 G#5:3 v80 F#5:1',
    'v82 E5:2 v84 F#5:1 G#5:1',
    'v88 A5:3 v84 B5:1',
    'v90 C#6:1 v92 D6:1 v98 E6:2',
    'v90 D6:1.5 v86 C#6:.5 v84 B5:1 G#5:1',
  ],
  harmony: [
    offbeat(['A3', 'C#4', 'E4', 'G#4']),
    offbeat(DMAJ9_LOW),
    offbeat(['A3', 'C#4', 'D4', 'F#4']),
    offbeat(['B3', 'C#4', 'F#4', 'G#4']),
    tres(['A3', 'C#4', 'F#4', 'G#4']),
    tres(['A3', 'D4', 'E4', 'F#4']),
    tres(DMAJ9_LOW),
    tres2(['A3', 'B3', 'D4', 'F#4'], ['B3', 'E#4', 'G#4', 'C#5']),
  ],
  bass: [
    walk('F#1', 'A1', 'C#2', 'E2'),
    walk('D2', 'C#2', 'B1', 'A1'),
    walk('B1', 'C#2', 'D2', 'F#2'),
    'C#2:1.5 C#2:.5 G#1:1 C#2:1',
    bass332('D2', 'D2', 'A1'),
    bass332('B1', 'B1', 'F#2'),
    bass332('D2', 'D2', 'A2'),
    'C#2:1.5 C#2:.5 C#2:1.5 G#1:.5',
  ],
}

// A′ 25〜32: フックの旋律が戻るが、和声はまだ谷に残る（F#m9 → Cmaj7 → Dm9 → Bbmaj9(#11)）。
// 主和音へは 29〜32小節で初めて戻り、Bm7 の D6 → E7 → A5 を伸ばし、最後の小節で和音だけ C6/G にずらす
// （展開 02 の「伸ばして縮めて伸ばす」の終わり方。ユーザーの「最後の余韻がいいね」による）。
const valleyReturn: Passage = {
  chords: ['F#m9', 'Cmaj7', 'Dm9', 'Bbmaj9(#11)', 'Bm7', 'E7sus4 E7', 'A(add9)', 'C6/G'],
  melody: [
    'v86 C#6:1.5 v84 B5:.5 v86 A5:1 v84 E5:1',
    'v92 G5:3 r:1',
    'v86 C6:1.5 v84 A5:.5 v86 G5:1 v84 F5:1',
    'v90 E5:3 v82 B5:.5 C#6:.5',
    'v94 D6:3 v86 C#6:1',
    'v88 B5:2 v84 A5:1 G#5:1',
    'v90 A5:4',
    '-:3 r:1',
  ],
  harmony: [
    pulse(['E4', 'G#4', 'A4', 'C#5'], ['E4', 'G#4', 'A4', 'C#5'], 8),
    pulse(CMAJ7, CMAJ7, 8),
    pulse(FMAJ7, FMAJ7, 8),
    pulse(BBMAJ9, BBMAJ9, 8),
    pulse(DMAJ7, DMAJ7, 8),
    pulse(E7SUS4, E7),
    pulse(A_ADD9, A_ADD9, 8),
    pulse(['E4', 'G4', 'A4', 'C5'], ['E4', 'G4', 'A4', 'C5'], 8),
  ],
  bass: [
    octaves('F#1', 'F#2', 'C#2'),
    octaves('C2', 'C3', 'G2'),
    octaves('D2', 'D3', 'A2'),
    octaves('Bb1', 'Bb2', 'F2'),
    octaves('B1', 'B2', 'F#2'),
    octaves2('E1', 'E2', 'E1', 'E2'),
    octaves('A1', 'A2', 'E2'),
    octaves('G1', 'G2', 'E2'),
  ],
}

// ==========================================
// 案2: A–B–C–A′（36小節）。3+3+2 のニ長調と、ニ短調の反行展開
// ==========================================

// B 17〜24: 下属調のニ長調。2小節単位で「3+3+2 で下る小節」と「8分の音階で上って2分で伸ばす小節」を組む。
// 21小節目から同じ型を高い音で言い直し、22小節目はニ長調の bVI（Bbmaj9）、23小節目は iv（Gm9）へ曇らせ、
// 24小節目で Em7b5 → A7 からニ短調へ渡す。伴奏と低音も 3+3+2。
const marchB: Passage = {
  chords: ['Dmaj9', 'Bm9', 'Gmaj7', 'Em9 A7sus4', 'Dmaj9', 'Bbmaj9', 'Gm9', 'Em7b5 A7'],
  melody: [
    'v84 A5:1.5 v80 F#5:1.5 v82 E5:1',
    'v80 D5:.5 E5:.5 F#5:.5 G5:.5 v88 A5:2',
    'v84 B5:1.5 v80 G5:1.5 v82 F#5:1',
    'v80 E5:.5 F#5:.5 G5:.5 A5:.5 v88 B5:2',
    'v86 C#6:1.5 v82 A5:1.5 v84 B5:1',
    'v82 F5:.5 G5:.5 A5:.5 Bb5:.5 v90 C6:2',
    'v86 D6:1.5 v82 Bb5:1.5 v84 A5:1',
    'v84 Bb5:.5 A5:.5 G5:.5 F5:.5 v86 E5:1 v84 C#5:1',
  ],
  harmony: [
    tres(DMAJ9_LOW),
    tres(['A3', 'C#4', 'D4', 'F#4']),
    tres(['D4', 'F#4', 'G4', 'B4']),
    tres2(['D4', 'F#4', 'G4', 'B4'], ['D4', 'G4', 'A4', 'B4']),
    tres(DMAJ9_LOW),
    tres(BBMAJ9),
    tres(['F4', 'A4', 'Bb4', 'D5']),
    tres2(['D4', 'E4', 'G4', 'Bb4'], ['C#4', 'E4', 'G4', 'A4']),
  ],
  bass: [
    bass332('D2', 'D2', 'A1'),
    bass332('B1', 'B1', 'F#2'),
    bass332('G1', 'G1', 'D2'),
    'E2:1.5 E2:.5 A1:1.5 A1:.5',
    bass332('D2', 'D2', 'A2'),
    bass332('Bb1', 'Bb1', 'F2'),
    bass332('G1', 'G1', 'D2'),
    'E2:1.5 E2:.5 A1:1.5 A1:.5',
  ],
}

// C 25〜32: ニ短調の展開。フック1小節目（2度・2度・4度で下る）を反行させ、2度・2度・4度で上って長い音で止める。
// 27小節目で同じ形を1音上から。29〜30小節は主題の付点の応答で Fmaj7 → Dm9（ドリアの B）を駆け上がり、
// 31小節目の Bbmaj7(#11) の上で E6（#11）を伸ばす山場。32小節目の E7 で主調へ。
// 伴奏は前半が裏拍＋歩く低音、後半が8分刻み＋オクターブの低音。
const invertedC: Passage = {
  chords: ['Dm9', 'Bbmaj7', 'Gm9', 'C7sus4 C7', 'Fmaj7', 'Dm9', 'Bbmaj9(#11)', 'E7sus4 E7'],
  melody: [
    'v84 E5:1.5 v82 F5:.5 v84 G5:1 v88 C6:1',
    'v88 A5:3 r:1',
    'v84 F5:1.5 v82 G5:.5 v84 A5:1 v88 D6:1',
    'v90 Bb5:3 r:1',
    'v86 A5:.75 v82 G5:.25 v86 A5:.75 v82 B5:.25 v88 C6:1 A5:1',
    'v88 B5:.75 v84 A5:.25 v88 B5:.75 v84 C6:.25 v92 D6:1 C6:1',
    'v98 E6:3 v88 D6:1',
    'v90 B5:2 v86 A5:1 G#5:1',
  ],
  harmony: [
    offbeat(['C4', 'E4', 'F4', 'A4']),
    offbeat(['D4', 'F4', 'Bb4', 'C5']),
    offbeat(['F4', 'A4', 'Bb4', 'D5']),
    offbeat(['Bb3', 'C4', 'F4', 'G4'], ['Bb3', 'C4', 'E4', 'G4']),
    pulse(FMAJ7, FMAJ7, 8),
    pulse(FMAJ7, FMAJ7, 8),
    pulse(BBMAJ9, BBMAJ9, 8),
    pulse(E7SUS4, E7),
  ],
  bass: [
    walk('D2', 'A1', 'D2', 'F2'),
    walk('Bb1', 'F1', 'Bb1', 'D2'),
    walk('G1', 'D2', 'G1', 'Bb1'),
    walk('C2', 'G1', 'C2', 'E2'),
    octaves('F1', 'F2', 'C2'),
    octaves('D2', 'D3', 'A2'),
    octaves('Bb1', 'Bb2', 'F2'),
    octaves2('E1', 'E2', 'E1', 'E2'),
  ],
}

// A′ 33〜36: 短い再現。フック1〜2小節目のあと、主題の結び（15〜16小節目）で閉じ、主和音から頭へ戻る。
const shortReturn: Passage = {
  chords: [crystalMapHook.chords[0], crystalMapHook.chords[1], frameInC.chords[2], frameInC.chords[3]],
  melody: [crystalMapHook.melody[0], crystalMapHook.melody[1], frameInC.melody[2], frameInC.melody[3]],
  harmony: [crystalMapHook.harmony[0], crystalMapHook.harmony[1], frameInC.harmony[2], frameInC.harmony[3]],
  bass: [crystalMapHook.bass[0], crystalMapHook.bass[1], frameInC.bass[2], frameInC.bass[3]],
}

// ==========================================
// 案3: A1–B–A2–B′–A″（36小節）。主題を割って三連の歌を挟み、ハ長調の頂で再現
// ==========================================

// B 9〜16: 主題の前半（8小節目の E7）のあと、その E をそのまま主音にしてホ長調へ入る。
// リズム型は4分の3連符3つ → 2分音符（8分の伴奏の上で浮く）。2小節目は付点2分＋4分。
// 10小節目は E の bVI の Cmaj7 で G5 を伸ばし、フック2小節目（Cmaj7 の G5）を別の調から思い出させる。
// 13小節目の C#m9 で9度 D#6 まで上り、15小節目で3連符を下って Cmaj7、16小節目の A7 からニ短調（主題の後半）へ。
// 伴奏は2分音符の和音、低音は前半が4分で歩き、後半が 3+3+2。
const tripletB: Passage = {
  chords: ['E(add9)', 'Cmaj7', 'F#m9', 'B7sus4 B7', 'C#m9', 'Amaj7', 'Cmaj7', 'A7sus4 A7'],
  melody: [
    'v80 E5:2/3 F#5:2/3 G#5:2/3 v86 B5:2',
    'v86 G5:3 v80 A5:1',
    'v80 F#5:2/3 G#5:2/3 A5:2/3 v86 C#6:2',
    'v86 B5:3 v80 A5:1',
    'v82 G#5:2/3 A5:2/3 B5:2/3 v92 D#6:2',
    'v88 C#6:3 v82 B5:1',
    'v84 B5:2/3 A5:2/3 G5:2/3 v84 E5:2',
    'v80 D5:2 v82 E5:1 G5:1',
  ],
  harmony: [
    pad(['E4', 'F#4', 'G#4', 'B4']),
    pad(CMAJ7),
    pad(['E4', 'G#4', 'A4', 'C#5']),
    pad(['E4', 'F#4', 'A4', 'B4'], ['D#4', 'F#4', 'A4', 'B4']),
    pad(['E4', 'G#4', 'B4', 'D#5']),
    pad(['E4', 'G#4', 'A4', 'C#5']),
    pad(CMAJ7),
    pad(['D4', 'E4', 'G4', 'A4'], ['C#4', 'E4', 'G4', 'A4']),
  ],
  bass: [
    walk('E2', 'F#2', 'G#2', 'B2'),
    walk('C2', 'G1', 'C2', 'E2'),
    walk('F#1', 'A1', 'C#2', 'E2'),
    'B1:1.5 B1:.5 F#1:1 B1:1',
    bass332('C#2', 'C#2', 'G#2'),
    bass332('A1', 'A1', 'E2'),
    bass332('C2', 'C2', 'G2'),
    'A1:1.5 A1:.5 E2:1.5 A1:.5',
  ],
}

// B′ 25〜28: G の保続低音の上で三連の動機を形を変えながら上り（3連→2分／2分→3連／刺繍の3連→2分／8分の音階）、
// 28小節目の D6 から次のフックの E6 へ。伴奏は8分刻みで厚くする。
const climbOnG: Passage = {
  chords: ['Dm9/G', 'Cmaj7/G', 'Fmaj7/G', 'G7sus4 G7'],
  melody: [
    'v82 D5:2/3 E5:2/3 F5:2/3 v86 A5:2',
    'v86 G5:2 v82 E5:2/3 F5:2/3 G5:2/3',
    'v86 A5:2/3 G5:2/3 A5:2/3 v90 C6:2',
    'v86 G5:.5 A5:.5 B5:.5 C6:.5 v92 D6:2',
  ],
  harmony: [
    pulse(['C4', 'E4', 'F4', 'A4'], ['C4', 'E4', 'F4', 'A4'], 8),
    pulse(CMAJ7, CMAJ7, 8),
    pulse(FMAJ7, FMAJ7, 8),
    pulse(['C4', 'D4', 'F4', 'G4'], ['B3', 'D4', 'F4', 'G4']),
  ],
  bass: [
    octaves('G1', 'G2', 'D2'),
    octaves('G1', 'G2', 'E2'),
    octaves('G1', 'G2', 'F2'),
    octaves2('G1', 'G2', 'G1', 'G2'),
  ],
}

// A″ 29〜36: フックを旋律・和声ごと短3度上（ハ長調）へ移して最高音 E6 で鳴らす山場（主題の「短3度上」をフックにも当てる）。
// 33小節目からフックのリズムで Fmaj7 の E6 から下り、34小節目で三連の動機を思い出し、
// 35小節目の Bbmaj9(#11)（主調の bII）→ E7 で主調の A5 へ。最後は余韻を残さず主和音で閉じる。
const summitHook = transposePassage(crystalMapHook, 3)
const summitClose: Passage = {
  chords: ['Fmaj7', 'Dm9 E7sus4', 'Bbmaj9(#11) E7', 'A(add9)'],
  melody: [
    'v94 E6:1.5 v88 D6:.5 v86 C6:1 v84 A5:1',
    'v86 G5:2/3 A5:2/3 B5:2/3 v90 D6:1 v86 B5:1',
    'v88 A5:2 v84 G#5:2',
    'v90 A5:4',
  ],
  harmony: [
    pulse(FMAJ7, FMAJ7, 8),
    pulse(FMAJ7, E7SUS4),
    pulse(BBMAJ9, E7),
    pulse(A_ADD9, A_ADD9, 8),
  ],
  bass: [
    octaves('F1', 'F2', 'C2'),
    octaves2('D2', 'D3', 'E1', 'E2'),
    octaves2('Bb1', 'Bb2', 'E1', 'E2'),
    octaves('A1', 'A2', 'E2'),
  ],
}

// ==========================================
// Sketch 組み立て
// ==========================================

const sketch = (draft: Omit<Parameters<typeof buildSketch>[0], 'tempo' | 'meter' | 'harmonyGate'>) =>
  buildSketch({ ...draft, tempo: 116, meter: [4, 4], harmonyGate: 0.9 })

export const crystalMapStructures: CompositionStudy[] = [
  sketch({
    id: 'screen5-struct-crystal-valley',
    title: '水晶の地図 — 嬰ヘ短調の谷を登り、余韻で帰る',
    description:
      'イ長調 · ♩=116 · 4/4 · 32小節。A–B–A′。A（1〜16）は主題のまま。B（17〜24）は平行調の嬰ヘ短調で、主題と逆に低い C#5 から音階で上り、長い音で止まる（𝅗𝅥 ♩ ♩ | 𝅗𝅥. ♩）。出だしを1音ずつ上げ、Dmaj7(#11) の G#5 を経て23小節目の E6 が山場。A′（25〜32）はフックの旋律が F#m9・Dm9・Bbmaj9(#11) の上で戻り、29小節目でようやく主調へ。最後は A5 を保ったまま和音だけ C6/G にずらす余韻',
    passages: [
      { label: 'A 主題', intention: '選ばれた主題のまま（フック、付点の応答、短3度上、ハ長調で枠を閉じる）', passage: THEME },
      { label: 'B 嬰ヘ短調の谷', intention: '低い音域から長い音で音階を上り、23小節目の E6 で山場', passage: valleyB },
      { label: 'A′ 谷からの再現', intention: 'フックの旋律を短調寄りの和声で戻し、主和音は最後に。C6/G の余韻で頭へ', passage: valleyReturn },
    ],
    moments: [
      { bar: 17, beat: 0, pitches: ['F#1', 'C#5'], intention: 'B の始まり、嬰ヘ短調の C#5（低い音域）' },
      { bar: 21, beat: 2, pitches: ['D2', 'G#4', 'F#5'], intention: 'Dmaj7(#11) の G#（伴奏）の上で F#5' },
      { bar: 23, beat: 2, pitches: ['D2', 'F#4', 'E6'], intention: '山場の E6（Dmaj9 の9度）' },
      { bar: 25, beat: 0, pitches: ['F#1', 'G#4', 'C#6'], intention: 'フックの C#6 が F#m9 の上で戻る' },
      { bar: 28, beat: 0, pitches: ['Bb1', 'D4', 'E5'], intention: 'Bbmaj9(#11) の #11 の E5' },
      { bar: 32, beat: 0, pitches: ['G1', 'C5', 'A5'], intention: 'A5 を保ったまま C6/G の余韻' },
    ],
  }),
  sketch({
    id: 'screen5-struct-crystal-march-inversion',
    title: '水晶の地図 — 3+3+2 のニ長調と、ニ短調の反行展開',
    description:
      'イ長調 · ♩=116 · 4/4 · 36小節。A–B–C–A′。A（1〜16）は主題のまま。B（17〜24）は下属調のニ長調で、3+3+2 で下る小節と8分の音階で上って伸ばす小節を組み、伴奏と低音も 3+3+2。後半は bVI の Bbmaj9、iv の Gm9 へ曇り、A7 からニ短調へ。C（25〜32）はフックを反行させて上る展開で、付点の応答で駆け上がり、31小節目の Bbmaj9(#11) の E6 が山場。A′（33〜36）はフック冒頭と主題の結びだけの短い再現',
    passages: [
      { label: 'A 主題', intention: '選ばれた主題のまま', passage: THEME },
      { label: 'B ニ長調の行進', intention: '3+3+2 で下り8分の音階で上る。bVI・iv で曇らせてニ短調へ', passage: marchB },
      { label: 'C 反行の展開', intention: 'フック1小節目を反行させて上り、付点の応答で E6 の山場へ', passage: invertedC },
      { label: 'A′ 短い再現', intention: 'フック冒頭2小節と主題の結びで主調へ戻る', passage: shortReturn },
    ],
    moments: [
      { bar: 17, beat: 0, pitches: ['D2', 'C#4', 'A5'], intention: 'B の始まり、ニ長調の Dmaj9' },
      { bar: 22, beat: 2, pitches: ['Bb1', 'A4', 'C6'], intention: 'ニ長調の bVI（Bbmaj9）の上で C6 を伸ばす' },
      { bar: 25, beat: 0, pitches: ['D2', 'E5'], intention: 'C の始まり、反行したフックの E5（Dm9）' },
      { bar: 31, beat: 0, pitches: ['Bb1', 'D4', 'E6'], intention: '山場の E6（Bbmaj9(#11) の #11）' },
      { bar: 33, beat: 0, pitches: ['A1', 'B4', 'C#6'], intention: 'フック冒頭の再現' },
    ],
  }),
  sketch({
    id: 'screen5-struct-crystal-split-summit',
    title: '水晶の地図 — 主題を割って三連の歌を挟み、ハ長調の頂で再現',
    description:
      'イ長調 · ♩=116 · 4/4 · 36小節。A1–B–A2–B′–A″。主題の前半（1〜8）のあと、8小節目の E をそのまま主音にしてホ長調の B（9〜16）へ。4分の3連符3つ → 2分音符の型で浮くように歌い、Cmaj7 の G5 でフックを別の調から思い出させ、C#m9 の D#6 まで上る。A7 から主題の後半（17〜24）へ戻る。B′（25〜28）は G の保続低音の上で三連の動機を上り、A″（29〜36）でフックを短3度上（ハ長調）の E6 から鳴らす山場。Bbmaj9(#11) → E7 で主和音に閉じる',
    passages: [
      { label: 'A1 主題の前半', intention: 'フックと付点の応答（主題の1〜8小節）', passage: concat(crystalMapHook, dottedAnswer) },
      { label: 'B ホ長調の三連', intention: '4分の3連符から長い音へ。bVI の Cmaj7 でフックを思い出し、D#6 まで', passage: tripletB },
      { label: 'A2 主題の後半', intention: '短3度上の応答とハ長調の枠（主題の9〜16小節）', passage: concat(answerUp, frameInC) },
      { label: "B′ 保続低音の上り", intention: 'G の上で三連の動機の形を変えながら上り、D6 へ', passage: climbOnG },
      { label: 'A″ ハ長調の頂', intention: 'フックを短3度上で鳴らす山場。bII → V で主調に閉じる', passage: concat(summitHook, summitClose) },
    ],
    moments: [
      { bar: 9, beat: 0, pitches: ['E2', 'G#4', 'E5'], intention: 'B の始まり、E を主音にしたホ長調' },
      { bar: 10, beat: 0, pitches: ['C2', 'B4', 'G5'], intention: 'ホ長調の bVI の Cmaj7 で G5（フック2小節目の響き）' },
      { bar: 13, beat: 2, pitches: ['C#2', 'G#4', 'D#6'], intention: 'B の最高音、C#m9 の9度 D#6' },
      { bar: 25, beat: 2, pitches: ['G1', 'F4', 'A5'], intention: 'G の保続低音の上の Dm9/G' },
      { bar: 29, beat: 0, pitches: ['C2', 'E6'], intention: '山場、短3度上のフックの E6' },
      { bar: 35, beat: 0, pitches: ['Bb1', 'D4', 'A5'], intention: '主調の bII（Bbmaj9(#11)）の上の A5' },
    ],
  }),
]
