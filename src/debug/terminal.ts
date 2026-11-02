import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { GameRuleError } from '../game'
import { DEBUG_COMMANDS, type DebugContext } from './commands'
import { LineEditor } from './lineEditor'
import { DebugError, complete, completedWord, execute } from './shell'
import { columns, wrapPosition } from './text'

const PROMPT = '> '
const CYAN = '\x1b[36m'
const RED = '\x1b[31m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

const HISTORY_KEY = 'nordencult.debugHistory'
const HISTORY_LIMIT = 200
/** More completions than this are cut short: a list of every knight would push the line away */
const COMPLETION_LIMIT = 60

function loadHistory(): string[] {
  try {
    const history: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    return Array.isArray(history) ? history.filter((line) => typeof line === 'string') : []
  } catch {
    return []
  }
}

function saveHistory(history: readonly string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT)))
  } catch {
    // The history only outlives a reload where storage works
  }
}

/** The debug console: an xterm.js terminal in `element`, with the line typed kept in a LineEditor and run by the shell */
export class DebugTerminal {
  private readonly term = new Terminal({
    allowTransparency: true,
    cursorBlink: true,
    fontFamily: "'Cascadia Mono', Consolas, 'Noto Sans Mono CJK JP', 'Noto Sans JP', monospace",
    fontSize: 13,
    scrollback: 2000,
    theme: { background: '#00000000', foreground: '#e8dcc0', cursor: '#d4b06a', selectionBackground: '#d4b06a66' },
  })
  private readonly fit = new FitAddon()
  private readonly resize = new ResizeObserver(() => { this.fit.fit() })
  private readonly editor = new LineEditor(loadHistory())
  private readonly context: DebugContext
  /** The row of the line typed the cursor is on, for going back to the start of it */
  private cursorRow = 0

  constructor(element: HTMLElement, context: DebugContext) {
    this.context = context
    this.term.loadAddon(this.fit)
    this.term.open(element)
    // Copying what is selected and pasting are the browser's
    this.term.attachCustomKeyEventHandler((event) => {
      const ctrl = event.ctrlKey && !event.altKey
      return !(ctrl && (event.key === 'v' || (event.key === 'c' && this.term.hasSelection())))
    })
    this.term.onData((data) => this.input(data))
    this.resize.observe(element)
    this.term.writeln(`${DIM}デバッグコンソール: help で一覧、Tab で補完、Esc か Ctrl+Alt+D で閉じる${RESET}`)
    this.renderLine()
  }

  show() {
    this.fit.fit()
    this.term.focus()
  }

  hide() {
    this.term.blur()
  }

  clear() {
    this.term.clear()
  }

  dispose() {
    this.resize.disconnect()
    this.term.dispose()
  }

  /** Keys (as the terminal sends them) or pasted text */
  input(data: string) {
    const { editor } = this
    switch (data) {
      case '\t': this.tab(); return
      case '\x03': this.cancel(); return
      case '\x0c': this.clear(); return
      case '\x7f': editor.backspace(); break
      case '\x1b[3~': editor.deleteForward(); break
      case '\x1b[A': case '\x10': editor.previous(); break
      case '\x1b[B': case '\x0e': editor.next(); break
      case '\x1b[C': editor.moveRight(); break
      case '\x1b[D': editor.moveLeft(); break
      case '\x1b[H': case '\x01': editor.moveHome(); break
      case '\x1b[F': case '\x05': editor.moveEnd(); break
      case '\x15': editor.killBefore(); break
      case '\x0b': editor.killAfter(); break
      default:
        if (data.startsWith('\x1b')) return
        this.type(data)
        return
    }
    this.renderLine()
  }

  /** Text as typed or pasted: each line break runs the line so far */
  private type(data: string) {
    const lines = data.split(/\r\n?|\n/).map((line) => line.replace(/\p{Cc}/gu, ''))
    lines.forEach((line, index) => {
      this.editor.insert(line)
      if (index < lines.length - 1) this.submit()
    })
    this.renderLine()
  }

  /** The line typed written again, with the cursor where it is in the line */
  private renderLine() {
    const { cols } = this.term
    const end = wrapPosition(PROMPT + this.editor.line, cols)
    const cursor = wrapPosition(PROMPT + this.editor.beforeCursor, cols)
    // A row just full: a character more makes the terminal go on to the next one
    const endRow = end.col === cols ? end.row + 1 : end.row
    const cursorRow = cursor.col === cols ? cursor.row + 1 : cursor.row
    const cursorCol = cursor.col === cols ? 0 : cursor.col
    this.term.write([
      this.cursorRow > 0 ? `\x1b[${this.cursorRow}A` : '',
      `\r\x1b[J${CYAN}${PROMPT}${RESET}${this.editor.line}`,
      end.col === cols ? ' \r' : '',
      endRow > cursorRow ? `\x1b[${endRow - cursorRow}A` : '',
      `\x1b[${cursorCol + 1}G`,
    ].join(''))
    this.cursorRow = cursorRow
  }

  /** Below the line typed (and what follows it), to write on from the start of a row */
  private leaveLine(after = '') {
    this.editor.moveEnd()
    this.renderLine()
    this.term.write(`${after}\r\n`)
    this.cursorRow = 0
  }

  private print(lines: readonly string[]) {
    for (const line of lines) this.term.writeln(line)
  }

  private submit() {
    this.leaveLine()
    const line = this.editor.commit()
    saveHistory(this.editor.history)
    try {
      this.print(execute(DEBUG_COMMANDS, line, this.context))
    } catch (error) {
      if (!(error instanceof DebugError || error instanceof GameRuleError)) console.error(error)
      this.print(String(error instanceof Error ? error.message : error).split('\n').map((text) => `${RED}${text}${RESET}`))
    }
  }

  private cancel() {
    this.leaveLine(`${DIM}^C${RESET}`)
    this.editor.reset()
    this.renderLine()
  }

  private tab() {
    const { editor } = this
    const completion = complete(DEBUG_COMMANDS, editor.beforeCursor, this.context)
    const word = completedWord(completion)
    if (word !== null) {
      editor.replaceBefore(Array.from(completion.word).length, word)
      this.renderLine()
      return
    }
    if (completion.candidates.length === 0) return
    const { cursor } = editor
    this.leaveLine()
    const shown = completion.candidates.slice(0, COMPLETION_LIMIT)
    this.print(columns(shown.map((c) => (c.label ? `${c.value} ${c.label}` : c.value)), this.term.cols))
    const left = completion.candidates.length - shown.length
    if (left > 0) this.term.writeln(`${DIM}ほか ${left} 件${RESET}`)
    editor.moveTo(cursor)
    this.renderLine()
  }
}
