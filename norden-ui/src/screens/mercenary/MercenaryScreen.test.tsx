import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MercenaryScreen, { type MercenaryScreenProps } from './MercenaryScreen'
import type { MercenaryContractView, MercenaryOfferView } from '../types'

const offer: MercenaryOfferView = {
  knight: { id: 'm1', name: 'ブロック' }, company: '樽盾団', unitType: '騎兵', soldiers: 500, maxSoldiers: 500, fee: 1000, monthly: 167, cityName: 'フルーエン',
}
const proud: MercenaryOfferView = {
  knight: { id: 'm2', name: 'カスパル' }, company: 'ランツクネヒト', unitType: 'ランツクネヒト', soldiers: 1000, maxSoldiers: 1000, fee: 10000, monthly: 1667,
  cityName: 'アンバリア', unavailableReason: 'ランツクネヒトはこの勢力との契約に応じません',
}
const contract: MercenaryContractView = {
  knight: { id: 'm3', name: 'グレイ' }, company: '鉄弦団', cityName: 'シルヴァ', soldiers: 300, maxSoldiers: 500, monthly: 167, months: 2,
}

function show(props: Partial<MercenaryScreenProps> = {}) {
  const handlers = { onHire: vi.fn(), onDismiss: vi.fn(), onClose: vi.fn() }
  render(<MercenaryScreen cityName="フルーエン" gold={3000} offers={[offer, proud]} contracts={[contract]} {...handlers} {...props} />)
  return handlers
}

describe('MercenaryScreen', () => {
  it('shows the city, the gold and the details of the first mercenary', () => {
    show()
    expect(screen.getByText('フルーエンで契約')).toBeInTheDocument()
    expect(screen.getByText('3,000')).toBeInTheDocument()
    const details = screen.getByRole('region', { name: '傭兵の詳細' })
    expect(within(details).getByText('騎兵')).toBeInTheDocument()
    expect(within(details).getByText('167')).toBeInTheDocument()
  })

  it('hires the mercenary chosen', async () => {
    const { onHire } = show()
    await userEvent.click(screen.getByRole('button', { name: '樽盾団と契約' }))
    expect(onHire).toHaveBeenCalledWith('m1')
  })

  it('shows why one cannot be hired, the button not working', async () => {
    const { onHire } = show()
    await userEvent.click(screen.getByRole('button', { name: 'ランツクネヒト（カスパル）' }))
    expect(screen.getByRole('note')).toHaveTextContent('契約に応じません')
    expect(screen.getByRole('button', { name: 'ランツクネヒトと契約' })).toBeDisabled()
    expect(onHire).not.toHaveBeenCalled()
  })

  it('dismisses after a confirmation warning of what it costs when short of soldiers', async () => {
    const { onDismiss } = show()
    await userEvent.click(screen.getByRole('tab', { name: /契約中/ }))
    await userEvent.click(screen.getByRole('button', { name: '鉄弦団との契約を打ち切る' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('評判を落とし')
    expect(onDismiss).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: '打ち切る' }))
    expect(onDismiss).toHaveBeenCalledWith('m3')
  })

  it('does not warn of the reputation at full strength', async () => {
    show({ contracts: [{ ...contract, soldiers: 500 }] })
    await userEvent.click(screen.getByRole('tab', { name: /契約中/ }))
    await userEvent.click(screen.getByRole('button', { name: '鉄弦団との契約を打ち切る' }))
    expect(screen.getByRole('dialog')).not.toHaveTextContent('評判を落とし')
  })

  it('does not dismiss one with a reason against it', async () => {
    show({ contracts: [{ ...contract, unavailableReason: '移動の予約中は打ち切れません' }] })
    await userEvent.click(screen.getByRole('tab', { name: /契約中/ }))
    expect(screen.getByRole('button', { name: '鉄弦団との契約を打ち切る' })).toBeDisabled()
    expect(screen.getByRole('note')).toHaveTextContent('移動の予約中は打ち切れません')
  })

  it('says when there is nobody', async () => {
    show({ offers: [], contracts: [] })
    expect(screen.getByText('フルーエンから契約できる傭兵はいません。')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /契約中/ }))
    expect(screen.getByText('契約中の傭兵はいません。')).toBeInTheDocument()
  })
})
