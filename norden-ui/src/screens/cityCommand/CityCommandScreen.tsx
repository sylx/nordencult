import type { CSSProperties, ReactNode } from 'react'
import CommandToolbar from '../../components/toolbar/CommandToolbar'
import type { ToolbarCommand } from '../../components/toolbar/CommandToolbar'
import DateBar from '../../components/hud/DateBar'
import CityNavigator from '../../components/parts/CityNavigator'
import type { InfoWindowSkin } from '../../skins'
import iconEndTurn from '../../assets/ui/icons/icon-sun.png'
import CityInfoWindow from './CityInfoWindow'
import { CITY_COMMAND_GROUPS } from './cityCommands'
import type { CityCommandId } from './cityCommands'
import type { CityView, TurnView } from '../types'
import '../screens.css'

export interface CommandState {
  disabled?: boolean
  /** Shown as the tooltip, e.g. why the command cannot be used */
  reason?: string
}

export interface CityCommandScreenProps {
  city: CityView
  turn: TurnView
  /** ◀ ▶ are disabled when omitted */
  onPrevCity?: () => void
  onNextCity?: () => void
  /** Position of the city among the player's cities */
  cityPosition?: { index: number; count: number }
  commandState?: Partial<Record<CityCommandId, CommandState>>
  onCommand: (id: CityCommandId) => void
  onEndTurn: () => void
  endTurnDisabled?: boolean
  onSelectNeighbour?: (cityId: string) => void
  /** Contents of the settings menu on the turn bar */
  turnMenu?: ReactNode
  /** Initial position of the city window */
  windowPosition?: { x: number; y: number }
  skin?: InfoWindowSkin
  /** Extra HUD of the host (e.g. a list of orders), drawn in the screen layer */
  children?: ReactNode
}

export function turnText(turn: TurnView) {
  const parts = [turn.dateLabel, `第${turn.turn}ターン`, turn.phaseLabel]
  const active = turn.activeFaction === null ? '全勢力の行動を解決中' : turn.activeFaction ? `${turn.activeFaction.name}の手番` : undefined
  return [...parts, active].filter(Boolean).join('　')
}

/** City command screen: ◀ ▶ between cities and the city window (left), turn bar (top right) and the action toolbar (bottom) */
export default function CityCommandScreen({
  city, turn, onPrevCity, onNextCity, cityPosition, commandState = {}, onCommand, onEndTurn, endTurnDisabled = false,
  onSelectNeighbour, turnMenu, windowPosition = { x: 56, y: 96 }, skin, children,
}: CityCommandScreenProps) {
  const command = (id: CityCommandId, label: string): ToolbarCommand => ({
    id, label, disabled: commandState[id]?.disabled, title: commandState[id]?.reason, onClick: () => onCommand(id),
  })
  const commands: ToolbarCommand[] = [
    ...CITY_COMMAND_GROUPS.map(group => {
      const icon = <img src={group.icon} alt="" />
      return group.commands
        ? { id: group.id, label: group.label, icon, children: group.commands.map(item => command(item.id, item.label)) }
        : { ...command(group.id as CityCommandId, group.label), icon }
    }),
    { id: 'end-turn', label: 'ターン終了', icon: <img src={iconEndTurn} alt="" />, tone: 'accent', disabled: endTurnDisabled, onClick: onEndTurn },
  ]

  return (
    <div className="norden-screen norden-city-command">
      <div className="norden-screen-top-left">
        <CityNavigator name={city.name} onPrev={onPrevCity} onNext={onNextCity} position={cityPosition} />
      </div>
      <div className="norden-screen-top-right">
        <DateBar phaseLabel={turn.phaseLabel} factionName={turn.activeFaction ? turn.activeFaction.name : turn.activeFaction}
          dateLabel={turn.dateLabel}>{turnMenu}</DateBar>
      </div>
      <CityInfoWindow city={city} onSelectNeighbour={onSelectNeighbour} x={windowPosition.x} y={windowPosition.y} skin={skin}
        style={{ '--norden-city-window-x': `${windowPosition.x}px`, '--norden-city-window-y': `${windowPosition.y}px` } as CSSProperties} />
      <div className="norden-screen-bottom-center">
        <CommandToolbar commands={commands} aria-label="都市コマンド" movable={true} />
      </div>
      {children}
    </div>
  )
}
