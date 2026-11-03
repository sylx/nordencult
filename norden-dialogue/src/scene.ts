import { DialogueAborted, type ChoiceOption, type ScenePlayer, type Step } from './player'
import {
  pagesOf, type BlockName, type ChoiceName, type Command, type OptionKey, type ParamName, type ParamType, type Script, type ScriptShape, type Vars,
} from './script'
import { expandText } from './text'
import { scriptErrors, validateScript } from './validate'

/** 流れの入力の宣言（入力の名前 → 型）。エディタとデバッグコンソールはこれを見て値を選ばせる */
export type InputSpec = Readonly<Record<string, ParamType>>

/** 入力の値: 騎士・都市は ID、数は number */
export type InputOf<I extends InputSpec> = { -readonly [K in keyof I]: I[K] extends 'number' ? number : string }

export interface SceneContext<S extends ScriptShape, State> {
  /** シーン用の写し。シーンが終わったときに一度にゲームへ反映する */
  readonly state: State
  update(change: (state: State) => State): void
  /** 台本の変数に値を入れる。以後の play・choose で使う */
  bind(vars: Partial<Vars<S>>): void
  play(block: BlockName<S>): Promise<void>
  /** 選んだ選択肢のキー。`disabled` の理由のある選択肢は押せない（null・undefined は押せる） */
  choose<C extends ChoiceName<S>>(choice: C, options?: { disabled?: Partial<Record<OptionKey<S, C>, string | null | undefined>> }): Promise<OptionKey<S, C>>
  /** ゲームでは Math.random、エディタでは種を決めた乱数。シーンの中で Math.random は使わない */
  random(): number
  /** 変数の騎士の口調（無ければ undefined）。エディタで口調を選び直していればそれ */
  toneOf(param: ParamName<S>): string | undefined
}

export type SceneRun<S extends ScriptShape, State, I extends InputSpec> = (ctx: SceneContext<S, State>, input: InputOf<I>) => Promise<void>

export interface Scene<S extends ScriptShape, State, I extends InputSpec> {
  readonly script: S
  readonly input: I
  readonly run: SceneRun<S, State, I>
  /** エディタ・デバッグコンソールで入力を省いたときの値 */
  readonly sample?: (state: State) => InputOf<I> | null
}

/** どのシーンでも受けるときの型 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyScene<State> = Scene<any, State, any>

/** 台本（import した JSON）と入力の宣言と流れから、シーンを作る */
export function defineScene<S extends ScriptShape, State, I extends InputSpec>(
  script: S, input: I, run: SceneRun<S, State, I>, sample?: (state: State) => InputOf<I> | null,
): Scene<S, State, I> {
  return { script, input, run, sample }
}

/** 台本の誤り（validateScript のエラー）で再生できない */
export class ScriptError extends Error {}

export interface PlayOptions {
  player: ScenePlayer
  /** 変数の騎士の口調の代わり（変数名 → 口調）。エディタのプレビュー用 */
  tones?: Readonly<Record<string, string>>
}

export interface RunOptions<State> extends PlayOptions {
  state: State
  random?: () => number
  /** 先に流し直す選択の履歴（選択肢のキー）。そこまでは演出を飛ばし、クリックを待たない */
  replay?: readonly string[]
  /** 選択肢を選ぶたびに（流し直しの分も） */
  onChoose?: (choice: string, key: string) => void
}

/** 値が変数の型に合わなければその理由 */
function valueProblem(player: ScenePlayer, name: string, type: ParamType, value: unknown): string | null {
  switch (type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? null : `${name} は数にしてください: ${String(value)}`
    case 'string':
      return typeof value === 'string' ? null : `${name} は文字列にしてください: ${String(value)}`
    case 'character':
      return typeof value === 'string' && player.providers.character(value) ? null : `${name}: 存在しない騎士 ID です: ${String(value)}`
    case 'city':
      return typeof value === 'string' && player.providers.city(value) ? null : `${name}: 存在しない都市 ID です: ${String(value)}`
  }
}

/** 台本の命令を、変数を展開した 1 歩にして渡す */
class Performer {
  readonly script: Script
  readonly player: ScenePlayer
  readonly vars: Record<string, string | number> = {}
  private readonly tones: Readonly<Record<string, string>>

  constructor(script: ScriptShape, { player, tones = {} }: PlayOptions) {
    const errors = scriptErrors(validateScript(script))
    if (errors.length > 0) throw new ScriptError(`台本に誤りがあります: ${errors.map((e) => `${e.path} ${e.message}`).join(' / ')}`)
    this.script = script as Script
    this.player = player
    this.tones = tones
  }

  bind(vars: Readonly<Record<string, unknown>>) {
    const params = this.script.params ?? {}
    for (const [name, value] of Object.entries(vars)) {
      const type = params[name]
      if (!type) throw new Error(`台本に宣言の無い変数です: ${name}`)
      const problem = valueProblem(this.player, name, type, value)
      if (problem) throw new Error(problem)
      this.vars[name] = value as string | number
    }
  }

  private value(name: string): string | number {
    const value = this.vars[name]
    if (value === undefined) throw new Error(`変数 ${name} に値がありません（ctx.bind で入れてください）`)
    return value
  }

  /** "$merc" か騎士 ID を騎士 ID に */
  character(ref: string): string {
    return ref.startsWith('$') ? String(this.value(ref.slice(1))) : ref
  }

  /** 騎士の変数の口調（選び直していればそれ） */
  toneOf(param: string): string | undefined {
    return this.tones[param] ?? this.player.providers.character(String(this.value(param)))?.tone
  }

