import type { ComponentType } from 'react'
import InfoWindowEntry from './entries/InfoWindowEntry'
import CommandToolbarEntry from './entries/CommandToolbarEntry'
import DateBarEntry from './entries/DateBarEntry'
import PartsEntry from './entries/PartsEntry'
import CityCommandEntry from './entries/CityCommandEntry'
import MapPickEntry from './entries/MapPickEntry'
import InvasionEntry from './entries/InvasionEntry'
import StrategyFlowEntry from './entries/StrategyFlowEntry'

export interface CatalogEntry {
  id: string
  label: string
  /** Component or screen name in the library */
  name: string
  description: string
  Component: ComponentType
}

export interface CatalogGroup {
  label: string
  entries: CatalogEntry[]
}

/** The catalog: basic components, the screens built from them, and flows between screens */
export const CATALOG: CatalogGroup[] = [
  {
    label: '画面フロー',
    entries: [
      { id: 'strategy-flow', label: '戦略画面', name: 'useScreenStack + ScreenHost', Component: StrategyFlowEntry,
        description: '都市コマンド → 軍事 → 侵攻 → 地図で侵攻先を選ぶ → 侵攻画面。Escで1段ずつ戻る。画面の積み重ねは useScreenStack、表示は ScreenHost' },
    ],
  },
  {
    label: '画面',
    entries: [
      { id: 'city-command', label: '都市コマンド', name: 'CityCommandScreen', Component: CityCommandEntry,
        description: '都市情報ウィンドウ、都市の切り替え、ターン情報、アクションツールバー（内政・軍事・研究・商人・ターン終了）' },
      { id: 'map-pick', label: '地図で選ぶ', name: 'MapPickScreen', Component: MapPickEntry,
        description: '地図上で都市などを選ぶステップ。案内の帯と「やめる」だけを出し、候補の強調と選択は呼び出し側の地図が行う' },
      { id: 'invasion', label: '侵攻', name: 'InvasionScreen', Component: InvasionEntry,
        description: '出撃する騎士の選択と、騎士ごとの兵科・兵数。兵数の合計は出発都市の兵数まで' },
    ],
  },
  {
    label: '基本部品',
    entries: [
      { id: 'info-window', label: 'ウィンドウ', name: 'InfoWindow / InfoWindowWithTabs', Component: InfoWindowEntry,
        description: '羊皮紙と装飾枠のウィンドウ。タブ、スキン、自動サイズ、ドラッグ、リサイズ' },
      { id: 'command-toolbar', label: 'ツールバー', name: 'CommandToolbar', Component: CommandToolbarEntry,
        description: 'コマンドの並び。子を持つコマンドは押すと上にサブコマンドが開く' },
      { id: 'date-bar', label: 'ターン情報', name: 'DateBar', Component: DateBarEntry,
        description: '年月・ターンの表示と、歯車の設定メニュー' },
      { id: 'parts', label: 'UIパーツ', name: 'Button / ChoiceGroup / QuantityInput …', Component: PartsEntry,
        description: '画面を組み立てる小さな部品。ボタン、単一選択、数量、騎士カード、勢力、案内の帯、都市の切り替え' },
    ],
  },
]

export const ENTRIES = CATALOG.flatMap(group => group.entries)
