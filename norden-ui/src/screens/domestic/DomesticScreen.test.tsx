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
})
