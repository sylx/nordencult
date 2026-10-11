import type {
  CutInAnchor, CutInBgType, CutInDecoType, CutInDir, CutInEase, CutInHoldFx, CutInInFx, CutInOrder, CutInOutFx, CutInSubFx,
} from '../../src'

export type Options<T> = readonly (readonly [T, string])[]

export const IN_FX: Options<CutInInFx> = [
  ['fade', 'フェード'], ['rise', '浮かび上がる'], ['drop', '降りてくる'], ['converge', '上下から合流'], ['slide', 'スライド'],
  ['tracking', '字間が縮まる'], ['spread', '中央から左右に広がる'], ['blurIn', 'ぼかし解除'], ['pop', 'ポップ'], ['shrinkIn', '大きい所から'],
  ['spin', '回転'], ['flip', 'めくれる'], ['bounce', '落下バウンド'], ['scatter', '集合'], ['typewriter', 'タイプライター'], ['flicker', '明滅'],
  ['slam', '叩きつけ（全体）'], ['zoomIn', '迫ってくる（全体）'], ['emerge', '奥から現れる（全体）'], ['wipe', 'ワイプ（全体）'],
  ['shutter', '展開（全体）'], ['glitch', 'グリッチ（全体）'], ['flash', '閃光（全体）'],
]

export const OUT_FX: Options<CutInOutFx> = [
  ['fade', 'フェード'], ['rise', '上へ消える'], ['sink', '下へ沈む'], ['diverge', '上下に分かれる'], ['slide', 'スライド'],
  ['tracking', '字間が広がる'], ['blurOut', 'ぼやける'], ['growOut', '膨らんで消える'], ['shrink', '縮んで消える'], ['scatter', '飛び散る'],
  ['erase', '1文字ずつ消去'], ['flicker', '明滅'], ['zoomThrough', '迫って消える（全体）'], ['recede', '遠ざかる（全体）'],
  ['wipe', 'ワイプ（全体）'], ['shutter', '閉じる（全体）'], ['glitch', 'グリッチ（全体）'],
]

export const HOLD_FX: Options<CutInHoldFx> = [
  ['none', 'なし'], ['float', 'ふわふわ'], ['wave', '波打つ'], ['pulse', '鼓動'], ['shake', '震え'], ['glow', '発光の明滅'],
  ['flicker', 'ちらつき'], ['blink', '点滅'], ['glitch', '時々ノイズ'],
]

export const SUB_FX: Options<CutInSubFx> = [
  ['same', 'メインと同じ'], ['fade', 'フェード'], ['rise', '浮かび上がる'], ['blurIn', 'ぼかし解除'], ['tracking', '字間が縮まる'],
  ['typewriter', 'タイプライター'], ['slide', 'スライド'],
]

export const DIRS: Record<CutInDir, string> = {
  left: '左から', right: '右から', up: '上から', down: '下から',
  lr: '左→右', rl: '右→左', tb: '上→下', bt: '下→上', center: '中央から',
  v: '上下に', h: '左右に',
}

export const ORDERS: Options<CutInOrder> = [
  ['forward', '先頭から'], ['reverse', '末尾から'], ['center', '中央から'], ['edges', '両端から'], ['random', 'ランダム'],
]

export const EASES: Options<CutInEase> = [
  ['auto', 'おまかせ'], ['out', '減速'], ['strong', '強い減速'], ['smooth', 'なめらか'], ['back', '行き過ぎて戻る'],
  ['elastic', 'バネ'], ['bounce', 'バウンド'], ['linear', '一定'], ['in', '加速'],
]

export const DECO_TYPES: Options<CutInDecoType> = [
  ['none', 'なし'], ['band', '帯'], ['tape', '虎柄テープ'], ['box', 'ボックス'], ['frame', 'タイトル枠'], ['lines', '上下ライン'],
  ['underline', '下線'], ['sides', 'サイドライン'], ['bar', 'アクセントバー'], ['corners', 'コーナー枠'],
]

export const DECO_ANIMS: Options<'grow' | 'fade' | 'none'> = [['grow', '伸びる'], ['fade', 'フェード'], ['none', 'なし']]

export const BG_TYPES: Options<CutInBgType> = [
  ['none', 'なし（透明）'], ['solid', '単色'], ['vignette', 'ビネット'], ['bottom', '下からグラデ'], ['top', '上からグラデ'],
]

export const ANCHORS: Options<CutInAnchor> = [
  ['tl', '左上'], ['tc', '上'], ['tr', '右上'], ['ml', '左'], ['mc', '中央'], ['mr', '右'], ['bl', '左下'], ['bc', '下'], ['br', '右下'],
]