  text(text: string): string {
    const params = this.script.params ?? {}
    return expandText(text, ({ param }) => {
      const value = this.value(param)
      if (params[param] === 'character') return this.player.providers.character(String(value))?.name ?? String(value)
      if (params[param] === 'city') return this.player.providers.city(String(value))?.name ?? String(value)
      return typeof value === 'number' ? value.toLocaleString() : String(value)
    })
  }

  step(command: Command): Step {
    if ('say' in command) {
      const speaker = this.character(command.say)
      const tone = command.say.startsWith('$') ? this.toneOf(command.say.slice(1)) : this.player.providers.character(speaker)?.tone
      const lines = command.characters && Object.hasOwn(command.characters, speaker) ? command.characters[speaker]
        : tone !== undefined && command.tones && Object.hasOwn(command.tones, tone) ? command.tones[tone] : command.text
      const name = command.name !== undefined ? this.text(command.name) : this.player.providers.character(speaker)?.name ?? speaker
      return { kind: 'message', speaker, name, pages: pagesOf(lines).map((page) => this.text(page)) }
    }
    if ('name' in command) return { kind: 'message', name: this.text(command.name), pages: pagesOf(command.text).map((page) => this.text(page)) }
    if ('narrate' in command) return { kind: 'message', narrate: true, pages: pagesOf(command.narrate).map((page) => this.text(page)) }
    if ('show' in command) return { kind: 'show', id: this.character(command.show), at: command.at, fx: command.fx ?? 'fade' }
    if ('hide' in command) return { kind: 'hide', id: command.hide === 'all' ? 'all' : this.character(command.hide), fx: command.fx ?? 'fade' }
    if ('move' in command) return { kind: 'move', id: this.character(command.move), at: command.at }
    if ('bg' in command) return { kind: 'bg', name: command.bg, fx: command.fx ?? 'fade' }
    if ('fade' in command) return { kind: 'fade', to: command.fade, color: command.color ?? 'black', ms: command.ms ?? 600 }
    if ('shake' in command) return { kind: 'shake', size: command.shake }
    if ('flash' in command) return { kind: 'flash', color: command.flash }
    if ('wait' in command) return { kind: 'wait', ms: command.wait }
    if ('bgm' in command) return { kind: 'bgm', id: command.bgm }
    return { kind: 'se', name: command.se }
  }

  async play(block: string) {
    const commands = this.script.blocks[block]
    if (!commands) throw new Error(`台本にブロックがありません: ${block}`)
    for (const command of commands) {
      const step = this.step(command)
      if (step.kind === 'message' && step.pages.length === 0) continue
      await this.player.perform(step)
    }
  }

  options(choice: string, disabled: Readonly<Record<string, string | null | undefined>> = {}): ChoiceOption[] {
    const options = this.script.choices?.[choice]?.options
    if (!options) throw new Error(`台本に選択肢がありません: ${choice}`)
    return Object.entries(options).map(([key, text]) => ({ key, text: this.text(text), ...(disabled[key] ? { disabled: disabled[key] } : {}) }))
  }
}

/**
 * 台本の 1 ブロックだけを再生する（エディタのプレビュー）。`vars` は台本の変数
 */
export async function playBlock(script: ScriptShape, block: string, vars: Readonly<Record<string, unknown>>, options: PlayOptions): Promise<void> {
  const performer = new Performer(script, options)
  performer.bind(vars)
  options.player.begin()
  try {
    await performer.play(block)
  } finally {
    options.player.end()
  }
}

/**
 * シーンを流す。終わると最後の状態を返す。流れの中で投げられたもの（ゲームの規則の違反など）はそのまま投げ、状態は返さない
 */
export async function runScene<State, I extends InputSpec>(scene: Scene<ScriptShape, State, I>, input: InputOf<I>, options: RunOptions<State>): Promise<State> {
  const { player, random = Math.random, onChoose } = options
  for (const [name, type] of Object.entries(scene.input)) {
    const problem = valueProblem(player, name, type, (input as Record<string, unknown>)[name])
    if (problem) throw new Error(problem)
  }
  const performer = new Performer(scene.script, options)
  const replay = [...(options.replay ?? [])]
  let state = options.state
  let running = true
  const ctx: SceneContext<ScriptShape, State> = {
    get state() { return state },
    update(change) {
      if (running) state = change(state)
    },
    bind: (vars) => performer.bind(vars),
    play: (block) => performer.play(block),
    async choose(choice, { disabled } = {}) {
      const options = performer.options(choice, disabled as Record<string, string | null | undefined>)
      if (options.every((o) => o.disabled)) throw new Error(`選べる選択肢がありません: ${choice}`)
      let key: string
      if (replay.length > 0) {
        key = replay.shift()!
        const option = options.find((o) => o.key === key)
        if (!option || option.disabled) throw new Error(`流し直せません: ${choice} で ${key} は選べません`)
        if (replay.length === 0) player.setSkipping(false)
      } else {
        key = await player.choose(options)
      }
      onChoose?.(choice, key)
      return key
    },
    random: () => random(),
    toneOf: (param) => performer.toneOf(param),
  }
  player.begin()
  if (replay.length > 0) player.setSkipping(true)
  try {
    await scene.run(ctx, input)
    return state
  } finally {
    running = false
    player.setSkipping(false)
    player.end()
  }
}

export const isAborted = (error: unknown) => error instanceof DialogueAborted
