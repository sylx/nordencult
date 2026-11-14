import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Button from '../components/parts/Button'
import ConfirmDialog from '../components/window/ConfirmDialog'
import { installClickSound, playSound, setSoundPlayer } from './sound'

describe('sounds', () => {
  let uninstall = () => {}
  afterEach(() => {
    uninstall()
    setSoundPlayer(null)
  })

  it('plays through the player, and nothing without one', () => {
    playSound('click')
    const player = vi.fn()
    setSoundPlayer(player)
    playSound('click')
    expect(player).toHaveBeenCalledExactlyOnceWith('click')
  })

  it('clicks for enabled buttons; data-sound names another sound or none', async () => {
    const player = vi.fn()
    setSoundPlayer(player)
    uninstall = installClickSound()
    render(<div>
      <Button>決定</Button>
      <Button disabled>使えない</Button>
      <Button data-sound="cancel">戻る</Button>
      <button type="button" data-sound="none">移動</button>
      <ul><li data-sound="click">項目</li></ul>
      <p>ただの文</p>
    </div>)
    for (const name of ['決定', '使えない', '戻る', '移動']) await userEvent.click(screen.getByText(name))
    await userEvent.click(screen.getByText('項目'))
    await userEvent.click(screen.getByText('ただの文'))
    expect(player.mock.calls).toEqual([['click'], ['cancel'], ['click']])
  })

  it('still clicks in dialogs, which stop the propagation', async () => {
    const player = vi.fn()
    setSoundPlayer(player)
    uninstall = installClickSound()
    render(<ConfirmDialog title="確認" message="よろしいですか" onConfirm={() => {}} onCancel={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'はい' }))
    expect(player).toHaveBeenCalledExactlyOnceWith('click')
  })
})
