import { cropMap } from '@norden/map-runtime/core/battleArea'
import type { Offset } from '@norden/map-runtime/core/hex'
import type { MapData } from '@norden/map-runtime/core/mapData'
import { loadMapFile } from '@norden/map-runtime/mapFiles'

/** Used for roads without a road map of their own (or without the area of the city attacked) */
export const FALLBACK_MAP_FILE = 'fluen.json'

/** The battlefield of a battle and where it came from (shown for debugging) */
export interface BattleMap {
  data: MapData
  file: string
  /** The area cut out of the road map; null for the whole fallback map */
  area: Offset | null
  /** Why the fallback map is used */
  fallback?: string
}

/** File of the road map between two cities: road-<smaller id>-<larger id>.json */
export const roadMapFile = (a: string, b: string) => `road-${[a, b].sort().join('-')}.json`

/**
 * The map of a battle at `to` attacked from `from`: the area of the city
 * attacked on the road map between them, or the whole fallback map when
 * there is none (with a warning in the console).
 */
export async function loadBattleMap(from: string, to: string): Promise<BattleMap> {
  const file = roadMapFile(from, to)
  let reason: string
  try {
    const road = await loadMapFile(file)
    const cities: readonly string[] = road.link?.cities ?? []
    const area = road.battleAreas?.[to]
    if (!cities.includes(from) || !cities.includes(to)) reason = `${file} の link.cities が ${from}–${to} ではありません`
    else if (!area) reason = `${file} に ${to} の範囲（battleAreas.${to}）がありません`
    else return { data: withoutUnits(cropMap(road, area)), file, area }
  } catch (e) {
    reason = `${file} を読めません（${e instanceof Error ? e.message : String(e)}）`
  }
  console.warn(`[battle] ${reason}。${FALLBACK_MAP_FILE} を使います`)
  return { data: withoutUnits(await loadMapFile(FALLBACK_MAP_FILE)), file: FALLBACK_MAP_FILE, area: null, fallback: reason }
}

/** Units of the map files are for trying out the editors; the battle places its own */
function withoutUnits(data: MapData): MapData {
  const rest = { ...data }
  delete rest.units
  return rest
}
