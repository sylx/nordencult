import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { Button, ImageFrame, ThinFrameWithTitle } from 'norden-ui'
import { TIMING, type BackgroundView, type CharacterInfo, type ChoiceOption, type DialoguePlayer, type MessageView, type PortraitView } from '../player'
import { CharacterFace } from './CharacterFace'
import { spriteStyle } from './sprite'
import './DialogueView.css'

export interface DialogueViewProps {
  player: DialoguePlayer
  /** 背景の名前を重ねて出す（エディタ） */
  showBackgroundNames?: boolean
  /**
   * 会話中はキーをすべて受け、ほかへ渡さない（既定。ゲーム）。false なら、ほかの要素がフォーカスを持たないときの
   * 文字送りと選択のキーだけを受ける（エディタ）
   */
  modal?: boolean
}

/** 名前から決まる色相 */
function hue(name: string): number {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return hash % 360
}

function Background({ layer, showName }: { layer: BackgroundView; showName: boolean }) {
  const { name, url, ms } = layer
  const style: CSSProperties = name === null
    ? { background: '#000' }
    : url
      ? { backgroundImage: `url(${url})` }
      : { background: `linear-gradient(160deg, hsl(${hue(name)} 32% 30%), hsl(${(hue(name) + 40) % 360} 28% 9%))` }
  return (
    <div className="norden-dialogue-bg" style={{ ...style, animationDuration: `${ms}ms` }} data-fx={ms > 0 ? 'fade' : 'cut'}>
      {name !== null && !url && showName && <span className="norden-dialogue-bg-name">背景: {name}（画像なし）</span>}
    </div>
  )
}

function Portrait({ portrait, info, dimmed }: { portrait: PortraitView; info: CharacterInfo | undefined; dimmed: boolean }) {
  const fx = portrait.leaving ? `leave-${portrait.leaving}` : `enter-${portrait.fx}`
  return (
    <div className="norden-dialogue-portrait" data-at={portrait.at}>
      <div className={`norden-dialogue-portrait-body is-${fx} ${dimmed ? 'is-dimmed' : ''}`} data-at={portrait.at}
        style={{ animationDuration: `${TIMING.portrait[portrait.leaving ?? portrait.fx]}ms`, ...(info && spriteStyle(info, info.cell)) }}
        role="img" aria-label={info?.name ?? portrait.id} />
    </div>
  )
}

/** 1 文字ずつ出す。出し切ると player.reveal() */
function Typewriter({ message, player }: { message: MessageView; player: DialoguePlayer }) {
  const chars = Array.from(message.text)
  const [count, setCount] = useState(0)
  const done = message.revealed || count >= chars.length
  useEffect(() => {
    if (done) return
    const timer = setInterval(() => setCount((c) => c + 1), TIMING.character)
    return () => clearInterval(timer)
  }, [done])
  useEffect(() => {
    if (done && !message.revealed) player.reveal()
  }, [done, message.revealed, player])
  const shown = done ? chars.length : count
  // 残りは見えないまま置いておき、行の折り返しが途中で変わらないようにする
  return (
    <p className="norden-dialogue-text">
      {chars.slice(0, shown).join('')}
      <span className="norden-dialogue-text-rest">{chars.slice(shown).join('')}</span>
      {message.revealed && message.waiting && <span className="norden-dialogue-next" aria-hidden="true">{message.more ? '▼' : '■'}</span>}
    </p>
  )
}

function Choices({ choice, player }: { choice: readonly ChoiceOption[]; player: DialoguePlayer }) {
  return (
    <div className="norden-dialogue-choices" role="group" aria-label="選択肢" onClick={(event) => event.stopPropagation()}>
      {choice.map((option, index) => (
        <Button key={option.key} variant={index === 0 ? 'primary' : 'normal'} disabled={Boolean(option.disabled)} title={option.disabled}
          onClick={() => player.pick(option.key)}>
          <span className="norden-dialogue-choice-label">{option.text}</span>
          {option.disabled && <span className="norden-dialogue-choice-reason">{option.disabled}</span>}
        </Button>
      ))}
    </div>
  )
}

