import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DomesticScreen from './DomesticScreen'

describe('DomesticScreen', () => {
  it('opens a window named after the city with a frame, and closes', async () => {
    const onClose = vi.fn()
    render(<DomesticScreen city={{ id: 'P012', name: 'フルーエン' }} onClose={onClose} />)
    const window = screen.getByRole('region', { name: 'フルーエンの内政' })
    expect(within(window).getByTestId('domestic-frame')).toBeInTheDocument()
    await userEvent.click(within(window).getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
