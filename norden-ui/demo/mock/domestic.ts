import { useState } from 'react'
import type { AssignmentRoleView, BuildOptionView, CityAssignmentsView, CityView, DomesticScreenProps } from '../../src'
import { BUILDINGS, cityView, knightsIn } from './data'

/** Demo-only rules of the domestic screen: costs, a 生産 of 130 a turn and made-up bonuses */

const COSTS: Record<string, { supplies: number; gold: number; tier?: number }> = {
  market: { supplies: 300, gold: 100 }, workshop: { supplies: 400, gold: 120 }, granary: { supplies: 300, gold: 80 },
  barracks: { supplies: 400, gold: 150 }, training_ground: { supplies: 500, gold: 150, tier: 2 },
  harbor: { supplies: 600, gold: 200, tier: 2 }, temple: { supplies: 500, gold: 180, tier: 2 },
}
const PRODUCTION = 130

interface CityState {
  built: string[]
  construction: { id: string; invested: number } | null
  assignments: CityAssignmentsView
}

const governorBonus = (id: string) => [`商業 +${id.length * 3}%`, `生産 +${id.length * 2}%`]
const militaryBonus = (ids: readonly string[]) => (ids.length ? [`訓練 +${(1 + ids.length * 0.5).toFixed(1)}`, `募兵 +${ids.length * 6}%`] : [])

/** The domestic screen's props for a mock city, kept in demo state; `log` gets what the player does */
export function useMockDomestic(log: (text: string) => void) {
  const [gold, setGold] = useState(500)
  const [cities, setCities] = useState<Record<string, CityState>>({})

  const stateOf = (cityId: string): CityState => {
    const base = cityView(cityId)
    return cities[cityId] ?? {
      built: base.buildings?.built.map(b => b.id) ?? [],
      construction: base.buildings?.construction ? { id: base.buildings.construction.building.id, invested: base.buildings.construction.invested } : null,
      assignments: { governor: knightsIn(cityId)[0]?.id, military: [] },
    }
  }
  const change = (cityId: string, patch: Partial<CityState>) => setCities(all => ({ ...all, [cityId]: { ...stateOf(cityId), ...patch } }))

  const view = (cityId: string): CityView => {
    const base = cityView(cityId)
    const state = stateOf(cityId)
    const slots = base.buildings?.slots ?? 2
    return {
      ...base,
      buildings: {
        slots,
        built: state.built.map(id => BUILDINGS[id]!),
        construction: state.construction && {
          building: BUILDINGS[state.construction.id]!, invested: state.construction.invested,
          required: COSTS[state.construction.id]!.supplies,
          turnsLeft: Math.ceil((COSTS[state.construction.id]!.supplies - state.construction.invested) / PRODUCTION),
        },
      },
    }
  }

  const props = (cityId: string): Omit<DomesticScreenProps, 'onClose'> => {
    const city = view(cityId)
    const state = stateOf(cityId)
    const buildOptions: BuildOptionView[] = Object.values(BUILDINGS).filter(b => !state.built.includes(b.id)).map(b => {
      const cost = COSTS[b.id]!
      const reason = (cost.tier ?? 1) > (city.tier ?? 1) ? `Tier ${cost.tier} 以上の都市で建てられます`
        : state.construction ? 'ほかの施設を建設中です'
          : state.built.length >= (city.buildings?.slots ?? 0) ? '施設の空きがありません'
            : gold < cost.gold ? '金が足りません' : undefined
      return { ...b, ...cost, turns: Math.ceil(cost.supplies / PRODUCTION), unavailableReason: reason }
    })
    const { assignments } = state
    return {
      city, gold, buildOptions,
      onBuild: id => {
        setGold(value => value - COSTS[id]!.gold)
        change(cityId, { construction: { id, invested: 0 } })
        log(`着工: ${BUILDINGS[id]!.name}`)
      },
      onCancelConstruction: () => { change(cityId, { construction: null }); log('建設を中止') },
      knights: knightsIn(cityId),
      assignments,
      bonuses: { governor: assignments.governor ? governorBonus(assignments.governor) : [], military: militaryBonus(assignments.military) },
      forecast: (id, role: AssignmentRoleView) =>
        role === 'governor' ? governorBonus(id) : militaryBonus([...assignments.military.filter(k => k !== id), id]),
      onAssign: (id, role) => {
        const military = assignments.military.filter(k => k !== id)
        const governor = assignments.governor === id ? undefined : assignments.governor
        change(cityId, { assignments: role === 'governor' ? { governor: id, military } : { governor, military: [...military, id] } })
        log(`割当: ${id} → ${role === 'governor' ? '代官' : '軍事担当'}`)
      },
      onUnassign: id => {
        change(cityId, { assignments: {
          governor: assignments.governor === id ? undefined : assignments.governor, military: assignments.military.filter(k => k !== id),
        } })
        log(`担当を外す: ${id}`)
      },
    }
  }

  return { props, view }
}
