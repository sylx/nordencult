import type { CSSProperties, ReactNode } from 'react'
import CommandToolbar from '../../components/toolbar/CommandToolbar'
import type { ToolbarCommand } from '../../components/toolbar/CommandToolbar'
import DateBar from '../../components/hud/DateBar'
import FactionBar from '../../components/hud/FactionBar'
import type { InfoWindowProps } from '../../components/window/InfoWindow'
import type { InfoWindowSkin } from '../../skins'
import iconEndTurn from '../../assets/ui/icons/icon-sun.webp'
import CityInfoWindow from './CityInfoWindow'
import { CITY_COMMAND_GROUPS } from './cityCommands'
import type { CityCommandId } from './cityCommands'
import type { CityView, FactionSummaryView, FactionView, KnightView, TurnView } from '../types'
import '../screens.css'

export interface CommandState {
  disabled?: boolean
  /** Shown as the tooltip, e.g. why the command cannot be used */
  reason?: string
}

export interface CityCommandScreenProps {
  city: CityView
  turn: TurnView
  /** The player's faction (金・総生産・総兵力・研究), shown on the faction bar with the city switcher */
  faction?: FactionSummaryView
  /** Opens the technology screen from the faction bar's 研究 */
  onOpenResearch?: () => void
  /** The player's identity, even when inspecting another faction's city. */
  playerFaction?: FactionView
  /** ◀ ▶ are disabled when omitted */
  onPrevCity?: () => void
  onNextCity?: () => void
  /** Position of the city among the player's cities */
  cityPosition?: { index: number; count: number }
  commandState?: Partial<Record<CityCommandId, CommandState>>
  /** The command whose screen is open over this one (e.g. 内政), shown pressed and never disabled, so it can close that screen */
  activeCommand?: CityCommandId
  onCommand: (id: CityCommandId) => void
  onEndTurn: () => void
  endTurnDisabled?: boolean
  /** Why the turn cannot be ended, shown as its tooltip (e.g. 研究先を選んでください) */
  endTurnReason?: string
  /** Contents of the settings menu on the turn bar */
  turnMenu?: ReactNode
  /** Finds any knight by id for the knight profile (e.g. one a 略歴 names); only the city's knights are found when omitted */
  knightOf?: (id: string) => KnightView | undefined
  /** Where the city window starts; the screen fits it from there, wherever it is dragged */
  windowPosition?: { x: number; y: number }
  /** Where the movable parts are */
  layout?: CityCommandLayout
  /** A movable part was dragged or moved with the keys */
  onLayoutChange?: (part: keyof CityCommandLayout, position: { x: number; y: number }) => void
  /** Where the city window is and its size, as it is measured, dragged or resized (e.g. to keep things clear of it) */
  onWindowBoundsChange?: InfoWindowProps['onBoundsChange']
  skin?: InfoWindowSkin
  /** Extra HUD of the host (e.g. a list of orders), drawn in the screen layer */
  children?: ReactNode
}

/**
 * Where the parts the player can move are, to keep them over a remount or between plays. Omitted: where they start.
 * `window` is the city window's position; the others are offsets from their layout positions
 */
export interface CityCommandLayout {
  window?: { x: number; y: number }
  factionBar?: { x: number; y: number }
  toolbar?: { x: number; y: number }
  knightProfile?: { x: number; y: number }
}

export function turnText(turn: TurnView) {
  const parts = [turn.dateLabel, `第${turn.turn}ターン`, turn.phaseLabel]
  const active = turn.activeFaction === null ? '全勢力の行動を解決中' : turn.activeFaction ? `${turn.activeFaction.name}の手番` : undefined
  return [...parts, active].filter(Boolean).join('　')
}

/** City command screen: the faction bar with ◀ ▶ between cities and the city window (left), turn bar (top right) and the action toolbar (bottom) */
export default function CityCommandScreen({
  city, turn, faction, onOpenResearch, playerFaction, onPrevCity, onNextCity, cityPosition, commandState = {}, activeCommand, onCommand, onEndTurn,
  endTurnDisabled = false, endTurnReason, turnMenu, knightOf, windowPosition = { x: 56, y: 96 }, layout = {}, onLayoutChange, onWindowBoundsChange, skin, children,
}: CityCommandScreenProps) {
  const cityWindow = layout.window ?? windowPosition
  const command = (id: CityCommandId, label: string): ToolbarCommand => {
    const active = activeCommand === id
    return {
      id, label, active, disabled: !active && commandState[id]?.disabled, title: active ? undefined : commandState[id]?.reason, onClick: () => onCommand(id),
    }
  }
  const commands: ToolbarCommand[] = [
    ...CITY_COMMAND_GROUPS.map(group => {
      const icon = <img src={group.icon} alt="" />
      return group.commands
        ? { id: group.id, label: group.label, icon, children: group.commands.map(item => command(item.id, item.label)) }
        : { ...command(group.id as CityCommandId, group.label), icon }
    }),
    { id: 'end-turn', label: 'ターン終了', icon: <img src={iconEndTurn} alt="" />, tone: 'accent', disabled: endTurnDisabled, title: endTurnReason, onClick: onEndTurn },
  ]

  return (
    <div className="norden-screen norden-city-command">
      <div className="norden-screen-top-left">
        <FactionBar faction={playerFaction} summary={faction} onOpenResearch={onOpenResearch} cityName={city.name} onPrevCity={onPrevCity}
          onNextCity={onNextCity} cityPosition={cityPosition}
          position={layout.factionBar} onPositionChange={position => onLayoutChange?.('factionBar', position)} />
      </div>
      <div className="norden-screen-top-right">
        <DateBar phaseLabel={turn.phaseLabel} factionName={turn.activeFaction ? turn.activeFaction.name : turn.activeFaction}
          dateLabel={turn.dateLabel}>{turnMenu}</DateBar>
      </div>
      <CityInfoWindow city={city} knightOf={knightOf} x={cityWindow.x} y={cityWindow.y} skin={skin} onBoundsChange={onWindowBoundsChange}
        onPositionChange={position => onLayoutChange?.('window', position)} profileAnchor={windowPosition}
        profilePosition={layout.knightProfile} onProfilePositionChange={position => onLayoutChange?.('knightProfile', position)}
        style={{ '--norden-city-window-x': `${windowPosition.x}px`, '--norden-city-window-y': `${windowPosition.y}px` } as CSSProperties} />
      <div className="norden-screen-bottom-center">
        <CommandToolbar commands={commands} aria-label="都市コマンド" movable={true}
          position={layout.toolbar} onPositionChange={position => onLayoutChange?.('toolbar', position)} />
      </div>
      {children}
    </div>
  )
}
