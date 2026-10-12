/** 騎士の口調と性格。会話やコマンド実行時のつぶやきを選ぶのに使う（norden-data のエディタでも読む） */

export const VOICE_TONE_IDS = [
  // 男性系
  'noble_male',       // 騎士道・正統派（私/貴公/〜だ、〜である）
  'earnest_youth',    // 真面目・新米青年（僕/あなた/〜です、〜ます）
  'wild_berserker',   // 荒くれ・好戦的（俺/てめぇ/〜ぜ、〜だろ）
  'veteran_soldier',  // 老練・歴戦の古豪（ワシ/お主/〜じゃ、〜わい）
  'cool_tactician',   // 冷静・皮肉屋・知将（私/君/〜だな、〜だろう）
  'fanatic_zealot',   // 狂信・冷徹・暗黒系（我/汝/〜よ、〜消え去れ）

  // 女性系
  'valkyrie_female',  // 凛々しい女騎士（私/貴殿/〜だ、〜いくぞ）
  'noble_lady',       // 高貴・令嬢・聖職者（私/あなた/〜ですわ、〜なさい）
  'tomboy_warrior',   // 勝ち気・ボーイッシュ（アタシ/あんた/〜だよ、〜だね）
  'cool_female',      // 寡黙・クール（私/お前/〜……、〜だ）
  'sisterly_veteran', // 姉御肌・世話焼き（アタシ/あんた/〜かい、〜さ）

  // 中性・特殊
  'eccentric_scholar', // 変人魔術師・策士（僕or小生/君/〜かね、〜だよ）
] as const

export type VoiceToneId = (typeof VOICE_TONE_IDS)[number]

export const VOICE_TONE_LABELS: Readonly<Record<VoiceToneId, string>> = {
  noble_male: '騎士道・正統派（私/貴公/〜だ、〜である）',
  earnest_youth: '真面目・新米青年（僕/あなた/〜です、〜ます）',
  wild_berserker: '荒くれ・好戦的（俺/てめぇ/〜ぜ、〜だろ）',
  veteran_soldier: '老練・歴戦の古豪（ワシ/お主/〜じゃ、〜わい）',
  cool_tactician: '冷静・皮肉屋・知将（私/君/〜だな、〜だろう）',
  fanatic_zealot: '狂信・冷徹・暗黒系（我/汝/〜よ、〜消え去れ）',
  valkyrie_female: '凛々しい女騎士（私/貴殿/〜だ、〜いくぞ）',
  noble_lady: '高貴・令嬢・聖職者（私/あなた/〜ですわ、〜なさい）',
  tomboy_warrior: '勝ち気・ボーイッシュ（アタシ/あんた/〜だよ、〜だね）',
  cool_female: '寡黙・クール（私/お前/〜……、〜だ）',
  sisterly_veteran: '姉御肌・世話焼き（アタシ/あんた/〜かい、〜さ）',
  eccentric_scholar: '変人魔術師・策士（僕or小生/君/〜かね、〜だよ）',
}

/** エディタの選択肢の見出し */
export const VOICE_TONE_GROUPS: readonly { label: string; ids: readonly VoiceToneId[] }[] = [
  { label: '男性系', ids: ['noble_male', 'earnest_youth', 'wild_berserker', 'veteran_soldier', 'cool_tactician', 'fanatic_zealot'] },
  { label: '女性系', ids: ['valkyrie_female', 'noble_lady', 'tomboy_warrior', 'cool_female', 'sisterly_veteran'] },
  { label: '中性・特殊', ids: ['eccentric_scholar'] },
]

export const PERSONALITY_TAGS = [
  // 行動・戦闘スタイル
  'aggressive',   // 猪突猛進・好戦的（突撃派）
  'cautious',     // 慎重・深謀遠慮（守備・策動派）
  'valiant',      // 勇猛果敢・正義感（騎士道の鑑）
  'pragmatic',    // 合理主義・結果至上（勝てばよかろう）

  // 信条・主君へのスタンス
  'loyal',        // 忠義一筋（命令絶対）
  'ambitious',    // 野心家・野望（いずれは一国一城）
  'devout',       // 信仰厚い・敬虔（神や教義を重んじる）
  'nihilist',     // 懐疑的・ドライ（神も大義も信じない）

  // 人間関係・陣営内での気質
  'generous',     // 寛容・人情家（部下思い）
  'strict',       // 厳格・規律重視（軍規違反は許さない）
  'stubborn',     // 頑固・意地っ張り（他人の意見を聞かない）
  'sociable',     // 社交的・陽気（酒好き、ムードメーカー）

  // 特徴的・ドラマを生む癖
  'glory_seeker', // 功名心（手柄を焦る）
  'pessimist',    // 悲観的・心配性（常に最悪を想定）
  'mentor_spirit', // 後進育成・面倒見が良い
  'lone_wolf',    // 一匹狼・孤高
  'arrogant',     // 高慢（まわりを下に見る）
  'enigmatic',    // 不思議（天然、何を考えているかわからない）
] as const

export type PersonalityTag = (typeof PERSONALITY_TAGS)[number]

export const PERSONALITY_LABELS: Readonly<Record<PersonalityTag, string>> = {
  aggressive: '猪突猛進・好戦的（突撃派）',
  cautious: '慎重・深謀遠慮（守備・策動派）',
  valiant: '勇猛果敢・正義感（騎士道の鑑）',
  pragmatic: '合理主義・結果至上（勝てばよかろう）',
  loyal: '忠義一筋（命令絶対）',
  ambitious: '野心家・野望（いずれは一国一城）',
  devout: '信仰厚い・敬虔（神や教義を重んじる）',
  nihilist: '懐疑的・ドライ（神も大義も信じない）',
  generous: '寛容・人情家（部下思い）',
  strict: '厳格・規律重視（軍規違反は許さない）',
  stubborn: '頑固・意地っ張り（他人の意見を聞かない）',
  sociable: '社交的・陽気（酒好き、ムードメーカー）',
  glory_seeker: '功名心（手柄を焦る）',
  pessimist: '悲観的・心配性（常に最悪を想定）',
  mentor_spirit: '後進育成・面倒見が良い',
  lone_wolf: '一匹狼・孤高',
  arrogant: '高慢（まわりを下に見る）',
  enigmatic: '不思議（天然、何を考えているかわからない）',
}

/** 性格の 4 軸。1 人が軸ごとに 1 つまで持つ */
export const PERSONALITY_AXES: readonly { label: string; tags: readonly PersonalityTag[] }[] = [
  { label: '行動・戦闘スタイル', tags: ['aggressive', 'cautious', 'valiant', 'pragmatic'] },
  { label: '信条・主君へのスタンス', tags: ['loyal', 'ambitious', 'devout', 'nihilist'] },
  { label: '人間関係・陣営内での気質', tags: ['generous', 'strict', 'stubborn', 'sociable'] },
  { label: '特徴的・ドラマを生む癖', tags: ['glory_seeker', 'pessimist', 'mentor_spirit', 'lone_wolf', 'arrogant', 'enigmatic'] },
]
