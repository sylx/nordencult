import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AlertDialog from './AlertDialog'

describe('AlertDialog', () => {
  it('shows the message and closes with OK', async () => {
    const onClose = vi.fn()
    render(<AlertDialog title="強制退却" message="軍団長が退却しました。" onClose={onClose} />)
    const dialog = screen.getByRole('alertdialog', { name: '強制退却' })
    expect(dialog).toHaveAccessibleDescription('軍団長が退却しました。')
    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes with Escape or Enter, which the screen under it does not get', () => {
    const onClose = vi.fn()
    const under = vi.fn()
    window.addEventListener('keydown', under)
    render(<AlertDialog message="お知らせ" onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(under).not.toHaveBeenCalled()
    window.removeEventListener('keydown', under)
  })
})
