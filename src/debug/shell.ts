import { table } from './text'

/** A command that cannot be run as typed; its message is shown as it is */
export class DebugError extends Error {}

/** A value an argument (or a command name) can take, with what it is called */
export interface DebugCandidate {
  value: string
  /** Shown beside the value; typing it completes to the value */
  label?: string
  /** More of the word follows (a path going on): completing it leaves no space */
  partial?: boolean
}

export interface DebugArg<C> {
  name: string
  optional?: boolean
  /** A whole number */
  int?: boolean
  /** The values it takes: only these, or their labels (run gets the value), unless `open` */
  candidates?: (context: C, word: string) => readonly DebugCandidate[]
  /** `candidates` are suggestions only */
  open?: boolean
}

interface Named {
  name: string
  /** One line for help and the completion list */
  summary: string
}

export interface DebugAction<C> extends Named {
  args?: readonly DebugArg<C>[]
  /** What to show; a DebugError or a GameRuleError thrown is shown as the error */
  run: (args: readonly string[], context: C) => string | readonly string[] | void
}

export interface DebugGroup<C> extends Named {
  subcommands: readonly DebugCommand<C>[]
}

export type DebugCommand<C> = DebugAction<C> | DebugGroup<C>

const isGroup = <C>(command: DebugCommand<C>): command is DebugGroup<C> => 'subcommands' in command

/** The commands the words name, one level after another, and the words left: the arguments, or what is no subcommand */
function walk<C>(commands: readonly DebugCommand<C>[], words: readonly string[]) {
  const path: DebugCommand<C>[] = []
  let level = commands
  let index = 0
  while (index < words.length) {
    const command = level.find((c) => c.name === words[index])
    if (!command) break
    path.push(command)
    index += 1
    if (!isGroup(command)) break
    level = command.subcommands
  }
  return { path, rest: words.slice(index) }
}

const argUsage = <C>({ name, optional }: DebugArg<C>) => (optional ? `[${name}]` : `<${name}>`)

/** e.g. relic add <relic> [faction] */
function usage<C>(path: readonly DebugCommand<C>[]): string {
  const command = path[path.length - 1]
  const after = isGroup(command) ? [`<${command.subcommands.map((c) => c.name).join('|')}>`] : (command.args ?? []).map(argUsage)
  return [...path.map((c) => c.name), ...after].join(' ')
}

const sameWord = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** The arguments as `run` gets them */
function checkedArgs<C>(path: readonly DebugCommand<C>[], command: DebugAction<C>, words: readonly string[], context: C): string[] {
  const args = command.args ?? []
  if (words.length > args.length || args.slice(words.length).some((arg) => !arg.optional)) {
    throw new DebugError(`使い方: ${usage(path)}`)
  }
  return words.map((word, index) => {
    const arg = args[index]
    if (arg.int && !/^-?\d+$/.test(word)) throw new DebugError(`${arg.name}: ${word} は整数ではありません`)
    if (!arg.candidates || arg.open) return word
    const candidates = arg.candidates(context, word)
    const candidate = candidates.find((c) => sameWord(c.value, word)) ?? candidates.find((c) => c.label === word)
    if (!candidate) throw new DebugError(`${arg.name}: ${word} はありません（Tab で候補）`)
    return candidate.value
  })
}

/** Runs a line and gives what to show; a DebugError or the command's own error when it cannot */
export function execute<C>(commands: readonly DebugCommand<C>[], line: string, context: C): string[] {
  const words = line.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const { path, rest } = walk(commands, words)
  const command = path.at(-1)
  if (!command) throw new DebugError(`${words[0]} というコマンドはありません（help で一覧）`)
  if (isGroup(command)) throw new DebugError(`使い方: ${usage(path)}`)
  const output = command.run(checkedArgs(path, command, rest, context), context)
  if (output === undefined) return []
  return typeof output === 'string' ? [output] : [...output]
}

/** The commands, or what a command takes */
export function helpLines<C>(commands: readonly DebugCommand<C>[], name?: string): string[] {
  if (name === undefined) return table(commands.map((c) => [c.name, c.summary]))
  const command = commands.find((c) => c.name === name)
  if (!command) throw new DebugError(`${name} というコマンドはありません`)
  return table(isGroup(command)
    ? command.subcommands.map((sub) => [usage([command, sub]), sub.summary])
    : [[usage([command]), command.summary]])
}

/** The word being typed and what it could become */
export interface Completion {
  word: string
  candidates: readonly DebugCandidate[]
}

/** The candidates starting with the word; with none, those whose labels have it */
function matching(candidates: readonly DebugCandidate[], word: string): readonly DebugCandidate[] {
  const lower = word.toLowerCase()
  const byValue = candidates.filter((c) => c.value.toLowerCase().startsWith(lower))
  return byValue.length > 0 ? byValue : candidates.filter((c) => c.label?.toLowerCase().includes(lower))
}

/** What the last word of a line (up to the cursor) could become */
export function complete<C>(commands: readonly DebugCommand<C>[], line: string, context: C): Completion {
  const words = line.trimStart().split(/\s+/)
  const word = words.pop() ?? ''
  const { path, rest } = walk(commands, words)
  const command = path.at(-1)
  if (command && !isGroup(command)) return { word, candidates: matching(command.args?.[rest.length]?.candidates?.(context, word) ?? [], word) }
  const level = command ? command.subcommands : commands
  return { word, candidates: matching(rest.length === 0 ? level.map((c) => ({ value: c.name, label: c.summary })) : [], word) }
}

const commonPrefix = (values: readonly string[]) =>
  values.reduce((prefix, value) => {
    let length = 0
    while (length < prefix.length && prefix[length] === value[length]) length += 1
    return prefix.slice(0, length)
  })

/** What Tab makes of the word: the one candidate, or as much as the candidates share; null when it cannot get further */
export function completedWord({ word, candidates }: Completion): string | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0].partial ? candidates[0].value : `${candidates[0].value} `
  const prefix = commonPrefix(candidates.map((c) => c.value))
  return prefix.length > word.length ? prefix : null
}
