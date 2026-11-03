// ゲーム本体（nordencult）から使う公開 API。ソースのまま使う（ルートの vite.config.ts の alias）

// 台本の型と検査
export type {
  BackgroundFx, BlockName, Choice, ChoiceName, Command, CommandKind, Lines, OptionKey, ParamName, ParamType, PortraitFx, Position, Script, ScriptShape, Tones, Vars,
} from './script'
export { COMMAND_KINDS, PARAM_TYPES, POSITIONS, commandKind, pagesOf } from './script'
export { scriptErrors, validateScript } from './validate'
export type { ScriptCatalog, ScriptProblem } from './validate'
export { formatScript } from './format'
export { placeholders, expandText } from './text'

// シーンの実行
export { ScriptError, defineScene, isAborted, playBlock, runScene } from './scene'
export type { AnyScene, InputOf, InputSpec, PlayOptions, RunOptions, Scene, SceneContext, SceneRun } from './scene'

// 画面
export { DialogueAborted, DialoguePlayer, TIMING } from './player'
export type { CharacterInfo, ChoiceOption, DialogueProviders, PlayerView, Rect, ScenePlayer, Step } from './player'
export { DialogueView } from './view/DialogueView'
export { CharacterFace } from './view/CharacterFace'
export { ScriptedPlayer } from './testing'
export type { DialogueViewProps } from './view/DialogueView'
