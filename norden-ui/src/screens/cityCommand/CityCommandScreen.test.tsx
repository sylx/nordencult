import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CityCommandScreen from './CityCommandScreen'
import type { CityView } from '../types'

const city: CityView = {
  id: 'P012', name: 'フルーエン', faction: { name: 'カルタ書院' }, population: 11000,
  knights: [{ id: 'k1', name: 'エルネスト' }],
  neighbours: [{ id: 'P004', name: 'アンバリア', faction: { name: 'レオニス帝国' } }],
}

const setup = (props: Partial<Parameters<typeof CityCommandScreen>[0]> = {}) => {
  const handlers = { onCommand: vi.fn(), onEndTurn: vi.fn(), onPrevCity: vi.fn(), onNextCity: vi.fn(), onSelectNeighbour: vi.fn() }
  render(<CityCommandScreen city={city} turn={{ turn: 3, phaseLabel: '戦略フェーズ', activeFaction: { name: 'カルタ書院' } }}
    {...handlers} {...props} />)
  return handlers
}

describe('CityCommandScreen', () => {
  it('shows the city window, turn and city switcher', async () => {
    const { onPrevCity, onNextCity } = setup({ cityPosition: { index: 0, count: 2 } })
    expect(screen.getByRole('region', { name: 'カルタ書院 フルーエン' })).toBeInTheDocument()
    const turn = screen.getByRole('group', { name: 'ターン情報' })
    expect(within(turn).getByText('戦略フェーズ')).toBeInTheDocument()
    expect(within(turn).getByText('カルタ書院')).toBeInTheDocument()
    expect(within(turn).getByText('のターン')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '前の都市' }))
    await userEvent.click(screen.getByRole('button', { name: '次の都市' }))
    expect(onPrevCity).toHaveBeenCalledOnce()
    expect(onNextCity).toHaveBeenCalledOnce()
  })

  it('runs sub-commands and direct commands through onCommand', async () => {
    const { onCommand, onEndTurn } = setup()
    const toolbar = screen.getByRole('navigation', { name: '都市コマンド' })
    await userEvent.click(within(toolbar).getByRole('button', { name: /軍事/ }))
    await userEvent.click(screen.getByRole('button', { name: '侵攻' }))
    expect(onCommand).toHaveBeenLastCalledWith('invade')
    await userEvent.click(within(toolbar).getByRole('button', { name: /内政/ }))
    expect(onCommand).toHaveBeenLastCalledWith('domestic')
    await userEvent.click(within(toolbar).getByRole('button', { name: /ターン終了/ }))
    expect(onEndTurn).toHaveBeenCalledOnce()
  })

  it('shows the command whose screen is open as pressed and enabled', () => {
    // It stays usable to close its screen, even if it could not be opened now
    setup({ activeCommand: 'domestic', commandState: { domestic: { disabled: true, reason: '手番ではありません' } } })
    expect(screen.getByRole('button', { name: /内政/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /内政/ })).toBeEnabled()
  })

  it('disables commands with the reason as tooltip', async () => {
    setup({ commandState: { invade: { disabled: true, reason: '出撃できる騎士がいません' } }, endTurnDisabled: true })
    await userEvent.click(screen.getByRole('button', { name: /軍事/ }))
    expect(screen.getByRole('button', { name: '侵攻' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '侵攻' })).toHaveAttribute('title', '出撃できる騎士がいません')
    expect(screen.getByRole('button', { name: /ターン終了/ })).toBeDisabled()
  })

  it('shows the city\'s economy: scale, soldiers, supplies, effective stats and building slots', () => {
    setup({
      city: {
        ...city, tier: 2, scaleLabel: '大きな街', troops: 1100, troopMorale: 72, supplies: 440,
        stats: [{ label: '商業', value: 506, max: 1000, base: 440 }],
        buildings: {
          slots: 4, built: [{ id: 'market', name: '市場' }],
          construction: { building: { id: 'workshop', name: '工房' }, invested: 260, required: 400, turnsLeft: 1 },
        },
      },
      faction: { gold: 620, goldForecast: 110, production: 820, troops: 4500 },
    })
    expect(screen.queryByText(/Tier/)).not.toBeInTheDocument()
    expect(screen.getByText('大きな街')).toBeInTheDocument()
    expect(screen.getByText('兵数').closest('dt')?.nextElementSibling).toHaveTextContent('1,100')
    expect(screen.getByText('練度').closest('dt')?.nextElementSibling).toHaveTextContent('72')
    expect(screen.getByText('物資').closest('dt')?.nextElementSibling).toHaveTextContent('440')
    expect(screen.queryByText(/基礎/)).not.toBeInTheDocument()
    const slots = screen.getByRole('list', { name: '施設 1 / 4' })
    expect(within(slots).getByText('市場')).toBeInTheDocument()
    expect(within(slots).getByText('建設中')).toBeInTheDocument()
    expect(within(slots).getByRole('progressbar', { name: '建設の進捗' })).toHaveAttribute('aria-valuenow', '260')
    expect(within(slots).getByText(/あと1ターン/)).toBeInTheDocument()
    expect(within(slots).getAllByText('空き')).toHaveLength(2)
    const faction = screen.getByRole('group', { name: '勢力' })
    expect(within(faction).getByRole('group', { name: '金' })).toHaveTextContent('620（+110）')
    expect(within(screen.getByRole('group', { name: 'ターン情報' })).queryByText('620')).not.toBeInTheDocument()
  })

  it('lists the knights with all their abilities, the lord first', async () => {
    setup({
      city: {
        ...city,
        lord: { id: 'k2', name: 'ギルベルト' },
        knights: [
          { id: 'k1', name: 'エルネスト' },
          { id: 'k2', name: 'ギルベルト', abilities: { leadership: 80, strength: 70, intelligence: 60, politics: 50, charm: 40 } },
        ],
      },
    })
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    const details = screen.getAllByRole('button', { name: /の詳細$/ })
    expect(details.map(button => button.getAttribute('aria-label'))).toEqual(['ギルベルトの詳細', 'エルネストの詳細'])
    const lordCard = details[0]!.closest('.norden-knight-card') as HTMLElement
    for (const [label, value] of [['統率', '80'], ['武力', '70'], ['知力', '60'], ['政治', '50'], ['魅力', '40']] as const) {
      expect(within(lordCard).getByText(label).nextElementSibling).toHaveTextContent(value)
    }
  })

  it('lists knights and neighbours in the tabs', async () => {
    const { onSelectNeighbour } = setup()
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    expect(screen.getByText('エルネスト')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: '街道' }))
    await userEvent.click(screen.getByRole('button', { name: /アンバリア/ }))
    expect(onSelectNeighbour).toHaveBeenCalledWith('P004')
  })
})
