import { describe, expect, it } from 'vitest'
import { FACTION_LIST } from './faction'
import relicSprite from './relicSprite.json'
import { relicDataProblems, relicName, RELIC_LIST, RELIC_MAP, type Relic } from './relics'

const relic = (id: string, change: Partial<Relic> = {}): Relic => ({ id, name: id, description: '', rarity: 'C', use: 'equipment', ...change })
const broken: Partial<Relic> = { brokenName: '壊れた', dismantlePoints: 100, repair: { supplies: 100, gold: 50 } }

describe('the relics\' data', () => {
  it('has unique ids, the technologies are ones, and each broken state is whole', () => {
    expect(new Set(RELIC_LIST.map((r) => r.id)).size).toBe(RELIC_LIST.length)
    expect(relicDataProblems()).toEqual([])
  })

  it('finds a technology that is not one, a broken state not whole, and a relic that cannot be had', () => {
    const techs = [{ id: 'known' }]
    expect(relicDataProblems([relic('a', { ...broken, repair: { supplies: 1, gold: 1, tech: 'x' } })], techs)).toEqual(['a の技術 x は技術ではありません'])
    expect(relicDataProblems([relic('a', { production: { supplies: 1, gold: 1, tech: 'known' } })], techs)).toEqual([])
    expect(relicDataProblems([relic('a', { ...broken, dismantlePoints: undefined })], techs)).toEqual(['a の壊れた状態の名前・解体・修復がそろっていません'])
    expect(relicDataProblems([relic('a')], techs)).toEqual(['a は壊れた状態も生産も持ちません'])
  })

  it('has a 魔導書 of its own for each technology of magic, none of them broken', () => {
    const grimoires = RELIC_LIST.filter((r) => r.id.startsWith('grimoire_'))
    expect(grimoires.map((r) => r.production?.tech).sort()).toEqual(['celestial_magic', 'earth_magic', 'fire_magic', 'lightning_magic', 'water_magic'])
    for (const r of grimoires) expect(r.brokenName, r.id).toBeUndefined()
  })

  it('has the pictures inside the sprite sheet, a broken one for those with a broken state', () => {
    for (const r of RELIC_LIST) {
      for (const sprite of [r.sprite, r.brokenSprite]) {
        if (!sprite) continue
        expect(sprite.x + relicSprite.cellWidth, r.id).toBeLessThanOrEqual(relicSprite.width)
        expect(sprite.y + relicSprite.cellHeight, r.id).toBeLessThanOrEqual(relicSprite.height)
      }
      expect(Boolean(r.brokenSprite), r.id).toBe(r.brokenName !== undefined)
    }
  })

  it('names a relic by its state', () => {
    expect(relicName('rifle', false)).toBe('壊れたライフル')
    expect(relicName('rifle', true)).toBe('ライフル')
    expect(relicName('grimoire_flame_lance', false)).toBe('フレイムランスの魔導書')
    expect(relicName('nope', true)).toBe('nope')
  })

  it('hands out only relics with a broken state', () => {
    const handedOut = FACTION_LIST.flatMap((f) => f.relics ?? [])
    expect(handedOut.length).toBeGreaterThan(0)
    for (const id of handedOut) expect(RELIC_MAP[id]?.brokenName, id).toBeDefined()
    expect(FACTION_LIST.find((f) => f.id === 'sede')?.relics).toBeUndefined()
    for (const id of FACTION_LIST.flatMap((f) => f.repairedRelics ?? [])) expect(RELIC_MAP[id], id).toBeDefined()
  })
})
