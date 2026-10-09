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
    await userEvent.click(within(toolbar).getByRole('button', { name: /研究/ }))
    expect(onCommand).toHaveBeenLastCalledWith('research')
    await userEvent.click(within(toolbar).getByRole('button', { name: /ターン終了/ }))
    expect(onEndTurn).toHaveBeenCalledOnce()
  })

  it('disables commands with the reason as tooltip', async () => {
    setup({ commandState: { invade: { disabled: true, reason: '出撃できる騎士がいません' } }, endTurnDisabled: true })
    await userEvent.click(screen.getByRole('button', { name: /軍事/ }))
    expect(screen.getByRole('button', { name: '侵攻' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '侵攻' })).toHaveAttribute('title', '出撃できる騎士がいません')
    expect(screen.getByRole('button', { name: /ターン終了/ })).toBeDisabled()
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
