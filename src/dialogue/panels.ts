import { createElement, type ReactNode } from 'react'
import type { DialogueProviders, PanelContext } from 'norden-dialogue'
import { MercenaryProfile } from 'norden-ui'
import type { GameState } from '../game'
import { createInitialState } from '../game/setup'
import { mercenaryProfile } from '../scenes/strategy/mercenaryProfile'

let initial: GameState | undefined

/** The state of the scene; a block played alone in the editor has none, and takes the start of the game */
const stateOf = ({ state }: PanelContext): GameState => (state as GameState | undefined) ?? (initial ??= createInitialState())

/** The panels the scripts may show over the cut (`{ "panel": "<name>" }`), by name */
export const DIALOGUE_PANELS: Readonly<Record<string, (context: PanelContext) => ReactNode>> = {
  /** The mercenary `merc` with their abilities (the mercenary screen does not show them), and their face for the figure on the stage */
  mercenary: (context) => createElement(MercenaryProfile, { mercenary: mercenaryProfile(stateOf(context), String(context.vars.merc)), abilities: true, figure: false }),
}

export const PANELS: Pick<DialogueProviders, 'panel'> = {
  panel: (name, context) => DIALOGUE_PANELS[name]?.(context) ?? null,
}
