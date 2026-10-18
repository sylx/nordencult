import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import ScreenHost from './ScreenHost'
import { useScreenStack } from './useScreenStack'

type Screens = { home: { city: string }; pick: { from: string }; detail: { from: string; to: string } }

describe('useScreenStack', () => {
  it('pushes, replaces, pops and keeps the bottom screen', () => {
    const { result } = renderHook(() => useScreenStack<Screens>({ screen: 'home', params: { city: 'A' } }))
    act(() => result.current.push('pick', { from: 'A' }))
    act(() => result.current.push('detail', { from: 'A', to: 'B' }))
    expect(result.current.stack.map(entry => entry.screen)).toEqual(['home', 'pick', 'detail'])
    act(() => result.current.replace('detail', { from: 'A', to: 'C' }))
    expect(result.current.top).toMatchObject({ screen: 'detail', params: { to: 'C' } })
    act(() => result.current.popTo('home'))
    expect(result.current.stack).toHaveLength(1)
    expect(result.current.canPop).toBe(false)
    act(() => result.current.pop())
    expect(result.current.top).toMatchObject({ screen: 'home', params: { city: 'A' } })
    act(() => result.current.reset('pick', { from: 'Z' }))
    expect(result.current.stack.map(entry => entry.screen)).toEqual(['pick'])
  })

  it('gives every push a new key', () => {
    const { result } = renderHook(() => useScreenStack<Screens>({ screen: 'home', params: { city: 'A' } }))
    act(() => result.current.push('pick', { from: 'A' }))
    const first = result.current.top.key
    act(() => result.current.pop())
    act(() => result.current.push('pick', { from: 'A' }))
    expect(result.current.top.key).not.toBe(first)
  })
})

function Flow({ escapeToPop }: { escapeToPop?: boolean }) {
  const nav = useScreenStack<Screens>({ screen: 'home', params: { city: 'A' } })
  return <ScreenHost nav={nav} escapeToPop={escapeToPop} screens={{
    home: ({ city }) => <button onClick={() => nav.push('pick', { from: city })}>{city}から選ぶ</button>,
    pick: ({ from }) => <button onClick={() => nav.push('detail', { from, to: 'B' })}>{from}の候補</button>,
    detail: ({ to }) => <Counter label={`詳細 ${to}`} />,
  }} />
}

function Counter({ label }: { label: string }) {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{label} {count}</button>
}

describe('ScreenHost', () => {
  it('draws only the top screen and goes back with Escape', async () => {
    render(<Flow />)
    await userEvent.click(screen.getByRole('button', { name: 'Aから選ぶ' }))
    expect(screen.queryByRole('button', { name: 'Aから選ぶ' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Aの候補' }))
    expect(screen.getByRole('button', { name: '詳細 B 0' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Aの候補' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Aから選ぶ' })).toBeInTheDocument()
  })

  it('mounts a screen fresh when it is pushed again', async () => {
    render(<Flow />)
    await userEvent.click(screen.getByRole('button', { name: 'Aから選ぶ' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aの候補' }))
    await userEvent.click(screen.getByRole('button', { name: '詳細 B 0' }))
    expect(screen.getByRole('button', { name: '詳細 B 1' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Aの候補' }))
    expect(screen.getByRole('button', { name: '詳細 B 0' })).toBeInTheDocument()
  })

  it('leaves Escape handled elsewhere (defaultPrevented) and can be turned off', async () => {
    const { unmount } = render(<Flow />)
    await userEvent.click(screen.getByRole('button', { name: 'Aから選ぶ' }))
    const handled = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    handled.preventDefault()
    act(() => { window.dispatchEvent(handled) })
    expect(screen.getByRole('button', { name: 'Aの候補' })).toBeInTheDocument()
    unmount()

    render(<Flow escapeToPop={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Aから選ぶ' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Aの候補' })).toBeInTheDocument()
  })
})

function OverlayFlow() {
  const nav = useScreenStack<Screens>({ screen: 'home', params: { city: 'A' } })
  return <ScreenHost nav={nav} overlays={['pick']} screens={{
    home: ({ city }) => <div className="norden-screen">
      <Counter label={`${city}の窓`} />
      <div className="norden-screen-bottom-center"><button onClick={() => (nav.top.screen === 'pick' ? nav.pop() : nav.push('pick', { from: city }))}>重ねる</button></div>
    </div>,
    pick: ({ from }) => <button onClick={() => nav.push('detail', { from, to: 'B' })}>{from}の候補</button>,
    detail: ({ to }) => <Counter label={`詳細 ${to}`} />,
  }} />
}

describe('ScreenHost overlays', () => {
  it('draws an overlay over the screen below, which stays mounted with its bottom toolbar', async () => {
    const { container } = render(<OverlayFlow />)
    await userEvent.click(screen.getByRole('button', { name: 'Aの窓 0' }))
    await userEvent.click(screen.getByRole('button', { name: '重ねる' }))
    expect(screen.getByRole('button', { name: 'Aの候補' })).toBeInTheDocument()
    const covered = container.querySelector('.norden-screen-layer.is-covered')
    expect(covered).toHaveAttribute('data-screen', 'home')
    // The toolbar of the screen below closes the overlay; the screen below kept its state
    await userEvent.click(screen.getByRole('button', { name: '重ねる' }))
    expect(screen.queryByRole('button', { name: 'Aの候補' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aの窓 1' })).toBeInTheDocument()
    expect(container.querySelector('.is-covered')).toBeNull()

    // A screen that is not an overlay replaces those below
    await userEvent.click(screen.getByRole('button', { name: '重ねる' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aの候補' }))
    expect(screen.queryByRole('button', { name: '重ねる' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '詳細 B 0' })).toBeInTheDocument()
  })
})
