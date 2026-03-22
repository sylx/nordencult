// Client-safe constants (no Node.js imports)

export const SPRITE_COLS = 5;
export const SPRITE_ROWS = 3;
export const CELL_W = 1024;
export const CELL_H = 1536;
export const CELL_PADDING = 50;

export const CHARACTER_TYPES = ["knight", "scholar", "politician", "magician", "hunter"] as const;
export const CHARACTER_TYPE_LABELS: Record<string, string> = {
  knight: "騎士",
  scholar: "学者",
  politician: "政治家",
  magician: "魔法使い",
  hunter: "狩人",
};

export const RELATION_TYPES = ["father", "mother", "son", "daughter", "brother", "sister", "married", "best_friend"] as const;

export const FACTIONS = [
  { id: "valhardt", name: "ヴァルハルト家" },
  { id: "dracken", name: "ドラーケン家" },
  { id: "leonis", name: "レオニス帝国" },
  { id: "carta", name: "カルタ書院" },
  { id: "aqua", name: "アクア商会" },
  { id: "rosalia", name: "ロザリア家" },
  { id: "taurus", name: "タウルス自由都市連合" },
  { id: "sede", name: "法王府" },
] as const;

export const CITIES = [
  { id: "P000", name: "灰都 アシュダール" },
  { id: "P001", name: "カルデア" },
  { id: "P002", name: "ハルヴァン" },
  { id: "P003", name: "ダルム" },
  { id: "P004", name: "アンバリア" },
  { id: "P005", name: "ヴェルスタ" },
  { id: "P006", name: "サルビア" },
  { id: "P007", name: "アクアルム" },
  { id: "P008", name: "ティルナ" },
  { id: "P009", name: "デルタ・ポルト" },
  { id: "P010", name: "ソルナ" },
  { id: "P011", name: "コルネリア" },
  { id: "P012", name: "フルーエン" },
  { id: "P013", name: "エルドラン" },
  { id: "P014", name: "イグニス" },
  { id: "P015", name: "ブルムハーゲン" },
  { id: "P016", name: "アルガルデ" },
  { id: "P017", name: "オスタリア" },
  { id: "P018", name: "セルニア" },
  { id: "P019", name: "ノルデン" },
  { id: "P020", name: "ラドゥン" },
  { id: "P021", name: "コーカサ" },
  { id: "P022", name: "マルカヴァ" },
  { id: "P023", name: "メディア" },
  { id: "P024", name: "ガルドハイム" },
  { id: "P025", name: "ヴェサンタ" },
  { id: "P026", name: "シルヴァ" },
  { id: "P027", name: "アルカナム" },
  { id: "P028", name: "レンハウス" },
  { id: "P029", name: "ヘクサリア" },
  { id: "P030", name: "タルガル" },
] as const;
