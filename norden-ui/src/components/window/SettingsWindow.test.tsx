import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import ChoiceGroup from '../parts/ChoiceGroup'
import VolumeSlider from '../parts/VolumeSlider'
import SettingsWindow, { SettingsItem, SettingsSection } from './SettingsWindow'

function Settings({ onClose = () => {} }: { onClose?: () => void }) {
  const [speed, setSpeed] = useState('1')
  return (
    <SettingsWindow onClose={onClose} footer={<button type="button">初期値に戻す</button>}>
      <SettingsSection title="サウンド">
        <SettingsItem label="BGM"><VolumeSlider label="BGM" hideLabel value={0.5} onChange={() => {}} /></SettingsItem>
      </SettingsSection>
      <SettingsSection title="戦闘">
        <SettingsItem label="戦闘の速度" description="戦闘の途中でも変えられます">
          <ChoiceGroup label="戦闘の速度" value={speed} onChange={setSpeed} options={[{ value: '1', label: '×1' }, { value: '2', label: '×2' }]} />
        </SettingsItem>
      </SettingsSection>
    </SettingsWindow>
  )
}

describe('SettingsWindow', () => {
  it('shows the sections and items as a modal dialog named by its title', () => {
    render(<Settings />)
    const dialog = screen.getByRole('dialog', { name: '設定' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()
    const battle = within(dialog).getByRole('region', { name: '戦闘' })
    const item = within(battle).getByRole('group', { name: '戦闘の速度' })
    expect(item).toHaveAccessibleDescription('戦闘の途中でも変えられます')
    expect(within(item).getByRole('radiogroup', { name: '戦闘の速度' })).toBeInTheDocument()
    expect(within(dialog).getByRole('slider', { name: 'BGM' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '初期値に戻す' })).toBeInTheDocument()
  })

  it('closes with the × and a click on the mask, not with a click inside or a drag ending on the mask', async () => {
    const onClose = vi.fn()
    render(<Settings onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: '設定' })
    const mask = dialog.parentElement!
    await userEvent.click(screen.getByRole('radio', { name: '×2' }))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.pointerDown(screen.getByRole('slider', { name: 'BGM' }))
    fireEvent.click(mask)
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(mask)
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes with Escape, and no key reaches the page under it', async () => {
    const onClose = vi.fn()
    const page = vi.fn()
    window.addEventListener('keydown', page)
    render(<Settings onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('a')
    expect(page).not.toHaveBeenCalled()
    window.removeEventListener('keydown', page)
  })

  it('keeps Tab in the window and gives the focus back when it closes', async () => {
    function Host() {
      const [open, setOpen] = useState(false)
      return <>
        <button type="button" onClick={() => setOpen(true)}>開く</button>
        {open && <Settings onClose={() => setOpen(false)} />}
      </>
    }
    render(<Host />)
    const user = userEvent.setup()
    const opener = screen.getByRole('button', { name: '開く' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: '設定' })
    await user.tab({ shift: true })
    expect(within(dialog).getByRole('button', { name: '初期値に戻す' })).toHaveFocus()
    await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
})
