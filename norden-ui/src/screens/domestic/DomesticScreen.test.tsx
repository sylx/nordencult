import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DomesticScreen from './DomesticScreen'
import type { DomesticScreenProps } from './DomesticScreen'

const props = (overrides: Partial<DomesticScreenProps> = {}): DomesticScreenProps => ({
  city: {
    id: 'P012', name: 'フルーエン',
    buildings: {
      slots: 4, built: [{ id: 'market', name: '市場' }],
      construction: { building: { id: 'workshop', name: '工房' }, invested: 100, required: 400, turnsLeft: 2 },
    },
  },
  gold: 500,
  buildOptions: [
    { id: 'granary', name: '倉庫', effects: ['人口の伸び +20%'], supplies: 300, gold: 80, turns: 2 },
    { id: 'temple', name: '神殿', supplies: 500, gold: 180, turns: 4, unavailableReason: 'ほかの施設を建設中です' },
  ],
  onBuild: vi.fn(),
  onCancelConstruction: vi.fn(),
  knights: [{ id: '029', name: 'マルクス' }, { id: '016', name: 'エルヴィン' }, { id: '015', name: 'クラリス', unavailableReason: '出撃予約中' }],
  assignments: { governor: '029', military: [] },
  bonuses: { governor: ['商業 +23%'], military: [] },
  forecast: (id, role) => [`${role}:${id}`],
  onAssign: vi.fn(),
  onUnassign: vi.fn(),
  onClose: vi.fn(),
  ...overrides,
})

describe('DomesticScreen', () => {
  it('lists the slots and the buildings to start, the unavailable ones disabled with the reason', async () => {
    const p = props()
    render(<DomesticScreen {...p} />)
    expect(screen.getByRole('list', { name: '施設 1 / 4' })).toBeInTheDocument()
    const granary = screen.getByRole('listitem', { name: '倉庫' })
    expect(granary).toHaveTextContent('人口の伸び +20%')
    expect(granary).toHaveTextContent('物資 300')
    expect(granary).toHaveTextContent('2ターン')
    await userEvent.click(within(granary).getByRole('button', { name: '倉庫を着工' }))
    expect(p.onBuild).toHaveBeenCalledWith('granary')
    const temple = screen.getByRole('listitem', { name: '神殿' })
    expect(within(temple).getByRole('button', { name: '神殿を着工' })).toBeDisabled()
    expect(temple).toHaveTextContent('ほかの施設を建設中です')
  })

  it('cancels the construction after confirming', async () => {
    const p = props()
    render(<DomesticScreen {...p} />)
    await userEvent.click(screen.getByRole('button', { name: '工房の建設を中止' }))
    expect(p.onCancelConstruction).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: '中止する' }))
    expect(p.onCancelConstruction).toHaveBeenCalledOnce()
  })

  it('assigns knights on the assign tab and shows the forecast', async () => {
    const p = props({ tab: 'assign' })
    render(<DomesticScreen {...p} />)
    expect(screen.getByRole('region', { name: '代官' })).toHaveTextContent('マルクス')
    expect(screen.getByRole('region', { name: '代官' })).toHaveTextContent('商業 +23%')
    expect(screen.getByRole('button', { name: 'マルクスを代官にする' })).toBeDisabled()
    expect(screen.getByText('代官なら governor:016')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'エルヴィンを軍事担当にする' }))
    expect(p.onAssign).toHaveBeenCalledWith('016', 'military')
    await userEvent.click(screen.getByRole('button', { name: 'マルクスを担当から外す' }))
    expect(p.onUnassign).toHaveBeenCalledWith('029')
    expect(screen.getByRole('button', { name: 'クラリスを軍事担当にする' })).toBeDisabled()
  })

  it('closes', async () => {
    const p = props()
    render(<DomesticScreen {...p} />)
    expect(screen.getByLabelText('金')).toHaveTextContent('500')
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(p.onClose).toHaveBeenCalledOnce()
  })
})
