// The game state and the rules that change it, independent of React and the map
export * from './types'
export * from './actions'
export * from './queries'
export { MAX_MORALE, MAX_SOLDIERS, MAX_UNITS, defaultUnitType, hasOwnSoldiers, INDIRECT_ABILITY_RATE, isMercenary, mixMorale, ownMorale, ownSoldiers, unitAbilities, unitTypesOf } from './army'
export * from './economy'
export * from './research'
export * from './relics'
export * from './mercenaries'
export * from './summons'
export { INITIAL_MORALE } from './economy/balance'
export { defenderArmy } from './defense'
export { ESCAPE_RATE, ESCAPE_RATE_MOVING, debugImprison, escapeChance, runEscapes } from './prisoners'
export { rejoinCity, runRoaming, wanderer } from './roaming'
export { DEFAULT_PLAYER_FACTION, createInitialState, readPlayerFactions } from './setup'
export { clearFlag, flagOf, isFlagKey, setFlag, type FlagValue } from './flags'
export { buySupplies, buySuppliesProblem } from './trade'
export { createGameStore, type GameStore } from './store'
export { GameContext, useGame } from './gameContext'
export { neighbours } from './world'
export {
  addMoveOrder, addTransportOrder, cancelMoveOrder, cancelTransportOrder, MOVE_HOPS_PER_MONTH, moveFromProblem, moveMonths, moveOrderProblem, moveRoute,
  moveTargets, movementLegs, runMovements, SOLO_HOPS_PER_MONTH, SOLO_MAX_MONTHS, transportFromProblem, transportKnightProblem, transportKnights,
  transportOrderProblem,
} from './movement'
