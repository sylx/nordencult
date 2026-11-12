import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DateBar from './DateBar'

const labels = { phaseLabel: '戦略フェーズ', factionName: 'カルタ書院', dateLabel: '灰歴312年1月' }

const dateOf = () => document.querySelector<HTMLElement>('.norden-date-bar-date')!

describe('DateBar', () => {
  it('shows phase, faction turn, date and settings in reading order', () => {
    render(<DateBar {...labels} onSettings={() => {}} />)
    const bar = screen.getByRole('group', { name: 'ターン情報' })
    const phase = within(bar).getByText(labels.phaseLabel)
    const faction = within(bar).getByText(labels.factionName)
    const date = dateOf()
    const settings = within(bar).getByRole('button', { name: '設定' })
    expect(phase.compareDocumentPosition(faction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(faction.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(date.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(bar).getByText('のターン')).toBeInTheDocument()
    expect(date).toHaveTextContent(labels.dateLabel)
  })

  it.each(['灰歴312年1月', '灰歴３１２年１月', '灰歴312年 春', '日付未定'])(
    'preserves the complete date label when formatting %s', dateLabel => {
      render(<DateBar {...labels} dateLabel={dateLabel} />)
      expect(dateOf().textContent).toBe(dateLabel)
    },
  )

  it('draws a season after a space as large as the numbers', () => {
    render(<DateBar {...labels} dateLabel="灰歴312年1月 冬" />)
    const date = dateOf()
    expect(within(date).getByText('冬')).toHaveClass('norden-date-bar-date-season')
    expect(within(date).getByText('1')).toHaveClass('norden-date-bar-date-number')
    expect(date.textContent).toBe('灰歴312年1月 冬')
  })

  it.each(['冬至', '灰歴312年 冬至'])('keeps a season letter inside a word small in %s', dateLabel => {
    render(<DateBar {...labels} dateLabel={dateLabel} />)
    expect(dateOf().querySelector('.norden-date-bar-date-season')).toBeNull()
  })

  it('supports the resolving phase and keeps the settings position without onSettings', () => {
    render(<DateBar {...labels} factionName={null} />)
    expect(screen.getByText('全勢力の行動を解決中')).toBeInTheDocument()
    expect(screen.queryByText('のターン')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '設定' })).toBeDisabled()
  })

  it('opens the settings with the gear', async () => {
    const onSettings = vi.fn()
    render(<DateBar {...labels} onSettings={onSettings} />)
    const settings = screen.getByRole('button', { name: '設定' })
    expect(settings).toHaveAttribute('aria-haspopup', 'dialog')
    await userEvent.click(settings)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })
})
