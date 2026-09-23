// 生成のパラメータ。UI はこの定義から作る

export interface BgmParams {
  seed: number
  tempo: number
  exoticism: number
  microtones: number
  modulationRate: number
  modulationDistance: number
  oddMeter: number
  sectionBars: number
  chordBars: number
  drone: number
  colorTones: number
  melodyDensity: number
  ornaments: number
  energy: number
  dynamics: number
  ritardando: number
  humanize: number
}

export interface ParamDef {
  key: Exclude<keyof BgmParams, 'seed'>
  label: string
  group: string
  description: string
  min: number
  max: number
  step: number
  // 値の候補が離散的な場合 (選択肢として出す)
  options?: number[]
  // いつから反映されるか
  applies: 'bar' | 'section'
}

export const DEFAULT_PARAMS: BgmParams = {
  seed: 1,
  tempo: 92,
  exoticism: 0.7,
  microtones: 0.3,
  modulationRate: 0.6,
  modulationDistance: 0.5,
  oddMeter: 0.5,
  sectionBars: 8,
  chordBars: 2,
  drone: 0.7,
  colorTones: 0.6,
  melodyDensity: 0.5,
  ornaments: 0.5,
  energy: 0.55,
  dynamics: 0.5,
  ritardando: 0.4,
  humanize: 0.3,
}

export const PARAM_DEFS: ParamDef[] = [
  {
    key: 'exoticism',
    label: 'エキゾチック度',
    group: '調と転調',
    description: '0 でドリアンやエオリアンなど聴き慣れた旋法、1 でペルシャやラーガ・トーディなど奇妙なスケールが選ばれやすい',
    min: 0, max: 1, step: 0.05, applies: 'section',
  },
  {
    key: 'microtones',
    label: '微分音',
    group: '調と転調',
    description: '4 分音を含むマカーム (ラースト・バヤーティー・サバー) の選ばれやすさ。0 で使わない',
    min: 0, max: 1, step: 0.05, applies: 'section',
  },
  {
    key: 'modulationRate',
    label: '転調の頻度',
    group: '調と転調',
    description: 'セクションが変わるときに調かスケールを変える確率。0 で最初の調のまま',
    min: 0, max: 1, step: 0.05, applies: 'section',
  },
  {
    key: 'modulationDistance',
    label: '転調の遠さ',
    group: '調と転調',
    description: '0 で同じ主音のまま旋法だけ変えるような近い転調、1 で共通音の少ない遠い調 (半音・増 4 度上など) へ',
    min: 0, max: 1, step: 0.05, applies: 'section',
  },
  {
    key: 'colorTones',
    label: '特性音の強調',
    group: '調と転調',
    description: 'スケールらしさを決める音 (ヒジャーズの ♭2 と長 3 度など) を根音にした和音を使う割合',
    min: 0, max: 1, step: 0.05, applies: 'bar',
  },
  {
    key: 'tempo',
    label: 'テンポ',
    group: 'リズムと構成',
    description: '四分音符/分',
    min: 50, max: 150, step: 1, applies: 'bar',
  },
  {
    key: 'oddMeter',
    label: '変拍子',
    group: 'リズムと構成',
    description: '5/8・7/8 (2+2+3)・9/8 (2+2+2+3) などの変拍子を選ぶ確率',
    min: 0, max: 1, step: 0.05, applies: 'section',
  },
  {
    key: 'sectionBars',
    label: 'セクションの長さ',
    group: 'リズムと構成',
    description: '小節数。調・拍子・編成はセクション単位で変わる',
    min: 4, max: 16, step: 4, options: [4, 8, 12, 16], applies: 'section',
  },
  {
    key: 'chordBars',
    label: '和音の長さ',
    group: 'リズムと構成',
    description: '1 つの和音が続く小節数 (0.5 は小節の途中でも変わる)',
    min: 0.5, max: 4, step: 0.5, options: [0.5, 1, 2, 4], applies: 'section',
  },
  {
    key: 'ritardando',
    label: '転調前のリタルダンド',
    group: 'リズムと構成',
    description: '転調する直前の小節でテンポを落とす量',
    min: 0, max: 1, step: 0.05, applies: 'bar',
  },
  {
    key: 'drone',
    label: 'ドローン',
    group: 'アレンジ',
    description: '低音が和音に関係なく主音を持続する割合 (セクションごとに決める)。0 で低音は和音の根音を追う',
    min: 0, max: 1, step: 0.05, applies: 'section',
  },
  {
    key: 'melodyDensity',
    label: 'メロディの密度',
    group: 'アレンジ',
    description: 'メロディの音数と細かさ',
    min: 0, max: 1, step: 0.05, applies: 'section',
  },
  {
    key: 'ornaments',
    label: '装飾音',
    group: 'アレンジ',
    description: 'メロディの前打音・モルデント・トリルの量',
    min: 0, max: 1, step: 0.05, applies: 'bar',
  },
  {
    key: 'energy',
    label: '盛り上がり',
    group: 'アレンジ',
    description: '平均的な盛り上がり。高いほど多くのパートが重なり、音も強くなる',
    min: 0, max: 1, step: 0.05, applies: 'section',
  },
  {
    key: 'dynamics',
    label: '起伏',
    group: 'アレンジ',
    description: 'セクションごとの盛り上がりの変化の大きさ。高いとドローンだけの静かなセクションも挟む',
    min: 0, max: 1, step: 0.05, applies: 'section',
  },
  {
    key: 'humanize',
    label: '揺らぎ',
    group: 'アレンジ',
    description: '発音タイミングとベロシティのばらつき',
    min: 0, max: 1, step: 0.05, applies: 'bar',
  },
]
