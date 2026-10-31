// The factions' relics: their アイテムボックス, dismantling, repairing and producing them, and 法王府's repairs
export { addRelic, relicsOf, withRelics } from './box'
export {
  debugAddRelic, dismantleProblem, dismantleRelic, PAPAL_FACTION, papalRepairCost, papalRepairProblem, producibleRelics, productionProblem, relicItemInfo, relicWorks,
  repairableRelics, repairProblem, requestPapalRepair, startRelicProduction, startRelicRepair,
  type RelicItemInfo, type RelicWorkInfo,
} from './relics'
export { runRelics } from './runRelics'
