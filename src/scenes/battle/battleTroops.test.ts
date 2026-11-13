import { describe, expect, it, vi } from 'vitest'
import type { UnitStatus } from '@norden/battle-runtime'
import { retreatFailChance } from '../../../norden-battle/battle-runtime/src/retreat'
import { troopStatus } from '../../../norden-battle/battle-runtime/src/unitStatus'
import { wipeoutCaptureChance } from '../../../norden-battle/battle-runtime/src/wipeout'
import { BALANCE, type Battle, type SummonState } from '../../game'
import { battleTroops } from './battleTroops'

// The runtime needs a window: only what battleTroops uses of it
vi.mock('@norden/battle-runtime', async () => import('../../../norden-battle/battle-runtime/src/unitStatus'))

const army = { knights: [], commander: null, morale: 33 }
const battle: Battle = {
  id: 'battle-1', orderId: 'order-1', cityId: 'P004', undefended: false, pendingDefense: false,
  attacker: {
    ...army, factionId: 'carta', from: 'P012', commander: '015', knights: ['015', '042'],
    units: [{ knightId: '015', unitType: 'cavalry', soldiers: 300 }, { knightId: '042', unitType: 'cavalry', soldiers: 500 }],
  },
  defender: { ...army, factionId: 'leonis', units: [{ knightId: null, unitType: 'infantry', soldiers: 100 }] },
}

describe('battleTroops', () => {
  const statuses: UnitStatus[] = battleTroops(battle).troops({} as never).map((t) => t.status!)

  it('gives a mercenary\'s unit their own morale, and marks it as not captured', () => {
    expect(statuses[1]).toMatchObject({ morale: BALANCE.MERCENARY_MORALE, uncapturable: true })
  })

  it('leaves the others at their side\'s morale, to be captured', () => {
    expect(statuses[0].morale).toBe(33)
    expect(statuses[0].uncapturable).toBeUndefined()
    expect(statuses[2].uncapturable).toBeUndefined()
  })

  it('casts nothing without the spells of what the knights wear', () => {
    expect(statuses.map((s) => s.spells)).toEqual([[], [], []])
  })

  it('gives a knight\'s unit the spells of what they wear (battleSpells), not a unit led indirectly', () => {
    const indirect: Battle = { ...battle, attacker: { ...battle.attacker, units: [...battle.attacker.units, { knightId: null, unitType: 'mage', soldiers: 100 }] } }
    const cast = battleTroops(indirect, { '015': ['flameLance'] }).troops({} as never).map((t) => t.status!.spells)
    expect(cast).toEqual([['flameLance'], [], [], []])
  })

  it('fights a summoned unit with its own abilities, name and morale, not captured', () => {
    const summon: SummonState = {
      templateId: '991', relicId: 'dragon', name: 'イグナーヴ', unitType: 'dragon', leadership: 61, strength: 72, intelligence: 83, hp: 450, maxHp: 600,
    }
    const withSummon: Battle = {
      ...battle,
      attacker: { ...battle.attacker, knights: ['015', 'summon-9'], units: [battle.attacker.units[0], { knightId: 'summon-9', unitType: 'dragon', soldiers: 450 }] },
    }
    const [, status] = battleTroops(withSummon, {}, { 'summon-9': summon }).troops({} as never).map((t) => t.status!)
    expect(status).toMatchObject({
      name: 'イグナーヴ', soldiers: 450, leadership: 61, strength: 72, intelligence: 83, morale: BALANCE.SUMMON_MORALE, uncapturable: true, commander: false,
    })
    expect(status.portrait).toBeDefined()
  })

  it('gives a knight\'s unit the knight\'s battle style, for the CPU; the garrison nobody leads has none', () => {
    expect(statuses[0].personality).toBe('cautious')
    expect(statuses[2].personality).toBeUndefined()
  })
})

describe('units not captured', () => {
  it('never fail to retreat, nor are captured wiped out, however many enemies are next to them', () => {
    for (const enemies of [0, 1, 2, 3, 9]) {
      expect(retreatFailChance(enemies, true)).toBe(0)
      expect(wipeoutCaptureChance(enemies, true)).toBe(0)
      expect(retreatFailChance(enemies)).toBeGreaterThan(0)
      expect(wipeoutCaptureChance(enemies)).toBeGreaterThan(0)
    }
  })

  it('carry the mark from what the game hands over', () => {
    const init = { soldiers: 10, morale: 50, leadership: 1, strength: 1, intelligence: 1 }
    expect(troopStatus('infantry', { ...init, uncapturable: true }).uncapturable).toBe(true)
    expect(troopStatus('infantry', init).uncapturable).toBeUndefined()
  })
})
