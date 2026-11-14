import type { Song } from './song.ts'

// タイトル画面の曲。1 人のチェリストがループで音を重ねていくような、チェロ独奏の曲 (Jami Sieber 風)。
// 楽器はチェロ 3 本 (独奏・持続音・刻み) とハープ、フレームドラム代わりのバスドラムだけにしている。
// 主音は D のまま、旋法を A はドリア (B♮)、B はミクソリディア (F# と C♮)、C はエオリアからフリギアの色 (B♭・E♭) と移す。
// A は低い音域の独奏が D の持続音の上で歌う。F・G・C の和音も D の上に乗せたままにして、ドリアの IV (G) で B♮ を聞かせる。
// 旋律は 6/8 の「四分 + 8 分」のはずみと、3 連のロール (ケルトの装飾音) でできている。
// B は高い音域へ上がり、刻みのチェロとフレームドラムがジグのリズムで入る。C♮ の ♭VII で明るくも素朴にする。
// 旋律は和音の音を踏んで 2 小節ずつ上がっては下り、句の終わりを和音の音 (A・C・B・F#) に置いて落ち着かせる。
// C は聖歌のように順次進行で動き、もう 1 本のチェロが 4 度・5 度で寄り添う (オルガヌム)。
// ハープは空虚 5 度を鐘のように鳴らし、E♭ (フリギアの ♭II) を経て B♭–A のフリギア終止で半終止する。
// A' は主題を 1 オクターブ上で歌い、最後はピカルディの 3 度で D 長調に解決してから、静かな A へ戻る。
export const mistPilgrim: Song = {
  id: 'mist-pilgrim',
  title: '霧の巡礼',
  description:
    'D ドリア · ♩=90 · 6/8。タイトル画面の曲。持続音と刻みを重ねたチェロ独奏に、ケルトの装飾と教会旋法 (ミクソリディア・フリギア) を交える',
  tempo: 90,
  timeSignature: [6, 8],
  parts: [
    { id: 'vc', label: 'チェロ (独奏)', instrument: 'cello', volume: 0.75, pan: 0, velocity: 82, gate: 0.98 },
    { id: 'drone', label: 'チェロ (持続音)', instrument: 'cello', volume: 0.45, pan: -0.25, velocity: 52, gate: 1 },
    { id: 'ost', label: 'チェロ (刻み)', instrument: 'cello', volume: 0.42, pan: 0.25, velocity: 56, gate: 0.7 },
    { id: 'harp', label: 'ハープ', instrument: 'harp', volume: 0.5, pan: 0.35, velocity: 58, gate: 2 },
    { id: 'drum', label: 'フレームドラム', instrument: 'orchestra-kit', volume: 0.4, pan: -0.1, velocity: 56, gate: 1 },
  ],
  sections: [
    {
      id: 'intro',
      label: 'イントロ (持続音)',
      chords: ['Dm', 'Dm', 'Dm', 'Dm'],
      parts: {
        drone: ['v44 D2+A2:3', '-:3', 'v50 D2+A2:3', '-:3'],
        harp: ['', '', 'D3:.5 A3 E4 F4 E4 A3', 'D3:.5 A3 E4 F4 E4 A3'],
        vc: ['', '', '', 'r:1.5 v70 E3:.5 F3 G3'],
      },
    },
    {
      id: 'A',
      label: 'A 主題 (ドリア)',
      chords: ['Dm', 'F/D', 'G/D', 'C/D', 'Dm', 'C', 'G C', 'Dm'],
      parts: {
        vc: [
          'A3:1.5 D4:1 C4:.5',
          'A3:1 G3:.5 F3:1 G3:.5',
          'A3:1 B3:.5 C4:1 A3:.5',
          'G3:1 A3:1/6 G3 F3 E3:1.5',
          'A3:1 D4:.5 E4:1 F4:.5',
          'E4:1.5 D4:1 C4:.5',
          'B3:1 A3:.5 G3:1 E3:.5',
          'D3:2.5 A3:.5',
        ],
        drone: ['D2+A2:3', '-:3', '-:3', '-:3', 'D2+A2:3', 'C2+G2:3', 'G2+D3:1.5 C2+G2:1.5', 'D2+A2:3'],
        harp: [
          'D3:.5 A3 E4 F4 E4 A3',
          'F3:.5 C4 G4 A4 G4 C4',
          'G2:.5 D3 A3 B3 A3 D3',
          'C3:.5 G3 D4 E4 D4 G3',
          'D3:.5 A3 E4 F4 E4 A3',
          'C3:.5 G3 D4 E4 D4 G3',
          'G2:.5 D3 B3 C3 G3 E4',
          'D3:.5 A3 E4 F4 A4:1',
        ],
      },
    },
    {
      id: 'B',
      label: 'B 高い歌 (ミクソリディア)',
      chords: ['D', 'C', 'G', 'D', 'D', 'C', 'G C', 'D'],
      parts: {
        vc: [
          'v88 D4:1 F#4:.5 A4:1.5',
          'G4:1 E4:.5 C4:1.5',
          'D4:1 G4:.5 B4:1.5',
          'A4:1 B4:1/6 A4 G4 F#4:1.5',
          'D4:1 F#4:.5 A4:1 B4:.5',
          'C5:1.5 B4:.5 A4 G4',
          'B4:1 A4:.5 G4:1 E4:.5',
          'D4:2.5 r:.5',
        ],
        // ループで重ねた刻み。6/8 の 1 拍目と 4 拍目 (8 分の 1 つ目と 4 つ目) にアクセント
        ost: [
          'v66 D2+A2:.5 v42 D2+A2 v48 D2+A2 v60 D2+A2 v42 D2+A2 v48 D2+A2',
          'v66 C2+G2:.5 v42 C2+G2 v48 C2+G2 v60 C2+G2 v42 C2+G2 v48 C2+G2',
          'v66 G2+D3:.5 v42 G2+D3 v48 G2+D3 v60 G2+D3 v42 G2+D3 v48 G2+D3',
          'v66 D2+A2:.5 v42 D2+A2 v48 D2+A2 v60 D2+A2 v42 D2+A2 v48 D2+A2',
          'v66 D2+A2:.5 v42 D2+A2 v48 D2+A2 v60 D2+A2 v42 D2+A2 v48 D2+A2',
          'v66 C2+G2:.5 v42 C2+G2 v48 C2+G2 v60 C2+G2 v42 C2+G2 v48 C2+G2',
          'v66 G2+D3:.5 v42 G2+D3 v48 G2+D3 v60 C2+G2 v42 C2+G2 v48 C2+G2',
          'v66 D2+A2:.5 v42 D2+A2 v48 D2+A2 v56 D2+A2:1.5',
        ],
        harp: [
          '',
          '',
          '',
          '',
          'v50 D4:.5 A4 E5 F#5 E5 A4',
          'C4:.5 G4 D5 E5 D5 G4',
          'G3:.5 D4 B4 C4 G4 E5',
          'D4:.5 A4 E5 F#5 A5:1',
        ],
        // ジグのリズム (ドン・タ ドン・タ)
        drum: [
          'v62 bd:1 v32 tumba:.5 v50 bd:1 v32 tumba:.5',
          'v58 bd:1 v32 tumba:.5 v50 bd:1 v32 tumba:.5',
          'v58 bd:1 v32 tumba:.5 v50 bd:1 v32 tumba:.5',
          'v58 bd:1 v32 tumba:.5 v50 bd:1 v36 tumba:.5',
          'v62 bd:1 v32 tumba:.5 v50 bd:1 v32 tumba:.5',
          'v58 bd:1 v32 tumba:.5 v50 bd:1 v32 tumba:.5',
          'v58 bd:1 v32 tumba:.5 v40 tumba:.5 v46 tumba v52 tumba',
          'v60 bd:1.5 r:1.5',
        ],
      },
    },
    {
      id: 'C',
      label: 'C 聖歌 (エオリア・フリギア)',
      chords: ['Dm', 'Bb', 'F', 'C', 'Gm', 'Eb', 'Gm/Bb', 'A5'],
      parts: {
        vc: [
          'v74 D4:1.5 C4:.5 D4 E4',
          'F4:1.5 E4:.5 D4:1',
          'C4:1 D4:.5 E4 F4:1',
          'G4:1.5 E4:.5 D4 C4',
          'D4:1.5 Bb3:.5 C4 D4',
          'Eb4:1.5 D4:.5 C4:1',
          'Bb3:1.5 A3:.5 G3:1',
          'A3:3',
        ],
        // 独奏に 4 度・5 度で寄り添う声部 (オルガヌム)
        ost: [
          'v50 A3:1.5 G3:.5 A3:1',
          'Bb3:1.5 A3:.5 F3:1',
          'F3:1 G3:.5 A3:1.5',
          'C4:1.5 G3:1.5',
          'G3:2 F3:.5 G3:.5',
          'Bb3:1.5 G3:.5 F3:1',
          'D3:3',
          'E3:3',
        ],
        drone: ['v48 D2+A2:3', 'Bb2:3', 'F2+C3:3', 'C2+G2:3', 'G2+D3:3', 'Eb2+Bb2:3', 'Bb2:3', 'A2:3'],
        // 空虚 5 度を鐘のように
        harp: ['v52 D4+A4:3', '', 'F4+C5:3', '', 'G4+D5:3', 'Eb4+Bb4:3', '', 'A3+E4:3'],
        drum: ['', '', '', '', '', '', '', 'v28 tumba:.5 v34 tumba v40 tumba v46 tumba v52 tumba v58 tumba'],
      },
    },
    {
      id: 'A2',
      label: "A' 主題 (1 オクターブ上)",
      chords: ['Dm', 'F', 'G', 'C', 'Dm', 'C', 'G C', 'D'],
      ritardando: 0.85,
      parts: {
        vc: [
          'v92 A4:1.5 D5:1 C5:.5',
          'A4:1 G4:.5 F4:1 G4:.5',
          'A4:1 B4:.5 C5:1 A4:.5',
          'G4:1 A4:1/6 G4 F4 E4:1.5',
          'A4:1 D5:.5 E5:1 F5:.5',
          'E5:1.5 D5:1 C5:.5',
          'B4:1 A4:.5 G4:1 E4:.5',
          'D4+A4:3',
        ],
        // 内声の長い音。最後は F# (ピカルディの 3 度)
        drone: ['v56 F3:3', 'C4:3', 'B3:3', 'C4:3', 'F3:3', 'G3:3', 'D4:1.5 E4:1.5', 'F#3:3'],
        ost: [
          'v66 D2+A2:.5 v42 D2+A2 v48 D2+A2 v60 D2+A2 v42 D2+A2 v48 D2+A2',
          'v66 F2+C3:.5 v42 F2+C3 v48 F2+C3 v60 F2+C3 v42 F2+C3 v48 F2+C3',
          'v66 G2+D3:.5 v42 G2+D3 v48 G2+D3 v60 G2+D3 v42 G2+D3 v48 G2+D3',
          'v66 C2+G2:.5 v42 C2+G2 v48 C2+G2 v60 C2+G2 v42 C2+G2 v48 C2+G2',
          'v66 D2+A2:.5 v42 D2+A2 v48 D2+A2 v60 D2+A2 v42 D2+A2 v48 D2+A2',
          'v66 C2+G2:.5 v42 C2+G2 v48 C2+G2 v60 C2+G2 v42 C2+G2 v48 C2+G2',
          'v66 G2+D3:.5 v42 G2+D3 v48 G2+D3 v60 C2+G2 v42 C2+G2 v48 C2+G2',
          'v60 D2+A2:3',
        ],
        harp: [
          'D3:.5 A3 E4 F4 E4 A3',
          'F3:.5 C4 G4 A4 G4 C4',
          'G2:.5 D3 A3 B3 A3 D3',
          'C3:.5 G3 D4 E4 D4 G3',
          'D3:.5 A3 E4 F4 E4 A3',
          'C3:.5 G3 D4 E4 D4 G3',
          'G2:.5 D3 B3 C3 G3 E4',
          'D3:.5 A3 D4 F#4 A4:1',
        ],
        drum: [
          'v66 bd:1 v34 tumba:.5 v52 bd:1 v34 tumba:.5',
          'v60 bd:1 v34 tumba:.5 v52 bd:1 v34 tumba:.5',
          'v60 bd:1 v34 tumba:.5 v52 bd:1 v34 tumba:.5',
          'v60 bd:1 v34 tumba:.5 v52 bd:1 v38 tumba:.5',
          'v66 bd:1 v34 tumba:.5 v52 bd:1 v34 tumba:.5',
          'v60 bd:1 v34 tumba:.5 v52 bd:1 v34 tumba:.5',
          'v60 bd:1 v34 tumba:.5 v42 tumba:.5 v48 tumba v54 tumba',
          'v62 bd:3',
        ],
      },
    },
  ],
  intro: ['intro'],
  loop: ['A', 'B', 'C', 'A2'],
}
