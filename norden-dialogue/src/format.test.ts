import { describe, expect, it } from 'vitest'
import { formatScript } from './format'

describe('formatScript', () => {
  it('writes a command a line, and a line a tone', () => {
    const text = formatScript({
      choices: { hire: { options: { yes: '契約する', no: 'やめておく' } } },
      title: '傭兵を雇う',
      $schema: '../../norden-dialogue/script.schema.json',
      params: { merc: 'character' },
      blocks: {
        greet: [
          { bg: 'tavern', fx: 'fade' },
          { say: '$merc', tones: { wild: '俺だ', old: ['ワシじゃ', 'ほれ'] }, text: '私だ' },
        ],
        empty: [],
      },
    })
    expect(text).toBe(`{
  "$schema": "../../norden-dialogue/script.schema.json",
  "title": "傭兵を雇う",
  "params": { "merc": "character" },
  "blocks": {
    "greet": [
      { "bg": "tavern", "fx": "fade" },
      { "say": "$merc", "text": "私だ",
        "tones": {
          "wild": "俺だ",
          "old": ["ワシじゃ", "ほれ"]
        } }
    ],
    "empty": []
  },
  "choices": {
    "hire": { "options": { "yes": "契約する", "no": "やめておく" } }
  }
}
`)
    expect(JSON.parse(text)).toMatchObject({ title: '傭兵を雇う' })
  })

  it('writes a line a character, after the tones', () => {
    const text = formatScript({
      title: 'x',
      blocks: { a: [{ say: '$merc', text: '私だ', characters: { '110': ['俺様だ', 'ほれ'] }, tones: { wild: '俺だ' } }, { say: '001', text: 'x', characters: {} }] },
    })
    expect(text).toContain(`    "a": [
      { "say": "$merc", "text": "私だ",
        "tones": {
          "wild": "俺だ"
        },
        "characters": {
          "110": ["俺様だ", "ほれ"]
        } },
      { "say": "001", "text": "x", "characters": {} }
    ]`)
    expect(formatScript(JSON.parse(text))).toBe(text)
  })

  it('is stable: formatting its own output changes nothing', () => {
    const once = formatScript({ title: 'x', blocks: { a: [{ narrate: '改行\nあり "引用"' }, { say: '001', text: [], tones: {} }] } })
    expect(formatScript(JSON.parse(once))).toBe(once)
  })
})
