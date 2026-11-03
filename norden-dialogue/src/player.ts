import type { ReactNode } from 'react'
import type { BackgroundFx, PortraitFx, Position } from './script'

export interface Rect { x: number; y: number; width: number; height: number }

/** 会話に出る騎士: 名前・口調と、スプライトのシートの上の立ち絵（セル）と顔 */
export interface CharacterInfo {
  name: string
  /** 口調（`say` の `tones` のキー）。無ければ `text` */
  tone?: string
  sheetUrl: string
  sheet: { width: number; height: number }
  /** 立ち絵: シートの上のセル */
  cell: Rect
  /** 顔: セルの中の位置 */
  face: Rect
}

/** 資料を描くときに渡すもの: 出したときの台本の変数と、シーンの状態（1 ブロックだけの再生では無い） */
export interface PanelContext {
  vars: Readonly<Record<string, string | number>>
  state?: unknown
}

/** ゲームが渡すもの: 騎士・都市の名前と画像、背景の URL、BGM と効果音、資料 */
export interface DialogueProviders {
  character(id: string): CharacterInfo | undefined
  city(id: string): { name: string } | undefined
  /** 背景の画像の URL。無ければ仮のグラデーションで出る */
  background(name: string): string | undefined
  /** 曲を変える。null でフェードアウト */
  playBgm(songId: string | null): void
  playSe(name: string): void
  /** 資料（`panel` の命令）を描く。無い名前なら何も出さない */
  panel?(name: string, context: PanelContext): ReactNode
}

/** runScene がプレイヤーに渡す 1 歩: 変数を展開し、話し手の口調で文言を選んだ命令 */
export type Step =
  /** セリフ・地の文。`speaker` は顔を出す騎士、`name` は名前（地の文は無し） */
  | { kind: 'message'; speaker?: string; name?: string; narrate?: boolean; pages: readonly string[] }
  | { kind: 'show'; id: string; at: Position; fx: PortraitFx }
  | { kind: 'hide'; id: string; fx: PortraitFx }
  | { kind: 'move'; id: string; at: Position }
  | { kind: 'bg'; name: string | null; fx: BackgroundFx }
  | { kind: 'fade'; to: 'out' | 'in'; color: 'black' | 'white'; ms: number }
  | { kind: 'shake'; size: 'small' | 'large' }
  | { kind: 'flash'; color: 'white' | 'red' }
  | { kind: 'wait'; ms: number }
  | { kind: 'bgm'; id: string | null }
  | { kind: 'se'; name: string }
  /** 資料を出す（name が null なら消す）。vars・state は出したときのもの */
  | { kind: 'panel'; name: string | null; at: Position } & PanelContext

export interface ChoiceOption {
  key: string
  text: string
  /** 押せない理由 */
  disabled?: string
}

/** runScene が動かすもの。DialoguePlayer のほか、テストでは命令を記録するだけのものを使う */
export interface ScenePlayer {
  readonly providers: DialogueProviders
  begin(): void
  perform(step: Step): Promise<void>
  choose(options: readonly ChoiceOption[]): Promise<string>
  /** 流し直しの間: 命令はすぐに済ませ、クリックを待たず、音は鳴らさない（最後の曲は流し直しの後で流す） */
  setSkipping(skipping: boolean): void
  end(): void
}

/** 途中でやめた（エディタで別のブロックを再生したなど） */
export class DialogueAborted extends Error {
  constructor() {
    super('会話を打ち切りました')
  }
}

export interface PortraitView {
  id: string
  at: Position
  /** 出るときの効果 */
  fx: PortraitFx
  /** 消えるところ（その効果） */
  leaving?: PortraitFx
}

/** カットの上の資料 */
export interface PanelView extends PanelContext {
  name: string
  at: Position
  key: number
}

/** 背景の層。上の層がフェードで重なり、終わると下の層は消える。name が null なら黒 */
export interface BackgroundView {
  name: string | null
  url?: string
  key: number
  ms: number
}

