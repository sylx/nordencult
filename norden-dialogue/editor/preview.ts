import { DialoguePlayer, isAborted, playBlock, type ScriptShape } from 'norden-dialogue'
import { seededRandom } from './edit'
import { DIALOGUE_PROVIDERS, GameRuleError, createInitialState, runDialogue, stateChanges, type DialogueId } from './game'

/** 通し再生の 1 回: 流し直しに使う */
export interface SceneRun {
  id: DialogueId
  input: Record<string, string | number>
  seed: number
  tones: Readonly<Record<string, string>>
}

export interface PreviewState {
  /** 再生中のもの（null: 止まっている） */
  playing: string | null
  /** 通し再生の選択の履歴 */
  history: readonly { choice: string; key: string }[]
  /** 通し再生が終わったときの状態の変化、またはエラー */
  log: readonly string[]
  error: string | null
  /** 最後の通し再生（流し直しに使う） */
  run: SceneRun | null
}

const IDLE: PreviewState = { playing: null, history: [], log: [], error: null, run: null }

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** プレビューのプレイヤーと再生。新しく再生すると、それまでの再生は打ち切る */
export class Preview {
  readonly player = new DialoguePlayer(DIALOGUE_PROVIDERS)
  private state: PreviewState = IDLE
  private readonly listeners = new Set<() => void>()
  private current: Promise<unknown> | null = null

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = () => this.state

  private set(change: Partial<PreviewState>) {
    this.state = { ...this.state, ...change }
    for (const listener of this.listeners) listener()
  }

  /** 再生中のものをやめ、曲を止める */
  async stop() {
    this.player.abort()
    await this.current?.catch(() => {})
    this.current = null
    DIALOGUE_PROVIDERS.playBgm(null)
    this.set({ playing: null })
  }

  private async start(label: string, play: () => Promise<void>) {
    await this.stop()
    this.set({ playing: label, error: null })
    const done = play()
    this.current = done
    try {
      await done
    } catch (error) {
      if (!isAborted(error)) this.set({ error: message(error) })
    } finally {
      if (this.current === done) {
        this.current = null
        DIALOGUE_PROVIDERS.playBgm(null)
        this.set({ playing: null })
      }
    }
  }

  /** 台本の 1 ブロックだけを、変数の仮の値で */
  playBlock(script: ScriptShape, block: string, vars: Record<string, unknown>, tones: Readonly<Record<string, string>>) {
    return this.start(`ブロック ${block}`, () => playBlock(script, block, vars, { player: this.player, tones }))
  }

  /** 流れごと、ゲームの初期状態から。`replay` の選択までは飛ばして流し直す */
  playScene(run: SceneRun, replay: readonly string[] = []) {
    const before = createInitialState()
    const history: { choice: string; key: string }[] = []
    this.set({ run, history, log: [] })
    return this.start('通し再生', async () => {
      try {
        const after = await runDialogue(run.id, run.input as never, {
          state: before, player: this.player, random: seededRandom(run.seed), replay, tones: run.tones,
          onChoose: (choice, key) => {
            history.push({ choice, key })
            this.set({ history: [...history] })
          },
        })
        const changes = stateChanges(before, after)
        this.set({ log: changes.length > 0 ? changes : ['（状態の変化なし）'] })
      } catch (error) {
        if (error instanceof GameRuleError) this.set({ log: [`規則の違反で打ち切り（何も反映しない）: ${error.message}`] })
        else throw error
      }
    })
  }

  /** 履歴の `index` 番目の選択の前まで流し直し、そこから選び直す */
  replayUntil(index: number) {
    const { run, history } = this.state
    if (run) return this.playScene(run, history.slice(0, index).map((h) => h.key))
  }
}
