// The summoned units (召喚ユニット): summoning them with a relic, naming them, and what becomes of them
export { characterOf, isSummon, SUMMON_ID_PREFIX, summonCharacter } from './character'
export {
  autoSummonName, debugSummon, recoverSummons, releaseSummons, removeSummons, renameProblem, renameSummon, summonProblem, summonRelic, withSummonHp,
} from './summons'
export { summonStrength, type SummonStrength } from './strength'
