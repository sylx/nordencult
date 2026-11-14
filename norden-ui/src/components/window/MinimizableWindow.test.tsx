import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MinimizableWindow from './MinimizableWindow'

describe('MinimizableWindow', () => {
  it('folds down to its title and opens again, keeping the content mounted', async () => {
    render(<MinimizableWindow title="行動予約"><p>本文</p></MinimizableWindow>)
    const panel = screen.getByRole('region', { name: '行動予約' })
    expect(screen.getByText('本文')).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: '最小化' }))
    expect(panel).toHaveClass('is-minimized')
    expect(screen.getByText('本文')).not.toBeVisible()
    expect(screen.getByText('行動予約')).toBeVisible()
    expect(screen.getByRole('button', { name: '元に戻す' })).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(screen.getByRole('button', { name: '元に戻す' }))
    expect(panel).not.toHaveClass('is-minimized')
    expect(screen.getByText('本文')).toBeVisible()
    expect(screen.getByRole('button', { name: '最小化' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('starts folded with defaultMinimized', () => {
    render(<MinimizableWindow title="行動予約" defaultMinimized><p>本文</p></MinimizableWindow>)
    expect(screen.getByText('本文')).not.toBeVisible()
  })

  it('follows `minimized` and reports the changes asked for', async () => {
    const onMinimizedChange = vi.fn()
    const { rerender } = render(<MinimizableWindow title="行動予約" minimized={false} onMinimizedChange={onMinimizedChange}><p>本文</p></MinimizableWindow>)
    await userEvent.click(screen.getByRole('button', { name: '最小化' }))
    expect(onMinimizedChange).toHaveBeenCalledWith(true)
    expect(screen.getByText('本文')).toBeVisible()
    rerender(<MinimizableWindow title="行動予約" minimized onMinimizedChange={onMinimizedChange}><p>本文</p></MinimizableWindow>)
    expect(screen.getByText('本文')).not.toBeVisible()
  })
})
