import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ConstructionView, EquipCandidateView, KnightView, RelicProductionView, RelicView } from '../types'
import RelicScreen from './RelicScreen'

const BROKEN: RelicView = {
  id: 'rifle-1', status: 'broken', name: '壊れたライフル', rarity: 'D', useLabel: '装備', description: '撃てない銃。',
  dismantle: { points: 300 },
  repair: { supplies: 400, gold: 150, turns: 4, unavailableReason: '技術「ライフル」の研究が必要です' },
  papalRepair: { gold: 825 },
}
const BALLISTA: RelicView = {
  id: 'ballista-1', status: 'broken', name: '壊れたバリスタ', rarity: 'D', useLabel: '施設',
  dismantle: { points: 200 }, repair: { supplies: 500, gold: 150, turns: 5 }, papalRepair: { gold: 975, unavailableReason: '金が足りません' },
}
const REPAIRING: RelicView = { id: 'work-P012', status: 'repairing', name: 'ゴーレムの残骸', rarity: 'B', useLabel: '召喚', cityName: 'フルーエン' }
const ASKED: RelicView = { id: 'dragon-1', status: 'papalRepair', name: 'ドラゴンの卵', rarity: 'B', useLabel: '召喚' }
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
    expect(within(details).getByLabelText('レアリティ D')).toBeInTheDocument()
    expect(within(details).getByText('使い道: 装備')).toBeInTheDocument()
    expect(within(details).getByText('撃てない銃。')).toBeInTheDocument()
    expect(within(details).getByRole('button', { name: '壊れたライフルをフルーエンで修復' })).toBeDisabled()
    expect(within(details).getByRole('button', { name: '壊れたライフルをフルーエンで修復' })).toHaveTextContent(/^フルーエンで修復$/)
    expect(within(details).getByText('物資 400・金 150・約4ターン')).toBeInTheDocument()
    expect(within(details).getByText('金 825')).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: '壊れたバリスタをフルーエンで修復' }))
    expect(onRepair).toHaveBeenCalledWith('ballista-1')
    expect(screen.getByRole('button', { name: '壊れたバリスタを法王府に依頼' })).toBeDisabled()
    expect(screen.getByText('金が足りません')).toBeInTheDocument()
  })

  it('says what a 施設の遺物 builds, and where it is being used', async () => {
    const free: RelicView = { ...REPAIRED, buildingName: 'ガンシップ' }
    const used: RelicView = { id: 'gun-2', status: 'building', name: 'ガンシップ', rarity: 'A', useLabel: '施設', buildingName: 'ガンシップ', cityName: 'シルヴァ' }
    shown({ relics: [free, used] })
    expect(screen.getByText('内政画面でガンシップを建てるのに使えます。建て終わると遺物は無くなります')).toBeInTheDocument()
    expect(screen.queryByText('使い道はまだありません')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ガンシップ（建設中（シルヴァ））' }))
    expect(screen.getByText(/シルヴァでガンシップの建設に使っています/)).toBeInTheDocument()
    // It is no longer the box's to give away
    expect(screen.queryByRole('button', { name: 'ガンシップを法王府に献上' })).not.toBeInTheDocument()
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
    expect(screen.getByText('物資 300・金 100・約3ターン')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ライフルをフルーエンで生産' }))
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

  describe('equipment', () => {
    const RIFLE: RelicView = {
      id: 'carta-2', status: 'repaired', name: 'ライフル', rarity: 'C', useLabel: '装備', effects: ['ライフル兵を率いる'], equip: {},
    }
    const WORN: RelicView = { ...RIFLE, id: 'carta-3', status: 'equipped', wearerName: 'ルカ', unequip: {} }
    const GUN = { id: 'gun-1', name: '大砲', rarity: 'B' as const }
    const knight = (id: string, name: string): KnightView => ({ id, name, abilities: { leadership: 70, strength: 60, intelligence: 50 } })
    const CANDIDATES: EquipCandidateView[] = [
      { knight: knight('016', 'エルヴィン'), slots: [{ relic: null }, { relic: null }] },
      { knight: knight('027', 'ルカ'), slots: [{ relic: GUN }, { relic: { ...GUN, id: 'carta-3', name: 'ライフル' }, unavailableReason: '装備しています' }] },
      { knight: knight('042', 'バレル'), slots: [{ relic: null }, { relic: null }], unavailableReason: '傭兵は装備できません' },
    ]
    const equipping = (props: Partial<Parameters<typeof RelicScreen>[0]> = {}) =>
      shown({ relics: [RIFLE, WORN, REPAIRED], equipCandidates: () => CANDIDATES, ...props })

    it('says what an equipment relic gives and who wears it, with no word of having no use', async () => {
      equipping()
      expect(screen.getByRole('button', { name: 'ライフル（装備中（ルカ））' })).toBeInTheDocument()
      expect(within(screen.getByRole('list', { name: '効果' })).getByText('ライフル兵を率いる')).toBeInTheDocument()
      expect(screen.queryByText('使い道はまだありません')).not.toBeInTheDocument()
    })

    it('puts it on a knight chosen, into their empty slot; those who cannot wear it cannot be chosen', async () => {
      const onEquip = vi.fn()
      equipping({ onEquip })
      await userEvent.click(screen.getByRole('button', { name: 'ライフルを装備させる' }))
      const dialog = screen.getByRole('dialog', { name: 'ライフルを装備させる' })
      expect(within(dialog).getByRole('button', { name: '決定' })).toBeDisabled()
      expect(within(dialog).getByRole('button', { name: 'バレル' })).toBeDisabled()
      expect(within(dialog).getByRole('button', { name: 'ルカ' })).toHaveTextContent('装備: 大砲 / ライフル')
      await userEvent.click(within(dialog).getByRole('button', { name: 'エルヴィン' }))
      await userEvent.click(within(dialog).getByRole('button', { name: '決定' }))
      expect(onEquip).toHaveBeenCalledWith('carta-2', '016', 0)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('with their slots full, asks which relic to swap (not one it cannot go in place of)', async () => {
      const onEquip = vi.fn()
      equipping({ onEquip })
      await userEvent.click(screen.getByRole('button', { name: 'ライフルを装備させる' }))
      await userEvent.click(screen.getByRole('button', { name: 'ルカ' }))
      await userEvent.click(screen.getByRole('button', { name: '決定' }))
      const dialog = screen.getByRole('dialog', { name: 'ルカの装備を入れ替える' })
      expect(within(dialog).getByRole('button', { name: 'ライフル（装備しています）' })).toBeDisabled()
      await userEvent.click(within(dialog).getByRole('button', { name: '大砲（枠1）' }))
      await userEvent.click(within(dialog).getByRole('button', { name: '入れ替える' }))
      expect(onEquip).toHaveBeenCalledWith('carta-2', '027', 0)
    })

    it('takes it off the knight wearing it, and says why it cannot be put on', async () => {
      const onUnequip = vi.fn()
      equipping({ onUnequip, relics: [{ ...WORN, equip: { unavailableReason: '手番ではありません' } }] })
      expect(screen.getByRole('button', { name: 'ライフルを装備させる' })).toBeDisabled()
      expect(screen.getByText('ルカから外して箱に戻す')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'ライフルを外す' }))
      expect(onUnequip).toHaveBeenCalledWith('carta-3')
    })
  })

  it('closes with 戻る', async () => {
    const onClose = vi.fn()
    shown({ onClose })
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(onClose).toHaveBeenCalled()
  })
})
