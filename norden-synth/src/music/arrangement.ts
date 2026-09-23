// 伴奏セット: どの奏者がどの役割をどの音域で受け持つか。アーティクル (いくつかのセクションのまとまり) ごとに切り替える。
// 1 つのセットの中で、1 人の奏者は 1 つの役割だけを受け持つ。セットにない役割は鳴らない

import type { RoleId, Seat } from './context.ts'
import type { Random } from './random.ts'

export interface Arrangement {
  id: string
  name: string
  seats: Seat[]
}

const timpani: Seat = { role: 'percussion', player: 'timpani', lo: 40, hi: 59 }
const choirPad: Seat = { role: 'pad', player: 'choir', lo: 55, hi: 74 }
const pizzicato: Seat = { role: 'ostinato', player: 'pizzicato', lo: 48, hi: 67 }
const contrabass: Seat = { role: 'bass', player: 'contrabass', lo: 28, hi: 52 }

export const ARRANGEMENTS: Arrangement[] = [
  {
    id: 'strings-harp',
    name: '弦楽とハープ',
    seats: [
      contrabass,
      { role: 'melody', player: 'cello', lo: 50, hi: 77 },
      { role: 'counter', player: 'violin', lo: 64, hi: 91 },
      { role: 'chords', player: 'viola', lo: 55, hi: 71 },
      choirPad,
      pizzicato,
      { role: 'arpeggio', player: 'harp', lo: 50, hi: 90, style: 'roll' },
      timpani,
      { role: 'bells', player: 'piano', lo: 72, hi: 96, gain: 0.85 },
    ],
  },
  {
    id: 'piano-song',
    name: 'ピアノの歌',
    seats: [
      contrabass,
      { role: 'melody', player: 'piano', lo: 60, hi: 86, gain: 1.1 },
      { role: 'counter', player: 'cello', lo: 48, hi: 67 },
      { role: 'chords', player: 'viola', lo: 55, hi: 71 },
      choirPad,
      pizzicato,
      { role: 'arpeggio', player: 'harp', lo: 48, hi: 84, style: 'roll' },
      timpani,
      { role: 'bells', player: 'violin', lo: 76, hi: 93, gain: 0.75 },
    ],
  },
  {
    id: 'violin-flow',
    name: 'バイオリンと流れる和音',
    seats: [
      contrabass,
      { role: 'melody', player: 'violin', lo: 62, hi: 88 },
      { role: 'counter', player: 'cello', lo: 48, hi: 67 },
      { role: 'arpeggio', player: 'viola', lo: 50, hi: 74 },
      { role: 'chords', player: 'piano', lo: 52, hi: 72, gain: 0.85 },
      choirPad,
      pizzicato,
      timpani,
      { role: 'bells', player: 'harp', lo: 72, hi: 91 },
    ],
  },
  {
    id: 'piano-accompaniment',
    name: 'ピアノ伴奏',
    seats: [
      { role: 'bass', player: 'cello', lo: 36, hi: 55 },
      { role: 'melody', player: 'violin', lo: 62, hi: 88 },
      { role: 'counter', player: 'viola', lo: 55, hi: 76 },
      { role: 'arpeggio', player: 'piano', lo: 45, hi: 72, gain: 0.9 },
      choirPad,
      pizzicato,
      timpani,
      { role: 'bells', player: 'harp', lo: 72, hi: 91 },
    ],
  },
  {
    id: 'viola-song',
    name: 'ビオラの歌',
    seats: [
      contrabass,
      { role: 'melody', player: 'viola', lo: 55, hi: 79 },
      { role: 'counter', player: 'violin', lo: 67, hi: 91 },
      { role: 'arpeggio', player: 'harp', lo: 50, hi: 86, style: 'roll' },
      { role: 'chords', player: 'piano', lo: 52, hi: 72, gain: 0.85 },
      choirPad,
      { role: 'ostinato', player: 'cello', lo: 43, hi: 62 },
      timpani,
      { role: 'bells', player: 'pizzicato', lo: 72, hi: 91 },
    ],
  },
  {
    id: 'chamber',
    name: '室内楽',
    seats: [
      contrabass,
      { role: 'melody', player: 'cello', lo: 50, hi: 77 },
      { role: 'counter', player: 'viola', lo: 57, hi: 76 },
      { role: 'arpeggio', player: 'piano', lo: 48, hi: 76, gain: 0.85 },
      timpani,
      { role: 'bells', player: 'harp', lo: 72, hi: 91 },
    ],
  },
]

export function seatOf(arrangement: Arrangement, role: RoleId): Seat | undefined {
  return arrangement.seats.find((s) => s.role === role)
}

// 次のアーティクルの伴奏セット。直前と同じものは選ばない
export function chooseArrangement(prev: Arrangement | undefined, rng: Random): Arrangement {
  return rng.pick(ARRANGEMENTS.filter((a) => a !== prev))
}
