import { describe, expect, it } from 'vitest'
import { FACTION_LIST } from './faction'
import relicSprite from './relicSprite.json'
import { relicDataProblems, relicEffectProblems, relicName, relicRarity, RELIC_LIST, RELIC_MAP, SPELL_IDS, type Relic } from './relics'

const relic = (id: string, change: Partial<Relic> = {}): Relic =>
  ({ id, name: id, description: '', rarity: 'C', use: 'equipment', equipment: { wearer: 'nonMagician', unitTypes: ['rifleman'] }, ...change })
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

  it('finds an effect that disagrees with its use, gives nothing, or refers to what is not', () => {
    const refs = { characterIds: ['991'], buildingRelics: ['gun'] }
    const summon: NonNullable<Relic['summon']> = { characterId: '991', unitType: 'dragon', hp: 600 }
    expect(relicEffectProblems(relic('a'), refs)).toEqual([])
    expect(relicEffectProblems(relic('a', { equipment: undefined }), refs)).toEqual(['装備なのに装備の効果がありません'])
    expect(relicEffectProblems(relic('a', { use: 'summon', summon }), refs)).toEqual(['装備でないのに装備の効果があります'])
    expect(relicEffectProblems(relic('a', { use: 'summon', equipment: undefined, summon }), refs)).toEqual([])
    expect(relicEffectProblems(relic('a', { use: 'summon', equipment: undefined }), refs)).toEqual(['召喚なのに召喚の型紙がありません'])
    expect(relicEffectProblems(relic('a', { summon }), refs)).toEqual(['召喚でないのに召喚の型紙があります'])
    expect(relicEffectProblems(relic('gun', { use: 'building', equipment: undefined }), refs)).toEqual([])
    expect(relicEffectProblems(relic('a', { use: 'building', equipment: undefined }), refs)).toEqual(['施設の遺物なのに、この遺物の要る施設がありません'])

    expect(relicEffectProblems(relic('a', { equipment: { wearer: 'magician' } }), refs)).toEqual(['装備しても兵種も魔法も増えません'])
    expect(relicEffectProblems(relic('a', { equipment: { wearer: 'nonMagician', unitTypes: ['dragon', 'nope' as never] } }), refs))
      .toEqual(['装備の兵種 dragon は騎士の率いる兵種ではありません', '装備の兵種 nope は騎士の率いる兵種ではありません'])
    expect(relicEffectProblems(relic('a', { equipment: { wearer: 'magician', spells: ['flameLance', 'thunderFall' as never] } }), refs))
      .toEqual(['装備の魔法 thunderFall は魔法ではありません'])
    expect(relicEffectProblems(relic('a', { equipment: { wearer: 'nonMagician', spells: ['flameLance'] } }), refs)).toEqual(['魔法は魔術師の装備にだけ付けられます'])

    const summoning = (change: Partial<typeof summon>) => relic('a', { use: 'summon', equipment: undefined, summon: { ...summon, ...change } })
    expect(relicEffectProblems(summoning({ characterId: '001' }), refs)).toEqual(['召喚の型紙のキャラクター 001 は特殊キャラクター（991〜999）ではありません'])
    expect(relicEffectProblems(summoning({ characterId: '992' }), refs)).toEqual(['召喚の型紙のキャラクター 992 がいません'])
    expect(relicEffectProblems(summoning({ unitType: 'cavalry', hp: 0 }), refs)).toEqual(['召喚の兵種 cavalry は魔物の兵種ではありません', '召喚の HP は 1 以上にしてください'])
    expect(relicDataProblems([relic('a', { ...broken, equipment: undefined })], [], refs)).toEqual(['a: 装備なのに装備の効果がありません'])
  })

  it('gives the relics the effects decided for M009', () => {
    const effect = (id: string) => ({ use: RELIC_MAP[id].use, ...RELIC_MAP[id].equipment, ...RELIC_MAP[id].summon })
    expect(effect('rifle')).toEqual({ use: 'equipment', wearer: 'nonMagician', unitTypes: ['rifleman'] })
    expect(effect('field_gun')).toEqual({ use: 'equipment', wearer: 'nonMagician', unitTypes: ['artillery'] })
    expect(['grimoire_flame_lance', 'grimoire_frost_nova', 'grimoire_earth_spike', 'grimoire_chain_lightning', 'grimoire_prismatic', 'grimoire_meteor_fall']
      .map((id) => [RELIC_MAP[id].equipment?.minIntelligence, RELIC_MAP[id].equipment?.spells])).toEqual([
      [70, ['flameLance']], [70, ['frostNova']], [70, ['earthSpike']], [80, ['thorHammer']],
      [90, ['thorHammer', 'flameLance', 'frostNova', 'earthSpike']], [95, ['meteorFall']],
    ])
    expect(['dragon', 'golem', 'behemoth'].map(effect)).toEqual([
      { use: 'summon', characterId: '991', unitType: 'dragon', hp: 600 },
      { use: 'summon', characterId: '992', unitType: 'golem', hp: 800 },
      { use: 'summon', characterId: '993', unitType: 'behemoth', hp: 1000 },
    ])
    expect(['cannon', 'ballista', 'arcane_focus', 'gunship'].map((id) => RELIC_MAP[id].use)).toEqual(['building', 'building', 'building', 'building'])
    // Every spell is on some 魔導書
    expect(new Set(RELIC_LIST.flatMap((r) => r.equipment?.spells ?? []))).toEqual(new Set(SPELL_IDS))
  })

  it('has a 魔導書 of its own for each technology of magic, none of them broken', () => {
    const grimoires = RELIC_LIST.filter((r) => r.id.startsWith('grimoire_'))
    expect(grimoires.map((r) => r.production?.tech).sort()).toEqual(['archmage', 'celestial_magic', 'earth_magic', 'fire_magic', 'lightning_magic', 'water_magic'])
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
    expect(relicName('grimoire_flame_lance', false)).toBe('火の魔導書')
    expect(relicName('nope', true)).toBe('nope')
  })

  it('shows a broken relic one grade below its rarity', () => {
    expect((['S', 'A', 'B', 'C'] as const).map((rarity) => relicRarity(relic('r', { rarity }), false))).toEqual(['A', 'B', 'C', 'D'])
    expect(relicRarity(relic('r', { rarity: 'C' }), true)).toBe('C')
  })

  it('hands out broken only relics with a broken state', () => {
    const handedOut = FACTION_LIST.flatMap((f) => f.relics ?? [])
    expect(handedOut.length).toBeGreaterThan(0)
    for (const { relicId, repaired } of handedOut) expect(repaired ? RELIC_MAP[relicId] : RELIC_MAP[relicId]?.brokenName, relicId).toBeDefined()
    expect(FACTION_LIST.find((f) => f.id === 'sede')?.relics).toBeUndefined()
  })
})
