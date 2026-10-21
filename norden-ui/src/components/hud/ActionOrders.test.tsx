import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ActionOrders from './ActionOrders'
import type { ActionOrderView } from './ActionOrders'

const ORDERS: ActionOrderView[] = [
  { id: 'o1', kind: 'invasion', from: 'フルーエン', to: 'アンバリア', knights: ['エルネスト', 'リディア', 'セラフィナ'], cancellable: true },
  { id: 'o2', kind: 'move', from: 'ヴェステル', to: 'ミルデン', knights: ['オスカー', 'ミラ'], cancellable: true },
  { id: 'o3', kind: 'move', from: 'フルーエン', to: 'ミルデン', knights: ['マルクス'], status: 'あと3ヶ月' },
]

describe('ActionOrders', () => {
  it('lists invasions with the commander and their number, moves with every knight', () => {
    render(<ActionOrders orders={ORDERS} onCancel={() => {}} />)
    const items = within(screen.getByRole('region', { name: '行動予約' })).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('侵攻フルーエン→アンバリア軍団長エルネスト 以下3名')
    expect(items[1]).toHaveTextContent('移動ヴェステル→ミルデン担当オスカー・ミラ')
    expect(items[2]).toHaveTextContent('あと3ヶ月')
  })

  it('cancels only the orders that can be taken back', async () => {
    const onCancel = vi.fn()
    render(<ActionOrders orders={ORDERS} onCancel={onCancel} />)
    expect(screen.getAllByRole('button', { name: /を取り消す$/ })).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'ヴェステルからミルデンへの移動を取り消す' }))
    expect(onCancel).toHaveBeenCalledWith('o2')
  })

  it('shows a single knight\'s invasion by the commander alone, and the empty list', () => {
    const { rerender } = render(<ActionOrders orders={[{ ...ORDERS[0]!, knights: ['エルネスト'] }]} />)
    expect(screen.getByRole('listitem')).toHaveTextContent(/軍団長エルネスト$/)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    rerender(<ActionOrders orders={[]} />)
    expect(screen.getByText('予約はありません')).toBeInTheDocument()
  })

  it('selects an order by its route', async () => {
    const onSelect = vi.fn()
    render(<ActionOrders orders={ORDERS} onSelect={onSelect} />)
    await userEvent.click(screen.getAllByRole('button', { name: /ミルデン/ })[1]!)
    expect(onSelect).toHaveBeenCalledWith('o3')
  })
})
