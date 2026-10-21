// The game state and the rules that change it, independent of React and the map
export * from './types'
export * from './actions'
export * from './queries'
export { MAX_MORALE, MAX_SOLDIERS, MAX_UNITS, defaultUnitType, INDIRECT_ABILITY_RATE, mixMorale, unitAbilities, unitTypesOf } from './army'
export * from './economy'
export { INITIAL_MORALE } from './economy/balance'
export { defenderArmy } from './defense'
export { DEFAULT_PLAYER_FACTION, createInitialState, readPlayerFaction } from './setup'
export { createGameStore, type GameStore } from './store'
export { GameContext, useGame } from './gameContext'
export { neighbours } from './world'
export {
  addMoveOrder, cancelMoveOrder, MOVE_MONTHS_PER_HOP, moveFromProblem, moveMonths, moveOrderProblem, moveRoute, moveTargets, movementLegs, runMovements,
  SOLO_HOPS_PER_MONTH, SOLO_MAX_MONTHS,
} from './movement'
