import { describe, expect, it } from 'vitest'
import { cpuPlayer } from '@norden/battle-runtime/cpu'
import { seededRng, type Player } from '@norden/battle-runtime/engine'
import { SIDE_TEAM, troopStatus, type Troop, type TroopFactory } from '@norden/battle-runtime/rules'
import { cropBattleArea } from '@norden/map-runtime/core/battleArea'
import { parseMapData, type MapData } from '@norden/map-runtime/core/mapData'
import type { TeamId, UnitType } from '@norden/map-runtime/core/units'
import { AUTO_BATTLE_MAX_TURNS, runAutoBattle, setupAutoBattle } from './autoBattle'
import roadMap from '../../../norden-battle/assets/maps/road-P003-P005.json'

/** The P005 side of a road map, without the units placed for trying out the editors (as loadBattleMap) */
function battlefield(): MapData {
  const road = parseMapData(roadMap)
  const data = { ...cropBattleArea(road, 'P005') }
  delete data.units
  return data
}

const LEADER = { leadership: 60, strength: 60, intelligence: 60 }
const troop = (side: Troop['side'], id: string, type: UnitType, commander = false): Troop =>
  ({ id, side, type, status: troopStatus(type, { ...LEADER, soldiers: 800, morale: 60, commander, personality: 'cautious' }) })
const troops: TroopFactory = () => [
  troop('attacker', 'a1', 'cavalry', true), troop('attacker', 'a2', 'infantry'), troop('attacker', 'a3', 'archer'),
  troop('defender', 'd1', 'infantry', true), troop('defender', 'd2', 'archer'),
]
const retreats = {
  [SIDE_TEAM.attacker]: [{ id: 'P003', name: '後方' }],
  [SIDE_TEAM.defender]: [{ id: 'P006', name: '後方' }],
}
const players = (): Partial<Record<TeamId, Player>> => ({
  [SIDE_TEAM.attacker]: cpuPlayer({ difficulty: 'normal' }),
  [SIDE_TEAM.defender]: cpuPlayer({ difficulty: 'normal' }),
})

async function fight(seed: number) {
  const p = players()
  const state = setupAutoBattle(battlefield(), troops, retreats, p)
  if (!state) throw new Error('not deployed')
  return runAutoBattle(state, p, seededRng(seed))
}

describe('a battle decided without drawing it', () => {
  it('deploys both sides with the troops given, by their troop ids', () => {
    const state = setupAutoBattle(battlefield(), troops, retreats, players())!
    expect([...state.troopIds.values()].sort()).toEqual(['a1', 'a2', 'a3', 'd1', 'd2'])
    expect([...state.statuses.values()].every((s) => s.personality === 'cautious')).toBe(true)
  })

  it('is fought on the battle screen when the map has no deployment points', () => {
    const data = battlefield()
    delete data.deploy
    expect(setupAutoBattle(data, troops, retreats, players())).toBeNull()
  })

  it('is fought out by the CPUs, reporting what the battle screen reports', async () => {
    const { outcome, remaining, retreated, wipedOut } = await fight(1)
    expect(outcome).not.toBeNull()
    expect(outcome!.remaining).toBe(remaining)
    // Every troop is either left on the battlefield, retreated or wiped out
    const ids = [...remaining, ...retreated, ...wipedOut].map((u) => u.troopId)
    expect(new Set(ids)).toEqual(new Set(['a1', 'a2', 'a3', 'd1', 'd2']))
  })

  it('comes out the same with the same random numbers', async () => {
    const [a, b] = [await fight(7), await fight(7)]
    expect(b.outcome?.winner).toBe(a.outcome?.winner)
    expect(b.outcome?.turn).toBe(a.outcome?.turn)
    expect(b.remaining.map((u) => [u.troopId, u.status.soldiers])).toEqual(a.remaining.map((u) => [u.troopId, u.status.soldiers]))
  })

  it('stops when aborted', async () => {
    const p = players()
    const state = setupAutoBattle(battlefield(), troops, retreats, p)!
    const abort = new AbortController()
    abort.abort()
    await expect(runAutoBattle(state, p, seededRng(1), abort.signal)).rejects.toThrow()
    expect(state.turn).toBeLessThanOrEqual(AUTO_BATTLE_MAX_TURNS)
  })
})
