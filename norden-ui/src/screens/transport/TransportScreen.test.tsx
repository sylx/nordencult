import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TransportScreen from './TransportScreen'
import type { TransportScreenProps } from './TransportScreen'

const setup = (props: Partial<TransportScreenProps> = {}) => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<TransportScreen from={{ id: 'A', name: 'アンバリア' }} to={{ id: 'C', name: 'ドルン' }} route={['アンバリア', 'ヴェルスタ', 'ドルン']}
    months={1} returnMonths={1}
    knights={[
      { id: 'k1', name: 'エルネスト' },
      { id: 'k2', name: 'リディア' },
      { id: 'k3', name: 'オスカー', unavailableReason: '侵攻予約中' },
    ]}
    soldierPool={600} supplyPool={300} onConfirm={onConfirm} onCancel={onCancel} {...props} />)
  return { onConfirm, onCancel }
}

const confirm = () => screen.getByRole('button', { name: '予約' })

describe('TransportScreen', () => {
  it('picks one knight in charge; unavailable ones cannot be picked', async () => {
    setup()
    expect(screen.getByRole('radio', { name: 'オスカー' })).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: 'エルネスト' }))
    await userEvent.click(screen.getByRole('radio', { name: 'リディア' }))
    expect(screen.getByRole('radio', { name: 'エルネスト' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'リディア' })).toBeChecked()
  })

  it('sends soldiers and supplies with the knight, who comes back after', async () => {
    const { onConfirm } = setup()
    expect(screen.getByRole('status', { name: '到着までの月数' })).toHaveTextContent('到着まで1ヶ月')
    expect(screen.getByRole('status', { name: '到着までの月数' })).toHaveTextContent('帰還まで計2ヶ月')
    await userEvent.click(screen.getByRole('radio', { name: 'リディア' }))
    expect(confirm()).toBeDisabled()
    expect(screen.getByText('輸送する兵か物資を決めてください')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('spinbutton', { name: '兵数（数値）' }), { target: { value: '400' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: '物資（数値）' }), { target: { value: '500' } })
    await userEvent.click(confirm())
    // Supplies up to the pool
    expect(onConfirm).toHaveBeenCalledWith({ knight: 'k2', troops: 400, supplies: 300, prisoners: [] })
  })

  it('transports prisoners, with or without soldiers and supplies', async () => {
    const { onConfirm } = setup({ prisoners: [{ id: 'p1', name: 'ミレイ', faction: { name: 'レオニス帝国' } }] })
    await userEvent.click(screen.getByRole('radio', { name: 'リディア' }))
    expect(screen.getByText('輸送する兵・物資・捕虜を決めてください')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('list', { name: '連れて行く捕虜' })).getByRole('checkbox', { name: 'ミレイ' }))
    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith({ knight: 'k2', troops: 0, supplies: 0, prisoners: ['p1'] })
  })

  it('has the 繰り返し輸送 checkbox disabled for now', () => {
    setup()
    expect(screen.getByRole('checkbox', { name: /繰り返し輸送/ })).toBeDisabled()
  })

  it('shows the host\'s problem and cancels', async () => {
    const { onCancel } = setup({ validate: () => '兵が足りません' })
    await userEvent.click(screen.getByRole('radio', { name: 'エルネスト' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: '兵数（数値）' }), { target: { value: '100' } })
    expect(confirm()).toBeDisabled()
    expect(screen.getByText('兵が足りません')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'やめる' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
