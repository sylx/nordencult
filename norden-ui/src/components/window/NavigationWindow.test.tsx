import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import NavigationWindow from './NavigationWindow'
import WindowFrame from './WindowFrame'

describe('NavigationWindow', () => {
  it('names the window and supports pointer and keyboard controls', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn(), onForward = vi.fn(), onClose = vi.fn()
    render(<NavigationWindow title="都市の記録" onBack={onBack} onForward={onForward} onClose={onClose}>記録の本文</NavigationWindow>)
    expect(screen.getByRole('region', { name: '都市の記録' })).toHaveTextContent('記録の本文')
    await user.tab()
    expect(screen.getByRole('button', { name: '戻る' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.tab()
    expect(screen.getByRole('button', { name: '進む' })).toHaveFocus()
    await user.keyboard(' ')
    await user.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(onForward).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('disables each direction independently and restores it when props change', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn(), onForward = vi.fn(), onClose = vi.fn()
    const { rerender } = render(<NavigationWindow aria-label="記録" onClose={onClose} onBack={onBack} onForward={onForward} backDisabled />)
    await user.click(screen.getByRole('button', { name: '戻る' }))
    await user.tab()
    expect(screen.getByRole('button', { name: '進む' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onBack).not.toHaveBeenCalled()
    expect(onForward).toHaveBeenCalledOnce()
    rerender(<NavigationWindow aria-label="記録" onClose={onClose} onBack={onBack} onForward={onForward} forwardDisabled />)
    expect(screen.getByRole('button', { name: '戻る' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '進む' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '進む' }))
    await user.click(screen.getByRole('button', { name: '戻る' }))
    expect(onForward).toHaveBeenCalledOnce()
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('disables missing handlers and supports custom labels', () => {
    render(<NavigationWindow aria-label="記録" onClose={() => {}} backLabel="前の記録" forwardLabel="次の記録" />)
    expect(screen.getByRole('button', { name: '前の記録' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '次の記録' })).toBeDisabled()
  })

  it('keeps the existing close-only frame available', () => {
    render(<WindowFrame title="従来の枠" onClose={() => {}}>本文</WindowFrame>)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('group', { name: 'ウィンドウの移動' })).not.toBeInTheDocument()
  })
})
