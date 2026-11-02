import type { ComponentType } from 'react'
import InfoWindowEntry from './entries/InfoWindowEntry'
import WindowFrameEntry from './entries/WindowFrameEntry'
import NavigationWindowEntry from './entries/NavigationWindowEntry'
import CommandToolbarEntry from './entries/CommandToolbarEntry'
import DateBarEntry from './entries/DateBarEntry'
import FactionBarEntry from './entries/FactionBarEntry'
import ActionOrdersEntry from './entries/ActionOrdersEntry'
import PartsEntry from './entries/PartsEntry'
import CityCommandEntry from './entries/CityCommandEntry'
import MapPickEntry from './entries/MapPickEntry'
import InvasionEntry from './entries/InvasionEntry'
import MoveEntry from './entries/MoveEntry'
import TransportEntry from './entries/TransportEntry'
import DomesticEntry from './entries/DomesticEntry'
import MercenaryEntry from './entries/MercenaryEntry'
import RelicEntry from './entries/RelicEntry'
import TechEntry from './entries/TechEntry'
import StrategyFlowEntry from './entries/StrategyFlowEntry'
import CutInEditorEntry from './entries/CutInEditorEntry'
import EventEntry from './entries/EventEntry'

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
      { id: 'tech', label: '技術', name: 'TechScreen', Component: TechEntry,
        description: '研究＞技術のツリー。研究済み・研究中・研究できる・名前だけ・???で描き分け、選ぶと右に詳細と「研究する」。研究ポイントが宙に浮くと閉じられず、研究先を選ばされる' },
      { id: 'mercenary', label: '傭兵', name: 'MercenaryScreen', Component: MercenaryEntry,
        description: '軍事＞傭兵。契約できる傭兵を選んで契約し、契約中の傭兵を打ち切る。契約できない傭兵は理由を出し、兵が減った傭兵の打ち切りは確認に評判と回復のことを出す' },
      { id: 'relic', label: '遺物', name: 'RelicScreen', Component: RelicEntry,
        description: '研究＞遺物のアイテムボックス。壊れた・修復中・法王府に依頼中・修復済みで描き分け、選ぶと右に詳細と解体・修復・法王府への依頼。技術を満たした遺物は生産できる。法王府への献上は押せない' },
      { id: 'invasion', label: '侵攻', name: 'InvasionScreen', Component: InvasionEntry,
        description: '出撃する騎士の選択と、騎士ごとの兵科・兵数。兵数の合計は出発都市の兵数まで' },
      { id: 'move', label: '移動', name: 'MoveScreen', Component: MoveEntry,
        description: '自勢力の都市への移動。騎士を複数選び、兵と物資を持たせる。単騎移動は兵と物資を0にして早く着く。到着までの月数を出す' },
      { id: 'transport', label: '輸送', name: 'TransportScreen', Component: TransportEntry,
        description: '自勢力の都市への輸送。担当の騎士を1人選び、兵と物資の量を決める。騎士は輸送先で下ろして単騎で戻る。到着と帰還までの月数を出す。繰り返し輸送は準備中' },
    ],
  },
  {
    label: '演出',
    entries: [
      { id: 'cutin-editor', label: 'カットインエディタ', name: 'useCutIn + CutInLayer', Component: CutInEditorEntry,
        description: '「戦闘開始」などのカットインと文字演出のテンプレートを作る。作ったJSONは useCutIn().play(json, { text }) で再生し、CutInLayer が画面に重ねて描く' },
      { id: 'event', label: 'イベント通知', name: 'EventScreen', Component: EventEntry,
        description: 'カット画像とその下のメッセージウィンドウで、起きたこと（勢力の滅亡など）と詳細を知らせる。カットイン faction_destruction からの流れも再生できる' },
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
      { id: 'action-orders', label: '行動予約', name: 'ActionOrders', Component: ActionOrdersEntry,
        description: '侵攻・移動・輸送の予約の一覧。侵攻は侵攻元→侵攻先と軍団長以下の人数、移動と輸送は出発した拠点→行き先と担当の騎士。取消は今月の予約だけで、出発済みの移動・輸送は残りの月数を出す' },
      { id: 'parts', label: 'UIパーツ', name: 'Button / ChoiceGroup / QuantityInput / VolumeSlider …', Component: PartsEntry,
        description: '画面を組み立てる小さな部品。ボタン、単一選択、数量、騎士カード、勢力、案内の帯' },
    ],
  },
]

export const ENTRIES = CATALOG.flatMap(group => group.entries)
