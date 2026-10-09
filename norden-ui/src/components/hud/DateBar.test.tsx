import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DateBar from './DateBar'

const labels = { phaseLabel: '戦略フェーズ', factionName: 'カルタ書院', dateLabel: '王歴312年4月' }

describe('DateBar', () => {
  it('shows phase, faction turn, date and settings in reading order', () => {
    render(<DateBar {...labels}><button>セーブ</button></DateBar>)
    const bar = screen.getByRole('group', { name: 'ターン情報' })
    const phase = within(bar).getByText(labels.phaseLabel)
    const faction = within(bar).getByText(labels.factionName)
    const date = within(bar).getByTitle(labels.dateLabel)
    const settings = within(bar).getByRole('button', { name: '設定' })
    expect(phase.compareDocumentPosition(faction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(faction.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(date.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(bar).getByText('のターン')).toBeInTheDocument()
    expect(date).toHaveTextContent(labels.dateLabel)
    expect(screen.queryByRole('region', { name: '設定' })).not.toBeInTheDocument()
  })

  it.each(['王歴312年4月', '王歴３１２年４月', '王暦312年 春', '日付未定'])(
    'preserves the complete date label when formatting %s', dateLabel => {
      render(<DateBar {...labels} dateLabel={dateLabel} />)
      expect(screen.getByTitle(dateLabel).textContent).toBe(dateLabel)
    },
  )

  it('supports the resolving phase and keeps the settings position without contents', () => {
    render(<DateBar {...labels} factionName={null} />)
    expect(screen.getByText('全勢力の行動を解決中')).toBeInTheDocument()
    expect(screen.queryByText('のターン')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '設定' })).toBeDisabled()
  })

  it('focuses settings contents and closes on Escape and outside input', async () => {
    render(<><DateBar {...labels}><button>セーブ</button></DateBar><button>外側</button></>)
    const user = userEvent.setup()
    const settings = screen.getByRole('button', { name: '設定' })
    await user.click(settings)
    const panel = screen.getByRole('region', { name: '設定' })
    expect(settings).toHaveAttribute('aria-controls', panel.id)
    expect(screen.getByRole('button', { name: 'セーブ' })).toHaveFocus()
    const prevented = vi.fn()
    window.addEventListener('keydown', event => prevented(event.defaultPrevented), { once: true })
    await user.keyboard('{Escape}')
    expect(prevented).toHaveBeenCalledWith(true)
    expect(settings).toHaveFocus()
    expect(settings).toHaveAttribute('aria-expanded', 'false')
    await user.click(settings)
    await user.click(screen.getByRole('button', { name: '外側' }))
    expect(settings).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes an open menu when its contents are removed', async () => {
    const { rerender } = render(<DateBar {...labels}><button>セーブ</button></DateBar>)
    await userEvent.click(screen.getByRole('button', { name: '設定' }))
    rerender(<DateBar {...labels} />)
    expect(screen.getByRole('button', { name: '設定' })).toBeDisabled()
    rerender(<DateBar {...labels}><button>セーブ</button></DateBar>)
    expect(screen.getByRole('button', { name: '設定' })).toHaveAttribute('aria-expanded', 'false')
  })
})
