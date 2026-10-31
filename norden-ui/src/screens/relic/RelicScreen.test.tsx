import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ConstructionView, RelicProductionView, RelicView } from '../types'
import RelicScreen from './RelicScreen'

const BROKEN: RelicView = {
  id: 'rifle-1', status: 'broken', name: '壊れたライフル', rarity: 'C', useLabel: '装備', description: '撃てない銃。',
  dismantle: { points: 300 },
  repair: { supplies: 400, gold: 150, turns: 4, unavailableReason: '技術「ライフル」の研究が必要です' },
  papalRepair: { gold: 825 },
}
const BALLISTA: RelicView = {
  id: 'ballista-1', status: 'broken', name: '壊れたバリスタ', rarity: 'C', useLabel: '施設',
  dismantle: { points: 200 }, repair: { supplies: 500, gold: 150, turns: 5 }, papalRepair: { gold: 975, unavailableReason: '金が足りません' },
}
const REPAIRING: RelicView = { id: 'work-P012', status: 'repairing', name: 'ゴーレムの残骸', rarity: 'A', useLabel: '召喚', cityName: 'フルーエン' }
const ASKED: RelicView = { id: 'dragon-1', status: 'papalRepair', name: 'ドラゴンの卵', rarity: 'A', useLabel: '召喚' }
const REPAIRED: RelicView = { id: 'gun-1', status: 'repaired', name: 'ガンシップ', rarity: 'A', useLabel: '施設' }
const PRODUCTION: RelicProductionView = { id: 'rifle', name: 'ライフル', rarity: 'C', useLabel: '装備', supplies: 300, gold: 100, turns: 3 }

const shown = (props: Partial<Parameters<typeof RelicScreen>[0]> = {}) =>
  render(<RelicScreen cityName="フルーエン" gold={3000} relics={[BROKEN, BALLISTA, REPAIRING, ASKED, REPAIRED]} productions={[PRODUCTION]} onClose={() => {}} {...props} />)

describe('RelicScreen', () => {
  it('lists the box by how each stands, and what can be produced', () => {
    shown()
    const box = screen.getByRole('list', { name: 'アイテムボックス' })
    expect(within(box).getByRole('button', { name: '壊れたライフル（壊れた）' })).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: 'ゴーレムの残骸（修復中（フルーエン））' })).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: 'ドラゴンの卵（法王府に依頼中）' })).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: 'ガンシップ（修復済み）' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '生産できる遺物' })).toHaveTextContent('物資 300・金 100')
  })

  it('shows the first relic with its rarity, use and description, saying why it cannot be repaired', () => {
    shown()
    const details = screen.getByRole('region', { name: '遺物の詳細' })
    expect(within(details).getByRole('heading', { name: /壊れたライフル/ })).toBeInTheDocument()
    expect(within(details).getByLabelText('レアリティ C')).toBeInTheDocument()
    expect(within(details).getByText('使い道: 装備')).toBeInTheDocument()
    expect(within(details).getByText('撃てない銃。')).toBeInTheDocument()
    expect(within(details).getByRole('button', { name: '壊れたライフルを修復' })).toBeDisabled()
    expect(within(details).getByText('技術「ライフル」の研究が必要です')).toBeInTheDocument()
  })

  it('dismantles only after the confirmation', async () => {
    const onDismantle = vi.fn()
    shown({ onDismantle })
    await userEvent.click(screen.getByRole('button', { name: '壊れたライフルを解体' }))
    expect(onDismantle).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '遺物の解体' })).toHaveTextContent('研究ポイント +300')
    await userEvent.click(screen.getByRole('button', { name: 'やめる' }))
    expect(onDismantle).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: '壊れたライフルを解体' }))
    await userEvent.click(screen.getByRole('button', { name: '解体する' }))
    expect(onDismantle).toHaveBeenCalledWith('rifle-1')
  })

  it('repairs in the city, asks 法王府, and says why it cannot', async () => {
    const onRepair = vi.fn()
    const onPapalRepair = vi.fn()
    shown({ onRepair, onPapalRepair })
    await userEvent.click(screen.getByRole('button', { name: '壊れたライフルを法王府に依頼' }))
    expect(onPapalRepair).toHaveBeenCalledWith('rifle-1')
    await userEvent.click(screen.getByRole('button', { name: '壊れたバリスタ（壊れた）' }))
    await userEvent.click(screen.getByRole('button', { name: '壊れたバリスタを修復' }))
    expect(onRepair).toHaveBeenCalledWith('ballista-1')
    expect(screen.getByRole('button', { name: '壊れたバリスタを法王府に依頼' })).toBeDisabled()
    expect(screen.getByText('金が足りません')).toBeInTheDocument()
  })

  it('offers 献上 for broken and repaired relics, not pressable yet, and not for those being repaired', async () => {
    shown()
    expect(screen.getByRole('button', { name: '壊れたライフルを法王府に献上' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'ガンシップ（修復済み）' }))
    expect(screen.getByRole('button', { name: 'ガンシップを法王府に献上' })).toBeDisabled()
    expect(screen.getByText('使い道はまだありません')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ガンシップを解体' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ゴーレムの残骸（修復中（フルーエン））' }))
    expect(screen.queryByRole('button', { name: 'ゴーレムの残骸を法王府に献上' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ドラゴンの卵（法王府に依頼中）' }))
    expect(screen.queryByRole('button', { name: 'ドラゴンの卵を法王府に献上' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ドラゴンの卵を解体' })).not.toBeInTheDocument()
  })

  it('produces what the faction can, with an empty box too', async () => {
    const onProduce = vi.fn()
    shown({ relics: [], onProduce })
    expect(screen.getByText('遺物はありません。')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ライフルを生産' }))
    expect(onProduce).toHaveBeenCalledWith('rifle')
  })

  it('tells what the city is working on, and the gold', () => {
    const construction: ConstructionView = { kind: 'relicRepair', building: { id: 'golem', name: 'ゴーレムの残骸' }, invested: 100, required: 1000, turnsLeft: 9 }
    const { unmount } = shown({ construction })
    expect(screen.getByText('ゴーレムの残骸の修復')).toBeInTheDocument()
    expect(screen.getByText('3,000')).toBeInTheDocument()
    unmount()
    shown()
    expect(screen.getByText('空き')).toBeInTheDocument()
  })

  it('closes with 戻る', async () => {
    const onClose = vi.fn()
    shown({ onClose })
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(onClose).toHaveBeenCalled()
  })
})
