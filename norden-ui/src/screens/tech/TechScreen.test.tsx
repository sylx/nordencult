import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TechTreeView, TechView } from '../types'
import TechScreen from './TechScreen'
import { layoutTechs } from './techLayout'

const tech = (id: string, requires: string[], change: Partial<TechView> = {}): TechView =>
  ({ id, requires, status: 'hidden', ...change })

const TREES: TechTreeView[] = [
  {
    id: 'physical', label: '物理文明', techs: [
      tech('phys', [], { status: 'researched', name: '物理文明', cost: 100, progress: 100, effects: ['生産 +5%'] }),
      tech('tactics', ['phys'], { status: 'researching', name: '兵法', cost: 200, progress: 40, turns: 8, effects: ['新兵の練度 +5'] }),
      tech('gunpowder', ['phys'], { status: 'available', name: '火薬', cost: 200, progress: 0, turns: 10 }),
      tech('melee', ['tactics']),
    ],
  },
  {
    id: 'arcane', label: '魔法文明', techs: [
      tech('arc', [], { status: 'available', name: '魔法文明', cost: 100 }),
      tech('fire', ['arc'], { status: 'visible', name: '火魔法', cost: 300, unavailableReason: '前提の技術（魔法文明）が要ります' }),
    ],
  },
]

describe('TechScreen', () => {
  it('draws the trees with each technology as it stands, ??? for the unknown', () => {
    render(<TechScreen trees={TREES} perTurn={[12, 15]} onClose={() => {}} />)
    const physical = screen.getByRole('region', { name: '物理文明' })
    expect(within(physical).getByRole('button', { name: '物理文明（研究済み）' })).toBeInTheDocument()
    expect(within(physical).getByRole('button', { name: '兵法（研究中）' })).toHaveTextContent('40 / 200')
    expect(within(physical).getByRole('button', { name: '???（未知の技術）' })).not.toHaveTextContent('白兵戦')
    expect(screen.getByRole('button', { name: '火魔法（前提が足りない）' })).toBeInTheDocument()
    expect(screen.getByText('+12〜15')).toBeInTheDocument()
  })

  it('shows the technology researched first, and another chosen with 研究する', async () => {
    const onResearch = vi.fn()
    render(<TechScreen trees={TREES} onResearch={onResearch} onClose={() => {}} />)
    const details = screen.getByRole('region', { name: '技術の詳細' })
    expect(within(details).getByRole('heading', { name: '兵法' })).toBeInTheDocument()
    expect(within(details).getByText('あと8ターン', { exact: false })).toBeInTheDocument()
    expect(within(details).getByRole('button', { name: '兵法を研究する' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '火薬（研究できる）' }))
    await userEvent.click(within(details).getByRole('button', { name: '火薬を研究する' }))
    expect(onResearch).toHaveBeenCalledWith('gunpowder')
  })

  it('says what is missing, and nothing of the unknown', async () => {
    render(<TechScreen trees={TREES} onResearch={() => {}} onClose={() => {}} />)
    const details = screen.getByRole('region', { name: '技術の詳細' })
    await userEvent.click(screen.getByRole('button', { name: '火魔法（前提が足りない）' }))
    expect(within(details).getByRole('note')).toHaveTextContent('前提の技術（魔法文明）が要ります')
    expect(within(details).getByRole('button', { name: '火魔法を研究する' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '???（未知の技術）' }))
    expect(within(details).getByRole('heading', { name: '???' })).toBeInTheDocument()
    expect(within(details).queryByRole('button')).not.toBeInTheDocument()
  })

  it('cannot be closed while the points 宙に浮いた must go somewhere', () => {
    const { rerender } = render(<TechScreen trees={TREES} carry={30} mustChoose onClose={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('研究先を選んでください（宙に浮いた研究ポイント 30）')
    expect(screen.queryByRole('button', { name: '閉じる' })).not.toBeInTheDocument()
    rerender(<TechScreen trees={TREES} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
  })
})

describe('layoutTechs', () => {
  it('puts each technology a column deeper than what it requires, the rows following the tree', () => {
    const layout = layoutTechs([
      tech('root', []), tech('a', ['root']), tech('a1', ['a']), tech('a2', ['a']), tech('b', ['root']), tech('ab', ['a1', 'b']),
    ])
    expect(layout.places).toEqual({
      root: { column: 0, row: 0 }, a: { column: 1, row: 0 }, a1: { column: 2, row: 0 }, ab: { column: 3, row: 0 },
      a2: { column: 2, row: 1 }, b: { column: 1, row: 2 },
    })
    expect(layout).toMatchObject({ columns: 4, rows: 3 })
  })

  it('survives a cycle', () => {
    const layout = layoutTechs([tech('a', ['b']), tech('b', ['a'])])
    expect(Object.keys(layout.places).sort()).toEqual(['a', 'b'])
  })
})
