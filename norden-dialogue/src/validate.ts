import { COMMAND_KINDS, PARAM_TYPES, POSITIONS, commandKind, type CommandKind, type ParamType } from './script'
import { placeholders } from './text'

/** 台本の問題。エラーは再生できない（ルートのテストも落ちる）、警告は再生できる */
export interface ScriptProblem {
  level: 'error' | 'warning'
  /** どこか: `title`・`params.merc`・`blocks.greet.3.tones.wild_berserker`・`blocks.greet.3.characters.110`・`choices.hire.options.yes` */
  path: string
  /** 命令の問題なら、そのブロックと命令の位置 */
  block?: string
  index?: number
  message: string
}

/**
 * ゲームのデータとの照合（無い項目は見ない）。騎士 ID・曲 id・効果音・口調・資料はエラー、背景は警告（画像が揃うまで）
 */
export interface ScriptCatalog {
  character?: (id: string) => boolean
  background?: (name: string) => boolean
  bgm?: (id: string) => boolean
  se?: (name: string) => boolean
  tone?: (id: string) => boolean
  panel?: (name: string) => boolean
}

const TOP_KEYS = ['$schema', 'title', 'params', 'blocks', 'choices']

/** 命令ごとの項目（先頭が命令のキー） */
const COMMAND_KEYS: Readonly<Record<CommandKind, { required: readonly string[]; optional: readonly string[] }>> = {
  say: { required: ['say', 'text'], optional: ['name', 'tones', 'characters'] },
  name: { required: ['name', 'text'], optional: [] },
  narrate: { required: ['narrate'], optional: [] },
  show: { required: ['show', 'at'], optional: ['fx'] },
  hide: { required: ['hide'], optional: ['fx'] },
  move: { required: ['move', 'at'], optional: [] },
  bg: { required: ['bg'], optional: ['fx'] },
  fade: { required: ['fade'], optional: ['color', 'ms'] },
  dim: { required: ['dim'], optional: ['ms'] },
  shake: { required: ['shake'], optional: [] },
  flash: { required: ['flash'], optional: [] },
  wait: { required: ['wait'], optional: [] },
  bgm: { required: ['bgm'], optional: [] },
  se: { required: ['se'], optional: [] },
  panel: { required: ['panel'], optional: ['at'] },
}

const NAME = /^[A-Za-z_]\w*$/

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const list = (values: readonly string[]) => values.map((v) => `"${v}"`).join('・')

interface At { block: string; index: number }

class Checker {
  readonly problems: ScriptProblem[] = []
  readonly params: Record<string, ParamType> = {}
  readonly used = new Set<string>()
  readonly catalog: ScriptCatalog

  constructor(catalog: ScriptCatalog) {
    this.catalog = catalog
  }

  report(level: ScriptProblem['level'], path: string, message: string, at?: At) {
    this.problems.push({ level, path, message, ...at })
  }

  error(path: string, message: string, at?: At) {
    this.report('error', path, message, at)
  }

  /** 文言の中の変数 */
  text(value: string, path: string, at?: At) {
    for (const { param, property, source } of placeholders(value)) {
      const type = this.params[param]
      if (!param) this.error(path, `{${source}} は変数の書き方ではありません（{price}・{merc.name}）`, at)
      else if (!type) this.error(path, `宣言していない変数: {${source}}`, at)
      else {
        this.used.add(param)
        if (property !== undefined && property !== 'name') this.error(path, `{${source}}: 変数に使えるのは .name だけです`, at)
        else if (property === 'name' && type !== 'character' && type !== 'city') this.error(path, `{${source}}: ${param} は騎士・都市ではありません`, at)
      }
    }
  }

  /** 文言か、そのページの配列 */
  lines(value: unknown, path: string, at?: At) {
    if (typeof value === 'string') this.text(value, path, at)
    else if (Array.isArray(value)) {
      value.forEach((page, i) => {
        if (typeof page === 'string') this.text(page, `${path}.${i}`, at)
        else this.error(`${path}.${i}`, '文言は文字列にしてください', at)
      })
    } else this.error(path, '文言は文字列か文字列の配列にしてください', at)
  }

  /** 騎士 ID か、騎士の変数（"$merc"） */
  character(value: unknown, path: string, at: At, all = false) {
    if (typeof value !== 'string' || value === '') return this.error(path, '騎士 ID か変数（"$merc"）を書いてください', at)
    if (value.startsWith('$')) {
      const param = value.slice(1)
      const type = this.params[param]
      if (!type) return this.error(path, `宣言していない変数: ${value}`, at)
      this.used.add(param)
      if (type !== 'character') this.error(path, `${value} は騎士の変数ではありません（${type}）`, at)
      return
    }
    if (all && value === 'all') return
    if (this.catalog.character && !this.catalog.character(value)) this.error(path, `存在しない騎士 ID: ${value}`, at)
  }

