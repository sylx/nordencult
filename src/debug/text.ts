/** Text on the terminal, where CJK characters take two cells */

export const charWidth = (char: string): number => {
  const code = char.codePointAt(0) ?? 0
  const wide = (code >= 0x1100 && code <= 0x115f) || (code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3)
    || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xfe30 && code <= 0xfe6f) || (code >= 0xff00 && code <= 0xff60)
    || (code >= 0xffe0 && code <= 0xffe6)
  return wide ? 2 : 1
}

export const displayWidth = (text: string): number => Array.from(text).reduce((sum, char) => sum + charWidth(char), 0)

const pad = (text: string, width: number) => text + ' '.repeat(Math.max(0, width - displayWidth(text)))

/** Rows lined up in columns */
export function table(rows: readonly (readonly string[])[]): string[] {
  const widths: number[] = []
  for (const row of rows) row.forEach((cell, index) => { widths[index] = Math.max(widths[index] ?? 0, displayWidth(cell)) })
  return rows.map((row) => row.map((cell, index) => (index < row.length - 1 ? pad(cell, widths[index]) : cell)).join('  '))
}

/** Items laid out in as many columns as fit in `cols` cells, as a shell lists its completions */
export function columns(items: readonly string[], cols: number): string[] {
  const width = Math.max(0, ...items.map(displayWidth)) + 2
  const perRow = Math.max(1, Math.floor(cols / width))
  const rows: string[] = []
  for (let index = 0; index < items.length; index += perRow) {
    rows.push(items.slice(index, index + perRow).map((item) => pad(item, width)).join('').trimEnd())
  }
  return rows
}

/**
 * Where text written from the start of a row ends up on a terminal `cols` wide (a wide character that does not fit
 * goes to the next row). `col` is `cols` when the row is just full: the terminal then waits to wrap
 */
export function wrapPosition(text: string, cols: number): { row: number; col: number } {
  let row = 0
  let col = 0
  for (const char of text) {
    const width = charWidth(char)
    if (col + width > cols) {
      row += 1
      col = 0
    }
    col += width
  }
  return { row, col }
}
