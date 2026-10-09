import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InvasionScreen from './InvasionScreen'
import type { InvasionScreenProps } from './InvasionScreen'

const unitTypes = [{ id: 'infantry', name: '歩兵' }, { id: 'archer', name: '弓兵' }, { id: 'cavalry', name: '騎兵' }]

const setup = (props: Partial<InvasionScreenProps> = {}) => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<InvasionScreen from={{ id: 'A', name: 'フルーエン' }} to={{ id: 'B', name: 'アンバリア' }} defenders={1}
    knights={[
      { id: 'k1', name: 'エルネスト', maxSoldiers: 400, defaultUnitType: 'cavalry' },
      { id: 'k2', name: 'リディア', maxSoldiers: 300 },
      { id: 'k3', name: 'マルクス', unavailableReason: '内政を担当中' },
    ]}
    unitTypes={unitTypes} soldierPool={600} onConfirm={onConfirm} onCancel={onCancel} {...props} />)
  return { onConfirm, onCancel }
}

const confirm = () => screen.getByRole('button', { name: '予約' })

describe('InvasionScreen', () => {
  it('cannot be ordered without knights; unavailable knights cannot be picked', () => {
    setup()
    expect(confirm()).toBeDisabled()
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('出撃する騎士を選んでください')
    expect(screen.getByRole('checkbox', { name: /マルクス/ })).toBeDisabled()
    expect(screen.getByText('守備の騎士: 1人')).toBeInTheDocument()
  })

  it('adds picked knights with their default unit type and soldiers within the pool', async () => {
    const { onConfirm } = setup()
    await userEvent.click(screen.getByRole('checkbox', { name: /エルネスト/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /リディア/ }))
    // エルネスト takes 400 (their cap); リディア gets the 200 left
    expect(within(screen.getByRole('radiogroup', { name: 'エルネストの兵科' })).getByRole('radio', { name: '騎兵' })).toHaveAttribute('aria-checked', 'true')
    expect(within(screen.getByRole('radiogroup', { name: 'リディアの兵科' })).getByRole('radio', { name: '歩兵' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('spinbutton', { name: 'エルネストの兵数（数値）' })).toHaveValue(400)
    expect(screen.getByRole('spinbutton', { name: 'リディアの兵数（数値）' })).toHaveValue(200)
    expect(screen.getByRole('slider', { name: 'リディアの兵数' })).toHaveAttribute('max', '200')

    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'リディアの兵科' })).getByRole('radio', { name: '弓兵' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'エルネストの兵数（数値）' }), { target: { value: '300' } })
    expect(screen.getByRole('slider', { name: 'リディアの兵数' })).toHaveAttribute('max', '300')
    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith([
      { knightId: 'k1', unitType: 'cavalry', soldiers: 300 },
      { knightId: 'k2', unitType: 'archer', soldiers: 200 },
    ])
  })

  it('removes a knight when unchecked and blocks empty units', async () => {
    setup({ soldierPool: 400 })
    await userEvent.click(screen.getByRole('checkbox', { name: /エルネスト/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /リディア/ }))
    expect(confirm()).toBeDisabled()
    expect(confirm()).toHaveAttribute('title', '兵数が0の騎士がいます')
    await userEvent.click(screen.getByRole('checkbox', { name: /リディア/ }))
    expect(screen.queryByRole('region', { name: 'リディアの部隊' })).not.toBeInTheDocument()
    expect(confirm()).toBeEnabled()
  })

  it('applies the host rules and cancels', async () => {
    const { onCancel } = setup({ validate: draft => (draft.length > 1 ? '1人までです' : null) })
    await userEvent.click(screen.getByRole('checkbox', { name: /エルネスト/ }))
    expect(confirm()).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /リディア/ }))
    expect(confirm()).toHaveAttribute('title', '1人までです')
    await userEvent.click(screen.getByRole('button', { name: 'やめる' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
