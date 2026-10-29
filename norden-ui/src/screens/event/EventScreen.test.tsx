import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EventScreen from './EventScreen'
import { CUT_IMAGES } from './cuts'

describe('EventScreen', () => {
  it('shows the cut, the message and its details, and closes on the button, Enter or Esc', async () => {
    const onClose = vi.fn()
    render(<EventScreen image="cut.webp" title="勢力滅亡" message="カルタ書院は滅亡しました。"
      details={[{ label: '最後の拠点', value: 'フルーエン' }, { label: '攻め落とした勢力', value: 'レオニス帝国' }]}
      onClose={onClose}><p>在野になった騎士</p></EventScreen>)
    expect(screen.getByRole('dialog', { name: '勢力滅亡' })).toBeInTheDocument()
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute('src', 'cut.webp')
    expect(screen.getByText('カルタ書院は滅亡しました。')).toBeInTheDocument()
    expect(screen.getByText('最後の拠点').nextSibling).toHaveTextContent('フルーエン')
    expect(screen.getByText('在野になった騎士')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Enter}')
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('shows a picture of the host in place of the cut', () => {
    render(<EventScreen picture={<span>兵法の画像</span>} title="研究完了" message="兵法の研究が完了しました。" onClose={() => {}} />)
    expect(screen.getByText('兵法の画像')).toBeInTheDocument()
    expect(screen.getByRole('dialog').querySelector('img')).toBeNull()
  })

  it('has the cuts of src/assets/cut by name', () => {
    expect(CUT_IMAGES.faction_destruction).toMatch(/faction_destruction/)
  })
})
