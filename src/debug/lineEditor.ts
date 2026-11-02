/** The line being typed on the debug console, with the lines typed before */
export class LineEditor {
  private chars: string[] = []
  /** Where the cursor is, in characters */
  cursor = 0
  /** Lines typed before, oldest first */
  readonly history: string[]
  /** The history's line shown; its length: the line being typed, kept in `draft` while going through the history */
  private historyIndex: number
  private draft = ''

  constructor(history: readonly string[] = []) {
    this.history = [...history]
    this.historyIndex = this.history.length
  }

  get line() {
    return this.chars.join('')
  }

  /** The line up to the cursor */
  get beforeCursor() {
    return this.chars.slice(0, this.cursor).join('')
  }

  private set(line: string) {
    this.chars = Array.from(line)
    this.cursor = this.chars.length
  }

  insert(text: string) {
    const chars = Array.from(text)
    this.chars.splice(this.cursor, 0, ...chars)
    this.cursor += chars.length
  }

  backspace() {
    if (this.cursor === 0) return
    this.cursor -= 1
    this.chars.splice(this.cursor, 1)
  }

  deleteForward() {
    this.chars.splice(this.cursor, 1)
  }

  moveLeft() {
    this.cursor = Math.max(0, this.cursor - 1)
  }

  moveRight() {
    this.cursor = Math.min(this.chars.length, this.cursor + 1)
  }

  moveTo(cursor: number) {
    this.cursor = cursor
  }

  moveHome() {
    this.cursor = 0
  }

  moveEnd() {
    this.cursor = this.chars.length
  }

  killBefore() {
    this.chars.splice(0, this.cursor)
    this.cursor = 0
  }

  killAfter() {
    this.chars.splice(this.cursor)
  }

  /** Replaces the characters just before the cursor (the word being completed) */
  replaceBefore(length: number, text: string) {
    this.cursor -= length
    this.chars.splice(this.cursor, length)
    this.insert(text)
  }

  previous() {
    if (this.historyIndex === 0) return
    if (this.historyIndex === this.history.length) this.draft = this.line
    this.historyIndex -= 1
    this.set(this.history[this.historyIndex])
  }

  next() {
    if (this.historyIndex === this.history.length) return
    this.historyIndex += 1
    this.set(this.history[this.historyIndex] ?? this.draft)
  }

  /** Takes the line, into the history (unless blank or the same as the last one), and starts a new one */
  commit(): string {
    const line = this.line
    if (line.trim() && this.history.at(-1) !== line) this.history.push(line)
    this.reset()
    return line
  }

  /** Drops the line and starts a new one */
  reset() {
    this.set('')
    this.draft = ''
    this.historyIndex = this.history.length
  }
}
