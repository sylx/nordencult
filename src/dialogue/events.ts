import { citiesOf, type FactionId, type GameState } from '../game'
import type { DialogueId, DialogueInput } from './index'

/** A random event: a dialogue scene that may happen to a faction (when exploring; not called from the game yet) */
export interface RandomEvent<K extends DialogueId = DialogueId> {
  id: string
  scene: K
  /** The input of the scene when it can happen to the faction now, or null */
  when: (state: GameState, factionId: FactionId) => DialogueInput<K> | null
  /** How often, against the other events that can happen */
  weight: number
}

/** Any of the random events, each with its own scene's input */
export type AnyRandomEvent = { [K in DialogueId]: RandomEvent<K> }[DialogueId]

export const RANDOM_EVENTS: readonly AnyRandomEvent[] = [
  {
    id: 'travelingMerchant', scene: 'travelingMerchant', weight: 10,
    // To the faction's city with the fewest supplies
    when: (state, factionId) => {
      const [city] = citiesOf(state, factionId).sort((a, b) => state.cities[a].storedSupplies - state.cities[b].storedSupplies)
      return city ? { city } : null
    },
  },
]

export interface PickedEvent {
  event: AnyRandomEvent
  input: DialogueInput<DialogueId>
}

/** One of the events that can happen to the faction now, by their weights; null: none can */
export function pickRandomEvent(
  state: GameState, factionId: FactionId, random: () => number = Math.random, events: readonly AnyRandomEvent[] = RANDOM_EVENTS,
): PickedEvent | null {
  const open = events.flatMap((event) => {
    const input = event.when(state, factionId)
    return input && event.weight > 0 ? [{ event, input }] : []
  })
  const total = open.reduce((sum, { event }) => sum + event.weight, 0)
  let roll = random() * total
  for (const picked of open) {
    roll -= picked.event.weight
    if (roll < 0) return picked
  }
  return open.at(-1) ?? null
}
