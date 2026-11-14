import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CutInLayer from './CutInLayer'
import { CutInQueue, useCutIn } from './useCutIn'

describe('CutInQueue', () => {
  it('plays one cut-in at a time in order', async () => {
    const queue = new CutInQueue()
    const done: string[] = []
    const first = queue.play({ text: '戦闘開始' }).then(() => done.push('first'))
    const second = queue.play({ text: 'ROUND 1' }).then(() => done.push('second'))
    expect(queue.getCurrent()?.template.text).toBe('戦闘開始')
    queue.finish(queue.getCurrent()!.id)
    await first
    expect(queue.getCurrent()?.template.text).toBe('ROUND 1')
    queue.finish(queue.getCurrent()!.id)
    await second
    expect(done).toEqual(['first', 'second'])
    expect(queue.getCurrent()).toBeNull()
  })

  it('replaces the text and the sub text', () => {
    const queue = new CutInQueue()
    void queue.play({ text: 'ROUND 1', subText: 'FIGHT' }, { text: 'ROUND 3', subText: '' })
    expect(queue.getCurrent()?.template).toMatchObject({ text: 'ROUND 3', subText: '' })
  })

  it('hands skip() to the player', () => {
    const queue = new CutInQueue()
    const handler = vi.fn()
    queue.setSkipHandler(handler)
    queue.skip()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('resolves everything on clear()', async () => {
    const queue = new CutInQueue()
    const all = Promise.all([queue.play({ text: 'A' }), queue.play({ text: 'B' })])
    queue.clear()
    await expect(all).resolves.toBeDefined()
    expect(queue.getCurrent()).toBeNull()
  })

  it('rejects a template that is not an object', async () => {
    await expect(new CutInQueue().play(null as never)).rejects.toThrow()
  })
})

describe('useCutIn + CutInLayer', () => {
  it('reports what is playing', () => {
    const { result } = renderHook(() => useCutIn())
    expect(result.current.playing).toBe(false)
    act(() => { void result.current.play({ text: '戦闘開始' }) })
    expect(result.current.playing).toBe(true)
    expect(result.current.current?.template.text).toBe('戦闘開始')
  })

  it('ends right away when the canvas cannot draw, so play() never hangs', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const ended = vi.fn()
    function Host() {
      const cutIn = useCutIn()
      return <><button type="button" onClick={() => void cutIn.play({ text: '戦闘開始' }).then(ended)}>play</button><CutInLayer cutIn={cutIn} /></>
    }
    render(<Host />)
    await act(async () => { screen.getByRole('button').click() })
    await act(async () => { await Promise.resolve() })
    expect(ended).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
  })
})
