import { describe, expect, it } from 'vitest'
import { hireMercenary, setFlag } from '../game'
import { playing } from '../game/testing'
import { stateChanges } from './changes'

describe('stateChanges', () => {
  it('tells the gold, the flags, who serves where and the contracts', () => {
    const before = playing('carta')
    const after = setFlag(hireMercenary({ ...before, gold: { ...before.gold, carta: 6000 } }, 'P012', '042'), 'travelingMerchant:met', 1)
    expect(stateChanges(before, after)).toEqual([
      expect.stringMatching(/^金 .+: \d+ → 4000（[+-]\d+）$/),
      'フラグ travelingMerchant:met: なし → 1',
      expect.stringMatching(/^ブロック・ドゥンダリン: 所属なし（.+） → .+（.+）$/),
      'ドゥンダリン盾隊: 契約（月額 334）',
    ])
    expect(stateChanges(before, before)).toEqual([])
  })
})