  oneOf(value: unknown, allowed: readonly unknown[], path: string, at: At) {
    if (!allowed.includes(value)) this.error(path, `${list(allowed.map(String))} のどれかにしてください`, at)
  }

  command(value: unknown, at: At) {
    const path = `blocks.${at.block}.${at.index}`
    if (!isObject(value)) return this.error(path, '命令はオブジェクトにしてください', at)
    const kind = commandKind(value)
    if (!kind) {
      const key = Object.keys(value)[0]
      return this.error(path, key === undefined ? '空の命令です' : `知らない命令: ${key}（${list(COMMAND_KINDS)}）`, at)
    }
    const { required, optional } = COMMAND_KEYS[kind]
    for (const key of required) if (!(key in value)) this.error(path, `${kind}: ${key} がありません`, at)
    for (const key of Object.keys(value)) {
      if (!required.includes(key) && !optional.includes(key)) this.error(`${path}.${key}`, `${kind} に ${key} は書けません`, at)
    }
    const field = (key: string) => `${path}.${key}`
    switch (kind) {
      case 'say': {
        this.character(value.say, field('say'), at)
        if ('text' in value) this.lines(value.text, field('text'), at)
        if ('name' in value) this.name(value.name, field('name'), at)
        if ('tones' in value) this.tones(value.tones, field('tones'), at)
        if ('characters' in value) this.characterLines(value.characters, field('characters'), at)
        break
      }
      case 'name':
        this.name(value.name, field('name'), at)
        if ('text' in value) this.lines(value.text, field('text'), at)
        break
      case 'narrate':
        this.lines(value.narrate, field('narrate'), at)
        break
      case 'show':
        this.character(value.show, field('show'), at)
        if ('at' in value) this.oneOf(value.at, POSITIONS, field('at'), at)
        if ('fx' in value) this.oneOf(value.fx, ['fade', 'slide', 'none'], field('fx'), at)
        break
      case 'hide':
        this.character(value.hide, field('hide'), at, true)
        if ('fx' in value) this.oneOf(value.fx, ['fade', 'slide', 'none'], field('fx'), at)
        break
      case 'move':
        this.character(value.move, field('move'), at)
        if ('at' in value) this.oneOf(value.at, POSITIONS, field('at'), at)
        break
      case 'bg':
        if (value.bg !== null && (typeof value.bg !== 'string' || value.bg === '')) this.error(field('bg'), '背景の名前か null にしてください', at)
        else if (typeof value.bg === 'string' && this.catalog.background && !this.catalog.background(value.bg)) {
          this.report('warning', field('bg'), `背景の画像がありません: ${value.bg}（仮のグラデーションで出ます）`, at)
        }
        if ('fx' in value) this.oneOf(value.fx, ['fade', 'cut'], field('fx'), at)
        break
      case 'fade':
        this.oneOf(value.fade, ['out', 'in'], field('fade'), at)
        if ('color' in value) this.oneOf(value.color, ['black', 'white'], field('color'), at)
        if ('ms' in value) this.duration(value.ms, field('ms'), at)
        break
      case 'dim':
        if (typeof value.dim !== 'number' || !(value.dim >= 0 && value.dim <= 1)) this.error(field('dim'), '0（暗くしない）〜 1（真っ黒）の数にしてください', at)
        if ('ms' in value) this.duration(value.ms, field('ms'), at)
        break
      case 'shake':
        this.oneOf(value.shake, ['small', 'large'], field('shake'), at)
        break
      case 'flash':
        this.oneOf(value.flash, ['white', 'red'], field('flash'), at)
        break
      case 'wait':
        this.duration(value.wait, field('wait'), at)
        break
      case 'bgm':
        if (value.bgm !== null && (typeof value.bgm !== 'string' || value.bgm === '')) this.error(field('bgm'), '曲 id か null にしてください', at)
        else if (typeof value.bgm === 'string' && this.catalog.bgm && !this.catalog.bgm(value.bgm)) this.error(field('bgm'), `存在しない曲: ${value.bgm}`, at)
        break
      case 'se':
        if (typeof value.se !== 'string' || value.se === '') this.error(field('se'), '効果音の名前を書いてください', at)
        else if (this.catalog.se && !this.catalog.se(value.se)) this.error(field('se'), `存在しない効果音: ${value.se}`, at)
        break
      case 'panel':
        if (value.panel !== null && (typeof value.panel !== 'string' || value.panel === '')) this.error(field('panel'), '資料の名前か null にしてください', at)
        else if (typeof value.panel === 'string' && this.catalog.panel && !this.catalog.panel(value.panel)) this.error(field('panel'), `存在しない資料: ${value.panel}`, at)
        if ('at' in value) this.oneOf(value.at, POSITIONS, field('at'), at)
        break
    }
  }