export interface MessageView {
  speaker?: string
  name?: string
  narrate?: boolean
  /** 今のページ */
  text: string
  /** ページごとに変わる（1 文字ずつ出し直す） */
  key: number
  /** 全文が出ている */
  revealed: boolean
  /** クリックを待っている */
  waiting: boolean
  /** 次のページがある */
  more: boolean
}

export interface PlayerView {
  active: boolean
  /** 下から順。空なら後ろのゲームの画面が透けて見える */
  backgrounds: readonly BackgroundView[]
  portraits: readonly PortraitView[]
  panel: PanelView | null
  message: MessageView | null
  choice: readonly ChoiceOption[] | null
  fade: { color: 'black' | 'white'; opacity: 0 | 1; ms: number }
  shake: { size: 'small' | 'large'; key: number } | null
  flash: { color: 'white' | 'red'; key: number } | null
}

/** 演出の長さ（ミリ秒） */
export const TIMING = {
  portrait: { fade: 300, slide: 400, none: 0 },
  move: 400,
  background: 600,
  fade: 600,
  shake: { small: 300, large: 600 },
  flash: 250,
  /** 1 文字を出す間隔 */
  character: 30,
} as const

const IDLE: PlayerView = {
  active: false, backgrounds: [], portraits: [], panel: null, message: null, choice: null, fade: { color: 'black', opacity: 0, ms: 0 }, shake: null, flash: null,
}

/** 会話の画面の状態。runScene が命令を渡し、DialogueView が描いてクリックを返す */
export class DialoguePlayer implements ScenePlayer {
  readonly providers: DialogueProviders
  private view: PlayerView = IDLE
  private readonly listeners = new Set<() => void>()
  private serial = 0
  private skipping = false
  /** 流し直しの間に求められた曲 */
  private heldBgm: string | null | undefined
  private aborted = false
  private readonly cancels = new Set<() => void>()
  private advance: (() => void) | null = null
  private picker: ((key: string) => void) | null = null

  constructor(providers: DialogueProviders) {
    this.providers = providers
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): PlayerView => this.view

  private set(change: Partial<PlayerView>) {
    this.view = { ...this.view, ...change }
    for (const listener of this.listeners) listener()
  }

  /** 打ち切られれば DialogueAborted で落ちる約束 */
  private pending<T>(setup: (resolve: (value: T) => void) => void): Promise<T> {
    if (this.aborted) return Promise.reject(new DialogueAborted())
    return new Promise<T>((resolve, reject) => {
      const cancel = () => reject(new DialogueAborted())
      this.cancels.add(cancel)
      setup((value) => {
        this.cancels.delete(cancel)
        resolve(value)
      })
    })
  }

  private delay(ms: number): Promise<void> {
    if (this.skipping || ms <= 0) return this.aborted ? Promise.reject(new DialogueAborted()) : Promise.resolve()
    return this.pending((resolve) => { setTimeout(resolve, ms) })
  }

  begin() {
    this.aborted = false
    this.skipping = false
    this.heldBgm = undefined
    this.set({ ...IDLE, active: true })
  }

  end() {
    this.advance = null
    this.picker = null
    this.set(IDLE)
  }

  /** 再生中の会話をやめる（待っている命令は DialogueAborted で落ちる） */
  abort() {
    this.aborted = true
    for (const cancel of this.cancels) cancel()
    this.cancels.clear()
    this.end()
  }

  setSkipping(skipping: boolean) {
    this.skipping = skipping
    if (!skipping && this.heldBgm !== undefined) {
      this.providers.playBgm(this.heldBgm)
      this.heldBgm = undefined
    }
  }