/** カットの下のメッセージウィンドウ: 名前は枠の名札に、顔は左に。選択肢は直前のセリフの下に並べる */
function MessageWindow({ message, choice, player }: { message: MessageView | null; choice: readonly ChoiceOption[] | null; player: DialoguePlayer }) {
  const info = message?.speaker ? player.providers.character(message.speaker) : undefined
  const body = (
    <>
      <div className="norden-dialogue-message-line">
        {info && <CharacterFace className="norden-dialogue-face" info={info} />}
        {message && <Typewriter key={message.key} message={message} player={player} />}
      </div>
      {choice && <Choices choice={choice} player={player} />}
    </>
  )
  const className = `norden-dialogue-message ${message?.narrate ? 'is-narrate' : ''} ${message?.name ? '' : 'is-untitled'} ${message || choice ? '' : 'is-empty'}`
  // One window throughout (its plaque hidden while nobody is named), staying where it is while nobody speaks so that
  // the cut does not move
  return <ThinFrameWithTitle as="div" title={message?.name ?? ''} className={className} aria-live="polite">{body}</ThinFrameWithTitle>
}

/** 画面を揺らす（Web Animations） */
const SHAKE: Record<'small' | 'large', number> = { small: 6, large: 16 }

/**
 * 会話の画面。イベント通知（norden-ui の EventScreen）と同じく、親の要素を暗い幕で覆い、中央にカット（背景・立ち絵
 * （左・中央・右）・資料・暗転・揺れ・光。真鍮の枠）と、その下にメッセージウィンドウ（名札・顔・1 文字ずつ・選択肢）を置く。
 * クリック・Enter・Space で文字送り、数字キーで選択肢を選ぶ。幕はクリックをすべて受ける
 */
export function DialogueView({ player, showBackgroundNames = false, modal = true }: DialogueViewProps) {
  const view = useSyncExternalStore(player.subscribe, player.getSnapshot)
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const { active, choice, shake } = view

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const inside = Boolean(target && root.current?.contains(target))
      // Not modal: only keys that nothing else on the page takes
      if (!modal && target && target !== document.body && !inside) return
      const option = choice && /^[1-9]$/.test(event.key) ? choice[Number(event.key) - 1] : undefined
      // A choice's button with the focus takes Enter and Space itself
      const advance = !choice && (event.key === 'Enter' || event.key === ' ')
      if (option || advance) {
        event.preventDefault()
        event.stopPropagation()
        if (option) player.pick(option.key)
        else player.click()
      } else if (modal && !inside) {
        event.stopPropagation()
      }
    }
    // Modal, before the game's own keys: none of them reach it while the dialogue is on (those on the choices'
    // buttons stop at the dialogue)
    const stop = (event: KeyboardEvent) => event.stopPropagation()
    const element = root.current
    window.addEventListener('keydown', onKeyDown, modal)
    if (modal) element?.addEventListener('keydown', stop)
    return () => {
      window.removeEventListener('keydown', onKeyDown, modal)
      element?.removeEventListener('keydown', stop)
    }
  }, [active, choice, player, modal])

  const shakeKey = shake?.key
  const shakeSize = shake?.size
  useEffect(() => {
    if (shakeKey === undefined || !shakeSize) return
    const d = SHAKE[shakeSize]
    stage.current?.animate(
      [0, -d, d, -d * 0.6, d * 0.6, -d * 0.3, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? d / 3 : 0}px)` })),
      { duration: TIMING.shake[shakeSize] },
    )
  }, [shakeKey, shakeSize])

  if (!active) return null
  const speaking = view.message?.speaker
  const speakerShown = view.portraits.some((p) => p.id === speaking && !p.leaving)
  return (
    <div className="norden-dialogue" ref={root} onClick={() => player.click()}>
      <div className="norden-dialogue-body">
        <ImageFrame className="norden-dialogue-cut">
          <div className="norden-dialogue-stage">
            <div className="norden-dialogue-scene" ref={stage}>
              {view.backgrounds.map((layer) => <Background key={layer.key} layer={layer} showName={showBackgroundNames} />)}
              {view.portraits.map((portrait) => (
                <Portrait key={portrait.id} portrait={portrait} info={player.providers.character(portrait.id)} dimmed={speakerShown && portrait.id !== speaking} />
              ))}
            </div>
            {view.panel && (
              <div key={view.panel.key} className="norden-dialogue-panel" data-at={view.panel.at}>
                {player.providers.panel?.(view.panel.name, { vars: view.panel.vars, state: view.panel.state })}
              </div>
            )}
            <div className="norden-dialogue-fade" style={{ background: view.fade.color, opacity: view.fade.opacity, transitionDuration: `${view.fade.ms}ms` }} />
            {view.flash && <div key={view.flash.key} className={`norden-dialogue-flash is-${view.flash.color}`} style={{ animationDuration: `${TIMING.flash}ms` }} />}
          </div>
        </ImageFrame>
        <MessageWindow message={view.message} choice={choice} player={player} />
      </div>
    </div>
  )
}
