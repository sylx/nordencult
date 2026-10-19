import { CHARACTER_MAP } from '../../data/character'
import type { AffairsResult, CityId, CityLogLine, CityRecord, CityState } from '../types'
import {
  GROWTH_COEF_COMMERCE, GROWTH_COEF_PRODUCTION, POP_GROWTH_COEF_MARKET, POP_GROWTH_COEF_PRODUCTION, POP_GROWTH_FACILITY_BASE,
  POP_GROWTH_GOVERNOR_DIVISOR,
} from './balance'
import { outputOf, type CityOutput, type PopulationGrowth } from './output'

/**
 * The record of a city's numbers kept each turn (GameState.cityHistory), and the log of how an economy
 * run changed them: each line the formula of balance.ts with the numbers it used, for checking the rules and coefficients
 */

/** Up to two decimals (or `digits`), e.g. 85.33, 12,000 */
const num = (value: number, digits = 2) => value.toLocaleString('ja-JP', { maximumFractionDigits: digits })
const pct = (fraction: number) => `${num(fraction * 100)}%`

export function cityRecord(city: CityState, cityId: CityId, turn: number, log: readonly CityLogLine[] = []): CityRecord {
  const { market, production, baseMarket, baseProduction } = outputOf(city, cityId)
  return { turn, population: city.population, market, production, baseMarket, baseProduction, log }
}

/** The base 商業・生産 the officers raised: max(1, spent × X/100 × GROWTH_COEF_*), rounded (affairsGain) */
function baseLine(
  role: 'commerce' | 'production', before: CityState, after: CityState, output: CityOutput, result: AffairsResult | undefined,
): CityLogLine {
  const [stat, key, coef] = role === 'commerce'
    ? ['baseMarket', 'market', GROWTH_COEF_COMMERCE] as const
    : ['baseProduction', 'production', GROWTH_COEF_PRODUCTION] as const
  const power = output.officers[role]
  const formula = result
    ? `担当官: max(1, 金 ${num(result.spent)} × 能力 ${num(power)} / 100 × ${coef}) = ${num(Math.max(1, result.spent * power / 100 * coef))} → ${result.gain}`
    : power > 0 ? '担当官: 予算なし' : '担当官なし'
  return { stat, before: before[key], after: after[key], formula }
}

/** The population growth: floor((経済 + 施設) × 領主 × (1 + 施設の人口の伸び)) (populationGrowth) */
function populationLine(before: CityState, after: CityState, growth: PopulationGrowth): CityLogLine {
  const lord = after.assignments.governor ? CHARACTER_MAP[after.assignments.governor] : undefined
  const economy = `経済 (商業 ${num(after.market)} × ${POP_GROWTH_COEF_MARKET} + 生産 ${num(after.production)} × ${POP_GROWTH_COEF_PRODUCTION} = ${num(growth.economy)})`
  const facilities = `施設 (${after.buildings.length} × ${POP_GROWTH_FACILITY_BASE} = ${num(growth.facilities)})`
  const governor = lord
    ? `領主 (1 + (政治 ${lord.politics} + 魅力 ${lord.charm}) / ${POP_GROWTH_GOVERNOR_DIVISOR} = ${num(growth.governor, 4)})`
    : '領主不在 1'
  return {
    stat: 'population',
    before: before.population,
    after: after.population,
    formula: `floor((${economy} + ${facilities}) × ${governor} × (1 + 施設 ${pct(growth.buildingPct)})) = ${num(growth.total)}`,
  }
}

/** The effective 商業・生産 of the new turn: round(base × (1 + governor's + buildings' bonus)) (outputOf) */
function effectiveLine(stat: 'market' | 'production', before: CityOutput, after: CityOutput): CityLogLine {
  const [base, buildings] = stat === 'market'
    ? [after.baseMarket, after.buildings.marketPct]
    : [after.baseProduction, after.buildings.productionPct]
  return {
    stat,
    before: before[stat],
    after: after[stat],
    formula: `round(基礎 ${num(base)} × (1 + 領主 ${pct(after.governor[stat])} + 施設 ${pct(buildings)})) = ${num(after[stat])}`,
  }
}

/**
 * How a city's economy run changed its base 商業・生産 (the officers), its population and its effective 商業・生産.
 * `output` is the city's before the run, `growth` the population growth the run applied
 */
export function explainCity(
  cityId: CityId, before: CityState, after: CityState, output: CityOutput,
  affairs: Partial<Record<'commerce' | 'production', AffairsResult>>, growth: PopulationGrowth,
): CityLogLine[] {
  const next = outputOf(after, cityId)
  return [
    baseLine('commerce', before, after, output, affairs.commerce),
    baseLine('production', before, after, output, affairs.production),
    populationLine(before, after, growth),
    effectiveLine('market', output, next),
    effectiveLine('production', output, next),
  ]
}
