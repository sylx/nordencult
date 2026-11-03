/** 台本の編集（形は保ったまま、直した値だけを替える） */

export type Json = Record<string, unknown>

/** ページの区切り（テキスト欄の空行） */
const PAGE_BREAK = '\n\n'

/** 文言をテキスト欄に: ページは空行で区切る */
export const linesToText = (lines: unknown): string =>
  typeof lines === 'string' ? lines : Array.isArray(lines) ? lines.join(PAGE_BREAK) : ''

/**
 * テキスト欄を文言に。もとが配列か、ページが 2 つ以上なら配列。空なら、`nothing`（口調別の文言）か配列だったものは
 * []（何も言わない）、ほかは ''
 */
export function textToLines(text: string, before: unknown, nothing = false): string | string[] {
  if (text === '') return nothing || Array.isArray(before) ? [] : ''
  const pages = text.split(PAGE_BREAK)
  return Array.isArray(before) || pages.length > 1 ? pages : text
}

const blocksOf = (script: Json) => script.blocks as Record<string, Json[]>

export function withCommand(script: Json, block: string, index: number, change: (command: Json) => Json): Json {
  const blocks = blocksOf(script)
  return { ...script, blocks: { ...blocks, [block]: blocks[block].map((command, i) => (i === index ? change(command) : command)) } }
}

export function withOption(script: Json, choice: string, key: string, text: string): Json {
  const choices = script.choices as Record<string, { options: Record<string, string> }>
  const { options } = choices[choice]
  return { ...script, choices: { ...choices, [choice]: { ...choices[choice], options: { ...options, [key]: text } } } }
}

/** 口調別の文言を足す・替える（undefined で消す。最後の 1 つを消すと tones ごと消す） */
export function withTone(command: Json, tone: string, lines: unknown): Json {
  const tones = { ...(command.tones as Json | undefined) }
  if (lines === undefined) delete tones[tone]
  else tones[tone] = lines
  if (Object.keys(tones).length > 0) return { ...command, tones }
  const rest = { ...command }
  delete rest.tones
  return rest
}

/** 種を決めた乱数（mulberry32） */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