  name(value: unknown, path: string, at: At) {
    if (typeof value !== 'string' || value === '') this.error(path, '名前を書いてください', at)
    else this.text(value, path, at)
  }

  tones(value: unknown, path: string, at: At) {
    if (!isObject(value)) return this.error(path, 'tones は 口調 → 文言 のオブジェクトにしてください', at)
    for (const [tone, lines] of Object.entries(value)) {
      if (this.catalog.tone && !this.catalog.tone(tone)) this.error(`${path}.${tone}`, `知らない口調: ${tone}`, at)
      this.lines(lines, `${path}.${tone}`, at)
    }
  }

  characterLines(value: unknown, path: string, at: At) {
    if (!isObject(value)) return this.error(path, 'characters は 騎士 ID → 文言 のオブジェクトにしてください', at)
    for (const [id, lines] of Object.entries(value)) {
      if (id.startsWith('$')) this.error(`${path}.${id}`, `characters のキーは騎士 ID にしてください（変数は書けません）: ${id}`, at)
      else if (this.catalog.character && !this.catalog.character(id)) this.error(`${path}.${id}`, `存在しない騎士 ID: ${id}`, at)
      this.lines(lines, `${path}.${id}`, at)
    }
  }

  duration(value: unknown, path: string, at: At) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) this.error(path, 'ミリ秒（0 以上の数）にしてください', at)
  }
}

/**
 * 台本の形の検査: 知らない命令・欠けた項目・宣言していない変数・使っていない宣言（警告）。
 * `catalog` を渡すと、騎士 ID・背景・曲・効果音・口調がゲームのデータにあるかも見る
 */
export function validateScript(json: unknown, catalog: ScriptCatalog = {}): ScriptProblem[] {
  const checker = new Checker(catalog)
  if (!isObject(json)) {
    checker.error('', '台本はオブジェクトにしてください')
    return checker.problems
  }
  for (const key of Object.keys(json)) if (!TOP_KEYS.includes(key)) checker.error(key, `台本に ${key} は書けません（${list(TOP_KEYS)}）`)
  if (typeof json.title !== 'string' || json.title === '') checker.error('title', 'title（シーンの題）を書いてください')

  if (json.params !== undefined) {
    if (!isObject(json.params)) checker.error('params', 'params は 変数名 → 型 のオブジェクトにしてください')
    else {
      for (const [name, type] of Object.entries(json.params)) {
        if (!NAME.test(name)) checker.error(`params.${name}`, `変数名は英字・数字・_ にしてください: ${name}`)
        if (!(PARAM_TYPES as readonly unknown[]).includes(type)) checker.error(`params.${name}`, `変数の型は ${list(PARAM_TYPES)} のどれかにしてください`)
        else checker.params[name] = type as ParamType
      }
    }
  }

  if (!isObject(json.blocks)) checker.error('blocks', 'blocks（ブロック名 → 命令の列）を書いてください')
  else {
    for (const [block, commands] of Object.entries(json.blocks)) {
      if (!Array.isArray(commands)) checker.error(`blocks.${block}`, 'ブロックは命令の配列にしてください')
      else commands.forEach((command, index) => checker.command(command, { block, index }))
    }
  }

  if (json.choices !== undefined) {
    if (!isObject(json.choices)) checker.error('choices', 'choices は 選択肢の名前 → { options } のオブジェクトにしてください')
    else {
      for (const [name, choice] of Object.entries(json.choices)) {
        const path = `choices.${name}`
        if (!isObject(choice) || !isObject(choice.options)) {
          checker.error(path, '選択肢は { "options": { キー: 文言 } } にしてください')
          continue
        }
        for (const key of Object.keys(choice)) if (key !== 'options') checker.error(`${path}.${key}`, `選択肢に ${key} は書けません`)
        const options = Object.entries(choice.options)
        if (options.length === 0) checker.error(`${path}.options`, '選択肢がありません')
        for (const [key, text] of options) {
          if (typeof text !== 'string' || text === '') checker.error(`${path}.options.${key}`, '選択肢の文言を書いてください')
          else checker.text(text, `${path}.options.${key}`)
        }
      }
    }
  }

  for (const name of Object.keys(checker.params)) {
    if (!checker.used.has(name)) checker.report('warning', `params.${name}`, `使っていない変数: ${name}`)
  }
  return checker.problems
}

export const scriptErrors = (problems: readonly ScriptProblem[]) => problems.filter((p) => p.level === 'error')
