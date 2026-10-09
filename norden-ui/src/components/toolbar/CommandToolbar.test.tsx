import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CommandToolbar from './CommandToolbar'
import type { ToolbarCommand } from './CommandToolbar'

const setup = () => {
  const onInvade = vi.fn()
  const onResearch = vi.fn()
  const commands: ToolbarCommand[] = [
    { id: 'military', label: '軍事', children: [
      { id: 'move', label: '移動', disabled: true, title: '移動できる騎士がいません' },
      { id: 'invade', label: '侵攻', onClick: onInvade },
    ] },
    { id: 'research', label: '研究', onClick: onResearch },
  ]
  render(<><CommandToolbar commands={commands} /><button>外側</button></>)
  return { onInvade, onResearch }
}

describe('CommandToolbar', () => {
  it('calls a command without children directly', async () => {
    const { onResearch } = setup()
    await userEvent.click(screen.getByRole('button', { name: '研究' }))
    expect(onResearch).toHaveBeenCalledOnce()
    expect(screen.queryByRole('group', { name: '軍事' })).not.toBeInTheDocument()
  })

  it('opens the sub-commands above and closes them after a choice', async () => {
    const { onInvade } = setup()
    const military = screen.getByRole('button', { name: '軍事' })
    expect(military).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(military)
    expect(military).toHaveAttribute('aria-expanded', 'true')
    const group = screen.getByRole('group', { name: '軍事' })
    expect(military).toHaveAttribute('aria-controls', group.id)
    expect(screen.getByRole('button', { name: '移動' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '移動' })).toHaveAttribute('title', '移動できる騎士がいません')
    // Focus moves to the first enabled sub-command
    expect(screen.getByRole('button', { name: '侵攻' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: '侵攻' }))
    expect(onInvade).toHaveBeenCalledOnce()
    expect(screen.queryByRole('group', { name: '軍事' })).not.toBeInTheDocument()
  })

  it('closes with a second click, Escape (claimed with preventDefault) and an outside click', async () => {
    setup()
    const military = screen.getByRole('button', { name: '軍事' })
    await userEvent.click(military)
    await userEvent.click(military)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()

    await userEvent.click(military)
    const prevented = vi.fn()
    window.addEventListener('keydown', event => prevented(event.defaultPrevented), { once: true })
    await userEvent.keyboard('{Escape}')
    expect(prevented).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(military).toHaveFocus()

    await userEvent.click(military)
    await userEvent.click(screen.getByRole('button', { name: '外側' }))
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('hides the drag handles when not movable', () => {
    render(<CommandToolbar commands={[{ id: 'a', label: 'A' }]} movable={false} />)
    expect(screen.queryByRole('button', { name: /を移動/ })).not.toBeInTheDocument()
  })
})

describe('CommandToolbar re-rendered by its parent', () => {
  it('keeps the focus inside the open sub-commands', async () => {
    const commands = (): ToolbarCommand[] => [{ id: 'm', label: '軍事', children: [{ id: 'a', label: '移動' }, { id: 'b', label: '侵攻' }] }]
    const { rerender } = render(<CommandToolbar commands={commands()} />)
    await userEvent.click(screen.getByRole('button', { name: '軍事' }))
    screen.getByRole('button', { name: '侵攻' }).focus()
    rerender(<CommandToolbar commands={commands()} />)
    expect(screen.getByRole('button', { name: '侵攻' })).toHaveFocus()
  })
})
