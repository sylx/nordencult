import { describe, expect, it } from 'vitest'
import { validateScript, type ScriptProblem } from './validate'

const script = (overrides: object = {}) => ({
  title: 'テスト',
  params: { merc: 'character', price: 'number' },
  blocks: {
    greet: [
      { bg: 'tavern' },
      { show: '$merc', at: 'right' },
      { say: '$merc', text: '{merc.name}だ。{price}金貨だ。', tones: { wild: ['俺が{merc.name}だ。'], quiet: [] } },
    ],
  },
  choices: { hire: { options: { yes: '契約する（{price}金貨）', no: 'やめておく' } } },
  ...overrides,
})

const messages = (problems: ScriptProblem[]) => problems.map((p) => `${p.level} ${p.path}: ${p.message}`)

describe('validateScript', () => {
  it('passes a well-formed script', () => {
    expect(validateScript(script())).toEqual([])
  })

  it('finds unknown commands and keys, and missing fields', () => {
    const problems = validateScript(script({
      blocks: { greet: [{ dance: '$merc' }, { show: '$merc' }, { say: '$merc', text: 'x', at: 'left' }, { bg: 'x', fx: 'zoom' }] },
    }))
    expect(messages(problems)).toEqual([
      expect.stringContaining('error blocks.greet.0: 知らない命令: dance'),
      'error blocks.greet.1: show: at がありません',
      'error blocks.greet.2.at: say に at は書けません',
      'error blocks.greet.3.fx: "fade"・"cut" のどれかにしてください',
    ])
    expect(problems[0]).toMatchObject({ block: 'greet', index: 0 })
  })

  it('finds variables not declared, and declared ones not used', () => {
    const problems = validateScript(script({
      params: { merc: 'character', price: 'number', unused: 'string' },
      blocks: { greet: [{ say: '$who', text: '{cost}金貨' }, { narrate: '{price.name}' }, { show: '$price', at: 'left' }] },
    }))
    expect(messages(problems)).toEqual([
      'error blocks.greet.0.say: 宣言していない変数: $who',
      'error blocks.greet.0.text: 宣言していない変数: {cost}',
      'error blocks.greet.1.narrate: {price.name}: price は騎士・都市ではありません',
      'error blocks.greet.2.show: $price は騎士の変数ではありません（number）',
      'warning params.merc: 使っていない変数: merc',
      'warning params.unused: 使っていない変数: unused',
    ])
  })

  it('checks the names against the game data when given', () => {
    const problems = validateScript(script({
      blocks: {
        greet: [
          { bg: 'castle' }, { bgm: 'nope' }, { se: 'boom' }, { show: '999', at: 'left' },
          { say: '$merc', text: '{price}', tones: { unknown: 'x' } },
          { say: '$merc', text: '{price}', characters: { '001': '{price}', '999': 'x', $merc: 'y' } },
          { panel: 'nothing', at: 'top' }, { panel: 'mercenary' }, { panel: null },
        ],
      },
    }), {
      character: (id) => id === '001', background: () => false, bgm: () => false, se: () => false, tone: (id) => id === 'wild', panel: (name) => name === 'mercenary',
    })
    expect(messages(problems)).toEqual([
      'warning blocks.greet.0.bg: 背景の画像がありません: castle（仮のグラデーションで出ます）',
      'error blocks.greet.1.bgm: 存在しない曲: nope',
      'error blocks.greet.2.se: 存在しない効果音: boom',
      'error blocks.greet.3.show: 存在しない騎士 ID: 999',
      'error blocks.greet.4.tones.unknown: 知らない口調: unknown',
      'error blocks.greet.5.characters.999: 存在しない騎士 ID: 999',
      'error blocks.greet.5.characters.$merc: characters のキーは騎士 ID にしてください（変数は書けません）: $merc',
      'error blocks.greet.6.panel: 存在しない資料: nothing',
      'error blocks.greet.6.at: "left"・"center"・"right" のどれかにしてください',
    ])
  })

  it('checks the top level and the choices', () => {
    expect(messages(validateScript({ blocks: {}, choices: { a: { options: {} }, b: { label: 'x' } }, extra: 1 }))).toEqual([
      expect.stringContaining('error extra: 台本に extra は書けません'),
      'error title: title（シーンの題）を書いてください',
      'error choices.a.options: 選択肢がありません',
      'error choices.b: 選択肢は { "options": { キー: 文言 } } にしてください',
    ])
  })
})
