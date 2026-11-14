/**
 * 台本の JSON の決まった書式。命令は 1 行に 1 つ、`tones`・`characters` を持つ `say` だけは口調・騎士ごとに 1 行にする。
 * エディタの保存も、手で直すときもこの書式にする（差分が直した行だけになる）
 */

const TOP_ORDER = ['$schema', 'title', 'params', 'blocks', 'choices']

/** 1 行に収める: `{ "say": "$merc", "text": ["…", "…"] }` */
export function inline(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
    return entries.length === 0 ? '{}' : `{ ${entries.map(([key, v]) => `${JSON.stringify(key)}: ${inline(v)}`).join(', ')} }`
  }
  return JSON.stringify(value)
}

const indent = (depth: number) => '  '.repeat(depth)

/** 1 項目 1 行に分けて書く、命令の項目（命令の終わりにこの順で） */
const SPREAD = ['tones', 'characters']

const isSpread = ([key, value]: [string, unknown]) =>
  SPREAD.includes(key) && value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0

/** 命令（ブロックの中、深さ 3） */
function command(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return indent(3) + inline(value)
  const entries = Object.entries(value)
  const spread = entries.filter(isSpread).sort(([a], [b]) => SPREAD.indexOf(a) - SPREAD.indexOf(b))
  if (spread.length === 0) return indent(3) + inline(value)
  const head = inline(Object.fromEntries(entries.filter((entry) => !isSpread(entry)))).replace(/ \}$/, ',')
  const sections = spread.map(([key, items]) => {
    const lines = Object.entries(items as object).map(([name, text]) => `${indent(5)}${JSON.stringify(name)}: ${inline(text)}`)
    return `${indent(4)}${JSON.stringify(key)}: {\n${lines.join(',\n')}\n${indent(4)}}`
  })
  return `${indent(3)}${head}\n${sections.join(',\n')} }`
}

/** ブロック名 → 命令の列 */
function blocks(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return inline(value)
  const entries = Object.entries(value)
  if (entries.length === 0) return '{}'
  const body = entries.map(([name, commands]) => {
    const key = `${indent(2)}${JSON.stringify(name)}: `
    if (!Array.isArray(commands)) return key + inline(commands)
    if (commands.length === 0) return `${key}[]`
    return `${key}[\n${commands.map(command).join(',\n')}\n${indent(2)}]`
  })
  return `{\n${body.join(',\n')}\n${indent(1)}}`
}

/** 選択肢: 1 つにつき 1 行 */
function choices(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return inline(value)
  const entries = Object.entries(value)
  if (entries.length === 0) return '{}'
  return `{\n${entries.map(([name, choice]) => `${indent(2)}${JSON.stringify(name)}: ${inline(choice)}`).join(',\n')}\n${indent(1)}}`
}

/** 台本を決まった書式の JSON の文字列に（末尾に改行） */
export function formatScript(script: object): string {
  const keys = Object.keys(script).sort((a, b) => order(a) - order(b))
  const body = keys.map((key) => {
    const value = (script as Record<string, unknown>)[key]
    const text = key === 'blocks' ? blocks(value) : key === 'choices' ? choices(value) : key === 'params' ? inline(value) : JSON.stringify(value, null, 2).replace(/\n/g, `\n${indent(1)}`)
    return `${indent(1)}${JSON.stringify(key)}: ${text}`
  })
  return `{\n${body.join(',\n')}\n}\n`
}

const order = (key: string) => {
  const index = TOP_ORDER.indexOf(key)
  return index < 0 ? TOP_ORDER.length : index
}
