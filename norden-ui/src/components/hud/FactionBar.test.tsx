import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FactionBar from './FactionBar'

describe('FactionBar', () => {
  it('shows the treasury with its change, the totals, then the city switcher', () => {
    render(<FactionBar summary={{ gold: 1234, goldForecast: -56, production: 820, troops: 4500 }} cityName="フルーエン" />)
    const bar = screen.getByRole('group', { name: '勢力' })
    const gold = within(bar).getByRole('group', { name: '金' })
    expect(gold).toHaveTextContent('1,234（−56）')
    expect(gold).toHaveAttribute('title', '次のターン −56')
    expect(within(bar).getByRole('group', { name: '総生産' })).toHaveTextContent('820')
    const troops = within(bar).getByRole('group', { name: '総兵力' })
    expect(troops).toHaveTextContent('4,500')
    const city = within(bar).getByRole('group', { name: '都市の切り替え' })
    expect(troops.compareDocumentPosition(city) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows the position and disables the steps without handlers', async () => {
    const onNext = vi.fn()
    render(<FactionBar cityName="フルーエン" cityPosition={{ index: 1, count: 3 }} onNextCity={onNext} />)
    expect(screen.queryByRole('group', { name: '金' })).not.toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前の都市' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '次の都市' }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('moves with the orb keyboard controls, keeps the offset across city changes, and resets with Home', async () => {
    const onPositionChange = vi.fn()
    const faction = { name: 'カルタ書院', emblem: '/emblem.png' }
    const { rerender } = render(<FactionBar faction={faction} cityName="フルーエン" onPositionChange={onPositionChange} />)
    const orb = screen.getByRole('button', { name: 'カルタ書院のバーを移動' })
    expect(screen.getByRole('img', { name: 'カルタ書院' })).toHaveAttribute('src', '/emblem.png')
    orb.focus()
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowDown}{/Shift}')
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 10, y: 1 })
    rerender(<FactionBar faction={faction} cityName="ヴェステル" onPositionChange={onPositionChange} />)
    expect(screen.getByRole('group', { name: '勢力' })).toHaveStyle({ translate: '10px 1px' })
    await userEvent.keyboard('{Home}')
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 0, y: 0 })
  })

  it('can lock movement and accept a new position from the caller', () => {
    const { rerender } = render(<FactionBar cityName="フルーエン" movable={false} position={{ x: 20, y: 30 }} />)
    expect(screen.getByRole('button', { name: '勢力のバーを移動' })).toBeDisabled()
    expect(screen.getByRole('group', { name: '勢力' })).toHaveStyle({ translate: '20px 30px' })
    rerender(<FactionBar cityName="フルーエン" movable={false} position={{ x: 0, y: 0 }} />)
    expect(screen.getByRole('group', { name: '勢力' })).toHaveStyle({ translate: '0px 0px' })
  })
})
