/**
 * 台本（1 シーンにつき 1 つの JSON）の型。台本はセリフ・話し手・立ち絵・背景・音・選択肢の文言を持ち、分岐は持たない。
 * 分岐・条件・状態の更新は流れ（defineScene の run）が書く
 */

/** 変数の型: 騎士 ID・都市 ID・数・文字列 */
export type ParamType = 'character' | 'city' | 'number' | 'string'

export const PARAM_TYPES: readonly ParamType[] = ['character', 'city', 'number', 'string']

/** 立ち絵の位置 */
export type Position = 'left' | 'center' | 'right'

export const POSITIONS: readonly Position[] = ['left', 'center', 'right']

export type PortraitFx = 'fade' | 'slide' | 'none'
export type BackgroundFx = 'fade' | 'cut'

/** 文言。配列は 1 要素が 1 ページ（[] なら何も言わない） */
export type Lines = string | readonly string[]

/** 話し手の騎士の口調 → 文言 */
export type Tones = Readonly<Record<string, Lines>>

/** 話し手の騎士 ID → 文言 */
export type CharacterLines = Readonly<Record<string, Lines>>

/**
 * 顔付きのセリフ。`say` は騎士 ID か変数（"$merc"）。`name` で名前だけ差し替える。`tones` は話し手の口調で、
 * `characters` は話し手その人で差し替える文言（`characters` が先）
 */
export interface SayCommand { say: string; text: Lines; name?: string; tones?: Tones; characters?: CharacterLines }
/** 顔の無い話し手 */
export interface NameCommand { name: string; text: Lines }
/** 地の文 */
export interface NarrateCommand { narrate: Lines }
export interface ShowCommand { show: string; at: Position; fx?: PortraitFx }
/** `hide: "all"` で全員を消す */
export interface HideCommand { hide: string; fx?: PortraitFx }
export interface MoveCommand { move: string; at: Position }
/** null で黒 */
export interface BackgroundCommand { bg: string | null; fx?: BackgroundFx }
/** 画面全体の暗転（out）・明転（in） */
export interface FadeCommand { fade: 'out' | 'in'; color?: 'black' | 'white'; ms?: number }
/** 背景だけを暗くする（立ち絵・資料はそのまま）。0（暗くしない）〜 1（真っ黒）。背景を替えても残る */
export interface DimCommand { dim: number; ms?: number }
export interface ShakeCommand { shake: 'small' | 'large' }
export interface FlashCommand { flash: 'white' | 'red' }
export interface WaitCommand { wait: number }
/** 曲 id。null でフェードアウト */
export interface BgmCommand { bgm: string | null }
export interface SeCommand { se: string }
/** ゲームの資料（傭兵のプロフィールなど。DialogueProviders.panel が描く）をカットの上に出す。null で消す */
export interface PanelCommand { panel: string | null; at?: Position }

export type Command =
  | SayCommand | NameCommand | NarrateCommand | ShowCommand | HideCommand | MoveCommand | BackgroundCommand
  | FadeCommand | DimCommand | ShakeCommand | FlashCommand | WaitCommand | BgmCommand | SeCommand | PanelCommand

/** 命令の種類（先頭のキー） */
export type CommandKind = 'say' | 'name' | 'narrate' | 'show' | 'hide' | 'move' | 'bg' | 'fade' | 'dim' | 'shake' | 'flash' | 'wait' | 'bgm' | 'se' | 'panel'

export const COMMAND_KINDS: readonly CommandKind[] = ['say', 'name', 'narrate', 'show', 'hide', 'move', 'bg', 'fade', 'dim', 'shake', 'flash', 'wait', 'bgm', 'se', 'panel']

export interface Choice {
  /** 選択肢のキー → 文言。並びがボタンの並び */
  options: Readonly<Record<string, string>>
}

export interface Script {
  $schema?: string
  title: string
  /** 流れから渡す変数 */
  params?: Readonly<Record<string, ParamType>>
  /** ブロック名 → 命令の列 */
  blocks: Readonly<Record<string, readonly Command[]>>
  choices?: Readonly<Record<string, Choice>>
}

/** 命令の種類: 先頭のキー。知らない命令なら undefined */
export function commandKind(command: object): CommandKind | undefined {
  const key = Object.keys(command)[0]
  return (COMMAND_KINDS as readonly string[]).includes(key) ? key as CommandKind : undefined
}

/**
 * 台本の JSON を import した値の型（文字列の値は string に広がるが、ブロック名・選択肢の名前とキー・変数の名前は残る）。
 * 流れの型（ブロック名・選択肢）はここから引く。中身の正しさは validateScript で見る
 */
export interface ScriptShape {
  title: string
  params?: { readonly [name: string]: string }
  blocks: { readonly [name: string]: readonly object[] }
  choices?: { readonly [name: string]: { readonly options: { readonly [key: string]: string } } }
}

export type BlockName<S extends ScriptShape> = keyof S['blocks'] & string
type Choices<S extends ScriptShape> = NonNullable<S['choices']>
export type ChoiceName<S extends ScriptShape> = keyof Choices<S> & string
export type OptionKey<S extends ScriptShape, C extends ChoiceName<S>> = keyof Choices<S>[C]['options'] & string
export type ParamName<S extends ScriptShape> = keyof NonNullable<S['params']> & string
/** 変数の値: 騎士・都市は ID、数は number */
export type Vars<S extends ScriptShape> = { [K in ParamName<S>]: string | number }

/** 文言のページ */
export const pagesOf = (lines: Lines): readonly string[] => (typeof lines === 'string' ? [lines] : lines)
