// Basic components: windows
export { default as InfoWindow } from './components/window/InfoWindow'
export type { InfoWindowProps } from './components/window/InfoWindow'
export { default as InfoWindowWithTabs } from './components/window/InfoWindowWithTabs'
export type { InfoWindowWithTabsProps, TabInfo } from './components/window/InfoWindowWithTabs'
export { windowSkins } from './skins'
export type { InfoWindowSkin, WindowSkinImages, WindowSkinLayout } from './skins'

// Basic components: toolbar and HUD
export { default as CommandToolbar } from './components/toolbar/CommandToolbar'
export type { CommandToolbarProps, ToolbarCommand } from './components/toolbar/CommandToolbar'
export { default as DateBar } from './components/hud/DateBar'
export type { DateBarProps } from './components/hud/DateBar'

// Basic components: parts
export { default as Card } from './components/parts/Card'
export type { CardProps } from './components/parts/Card'
export { default as Button } from './components/parts/Button'
export type { ButtonProps } from './components/parts/Button'
export { default as Banner } from './components/parts/Banner'
export type { BannerProps } from './components/parts/Banner'
export { default as CityNavigator } from './components/parts/CityNavigator'
export type { CityNavigatorProps } from './components/parts/CityNavigator'
export { default as ChoiceGroup } from './components/parts/ChoiceGroup'
export type { ChoiceGroupProps, ChoiceOption } from './components/parts/ChoiceGroup'
export { default as QuantityInput } from './components/parts/QuantityInput'
export type { QuantityInputProps } from './components/parts/QuantityInput'
export { default as KnightCard } from './components/parts/KnightCard'
export type { KnightCardData, KnightCardProps } from './components/parts/KnightCard'
export { default as FactionMark } from './components/parts/FactionMark'
export type { FactionMarkProps } from './components/parts/FactionMark'
export { default as ThinFrame } from './components/parts/ThinFrame'
export { default as ThinFrameWithTitle } from './components/parts/ThinFrameWithTitle'
export type { ThinFrameWithTitleProps } from './components/parts/ThinFrameWithTitle'
export { default as StatBar } from './components/parts/StatBar'
export type { StatBarProps } from './components/parts/StatBar'

// Screen stack
export { useScreenStack } from './navigation/useScreenStack'
export type { ScreenEntry, ScreenMap, ScreenRoute, ScreenStack } from './navigation/useScreenStack'
export { default as ScreenHost } from './navigation/ScreenHost'
export type { ScreenHostProps, ScreenRenderers } from './navigation/ScreenHost'

// Screens
export type { CityStatView, CityView, FactionView, KnightView, NeighbourView, TurnView, UnitTypeView } from './screens/types'
export { default as CityCommandScreen, turnText } from './screens/cityCommand/CityCommandScreen'
export type { CityCommandScreenProps, CommandState } from './screens/cityCommand/CityCommandScreen'
export { default as CityInfoWindow } from './screens/cityCommand/CityInfoWindow'
export type { CityInfoWindowProps } from './screens/cityCommand/CityInfoWindow'
export { CITY_COMMAND_GROUPS } from './screens/cityCommand/cityCommands'
export type { CityCommandGroup, CityCommandId } from './screens/cityCommand/cityCommands'
export { default as MapPickScreen } from './screens/mapPick/MapPickScreen'
export type { MapPickScreenProps } from './screens/mapPick/MapPickScreen'
export { default as InvasionScreen } from './screens/invasion/InvasionScreen'
export type { InvasionAssignment, InvasionDraft, InvasionScreenProps } from './screens/invasion/InvasionScreen'

// Cut-ins: templates made with the catalog's editor, played over the screen
export { default as CutInLayer } from './cutin/CutInLayer'
export type { CutInLayerProps } from './cutin/CutInLayer'
export { useCutIn, CutInQueue } from './cutin/useCutIn'
export type { ActiveCutIn, CutInController, CutInPlayOptions } from './cutin/useCutIn'
export { CUTIN_BASE_HEIGHT, CUTIN_BASE_WIDTH, CUTIN_DEFAULTS, CUTIN_TEMPLATE_VERSION, normalizeCutInTemplate } from './cutin/template'
export type {
  CutInAnchor, CutInBackground, CutInBgType, CutInDeco, CutInDecoType, CutInDir, CutInEase, CutInFill, CutInGlow, CutInHoldFx,
  CutInInFx, CutInOrder, CutInOutFx, CutInShadow, CutInStroke, CutInSubFx, CutInTemplate, CutInTemplateInput, CutInTemplateJson,
} from './cutin/template'
export { CutInRenderer, cutInViewport } from './cutin/engine/renderer'
export type { PreparedCutIn } from './cutin/engine/renderer'
export type { CutInTimeline } from './cutin/engine/timeline'
export { IN_EFFECTS as CUTIN_IN_EFFECTS, OUT_EFFECTS as CUTIN_OUT_EFFECTS } from './cutin/engine/effects'
export { loadCutInFonts } from './cutin/fonts'
