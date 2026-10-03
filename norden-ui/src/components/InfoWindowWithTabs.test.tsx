import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InfoWindowWithTabs from './InfoWindowWithTabs'
import type { TabInfo } from './InfoWindowWithTabs'

const tabs: TabInfo[] = [
  { id: 'city', name: '都市情報', icon: 'city.png', content: <p>都市の内容</p> },
  { id: 'knights', name: '騎士', icon: 'knights.png', content: <p>騎士の内容</p> },
  { id: 'history', name: '歴史', icon: 'history.png', content: <p>歴史の内容</p> },
]

describe('InfoWindowWithTabs', () => {
  it('uses the active tab name as title and exposes accessible tabs and panel', () => {
    render(<InfoWindowWithTabs tabs={tabs} />)
    expect(screen.getByRole('region', { name: '都市情報' })).toBeInTheDocument()
    const tab = screen.getByRole('tab', { name: '都市情報' })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    const panel = screen.getByRole('tabpanel', { name: '都市情報' })
    expect(tab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveTextContent('都市の内容')
    expect(screen.getByRole('tab', { name: '騎士' })).toHaveAttribute('tabindex', '-1')
  })

  it('switches content and automatic title on click', async () => {
    render(<InfoWindowWithTabs tabs={tabs} />)
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    expect(screen.getByRole('region', { name: '騎士' })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('騎士の内容')
    expect(screen.queryByText('都市の内容')).not.toBeInTheDocument()
  })

  it('keeps an explicit title while changing tabs', async () => {
    render(<InfoWindowWithTabs tabs={tabs} title="フルーエン" />)
    await userEvent.click(screen.getByRole('tab', { name: '歴史' }))
    expect(screen.getByRole('region', { name: 'フルーエン' })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('歴史')
  })

  it.each([[-3, '都市情報'], [1, '騎士'], [100, '歴史'], [NaN, '都市情報']])('clamps default index %s', (index, name) => {
    render(<InfoWindowWithTabs tabs={tabs} defaultActiveTab={index} />)
    expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true')
  })

  it('supports wrapping vertical arrow navigation, Home and End', async () => {
    const user = userEvent.setup()
    render(<InfoWindowWithTabs tabs={tabs} />)
    screen.getByRole('tab', { name: '都市情報' }).focus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('tab', { name: '歴史' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('tab', { name: '都市情報' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('歴史')
    await user.keyboard('{Home}{ArrowDown}')
    expect(screen.getByRole('tab', { name: '騎士' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('騎士')
  })

  it('supports controlled selection without changing content until the parent updates', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<InfoWindowWithTabs tabs={tabs} activeTab={0} onActiveTabChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: '騎士' }))
    expect(onChange).toHaveBeenCalledWith(1)
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('都市情報')
    rerender(<InfoWindowWithTabs tabs={tabs} activeTab={1} onActiveTabChange={onChange} />)
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('騎士')
  })

  it('preserves the selected stable ID when tabs are reordered', () => {
    const { rerender } = render(<InfoWindowWithTabs tabs={tabs} defaultActiveTab={1} />)
    rerender(<InfoWindowWithTabs tabs={[tabs[1]!, tabs[0]!, tabs[2]!]} />)
    expect(screen.getByRole('tab', { name: '騎士' })).toHaveAttribute('aria-selected', 'true')
  })

  it('handles removal, empty lists and repopulation', () => {
    const { rerender } = render(<InfoWindowWithTabs tabs={tabs} defaultActiveTab={2} emptyContent="情報なし" />)
    rerender(<InfoWindowWithTabs tabs={tabs.slice(0, 1)} />)
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('都市情報')
    rerender(<InfoWindowWithTabs tabs={[]} emptyContent="情報なし" />)
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
    expect(screen.getByText('情報なし')).toBeInTheDocument()
    rerender(<InfoWindowWithTabs tabs={tabs} />)
    expect(screen.getByRole('tab', { name: '歴史' })).toHaveAttribute('aria-selected', 'true')
  })

  it('assigns unique relationships across multiple windows', () => {
    render(<><InfoWindowWithTabs tabs={tabs} /><InfoWindowWithTabs tabs={tabs} /></>)
    const panels = screen.getAllByRole('tabpanel')
    expect(panels[0]!.id).not.toBe(panels[1]!.id)
    expect(panels[0]!.getAttribute('aria-labelledby')).not.toBe(panels[1]!.getAttribute('aria-labelledby'))
  })
})
