import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { KnightView } from '../types'
import SummonDialog from './SummonDialog'

const dragon: KnightView = {
  id: 's1', name: 'イグナーヴ', subtitle: '召喚', image: <span>ドラゴンの絵</span>,
  summon: { hp: 600, maxHp: 600, attack: 172, defense: 185 },
}

const shown = (props: Partial<Parameters<typeof SummonDialog>[0]> = {}) => {
  const onConfirm = vi.fn()
  const names = ['ヴァルグリム', 'ゼファーン']
  const onAutoName = vi.fn(() => names.shift() ?? 'ネフィラ')
  render(<SummonDialog knight={dragon} name="イグナーヴ" onAutoName={onAutoName} onConfirm={onConfirm} {...props} />)
  return { onConfirm, onAutoName }
}

const input = () => screen.getByRole('textbox', { name: '名前' })
const decide = () => screen.getByRole('button', { name: '決定' })

describe('SummonDialog', () => {
  it('shows the figure, HP, attack and defense, and the name given', () => {
    shown()
    expect(screen.getByRole('dialog', { name: '召喚ユニットの名付け' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'イグナーヴの立ち絵' })).toHaveTextContent('ドラゴンの絵')
    expect([...document.querySelectorAll('.norden-knight-stat')].map(stat => stat.textContent)).toEqual(['HP600', '攻撃力172', '防御力185'])
    expect(input()).toHaveValue('イグナーヴ')
  })

  it('takes a typed name, spaces around it dropped', async () => {
    const { onConfirm } = shown()
    await userEvent.clear(input())
    await userEvent.type(input(), ' ファフ ')
    await userEvent.click(decide())
    expect(onConfirm).toHaveBeenCalledWith('ファフ')
  })

  it('gives another name from the list each time 自動 is pressed', async () => {
    const { onConfirm, onAutoName } = shown()
    await userEvent.click(screen.getByRole('button', { name: '自動' }))
    expect(input()).toHaveValue('ヴァルグリム')
    await userEvent.click(screen.getByRole('button', { name: '自動' }))
    expect(input()).toHaveValue('ゼファーン')
    expect(onAutoName).toHaveBeenCalledTimes(2)
    await userEvent.click(decide())
    expect(onConfirm).toHaveBeenCalledWith('ゼファーン')
  })

  it('refuses an empty or too long name, and the host\'s', async () => {
    shown({ validate: name => (name === 'ダメ' ? '使えない名前です' : null) })
    await userEvent.clear(input())
    expect(decide()).toBeDisabled()
    expect(screen.getByRole('note')).toHaveTextContent('名前を入れてください')
    await userEvent.type(input(), 'あ'.repeat(13))
    expect(decide()).toBeDisabled()
    expect(screen.getByRole('note')).toHaveTextContent('名前は12文字までです')
    await userEvent.clear(input())
    await userEvent.type(input(), 'ダメ')
    expect(screen.getByRole('note')).toHaveTextContent('使えない名前です')
  })

  it('has no way to back out: Escape does nothing and reaches no screen under it', () => {
    const under = vi.fn()
    window.addEventListener('keydown', under)
    const { onConfirm } = shown()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(under).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'やめる' })).not.toBeInTheDocument()
    window.removeEventListener('keydown', under)
  })
})
