import { createRef } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'
import Tooltip from './Tooltip'

describe('Tooltip', () => {
  it('opens on hover, outside the page flow, and closes on leaving', async () => {
    render(<Tooltip content="説明" delay={0}><span>対象</span></Tooltip>)
    const anchor = screen.getByText('対象')
    await userEvent.hover(anchor)
    const tip = screen.getByRole('tooltip')
    expect(tip).toHaveTextContent('説明')
    expect(tip.parentElement).toBe(document.body)
    expect(anchor).toHaveAttribute('aria-describedby', tip.id)
    await userEvent.unhover(anchor)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('waits for its delay', async () => {
    render(<Tooltip content="説明" delay={10}><span>対象</span></Tooltip>)
    await userEvent.hover(screen.getByText('対象'))
    expect(await screen.findByRole('tooltip')).toBeInTheDocument()
  })

  it('leaves a press to close it, unless it is pinned by `open`', async () => {
    const { rerender } = render(<Tooltip content="説明" delay={0}><button>対象</button></Tooltip>)
    const anchor = screen.getByRole('button')
    await userEvent.hover(anchor)
    await userEvent.pointer({ keys: '[MouseLeft>]', target: anchor })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await userEvent.pointer({ keys: '[/MouseLeft]', target: anchor })

    rerender(<Tooltip content="説明" open delay={0}><button>対象</button></Tooltip>)
    await userEvent.click(anchor)
    await userEvent.unhover(anchor)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('stays out of the way with nothing to say', async () => {
    render(<Tooltip delay={0}><span>対象</span></Tooltip>)
    await userEvent.hover(screen.getByText('対象'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(screen.getByText('対象')).not.toHaveAttribute('aria-description')
  })

  it('keeps the handlers and the ref of its child', async () => {
    const onPointerEnter = vi.fn()
    const ref = createRef<HTMLButtonElement>()
    render(<Tooltip content="説明" delay={0}><button ref={ref} onPointerEnter={onPointerEnter}>対象</button></Tooltip>)
    await userEvent.hover(screen.getByRole('button'))
    expect(onPointerEnter).toHaveBeenCalledOnce()
    expect(ref.current).toBe(screen.getByRole('button'))
  })

  it('reads a sentence as the description, but not the name again', () => {
    render(<>
      <Tooltip content="説明"><button aria-label="閉じる" /></Tooltip>
      <Tooltip content="閉じる"><button aria-label="閉じる" /></Tooltip>
    </>)
    const [described, named] = screen.getAllByRole('button', { name: '閉じる' })
    expect(described).toHaveAttribute('aria-description', '説明')
    expect(named).not.toHaveAttribute('aria-description')
  })

  it('takes rich content and any element, such as a point of a chart', async () => {
    render(<svg><Tooltip content={<b>政治 80</b>} delay={0}><circle data-testid="point" r={4} /></Tooltip></svg>)
    await userEvent.hover(screen.getByTestId('point'))
    expect(within(screen.getByRole('tooltip')).getByText('政治 80')).toBeInTheDocument()
  })
})

describe('Button with a title', () => {
  it('shows it as a tooltip, not the browser\'s, also when disabled', async () => {
    render(<Button disabled title="理由">予約</Button>)
    const button = screen.getByRole('button', { name: '予約' })
    expect(button).not.toHaveAttribute('title')
    expect(button).toHaveAttribute('aria-description', '理由')
    await userEvent.hover(button)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('理由')
  })
})
