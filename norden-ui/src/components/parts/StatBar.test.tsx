import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatBar from './StatBar'

describe('StatBar', () => {
  it.each([
    [220, 720, 220], [-20, 720, 0], [900, 720, 720], [40, 0, 0], [NaN, 720, 0], [40, Infinity, 0],
  ])('keeps %s / %s within the meter range', (value, max, expected) => {
    const { container } = render(<StatBar label="農業" value={value} max={max} tone="agriculture" />)
    const meter = screen.getByRole('meter', { name: '農業' })
    expect(meter).toHaveAttribute('aria-valuenow', String(expected))
    const width = Number(container.querySelector('clipPath rect')!.getAttribute('width'))
    expect(Number.isFinite(width)).toBe(true)
    expect(width).toBeGreaterThanOrEqual(0)
    expect(width).toBeLessThanOrEqual(272)
  })

  it('assigns independent SVG definitions to each bar', () => {
    const { container } = render(<>
      <StatBar label="農業" value={100} max={720} tone="agriculture" />
      <StatBar label="生産" value={200} max={640} tone="production" />
    </>)
    const ids = Array.from(container.querySelectorAll('[id]'), element => element.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const fill of container.querySelectorAll('[fill^="url"]')) {
      const id = fill.getAttribute('fill')!.slice(5, -1)
      expect(ids).toContain(id)
    }
  })
})
