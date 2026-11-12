import type { RemainingUnit, RetreatReport, WipeoutReport } from '@norden/battle-runtime'
import {
  createBattleState, runTeamTurn, runTurnEnd, startBattle, type BattleState, type Player, type Rng, type SimOptions,
} from '@norden/battle-runtime/engine'
import { Deployment, SIDE_TEAM, type BattleOutcome, type RetreatDestinations, type TroopFactory } from '@norden/battle-runtime/rules'
import { HexMap, type MapData } from '@norden/map-runtime/core/mapData'
import type { TeamId } from '@norden/map-runtime/core/units'

/**
 * Turns a battle decided without drawing it is fought for at most. Battles on the battle screen have no
 * limit; the CPU almost always settles them sooner (the simulator's battles take 11〜19 turns on average)
 */
export const AUTO_BATTLE_MAX_TURNS = 30

/** A battle decided without drawing it: as the battle screen reports it */
export interface AutoBattleResult {
  /** The battle decided; null when it was not within AUTO_BATTLE_MAX_TURNS */
  outcome: BattleOutcome | null
  retreated: readonly RetreatReport[]
  wipedOut: readonly WipeoutReport[]
  /** The units left on the battlefield (outcome.remaining, or every unit when not decided) */
  remaining: readonly RemainingUnit[]
}

/**
 * The battle's state with both sides deployed by their players (as the battle screen's deployment phase,
 * the defender first). Null when the map has no deployment points or a side cannot finish deploying
 * (no units, or no place for its commander): the battle is then fought on the battle screen
 */
export function setupAutoBattle(
  data: MapData, troops: TroopFactory, retreats: RetreatDestinations, players: Partial<Record<TeamId, Player>>,
): BattleState | null {
  if (!data.deploy) return null
  const map = new HexMap(data)
  const state = createBattleState(map, new Map(), { stronghold: data.stronghold ?? null, retreats })
  const deployment = new Deployment(map, data.deploy, troops(data.deploy), state.statuses)
  while (deployment.side) {
    const player = players[SIDE_TEAM[deployment.side]]
    if (player?.deploy) player.deploy(state, deployment)
    else deployment.auto()
    if (!deployment.finish()) return null
  }
  state.troopIds = deployment.troopIds()
  return state
}

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * Fights the battle out with the players, a side's turn at a time (giving the page a moment between turns,
 * so it keeps drawing). Rejects with the signal's reason when aborted
 */
export async function runAutoBattle(
  state: BattleState, players: Partial<Record<TeamId, Player>>, rng: Rng, signal?: AbortSignal,
): Promise<AutoBattleResult> {
  const options: SimOptions = { players, rng, playerRng: rng }
  startBattle(state)
  while (!state.outcome && state.turn <= AUTO_BATTLE_MAX_TURNS) {
    await nextTask()
    signal?.throwIfAborted()
    runTeamTurn(state, options)
    if (!state.outcome) runTurnEnd(state, options)
  }
  const outcome = state.outcome as BattleOutcome | null
  const remaining = outcome?.remaining ?? state.map.allUnits().flatMap((unit) => {
    const status = state.statuses.get(unit)
    return status ? [{ unit, troopId: state.troopIds.get(unit) ?? null, status }] : []
  })
  return { outcome, retreated: state.retreated, wipedOut: state.wipedOut, remaining }
}
