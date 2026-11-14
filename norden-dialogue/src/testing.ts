import type { ChoiceOption, DialogueProviders, ScenePlayer, Step } from './player'

/** テスト用のプレイヤー: 命令を記録し、選択肢は決めた順に選ぶ（押せないものを選ぼうとすると落ちる） */
export class ScriptedPlayer implements ScenePlayer {
  readonly providers: DialogueProviders
  readonly steps: Step[] = []
  /** 出された選択肢 */
  readonly offered: (readonly ChoiceOption[])[] = []
  readonly skipping: boolean[] = []
  private readonly picks: string[]

  constructor(providers: DialogueProviders, picks: readonly string[] = []) {
    this.providers = providers
    this.picks = [...picks]
  }

  begin() {}
  end() {}

  perform(step: Step) {
    this.steps.push(step)
    return Promise.resolve()
  }

  choose(options: readonly ChoiceOption[]) {
    this.offered.push(options)
    const key = this.picks.shift()
    const option = options.find((o) => o.key === key)
    if (!option) return Promise.reject(new Error(`選ぶものがありません: ${options.map((o) => o.key).join('・')}`))
    if (option.disabled) return Promise.reject(new Error(`${key} は選べません: ${option.disabled}`))
    return Promise.resolve(option.key)
  }

  setSkipping(skipping: boolean) {
    this.skipping.push(skipping)
  }

  /** 出たセリフ・地の文（ページごと） */
  get texts(): string[] {
    return this.steps.flatMap((s) => (s.kind === 'message' ? s.pages : []))
  }
}
