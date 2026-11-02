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
  cityName: 'アンバリア', unavailableReason: 'ランツクネヒトは我々との契約に応じません',
}
const contract: MercenaryContractView = {
  knight: { id: 'm3', name: 'グレイ' }, company: '鉄弦団', unitType: '弓兵', cityName: 'シルヴァ', soldiers: 300, maxSoldiers: 500, monthly: 167, months: 2,
}

/** The cards of the list, in order */
const order = () => screen.getAllByRole('button').map(button => button.getAttribute('aria-label')).filter(label => label?.includes('（'))

function show(props: Partial<MercenaryScreenProps> = {}) {
  const handlers = { onHire: vi.fn(), onDismiss: vi.fn(), onClose: vi.fn() }
  render(<MercenaryScreen cityName="フルーエン" gold={3000} offers={[offer, proud]} contracts={[contract]} {...handlers} {...props} />)
  return handlers
}

describe('MercenaryScreen', () => {
  it('shows the city, the gold and the details of the first mercenary', () => {
    show()
    expect(screen.getByRole('banner')).toHaveTextContent('フルーエンで雇用')
    expect(screen.getByText('3,000')).toBeInTheDocument()
    const details = screen.getByRole('region', { name: '傭兵の詳細' })
    expect(within(details).getByText('騎兵')).toBeInTheDocument()
    expect(within(details).getByText('500 / 500')).toBeInTheDocument()
    expect(within(details).getByText('167')).toBeInTheDocument()
    expect(within(details).getByText('所在地')).toBeInTheDocument()
  })

  it('shows what each costs in the list', () => {
    show()
    const list = within(screen.getByRole('region', { name: '契約できる傭兵' }))
    expect(within(list.getByRole('button', { name: '樽盾団（ブロック）' })).getByText('1,000')).toBeInTheDocument()
    expect(within(list.getByRole('button', { name: 'ランツクネヒト（カスパル）' })).getByText('1,667')).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: 'ランツクネヒトと契約' })).toBeInTheDocument()
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

  it('sorts by an ability, the highest first, and can turn it around', async () => {
    const strong = { ...offer.knight, abilities: { strength: 90 } }
    const weak = { ...proud.knight, abilities: { strength: 40 } }
    show({ offers: [{ ...proud, knight: weak }, { ...offer, knight: strong }] })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '並び順' }), '武力')
    expect(order()).toEqual(['樽盾団（ブロック）', 'ランツクネヒト（カスパル）'])
    await userEvent.click(screen.getByRole('button', { name: '▼ 降順' }))
    expect(order()).toEqual(['ランツクネヒト（カスパル）', '樽盾団（ブロック）'])
  })

  it('starts from the lowest price, and sorts by the unit type', async () => {
    show({ offers: [proud, offer] })
    expect(screen.getByRole('combobox', { name: '並び順' })).toHaveValue('price')
    expect(screen.getByRole('button', { name: '▲ 昇順' })).toBeInTheDocument()
    expect(order()).toEqual(['樽盾団（ブロック）', 'ランツクネヒト（カスパル）'])
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '並び順' }), '兵科')
    expect(order()).toEqual(['ランツクネヒト（カスパル）', '樽盾団（ブロック）'])
  })

  it('starts those hired from what they cost the least each month', async () => {
    show({ contracts: [{ ...contract, monthly: 500 }, { ...contract, knight: { id: 'm4', name: 'ユルヴァ' }, company: '朱線団', monthly: 100 }] })
    await userEvent.click(screen.getByRole('tab', { name: /契約中/ }))
    expect(order()).toEqual(['朱線団（ユルヴァ）', '鉄弦団（グレイ）'])
  })

  it('hires the mercenary chosen', async () => {
    const { onHire } = show()
    expect(screen.getByRole('button', { name: '樽盾団と契約' })).toHaveAttribute('data-sound', 'coins')
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
