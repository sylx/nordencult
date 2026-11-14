import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MercenaryProfile from './MercenaryProfile'
import type { MercenaryProfileView } from '../types'

const mercenary: MercenaryProfileView = {
  knight: { id: 'm1', name: 'ブロック', imageSrc: 'figure.webp', abilities: { strength: 90 } }, company: 'ドゥンダリン盾隊', unitType: '歩兵',
  soldiers: 600, maxSoldiers: 600, rank: 'C', cityName: 'フルーエン',
}

describe('MercenaryProfile', () => {
  it('shows the rank coloured by it, the unit and the city, without the abilities', () => {
    const { container } = render(<MercenaryProfile mercenary={mercenary} />)
    expect(screen.getByLabelText('ランクC').querySelector('[data-rank="C"]')).toHaveTextContent('C')
    expect(container).toHaveTextContent('600 / 600')
    expect(container).toHaveTextContent('所在地フルーエン')
    expect(container.querySelector('.norden-knight-stats')).toBeNull()
    expect(screen.getByRole('img', { name: 'ブロックの立ち絵' })).toBeInTheDocument()
  })

  it('shows the abilities when asked, and the face instead of the figure', () => {
    const { container } = render(<MercenaryProfile mercenary={mercenary} abilities figure={false} />)
    expect(container.querySelector('.norden-knight-stats')).toHaveTextContent('90')
    expect(screen.queryByRole('img', { name: 'ブロックの立ち絵' })).toBeNull()
    expect(container.querySelector('.norden-knight-face')).not.toBeNull()
    expect(container.querySelector('.norden-mercenary-prices')).toBeNull()
  })

  it('shows what they ask when given', () => {
    const { container } = render(<MercenaryProfile mercenary={mercenary} prices={[{ label: '契約金', value: 2000 }, { label: '月額', value: 334 }]} />)
    expect(container.querySelector('.norden-mercenary-prices')).toHaveTextContent('契約金2,000月額334')
  })
})
