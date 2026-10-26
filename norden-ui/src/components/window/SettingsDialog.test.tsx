import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SettingsDialog from './SettingsDialog'

describe('SettingsDialog', () => {
  it('shows the settings and closes with the close button or a click outside', async () => {
    const onClose = vi.fn()
    render(<SettingsDialog onClose={onClose}><input type="range" aria-label="BGM" /></SettingsDialog>)
    const dialog = screen.getByRole('dialog', { name: '設定' })
    await userEvent.click(screen.getByRole('slider', { name: 'BGM' }))
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(dialog.parentElement!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes with Escape, which the screen under it does not get', () => {
    const onClose = vi.fn()
    const under = vi.fn()
    window.addEventListener('keydown', under)
    render(<SettingsDialog onClose={onClose}>内容</SettingsDialog>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(under).not.toHaveBeenCalled()
    window.removeEventListener('keydown', under)
  })
})
