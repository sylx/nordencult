import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import InfoWindow from './InfoWindow'
import { windowSkins } from '../skins'
import type { InfoWindowSkin } from '../skins'

describe('InfoWindow decoration skins', () => {
  it('keeps the classic skin by default', () => {
    render(<InfoWindow title="都市">本文</InfoWindow>)
    const window = screen.getByRole('region', { name: '都市' })
    expect(window).toHaveAttribute('data-skin', 'classic')
    expect(window.querySelectorAll('.norden-info-window-corner')).toHaveLength(4)
    expect(window.querySelector('.is-nine-slice')).toBeNull()
  })

  it('replaces individual images while inheriting unspecified assets', () => {
    const skin: InfoWindowSkin = { name: 'custom', images: { corner: '/custom/corner.png', paper: '' } }
    render(<InfoWindow title="都市" skin={skin}>本文</InfoWindow>)
    const window = screen.getByRole('region', { name: '都市' })
    expect(window.style.getPropertyValue('--norden-corner')).toBe('url("/custom/corner.png")')
    expect(window.style.getPropertyValue('--norden-paper')).toBe('none')
    expect(window.style.getPropertyValue('--norden-title-bar')).toContain('info_window_titlebar.png')
  })

  it('switches between nine-slice skins and classic without remounting content', () => {
    const { rerender } = render(<InfoWindow title="都市" skin={windowSkins.thin}><input aria-label="メモ" defaultValue="保持する内容" /></InfoWindow>)
    const input = screen.getByRole('textbox')
    expect(screen.getByRole('region').querySelector('.is-nine-slice')).toBeInTheDocument()
    rerender(<InfoWindow title="都市" skin={windowSkins.goddess}><input aria-label="メモ" defaultValue="保持する内容" /></InfoWindow>)
    expect(screen.getByRole('region')).toHaveAttribute('data-skin', 'goddess')
    expect(screen.getByRole('textbox')).toBe(input)
    rerender(<InfoWindow title="都市"><input aria-label="メモ" defaultValue="保持する内容" /></InfoWindow>)
    expect(screen.getByRole('region').querySelectorAll('.norden-info-window-corner')).toHaveLength(4)
  })
})
