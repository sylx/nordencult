import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MoveScreen from './MoveScreen'
import type { MoveScreenProps } from './MoveScreen'

const setup = (props: Partial<MoveScreenProps> = {}) => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<MoveScreen from={{ id: 'A', name: 'アンバリア' }} to={{ id: 'C', name: 'ドルン' }} route={['アンバリア', 'ヴェルスタ', 'ドルン']}
    months={2} soloMonths={1}
    knights={[
      { id: 'k1', name: 'エルネスト' },
      { id: 'k2', name: 'リディア' },
      { id: 'k3', name: 'オスカー', unavailableReason: '侵攻予約中' },
    ]}
    soldierPool={600} supplyPool={300} onConfirm={onConfirm} onCancel={onCancel} {...props} />)
  return { onConfirm, onCancel }
}

const confirm = () => screen.getByRole('button', { name: '予約' })
const months = () => screen.getByRole('status', { name: '到着までの月数' })

describe('MoveScreen', () => {
  const withMercenary = () => setup({
    knights: [{ id: 'k1', name: 'エルネスト' }, { id: 'm1', name: 'ブロック', mercenary: { company: '樽盾団', soldiers: 500, maxSoldiers: 500 } }],
  })

  it('does not let a mercenary ride alone, saying why', async () => {
    withMercenary()
    const solo = screen.getByRole('checkbox', { name: /単騎移動/ })
    expect(solo).toBeEnabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'ブロック' }))
    expect(solo).toBeDisabled()
    expect(solo.closest('label')).toHaveAttribute('title', '傭兵は単騎移動できません')
  })

  it('takes back riding alone when a mercenary is picked', async () => {
    withMercenary()
    const solo = screen.getByRole('checkbox', { name: /単騎移動/ })
    await userEvent.click(solo)
    expect(solo).toBeChecked()
    await userEvent.click(screen.getByRole('checkbox', { name: 'ブロック' }))
    expect(solo).not.toBeChecked()
  })

  it('picks several knights; unavailable ones cannot be picked', async () => {
    setup()
    expect(confirm()).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'オスカー' })).toBeDisabled()
    expect(screen.getByText('経由: ヴェルスタ（街道 2 区間）')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'エルネスト' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'リディア' }))
    expect(confirm()).toBeEnabled()
  })

  it('sends soldiers and supplies with the knights, in the months it takes', async () => {
    const { onConfirm } = setup()
    expect(months()).toHaveTextContent('到着まで2ヶ月')
    await userEvent.click(screen.getByRole('checkbox', { name: 'リディア' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'エルネスト' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: '兵数（数値）' }), { target: { value: '400' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: '物資（数値）' }), { target: { value: '500' } })
    await userEvent.click(confirm())
    // In the order of the list; supplies up to the pool
    expect(onConfirm).toHaveBeenCalledWith({ knights: ['k1', 'k2'], troops: 400, supplies: 300, solo: false, prisoners: [] })
  })

  it('riding alone takes no soldiers or supplies and arrives sooner', async () => {
    const { onConfirm } = setup()
    await userEvent.click(screen.getByRole('checkbox', { name: 'エルネスト' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: '兵数（数値）' }), { target: { value: '400' } })
    await userEvent.click(screen.getByRole('checkbox', { name: /単騎移動/ }))
    expect(months()).toHaveTextContent('到着まで1ヶ月')
    expect(screen.getByRole('spinbutton', { name: '兵数（数値）' })).toHaveValue(0)
    expect(screen.getByRole('spinbutton', { name: '兵数（数値）' })).toBeDisabled()
    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith({ knights: ['k1'], troops: 0, supplies: 0, solo: true, prisoners: [] })
  })

  it('takes prisoners along, not riding alone', async () => {
    const { onConfirm } = setup({
      prisoners: [{ id: 'p1', name: 'ミレイ', faction: { name: 'レオニス帝国' } }, { id: 'p2', name: 'グレタ', unavailableReason: '移送予約中' }],
    })
    const prisoners = screen.getByRole('list', { name: '連れて行く捕虜' })
    expect(within(prisoners).getByRole('checkbox', { name: 'グレタ' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'エルネスト' }))
    await userEvent.click(within(prisoners).getByRole('checkbox', { name: 'ミレイ' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /単騎移動/ }))
    expect(within(prisoners).getByRole('checkbox', { name: 'ミレイ' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /単騎移動/ }))
    await userEvent.click(within(prisoners).getByRole('checkbox', { name: 'ミレイ' }))
    await userEvent.click(confirm())
    expect(onConfirm).toHaveBeenCalledWith({ knights: ['k1'], troops: 0, supplies: 0, solo: false, prisoners: ['p1'] })
  })

  it('shows no prisoners without any', () => {
    setup()
    expect(screen.queryByRole('list', { name: '連れて行く捕虜' })).not.toBeInTheDocument()
  })

  it('shows the host\'s problem and cancels', async () => {
    const { onCancel } = setup({ validate: () => '兵が足りません' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'エルネスト' }))
    expect(confirm()).toBeDisabled()
    expect(screen.getByText('兵が足りません')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'やめる' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
