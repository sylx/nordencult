import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { KnightView } from '../../screens/types'
import EquipmentSlots from '../parts/EquipmentSlots'
import KnightPicker, { type KnightPickItem } from './KnightPicker'
import PickerDialog from './PickerDialog'
import RelicPicker from './RelicPicker'

const knight = (id: string, name: string, leadership: number, intelligence: number): KnightView =>
  ({ id, name, subtitle: '騎士', abilities: { leadership, strength: 50, intelligence, politics: 40, charm: 30 } })
const ITEMS: KnightPickItem[] = [
  { knight: knight('016', 'エルヴィン', 80, 67), note: '装備: 空き / 空き' },
  { knight: knight('015', 'クラリス', 30, 89) },
  { knight: knight('042', 'バレル', 70, 40), disabledReason: '傭兵は装備できません' },
]

/** The names of the rows, top to bottom */
const rows = () => within(screen.getByRole('list', { name: '騎士' })).getAllByRole('button').map(button => button.getAttribute('aria-label'))

function Knights({ multiple = false, onChange = () => {} }: { multiple?: boolean; onChange?: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([])
  return <KnightPicker items={ITEMS} selected={selected} multiple={multiple} onChange={ids => { setSelected(ids); onChange(ids) }} />
}

describe('KnightPicker', () => {
  it('lists the knights in the order given with their note and abilities, those who cannot be chosen greyed out with why', () => {
    render(<Knights />)
    expect(rows()).toEqual(['エルヴィン', 'クラリス', 'バレル'])
    expect(screen.getByRole('button', { name: 'エルヴィン' })).toHaveTextContent('装備: 空き / 空き')
    expect(screen.getByRole('button', { name: 'エルヴィン' })).toHaveTextContent('80')
    expect(screen.getByRole('button', { name: 'バレル' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'バレル' })).toHaveTextContent('傭兵は装備できません')
  })

  it('sorts by a column, the highest first, then the other way', async () => {
    render(<Knights />)
    await userEvent.click(screen.getByRole('button', { name: '知力で並べ替え' }))
    expect(rows()).toEqual(['クラリス', 'エルヴィン', 'バレル'])
    await userEvent.click(screen.getByRole('button', { name: '知力で並べ替え' }))
    expect(rows()).toEqual(['バレル', 'エルヴィン', 'クラリス'])
    await userEvent.click(screen.getByRole('button', { name: '統率で並べ替え' }))
    expect(rows()).toEqual(['エルヴィン', 'バレル', 'クラリス'])
  })

  it('chooses one, or several when multiple', async () => {
    const onChange = vi.fn()
    const { unmount } = render(<Knights onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'エルヴィン' }))
    await userEvent.click(screen.getByRole('button', { name: 'クラリス' }))
    expect(onChange).toHaveBeenLastCalledWith(['015'])
    expect(screen.getByRole('button', { name: 'クラリス' })).toHaveAttribute('aria-pressed', 'true')
    unmount()
    render(<Knights multiple onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'エルヴィン' }))
    await userEvent.click(screen.getByRole('button', { name: 'クラリス' }))
    expect(onChange).toHaveBeenLastCalledWith(['016', '015'])
    await userEvent.click(screen.getByRole('button', { name: 'エルヴィン' }))
    expect(onChange).toHaveBeenLastCalledWith(['015'])
  })

  it('says so when there is nobody', () => {
    render(<KnightPicker items={[]} selected={[]} onChange={() => {}} emptyText="いません" />)
    expect(screen.getByText('いません')).toBeInTheDocument()
  })
})

describe('RelicPicker', () => {
  it('chooses a relic, not one that cannot be (its reason in place of the label)', async () => {
    const onSelect = vi.fn()
    render(<RelicPicker selectedId="a" onSelect={onSelect} items={[
      { id: 'a', name: 'ライフル', rarity: 'C', label: 'エルヴィンが装備中' },
      { id: 'b', name: '万色の魔導書', rarity: 'S', disabledReason: '知力 90 が必要です' },
    ]} />)
    expect(screen.getByRole('button', { name: 'ライフル（エルヴィンが装備中）' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '万色の魔導書（知力 90 が必要です）' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'ライフル（エルヴィンが装備中）' }))
    expect(onSelect).toHaveBeenCalledWith('a')
  })
})

describe('PickerDialog', () => {
  it('confirms only once something is chosen, and cancels with やめる or Escape before the screen under it', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const under = vi.fn()
    window.addEventListener('keydown', under)
    const { rerender } = render(<PickerDialog title="選ぶ" confirmDisabled onConfirm={onConfirm} onCancel={onCancel}><p>一覧</p></PickerDialog>)
    const dialog = screen.getByRole('dialog', { name: '選ぶ' })
    expect(within(dialog).getByRole('button', { name: '決定' })).toBeDisabled()
    rerender(<PickerDialog title="選ぶ" onConfirm={onConfirm} onCancel={onCancel}><p>一覧</p></PickerDialog>)
    await userEvent.click(screen.getByRole('button', { name: '決定' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'やめる' }))
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(under).not.toHaveBeenCalled()
    window.removeEventListener('keydown', under)
  })
})

describe('EquipmentSlots', () => {
  const rifle = { id: 'carta-2', name: 'ライフル', rarity: 'C' as const, effects: ['ライフル兵を編成可能'] }

  it('shows each slot, choosing for it and taking a relic off', async () => {
    const onPick = vi.fn()
    const onRemove = vi.fn()
    render(<EquipmentSlots slots={[rifle, null]} onPick={onPick} onRemove={onRemove} />)
    expect(screen.getByRole('button', { name: '装備の枠1：ライフル' })).toHaveTextContent('ライフル兵を編成可能')
    await userEvent.click(screen.getByRole('button', { name: '装備の枠2：空き' }))
    expect(onPick).toHaveBeenCalledWith(1)
    await userEvent.click(screen.getByRole('button', { name: 'ライフルを外す' }))
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('cannot be changed with a reason, saying it', () => {
    render(<EquipmentSlots slots={[rifle, null]} disabledReason="手番ではありません" onPick={() => {}} onRemove={() => {}} />)
    expect(screen.getByRole('button', { name: '装備の枠2：空き' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'ライフルを外す' })).not.toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('手番ではありません')
  })
})
