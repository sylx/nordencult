import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import ChoiceGroup from './ChoiceGroup'
import KnightChip from './KnightChip'
import QuantityInput from './QuantityInput'
import VolumeSlider from './VolumeSlider'
import ThinFrameWithTitle from './ThinFrameWithTitle'

function Choice() {
  const [value, setValue] = useState('a')
  return <ChoiceGroup label="兵科" value={value} onChange={setValue}
    options={[{ value: 'a', label: '歩兵' }, { value: 'b', label: '弓兵', disabled: true }, { value: 'c', label: '騎兵' }]} />
}

describe('ChoiceGroup', () => {
  it('is a radio group with one tab stop; arrow keys skip disabled options', async () => {
    render(<Choice />)
    expect(screen.getByRole('radiogroup', { name: '兵科' })).toBeInTheDocument()
    const infantry = screen.getByRole('radio', { name: '歩兵' })
    expect(infantry).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '騎兵' })).toHaveAttribute('tabindex', '-1')
    infantry.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '騎兵' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '騎兵' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(infantry).toHaveAttribute('aria-checked', 'true')
  })
})

describe('QuantityInput', () => {
  it('steps, clamps typed values and disables the buttons at the ends', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<QuantityInput label="兵数" value={100} max={120} step={50} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '兵数を増やす' }))
    expect(onChange).toHaveBeenLastCalledWith(120)
    fireEvent.change(screen.getByRole('spinbutton', { name: '兵数（数値）' }), { target: { value: '-5' } })
    expect(onChange).toHaveBeenLastCalledWith(0)
    rerender(<QuantityInput label="兵数" value={120} max={120} onChange={onChange} />)
    expect(screen.getByRole('button', { name: '兵数を増やす' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: '兵数' })).toHaveAttribute('max', '120')
  })

  it('keeps the scale up to max while clamping to the cap', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<QuantityInput label="予算" value={290} max={1000} cap={300} step={50} onChange={onChange} />)
    expect(screen.getByRole('slider', { name: '予算' })).toHaveAttribute('max', '1000')
    await userEvent.click(screen.getByRole('button', { name: '予算を増やす' }))
    expect(onChange).toHaveBeenLastCalledWith(300)
    fireEvent.change(screen.getByRole('slider', { name: '予算' }), { target: { value: '800' } })
    expect(onChange).toHaveBeenLastCalledWith(300)
    rerender(<QuantityInput label="予算" value={300} max={1000} cap={300} onChange={onChange} />)
    expect(screen.getByRole('button', { name: '予算を増やす' })).toBeDisabled()
  })

  it('shows an icon before the label, keeping its name', () => {
    render(<QuantityInput label="兵数" icon={<img src="troops.webp" alt="" />} value={0} max={100} onChange={vi.fn()} />)
    const group = screen.getByRole('group', { name: '兵数' })
    expect(group.querySelector('.norden-quantity-label img')).toHaveAttribute('src', 'troops.webp')
  })
})

describe('VolumeSlider', () => {
  it('shows 0..1 as a percentage and reports the new volume', () => {
    const onChange = vi.fn()
    render(<VolumeSlider label="BGM" value={0.8} onChange={onChange} />)
    const slider = screen.getByRole('slider', { name: 'BGM' })
    expect(slider).toHaveValue('80')
    expect(slider).toHaveAttribute('aria-valuetext', '80%')
    fireEvent.change(slider, { target: { value: '35' } })
    expect(onChange).toHaveBeenLastCalledWith(0.35)
  })
})

describe('ThinFrameWithTitle', () => {
  it('names the panel by its title and passes attributes to the panel', () => {
    render(<ThinFrameWithTitle title="戦闘記録" className="log" data-testid="panel"><p>本文</p></ThinFrameWithTitle>)
    const panel = screen.getByRole('region', { name: '戦闘記録' })
    expect(panel).toBe(screen.getByTestId('panel'))
    expect(panel).toHaveClass('norden-thin-titled', 'log')
    expect(screen.getByRole('heading', { name: '戦闘記録' })).toBeInTheDocument()
    expect(screen.getByText('本文')).toBeInTheDocument()
  })
})

describe('KnightChip', () => {
  it('shows the face (or the initial), the name and a note', () => {
    const { container, rerender } = render(<KnightChip knight={{ name: 'エルネスト' }} note="軍団長" />)
    expect(container.firstChild).toHaveTextContent('エエルネスト軍団長')
    rerender(<KnightChip knight={{ name: 'エルネスト', portraitSrc: 'face.png' }} />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'face.png')
    expect(container.firstChild).toHaveTextContent(/^エルネスト$/)
  })
})
