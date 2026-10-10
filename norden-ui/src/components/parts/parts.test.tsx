import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import ChoiceGroup from './ChoiceGroup'
import CityNavigator from './CityNavigator'
import QuantityInput from './QuantityInput'
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
})

describe('CityNavigator', () => {
  it('shows the position and disables the steps without handlers', async () => {
    const onNext = vi.fn()
    render(<CityNavigator name="フルーエン" position={{ index: 1, count: 3 }} onNext={onNext} />)
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前の都市' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: '次の都市' }))
    expect(onNext).toHaveBeenCalledOnce()
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
