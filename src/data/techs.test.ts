import { describe, expect, it } from 'vitest'
import { BUILDING_LIST, describeEffect } from './buildings'
import techSprite from './techSprite.json'
import { techDataProblems, techDepths, TECH_LIST, TECH_MAP, type Tech } from './techs'

const tech = (id: string, requires: string[]): Tech => ({ id, name: id, description: '', branch: 'physical', cost: 1, requires, effects: [] })

describe('the technologies\' data', () => {
  it('has the two roots, and every technology required is one, without cycles', () => {
    expect(TECH_LIST.filter((t) => t.requires.length === 0).map((t) => t.id)).toEqual(['physical_civ', 'arcane_civ'])
    expect(techDataProblems()).toEqual([])
    expect(new Set(TECH_LIST.map((t) => t.id)).size).toBe(TECH_LIST.length)
  })

  it('finds a technology required that is not one, and a cycle', () => {
    expect(techDataProblems([tech('a', ['x'])])).toEqual(['a の前提 x は技術ではありません'])
    expect(techDataProblems([tech('a', []), tech('b', ['a', 'c']), tech('c', ['b'])])).toEqual(['b の前提が循環しています', 'c の前提が循環しています'])
  })

  it('puts each technology one deeper than the deepest it requires', () => {
    const depths = techDepths()
    expect(depths.physical_civ).toBe(0)
    expect(depths.tactics).toBe(1)
    expect(depths.gunship).toBe(Math.max(depths.flight, depths.rifle_production) + 1)
  })

  it('has the pictures inside the sprite sheet, and the buildings need technologies there are', () => {
    for (const t of TECH_LIST) {
      if (!t.sprite) continue
      expect(t.sprite.x + techSprite.cellWidth, t.id).toBeLessThanOrEqual(techSprite.width)
      expect(t.sprite.y + techSprite.cellHeight, t.id).toBeLessThanOrEqual(techSprite.height)
    }
    for (const b of BUILDING_LIST) if (b.requiredTech) expect(TECH_MAP[b.requiredTech], b.id).toBeDefined()
  })

  it('writes the research buildings\' effect with its branch', () => {
    expect(describeEffect({ kind: 'researchPoints', value: 10, branch: 'physical' })).toBe('研究 +10（物理文明）')
    expect(describeEffect(TECH_MAP.physical_civ.effects[0])).toBe('生産 +5%')
  })
})