  async perform(step: Step): Promise<void> {
    if (this.aborted) throw new DialogueAborted()
    const { view } = this
    switch (step.kind) {
      case 'message':
        for (const [index, text] of step.pages.entries()) {
          const more = index < step.pages.length - 1
          this.set({
            message: { speaker: step.speaker, name: step.name, narrate: step.narrate, text, key: ++this.serial, revealed: this.skipping, waiting: !this.skipping, more },
          })
          if (this.skipping) continue
          await this.pending<void>((resolve) => { this.advance = resolve })
        }
        return
      case 'show': {
        const shown = view.portraits.find((p) => p.id === step.id && !p.leaving)
        if (shown) return this.perform({ kind: 'move', id: step.id, at: step.at })
        const fx = this.skipping ? 'none' : step.fx
        this.set({ portraits: [...view.portraits.filter((p) => p.id !== step.id), { id: step.id, at: step.at, fx }] })
        return this.delay(TIMING.portrait[fx])
      }
      case 'hide': {
        const leaving = view.portraits.filter((p) => (step.id === 'all' || p.id === step.id) && !p.leaving)
        if (leaving.length === 0) return
        const fx = this.skipping ? 'none' : step.fx
        this.set({ portraits: view.portraits.map((p) => (leaving.includes(p) ? { ...p, leaving: fx } : p)) })
        await this.delay(TIMING.portrait[fx])
        this.set({ portraits: this.view.portraits.filter((p) => !leaving.some((l) => l.id === p.id) || !p.leaving) })
        return
      }
      case 'move':
        this.set({ portraits: view.portraits.map((p) => (p.id === step.id && !p.leaving ? { ...p, at: step.at } : p)) })
        return this.delay(TIMING.move)
      case 'bg': {
        const ms = this.skipping || step.fx === 'cut' ? 0 : TIMING.background
        const layer: BackgroundView = { name: step.name, url: step.name === null ? undefined : this.providers.background(step.name), key: ++this.serial, ms }
        this.set({ backgrounds: [...view.backgrounds, layer] })
        await this.delay(ms)
        this.set({ backgrounds: this.view.backgrounds.filter((b) => b.key >= layer.key) })
        return
      }
      case 'fade': {
        const ms = this.skipping ? 0 : step.ms
        this.set({ fade: { color: step.color, opacity: step.to === 'out' ? 1 : 0, ms } })
        return this.delay(ms)
      }
      case 'shake':
        this.set({ shake: { size: step.size, key: ++this.serial } })
        return this.delay(TIMING.shake[step.size])
      case 'flash':
        this.set({ flash: { color: step.color, key: ++this.serial } })
        return this.delay(TIMING.flash)
      case 'wait':
        return this.delay(step.ms)
      case 'bgm':
        if (this.skipping) this.heldBgm = step.id
        else this.providers.playBgm(step.id)
        return
      case 'se':
        if (!this.skipping) this.providers.playSe(step.name)
        return
      case 'panel':
        this.set({ panel: step.name === null ? null : { name: step.name, at: step.at, vars: step.vars, state: step.state, key: ++this.serial } })
        return
    }
  }

  choose(options: readonly ChoiceOption[]): Promise<string> {
    this.set({ choice: options })
    return this.pending<string>((resolve) => { this.picker = resolve })
  }

  /** クリック・Enter・Space: 表示の途中なら全文を出し、出し切っていれば次へ */
  click() {
    const { message } = this.view
    if (!message || this.view.choice) return
    if (!message.revealed) this.reveal()
    else if (this.advance) {
      const advance = this.advance
      this.advance = null
      this.set({ message: { ...message, waiting: false } })
      advance()
    }
  }

  /** 全文を出した（1 文字ずつ出し終えたときも） */
  reveal() {
    const { message } = this.view
    if (message && !message.revealed) this.set({ message: { ...message, revealed: true } })
  }

  /** 選択肢を選ぶ（押せないものは選べない） */
  pick(key: string) {
    const option = this.view.choice?.find((o) => o.key === key)
    if (!option || option.disabled || !this.picker) return
    const picker = this.picker
    this.picker = null
    this.set({ choice: null })
    picker(key)
  }
}
