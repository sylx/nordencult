import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DomesticScreen from './DomesticScreen'

describe('DomesticScreen', () => {
  it('opens a window with the city title and closes', async () => {
    const onClose = vi.fn()
    render(<DomesticScreen city={{ id: 'P012', name: 'フルーエン' }} onClose={onClose} />)
    const window = screen.getByRole('region', { name: 'フルーエンの内政' })
    expect(within(window).getByText('フルーエンの内政')).toBeInTheDocument()
    expect(within(window).getByTestId('domestic-frame')).toBeInTheDocument()
    await userEvent.click(within(window).getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows built slots on the left, a single + slot, and opens the right build list to construct', async () => {
    const onBuild = vi.fn()
    const onDemolish = vi.fn()
    render(
      <DomesticScreen
        city={{
          id: 'P012',
          name: 'フルーエン',
          supplies: 440,
          buildings: {
            slots: 4,
            built: [{ id: 'market', name: '市場', effects: ['商業 +15%'] }],
          },
        }}
        buildOptions={[
          { id: 'workshop', name: '工房', description: '物資の生産を増やす。', effects: ['生産 +15%'], supplies: 400, gold: 120 },
        ]}
        gold={500}
        onBuild={onBuild}
        onDemolish={onDemolish}
        onClose={vi.fn()}
      />,
    )

    // Only one empty slot has the + button; the other two are plain empty slots
    expect(screen.getAllByRole('button', { name: '施設を追加' })).toHaveLength(1)
    expect(screen.getAllByLabelText('空きスロット')).toHaveLength(2)

    // Clicking + opens the right-hand build panel
    await userEvent.click(screen.getByRole('button', { name: '施設を追加' }))
    const panel = screen.getByRole('complementary', { name: '追加できる施設' })
    expect(within(panel).getByText('工房')).toBeInTheDocument()
    expect(within(panel).getByText('物資の生産を増やす。')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: '工房を建設' }))
    expect(onBuild).toHaveBeenCalledWith('workshop')

    // Demolishing a standing building opens a confirmation dialog first
    await userEvent.click(screen.getByRole('button', { name: '市場を削除' }))
    const dialog = screen.getByRole('dialog', { name: '施設の取り壊し' })
    expect(within(dialog).getByText('「市場」を取り壊しますか？')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: '取り壊す' }))
    expect(onDemolish).toHaveBeenCalledWith('market')
  })

  it('allows pausing and cancelling a building under construction', async () => {
    const onCancelConstruction = vi.fn()
    const onPauseConstruction = vi.fn()
    render(
      <DomesticScreen
        city={{
          id: 'P012',
          name: 'フルーエン',
          buildings: {
            slots: 4,
            built: [],
            construction: {
              building: { id: 'workshop', name: '工房' },
              invested: 260,
              required: 400,
              turnsLeft: 1,
            },
          },
        }}
        onCancelConstruction={onCancelConstruction}
        onPauseConstruction={onPauseConstruction}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('建設中')).toBeInTheDocument()
    expect(screen.getByText('取消で物資 +130 が備蓄へ')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '工房の建設を中断' }))
    expect(onPauseConstruction).toHaveBeenCalledWith(true)
    await userEvent.click(screen.getByRole('button', { name: '工房の建設を取り消す' }))
    expect(onCancelConstruction).toHaveBeenCalledOnce()
  })

  it('hides locked buildings and lists upgrades from the standing building', async () => {
    const onBuild = vi.fn()
    render(
      <DomesticScreen
        city={{
          id: 'P012',
          name: 'フルーエン',
          buildings: { slots: 3, built: [{ id: 'market', name: '市場' }] },
        }}
        buildOptions={[
          { id: 'workshop', name: '工房', supplies: 400, gold: 120 },
          { id: 'cannon', name: '据付大砲', supplies: 1200, gold: 400, unavailableReason: '遺物が必要です', locked: true },
          { id: 'grand_market', name: '大市場', supplies: 1000, gold: 250, upgradeFrom: 'market' },
          { id: 'comprehensive_market', name: '総合市場', supplies: 2000, gold: 500, upgradeFrom: 'grand_market', locked: true },
        ]}
        onBuild={onBuild}
        onClose={vi.fn()}
      />,
    )

    // The empty slot offers only new buildings that are not locked
    await userEvent.click(screen.getByRole('button', { name: '施設を追加' }))
    const addPanel = screen.getByRole('complementary', { name: '追加できる施設' })
    expect(within(addPanel).getByText('工房')).toBeInTheDocument()
    expect(within(addPanel).queryByText('据付大砲')).not.toBeInTheDocument()
    expect(within(addPanel).queryByText('大市場')).not.toBeInTheDocument()

    // The standing building opens its upgrades in the same panel
    await userEvent.click(screen.getByRole('button', { name: '市場をアップグレード' }))
    const upgradePanel = screen.getByRole('complementary', { name: '市場のアップグレード' })
    expect(within(upgradePanel).getByText('大市場')).toBeInTheDocument()
    expect(within(upgradePanel).queryByText('総合市場')).not.toBeInTheDocument()
    await userEvent.click(within(upgradePanel).getByRole('button', { name: '大市場にアップグレード' }))
    expect(onBuild).toHaveBeenCalledWith('grand_market')
  })

  it('shows an upgrade under construction in the slot of the building it replaces', () => {
    render(
      <DomesticScreen
        city={{
          id: 'P012',
          name: 'フルーエン',
          buildings: {
            slots: 2,
            built: [{ id: 'market', name: '市場' }],
            construction: {
              building: { id: 'grand_market', name: '大市場', upgradeFrom: 'market' },
              invested: 100,
              required: 1000,
              turnsLeft: 5,
            },
          },
        }}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('アップグレード中')).toBeInTheDocument()
    expect(screen.getByText('市場から')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '市場を削除' })).not.toBeInTheDocument()
    // The upgrade takes no slot: one empty slot remains (not addable while building)
    expect(screen.getAllByLabelText('空きスロット')).toHaveLength(1)
  })

  it('shows the city state at the top with the boosts broken down on hover and click', async () => {
    render(
      <DomesticScreen
        city={{ id: 'P012', name: 'フルーエン', population: 11000, supplies: 440 }}
        gold={1500}
        stats={[
          {
            label: '商業', value: 506, max: 720, base: 440,
            boosts: [
              { label: '代官', value: 44 },
              { label: '施設', value: 22, source: 'building', details: ['市場: 商業 +5%'] },
            ],
          },
          { label: '練度', value: 72, max: 100, notes: ['訓練 +3/ターン'] },
          { label: '新兵の練度', value: 20, max: 100, base: 20, boosts: [{ label: '施設', value: 0, source: 'building' }] },
        ]}
        onClose={vi.fn()}
      />,
    )

    const status = screen.getByRole('region', { name: '都市の現状' })
    expect(within(status).getByText('11,000')).toBeInTheDocument()
    expect(within(status).getByText('440')).toBeInTheDocument()
    expect(within(status).getByText('1,500')).toBeInTheDocument()
    expect(within(status).getByText('施設 +22')).toBeInTheDocument()
    expect(within(status).getByText('施設 +0')).toBeInTheDocument()

    // Hovering shows the breakdown, leaving hides it
    const commerce = within(status).getByRole('button', { name: '商業の内訳' })
    await userEvent.hover(commerce)
    const tip = screen.getByRole('tooltip')
    expect(within(tip).getByText('基礎')).toBeInTheDocument()
    expect(within(tip).getByText('+44')).toBeInTheDocument()
    expect(within(tip).getByText('市場: 商業 +5%')).toBeInTheDocument()
    await userEvent.unhover(commerce)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    // Clicking keeps it open until clicked again or elsewhere
    await userEvent.click(commerce)
    await userEvent.unhover(commerce)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await userEvent.click(screen.getByText('フルーエンの施設'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    // 練度 has no boosts: only its notes
    await userEvent.click(within(status).getByRole('button', { name: '練度の内訳' }))
    const moraleTip = screen.getByRole('tooltip')
    expect(within(moraleTip).getByText('訓練 +3/ターン')).toBeInTheDocument()
    expect(within(moraleTip).queryByText('基礎')).not.toBeInTheDocument()

    const morale = within(status).getByRole('button', { name: '新兵の練度の内訳' })
    await userEvent.click(morale)
    expect(within(screen.getByRole('tooltip')).getByText('ブーストはありません')).toBeInTheDocument()
  })
})
