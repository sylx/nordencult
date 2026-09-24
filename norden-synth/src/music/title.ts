// ソングの曲名。シードとソングの番号から、主題の調 (スケールの地域) と拍子に合う言葉を組み合わせて作る。
// 曲名専用の乱数を使うので、曲の中身には影響しない

import type { Meter } from './form.ts'
import { Random } from './random.ts'
import type { Key } from './scales.ts'

type Region = 'north' | 'east' | 'india' | 'farEast'

const REGIONS: Record<string, Region> = {
  aeolian: 'north',
  dorian: 'north',
  mixolydian: 'north',
  lydian: 'north',
  'minor-pentatonic': 'north',
  egyptian: 'north',
  todi: 'india',
  marwa: 'india',
  hirajoshi: 'farEast',
  in: 'farEast',
  iwato: 'farEast',
  pelog: 'farEast',
}

// 風景や物の名前 (地域ごと + 共通)。「の」でつなぐので、「の」を含む語や時を表す語は入れない
const NOUNS: Record<Region | 'common', string[]> = {
  north: ['霧', '氷河', '白樺林', '入り江', '北風', '灯台', '雪原', '白夜', '立石', '渡り鳥', '海霧', '苔むす丘', '凍てる湖', '峡湾', '極光'],
  east: ['砂丘', '隊商', '蜃気楼', '香炉', '回廊', '星図', '古井戸', '絨毯', '尖塔', '市場', '砂時計', '泉', '城門', '葡萄園', '見張り塔'],
  india: ['蓮', '河岸', '沐浴', '象使い', '菩提樹', '灯明', '寺院', '雨季', '孔雀', '香辛料', '大河'],
  farEast: ['箏', '月影', '社', '霧雨', '鈴', '竹林', '灯籠', '苔庭', '水鏡', '銅鑼', '島影', '稲穂', '祭囃子', '夕凪'],
  common: ['風', '月', '星', '夢', '記憶', '旅人', '影', '灯', '水辺', '鐘', '羅針盤', '地図', '小舟', '手紙', '足跡', '祈り', '炎', '雨'],
}

const ADJECTIVES = ['遠い', '静かな', '忘れられた', '名もなき', '眠れる', '古き', '青い', '銀の', '揺れる', '消えた', '最後の', '白い', '終わらない', '見知らぬ']

const TIMES = ['夜明け', '黄昏', '真夜中', '冬至', '満月', '朝霧', '宵', '雨上がり', '千年']

// 音楽の形。変拍子では踊りの言葉を多くする
const FORMS = { plain: ['うた', '祈り', '子守歌', '変奏', '物語', '行進', '哀歌'], odd: ['舞', '踊り', '祭り', '輪舞'] }

const ENDINGS = ['へ', 'に寄せて', 'を越えて', 'をさがして', 'の向こう']

export function songTitle(seed: number, song: number, key: Key, meter: Meter): string {
  const rng = Random.derive(seed, `song${song}:title`)
  const region = REGIONS[key.scale.id] ?? 'east'
  // 地域の言葉を多めに、共通の言葉を混ぜる
  const noun = (avoid?: string) => {
    const pool = rng.chance(0.7) ? NOUNS[region] : NOUNS.common
    const choices = pool.filter((w) => w !== avoid)
    return rng.pick(choices)
  }
  const form = () => rng.pick(meter.odd && rng.chance(0.7) ? FORMS.odd : FORMS.plain)
  const templates: [number, () => string][] = [
    [3, () => `${rng.pick(ADJECTIVES)}${noun()}`],
    [3, () => { const a = noun(); return `${a}の${noun(a)}` }],
    [2, () => `${rng.pick(TIMES)}の${noun()}`],
    [2, () => `${noun()}の${form()}`],
    [2, () => `${noun()}${rng.pick(ENDINGS)}`],
    [1.5, () => `${rng.pick(ADJECTIVES)}${noun()}の${form()}`],
    [1, () => { const a = noun(); return `${a}と${noun(a)}` }],
  ]
  return rng.weighted(templates, ([w]) => w)[1]()
}
