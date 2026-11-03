import { createElement, type ReactNode } from 'react'
import type { DialogueProviders, PanelContext } from 'norden-dialogue'
import { MercenaryProfile } from 'norden-ui'
import type { GameState } from '../game'
import { createInitialState } from '../game/setup'
import { mercenaryProfile } from '../scenes/strategy/mercenaryProfile'

let initial: GameState | undefined

/** The state of the scene; a block played alone in the editor has none, and takes the start of the game */
const stateOf = ({ state }: PanelContext): GameState => (state as GameState | undefined) ?? (initial ??= createInitialState())

/** 契約金 and 月額 from the variables `price` and `monthly`, those of them there are (what the lines say they ask) */
function prices({ vars }: PanelContext) {
  return ([['契約金', vars.price], ['月額', vars.monthly]] as const).flatMap(([label, value]) => (typeof value === 'number' ? [{ label, value }] : []))
}

/** The panels the scripts may show over the cut (`{ "panel": "<name>" }`), by name */
export const DIALOGUE_PANELS: Readonly<Record<string, (context: PanelContext) => ReactNode>> = {
  /**
   * The mercenary `merc` with their abilities and what they ask (the mercenary screen shows neither), and their face for
   * the figure on the stage
   */
  mercenary: (context) => createElement(MercenaryProfile, {
    mercenary: mercenaryProfile(stateOf(context), String(context.vars.merc)), abilities: true, figure: false, prices: prices(context),
  }),
}

export const PANELS: Pick<DialogueProviders, 'panel'> = {
  panel: (name, context) => DIALOGUE_PANELS[name]?.(context) ?? null,
}
