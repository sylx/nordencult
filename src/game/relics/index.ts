// The factions' relics: their アイテムボックス, dismantling, repairing and producing them, 法王府's repairs, and the knights wearing them
export { addRelic, equipmentEffects, facilityRelics, freeFacilityRelic, relicsOf, withoutRelicItem, withRelicItem, withRelics } from './box'
export {
  battleSpells, debugEquipRelic, debugUnequipRelic, equipmentChangeProblem, equipmentOf, equippableKnights, equippableRelics, equipProblem, equipRelic, freeSlot, releaseEquipment, unequipProblem,
  unequipRelic,
} from './equipment'
export {
  debugAddRelic, dismantleProblem, dismantleRelic, PAPAL_FACTION, papalRepairCost, papalRepairProblem, producibleRelics, productionProblem, relicItemInfo, relicWorks,
  repairableRelics, repairProblem, requestPapalRepair, startRelicProduction, startRelicRepair,
  type RelicItemInfo, type RelicWorkInfo,
} from './relics'
export { runRelics } from './runRelics'
