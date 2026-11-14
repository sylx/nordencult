import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MercenaryScreen, { type MercenaryScreenProps } from './MercenaryScreen'
import type { MercenaryContractView, MercenaryOfferView } from '../types'

const offer: MercenaryOfferView = {
  knight: { id: 'm1', name: 'ブロック' }, company: '樽盾団', unitType: '騎兵', soldiers: 500, maxSoldiers: 500, rank: 'D', cityName: 'フルーエン',
}
const proud: MercenaryOfferView = {
  knight: { id: 'm2', name: 'カスパル' }, company: 'ランツクネヒト', unitType: 'ランツクネヒト', soldiers: 1000, maxSoldiers: 1000, rank: 'S',
  cityName: 'アンバリア',
}
const contract: MercenaryContractView = {
  knight: { id: 'm3', name: 'グレイ' }, company: '鉄弦団', unitType: '弓兵', cityName: 'シルヴァ', soldiers: 300, maxSoldiers: 500, rank: 'C', monthly: 167, months: 2,
}

/** The cards of the list, in order */
const order = () => screen.getAllByRole('button').map(button => button.getAttribute('aria-label')).filter(label => label?.includes('（'))

function show(props: Partial<MercenaryScreenProps> = {}) {
  const handlers = { onHire: vi.fn(), onDismiss: vi.fn(), onClose: vi.fn() }
  render(<MercenaryScreen cityName="フルーエン" gold={3000} offers={[offer, proud]} contracts={[contract]} {...handlers} {...props} />)
  return handlers
}

describe('MercenaryScreen', () => {
  it('shows the city, the gold and the details of the first mercenary, without what they cost', () => {
    show()
    expect(screen.getByRole('banner')).toHaveTextContent('フルーエンで雇用')
    expect(screen.getByText('3,000')).toBeInTheDocument()
    const details = screen.getByRole('region', { name: '傭兵の詳細' })
    expect(within(details).getByText('騎兵')).toBeInTheDocument()
    expect(within(details).getByText('500 / 500')).toBeInTheDocument()
    expect(within(details).getByLabelText('ランクD')).toBeInTheDocument()
    expect(details.querySelector('.norden-mercenary-profile')).toHaveTextContent('所在地フルーエン')
    expect(details).not.toHaveTextContent('契約金')
    expect(details).not.toHaveTextContent('月額')
  })

  it('shows no abilities in the details', () => {
    show({ offers: [{ ...offer, knight: { ...offer.knight, abilities: { strength: 90 } } }] })
    const details = screen.getByRole('region', { name: '傭兵の詳細' })
    expect(details.querySelector('.norden-knight-stats')).toBeNull()
    expect(details).not.toHaveTextContent('90')
  })

  it('shows the rank of each in the list, without what they cost or their abilities', () => {
    // The knight's view has a few stats for the cards of other screens
    const knight = { ...offer.knight, abilities: { strength: 90 }, stats: [{ label: '武力', value: 90 }] }
    show({ offers: [{ ...offer, knight }, proud] })
    const list = within(screen.getByRole('region', { name: '契約できる傭兵' }))
    expect(list.getByRole('button', { name: '樽盾団（ブロック）' })).toHaveTextContent('ランクD')
    expect(list.getByRole('button', { name: 'ランツクネヒト（カスパル）' })).toHaveTextContent('ランクS')
    expect(list.getByRole('button', { name: '樽盾団（ブロック）' })).not.toHaveTextContent('90')
    expect(screen.getByRole('region', { name: '契約できる傭兵' }).querySelector('.norden-knight-stats')).toBeNull()
  })

  it('shows what those hired cost each month', async () => {
    show()
    await userEvent.click(screen.getByRole('tab', { name: /契約中/ }))
    expect(within(screen.getByRole('region', { name: '傭兵の詳細' })).getByText('月額')).toBeInTheDocument()
    const list = within(screen.getByRole('region', { name: '契約中の傭兵' }))
    expect(within(list.getByRole('button', { name: '鉄弦団（グレイ）' })).getByText('167')).toBeInTheDocument()
  })

  it('shows the figure, the unit and the 略歴 without the ids in it', () => {
    const knight = { ...offer.knight, imageSrc: 'figure.webp', biography: 'カスパル（110）の古い友。' }
    show({ offers: [{ ...offer, knight, unitImage: 'cavalry.webp' }] })
    const details = within(screen.getByRole('region', { name: '傭兵の詳細' }))
    expect(details.getByRole('img', { name: 'ブロックの立ち絵' }).querySelector('img')).toHaveAttribute('src', 'figure.webp')
    expect(screen.getByRole('region', { name: '傭兵の詳細' }).querySelector('.norden-mercenary-unit img')).toHaveAttribute('src', 'cavalry.webp')
    expect(details.getByText('カスパルの古い友。')).toBeInTheDocument()
  })

  it('searches by the company or the knight, showing the first found', async () => {
    show()
    const search = screen.getByRole('searchbox', { name: '傭兵団・騎士名で検索' })
    await userEvent.type(search, 'カスパル')
    expect(order()).toEqual(['ランツクネヒト（カスパル）'])
    expect(screen.getByRole('button', { name: 'ランツクネヒトと交渉' })).toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, '樽盾')
    expect(order()).toEqual(['樽盾団（ブロック）'])
    await userEvent.clear(search)
    await userEvent.type(search, '無名')
    expect(screen.getByText('条件に合う傭兵はいません。')).toBeInTheDocument()
    expect(screen.getByText('傭兵を選ぶと詳細が出ます。')).toBeInTheDocument()
  })

  it('clears the search with Escape before anything closes', async () => {
    const onKey = vi.fn((event: KeyboardEvent) => event.defaultPrevented)
    window.addEventListener('keydown', onKey)
    show()
    await userEvent.type(screen.getByRole('searchbox'), '樽{Escape}')
    window.removeEventListener('keydown', onKey)
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(onKey).toHaveLastReturnedWith(true)
  })

  it('lists them from the lowest rank, with no way to sort them otherwise', () => {
    show({ offers: [proud, offer] })
    expect(order()).toEqual(['樽盾団（ブロック）', 'ランツクネヒト（カスパル）'])
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: /昇順|降順/ })).toBeNull()
  })

  it('starts those hired from the lowest rank', async () => {
    show({ contracts: [{ ...contract, rank: 'A' }, { ...contract, knight: { id: 'm4', name: 'ユルヴァ' }, company: '朱線団', rank: 'D' }] })
    await userEvent.click(screen.getByRole('tab', { name: /契約中/ }))
    expect(order()).toEqual(['朱線団（ユルヴァ）', '鉄弦団（グレイ）'])
  })

  it('talks to the mercenary chosen', async () => {
    const { onHire } = show()
    await userEvent.click(screen.getByRole('button', { name: '樽盾団と交渉' }))
    expect(onHire).toHaveBeenCalledWith('m1')
  })

  it('shows why one cannot be talked to, the button not working', async () => {
    const { onHire } = show({ offers: [{ ...proud, unavailableReason: '手番ではありません' }] })
    expect(screen.getByRole('note')).toHaveTextContent('手番ではありません')
    expect(screen.getByRole('button', { name: 'ランツクネヒトと交渉' })).toBeDisabled()
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
