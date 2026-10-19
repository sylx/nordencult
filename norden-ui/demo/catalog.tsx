import type { ComponentType } from 'react'
import InfoWindowEntry from './entries/InfoWindowEntry'
import WindowFrameEntry from './entries/WindowFrameEntry'
import NavigationWindowEntry from './entries/NavigationWindowEntry'
import CommandToolbarEntry from './entries/CommandToolbarEntry'
import DateBarEntry from './entries/DateBarEntry'
import FactionBarEntry from './entries/FactionBarEntry'
import PartsEntry from './entries/PartsEntry'
import CityCommandEntry from './entries/CityCommandEntry'
import MapPickEntry from './entries/MapPickEntry'
import InvasionEntry from './entries/InvasionEntry'
import DomesticEntry from './entries/DomesticEntry'
import StrategyFlowEntry from './entries/StrategyFlowEntry'
import CutInEditorEntry from './entries/CutInEditorEntry'

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
        description: '都市コマンド → 内政 → 建設で内政画面。都市コマンド → 軍事 → 侵攻 → 地図で侵攻先を選ぶ → 侵攻画面。Escで1段ずつ戻る。画面の積み重ねは useScreenStack、表示は ScreenHost' },
    ],
  },
  {
    label: '画面',
    entries: [
      { id: 'city-command', label: '都市コマンド', name: 'CityCommandScreen', Component: CityCommandEntry,
        description: '都市情報ウィンドウ、勢力の情報と都市の切り替え、ターン情報、アクションツールバー（内政・軍事・研究・商人・ターン終了）' },
      { id: 'map-pick', label: '地図で選ぶ', name: 'MapPickScreen', Component: MapPickEntry,
        description: '地図上で都市などを選ぶステップ。案内の帯と「やめる」だけを出し、候補の強調と選択は呼び出し側の地図が行う' },
      { id: 'domestic', label: '内政', name: 'DomesticScreen', Component: DomesticEntry,
        description: '都市の内政ウィンドウ。左上の施設スロット（確認付き削除・建設の中断/取消・+で追加）と右側の建設候補一覧' },
      { id: 'invasion', label: '侵攻', name: 'InvasionScreen', Component: InvasionEntry,
        description: '出撃する騎士の選択と、騎士ごとの兵科・兵数。兵数の合計は出発都市の兵数まで' },
    ],
  },
  {
    label: '演出',
    entries: [
      { id: 'cutin-editor', label: 'カットインエディタ', name: 'useCutIn + CutInLayer', Component: CutInEditorEntry,
        description: '「戦闘開始」などのカットインと文字演出のテンプレートを作る。作ったJSONは useCutIn().play(json, { text }) で再生し、CutInLayer が画面に重ねて描く' },
    ],
  },
  {
    label: '基本部品',
    entries: [
      { id: 'info-window', label: 'ウィンドウ', name: 'InfoWindow / InfoWindowWithTabs', Component: InfoWindowEntry,
        description: '羊皮紙と装飾枠のウィンドウ。タブ、スキン、自動サイズ、ドラッグ、リサイズ' },
      { id: 'window-frame', label: 'ウィンドウ（閉じるボタン付き）', name: 'WindowFrame', Component: WindowFrameEntry,
        description: '右上の彫刻に閉じる操作が組み込まれた装飾枠。寸法、装飾のサイズ、閉じる位置、内容の余白と透過を調整' },
      { id: 'navigation-window', label: 'ウィンドウ（戻る・進むボタン付き）', name: 'NavigationWindow', Component: NavigationWindowEntry,
        description: '左上の金の装飾に戻る・進む、右上に閉じるを組み込んだ汎用ウィンドウ。前後への移動・各ボタンの無効状態・サイズと透過を確認' },
      { id: 'command-toolbar', label: 'ツールバー', name: 'CommandToolbar', Component: CommandToolbarEntry,
        description: 'コマンドの並び。子を持つコマンドは押すと上にサブコマンドが開く' },
      { id: 'date-bar', label: 'ターン情報', name: 'DateBar', Component: DateBarEntry,
        description: '年月・ターンの表示と、歯車の設定メニュー' },
      { id: 'faction-bar', label: '勢力の情報', name: 'FactionBar', Component: FactionBarEntry,
        description: 'エンブレムが浮かぶ球と金属彫刻の専用バー。球をドラッグして移動。金と増減・総生産・総兵力・都市の切り替え' },
      { id: 'parts', label: 'UIパーツ', name: 'Button / ChoiceGroup / QuantityInput …', Component: PartsEntry,
        description: '画面を組み立てる小さな部品。ボタン、単一選択、数量、騎士カード、勢力、案内の帯' },
    ],
  },
]

export const ENTRIES = CATALOG.flatMap(group => group.entries)
